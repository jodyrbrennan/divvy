import { useState } from "react";
import { C, fontDisplay } from "../constants/colors";
import { btnPrimary, btnGhost, inputStyle, labelStyle } from "../constants/styles";
import PageShell from "../components/PageShell";
import Card from "../components/Card";
import Logo from "../components/Logo";

// Phase 7.1: Use context instead of props for app data
import { useAppData } from "../contexts/AppDataContext";

export default function JoinHouseholdScreen({ onJoined, onBack }) {
  // Phase 7.1: Pull data from context instead of receiving appData as a prop
  const { appData } = useAppData();

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const handleJoin = () => {
    const c = code.trim().toUpperCase();
    if (!c) return;

    // Check if code matches the household invite code
    if (appData.household && appData.household.inviteCode === c) {
      onJoined({ household: appData.household, pendingUser: null });
      return;
    }

    // Check if code matches a pending member's invite code
    const pendingUser = appData.users.find(
      (u) => u.status === "pending" && u.inviteCode && u.inviteCode === c
    );
    if (pendingUser && appData.household) {
      onJoined({ household: appData.household, pendingUser });
      return;
    }

    setError("No household found with that code. Double-check and try again.");
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
