import React from "react";
import { X, ChevronLeft, ChevronRight, Check, ArrowRightLeft, Circle, CheckCircle2 } from "lucide-react";
import { STAGES, STAGE_META, CAT_META, SOURCE_META, fmtDate } from "../lib/meta";

export default function Drawer({ task, domain, people, onClose, onStage, onOwner, onHandoff, onToggleCheck }) {
  const owner = people.find((p) => p.id === task.owner_id);
  const stageIdx = STAGES.indexOf(task.stage);
  const date = task.scheduled_at || task.due_at;
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="draw">
        <div className="dh">
          <div>
            <div className="eyebrow" style={{ marginBottom: 6 }}>
              {domain ? <>{CAT_META[domain.category].label} · {domain.name}</> : "los · geen kaart"}
            </div>
            <div className="disp" style={{ fontWeight: 700, fontSize: 19, lineHeight: 1.2 }}>{task.title}</div>
          </div>
          <button className="x" onClick={onClose} aria-label="Sluiten"><X size={16} /></button>
        </div>

        <div className="db">
          <div className="sec" style={{ marginTop: 4 }}>Fase</div>
          <div className="stages">
            {STAGES.map((s) => <div className="st" key={s} data-on={s === task.stage ? 1 : 0}>{STAGE_META[s].label}</div>)}
          </div>
          <div className="navrow">
            <button className="btn" disabled={stageIdx === 0} onClick={() => onStage(task.id, STAGES[stageIdx - 1])}>
              <ChevronLeft size={14} />Vorige
            </button>
            <button className="btn dark" disabled={task.stage === "done"} onClick={() => onStage(task.id, STAGES[stageIdx + 1])}>
              {task.stage === "execution" ? "Markeer klaar" : "Volgende"}<ChevronRight size={14} />
            </button>
          </div>

          <div className="sec">Waarom dit nu</div>
          <div className="reason">{task.reason || "—"}</div>

          <div className="sec">Eigenaar</div>
          <span className="pick">
            {people.map((p) => (
              <button key={p.id} data-on={p.id === task.owner_id ? 1 : 0}
                style={p.id === task.owner_id ? { background: p.color } : {}}
                onClick={() => onOwner(task.id, p.id)}>
                {p.id === task.owner_id && <Check size={11} />}{p.name}
              </button>
            ))}
          </span>
          {people.length > 1 && (
            <div style={{ marginTop: 10 }}>
              <button className="btn" onClick={() => onHandoff(task)}>
                <ArrowRightLeft size={14} />
                {task.handoff_to
                  ? `Tijdelijk bij ${people.find((p) => p.id === task.handoff_to)?.name} — terugnemen`
                  : "Tijdelijk overdragen"}
              </button>
            </div>
          )}

          {task.checklist?.length > 0 && (
            <>
              <div className="sec">Stappen</div>
              <div>
                {task.checklist.map((c) => (
                  <div className="check" key={c.id} data-done={c.done ? 1 : 0} onClick={() => onToggleCheck(c.id, !c.done)}>
                    {c.done ? <CheckCircle2 size={17} /> : <Circle size={17} color="#B9BBB2" />}{c.text}
                  </div>
                ))}
              </div>
            </>
          )}

          {date && (
            <>
              <div className="sec">Wanneer</div>
              <div className="info">
                <span className="lab">{task.scheduled_at ? "Gepland" : "Deadline"}</span>
                <div style={{ fontWeight: 600, fontSize: 15, marginTop: 2 }}>{fmtDate(date)}</div>
              </div>
            </>
          )}

          {task.sources?.length > 0 && (
            <>
              <div className="sec">Bron</div>
              <div className="info">
                {task.sources.map((s, i) => {
                  const M = SOURCE_META[s.type];
                  return (
                    <div className="srcline" key={i}>
                      {M && <M.Icon size={15} />}<span style={{ color: "var(--ink)" }}>{s.ref}</span>
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
        </div>
      </aside>
    </>
  );
}
