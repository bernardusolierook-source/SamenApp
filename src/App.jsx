import React, { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "./lib/supabase";
import {
  getMyHousehold, loadMembers, loadDomains, loadTasks, subscribe, signOut,
  updateDomain, setDomainActive, createDomain, deleteDomain,
  updateTask, createTask, deleteTask, setHandoff,
  addChecklistItem, updateChecklistItem, deleteChecklistItem,
  setTaskArchived, trimDoneTasks, countArchived,
  getGoogleLink, removeGoogleLink, runGoogleSync, runGmailImport,
} from "./lib/data";
import { connectGoogle, captureGoogleTokens } from "./lib/google";
import { STAGES, STAGE_META, distribution, isOverdue, nextOccurrence } from "./lib/meta";
import { SignIn, Onboarding } from "./components/Onboarding";
import BalanceBar from "./components/BalanceBar";
import TaskCard from "./components/TaskCard";
import DomainCard from "./components/DomainCard";
import DomainDrawer from "./components/DomainDrawer";
import ConceptionCapture from "./components/ConceptionCapture";
import Drawer from "./components/Drawer";
import CompleteDialog from "./components/CompleteDialog";
import FilterBar from "./components/FilterBar";
import { ArrowLeft, Plus, RefreshCw, Link2 } from "lucide-react";

export default function App() {
  const [phase, setPhase] = useState("loading");
  const [hh, setHh] = useState(null);
  const [members, setMembers] = useState([]);
  const [domains, setDomains] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [archTasks, setArchTasks] = useState([]);
  const [archCount, setArchCount] = useState(0);
  const [view, setView] = useState("board");
  const [kaartFilter, setKaartFilter] = useState("active");
  const [ownerFilter, setOwnerFilter] = useState(null);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [selTaskId, setSelTaskId] = useState(null);
  const [selDomainId, setSelDomainId] = useState(null);
  const [domainCreate, setDomainCreate] = useState(false);
  const [focusDomainId, setFocusDomainId] = useState(null);
  const [showCode, setShowCode] = useState(false);
  const [completing, setCompleting] = useState(null);
  const [googleLink, setGoogleLink] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState("");

  const say = (m) => { setToast(m); setTimeout(() => setToast(""), 4000); };

  const refreshAll = useCallback(async (id) => {
    const [m, d, t, a, c] = await Promise.all([
      loadMembers(id), loadDomains(id), loadTasks(id, false), loadTasks(id, true), countArchived(id),
    ]);
    setMembers(m); setDomains(d); setTasks(t); setArchTasks(a); setArchCount(c);
    return m;
  }, []);

  const boot = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setPhase("signin"); return; }
    const household = await getMyHousehold();
    if (!household) { setPhase("onboarding"); return; }
    setHh(household);
    const m = await refreshAll(household.id);
    const me = m.find((x) => x.userId === session.user.id);
    if (me) {
      if (session.provider_refresh_token) await captureGoogleTokens(me, household.id);
      setGoogleLink(await getGoogleLink(me.id));
    }
    setPhase("ready");
  }, [refreshAll]);

  useEffect(() => {
    boot();
    const { data: sub } = supabase.auth.onAuthStateChange(() => boot());
    return () => sub.subscription.unsubscribe();
  }, [boot]);

  useEffect(() => {
    if (!hh) return;
    return subscribe(hh.id, () => refreshAll(hh.id));
  }, [hh, refreshAll]);

  const activeDomains = useMemo(() => domains.filter((d) => d.active), [domains]);
  const archivedDomains = useMemo(() => domains.filter((d) => !d.active), [domains]);
  const cardDist = useMemo(() => distribution(activeDomains, members), [activeDomains, members]);
  const taskDist = useMemo(() => distribution(tasks, members), [tasks, members]);
  const overdueCount = useMemo(() => tasks.filter(isOverdue).length, [tasks]);

  const domainById = (id) => domains.find((d) => d.id === id);
  const memberById = (id) => members.find((m) => m.id === id);
  const openCountFor = (id) => tasks.filter((t) => t.domain_id === id && t.stage !== "done").length;
  const lighterId = useMemo(() => {
    if (!members.length) return null;
    const c = cardDist.counts;
    return [...members].sort((a, b) => (c[a.id] || 0) - (c[b.id] || 0))[0].id;
  }, [members, cardDist]);

  const after = () => hh && refreshAll(hh.id);

  // ── fase-overgang; 'klaar' vraagt eerst om tijd ────────────────────────
  const requestStage = (task, stage) => {
    if (stage === "done") { setCompleting(task); return; }
    updateTask(task.id, { stage, completed_at: null }).then(after);
  };

  const confirmDone = async (minutes) => {
    const task = completing;
    setCompleting(null);
    const now = new Date().toISOString();
    await updateTask(task.id, { stage: "done", completed_at: now, spent_minutes: minutes, time_pending: false });

    if (task.recur_interval && task.recur_unit) {
      // reeks: huidige instantie meteen archiveren, volgende ronde inplannen
      await setTaskArchived(task.id, true);
      const base = task.due_at || task.scheduled_at || now;
      await createTask({
        household_id: hh.id, domain_id: task.domain_id, title: task.title,
        owner_id: task.owner_id, shared: task.shared, stage: "planning", origin: "recurrence",
        reason: task.reason, estimate_minutes: task.estimate_minutes,
        due_at: nextOccurrence(base, task.recur_interval, task.recur_unit),
        recur_interval: task.recur_interval, recur_unit: task.recur_unit,
        series_id: task.series_id || task.id,
      });
    }
    await trimDoneTasks(hh.id);
    after();
  };

  const patchTask = async (id, patch) => { await updateTask(id, patch); after(); };
  const changeTaskOwner = async (id, patch) => { await updateTask(id, patch); after(); };
  const doHandoff = async (task) => {
    if (task.handoff_to) await setHandoff(task.id, null);
    else { const o = members.find((m) => m.id !== task.owner_id); if (o) await setHandoff(task.id, o.id); }
    after();
  };
  const delTask = async (id) => { await deleteTask(id); setSelTaskId(null); after(); };
  const conceive = async (domain) => {
    await createTask({ household_id: hh.id, domain_id: domain.id, title: `${domain.name} — nieuwe ronde`,
      owner_id: domain.shared ? null : domain.owner_id, shared: !!domain.shared, stage: "conception",
      origin: "cadence", reason: `Cadans (${domain.cadence}) — tijd voor een nieuwe ronde.` });
    after();
  };
  const quickAdd = async (title, domain) => {
    await createTask({ household_id: hh.id, domain_id: domain?.id || null, title,
      owner_id: domain ? (domain.shared ? null : domain.owner_id) : lighterId,
      shared: domain ? !!domain.shared : false, stage: "conception", origin: "manual",
      reason: domain ? "Gekoppeld bij toevoegen." : "Handmatig toegevoegd — nog geen kaart gekoppeld." });
    after();
  };

  const toggleCheck = async (cid, done) => { await updateChecklistItem(cid, { done }); after(); };
  const addCheck = async (taskId, text) => {
    const t = tasks.find((x) => x.id === taskId);
    await addChecklistItem(taskId, text, t?.checklist?.length || 0); after();
  };
  const editCheck = async (cid, text) => { await updateChecklistItem(cid, { text }); after(); };
  const removeCheck = async (cid) => { await deleteChecklistItem(cid); after(); };

  const reassignDomain = async (id, patch) => { await updateDomain(id, patch); after(); };
  const patchDomain = async (id, patch) => { await updateDomain(id, patch); after(); };
  const archiveDomain = async (id) => { await setDomainActive(id, false); after(); };
  const restoreDomain = async (id) => { await setDomainActive(id, true); after(); };
  const delDomain = async (id) => {
    await deleteDomain(id); setSelDomainId(null);
    if (focusDomainId === id) setFocusDomainId(null);
    after();
  };
  const createNewDomain = async (f) => {
    await createDomain({ household_id: hh.id, name: f.name.trim(), category: f.category, cadence: f.cadence,
      standard: f.standard, owner_id: f.shared ? null : f.owner_id, shared: !!f.shared, active: true });
    setDomainCreate(false); after();
  };
  const renameMember = async (id, name) => {
    await supabase.from("household_members").update({ display_name: name }).eq("id", id); after();
  };

  // ── google ─────────────────────────────────────────────────────────────
  const doSync = async () => {
    setSyncing(true);
    try {
      const r = await runGoogleSync(hh.id);
      say(`Synchronisatie klaar${r?.pushed != null ? ` — ${r.pushed} verstuurd, ${r.completed || 0} afgevinkt` : ""}.`);
      if (googleLink?.gmail_enabled) {
        const g = await runGmailImport(hh.id);
        if (g?.imported) say(`${g.imported} mail(s) geïmporteerd.`);
      }
      after();
    } catch (e) {
      say(`Synchronisatie mislukt: ${e.message || e}`);
    } finally { setSyncing(false); }
  };

  if (phase === "loading") return <div className="gate"><div style={{ color: "var(--soft)" }}>Laden…</div></div>;
  if (phase === "signin") return <SignIn />;
  if (phase === "onboarding") return <Onboarding onDone={boot} />;

  const selTask = [...tasks, ...archTasks].find((t) => t.id === selTaskId);
  const selDomain = domainById(selDomainId);
  const focusDomain = domainById(focusDomainId);

  const applyFilters = (list) => list.filter((t) => {
    if (ownerFilter === "both" && !t.shared) return false;
    if (ownerFilter && ownerFilter !== "both" && (t.shared || t.owner_id !== ownerFilter)) return false;
    if (overdueOnly && !isOverdue(t)) return false;
    return true;
  });

  const renderBoard = (taskList, fixedDomain = null) => {
    const list = applyFilters(taskList);
    return (
      <div className="board">
        {STAGES.map((stage, si) => {
          const col = list.filter((t) => t.stage === stage);
          return (
            <div className="colm" key={stage}>
              <div className="colhead">
                <span className="mark disp">{STAGE_META[stage].mark}</span>
                <span className="ttl">{STAGE_META[stage].label}</span>
                <span className="cnt">{col.length}</span>
                {stage === "done" && (
                  <button className="cnt archcnt" title="Bekijk gearchiveerde taken"
                    onClick={() => setView("archief")}>{archCount}</button>
                )}
              </div>
              <div className="progress">{STAGES.map((_, i) => <i key={i} data-fill={i <= si ? 1 : 0} />)}</div>
              {stage === "conception" && (
                <div style={{ marginBottom: 10 }}>
                  <ConceptionCapture domains={activeDomains} people={members} onAdd={quickAdd} fixedDomain={fixedDomain} />
                </div>
              )}
              {col.length === 0 && <div className="empty">Niets hier — {STAGE_META[stage].hint}.</div>}
              {col.map((t) => (
                <TaskCard key={t.id} task={t} domain={domainById(t.domain_id)} owner={memberById(t.owner_id)}
                  onOpen={setSelTaskId} onAdvance={(tk) => requestStage(tk, STAGES[STAGES.indexOf(tk.stage) + 1])} />
              ))}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="wrap">
      <div className="top">
        <div className="brandrow">
          <svg className="logomark" width="40" height="40" viewBox="0 0 64 64" aria-hidden="true">
            <rect x="2" y="2" width="60" height="60" rx="15" fill="#232A26" />
            <clipPath id="lm"><circle cx="27" cy="27" r="14.5" /></clipPath>
            <circle cx="27" cy="27" r="14.5" fill="#2E9A83" />
            <circle cx="37" cy="37" r="14.5" fill="#AE6389" />
            <circle cx="37" cy="37" r="14.5" fill="#6E7E86" clipPath="url(#lm)" />
          </svg>
          <div>
            <div className="brand">Samen</div>
            <div className="tag">Elke taak van bedenken tot klaar — op één plek, met één eigenaar.</div>
          </div>
        </div>
        <div className="tools">
          <div className="seg">
            <button data-on={view === "board" && !focusDomain ? 1 : 0} onClick={() => { setFocusDomainId(null); setView("board"); }}>Bord</button>
            <button data-on={view === "kaarten" && !focusDomain ? 1 : 0} onClick={() => { setFocusDomainId(null); setView("kaarten"); }}>Kaarten</button>
          </div>
          {googleLink
            ? <button className="ghost" onClick={doSync} disabled={syncing}>
                <RefreshCw size={13} className={syncing ? "spin" : ""} />{syncing ? "Bezig…" : "Sync"}
              </button>
            : <button className="ghost" onClick={() => connectGoogle({ withGmail: false })}><Link2 size={13} />Koppel Google</button>}
          <button className="ghost" onClick={() => setShowCode((s) => !s)}>Uitnodigen</button>
          <button className="ghost" onClick={signOut}>Uitloggen</button>
        </div>
      </div>

      {showCode && (
        <div className="balance" style={{ marginBottom: 14 }}>
          <div className="bhead"><span className="lab disp">Nodig je partner uit</span></div>
          <p style={{ color: "var(--soft)", fontSize: 13, margin: "0 0 4px" }}>
            Laat je partner inloggen met Google en "Aansluiten met code" kiezen. Deel deze code:
          </p>
          <div className="codebox">{hh.invite_code}</div>
          <div className="navrow">
            {googleLink
              ? <>
                  <button className="btn" onClick={() => connectGoogle({ withGmail: true })}>Gmail-label ook koppelen</button>
                  <button className="btn danger" onClick={async () => {
                    const me = members.find((m) => m.id === googleLink.member_id);
                    if (me) { await removeGoogleLink(me.id); setGoogleLink(null); say("Google-koppeling verwijderd."); }
                  }}>Google ontkoppelen</button>
                </>
              : <button className="btn" onClick={() => connectGoogle({ withGmail: true })}>Koppel Google incl. Gmail</button>}
          </div>
        </div>
      )}

      {focusDomain ? (
        <>
          <button className="ghost" style={{ marginBottom: 12 }} onClick={() => setFocusDomainId(null)}><ArrowLeft size={14} /> Terug</button>
          <div className="focushead">
            <div>
              <div className="eyebrow">Bord voor kaart</div>
              <div className="disp" style={{ fontWeight: 800, fontSize: 22 }}>{focusDomain.name}</div>
            </div>
            <button className="btn" onClick={() => setSelDomainId(focusDomain.id)}>Kaart bewerken</button>
          </div>
          {renderBoard(tasks.filter((t) => t.domain_id === focusDomain.id), focusDomain)}
        </>
      ) : view === "archief" ? (
        <>
          <button className="ghost" style={{ marginBottom: 12 }} onClick={() => setView("board")}><ArrowLeft size={14} /> Terug naar bord</button>
          <div className="focushead">
            <div>
              <div className="eyebrow">Archief</div>
              <div className="disp" style={{ fontWeight: 800, fontSize: 22 }}>{archCount} gearchiveerde taken</div>
            </div>
          </div>
          <div className="grid">
            {archTasks.map((t) => (
              <TaskCard key={t.id} task={t} domain={domainById(t.domain_id)} owner={memberById(t.owner_id)}
                onOpen={setSelTaskId} onAdvance={() => {}} />
            ))}
            {archTasks.length === 0 && <div className="empty" style={{ gridColumn: "1 / -1" }}>Nog niets gearchiveerd.</div>}
          </div>
        </>
      ) : view === "board" ? (
        <>
          <BalanceBar label="Verdeling van taken" people={members} counts={taskDist.counts} total={taskDist.total}
            onRename={renameMember} onPick={setOwnerFilter} active={ownerFilter} />
          <FilterBar people={members} ownerFilter={ownerFilter} onClearOwner={() => setOwnerFilter(null)}
            overdueOnly={overdueOnly} onToggleOverdue={() => setOverdueOnly((v) => !v)} overdueCount={overdueCount} />
          {renderBoard(tasks)}
        </>
      ) : (
        <>
          <BalanceBar label="Verdeling van kaarten" people={members} counts={cardDist.counts} total={cardDist.total}
            onRename={renameMember} />
          <div className="kaartbar">
            <div className="seg">
              <button data-on={kaartFilter === "active" ? 1 : 0} onClick={() => setKaartFilter("active")}>Actief · {activeDomains.length}</button>
              <button data-on={kaartFilter === "archive" ? 1 : 0} onClick={() => setKaartFilter("archive")}>Archief · {archivedDomains.length}</button>
            </div>
            <button className="btn dark" onClick={() => setDomainCreate(true)}><Plus size={15} />Nieuwe kaart</button>
          </div>
          <div className="grid">
            {(kaartFilter === "active" ? activeDomains : archivedDomains).map((d) => (
              <DomainCard key={d.id} domain={d} people={members} openCount={openCountFor(d.id)}
                onOpen={setSelDomainId} onReassign={reassignDomain} onRestore={restoreDomain} onFocus={setFocusDomainId} />
            ))}
            {(kaartFilter === "active" ? activeDomains : archivedDomains).length === 0 && (
              <div className="empty" style={{ gridColumn: "1 / -1" }}>
                {kaartFilter === "archive" ? "Nog niets gearchiveerd." : "Geen actieve kaarten."}
              </div>
            )}
          </div>
        </>
      )}

      {toast && <div className="toast">{toast}</div>}

      {completing && (
        <CompleteDialog task={completing} onCancel={() => setCompleting(null)} onConfirm={confirmDone} />
      )}

      {selTask && (
        <Drawer task={selTask} domain={domainById(selTask.domain_id)} domains={domains} people={members}
          onClose={() => setSelTaskId(null)} onStage={requestStage} onOwner={changeTaskOwner} onHandoff={doHandoff}
          onToggleCheck={toggleCheck} onAddCheck={addCheck} onEditCheck={editCheck} onRemoveCheck={removeCheck}
          onPatch={patchTask} onDelete={delTask} />
      )}

      {(selDomain || domainCreate) && (
        <DomainDrawer mode={domainCreate ? "create" : "edit"} domain={selDomain} people={members}
          blockingCount={selDomain ? openCountFor(selDomain.id) : 0}
          onClose={() => { setSelDomainId(null); setDomainCreate(false); }}
          onCreate={createNewDomain} onPatch={patchDomain} onArchive={archiveDomain} onRestore={restoreDomain}
          onDelete={delDomain} onFocus={(id) => { setSelDomainId(null); setFocusDomainId(id); }}
          onConceive={(d) => { setSelDomainId(null); conceive(d); }} />
      )}
    </div>
  );
}
