import { supabase } from "./supabase";
import { STARTER_DOMAINS } from "./meta";

// ── auth ────────────────────────────────────────────────────────────────

export async function signInWithGoogle() {
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin },
  });
}

export async function signOut() {
  await supabase.auth.signOut();
}

// ── huishouden ──────────────────────────────────────────────────────────

export async function getMyHousehold() {
  const { data, error } = await supabase
    .from("household_members")
    .select("household_id, households(id, name, invite_code)")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.households || null;
}

export async function createHousehold(name, displayName, color) {
  const { data, error } = await supabase.rpc("create_household", {
    p_name: name, p_display_name: displayName, p_color: color,
  });
  if (error) throw error;
  // starterset kaarten toevoegen, allemaal bij de oprichter
  const rows = STARTER_DOMAINS.map((d) => ({ ...d, household_id: data.household_id, owner_id: data.member_id }));
  await supabase.from("domains").insert(rows);
  return data;
}

export async function joinHousehold(code, displayName, color) {
  const { data, error } = await supabase.rpc("join_household", {
    p_code: code, p_display_name: displayName, p_color: color,
  });
  if (error) throw error;
  return data;
}

// ── laden ───────────────────────────────────────────────────────────────

export async function loadMembers(hhId) {
  const { data } = await supabase.from("household_members")
    .select("id, display_name, color, user_id").eq("household_id", hhId).order("created_at");
  return (data || []).map((m) => ({ id: m.id, name: m.display_name, color: m.color, userId: m.user_id }));
}

export async function loadDomains(hhId) {
  const { data } = await supabase.from("domains")
    .select("*").eq("household_id", hhId).order("created_at");
  return data || [];
}

export async function loadTasks(hhId) {
  const { data } = await supabase.from("tasks")
    .select("*, checklist_items(*), task_sources(*)")
    .eq("household_id", hhId).order("created_at", { ascending: false });
  return (data || []).map((t) => ({
    ...t,
    checklist: (t.checklist_items || []).sort((a, b) => a.position - b.position),
    sources: t.task_sources || [],
  }));
}

// ── mutaties ────────────────────────────────────────────────────────────

export const setDomainOwner = (id, ownerId) =>
  supabase.from("domains").update({ owner_id: ownerId }).eq("id", id);

export const setDomainActive = (id, active) =>
  supabase.from("domains").update({ active }).eq("id", id);

export const setTaskStage = (id, stage) =>
  supabase.from("tasks").update({
    stage, completed_at: stage === "done" ? new Date().toISOString() : null,
  }).eq("id", id);

export const setTaskOwner = (id, ownerId) =>
  supabase.from("tasks").update({ owner_id: ownerId, handoff_to: null, handoff_until: null }).eq("id", id);

export const setHandoff = (id, toId) =>
  supabase.from("tasks").update({ handoff_to: toId }).eq("id", id);

export const toggleChecklistItem = (id, done) =>
  supabase.from("checklist_items").update({ done }).eq("id", id);

export const createTask = (task) => supabase.from("tasks").insert(task);

// ── realtime ────────────────────────────────────────────────────────────

export function subscribe(hhId, onChange) {
  const ch = supabase
    .channel(`hh:${hhId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `household_id=eq.${hhId}` }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "domains", filter: `household_id=eq.${hhId}` }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "household_members", filter: `household_id=eq.${hhId}` }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "checklist_items" }, onChange)
    .subscribe();
  return () => supabase.removeChannel(ch);
}
