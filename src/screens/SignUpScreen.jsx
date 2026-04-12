/**
 * SignUpScreen.jsx — Where new users create their account.
 *
 * WHAT THIS SCREEN DOES:
 * 1. Collects the user's email address and password
 * 2. Validates that both fields are filled and password is long enough
 * 3. Calls signUp() from auth.js, which tells Supabase to:
 *    - Create the account
 *    - Send a confirmation email
 * 4. If successful, navigates to the "check your email" screen
 *
 * WHAT HAPPENS AFTER:
 * The user opens their email, clicks the confirmation link, and is
 * redirected back to the app. App.jsx detects the confirmed session
 * and moves them to household creation or profile setup.
 */

import { useState } from "react";
import { C, fontDisplay } from "../constants/colors";
import { btnPrimary, btnGhost, inputStyle, labelStyle } from "../constants/styles";
import { signUp } from "../utils/auth";
import PageShell from "../components/PageShell";
import Card from "../components/Card";
import Logo from "../components/Logo";

export default function SignUpScreen({ onSignUpSuccess, onBack }) {
  // ─── State ─────────────────────────────────────────────────────
  // These variables track what the user has typed and any errors.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ─── Form Validation ──────────────────────────────────────────
  // Check that the email looks valid (has @ and a dot after it)
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  // Password must be at least 6 characters (Supabase requirement)
  const isPasswordValid = password.length >= 6;
  // Confirm password must match
  const passwordsMatch = password === confirmPassword;
  // All fields must be valid to enable the button
  const canSubmit = isEmailValid && isPasswordValid && passwordsMatch && !loading;

  // ─── Handle Sign Up ────────────────────────────────────────────
  const handleSignUp = async () => {
    // Clear any previous error
    setError("");

    // Double-check validations
    if (!isEmailValid) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!isPasswordValid) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (!passwordsMatch) {
      setError("Passwords don't match.");
      return;
    }

    // Show loading state while we wait for Supabase
    setLoading(true);

    try {
      // Call our auth helper to create the account
      const { data, error: authError } = await signUp(email.trim(), password);

      if (authError) {
        // Supabase returned an error — show it to the user
        setError(authError.message);
        setLoading(false);
        return;
      }

      // Success! Tell App.jsx to show the "check your email" screen
      onSignUpSuccess(email.trim());
    } catch (e) {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────
  return (
    <PageShell narrow>
      <button onClick={onBack} style={btnGhost}>&larr; Back</button>
      <div style={{ marginTop: 28 }}><Logo /></div>
      <h2 style={{
        fontFamily: fontDisplay, fontSize: 28, fontWeight: 500, margin: "20px 0 8px",
      }}>
        Create your account
      </h2>
      <p style={{ color: C.steel, fontSize: 15, lineHeight: 1.55, marginBottom: 32 }}>
        Enter your email and choose a password. We'll send you a confirmation
        email to verify your address.
      </p>

      <Card>
        {/* Email field */}
        <label style={labelStyle}>Email address</label>
        <input
          type="email"
          style={{ ...inputStyle, marginBottom: 18 }}
          placeholder="you@example.com"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(""); }}
          autoFocus
          autoComplete="email"
        />

        {/* Password field */}
        <label style={labelStyle}>Password</label>
        <input
          type="password"
          style={{ ...inputStyle, marginBottom: 18 }}
          placeholder="At least 6 characters"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError(""); }}
          autoComplete="new-password"
        />

        {/* Confirm password field */}
        <label style={labelStyle}>Confirm password</label>
        <input
          type="password"
          style={{ ...inputStyle, marginBottom: 8 }}
          placeholder="Re-enter your password"
          value={confirmPassword}
          onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
          onKeyDown={(e) => e.key === "Enter" && canSubmit && handleSignUp()}
          autoComplete="new-password"
        />

        {/* Password hint */}
        {password && !isPasswordValid && (
          <p style={{ fontSize: 12, color: C.steel, marginTop: 4, marginBottom: 4 }}>
            Password needs at least 6 characters
          </p>
        )}
        {confirmPassword && !passwordsMatch && (
          <p style={{ fontSize: 12, color: C.danger, marginTop: 4, marginBottom: 4 }}>
            Passwords don't match
          </p>
        )}

        {/* Error message */}
        {error && (
          <p style={{ color: C.danger, fontSize: 14, marginTop: 12 }}>{error}</p>
        )}

        {/* Submit button */}
        <button
          onClick={handleSignUp}
          disabled={!canSubmit}
          style={{
            ...btnPrimary,
            width: "100%",
            marginTop: 22,
            opacity: canSubmit ? 1 : 0.45,
          }}
        >
          {loading ? "Creating account…" : "Create account"}
        </button>
      </Card>
    </PageShell>
  );
}
