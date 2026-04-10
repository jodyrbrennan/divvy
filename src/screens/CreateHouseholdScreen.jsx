import { useState } from "react";
import { C, fontDisplay } from "../constants/colors";
import { btnPrimary, btnGhost, inputStyle, labelStyle } from "../constants/styles";
import { uid, makeInviteCode } from "../utils/storage";
import PageShell from "../components/PageShell";
import Card from "../components/Card";
import Logo from "../components/Logo";

export default function CreateHouseholdScreen({ onCreated, onBack }) {
  const [name, setName] = useState("");
  const handleCreate = () => {
    if (!name.trim()) return;
    onCreated({ id: uid(), name: name.trim(), inviteCode: makeInviteCode(), createdAt: new Date().toISOString() });
  };
  return (
    <PageShell narrow>
      <button onClick={onBack} style={btnGhost}>&larr; Back</button>
      <div style={{ marginTop: 28 }}><Logo /></div>
      <h2 style={{ fontFamily: fontDisplay, fontSize: 28, fontWeight: 500, margin: "20px 0 8px" }}>
        Name your household
      </h2>
      <p style={{ color: C.steel, fontSize: 15, lineHeight: 1.55, marginBottom: 32 }}>
        This is how your household will appear to everyone who joins. You can change it later.
      </p>
      <Card>
        <label style={labelStyle}>Household name</label>
        <input style={inputStyle} placeholder="e.g. The Garcias, Apartment 4B" value={name}
          onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCreate()} autoFocus />
        <button onClick={handleCreate} disabled={!name.trim()}
          style={{ ...btnPrimary, width: "100%", marginTop: 22, opacity: name.trim() ? 1 : 0.45 }}>
          Create household
        </button>
      </Card>
    </PageShell>
  );
}
