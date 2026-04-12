/**
 * WelcomeScreen.jsx — The first screen users see when opening the app.
 *
 * WHAT CHANGED:
 * Previously had "Create a new household" and "Join an existing household" buttons.
 * Now has "Create an account" (sign up) and "Sign in" buttons.
 *
 * The household creation and joining flows now happen AFTER authentication:
 * - New users sign up → verify email → create household → set up profile
 * - Invited users click an invite link → get authenticated → auto-join household → set up profile
 * - Returning users sign in → go straight to dashboard
 */

import { C, fontDisplay } from "../constants/colors";
import { btnPrimary, btnSecondary } from "../constants/styles";
import PageShell from "../components/PageShell";
import Card from "../components/Card";
import Logo from "../components/Logo";

export default function WelcomeScreen({ onSignUp, onSignIn }) {
  return (
    <PageShell narrow>
      <div style={{ textAlign: "center", marginBottom: 52, marginTop: 80 }}>
        <div style={{ animation: "fadeUp 0.6s ease both", marginBottom: 12 }}>
          <Logo size={52} />
        </div>
        <p style={{
          fontFamily: fontDisplay, fontStyle: "italic", fontSize: 16, color: C.steel,
          animation: "fadeUp 0.6s ease 0.1s both",
        }}>
          Split the work. Share the load.
        </p>
      </div>
      <Card delay={0.2}>
        <h2 style={{ fontFamily: fontDisplay, fontSize: 24, fontWeight: 500, marginBottom: 8 }}>
          Welcome home
        </h2>
        <p style={{ color: C.steel, fontSize: 15, lineHeight: 1.65, marginBottom: 32 }}>
          Divvy helps everyone in your household see what needs doing, share the
          load fairly, and celebrate each other along the way.
        </p>
        <button onClick={onSignUp} style={{ ...btnPrimary, width: "100%", marginBottom: 12 }}>
          Create an account
        </button>
        <button onClick={onSignIn} style={{ ...btnSecondary, width: "100%" }}>
          Sign in
        </button>
      </Card>
    </PageShell>
  );
}
