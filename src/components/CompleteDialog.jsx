import React, { useState } from "react";
import { X, Check } from "lucide-react";
import { fmtMinutes } from "../lib/meta";

const PRESETS = [5, 15, 30, 60, 120];

// Verplichte stap: hoeveel tijd kostte het? Zonder invullen gaat de taak niet naar 'klaar'.
export default function CompleteDialog({ task, onCancel, onConfirm }) {
  const [minutes, setMinutes] = useState(task.estimate_minutes ?? "");
  const val = parseInt(minutes, 10);
  const ok = Number.isFinite(val) && val >= 0;

  return (
    <>
      <div className="scrim" onClick={onCancel} />
      <div className="modal">
        <div className="mhead">
          <div className="disp" style={{ fontWeight: 700, fontSize: 17 }}>Hoeveel tijd kostte dit?</div>
          <button className="x" onClick={onCancel} aria-label="Annuleren"><X size={16} /></button>
        </div>
        <p className="msub">{task.title}</p>
        {task.estimate_minutes != null && (
          <p className="msub">Ingeschat: {fmtMinutes(task.estimate_minutes)}</p>
        )}
        <div className="presets">
          {PRESETS.map((m) => (
            <button key={m} className="btn" data-on={val === m ? 1 : 0} onClick={() => setMinutes(String(m))}>
              {fmtMinutes(m)}
            </button>
          ))}
        </div>
        <label className="mlab">Minuten</label>
        <input className="din" type="number" min="0" autoFocus value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && ok) onConfirm(val); }} />
        <div className="navrow">
          <button className="btn" onClick={onCancel}>Annuleren</button>
          <button className="btn dark" disabled={!ok} onClick={() => onConfirm(val)}>
            <Check size={14} />Markeer klaar
          </button>
        </div>
      </div>
    </>
  );
}
