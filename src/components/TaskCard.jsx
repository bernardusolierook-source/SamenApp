import React from "react";
import { ChevronRight, CalendarDays, CheckCircle2, ArrowRightLeft } from "lucide-react";
import { CAT_META, SOURCE_META, fmtDate } from "../lib/meta";

export default function TaskCard({ task, domain, owner, onOpen, onAdvance }) {
  const cat = domain ? CAT_META[domain.category] : null;
  const done = task.checklist?.filter((c) => c.done).length || 0;
  const tot = task.checklist?.length || 0;
  const date = fmtDate(task.scheduled_at || task.due_at);
  const color = owner?.color || "#B9BBB2";
  return (
    <button className="card" style={{ borderLeftColor: color }} onClick={() => onOpen(task.id)}>
      <div className="eyebrow">
        {cat ? <span className="cat"><cat.Icon size={12} />{cat.label}</span> : <span className="cat">los · geen kaart</span>}
        {domain && <span>· {domain.name}</span>}
      </div>
      <div className="title">{task.title}</div>
      <div className="cmeta">
        {owner && <span className="owner" style={{ background: owner.color }}><span className="dot" />{owner.name}</span>}
        {date && <span className="chip"><CalendarDays size={12} />{date}</span>}
        {tot > 0 && <span className="chip"><CheckCircle2 size={12} />{done}/{tot}</span>}
        {task.handoff_to && <span className="hand"><ArrowRightLeft size={11} />tijdelijk</span>}
        {task.sources?.length > 0 && (
          <span className="srcs">
            {task.sources.map((s, i) => { const M = SOURCE_META[s.type]; return M ? <M.Icon key={i} size={13} /> : null; })}
          </span>
        )}
      </div>
      {task.stage !== "done" && (
        <span className="adv" title="Volgende fase" onClick={(e) => { e.stopPropagation(); onAdvance(task.id, 1); }}>
          <ChevronRight size={15} />
        </span>
      )}
    </button>
  );
}
