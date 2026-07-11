import React, { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "./lib/supabase";
import {
  getMyHousehold, loadMembers, loadDomains, loadTasks, subscribe, signOut,
  setDomainOwner, setDomainActive, setTaskStage, setTaskOwner, setHandoff, toggleChecklistItem, createTask,
} from "./lib/data";
import { STAGES, STAGE_META } from "./lib/meta";
import { SignIn, Onboarding } from "./components/Onboarding";
import BalanceBar from "./components/BalanceBar";
import TaskCard from "./components/TaskCard";
import DomainCard from "./components/DomainCard";
import ConceptionCapture from "./components/ConceptionCapture";
import Drawer from "./components/Drawer";

export default function App() {
  const [phase, setPhase] = useState("loading"); // loading | signin | onboarding | ready
  const [hh, setHh] = useState(null);
  const [members, setMembers] = useState([]);
  const [domains, setDomains] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [view, setView] = useState("board");
  const [selId, setSelId] = useState(null);
  const [showCode, setShowCode] = useState(false);
  const [kaartFilter, setKaartFilter] = useState("active");

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
    const unsub = subscribe(hh.id, () => refreshAll(hh.id));
    return unsub;
  }, [hh, refreshAll]);

  const activeDomains = useMemo(() => domains.filter((d) => d.active), [domains]);
  const archivedDomains = useMemo(() => domains.filter((d) => !d.active), [domains]);

  const counts = useMemo(() => {
    const c = {};
    activeDomains.forEach((d) => { if (d.owner_id) c[d.owner_id] = (c[d.owner_id] || 0) + 1; });
    return c;
  }, [activeDomains]);

  const lighterId = useMemo(() => {
    if (members.length === 0) return null;
    return [...members].sort((a, b) => (counts[a.id] || 0) - (counts[b.id] || 0))[0].id;
  }, [members, counts]);

  const domainById = (id) => domains.find((d) => d.id === id);
  const memberById = (id) => members.find((m) => m.id === id);

  // mutaties (realtime ververst bij de partner; lokaal ook even verversen voor snelheid)
  const after = () => hh && refreshAll(hh.id);
  const advance = async (id, stage) => { await setTaskStage(id, stage); after(); };
  const reassignDomain = async (id, owner) => { await setDomainOwner(id, owner); after(); };
  const archiveDomain = async (id) => { await setDomainActive(id, false); after(); };
  const restoreDomain = async (id) => { await setDomainActive(id, true); after(); };
  const changeTaskOwner = async (id, owner) => { await setTaskOwner(id, owner); after(); };
  const toggleCheck = async (cid, done) => { await toggleChecklistItem(cid, done); after(); };
  const renameMember = async (id, name) => { await supabase.from("household_members").update({ display_name: name }).eq("id", id); after(); };

  const doHandoff = async (task) => {
    if (task.handoff_to) await setHandoff(task.id, null);
    else { const other = members.find((m) => m.id !== task.owner_id); if (other) await setHandoff(task.id, other.id); }
    after();
  };

  const conceive = async (domain) => {
    await createTask({
      household_id: hh.id, domain_id: domain.id, title: `${domain.name} — nieuwe ronde`,
      owner_id: domain.owner_id, stage: "conception", origin: "cadence",
      reason: `Cadence (${domain.cadence}) — tijd voor een nieuwe ronde.`,
    });
    setView("board"); after();
  };

  const quickAdd = async (title, domain) => {
    await createTask({
      household_id: hh.id, domain_id: domain?.id || null, title,
      owner_id: domain?.owner_id || lighterId, stage: "conception", origin: "manual",
      reason: domain ? "Gekoppeld bij toevoegen." : "Handmatig toegevoegd — nog geen kaart gekoppeld.",
    });
    after();
  };

  if (phase === "loading")
    return <div className="gate"><div style={{ color: "var(--soft)" }}>Laden…</div></div>;
  if (phase === "signin") return <SignIn />;
  if (phase === "onboarding") return <Onboarding onDone={boot} />;

  const sel = tasks.find((t) => t.id === selId);

  return (
    <div className="wrap">
      <div className="top">
        <div>
          <div className="brand">Samen</div>
          <div className="tag">Elke taak van bedenken tot klaar — op één plek, met één eigenaar.</div>
        </div>
        <div className="tools">
          <div className="seg">
            <button data-on={view === "board" ? 1 : 0} onClick={() => setView("board")}>Bord</button>
            <button data-on={view === "kaarten" ? 1 : 0} onClick={() => setView("kaarten")}>Kaarten</button>
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

      <BalanceBar people={members} counts={counts} total={activeDomains.length} onRename={renameMember} />

      {view === "board" ? (
        <div className="board">
          {STAGES.map((stage, si) => {
            const list = tasks.filter((t) => t.stage === stage);
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
                    <ConceptionCapture domains={domains} people={members} onAdd={quickAdd} />
                  </div>
                )}
                {list.length === 0 && <div className="empty">Niets hier — {STAGE_META[stage].hint}.</div>}
                {list.map((t) => (
                  <TaskCard key={t.id} task={t} domain={domainById(t.domain_id)}
                    owner={memberById(t.owner_id)} onOpen={setSelId} onAdvance={(id) => advance(id, STAGES[si + 1])} />
                ))}
              </div>
            );
          })}
        </div>
      ) : (
        <>
          <div className="seg" style={{ marginBottom: 14 }}>
            <button data-on={kaartFilter === "active" ? 1 : 0} onClick={() => setKaartFilter("active")}>
              Actief · {activeDomains.length}
            </button>
            <button data-on={kaartFilter === "archive" ? 1 : 0} onClick={() => setKaartFilter("archive")}>
              Archief · {archivedDomains.length}
            </button>
          </div>
          <div className="grid">
            {(kaartFilter === "active" ? activeDomains : archivedDomains).map((d) => (
              <DomainCard key={d.id} domain={d} people={members}
                openCount={tasks.filter((t) => t.domain_id === d.id && t.stage !== "done").length}
                onReassign={reassignDomain} onConceive={conceive}
                onArchive={archiveDomain} onRestore={restoreDomain} />
            ))}
            {(kaartFilter === "active" ? activeDomains : archivedDomains).length === 0 && (
              <div className="empty" style={{ gridColumn: "1 / -1" }}>
                {kaartFilter === "archive" ? "Nog niets gearchiveerd." : "Geen actieve kaarten."}
              </div>
            )}
          </div>
        </>
      )}

      {sel && (
        <Drawer task={sel} domain={domainById(sel.domain_id)} people={members}
          onClose={() => setSelId(null)} onStage={advance} onOwner={changeTaskOwner}
          onHandoff={doHandoff} onToggleCheck={toggleCheck} />
      )}
    </div>
  );
}
