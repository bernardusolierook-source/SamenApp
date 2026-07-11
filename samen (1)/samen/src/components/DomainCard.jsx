import React from "react";
import { CalendarDays, ArchiveRestore, ArrowRight } from "lucide-react";
import { CAT_META, BOTH_COLOR } from "../lib/meta";
import OwnerPicker from "./OwnerPicker";

export default function DomainCard({ domain, people, openCount, onOpen, onReassign, onRestore, onFocus }) {
  const owner = people.find((p) => p.id === domain.owner_id);
  const cat = CAT_META[domain.category];
  const topColor = domain.shared ? BOTH_COLOR : (owner?.color || "#B9BBB2");

  if (!domain.active) {
    return (
      <div className="dom arch clickable" style={{ borderTopColor: "#B9BBB2" }} onClick={() => onOpen(domain.id)}>
        <div className="row">
          <span className="chip"><cat.Icon size={13} />{cat.label}</span>
          <span className="cad">gearchiveerd</span>
        </div>
        <h3>{domain.name}</h3>
        <p className="std">{domain.standard}</p>
        <div className="domact" onClick={(e) => e.stopPropagation()}>
          <button className="btn" onClick={() => onRestore(domain.id)}><ArchiveRestore size={14} />Terughalen</button>
        </div>
      </div>
    );
  }

  return (
    <div className="dom clickable" style={{ borderTopColor: topColor }} onClick={() => onOpen(domain.id)}>
      <div className="row">
        <span className="chip"><cat.Icon size={13} />{cat.label}</span>
        <span className="cad"><CalendarDays size={12} />{domain.cadence}</span>
      </div>
      <h3>{domain.name}</h3>
      <p className="std">{domain.standard}</p>
      <div className="row" onClick={(e) => e.stopPropagation()}>
        <span style={{ fontSize: 12, color: "var(--soft)" }}>Eigenaar</span>
        <OwnerPicker people={people} value={{ owner_id: domain.owner_id, shared: domain.shared }}
          onChange={(patch) => onReassign(domain.id, patch)} />
      </div>
      <div className="domact" onClick={(e) => e.stopPropagation()}>
        <button className="btn" onClick={() => onFocus(domain.id)}>{openCount} open taken<ArrowRight size={13} /></button>
      </div>
    </div>
  );
}
