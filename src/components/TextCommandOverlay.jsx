import { C, font } from "../constants/colors";
import { btnBase, btnGhost } from "../constants/styles";

/**
 * Text command overlay with custom keyboard — extracted from Dashboard.jsx.
 */
export default function TextCommandOverlay({
  textCommandInput, setTextCommandInput, textShift, setTextShift,
  textInputRef, submitTextCommand, cancelTextCommand,
}) {
    const audioCtxRef = { current: null };
    const playClick = (freq = 3800, dur = 0.03, vol = 0.08) => {
      try {
        if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
        const ctx = audioCtxRef.current;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.5, ctx.currentTime + dur);
        gain.gain.setValueAtTime(vol, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + dur);
      } catch {}
    };
    const haptic = (ms = 8) => { try { navigator.vibrate?.(ms); } catch {} };
    const feedback = (special) => { haptic(special ? 12 : 6); playClick(special ? 2800 : 3800, special ? 0.04 : 0.025); };

    const kH = 54;
    const kGap = 5;
    const numRow = ["1","2","3","4","5","6","7","8","9","0"];
    const row1 = ["Q","W","E","R","T","Y","U","I","O","P"];
    const row2 = ["A","S","D","F","G","H","J","K","L"];
    const row3 = ["Z","X","C","V","B","N","M"];
    const puncRow = [".",",","?","!","'","-","@"];

    const Key = ({ k, flex, special, children, onTap }) => {
      const isShiftActive = k === "SHIFT" && textShift;
      const bg = isShiftActive
        ? `linear-gradient(180deg, ${C.navy} 0%, ${C.dark} 100%)`
        : special
          ? "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)"
          : "linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.12) 100%)";
      const handlePress = () => {
        feedback(special);
        if (onTap) onTap(); else typeKey(k);
      };
      return (
        <button onClick={handlePress} style={{
          all: "unset", cursor: "pointer", WebkitTapHighlightColor: "transparent",
          display: "flex", alignItems: "center", justifyContent: "center",
          height: kH, borderRadius: 12, fontFamily: font,
          fontWeight: 600, fontSize: special ? 13 : 20,
          background: bg, color: C.white, flex: flex || 1, minWidth: 0,
          transition: "transform 0.08s, filter 0.08s",
          boxShadow: "0 1px 0 rgba(0,0,0,0.3), 0 3px 6px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}>
          {children}
        </button>
      );
    };

    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(29,38,44,0.97)",
        display: "flex", flexDirection: "column",
        animation: "fadeUp 0.15s ease both",
      }} onClick={() => textInputRef.current?.focus()}>
        <input ref={textInputRef} inputMode="none"
          onKeyDown={handleHiddenKeyDown} onKeyUp={handleHiddenKeyUp}
          style={{ position: "absolute", opacity: 0, pointerEvents: "none", top: -100 }}
          autoFocus />

        {/* Top bar */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 16px", flexShrink: 0,
          background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}>
          <button onClick={() => { feedback(true); cancelTextCommand(); }} style={{
            ...btnGhost, color: "rgba(255,255,255,0.5)", fontSize: 15, padding: "8px 12px",
          }}>Cancel</button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.sky} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
            <p style={{ fontFamily: font, fontSize: 15, fontWeight: 600, color: C.white, letterSpacing: "0.02em" }}>Command</p>
          </div>
          <button onClick={() => { if (textCommandInput.trim()) { feedback(true); submitTextCommand(); } }} disabled={!textCommandInput.trim()} style={{
            ...btnBase, padding: "8px 20px", fontSize: 15, borderRadius: 10,
            background: textCommandInput.trim() ? `linear-gradient(135deg, ${C.sky} 0%, ${C.white} 100%)` : "rgba(255,255,255,0.08)",
            color: textCommandInput.trim() ? C.dark : "rgba(255,255,255,0.25)",
            fontWeight: 700, boxShadow: textCommandInput.trim() ? "0 2px 12px rgba(170,199,216,0.3)" : "none",
          }}>Send</button>
        </div>

        {/* Input display */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", padding: "0 20px", overflow: "auto" }}>
          <div style={{
            width: "100%", maxWidth: 520, margin: "0 auto",
            background: "rgba(255,255,255,0.04)", borderRadius: 20, padding: "28px 24px",
            border: "1px solid rgba(255,255,255,0.06)", minHeight: 80,
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
          }}>
            <p style={{ fontFamily: font, fontSize: 20, color: C.white, lineHeight: 1.6, wordBreak: "break-word" }}>
              {textCommandInput}
              <span style={{
                display: "inline-block", width: 2, height: 22,
                background: C.sky, marginLeft: 2, borderRadius: 1,
                animation: "glowPulse 1s ease-in-out infinite",
                verticalAlign: "text-bottom", boxShadow: `0 0 8px ${C.sky}`,
              }} />
            </p>
            {!textCommandInput && (
              <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 18, marginTop: -32, pointerEvents: "none" }}>
                Type a command...
              </p>
            )}
          </div>
        </div>

        {/* Keyboard */}
        <div style={{
          background: "linear-gradient(180deg, rgba(35,45,52,0.98) 0%, rgba(25,32,38,0.99) 100%)",
          borderTop: "1px solid rgba(255,255,255,0.04)",
          padding: "8px 3px 24px", maxWidth: 560, width: "100%", margin: "0 auto",
        }}>
          <div style={{ display: "flex", gap: kGap, marginBottom: kGap, padding: "0 2px" }}>
            {numRow.map((n) => (
              <Key key={n} k={n} onTap={() => { feedback(); setTextCommandInput((v) => v + n); }}>
                <span style={{ fontSize: 18 }}>{n}</span>
              </Key>
            ))}
          </div>
          <div style={{ display: "flex", gap: kGap, marginBottom: kGap, padding: "0 2px" }}>
            {row1.map((k) => <Key key={k} k={k}><span>{textShift ? k : k.toLowerCase()}</span></Key>)}
          </div>
          <div style={{ display: "flex", gap: kGap, marginBottom: kGap, padding: "0 18px" }}>
            {row2.map((k) => <Key key={k} k={k}><span>{textShift ? k : k.toLowerCase()}</span></Key>)}
          </div>
          <div style={{ display: "flex", gap: kGap, marginBottom: kGap, padding: "0 2px" }}>
            <Key k="SHIFT" flex="1.6" special>
              <svg width="22" height="22" viewBox="0 0 24 24" fill={textShift ? C.white : "none"} stroke={C.white} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2l9 12h-6v8H9v-8H3z"/>
              </svg>
            </Key>
            {row3.map((k) => <Key key={k} k={k}><span>{textShift ? k : k.toLowerCase()}</span></Key>)}
            <Key k="BACK" flex="1.6" special>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.white} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z"/><path d="M18 9l-6 6M12 9l6 6"/>
              </svg>
            </Key>
          </div>
          <div style={{ display: "flex", gap: kGap, padding: "0 2px" }}>
            {puncRow.slice(0, 3).map((p) => (
              <Key key={p} k={p} flex="0.72" onTap={() => { feedback(); setTextCommandInput((v) => v + p); }}>
                <span style={{ fontSize: 22 }}>{p}</span>
              </Key>
            ))}
            <Key k="SPACE" flex="4.5" onTap={() => { feedback(); typeKey("SPACE"); }}>
              <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.15em", opacity: 0.4 }}>space</span>
            </Key>
            {puncRow.slice(3).map((p) => (
              <Key key={p} k={p} flex="0.72" onTap={() => { feedback(); setTextCommandInput((v) => v + p); }}>
                <span style={{ fontSize: 22 }}>{p}</span>
              </Key>
            ))}
          </div>
        </div>
      </div>
    );
}
