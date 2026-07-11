import React, { useState } from "react";
import { Pencil } from "lucide-react";
import { BOTH_COLOR, pct } from "../lib/meta";

function PersonName({ person, align, onRename }) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(person.name);
  if (!onRename) return <span className="nm">{person.name}</span>;
  if (editing)
    return (
      <input className="nameinp" autoFocus value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => { onRename(v.trim() || person.name); setEditing(false); }}
        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }} />
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

// counts = { both, [memberId]: n }, total = som
export default function BalanceBar({ label, people, counts, total, onRename }) {
  if (people.length < 2)
    return (
      <div className="balance">
        <div className="bhead"><span className="lab disp">{label}</span></div>
        <p style={{ color: "var(--soft)", fontSize: 13, margin: 0 }}>
          Nog niemand om mee te verdelen — nodig je partner uit met de code rechtsboven.
        </p>
      </div>
    );
  const [a, b] = people;
  const ca = counts[a.id] || 0, cb = counts[b.id] || 0, cboth = counts.both || 0;
  const t = total || 0;
  const pa = pct(ca, t), pb = pct(cb, t), pboth = pct(cboth, t);
  const showBoth = cboth > 0;

  const note = t === 0
    ? "nog niets verdeeld"
    : `${a.name} ${pa}%${showBoth ? ` · Beide ${pboth}%` : ""} · ${b.name} ${pb}%`;

  return (
    <div className="balance">
      <div className="bhead">
        <span className="lab disp">{label}</span>
        <span className="note">{note}</span>
      </div>
      <div className="bar">
        <div className="seg2 l" style={{ flexBasis: `${t ? (ca / t) * 100 : 50}%`, background: a.color }}>
          <b>{pa}%</b><PersonName person={a} align="l" onRename={onRename ? (n) => onRename(a.id, n) : null} />
        </div>
        {showBoth && (
          <div className="seg2 m" style={{ flexBasis: `${(cboth / t) * 100}%`, background: BOTH_COLOR }}>
            <b>{pboth}%</b><span className="nm">Beide</span>
          </div>
        )}
        <div className="seg2 r" style={{ flexBasis: `${t ? (cb / t) * 100 : 50}%`, background: b.color }}>
          <PersonName person={b} align="r" onRename={onRename ? (n) => onRename(b.id, n) : null} /><b>{pb}%</b>
        </div>
        {!showBoth && <div className="fulcrum" />}
      </div>
    </div>
  );
}
