/**
 * ResetPasswordScreen.jsx — Where users choose a new password.
 *
 * WHEN THIS SCREEN IS SHOWN:
 * After the user clicks the password reset link in their email, Supabase
 * redirects them back to the app and creates a temporary session. App.jsx
 * detects the PASSWORD_RECOVERY auth event and shows this screen.
 *
 * The user enters their new password, we call setPassword() to update it
 * in Supabase, and then they're taken to the dashboard (or sign-in if
 * they don't have a profile yet).
 */

import { useState } from "react";
import { C, fontDisplay } from "../constants/colors";
import { btnPrimary, inputStyle, labelStyle } from "../constants/styles";
import { setPassword } from "../utils/auth";
import PageShell from "../components/PageShell";
import Card from "../components/Card";
import Logo from "../components/Logo";

export default function ResetPasswordScreen({ onComplete }) {
  const [password, setPasswordValue] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isPasswordValid = password.length >= 6;
  const passwordsMatch = password === confirmPassword;
  const canSubmit = isPasswordValid && passwordsMatch && !loading;

  const handleSubmit = async () => {
    setError("");

    if (!isPasswordValid) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (!passwordsMatch) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await setPassword(password);

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }

      // Success — tell App.jsx to move to the next screen
      onComplete();
    } catch (e) {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <PageShell narrow>
      <div style={{ marginTop: 40, marginBottom: 20 }}><Logo /></div>
      <h2 style={{
        fontFamily: fontDisplay, fontSize: 28, fontWeight: 500, margin: "20px 0 8px",
      }}>
        Choose a new password
      </h2>
      <p style={{ color: C.steel, fontSize: 15, lineHeight: 1.55, marginBottom: 32 }}>
        Enter your new password below. Make it at least 6 characters long.
      </p>

      <Card>
        {/* New password */}
        <label style={labelStyle}>New password</label>
        <input
          type="password"
          style={{ ...inputStyle, marginBottom: 18 }}
          placeholder="At least 6 characters"
          value={password}
          onChange={(e) => { setPasswordValue(e.target.value); setError(""); }}
          autoFocus
          autoComplete="new-password"
        />

        {/* Confirm new password */}
        <label style={labelStyle}>Confirm new password</label>
        <input
          type="password"
          style={{ ...inputStyle, marginBottom: 8 }}
          placeholder="Re-enter your new password"
          value={confirmPassword}
          onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
          onKeyDown={(e) => e.key === "Enter" && canSubmit && handleSubmit()}
          autoComplete="new-password"
        />

        {/* Validation hints */}
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

        {/* Error */}
        {error && (
          <p style={{ color: C.danger, fontSize: 14, marginTop: 12 }}>{error}</p>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={{
            ...btnPrimary, width: "100%", marginTop: 22,
            opacity: canSubmit ? 1 : 0.45,
          }}
        >
          {loading ? "Updating…" : "Set new password"}
        </button>
      </Card>
    </PageShell>
  );
}
