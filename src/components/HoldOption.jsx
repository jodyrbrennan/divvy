import { useState, useEffect, useRef, useCallback } from "react";
import { C } from "../constants/colors";

const HOLD_MS = 250;

export default function HoldOption({ children, selected, onHoldComplete, style }) {
  const [holding, setHolding] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [progress, setProgress] = useState(0);
  const rafRef = useRef(null);
  const startRef = useRef(null);
  const completedRef = useRef(false);

  const startHold = useCallback(() => {
    completedRef.current = false;
    setHolding(true);
    startRef.current = performance.now();
    const animate = (now) => {
      const elapsed = now - startRef.current;
      const p = Math.min(elapsed / HOLD_MS, 1);
      setProgress(p);
      if (p >= 1) {
        completedRef.current = true;
        setHolding(false);
        setProgress(0);
        onHoldComplete();
      } else {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
  }, [onHoldComplete]);

  const cancelHold = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setHolding(false);
    setProgress(0);
  }, []);

  useEffect(() => {
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  const highlighted = selected || hovered || holding;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); cancelHold(); }}
      onMouseDown={startHold}
      onMouseUp={cancelHold}
      onTouchStart={(e) => { setHovered(true); startHold(); }}
      onTouchEnd={() => { setHovered(false); cancelHold(); }}
      onTouchCancel={() => { setHovered(false); cancelHold(); }}
      style={{
        position: "relative",
        borderRadius: 14,
        border: `1.5px solid ${highlighted ? C.sky : C.border}`,
        background: highlighted ? C.ice : "rgba(255,255,255,0.85)",
        backdropFilter: "blur(8px)",
        cursor: "pointer",
        overflow: "hidden",
        userSelect: "none",
        WebkitUserSelect: "none",
        transform: holding ? "scale(0.985)" : "scale(1)",
        transition: holding ? "transform 0.1s" : "all 0.2s",
        ...style,
      }}
    >
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        height: "100%",
        width: `${progress * 100}%`,
        background: `linear-gradient(90deg, ${C.ice}, ${C.sky})`,
        opacity: holding ? 0.6 : 0,
        transition: holding ? "none" : "opacity 0.2s",
        pointerEvents: "none",
      }} />
      <div style={{ position: "relative", padding: "14px 18px" }}>
        {children}
      </div>
    </div>
  );
}
