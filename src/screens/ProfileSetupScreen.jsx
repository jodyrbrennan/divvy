import { useState } from "react";
import { C, fontDisplay } from "../constants/colors";
import { btnPrimary, inputStyle, labelStyle } from "../constants/styles";
import PageShell from "../components/PageShell";
import Card from "../components/Card";
import Logo from "../components/Logo";
import HoldOption from "../components/HoldOption";
import WizardNav from "../components/WizardNav";

export default function ProfileSetupScreen({ onComplete, householdName }) {
  const TOTAL = 8;
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState({
    name: "", type: "full", tone: "casual", sensitivity: "medium",
    forgetfulness: "sometimes", undoneFeelings: "mildly_annoyed",
    askStyle: "direct", notifFrequency: "moderate", recognitionPref: "both",
  });
  const s = (key) => (val) => setProfile((p) => ({ ...p, [key]: val }));
  const next = () => { setStep((v) => Math.min(v + 1, TOTAL - 1)); setGroupHovered(false); };
  const prev = () => { setStep((v) => Math.max(v - 1, 0)); setGroupHovered(false); };
  const isLast = step === TOTAL - 1;
  const [groupHovered, setGroupHovered] = useState(false);

  const stepValid = () => {
    if (step === 0) return profile.name.trim().length > 0;
    return true;
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <Card>
            <h3 style={{ fontFamily: fontDisplay, fontSize: 23, fontWeight: 500, marginBottom: 6 }}>About you</h3>
            <p style={{ color: C.steel, fontSize: 14, lineHeight: 1.5, marginBottom: 28 }}>
              We'll use this to personalize your experience in {householdName}.
            </p>
            <div style={{ marginBottom: 22 }}>
              <label style={labelStyle}>Your name</label>
              <input style={inputStyle} placeholder="First name" value={profile.name}
                onChange={(e) => s("name")(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && profile.name.trim() && next()}
                autoFocus />
            </div>
            <button onClick={next} disabled={!profile.name.trim()}
              style={{ ...btnPrimary, width: "100%", opacity: profile.name.trim() ? 1 : 0.45 }}>
              Continue
            </button>
          </Card>
        );
      case 1:
      case 2:
      case 3:
      case 4:
      case 5:
      case 6:
      case 7: {
        const stepDefs = {
          1: { title: "Preferred tone", sub: "How should Divvy sound when it talks to you?", field: "tone", options: [
            { v: "casual", l: "Casual", d: "Relaxed and friendly, like a roommate" },
            { v: "direct", l: "Direct", d: "Straight to the point, no fluff" },
            { v: "gentle", l: "Gentle", d: "Soft and considerate, never pushy" },
            { v: "humorous", l: "Humorous", d: "Light-hearted with a bit of fun" },
          ]},
          2: { title: "Task sensitivity", sub: "How sensitive are you to being asked to do tasks?", field: "sensitivity", options: [
            { v: "low", l: "Low", d: "Ask me anything, I don't mind at all" },
            { v: "medium", l: "Medium", d: "I'm fine with most asks, just be reasonable" },
            { v: "high", l: "High", d: "Please be gentle when asking me to do things" },
          ]},
          3: { title: "How to be asked", sub: "When Divvy needs you to do something, how should it phrase it?", field: "askStyle", italic: true, options: [
            { v: "direct", l: "Direct request", d: '"Take out the trash"' },
            { v: "suggestion", l: "Suggestion", d: '"The trash could use taking out"' },
            { v: "question", l: "Question", d: '"Could you take out the trash?"' },
          ]},
          4: { title: "Forgetfulness", sub: "How likely are you to forget tasks? No judgment — this helps Divvy know when to remind you.", field: "forgetfulness", options: [
            { v: "rarely", l: "Rarely", d: "I'm on top of things" },
            { v: "sometimes", l: "Sometimes", d: "Depends on the day" },
            { v: "often", l: "Often", d: "I definitely need reminders" },
          ]},
          5: { title: "Undone tasks", sub: "When tasks pile up and don't get done, how does it make you feel?", field: "undoneFeelings", options: [
            { v: "unbothered", l: "Unbothered", d: "It can wait, no stress" },
            { v: "mildly_annoyed", l: "Mildly annoyed", d: "I notice and it bugs me a little" },
            { v: "very_stressed", l: "Very stressed", d: "I really need things to get done" },
          ]},
          6: { title: "Notifications", sub: "How often should Divvy nudge you?", field: "notifFrequency", options: [
            { v: "minimal", l: "Minimal", d: "Only for urgent things" },
            { v: "moderate", l: "Moderate", d: "A healthy nudge when needed" },
            { v: "frequent", l: "Frequent", d: "Keep me in the loop on everything" },
          ]},
          7: { title: "Recognition", sub: "When someone thanks you or celebrates your contribution, how would you like to receive it?", field: "recognitionPref", options: [
            { v: "public", l: "In the household feed", d: "Everyone can see the shout-out" },
            { v: "private", l: "Privately", d: "Just between me and the person" },
            { v: "both", l: "Both", d: "Public and private — I'll take all the love" },
          ]},
        };
        const def = stepDefs[step];
        return (
          <Card>
            <h3 style={{ fontFamily: fontDisplay, fontSize: 23, fontWeight: 500, marginBottom: 6 }}>{def.title}</h3>
            <p style={{ color: C.steel, fontSize: 14, lineHeight: 1.5, marginBottom: 22 }}>{def.sub}</p>
            <p style={{ fontSize: 12, color: C.steel, marginBottom: 16, fontStyle: "italic" }}>Hold to select</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}
              onMouseEnter={() => setGroupHovered(true)}
              onMouseLeave={() => setGroupHovered(false)}
              onTouchStart={() => setGroupHovered(true)}
              onTouchEnd={() => setGroupHovered(false)}>
              {def.options.map((o) => (
                <HoldOption key={o.v} selected={profile[def.field] === o.v && !groupHovered}
                  onHoldComplete={() => { setGroupHovered(false); s(def.field)(o.v); if (isLast) onComplete({ ...profile, [def.field]: o.v }); else next(); }}>
                  <p style={{ fontWeight: 600, fontSize: 15, color: C.navy }}>{o.l}</p>
                  <p style={{ fontSize: 12, color: C.steel, marginTop: 2, fontStyle: def.italic ? "italic" : "normal" }}>{o.d}</p>
                </HoldOption>
              ))}
            </div>
          </Card>
        );
      }
      default: return null;
    }
  };

  return (
    <PageShell narrow>
      <div style={{ marginTop: 28, marginBottom: 20 }}><Logo /></div>
      <p style={{ color: C.steel, fontSize: 14, marginBottom: 24 }}>Step {step + 1} of {TOTAL}</p>
      {renderStep()}
      {step > 0 && (
        <div style={{ marginTop: 20 }}>
          <WizardNav step={step} totalSteps={TOTAL} onBack={prev} onBackToList={null} />
        </div>
      )}
    </PageShell>
  );
}
