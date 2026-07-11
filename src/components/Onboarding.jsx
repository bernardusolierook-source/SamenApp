import React, { useState } from "react";
import { signInWithGoogle, createHousehold, joinHousehold } from "../lib/data";
import { PALETTE } from "../lib/meta";

export function SignIn() {
  return (
    <div className="gate">
      <div className="panel">
        <h1>Samen</h1>
        <p>Eén plek voor alles wat thuis geregeld moet worden — van bedenken tot klaar, eerlijk verdeeld tussen jullie twee.</p>
        <button className="bigbtn google" onClick={signInWithGoogle}>Inloggen met Google</button>
      </div>
    </div>
  );
}

export function Onboarding({ onDone }) {
  const [mode, setMode] = useState("create"); // create | join
  const [name, setName] = useState("");
  const [hhName, setHhName] = useState("Ons huishouden");
  const [code, setCode] = useState("");
  const [color, setColor] = useState(PALETTE[0]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const go = async () => {
    setErr(""); setBusy(true);
    try {
      if (!name.trim()) throw new Error("Vul je naam in.");
      if (mode === "create") await createHousehold(hhName.trim() || "Ons huishouden", name.trim(), color);
      else await joinHousehold(code.trim(), name.trim(), color);
      onDone();
    } catch (e) {
      setErr(e.message || "Er ging iets mis.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="gate">
      <div className="panel">
        <h1>Welkom</h1>
        <p>Maak een huishouden aan, of sluit aan bij dat van je partner met de code die zij/hij je geeft.</p>

        <div className="seg" style={{ width: "100%" }}>
          <button data-on={mode === "create" ? 1 : 0} style={{ flex: 1 }} onClick={() => setMode("create")}>Nieuw aanmaken</button>
          <button data-on={mode === "join" ? 1 : 0} style={{ flex: 1 }} onClick={() => setMode("join")}>Aansluiten met code</button>
        </div>

        <label>Jouw naam</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Bijv. Ben" />

        <label>Jouw kleur</label>
        <div className="swatches">
          {PALETTE.map((c) => (
            <div key={c} className="swatch" data-on={c === color ? 1 : 0} style={{ background: c }} onClick={() => setColor(c)} />
          ))}
        </div>

        {mode === "create" ? (
          <>
            <label>Naam van het huishouden</label>
            <input type="text" value={hhName} onChange={(e) => setHhName(e.target.value)} />
          </>
        ) : (
          <>
            <label>Uitnodigingscode</label>
            <input type="text" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ABC123" />
          </>
        )}

        {err && <div className="err">{err}</div>}
        <button className="bigbtn" onClick={go} disabled={busy}>
          {busy ? "Bezig…" : mode === "create" ? "Huishouden aanmaken" : "Aansluiten"}
        </button>
      </div>
    </div>
  );
}
