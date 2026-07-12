import React, { useEffect, useState } from "react";
import { X, ArrowRight, Plus, Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { CAT_META, CAT_ORDER } from "../lib/meta";
import OwnerPicker from "./OwnerPicker";

const EMPTY = { name: "", category: "home", cadence: "doorlopend", standard: "", owner_id: null, shared: false };

export default function DomainDrawer({ mode, domain, people, blockingCount, onClose, onCreate, onPatch, onArchive, onRestore, onDelete, onFocus, onConceive }) {
  const [f, setF] = useState(EMPTY);
  useEffect(() => {
    if (mode === "edit" && domain)
      setF({ name: domain.name, category: domain.category, cadence: domain.cadence || "", standard: domain.standard || "", owner_id: domain.owner_id, shared: !!domain.shared });
    else setF({ ...EMPTY, owner_id: people[0]?.id || null });
  }, [mode, domain?.id]);

  const commit = (patch) => { if (mode === "edit" && domain) onPatch(domain.id, patch); };
  const setLocal = (patch) => setF((p) => ({ ...p, ...patch }));
  const canDelete = mode === "edit" && (blockingCount || 0) === 0;

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="draw">
        <div className="dh">
          <div className="disp" style={{ fontWeight: 700, fontSize: 18 }}>
            {mode === "create" ? "Nieuwe kaart" : "Kaart bewerken"}
          </div>
          <button className="x" onClick={onClose} aria-label="Sluiten"><X size={16} /></button>
        </div>

        <div className="db">
          <div className="sec" style={{ marginTop: 4 }}>Naam</div>
          <input className="din" value={f.name} placeholder="Bijv. Tandarts kinderen"
            onChange={(e) => setLocal({ name: e.target.value })} onBlur={() => commit({ name: f.name })} />

          <div className="sec">Categorie</div>
          <div className="pick wrap">
            {CAT_ORDER.map((c) => {
              const M = CAT_META[c];
              return (
                <button key={c} data-on={f.category === c ? 1 : 0}
                  style={f.category === c ? { background: "var(--ink)", color: "#fff" } : {}}
                  onClick={() => { setLocal({ category: c }); commit({ category: c }); }}>
                  <M.Icon size={12} />{M.label}
                </button>
              );
            })}
          </div>

          <div className="sec">Eigenaar</div>
          <OwnerPicker people={people} value={{ owner_id: f.owner_id, shared: f.shared }}
            onChange={(patch) => { setLocal(patch); commit(patch); }} />

          <div className="sec">Cadans</div>
          <input className="din" value={f.cadence} placeholder="Bijv. wekelijks, elke 6 mnd"
            onChange={(e) => setLocal({ cadence: e.target.value })} onBlur={() => commit({ cadence: f.cadence })} />

          <div className="sec">Afgesproken standaard</div>
          <textarea className="din dtext" value={f.standard} placeholder="Wat is 'goed genoeg'? Samen afspreken."
            onChange={(e) => setLocal({ standard: e.target.value })} onBlur={() => commit({ standard: f.standard })} />

          {mode === "create" ? (
            <button className="btn dark full" style={{ marginTop: 18 }}
              disabled={!f.name.trim()} onClick={() => onCreate(f)}>
              <Plus size={15} />Kaart aanmaken
            </button>
          ) : (
            <>
              <div className="sec">Taken</div>
              <div className="navrow">
                <button className="btn" onClick={() => onFocus(domain.id)}>Open bord van deze kaart<ArrowRight size={13} /></button>
              </div>
              <div className="navrow" style={{ marginTop: 8 }}>
                <button className="btn dark" onClick={() => onConceive(domain)}><Plus size={14} />Taak bedenken</button>
              </div>

              <div className="sec">Beheer</div>
              <div className="navrow">
                {domain.active
                  ? <button className="btn" onClick={() => onArchive(domain.id)}><Archive size={14} />Archiveren</button>
                  : <button className="btn" onClick={() => onRestore(domain.id)}><ArchiveRestore size={14} />Terughalen</button>}
                <button className="btn danger" disabled={!canDelete} title={canDelete ? "" : "Kan niet: er hangen nog actieve taken onder deze kaart."}
                  onClick={() => onDelete(domain.id)}><Trash2 size={14} />Verwijderen</button>
              </div>
              {!canDelete && (
                <p style={{ fontSize: 12, color: "var(--soft)", marginTop: 8 }}>
                  Verwijderen kan pas als er geen actieve taken meer onder de kaart hangen (afgeronde taken tellen niet mee).
                </p>
              )}
            </>
          )}
        </div>
      </aside>
    </>
  );
}
