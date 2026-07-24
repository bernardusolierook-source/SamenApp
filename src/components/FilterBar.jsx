import React from "react";
import { X, AlertTriangle } from "lucide-react";
import { BOTH_COLOR } from "../lib/meta";

// Toont actieve filters als chips + de verlopen-schakelaar.
export default function FilterBar({ people, ownerFilter, onClearOwner, overdueOnly, onToggleOverdue, overdueCount }) {
  const person = ownerFilter && ownerFilter !== "both" ? people.find((p) => p.id === ownerFilter) : null;
  const label = ownerFilter === "both" ? "Beide" : person?.name;
  const color = ownerFilter === "both" ? BOTH_COLOR : person?.color;

  return (
    <div className="filterbar">
      {ownerFilter && (
        <button className="fchip" style={{ background: color }} onClick={onClearOwner}>
          Alleen {label}<X size={13} />
        </button>
      )}
      <button className="ghost" data-on={overdueOnly ? 1 : 0} onClick={onToggleOverdue}>
        <AlertTriangle size={13} />
        {overdueOnly ? "Toon alles" : `Toon verlopen taken${overdueCount ? ` (${overdueCount})` : ""}`}
      </button>
    </div>
  );
}
