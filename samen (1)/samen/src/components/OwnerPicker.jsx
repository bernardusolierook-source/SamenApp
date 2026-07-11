import React from "react";
import { Check } from "lucide-react";
import { BOTH_COLOR } from "../lib/meta";

// value = { owner_id, shared }; onChange geeft een patch terug
export default function OwnerPicker({ people, value, onChange }) {
  const both = !!value.shared;
  return (
    <span className="pick">
      {people.map((p) => {
        const on = !both && value.owner_id === p.id;
        return (
          <button key={p.id} data-on={on ? 1 : 0} style={on ? { background: p.color } : {}}
            onClick={(e) => { e.stopPropagation(); onChange({ owner_id: p.id, shared: false }); }}>
            {on && <Check size={11} />}{p.name}
          </button>
        );
      })}
      <button data-on={both ? 1 : 0} style={both ? { background: BOTH_COLOR } : {}}
        onClick={(e) => { e.stopPropagation(); onChange({ owner_id: null, shared: true }); }}>
        {both && <Check size={11} />}Beide
      </button>
    </span>
  );
}
