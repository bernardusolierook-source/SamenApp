import React from "react";
import { Plus, Check, CalendarDays, Archive, ArchiveRestore } from "lucide-react";
import { CAT_META } from "../lib/meta";

export default function DomainCard({ domain, people, openCount, onReassign, onConceive, onArchive, onRestore }) {
  const owner = people.find((p) => p.id === domain.owner_id);
  const cat = CAT_META[domain.category];

  // Gearchiveerd: gedimd, alleen terughalen
  if (!domain.active) {
    return (
      <div className="dom arch" style={{ borderTopColor: "#B9BBB2" }}>
        <div className="row">
          <span className="chip"><cat.Icon size={13} />{cat.label}</span>
          <span className="cad">gearchiveerd</span>
        </div>
        <h3>{domain.name}</h3>
        <p className="std">{domain.standard}</p>
        <div className="domact">
          <button className="btn" onClick={() => onRestore(domain.id)}><ArchiveRestore size={14} />Terughalen</button>
        </div>
      </div>
    );
  }

  return (
    <div className="dom" style={{ borderTopColor: owner?.color || "#B9BBB2" }}>
      <div className="row">
        <span className="chip"><cat.Icon size={13} />{cat.label}</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span className="cad"><CalendarDays size={12} />{domain.cadence}</span>
          <button className="archbtn" title="Archiveren" onClick={() => onArchive(domain.id)}><Archive size={14} /></button>
        </span>
      </div>
      <h3>{domain.name}</h3>
      <p className="std">{domain.standard}</p>
      <div className="row">
        <span style={{ fontSize: 12, color: "var(--soft)" }}>Eigenaar</span>
        <span className="pick">
          {people.map((p) => (
            <button key={p.id} data-on={p.id === domain.owner_id ? 1 : 0}
              style={p.id === domain.owner_id ? { background: p.color } : {}}
              onClick={() => onReassign(domain.id, p.id)}>
              {p.id === domain.owner_id && <Check size={11} />}{p.name}
            </button>
          ))}
        </span>
      </div>
      <div className="domact">
        <button className="btn dark" onClick={() => onConceive(domain)}><Plus size={14} />Taak bedenken</button>
        <span className="btn" style={{ cursor: "default", color: "var(--soft)" }}>{openCount} open</span>
      </div>
    </div>
  );
}
