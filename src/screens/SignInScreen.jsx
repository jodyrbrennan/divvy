/**
 * SignInScreen.jsx — Where returning users log back in.
 *
 * When EMAIL_AUTH_ENABLED is false:
 *   Looks up the email in existing household users locally.
 *   No Supabase call, no password verification.
 *   Password field is still shown for UX consistency.
 *
 * When EMAIL_AUTH_ENABLED is true:
 *   Normal Supabase sign-in with password verification.
 */

import { useState } from "react";
import { C, fontDisplay } from "../constants/colors";
import { btnPrimary, btnGhost, inputStyle, labelStyle } from "../constants/styles";
import { signIn, EMAIL_AUTH_ENABLED } from "../utils/auth";
import { useAppData } from "../contexts/AppDataContext";
import PageShell from "../components/PageShell";
import Card from "../components/Card";
import Logo from "../components/Logo";

export default function SignInScreen({ onBack, onForgotPassword, onDirectSignIn }) {
  const { appData } = useAppData();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const canSubmit = email.trim() && password && !loading;

  const handleSignIn = async () => {
    setError("");
    setLoading(true);

    // ─── LOCAL sign-in when email auth is disabled ───────────────
    if (!EMAIL_AUTH_ENABLED) {
      const normalizedEmail = email.trim().toLowerCase();

      // Look up user by email in the household data
      const matchingUser = appData?.users?.find(
        (u) => u.email && u.email.toLowerCase() === normalizedEmail && u.status === "active"
      );

      if (matchingUser) {
        // Found them — tell App.jsx to log them in
        onDirectSignIn(matchingUser);
        return;
      }

      setError("No account found with that email. Please check your email or create a new account.");
      setLoading(false);
      return;
    }

    // ─── Real Supabase sign-in (only when EMAIL_AUTH_ENABLED is true) ──
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
      <h2 style={{ fontFamily: fontDisplay, fontSize: 28, fontWeight: 500, margin: "20px 0 8px" }}>
        Welcome back
      </h2>
      <p style={{ color: C.steel, fontSize: 15, lineHeight: 1.55, marginBottom: 32 }}>
        Sign in with the email you used when you created your account.
      </p>

      <Card>
        <label style={labelStyle}>Email address</label>
        <input type="email" style={{ ...inputStyle, marginBottom: 18 }}
          placeholder="you@example.com" value={email}
          onChange={(e) => { setEmail(e.target.value); setError(""); }}
          autoFocus autoComplete="email" />

        <label style={labelStyle}>Password</label>
        <input type="password" style={{ ...inputStyle }}
          placeholder="Your password" value={password}
          onChange={(e) => { setPassword(e.target.value); setError(""); }}
          onKeyDown={(e) => e.key === "Enter" && canSubmit && handleSignIn()}
          autoComplete="current-password" />

        {/* Only show forgot password when email auth is enabled */}
        {EMAIL_AUTH_ENABLED && (
          <div style={{ textAlign: "right", marginTop: 10 }}>
            <button onClick={onForgotPassword}
              style={{ all: "unset", cursor: "pointer", fontSize: 13, color: C.navy,
                fontFamily: "'Outfit', sans-serif", fontWeight: 500, transition: "color 0.2s" }}>
              Forgot password?
            </button>
          </div>
        )}

        {error && (<p style={{ color: C.danger, fontSize: 14, marginTop: 12 }}>{error}</p>)}

        <button onClick={handleSignIn} disabled={!canSubmit}
          style={{ ...btnPrimary, width: "100%", marginTop: 16, opacity: canSubmit ? 1 : 0.45 }}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </Card>
    </PageShell>
  );
}
