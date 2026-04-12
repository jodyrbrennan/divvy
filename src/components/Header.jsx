import { C, fontDisplay } from "../constants/colors";
import { btnGhost } from "../constants/styles";

/**
 * Shared page header with optional back button.
 * Extracted from Dashboard.jsx — used by every view.
 */
export default function Header({ title, onBack }) {
  return (
    <div style={{ marginBottom: 24, animation: "fadeUp 0.3s ease both" }}>
      {onBack && (
        <button onClick={onBack} style={{ ...btnGhost, padding: "4px 0", marginBottom: 8 }}>
          &larr; Back
        </button>
      )}
      <h2 style={{ fontFamily: fontDisplay, fontSize: 24, fontWeight: 500, color: C.dark }}>
        {title}
      </h2>
    </div>
  );
}
