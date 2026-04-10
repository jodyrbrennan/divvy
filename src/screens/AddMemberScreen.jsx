import { useState } from "react";
import { C, font, fontDisplay } from "../constants/colors";
import { btnPrimary, btnGhost, inputStyle, labelStyle } from "../constants/styles";
import { makeInviteCode } from "../utils/storage";
import { RECIPROCAL } from "../utils/relationships";
import PageShell from "../components/PageShell";
import Card from "../components/Card";
import HoldOption from "../components/HoldOption";

export default function AddMemberScreen({ onComplete, onBack }) {
  const [mode, setMode] = useState("choose");
  const [name, setName] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [rStep, setRStep] = useState(0);
  const [rGroupHovered, setRGroupHovered] = useState(false);
  const [rProfile, setRProfile] = useState({
    tone: "casual", sensitivity: "medium", forgetfulness: "sometimes",
    undoneFeelings: "unbothered", askStyle: "direct",
    notifFrequency: "moderate", recognitionPref: "public",
  });
  const rSet = (key) => (val) => setRProfile((p) => ({ ...p, [key]: val }));

  const handleAddUser = () => {
    if (!name.trim()) return;
    const code = makeInviteCode();
    setGeneratedCode(code);
    onComplete({
      name: name.trim(),
      type: "full",
      status: "pending",
      inviteCode: code,
    });
    setMode("inviteResult");
  };

  const handleAddRestricted = () => {
    if (!name.trim()) return;
    setRStep(0);
    setMode("restrictedSetup");
  };

  const handleFinishRestricted = (finalProfile, relationship) => {
    const reciprocal = RECIPROCAL;
    const relationships = {};
    if (relationship) relationships["__creator__"] = reciprocal[relationship] || relationship;
    onComplete({
      name: name.trim(),
      type: "dependent",
      status: "active",
      communicationProfile: finalProfile,
      relationships,
      creatorRelationship: relationship,
    });
  };

  const copyCode = () => {
    navigator.clipboard.writeText(generatedCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <PageShell narrow topNav>
      {mode !== "inviteResult" && mode !== "restrictedSetup" && (
        <button onClick={mode === "choose" ? onBack : () => setMode("choose")} style={btnGhost}>
          &larr; {mode === "choose" ? "Back" : "Back to options"}
        </button>
      )}

      {mode === "choose" && (
        <>
          <h2 style={{ fontFamily: fontDisplay, fontSize: 28, fontWeight: 500, margin: "20px 0 8px" }}>
            Add a member
          </h2>
          <p style={{ color: C.steel, fontSize: 15, lineHeight: 1.55, marginBottom: 24 }}>
            What type of member are you adding?
          </p>
          <p style={{ fontSize: 12, color: C.steel, marginBottom: 16, fontStyle: "italic" }}>Hold to select</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <HoldOption selected={false} onHoldComplete={() => setMode("user")}>
              <p style={{ fontWeight: 600, fontSize: 16, color: C.dark, marginBottom: 4 }}>Add User</p>
              <p style={{ fontSize: 13, color: C.steel, lineHeight: 1.5 }}>
                A member with their own login access. They'll set up their own profile and preferences. Use this for your spouse, older children with their own phone, or roommates.
              </p>
            </HoldOption>
            <HoldOption selected={false} onHoldComplete={() => setMode("restricted")}>
              <p style={{ fontWeight: 600, fontSize: 16, color: C.dark, marginBottom: 4 }}>Add Restricted User</p>
              <p style={{ fontSize: 13, color: C.steel, lineHeight: 1.5 }}>
                A member without their own login. You'll manage their tasks, points, and rewards from your account. Use this for young children or anyone who doesn't need app access.
              </p>
            </HoldOption>
          </div>
        </>
      )}

      {mode === "user" && (
        <>
          <h2 style={{ fontFamily: fontDisplay, fontSize: 28, fontWeight: 500, margin: "20px 0 8px" }}>
            Add a new user
          </h2>
          <p style={{ color: C.steel, fontSize: 15, lineHeight: 1.55, marginBottom: 32 }}>
            They'll receive an invite code to join the household and set up their own profile.
          </p>
          <Card>
            <label style={labelStyle}>Their name</label>
            <input style={inputStyle} placeholder="First name" value={name}
              onChange={(e) => setName(e.target.value)} autoFocus />
            <button onClick={handleAddUser} disabled={!name.trim()}
              style={{ ...btnPrimary, width: "100%", marginTop: 22, opacity: name.trim() ? 1 : 0.45 }}>
              Add Member
            </button>
          </Card>
        </>
      )}

      {mode === "restricted" && (
        <>
          <h2 style={{ fontFamily: fontDisplay, fontSize: 28, fontWeight: 500, margin: "20px 0 8px" }}>
            Add a restricted user
          </h2>
          <p style={{ color: C.steel, fontSize: 15, lineHeight: 1.55, marginBottom: 32 }}>
            They won't need their own login — you'll manage their tasks and rewards from your account.
          </p>
          <Card>
            <label style={labelStyle}>Their name</label>
            <input style={inputStyle} placeholder="First name" value={name}
              onChange={(e) => setName(e.target.value)} autoFocus />
            <button onClick={handleAddRestricted} disabled={!name.trim()}
              style={{ ...btnPrimary, width: "100%", marginTop: 22, opacity: name.trim() ? 1 : 0.45 }}>
              Add Restricted Member
            </button>
          </Card>
        </>
      )}

      {mode === "restrictedSetup" && (() => {
        const TOTAL = 8;
        const rStepDefs = [
          { title: "Preferred tone", sub: `How should Divvy sound when talking to ${name.trim()}?`, field: "tone", options: [
            { v: "casual", l: "Casual", d: "Relaxed and friendly" },
            { v: "direct", l: "Direct", d: "Straight to the point" },
            { v: "gentle", l: "Gentle", d: "Soft and considerate" },
            { v: "humorous", l: "Humorous", d: "Light-hearted with fun" },
          ]},
          { title: "Task sensitivity", sub: `How sensitive is ${name.trim()} to being asked to do tasks?`, field: "sensitivity", options: [
            { v: "low", l: "Low", d: "Doesn't mind at all" },
            { v: "medium", l: "Medium", d: "Fine with most asks" },
            { v: "high", l: "High", d: "Needs gentle phrasing" },
          ]},
          { title: "How to be asked", sub: `When Divvy needs ${name.trim()} to do something, how should it phrase it?`, field: "askStyle", italic: true, options: [
            { v: "direct", l: "Direct request", d: '"Take out the trash"' },
            { v: "suggestion", l: "Suggestion", d: '"The trash could use taking out"' },
            { v: "question", l: "Question", d: '"Could you take out the trash?"' },
          ]},
          { title: "Forgetfulness", sub: `How likely is ${name.trim()} to forget tasks?`, field: "forgetfulness", options: [
            { v: "rarely", l: "Rarely", d: "On top of things" },
            { v: "sometimes", l: "Sometimes", d: "Depends on the day" },
            { v: "often", l: "Often", d: "Definitely needs reminders" },
          ]},
          { title: "Undone tasks", sub: `When tasks pile up, how does ${name.trim()} feel?`, field: "undoneFeelings", options: [
            { v: "unbothered", l: "Unbothered", d: "It can wait, no stress" },
            { v: "mildly_annoyed", l: "Mildly annoyed", d: "Notices and it bugs them" },
            { v: "very_stressed", l: "Very stressed", d: "Really needs things done" },
          ]},
          { title: "Notifications", sub: `How often should Divvy nudge ${name.trim()}?`, field: "notifFrequency", options: [
            { v: "minimal", l: "Minimal", d: "Only urgent things" },
            { v: "moderate", l: "Moderate", d: "A healthy nudge when needed" },
            { v: "frequent", l: "Frequent", d: "Keep them in the loop" },
          ]},
          { title: "Recognition", sub: `When someone celebrates ${name.trim()}'s contribution, how should they receive it?`, field: "recognitionPref", options: [
            { v: "public", l: "In the household feed", d: "Everyone can see the shout-out" },
            { v: "private", l: "Privately", d: "Just between sender and them" },
            { v: "both", l: "Both", d: "Public and private" },
          ]},
        ];

        const isRelationshipStep = rStep === TOTAL - 1;
        const def = rStepDefs[rStep];

        return (
          <>
            <p style={{ color: C.steel, fontSize: 14, marginBottom: 8 }}>
              Setting up {name.trim()}'s profile — Step {rStep + 1} of {TOTAL}
            </p>
            <div style={{ height: 3, background: C.mist, borderRadius: 2, marginBottom: 20, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${((rStep + 1) / TOTAL) * 100}%`, background: C.gradientPrimary, borderRadius: 2, transition: "width 0.4s" }} />
            </div>

            {!isRelationshipStep && def && (
              <Card>
                <h3 style={{ fontFamily: fontDisplay, fontSize: 23, fontWeight: 500, marginBottom: 6 }}>{def.title}</h3>
                <p style={{ color: C.steel, fontSize: 14, lineHeight: 1.5, marginBottom: 22 }}>{def.sub}</p>
                <p style={{ fontSize: 12, color: C.steel, marginBottom: 16, fontStyle: "italic" }}>Hold to select</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}
                  onMouseEnter={() => setRGroupHovered(true)}
                  onMouseLeave={() => setRGroupHovered(false)}
                  onTouchStart={() => setRGroupHovered(true)}
                  onTouchEnd={() => setRGroupHovered(false)}>
                  {def.options.map((o) => (
                    <HoldOption key={o.v} selected={rProfile[def.field] === o.v && !rGroupHovered}
                      onHoldComplete={() => {
                        setRGroupHovered(false);
                        rSet(def.field)(o.v);
                        setRStep(rStep + 1);
                      }}>
                      <p style={{ fontWeight: 600, fontSize: 15, color: C.navy }}>{o.l}</p>
                      <p style={{ fontSize: 12, color: C.steel, marginTop: 2, fontStyle: def.italic ? "italic" : "normal" }}>{o.d}</p>
                    </HoldOption>
                  ))}
                </div>
              </Card>
            )}

            {isRelationshipStep && (
              <Card>
                <h3 style={{ fontFamily: fontDisplay, fontSize: 23, fontWeight: 500, marginBottom: 6 }}>Relationship</h3>
                <p style={{ color: C.steel, fontSize: 14, lineHeight: 1.5, marginBottom: 22 }}>
                  How are you related to {name.trim()}?
                </p>
                <p style={{ fontSize: 12, color: C.steel, marginBottom: 16, fontStyle: "italic" }}>Hold to select</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}
                  onMouseEnter={() => setRGroupHovered(true)}
                  onMouseLeave={() => setRGroupHovered(false)}
                  onTouchStart={() => setRGroupHovered(true)}
                  onTouchEnd={() => setRGroupHovered(false)}>
                  {[
                    { v: "spouse", l: "Spouse", d: "Married partner" },
                    { v: "partner", l: "Partner", d: "Unmarried partner" },
                    { v: "parent", l: "I'm their parent", d: "They are my child" },
                    { v: "child", l: "I'm their child", d: "They are my parent" },
                    { v: "sibling", l: "Sibling", d: "Brother or sister" },
                    { v: "roommate", l: "Roommate", d: "We share a living space" },
                    { v: "grandparent", l: "I'm their grandparent", d: "They are my grandchild" },
                    { v: "grandchild", l: "I'm their grandchild", d: "They are my grandparent" },
                    { v: "other", l: "Other", d: "Another type of relationship" },
                  ].map((o) => (
                    <HoldOption key={o.v} selected={false}
                      onHoldComplete={() => {
                        setRGroupHovered(false);
                        handleFinishRestricted(rProfile, o.v);
                      }}>
                      <p style={{ fontWeight: 600, fontSize: 15, color: C.navy }}>{o.l}</p>
                      <p style={{ fontSize: 12, color: C.steel, marginTop: 2 }}>{o.d}</p>
                    </HoldOption>
                  ))}
                </div>
              </Card>
            )}

            {rStep > 0 && (
              <button onClick={() => { setRStep(rStep - 1); setRGroupHovered(false); }} style={{ ...btnGhost, marginTop: 16 }}>
                &larr; Previous
              </button>
            )}
            {rStep === 0 && (
              <button onClick={() => setMode("restricted")} style={{ ...btnGhost, marginTop: 16 }}>
                &larr; Back
              </button>
            )}
          </>
        );
      })()}

      {mode === "inviteResult" && (
        <>
          <h2 style={{ fontFamily: fontDisplay, fontSize: 28, fontWeight: 500, margin: "20px 0 8px" }}>
            {name} has been added
          </h2>
          <p style={{ color: C.steel, fontSize: 15, lineHeight: 1.55, marginBottom: 32 }}>
            Share the invite code and instructions below so they can join the household and finish setting up their profile.
          </p>
          <Card style={{ textAlign: "center", marginBottom: 16 }}>
            <p style={{ ...labelStyle, marginBottom: 14 }}>Invite code for {name}</p>
            <div onClick={copyCode} style={{
              fontSize: 36, fontWeight: 700, letterSpacing: "0.25em", fontFamily: font, color: C.dark,
              background: C.gradientSubtle, border: `1.5px solid ${C.borderLight}`, borderRadius: 14,
              padding: "20px 28px", cursor: "pointer", userSelect: "all", marginBottom: 8,
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)",
            }}>
              {generatedCode}
            </div>
            <p style={{ fontSize: 13, color: C.steel, marginBottom: 20 }}>
              {copied ? "Copied to clipboard" : "Tap to copy"}
            </p>
          </Card>
          <Card style={{ marginBottom: 16 }}>
            <p style={{ ...labelStyle, marginBottom: 12 }}>Instructions for {name}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                `Open the Divvy app and tap "Join an existing household"`,
                <>Enter the invite code: <span style={{ fontWeight: 700, letterSpacing: "0.08em" }}>{generatedCode}</span></>,
                "Follow the prompts to set up their profile and communication preferences",
              ].map((text, i) => (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%", background: C.gradientPrimary,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: C.white, fontWeight: 700, fontSize: 13, flexShrink: 0,
                  }}>{i + 1}</div>
                  <p style={{ fontSize: 14, color: C.dark, lineHeight: 1.5 }}>{text}</p>
                </div>
              ))}
            </div>
          </Card>
          <button onClick={onBack} style={{ ...btnPrimary, width: "100%" }}>
            Back to dashboard
          </button>
        </>
      )}
    </PageShell>
  );
}
