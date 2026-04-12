import { C, font, fontDisplay } from "../constants/colors";
import { btnBase, btnPrimary, btnSecondary, btnGhost, inputStyle } from "../constants/styles";

/**
 * Message approval overlay — extracted from Dashboard.jsx.
 * Shows the sender a preview before sending any AI-rewritten message.
 */
export default function MessageApprovalOverlay({
  pendingApproval, setPendingApproval, commitNotification, reRewriteForApproval,
}) {
  if (!pendingApproval) return null;
    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(41,53,60,0.6)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20, animation: "fadeUp 0.15s ease both",
      }}>
        <div onClick={(e) => e.stopPropagation()} style={{
          background: C.white, borderRadius: 22, padding: 28,
          maxWidth: 460, width: "100%",
          boxShadow: "0 16px 48px rgba(0,0,0,0.15)",
          animation: "fadeUp 0.25s ease both",
          maxHeight: "90vh", overflowY: "auto",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.navy} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
            <h3 style={{ fontFamily: fontDisplay, fontSize: 20, fontWeight: 600, color: C.dark }}>Review Before Sending</h3>
          </div>

          {/* What you wrote */}
          <p style={{ fontSize: 11, fontWeight: 700, color: C.steel, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Your message</p>
          <div style={{
            background: C.bg, borderRadius: 14, padding: "14px 16px",
            border: `1px solid ${C.border}`, marginBottom: 18,
          }}>
            <p style={{ fontSize: 14, color: C.dark, lineHeight: 1.5 }}>{pendingApproval.original}</p>
          </div>

          {/* What recipient will see */}
          <p style={{ fontSize: 11, fontWeight: 700, color: C.navy, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
            What {pendingApproval.recipientName} will see
          </p>
          <div style={{
            background: C.ice, borderRadius: 14, padding: "14px 16px",
            border: `1px solid ${C.sky}`, marginBottom: 14,
            borderLeft: `3px solid ${C.navy}`,
          }}>
            <p style={{ fontSize: 14, color: C.dark, lineHeight: 1.5 }}>{pendingApproval.rewritten}</p>
          </div>

          {pendingApproval.original !== pendingApproval.rewritten && (
            <p style={{ fontSize: 12, color: C.steel, lineHeight: 1.5, marginBottom: 16, fontStyle: "italic" }}>
              Divvy adapts the tone to match {pendingApproval.recipientName}'s preferences. You can correct any factual inaccuracies below.
            </p>
          )}

          {/* Edit for accuracy mode */}
          {pendingApproval.editMode ? (
            <div style={{ marginBottom: 16, animation: "fadeUp 0.15s ease both" }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: C.dark, marginBottom: 8 }}>
                Edit your original message for accuracy. The tone will be re-adapted automatically.
              </p>
              <textarea
                style={{ ...inputStyle, minHeight: 80, resize: "vertical", fontFamily: font, fontSize: 14 }}
                value={pendingApproval.editText}
                onChange={(e) => setPendingApproval((p) => ({ ...p, editText: e.target.value }))}
                autoFocus
              />
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button onClick={() => setPendingApproval((p) => ({ ...p, editMode: false, editText: "" }))}
                  style={{ ...btnGhost, flex: 1 }}>Cancel edit</button>
                <button onClick={() => reRewriteForApproval(pendingApproval.editText)}
                  disabled={!pendingApproval.editText.trim()}
                  style={{ ...btnPrimary, flex: 2, opacity: pendingApproval.editText.trim() ? 1 : 0.45 }}>
                  Re-adapt message
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <button onClick={() => setPendingApproval((p) => ({ ...p, editMode: true, editText: p.original }))}
                style={{ ...btnGhost, fontSize: 13, color: C.navy }}>
                Correct inaccuracy
              </button>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setPendingApproval(null)}
              style={{ ...btnSecondary, flex: 1 }}>Cancel</button>
            <button onClick={() => commitNotification(pendingApproval.rewritten)}
              style={{ ...btnPrimary, flex: 2 }}>
              Approve and send
            </button>
          </div>
        </div>
      </div>
    );
}
