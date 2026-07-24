// Samen — synchroniseert taken met deadline naar Google Taken, en haalt
// afvinkstatus terug. Aanroepen: supabase.functions.invoke("google-sync").
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { CORS, accessToken, gapi, samenListId } from "../_shared/google.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const { household_id } = await req.json();
    if (!household_id) throw new Error("household_id ontbreekt");

    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: creds } = await db.from("google_credentials").select("*").eq("household_id", household_id);
    if (!creds?.length) return new Response(JSON.stringify({ pushed: 0, completed: 0, note: "geen koppeling" }), { headers: { ...CORS, "Content-Type": "application/json" } });

    const { data: tasks } = await db.from("tasks")
      .select("*").eq("household_id", household_id).eq("archived", false);

    let pushed = 0, completed = 0;

    for (const cred of creds) {
      const token = await accessToken(cred.refresh_token);
      const listId = cred.tasklist_id || await samenListId(token);
      if (!cred.tasklist_id) await db.from("google_credentials").update({ tasklist_id: listId }).eq("member_id", cred.member_id);

      // 1. Duwen: taken met deadline die van dit lid zijn (of van beiden), niet klaar.
      const mine = (tasks || []).filter((t: any) =>
        t.due_at && t.stage !== "done" && (t.shared || t.owner_id === cred.member_id));

      for (const t of mine) {
        const body: Record<string, unknown> = {
          title: t.title,
          notes: [t.reason, "— via Samen"].filter(Boolean).join("\n"),
          due: new Date(t.due_at).toISOString(),
        };
        if (t.google_task_id) {
          try {
            await gapi(token, `https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks/${t.google_task_id}`,
              { method: "PATCH", body: JSON.stringify(body) });
          } catch {
            // weggegooid in Google → opnieuw aanmaken
            const made = await gapi(token, `https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks`,
              { method: "POST", body: JSON.stringify(body) });
            await db.from("tasks").update({ google_task_id: made.id }).eq("id", t.id);
          }
        } else {
          const made = await gapi(token, `https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks`,
            { method: "POST", body: JSON.stringify(body) });
          await db.from("tasks").update({ google_task_id: made.id, google_synced_at: new Date().toISOString() }).eq("id", t.id);
        }
        pushed++;
      }

      // 2. Terughalen: in Google afgevinkt → in de app op 'klaar'.
      const remote = await gapi(token,
        `https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks?showCompleted=true&showHidden=true&maxResults=100`);
      const doneIds = (remote.items || []).filter((i: any) => i.status === "completed").map((i: any) => i.id);

      if (doneIds.length) {
        const hit = (tasks || []).filter((t: any) =>
          t.google_task_id && doneIds.includes(t.google_task_id) && t.stage !== "done");
        for (const t of hit) {
          // Tijd is in Google niet ingevuld → markeren zodat de app erom vraagt.
          await db.from("tasks").update({
            stage: "done", completed_at: new Date().toISOString(), time_pending: true,
          }).eq("id", t.id);
          completed++;

          // Terugkerende taak: archiveren en volgende ronde inplannen.
          if (t.recur_interval && t.recur_unit) {
            await db.from("tasks").update({ archived: true }).eq("id", t.id);
            const base = new Date(t.due_at || Date.now());
            const n = t.recur_interval;
            const today = new Date(); today.setHours(0, 0, 0, 0);
            let guard = 0;
            do {
              if (t.recur_unit === "day") base.setDate(base.getDate() + n);
              else if (t.recur_unit === "week") base.setDate(base.getDate() + n * 7);
              else if (t.recur_unit === "month") base.setMonth(base.getMonth() + n);
              else base.setFullYear(base.getFullYear() + n);
              guard++;
            } while (base < today && guard < 500);

            await db.from("tasks").insert({
              household_id, domain_id: t.domain_id, title: t.title, owner_id: t.owner_id,
              shared: t.shared, stage: "planning", origin: "recurrence", reason: t.reason,
              estimate_minutes: t.estimate_minutes, due_at: base.toISOString(),
              recur_interval: t.recur_interval, recur_unit: t.recur_unit,
              series_id: t.series_id || t.id,
            });
          }
        }
      }
    }

    await db.rpc("trim_done_tasks", { p_household: household_id });

    return new Response(JSON.stringify({ pushed, completed }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e.message || e) }), {
      status: 400, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
