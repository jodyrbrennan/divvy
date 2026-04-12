import { C, font, fontDisplay } from "../constants/colors";
import { btnBase, btnGhost } from "../constants/styles";

/**
 * Voice command overlay — extracted from Dashboard.jsx.
 * All state is managed by the parent (Dashboard); this component just renders.
 */
export default function VoiceCommandOverlay({
  voiceMode, voiceTranscript, voiceParsed, voiceError,
  startVoice, stopVoice, cancelVoice, executeVoiceCommand,
}) {
  if (voiceMode === "idle") return null;
    const pulseAnim = voiceMode === "listening" ? "glowPulse 1.2s ease-in-out infinite" : "none";
    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(41,53,60,0.92)", backdropFilter: "blur(16px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20, animation: "fadeUp 0.2s ease both",
      }}>
        <div style={{ maxWidth: 420, width: "100%", textAlign: "center" }}>

          {voiceMode === "listening" && (
            <>
              <div style={{
                width: 100, height: 100, borderRadius: "50%",
                background: `radial-gradient(circle, ${C.sky} 0%, ${C.navy} 100%)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 24px", boxShadow: `0 0 40px ${C.sky}`,
                animation: pulseAnim,
              }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={C.white} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
                  <path d="M19 10v2a7 7 0 01-14 0v-2"/>
                  <line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
              </div>
              <h3 style={{ fontFamily: fontDisplay, fontSize: 22, fontWeight: 500, color: C.white, marginBottom: 8 }}>Listening...</h3>
              <p style={{ color: C.sky, fontSize: 14, marginBottom: 8, minHeight: 44 }}>
                {voiceTranscript || "Speak your command"}
              </p>
              <p style={{ color: C.steel, fontSize: 12, marginBottom: 32 }}>Tap below when finished</p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                <button onClick={cancelVoice} style={{ ...btnGhost, color: C.mist }}>Cancel</button>
                <button onClick={stopVoice} style={{
                  ...btnBase, padding: "14px 32px", background: C.white, color: C.dark,
                  boxShadow: "0 4px 20px rgba(255,255,255,0.2)",
                }}>Done speaking</button>
              </div>
            </>
          )}

          {voiceMode === "processing" && (
            <>
              <div style={{
                width: 80, height: 80, borderRadius: "50%", background: C.navy,
                display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px",
              }}>
                <div style={{
                  width: 40, height: 3, borderRadius: 2,
                  background: `linear-gradient(90deg, ${C.ice}, ${C.sky}, ${C.ice})`,
                  backgroundSize: "200% 100%", animation: "shimmer 1s ease infinite",
                }} />
              </div>
              <h3 style={{ fontFamily: fontDisplay, fontSize: 22, fontWeight: 500, color: C.white, marginBottom: 8 }}>Understanding...</h3>
              <p style={{ color: C.sky, fontSize: 14 }}>"{voiceTranscript}"</p>
            </>
          )}

          {voiceMode === "result" && voiceError && (
            <>
              <div style={{
                width: 80, height: 80, borderRadius: "50%", background: "rgba(192,57,43,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px",
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.danger} strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/>
                </svg>
              </div>
              <h3 style={{ fontFamily: fontDisplay, fontSize: 20, fontWeight: 500, color: C.white, marginBottom: 8 }}>Something went wrong</h3>
              <p style={{ color: C.steel, fontSize: 14, marginBottom: 24 }}>{voiceError}</p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                <button onClick={cancelVoice} style={{ ...btnGhost, color: C.mist }}>Close</button>
                <button onClick={startVoice} style={{ ...btnBase, padding: "14px 28px", background: C.white, color: C.dark }}>Try again</button>
              </div>
            </>
          )}

          {voiceMode === "result" && !voiceError && voiceParsed && (
            <>
              <div style={{
                width: 80, height: 80, borderRadius: "50%", background: "rgba(170,199,216,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px",
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.sky} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>
                </svg>
              </div>
              <h3 style={{ fontFamily: fontDisplay, fontSize: 20, fontWeight: 500, color: C.white, marginBottom: 16 }}>Got it</h3>

              <div style={{
                background: "rgba(255,255,255,0.1)", borderRadius: 16, padding: 20,
                textAlign: "left", marginBottom: 24, border: "1px solid rgba(255,255,255,0.1)",
              }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em",
                    color: C.dark, background: C.sky, padding: "3px 10px", borderRadius: 50,
                  }}>{voiceParsed.type}</span>
                  {voiceParsed.confidence && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: C.steel, padding: "3px 10px", borderRadius: 50, background: "rgba(255,255,255,0.1)" }}>
                      {voiceParsed.confidence} confidence
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 16, fontWeight: 600, color: C.white, marginBottom: 6 }}>
                  {voiceParsed.title || voiceParsed.summary}
                </p>
                {voiceParsed.description && voiceParsed.description !== voiceParsed.title && (
                  <p style={{ fontSize: 13, color: C.sky, marginBottom: 8, lineHeight: 1.4 }}>{voiceParsed.description}</p>
                )}
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
                  {voiceParsed.targetUserName && (
                    <span style={{ fontSize: 12, color: C.steel }}>For: <span style={{ color: C.white, fontWeight: 600 }}>{voiceParsed.targetUserName}</span></span>
                  )}
                  {voiceParsed.dueDate && (
                    <span style={{ fontSize: 12, color: C.steel }}>Due: <span style={{ color: C.white, fontWeight: 600 }}>{voiceParsed.dueDate}{voiceParsed.dueTime ? ` at ${voiceParsed.dueTime}` : ""}</span></span>
                  )}
                  {voiceParsed.points > 0 && (
                    <span style={{ fontSize: 12, color: C.steel }}>Points: <span style={{ color: C.white, fontWeight: 600 }}>{voiceParsed.points}</span></span>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                <button onClick={cancelVoice} style={{ ...btnGhost, color: C.mist }}>Cancel</button>
                <button onClick={startVoice} style={{ ...btnGhost, color: C.sky }}>Redo</button>
                <button onClick={executeVoiceCommand} style={{
                  ...btnBase, padding: "14px 32px", background: C.white, color: C.dark,
                  boxShadow: "0 4px 20px rgba(255,255,255,0.2)",
                }}>Confirm</button>
              </div>
            </>
          )}
        </div>
      </div>
    );
}
