import { supabase } from "./supabase";
import { STARTER_DOMAINS } from "./meta";

// ── auth ──
export async function signInWithGoogle() {
  await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
}
export async function signOut() { await supabase.auth.signOut(); }

// ── huishouden ──
export async function getMyHousehold() {
  const { data, error } = await supabase
    .from("household_members")
    .select("household_id, households(id, name, invite_code)")
    .limit(1).maybeSingle();
  if (error) throw error;
  return data?.households || null;
}
export async function createHousehold(name, displayName, color) {
  const { data, error } = await supabase.rpc("create_household", { p_name: name, p_display_name: displayName, p_color: color });
  if (error) throw error;
  const rows = STARTER_DOMAINS.map((d) => ({ ...d, household_id: data.household_id, owner_id: data.member_id }));
  await supabase.from("domains").insert(rows);
  return data;
}
export async function joinHousehold(code, displayName, color) {
  const { data, error } = await supabase.rpc("join_household", { p_code: code, p_display_name: displayName, p_color: color });
  if (error) throw error;
  return data;
}

// ── laden ──
export async function loadMembers(hhId) {
  const { data } = await supabase.from("household_members")
    .select("id, display_name, color, user_id").eq("household_id", hhId).order("created_at");
  return (data || []).map((m) => ({ id: m.id, name: m.display_name, color: m.color, userId: m.user_id }));
}
export async function loadDomains(hhId) {
  const { data } = await supabase.from("domains").select("*").eq("household_id", hhId).order("created_at");
  return data || [];
}
export async function loadTasks(hhId, archived = false) {
  const { data } = await supabase.from("tasks")
    .select("*, checklist_items(*), task_sources(*)").eq("household_id", hhId)
    .eq("archived", archived)
    .order("created_at", { ascending: false });
  return (data || []).map((t) => ({
    ...t,
    checklist: (t.checklist_items || []).sort((a, b) => a.position - b.position),
    sources: t.task_sources || [],
  }));
}

// ── kaarten (domains) ──
export const updateDomain = (id, patch) => supabase.from("domains").update(patch).eq("id", id);
export const setDomainActive = (id, active) => supabase.from("domains").update({ active }).eq("id", id);
export const createDomain = (row) => supabase.from("domains").insert(row);
export const deleteDomain = (id) => supabase.from("domains").delete().eq("id", id);

// ── taken (tasks) ──
export const updateTask = (id, patch) => supabase.from("tasks").update(patch).eq("id", id);
export const createTask = (task) => supabase.from("tasks").insert(task);
export const deleteTask = (id) => supabase.from("tasks").delete().eq("id", id);
export const setTaskStage = (id, stage) =>
  supabase.from("tasks").update({ stage, completed_at: stage === "done" ? new Date().toISOString() : null }).eq("id", id);
export const setHandoff = (id, toId) => supabase.from("tasks").update({ handoff_to: toId }).eq("id", id);

// ── checklist ──
export const addChecklistItem = (taskId, text, position) =>
  supabase.from("checklist_items").insert({ task_id: taskId, text, position });
export const updateChecklistItem = (id, patch) => supabase.from("checklist_items").update(patch).eq("id", id);
export const deleteChecklistItem = (id) => supabase.from("checklist_items").delete().eq("id", id);


// ── archief ──────────────────────────────────────────────────────────────
export const setTaskArchived = (id, archived) => supabase.from("tasks").update({ archived }).eq("id", id);
export const trimDoneTasks = (hhId) => supabase.rpc("trim_done_tasks", { p_household: hhId });
export async function countArchived(hhId) {
  const { count } = await supabase.from("tasks")
    .select("id", { count: "exact", head: true }).eq("household_id", hhId).eq("archived", true);
  return count || 0;
}

// ── google ───────────────────────────────────────────────────────────────
export async function getGoogleLink(memberId) {
  const { data } = await supabase.from("google_credentials")
    .select("member_id, gmail_enabled, connected_at").eq("member_id", memberId).maybeSingle();
  return data || null;
}
export const saveGoogleLink = (row) => supabase.from("google_credentials").upsert(row);
export const removeGoogleLink = (memberId) => supabase.from("google_credentials").delete().eq("member_id", memberId);

// Roept de Edge Functions aan (server-side sync met Google).
export async function runGoogleSync(householdId) {
  const { data, error } = await supabase.functions.invoke("google-sync", { body: { household_id: householdId } });
  if (error) throw error;
  return data;
}
export async function runGmailImport(householdId) {
  const { data, error } = await supabase.functions.invoke("gmail-import", { body: { household_id: householdId } });
  if (error) throw error;
  return data;
}

// ── realtime ──
export function subscribe(hhId, onChange) {
  const ch = supabase.channel(`hh:${hhId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `household_id=eq.${hhId}` }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "domains", filter: `household_id=eq.${hhId}` }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "household_members", filter: `household_id=eq.${hhId}` }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "checklist_items" }, onChange)
    .subscribe();
  return () => supabase.removeChannel(ch);
}
