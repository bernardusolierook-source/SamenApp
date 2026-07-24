import React, { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight, ArrowRightLeft, Circle, CheckCircle2, Plus, Trash2, ExternalLink, AlertTriangle } from "lucide-react";
import { STAGES, STAGE_META, CAT_META, SOURCE_META, RECUR_UNITS, isOverdue } from "../lib/meta";
import OwnerPicker from "./OwnerPicker";

export default function Drawer({
  task, domain, domains, people, onClose, onStage, onOwner, onHandoff,
  onToggleCheck, onAddCheck, onEditCheck, onRemoveCheck, onPatch, onDelete,
}) {
  const [title, setTitle] = useState(task.title);
  const [reason, setReason] = useState(task.reason || "");
  const [date, setDate] = useState((task.due_at || task.scheduled_at || "").slice(0, 10));
  const [estimate, setEstimate] = useState(task.estimate_minutes ?? "");
  const [newItem, setNewItem] = useState("");
  useEffect(() => {
    setTitle(task.title); setReason(task.reason || "");
    setDate((task.due_at || task.scheduled_at || "").slice(0, 10));
    setEstimate(task.estimate_minutes ?? "");
  }, [task.id]);

  const stageIdx = STAGES.indexOf(task.stage);
  const over = isOverdue(task);
  const commitDate = (v) => { setDate(v); onPatch(task.id, { due_at: v ? `${v}T09:00:00Z` : null }); };
  const addItem = () => { const t = newItem.trim(); if (t) { onAddCheck(task.id, t); setNewItem(""); } };
  const setRecur = (interval, unit) => onPatch(task.id, { recur_interval: interval, recur_unit: unit });

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="draw">
        <div className="dh">
          <div style={{ flex: 1 }}>
            <div className="eyebrow" style={{ marginBottom: 6 }}>
              {domain ? <>{CAT_META[domain.category].label} · {domain.name}</> : "los · geen kaart"}
            </div>
            <input className="din titlein" value={title} onChange={(e) => setTitle(e.target.value)}
              onBlur={() => title.trim() && title !== task.title && onPatch(task.id, { title: title.trim() })} />
          </div>
          <button className="x" onClick={onClose} aria-label="Sluiten"><X size={16} /></button>
        </div>

        <div className="db">
          {over && (
            <div className="warn"><AlertTriangle size={15} />Deze taak is over de deadline.</div>
          )}

          <div className="sec" style={{ marginTop: 4 }}>Fase</div>
          <div className="stages">
            {STAGES.map((s) => <div className="st" key={s} data-on={s === task.stage ? 1 : 0}>{STAGE_META[s].label}</div>)}
          </div>
          <div className="navrow">
            <button className="btn" disabled={stageIdx === 0} onClick={() => onStage(task, STAGES[stageIdx - 1])}><ChevronLeft size={14} />Vorige</button>
            <button className="btn dark" disabled={task.stage === "done"} onClick={() => onStage(task, STAGES[stageIdx + 1])}>
              {task.stage === "execution" ? "Markeer klaar" : "Volgende"}<ChevronRight size={14} />
            </button>
          </div>

          <div className="sec">Kaart</div>
          <select className="din" value={task.domain_id || ""}
            onChange={(e) => onPatch(task.id, { domain_id: e.target.value || null })}>
            <option value="">— geen kaart —</option>
            {domains.filter((d) => d.active).map((d) => (
              <option key={d.id} value={d.id}>{CAT_META[d.category].label} · {d.name}</option>
            ))}
          </select>

          <div className="sec">Waarom dit nu</div>
          <textarea className="din dtext" value={reason} placeholder="Aanleiding / context"
            onChange={(e) => setReason(e.target.value)} onBlur={() => reason !== (task.reason || "") && onPatch(task.id, { reason })} />

          <div className="sec">Eigenaar</div>
          <OwnerPicker people={people} value={{ owner_id: task.owner_id, shared: task.shared }}
            onChange={(patch) => onOwner(task.id, patch)} />
          {people.length > 1 && !task.shared && (
            <div style={{ marginTop: 10 }}>
              <button className="btn" onClick={() => onHandoff(task)}>
                <ArrowRightLeft size={14} />
                {task.handoff_to ? `Tijdelijk bij ${people.find((p) => p.id === task.handoff_to)?.name} — terugnemen` : "Tijdelijk overdragen"}
              </button>
            </div>
          )}

          <div className="sec">Deadline</div>
          <input className="din" type="date" value={date} onChange={(e) => commitDate(e.target.value)} />
          <p className="hint">Met een deadline verschijnt de taak ook in Google Taken van de eigenaar.</p>

          <div className="sec">Herhaling</div>
          <div className="recurrow">
            <input className="din nrw" type="number" min="1" placeholder="1"
              value={task.recur_interval ?? ""}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10);
                setRecur(Number.isFinite(n) && n > 0 ? n : null, Number.isFinite(n) && n > 0 ? (task.recur_unit || "week") : null);
              }} />
            <select className="din" value={task.recur_unit || ""} disabled={!task.recur_interval}
              onChange={(e) => setRecur(task.recur_interval || 1, e.target.value || null)}>
              {RECUR_UNITS.map((u) => <option key={u.unit} value={u.unit}>{u.label}</option>)}
            </select>
            {task.recur_interval && (
              <button className="btn" onClick={() => setRecur(null, null)}>Uit</button>
            )}
          </div>
          {task.recur_interval
            ? <p className="hint">Zodra je deze taak op klaar zet, wordt hij gearchiveerd en verschijnt de volgende ronde automatisch bij "Plannen".</p>
            : <p className="hint">Laat leeg voor een eenmalige taak.</p>}

          <div className="sec">Tijdsinschatting</div>
          <input className="din" type="number" min="0" placeholder="Minuten" value={estimate}
            onChange={(e) => setEstimate(e.target.value)}
            onBlur={() => {
              const n = parseInt(estimate, 10);
              const v = Number.isFinite(n) && n >= 0 ? n : null;
              if (v !== (task.estimate_minutes ?? null)) onPatch(task.id, { estimate_minutes: v });
            }} />
          {task.stage === "done" && (
            <>
              <div className="sec">Werkelijk besteed</div>
              <input className="din" type="number" min="0" placeholder="Minuten"
                defaultValue={task.spent_minutes ?? ""}
                onBlur={(e) => {
                  const n = parseInt(e.target.value, 10);
                  const v = Number.isFinite(n) && n >= 0 ? n : null;
                  onPatch(task.id, { spent_minutes: v, time_pending: v == null });
                }} />
            </>
          )}

          <div className="sec">Stappen</div>
          {task.checklist?.map((c) => (
            <div className="check" key={c.id}>
              <button className="checkbox" onClick={() => onToggleCheck(c.id, !c.done)} aria-label="Afvinken">
                {c.done ? <CheckCircle2 size={18} /> : <Circle size={18} color="#B9BBB2" />}
              </button>
              <input className="checkin" defaultValue={c.text} data-done={c.done ? 1 : 0}
                onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== c.text) onEditCheck(c.id, v); }} />
              <button className="checkdel" onClick={() => onRemoveCheck(c.id)} aria-label="Verwijderen"><X size={14} /></button>
            </div>
          ))}
          <div className="addrow">
            <input value={newItem} placeholder="Stap toevoegen…" onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addItem(); }} />
            <button onClick={addItem} aria-label="Toevoegen"><Plus size={15} /></button>
          </div>

          {task.sources?.length > 0 && (
            <>
              <div className="sec">Bron</div>
              <div className="info">
                {task.sources.map((s, i) => {
                  const M = SOURCE_META[s.type];
                  const isLink = s.ref?.startsWith("http");
                  return (
                    <div className="srcline" key={i}>
                      {M && <M.Icon size={15} />}
                      {isLink
                        ? <a href={s.ref} target="_blank" rel="noreferrer" className="srclink">Open origineel<ExternalLink size={12} /></a>
                        : <span style={{ color: "var(--ink)" }}>{s.ref}</span>}
                      <span style={{ marginLeft: "auto", fontSize: 11.5 }}>{M?.label}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {domain && (
            <>
              <div className="sec">Afgesproken standaard</div>
              <div className="reason" style={{ color: "var(--soft)" }}>{domain.standard}</div>
            </>
          )}

          <div className="sec">Beheer</div>
          <button className="btn danger full" onClick={() => onDelete(task.id)}><Trash2 size={14} />Taak verwijderen</button>
        </div>
      </aside>
    </>
  );
}
