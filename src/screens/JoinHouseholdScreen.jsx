import { useState } from "react";
import { C, fontDisplay } from "../constants/colors";
import { btnPrimary, btnGhost, inputStyle, labelStyle } from "../constants/styles";
import PageShell from "../components/PageShell";
import Card from "../components/Card";
import Logo from "../components/Logo";

export default function JoinHouseholdScreen({ onJoined, onBack, appData }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const handleJoin = () => {
    const c = code.trim().toUpperCase();
    if (!c) return;
    if (appData.household && appData.household.inviteCode === c) {
      onJoined(appData.household);
    } else {
      setError("No household found with that code. Double-check and try again.");
    }
  };
  return (
    <PageShell narrow>
      <button onClick={onBack} style={btnGhost}>&larr; Back</button>
      <div style={{ marginTop: 28 }}><Logo /></div>
      <h2 style={{ fontFamily: fontDisplay, fontSize: 28, fontWeight: 500, margin: "20px 0 8px" }}>
        Join a household
      </h2>
      <p style={{ color: C.steel, fontSize: 15, lineHeight: 1.55, marginBottom: 32 }}>
        Ask whoever created the household for the invite code, then enter it below.
      </p>
      <Card>
        <label style={labelStyle}>Invite code</label>
        <input style={{
          ...inputStyle, textTransform: "uppercase", letterSpacing: "0.2em",
          fontSize: 22, textAlign: "center", fontWeight: 600,
        }} placeholder="ABC123" maxLength={6} value={code}
          onChange={(e) => { setCode(e.target.value); setError(""); }}
          onKeyDown={(e) => e.key === "Enter" && handleJoin()} autoFocus />
        {error && <p style={{ color: C.danger, fontSize: 14, marginTop: 12 }}>{error}</p>}
        <button onClick={handleJoin} disabled={!code.trim()}
          style={{ ...btnPrimary, width: "100%", marginTop: 22, opacity: code.trim() ? 1 : 0.45 }}>
          Join
        </button>
      </Card>
    </PageShell>
  );
}
