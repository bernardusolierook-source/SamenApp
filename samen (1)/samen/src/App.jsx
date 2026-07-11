import React, { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "./lib/supabase";
import {
  getMyHousehold, loadMembers, loadDomains, loadTasks, subscribe, signOut,
  updateDomain, setDomainActive, createDomain, deleteDomain,
  updateTask, createTask, deleteTask, setTaskStage, setHandoff,
  addChecklistItem, updateChecklistItem, deleteChecklistItem,
} from "./lib/data";
import { STAGES, STAGE_META, distribution } from "./lib/meta";
import { SignIn, Onboarding } from "./components/Onboarding";
import BalanceBar from "./components/BalanceBar";
import TaskCard from "./components/TaskCard";
import DomainCard from "./components/DomainCard";
import DomainDrawer from "./components/DomainDrawer";
import ConceptionCapture from "./components/ConceptionCapture";
import Drawer from "./components/Drawer";
import { ArrowLeft, Plus } from "lucide-react";

export default function App() {
  const [phase, setPhase] = useState("loading");
  const [hh, setHh] = useState(null);
  const [members, setMembers] = useState([]);
  const [domains, setDomains] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [view, setView] = useState("board");
  const [kaartFilter, setKaartFilter] = useState("active");
  const [selTaskId, setSelTaskId] = useState(null);
  const [selDomainId, setSelDomainId] = useState(null);
  const [domainCreate, setDomainCreate] = useState(false);
  const [focusDomainId, setFocusDomainId] = useState(null);
  const [showCode, setShowCode] = useState(false);

  const refreshAll = useCallback(async (id) => {
    const [m, d, t] = await Promise.all([loadMembers(id), loadDomains(id), loadTasks(id)]);
    setMembers(m); setDomains(d); setTasks(t);
  }, []);

  const boot = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setPhase("signin"); return; }
    const household = await getMyHousehold();
    if (!household) { setPhase("onboarding"); return; }
    setHh(household);
    await refreshAll(household.id);
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

  const domainById = (id) => domains.find((d) => d.id === id);
  const memberById = (id) => members.find((m) => m.id === id);
  const blockingFor = (domainId) => tasks.filter((t) => t.domain_id === domainId && t.stage !== "done").length;
  const openCountFor = (domainId) => tasks.filter((t) => t.domain_id === domainId && t.stage !== "done").length;
  const lighterId = useMemo(() => {
    if (members.length === 0) return null;
    const c = cardDist.counts;
    return [...members].sort((a, b) => (c[a.id] || 0) - (c[b.id] || 0))[0].id;
  }, [members, cardDist]);

  const after = () => hh && refreshAll(hh.id);

  // taken
  const advance = async (id, stage) => { await setTaskStage(id, stage); after(); };
  const patchTask = async (id, patch) => { await updateTask(id, patch); after(); };
  const changeTaskOwner = async (id, patch) => { await updateTask(id, patch); after(); };
  const doHandoff = async (task) => {
    if (task.handoff_to) await setHandoff(task.id, null);
    else { const other = members.find((m) => m.id !== task.owner_id); if (other) await setHandoff(task.id, other.id); }
    after();
  };
  const delTask = async (id) => { await deleteTask(id); setSelTaskId(null); after(); };
  const conceive = async (domain) => {
    await createTask({ household_id: hh.id, domain_id: domain.id, title: `${domain.name} — nieuwe ronde`,
      owner_id: domain.shared ? null : domain.owner_id, shared: !!domain.shared, stage: "conception", origin: "cadence",
      reason: `Cadans (${domain.cadence}) — tijd voor een nieuwe ronde.` });
    after();
  };
  const quickAdd = async (title, domain) => {
    await createTask({ household_id: hh.id, domain_id: domain?.id || null, title,
      owner_id: domain ? (domain.shared ? null : domain.owner_id) : lighterId, shared: domain ? !!domain.shared : false,
      stage: "conception", origin: "manual",
      reason: domain ? "Gekoppeld bij toevoegen." : "Handmatig toegevoegd — nog geen kaart gekoppeld." });
    after();
  };
  // checklist
  const toggleCheck = async (cid, done) => { await updateChecklistItem(cid, { done }); after(); };
  const addCheck = async (taskId, text) => { const t = tasks.find((x) => x.id === taskId); await addChecklistItem(taskId, text, t?.checklist?.length || 0); after(); };
  const editCheck = async (cid, text) => { await updateChecklistItem(cid, { text }); after(); };
  const removeCheck = async (cid) => { await deleteChecklistItem(cid); after(); };

  // kaarten
  const reassignDomain = async (id, patch) => { await updateDomain(id, patch); after(); };
  const patchDomain = async (id, patch) => { await updateDomain(id, patch); after(); };
  const archiveDomain = async (id) => { await setDomainActive(id, false); after(); };
  const restoreDomain = async (id) => { await setDomainActive(id, true); after(); };
  const delDomain = async (id) => {
    await deleteDomain(id);
    setSelDomainId(null);
    if (focusDomainId === id) setFocusDomainId(null);
    after();
  };
  const createNewDomain = async (f) => {
    await createDomain({ household_id: hh.id, name: f.name.trim(), category: f.category, cadence: f.cadence,
      standard: f.standard, owner_id: f.shared ? null : f.owner_id, shared: !!f.shared, active: true });
    setDomainCreate(false); after();
  };

  const renameMember = async (id, name) => { await supabase.from("household_members").update({ display_name: name }).eq("id", id); after(); };

  if (phase === "loading") return <div className="gate"><div style={{ color: "var(--soft)" }}>Laden…</div></div>;
  if (phase === "signin") return <SignIn />;
  if (phase === "onboarding") return <Onboarding onDone={boot} />;

  const selTask = tasks.find((t) => t.id === selTaskId);
  const selDomain = domainById(selDomainId);
  const focusDomain = domainById(focusDomainId);

  const renderBoard = (taskList, fixedDomain = null) => (
    <div className="board">
      {STAGES.map((stage, si) => {
        const list = taskList.filter((t) => t.stage === stage);
        return (
          <div className="colm" key={stage}>
            <div className="colhead">
              <span className="mark disp">{STAGE_META[stage].mark}</span>
              <span className="ttl">{STAGE_META[stage].label}</span>
              <span className="cnt">{list.length}</span>
            </div>
            <div className="progress">{STAGES.map((_, i) => <i key={i} data-fill={i <= si ? 1 : 0} />)}</div>
            {stage === "conception" && (
              <div style={{ marginBottom: 10 }}>
                <ConceptionCapture domains={activeDomains} people={members} onAdd={quickAdd} fixedDomain={fixedDomain} />
              </div>
            )}
            {list.length === 0 && <div className="empty">Niets hier — {STAGE_META[stage].hint}.</div>}
            {list.map((t) => (
              <TaskCard key={t.id} task={t} domain={domainById(t.domain_id)} owner={memberById(t.owner_id)}
                onOpen={setSelTaskId} onAdvance={(id) => advance(id, STAGES[STAGES.indexOf(t.stage) + 1])} />
            ))}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="wrap">
      <div className="top">
        <div>
          <div className="brand">Samen</div>
          <div className="tag">Elke taak van bedenken tot klaar — op één plek, met één eigenaar.</div>
        </div>
        <div className="tools">
          <div className="seg">
            <button data-on={view === "board" && !focusDomain ? 1 : 0} onClick={() => { setFocusDomainId(null); setView("board"); }}>Bord</button>
            <button data-on={view === "kaarten" && !focusDomain ? 1 : 0} onClick={() => { setFocusDomainId(null); setView("kaarten"); }}>Kaarten</button>
          </div>
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
            <button className="btn" onClick={() => { setSelDomainId(focusDomain.id); }}>Kaart bewerken</button>
          </div>
          {renderBoard(tasks.filter((t) => t.domain_id === focusDomain.id), focusDomain)}
        </>
      ) : view === "board" ? (
        <>
          <BalanceBar label="Verdeling van taken" people={members} counts={taskDist.counts} total={taskDist.total} onRename={renameMember} />
          {renderBoard(tasks)}
        </>
      ) : (
        <>
          <BalanceBar label="Verdeling van kaarten" people={members} counts={cardDist.counts} total={cardDist.total} onRename={renameMember} />
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

      {selTask && (
        <Drawer task={selTask} domain={domainById(selTask.domain_id)} people={members}
          onClose={() => setSelTaskId(null)} onStage={advance} onOwner={changeTaskOwner} onHandoff={doHandoff}
          onToggleCheck={toggleCheck} onAddCheck={addCheck} onEditCheck={editCheck} onRemoveCheck={removeCheck}
          onPatch={patchTask} onDelete={delTask} />
      )}

      {(selDomain || domainCreate) && (
        <DomainDrawer mode={domainCreate ? "create" : "edit"} domain={selDomain} people={members}
          blockingCount={selDomain ? blockingFor(selDomain.id) : 0}
          onClose={() => { setSelDomainId(null); setDomainCreate(false); }}
          onCreate={createNewDomain} onPatch={patchDomain} onArchive={archiveDomain} onRestore={restoreDomain}
          onDelete={delDomain} onFocus={(id) => { setSelDomainId(null); setFocusDomainId(id); }} onConceive={(d) => { setSelDomainId(null); conceive(d); }} />
      )}
    </div>
  );
}
