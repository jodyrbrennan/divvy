/**
 * ForgotPasswordScreen.jsx — Where users request a password reset email.
 *
 * FLOW:
 * 1. User taps "Forgot password?" on the sign-in screen
 * 2. They enter their email address here
 * 3. We call sendPasswordReset() which tells Supabase to email them a link
 * 4. We show a "check your email" confirmation message
 * 5. User opens email → clicks link → redirected back to app
 * 6. App.jsx detects the PASSWORD_RECOVERY event → shows ResetPasswordScreen
 */

import { useState } from "react";
import { C, fontDisplay } from "../constants/colors";
import { btnPrimary, btnGhost, inputStyle, labelStyle } from "../constants/styles";
import { sendPasswordReset } from "../utils/auth";
import PageShell from "../components/PageShell";
import Card from "../components/Card";
import Logo from "../components/Logo";

export default function ForgotPasswordScreen({ onBack }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async () => {
    setError("");

    if (!isEmailValid) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      const { error: resetError } = await sendPasswordReset(email.trim());

      if (resetError) {
        setError(resetError.message);
        setLoading(false);
        return;
      }

      // Success — show the "check your email" state
      setSent(true);
      setLoading(false);
    } catch (e) {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  // ─── "Check your email" state ──────────────────────────────────
  if (sent) {
    return (
      <PageShell narrow>
        <div style={{ textAlign: "center", marginTop: 80 }}>
          <div style={{ animation: "fadeUp 0.6s ease both", marginBottom: 24 }}>
            <Logo size={44} />
          </div>

          <Card style={{ textAlign: "center" }}>
            {/* Email icon */}
            <div style={{
              width: 72, height: 72, borderRadius: "50%",
              background: C.ice, margin: "0 auto 20px",
              display: "flex", alignItems: "center", justifyContent: "center",
              animation: "fadeUp 0.5s ease 0.1s both",
            }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none"
                stroke={C.navy} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="3" />
                <path d="M22 7l-10 6L2 7" />
              </svg>
            </div>

            <h2 style={{
              fontFamily: fontDisplay, fontSize: 26, fontWeight: 500,
              marginBottom: 12, animation: "fadeUp 0.5s ease 0.2s both",
            }}>
              Check your email
            </h2>

            <p style={{
              color: C.steel, fontSize: 15, lineHeight: 1.65, marginBottom: 8,
              animation: "fadeUp 0.5s ease 0.3s both",
            }}>
              We sent a password reset link to:
            </p>

            <p style={{
              fontWeight: 700, fontSize: 16, color: C.dark, marginBottom: 20,
              animation: "fadeUp 0.5s ease 0.35s both",
            }}>
              {email}
            </p>

            <p style={{
              color: C.steel, fontSize: 14, lineHeight: 1.65, marginBottom: 28,
              animation: "fadeUp 0.5s ease 0.4s both",
            }}>
              Open the email and click the link to choose a new password.
              The link will expire in 1 hour.
            </p>

            <div style={{
              padding: "14px 20px", borderRadius: 12, background: "rgba(170,199,216,0.12)",
              border: `1px solid ${C.sky}`, marginBottom: 24,
              animation: "fadeUp 0.5s ease 0.45s both",
            }}>
              <p style={{ fontSize: 13, color: C.navy, lineHeight: 1.5 }}>
                Didn't get the email? Check your spam folder. If you still
                don't see it, make sure you entered the email you signed up with.
              </p>
            </div>

            <button onClick={onBack} style={{ ...btnGhost, width: "100%" }}>
              &larr; Back to sign in
            </button>
          </Card>
        </div>
      </PageShell>
    );
  }

  // ─── Email entry form ──────────────────────────────────────────
  return (
    <PageShell narrow>
      <button onClick={onBack} style={btnGhost}>&larr; Back</button>
      <div style={{ marginTop: 28 }}><Logo /></div>
      <h2 style={{
        fontFamily: fontDisplay, fontSize: 28, fontWeight: 500, margin: "20px 0 8px",
      }}>
        Reset your password
      </h2>
      <p style={{ color: C.steel, fontSize: 15, lineHeight: 1.55, marginBottom: 32 }}>
        Enter the email address you used to create your account. We'll send you
        a link to choose a new password.
      </p>

      <Card>
        <label style={labelStyle}>Email address</label>
        <input
          type="email"
          style={inputStyle}
          placeholder="you@example.com"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(""); }}
          onKeyDown={(e) => e.key === "Enter" && isEmailValid && !loading && handleSubmit()}
          autoFocus
          autoComplete="email"
        />

        {error && (
          <p style={{ color: C.danger, fontSize: 14, marginTop: 12 }}>{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={!isEmailValid || loading}
          style={{
            ...btnPrimary, width: "100%", marginTop: 22,
            opacity: isEmailValid && !loading ? 1 : 0.45,
          }}
        >
          {loading ? "Sending…" : "Send reset link"}
        </button>
      </Card>
    </PageShell>
  );
}
