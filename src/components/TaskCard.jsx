import React from "react";
import { ChevronRight, CalendarDays, CheckCircle2, ArrowRightLeft, Repeat, AlertTriangle, Timer, Clock } from "lucide-react";
import { CAT_META, SOURCE_META, BOTH_COLOR, fmtDate, isOverdue, fmtMinutes } from "../lib/meta";

export default function TaskCard({ task, domain, owner, onOpen, onAdvance }) {
  const cat = domain ? CAT_META[domain.category] : null;
  const done = task.checklist?.filter((c) => c.done).length || 0;
  const tot = task.checklist?.length || 0;
  const date = fmtDate(task.due_at || task.scheduled_at);
  const shared = task.shared;
  const color = shared ? BOTH_COLOR : (owner?.color || "#B9BBB2");
  const over = isOverdue(task);
  const recurring = !!task.recur_interval;

  return (
    <button className="card" data-overdue={over ? 1 : 0} style={{ borderLeftColor: color }} onClick={() => onOpen(task.id)}>
      <div className="eyebrow">
        {cat ? <span className="cat"><cat.Icon size={12} />{cat.label}</span> : <span className="cat">los · geen kaart</span>}
        {domain && <span>· {domain.name}</span>}
        {recurring && <Repeat size={12} title="Terugkerende taak" />}
      </div>
      <div className="title">{task.title}</div>
      <div className="cmeta">
        {shared
          ? <span className="owner" style={{ background: BOTH_COLOR }}><span className="dot" />Beide</span>
          : owner && <span className="owner" style={{ background: owner.color }}><span className="dot" />{owner.name}</span>}
        {date && (
          over
            ? <span className="overdue"><AlertTriangle size={12} />{date}</span>
            : <span className="chip"><CalendarDays size={12} />{date}</span>
        )}
        {task.estimate_minutes != null && task.stage !== "done" && (
          <span className="chip"><Timer size={12} />{fmtMinutes(task.estimate_minutes)}</span>
        )}
        {task.stage === "done" && task.spent_minutes != null && (
          <span className="chip"><Clock size={12} />{fmtMinutes(task.spent_minutes)}</span>
        )}
        {task.time_pending && <span className="hand"><Clock size={11} />tijd invullen</span>}
        {tot > 0 && <span className="chip"><CheckCircle2 size={12} />{done}/{tot}</span>}
        {task.handoff_to && <span className="hand"><ArrowRightLeft size={11} />tijdelijk</span>}
        {task.sources?.length > 0 && (
          <span className="srcs">{task.sources.map((s, i) => { const M = SOURCE_META[s.type]; return M ? <M.Icon key={i} size={13} /> : null; })}</span>
        )}
      </div>
      {task.stage !== "done" && (
        <span className="adv" title="Volgende fase" onClick={(e) => { e.stopPropagation(); onAdvance(task); }}>
          <ChevronRight size={15} />
        </span>
      )}
    </button>
  );
}
