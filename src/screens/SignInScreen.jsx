/**
 * SignInScreen.jsx — Where returning users log back in.
 *
 * WHAT THIS SCREEN DOES:
 * 1. Collects the user's email and password
 * 2. Calls signIn() from auth.js
 * 3. If successful, App.jsx detects the session change and
 *    routes the user to the dashboard
 *
 * ALSO INCLUDES:
 * A "Forgot password?" link that takes the user to ForgotPasswordScreen
 */

import { useState } from "react";
import { C, fontDisplay } from "../constants/colors";
import { btnPrimary, btnGhost, inputStyle, labelStyle } from "../constants/styles";
import { signIn } from "../utils/auth";
import PageShell from "../components/PageShell";
import Card from "../components/Card";
import Logo from "../components/Logo";

export default function SignInScreen({ onBack, onForgotPassword }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const canSubmit = email.trim() && password && !loading;

  const handleSignIn = async () => {
    setError("");
    setLoading(true);

    try {
      const { data, error: authError } = await signIn(email.trim(), password);

      if (authError) {
        if (authError.message.includes("Invalid login")) {
          setError("Incorrect email or password. Please try again.");
        } else if (authError.message.includes("Email not confirmed")) {
          setError("You haven't confirmed your email yet. Please check your inbox and click the confirmation link.");
        } else {
          setError(authError.message);
        }
        setLoading(false);
        return;
      }
    } catch (e) {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <PageShell narrow>
      <button onClick={onBack} style={btnGhost}>&larr; Back</button>
      <div style={{ marginTop: 28 }}><Logo /></div>
      <h2 style={{
        fontFamily: fontDisplay, fontSize: 28, fontWeight: 500, margin: "20px 0 8px",
      }}>
        Welcome back
      </h2>
      <p style={{ color: C.steel, fontSize: 15, lineHeight: 1.55, marginBottom: 32 }}>
        Sign in with the email and password you used when you created your account.
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
          style={{ ...inputStyle }}
          placeholder="Your password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError(""); }}
          onKeyDown={(e) => e.key === "Enter" && canSubmit && handleSignIn()}
          autoComplete="current-password"
        />

        {/* Forgot password link */}
        <div style={{ textAlign: "right", marginTop: 10 }}>
          <button
            onClick={onForgotPassword}
            style={{
              all: "unset",
              cursor: "pointer",
              fontSize: 13,
              color: C.navy,
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 500,
              transition: "color 0.2s",
            }}
          >
            Forgot password?
          </button>
        </div>

        {/* Error message */}
        {error && (
          <p style={{ color: C.danger, fontSize: 14, marginTop: 12 }}>{error}</p>
        )}

        {/* Submit button */}
        <button
          onClick={handleSignIn}
          disabled={!canSubmit}
          style={{
            ...btnPrimary,
            width: "100%",
            marginTop: 16,
            opacity: canSubmit ? 1 : 0.45,
          }}
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </Card>
    </PageShell>
  );
}
