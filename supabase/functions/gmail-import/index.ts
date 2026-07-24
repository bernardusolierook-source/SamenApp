// Samen — haalt Gmail-berichten met het label "Samen" op en zet ze als taak
// in de kolom "Bedenken". Bewaart alleen onderwerp, korte samenvatting en een
// permalink — nooit de volledige mailtekst.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { CORS, accessToken, gapi } from "../_shared/google.ts";

const API = "https://gmail.googleapis.com/gmail/v1/users/me";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const { household_id } = await req.json();
    if (!household_id) throw new Error("household_id ontbreekt");

    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: creds } = await db.from("google_credentials")
      .select("*").eq("household_id", household_id).eq("gmail_enabled", true);
    if (!creds?.length) {
      return new Response(JSON.stringify({ imported: 0, note: "gmail niet gekoppeld" }),
        { headers: { ...CORS, "Content-Type": "application/json" } });
    }

    let imported = 0;

    for (const cred of creds) {
      const token = await accessToken(cred.refresh_token);

      // Alleen berichten met het label "Samen".
      const list = await gapi(token, `${API}/messages?q=${encodeURIComponent("label:Samen")}&maxResults=25`);
      for (const m of list.messages || []) {
        // Al eerder geïmporteerd? Dan overslaan.
        const { data: exists } = await db.from("tasks")
          .select("id").eq("household_id", household_id).eq("gmail_message_id", m.id).maybeSingle();
        if (exists) continue;

        // metadata + snippet: genoeg voor titel en context, zonder de hele mail te kopiëren.
        const msg = await gapi(token,
          `${API}/messages/${m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From`);
        const headers = msg.payload?.headers || [];
        const subject = headers.find((h: any) => h.name === "Subject")?.value || "(geen onderwerp)";
        const from = headers.find((h: any) => h.name === "From")?.value || "";
        const snippet = (msg.snippet || "").slice(0, 300);
        const permalink = `https://mail.google.com/mail/u/0/#all/${m.id}`;

        const { data: task } = await db.from("tasks").insert({
          household_id,
          title: subject,
          owner_id: cred.member_id,
          stage: "conception",
          origin: "forwarded",
          reason: [from ? `Van: ${from}` : "", snippet].filter(Boolean).join("\n\n"),
          gmail_message_id: m.id,
        }).select("id").single();

        if (task) {
          await db.from("task_sources").insert({ task_id: task.id, type: "email", ref: permalink });
          imported++;
        }
      }
    }

    return new Response(JSON.stringify({ imported }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e.message || e) }), {
      status: 400, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
