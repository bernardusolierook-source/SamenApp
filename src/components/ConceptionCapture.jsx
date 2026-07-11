import React, { useState } from "react";
import { Plus } from "lucide-react";
import { suggestDomain } from "../lib/meta";

export default function ConceptionCapture({ domains, people, onAdd }) {
  const [v, setV] = useState("");
  const [pending, setPending] = useState(null); // { title, domain }

  const submit = () => {
    const title = v.trim();
    if (!title) return;
    const domain = suggestDomain(title, domains);
    if (domain) {
      setPending({ title, domain });
    } else {
      onAdd(title, null);
    }
    setV("");
  };

  const accept = () => { onAdd(pending.title, pending.domain); setPending(null); };
  const reject = () => { onAdd(pending.title, null); setPending(null); };

  const suggestedOwner = pending && people.find((p) => p.id === pending.domain.owner_id);

  return (
    <div>
      <div className="quick">
        <input
          value={v} placeholder="Iets nieuws bedenken…"
          onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
        />
        <button onClick={submit} aria-label="Toevoegen"><Plus size={16} /></button>
      </div>
      {pending && (
        <div className="suggest">
          Lijkt op <b>{pending.domain.name}</b>{suggestedOwner ? <> → <b>{suggestedOwner.name}</b></> : null}.
          <span className="yes" onClick={accept}>Koppelen</span>
          <span className="no" onClick={reject}>Los laten</span>
        </div>
      )}
    </div>
  );
}
