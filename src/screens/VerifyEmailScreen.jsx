/**
 * VerifyEmailScreen.jsx — Shown after a user signs up.
 *
 * WHAT THIS SCREEN DOES:
 * Tells the user to check their email and click the confirmation link.
 * While they wait, the app is listening for auth state changes in App.jsx.
 * When the user clicks the link in their email, Supabase confirms their
 * account and the app automatically moves them forward.
 *
 * The user can also go back to sign in if they've already confirmed.
 */

import { C, fontDisplay } from "../constants/colors";
import { btnPrimary, btnGhost } from "../constants/styles";
import PageShell from "../components/PageShell";
import Card from "../components/Card";
import Logo from "../components/Logo";

export default function VerifyEmailScreen({ email, onBackToSignIn }) {
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
            We sent a confirmation link to:
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
            Open the email and click the link to verify your account.
            Once confirmed, you'll be able to continue setting up your household.
          </p>

          <div style={{
            padding: "14px 20px", borderRadius: 12, background: "rgba(170,199,216,0.12)",
            border: `1px solid ${C.sky}`, marginBottom: 24,
            animation: "fadeUp 0.5s ease 0.45s both",
          }}>
            <p style={{ fontSize: 13, color: C.navy, lineHeight: 1.5 }}>
              Didn't get the email? Check your spam folder, or go back and
              try signing in — if your email is already confirmed, you're all set.
            </p>
          </div>

          <button
            onClick={onBackToSignIn}
            style={{ ...btnGhost, width: "100%" }}
          >
            &larr; Back to sign in
          </button>
        </Card>
      </div>
    </PageShell>
  );
}
