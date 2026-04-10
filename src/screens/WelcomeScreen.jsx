import { C, fontDisplay } from "../constants/colors";
import { btnPrimary, btnSecondary } from "../constants/styles";
import PageShell from "../components/PageShell";
import Card from "../components/Card";
import Logo from "../components/Logo";

export default function WelcomeScreen({ onCreateNew, onJoin }) {
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
        <button onClick={onCreateNew} style={{ ...btnPrimary, width: "100%", marginBottom: 12 }}>
          Create a new household
        </button>
        <button onClick={onJoin} style={{ ...btnSecondary, width: "100%" }}>
          Join an existing household
        </button>
      </Card>
    </PageShell>
  );
}
