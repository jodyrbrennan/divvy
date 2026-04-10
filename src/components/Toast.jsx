import { useState, useRef, useCallback } from "react";
import { C, font } from "../constants/colors";

let _showToast = () => {};
export function useToast() { return _showToast; }

export default function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  _showToast = useCallback((message) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast(message);
    timerRef.current = setTimeout(() => setToast(null), 2500);
  }, []);

  return (
    <>
      {children}
      {toast && (
        <div style={{
          position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)",
          zIndex: 200,
          background: C.dark, color: C.white,
          fontFamily: font, fontSize: 14, fontWeight: 500,
          padding: "12px 24px", borderRadius: 12,
          boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
          animation: "fadeUp 0.25s ease both",
          maxWidth: "90vw", textAlign: "center",
          backdropFilter: "blur(12px)",
        }}>
          {toast}
        </div>
      )}
    </>
  );
}
