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
        onClick={(e) => e.stopPropagation()}
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

// counts = { both, [memberId]: n }. onPick(key) maakt de segmenten klikbaar als filter.
export default function BalanceBar({ label, people, counts, total, onRename, onPick, active }) {
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
  const clickable = !!onPick;

  const note = t === 0
    ? "nog niets verdeeld"
    : `${a.name} ${pa}%${showBoth ? ` · Beide ${pboth}%` : ""} · ${b.name} ${pb}%`;

  const seg = (key, cls, basis, color, children) => (
    <div className={`seg2 ${cls}`} style={{ flexBasis: `${basis}%`, background: color, cursor: clickable ? "pointer" : "default" }}
      data-active={active === key ? 1 : 0}
      onClick={clickable ? () => onPick(active === key ? null : key) : undefined}
      title={clickable ? "Klik om het bord hierop te filteren" : undefined}>
      {children}
    </div>
  );

  return (
    <div className="balance">
      <div className="bhead">
        <span className="lab disp">{label}</span>
        <span className="note">{note}</span>
      </div>
      <div className="bar">
        {seg(a.id, "l", t ? (ca / t) * 100 : 50, a.color,
          <><b>{pa}%</b><PersonName person={a} align="l" onRename={onRename ? (n) => onRename(a.id, n) : null} /></>)}
        {showBoth && seg("both", "m", (cboth / t) * 100, BOTH_COLOR, <><b>{pboth}%</b><span className="nm">Beide</span></>)}
        {seg(b.id, "r", t ? (cb / t) * 100 : 50, b.color,
          <><PersonName person={b} align="r" onRename={onRename ? (n) => onRename(b.id, n) : null} /><b>{pb}%</b></>)}
        {!showBoth && <div className="fulcrum" />}
      </div>
      {clickable && <p className="barhint">Klik op een deel van de balk om het bord daarop te filteren.</p>}
    </div>
  );
}
