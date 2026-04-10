import { C } from "../constants/colors";
import { btnGhost } from "../constants/styles";

export default function WizardNav({ step, totalSteps, onBack, onBackToList }) {
  const showBack = step > 0 || onBackToList;
  return (
    <div>
      <div style={{ height: 3, background: C.mist, borderRadius: 2, marginBottom: 24, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${((step + 1) / totalSteps) * 100}%`,
          background: C.gradientPrimary, borderRadius: 2,
          transition: "width 0.4s cubic-bezier(.4,0,.2,1)",
        }} />
      </div>
      {showBack && (
        <button onClick={step === 0 ? onBackToList : onBack}
          style={{ ...btnGhost, padding: "10px 0" }}>
          &larr; Previous
        </button>
      )}
    </div>
  );
}
