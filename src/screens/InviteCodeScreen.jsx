import { useState } from "react";
import { C, font, fontDisplay } from "../constants/colors";
import { btnPrimary, labelStyle } from "../constants/styles";
import PageShell from "../components/PageShell";
import Card from "../components/Card";
import Logo from "../components/Logo";

export default function InviteCodeScreen({ household, onContinue }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(household.inviteCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <PageShell narrow>
      <div style={{ marginTop: 28 }}><Logo /></div>
      <h2 style={{ fontFamily: fontDisplay, fontSize: 28, fontWeight: 500, margin: "20px 0 8px" }}>
        {household.name} is ready
      </h2>
      <p style={{ color: C.steel, fontSize: 15, lineHeight: 1.55, marginBottom: 32 }}>
        Share this invite code with the people you live with so they can join.
      </p>
      <Card style={{ textAlign: "center" }}>
        <p style={{ ...labelStyle, marginBottom: 14 }}>Your invite code</p>
        <div onClick={copy} style={{
          fontSize: 38, fontWeight: 700, letterSpacing: "0.25em", fontFamily: font, color: C.dark,
          background: C.gradientSubtle, border: `1.5px solid ${C.borderLight}`, borderRadius: 14,
          padding: "22px 28px", cursor: "pointer", userSelect: "all", marginBottom: 10,
          transition: "all 0.2s", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)",
        }}>
          {household.inviteCode}
        </div>
        <p style={{ fontSize: 13, color: C.steel, marginBottom: 28 }}>
          {copied ? "Copied to clipboard" : "Tap to copy"}
        </p>
        <button onClick={onContinue} style={{ ...btnPrimary, width: "100%" }}>Set up my profile</button>
      </Card>
    </PageShell>
  );
}
