/**
 * SignUpScreen.jsx — Where new users create their account.
 *
 * When EMAIL_AUTH_ENABLED is false:
 *   All sign-ups bypass Supabase — no email sent, no verification needed.
 *   Goes straight to Create Household → Profile Setup → Dashboard.
 *
 * When EMAIL_AUTH_ENABLED is true:
 *   Normal Supabase sign-up with email confirmation.
 *   Emails containing "dev" still get the dev bypass.
 */

import { useState } from "react";
import { C, fontDisplay } from "../constants/colors";
import { btnPrimary, btnGhost, inputStyle, labelStyle } from "../constants/styles";
import { signUp, EMAIL_AUTH_ENABLED } from "../utils/auth";
import PageShell from "../components/PageShell";
import Card from "../components/Card";
import Logo from "../components/Logo";

export default function SignUpScreen({ onSignUpSuccess, onDevBypass, onBack }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isPasswordValid = password.length >= 6;
  const passwordsMatch = password === confirmPassword;
  const canSubmit = isEmailValid && isPasswordValid && passwordsMatch && !loading;

  const handleSignUp = async () => {
    setError("");
    if (!isEmailValid) { setError("Please enter a valid email address."); return; }
    if (!isPasswordValid) { setError("Password must be at least 6 characters."); return; }
    if (!passwordsMatch) { setError("Passwords don't match."); return; }

    // ─── BYPASS when email auth is disabled OR email contains "dev" ──
    if (!EMAIL_AUTH_ENABLED || email.toLowerCase().includes("dev")) {
      console.log(EMAIL_AUTH_ENABLED ? "DEV BYPASS:" : "EMAIL AUTH DISABLED:", "Skipping email verification for", email);
      onDevBypass(email.trim());
      return;
    }

    // ─── Normal Supabase sign-up (only when EMAIL_AUTH_ENABLED is true) ──
    setLoading(true);
    try {
      const { data, error: authError } = await signUp(email.trim(), password);
      if (authError) { setError(authError.message); setLoading(false); return; }
      onSignUpSuccess(email.trim());
    } catch (e) {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <PageShell narrow>
      <button onClick={onBack} style={btnGhost}>&larr; Back</button>
      <div style={{ marginTop: 28 }}><Logo /></div>
      <h2 style={{ fontFamily: fontDisplay, fontSize: 28, fontWeight: 500, margin: "20px 0 8px" }}>
        Create your account
      </h2>
      <p style={{ color: C.steel, fontSize: 15, lineHeight: 1.55, marginBottom: 32 }}>
        {EMAIL_AUTH_ENABLED
          ? "Enter your email and choose a password. We'll send you a confirmation email to verify your address."
          : "Enter your email and choose a password to get started."}
      </p>

      <Card>
        <label style={labelStyle}>Email address</label>
        <input type="email" style={{ ...inputStyle, marginBottom: 18 }}
          placeholder="you@example.com" value={email}
          onChange={(e) => { setEmail(e.target.value); setError(""); }}
          autoFocus autoComplete="email" />

        <label style={labelStyle}>Password</label>
        <input type="password" style={{ ...inputStyle, marginBottom: 18 }}
          placeholder="At least 6 characters" value={password}
          onChange={(e) => { setPassword(e.target.value); setError(""); }}
          autoComplete="new-password" />

        <label style={labelStyle}>Confirm password</label>
        <input type="password" style={{ ...inputStyle, marginBottom: 8 }}
          placeholder="Re-enter your password" value={confirmPassword}
          onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
          onKeyDown={(e) => e.key === "Enter" && canSubmit && handleSignUp()}
          autoComplete="new-password" />

        {password && !isPasswordValid && (
          <p style={{ fontSize: 12, color: C.steel, marginTop: 4, marginBottom: 4 }}>Password needs at least 6 characters</p>
        )}
        {confirmPassword && !passwordsMatch && (
          <p style={{ fontSize: 12, color: C.danger, marginTop: 4, marginBottom: 4 }}>Passwords don't match</p>
        )}
        {error && (<p style={{ color: C.danger, fontSize: 14, marginTop: 12 }}>{error}</p>)}

        <button onClick={handleSignUp} disabled={!canSubmit}
          style={{ ...btnPrimary, width: "100%", marginTop: 22, opacity: canSubmit ? 1 : 0.45 }}>
          {loading ? "Creating account…" : "Create account"}
        </button>
      </Card>
    </PageShell>
  );
}
