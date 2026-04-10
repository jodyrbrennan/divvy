import { C } from "../constants/colors";

export default function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@1,700&family=Outfit:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Sora:wght@600;700;800&display=swap');
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { background: ${C.bg}; }
      input:focus, select:focus, textarea:focus {
        border-color: ${C.navy} !important;
        box-shadow: 0 0 0 4px ${C.glow} !important;
      }
      button:hover { transform: translateY(-1px); filter: brightness(1.04); }
      button:active { transform: translateY(0px) scale(0.95); filter: brightness(1.15); }
      ::selection { background: ${C.sky}; color: ${C.dark}; }
      @keyframes fadeUp {
        from { opacity: 0; transform: translateY(16px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      @keyframes glowPulse {
        0%, 100% { opacity: 0.4; }
        50% { opacity: 0.7; }
      }
    `}</style>
  );
}
