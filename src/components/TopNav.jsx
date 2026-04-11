import { useState } from "react";
import { C, font } from "../constants/colors";
import Logo from "./Logo";

export default function TopNav({ userName, unreadCount, onBellClick, onSettings, onSignOut }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <>
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        height: 56,
        background: "rgba(255,255,255,0.82)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: `1px solid ${C.borderLight}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 20px",
        boxShadow: "0 1px 8px rgba(0,0,0,0.04)",
      }}>
        <Logo size={26} />
        <p style={{
          fontFamily: font, fontWeight: 600, fontSize: 14, color: C.dark,
          position: "absolute", left: "50%", transform: "translateX(-50%)",
          letterSpacing: "0.01em",
        }}>
          {userName}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button onClick={onBellClick} style={{
            all: "unset", cursor: "pointer", display: "flex", alignItems: "center",
            justifyContent: "center", width: 36, height: 36, borderRadius: 10,
            position: "relative", transition: "background 0.2s",
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.dark} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
            </svg>
            {unreadCount > 0 && (
              <div style={{
                position: "absolute", top: 2, right: 2,
                width: 18, height: 18, borderRadius: "50%",
                background: C.danger, color: C.white,
                fontSize: 10, fontWeight: 800, fontFamily: font,
                display: "flex", alignItems: "center", justifyContent: "center",
                border: "2px solid white",
              }}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </div>
            )}
          </button>
          <button onClick={() => setMenuOpen(!menuOpen)} style={{
            all: "unset", cursor: "pointer", display: "flex", alignItems: "center",
            justifyContent: "center", width: 36, height: 36, borderRadius: 10,
            background: menuOpen ? C.ice : "transparent",
            transition: "background 0.2s",
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.dark} strokeWidth="2" strokeLinecap="round">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <>
          <div onClick={() => setMenuOpen(false)} style={{
            position: "fixed", inset: 0, zIndex: 99, background: "transparent",
          }} />
          <div style={{
            position: "fixed", top: 60, right: 16, zIndex: 101,
            background: "rgba(255,255,255,0.92)", backdropFilter: "blur(20px)",
            borderRadius: 14, border: `1px solid ${C.borderLight}`,
            boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
            padding: 8, minWidth: 180,
            animation: "fadeUp 0.15s ease both",
          }}>
            <button onClick={() => { setMenuOpen(false); onSettings?.(); }} style={{
              all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
              padding: "12px 14px", borderRadius: 10, width: "100%",
              transition: "background 0.15s", fontSize: 14, fontWeight: 500, color: C.dark,
              fontFamily: font,
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = C.ice}
            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.steel} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
              </svg>
              Settings
            </button>
            <button onClick={() => { setMenuOpen(false); onSignOut?.(); }} style={{
              all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
              padding: "12px 14px", borderRadius: 10, width: "100%",
              transition: "background 0.15s", fontSize: 14, fontWeight: 500, color: C.danger,
              fontFamily: font,
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(192,57,43,0.06)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.danger} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
              Sign out
            </button>
          </div>
        </>
      )}
    </>
  );
}