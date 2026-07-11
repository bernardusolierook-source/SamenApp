import React, { useState } from "react";
import { Pencil } from "lucide-react";

function PersonName({ person, align, onRename }) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(person.name);
  if (editing)
    return (
      <input
        className="nameinp" autoFocus value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => { onRename(v.trim() || person.name); setEditing(false); }}
        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
      />
    );
  return (
    <span className="nm" style={{ display: "inline-flex", alignItems: "center", gap: 4, flexDirection: align === "r" ? "row-reverse" : "row" }}>
      {person.name}
      <button className="pen" title="Naam wijzigen" onClick={(e) => { e.stopPropagation(); setEditing(true); }}>
        <Pencil size={11} />
      </button>
    </span>
  );
}

export default function BalanceBar({ people, counts, total, onRename }) {
  if (people.length < 2)
    return (
      <div className="balance">
        <div className="bhead"><span className="lab disp">Verdeling van eigenaarschap</span></div>
        <p style={{ color: "var(--soft)", fontSize: 13, margin: 0 }}>
          Nog niemand om mee te verdelen — nodig je partner uit met de code rechtsboven.
        </p>
      </div>
    );
  const [a, b] = people;
  const ca = counts[a.id] || 0, cb = counts[b.id] || 0;
  const tot = total || ca + cb || 1;
  const pa = Math.round((ca / tot) * 100);
  const diff = Math.abs(ca - cb);
  const note = diff <= 1 ? "redelijk in balans" : `${(ca > cb ? a : b).name} draagt ${diff} meer`;
  return (
    <div className="balance">
      <div className="bhead">
        <span className="lab disp">Verdeling van eigenaarschap</span>
        <span className="note">{ca} · {cb} kaarten — {note}</span>
      </div>
      <div className="bar">
        <div className="seg2 l" style={{ flexBasis: `${pa}%`, background: a.color }}>
          <b>{ca}</b><PersonName person={a} align="l" onRename={(n) => onRename(a.id, n)} />
        </div>
        <div className="seg2 r" style={{ flexBasis: `${100 - pa}%`, background: b.color }}>
          <PersonName person={b} align="r" onRename={(n) => onRename(b.id, n)} /><b>{cb}</b>
        </div>
        <div className="fulcrum" />
      </div>
    </div>
  );
}
