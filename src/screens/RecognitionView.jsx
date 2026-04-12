import { useState } from "react";
import { C, font, fontDisplay } from "../constants/colors";
import { btnBase, btnPrimary, btnGhost, inputStyle, labelStyle } from "../constants/styles";
import { uid, saveData } from "../utils/storage";
import PageShell from "../components/PageShell";
import Card from "../components/Card";
import Avatar from "../components/Avatar";
import Divider from "../components/Divider";
import HoldOption from "../components/HoldOption";
import { StarIcon } from "../components/Icons";
import Header from "../components/Header";

/**
 * Recognition view — feed + send flow, extracted from Dashboard.jsx (Phase 6.1).
 * Phase 6.2: setAppData uses functional updater to prevent race conditions.
 */
export default function RecognitionView({
  appData, setAppData, currentUser,
  showToast, sendNotification, onBack,
}) {
  const [subView, setSubView] = useState("feed"); // "feed" or "send"
  const [recoStep, setRecoStep] = useState(0);
  const [recoTarget, setRecoTarget] = useState(null);
  const [recoMessage, setRecoMessage] = useState("");
  const [recoPoints, setRecoPoints] = useState(5);

  const resetRecoFlow = () => {
    setRecoTarget(null);
    setRecoMessage("");
    setRecoPoints(5);
    setRecoStep(0);
  };

  const handleSendRecognition = () => {
    if (!recoTarget || !recoMessage.trim()) return;
    const pointsVal = Math.max(0, parseInt(recoPoints) || 0);
    const recognition = {
      id: uid(), fromUserId: appData.currentUserId, toUserId: recoTarget,
      message: recoMessage.trim(), pointsAwarded: pointsVal,
      timestamp: new Date().toISOString(),
    };

    setAppData(prev => {
      const updatedUsers = prev.users.map((u) =>
        u.id === recoTarget ? { ...u, pointBalance: (u.pointBalance || 0) + pointsVal } : u
      );
      const newData = { ...prev, recognitions: [...(prev.recognitions || []), recognition], users: updatedUsers };
      saveData(newData);
      return newData;
    });

    sendNotification(recoTarget, "recognition", `${currentUser?.name} recognized you: "${recoMessage.trim()}"${pointsVal > 0 ? ` (+${pointsVal} points)` : ""}`, { recognitionId: recognition.id });
    resetRecoFlow();
    setSubView("feed");
  };

  // ── SEND RECOGNITION FLOW ──
  if (subView === "send") {
    const otherUsers = appData.users.filter((u) => u.id !== appData.currentUserId);
    const targetUser = appData.users.find((u) => u.id === recoTarget);

    return (
      <PageShell narrow topNav>
        <Header title="Send Recognition" onBack={() => { resetRecoFlow(); setSubView("feed"); }} />
        <p style={{ color: C.steel, fontSize: 14, marginBottom: 20 }}>Step {recoStep + 1} of 3</p>
        <div style={{ height: 3, background: C.mist, borderRadius: 2, marginBottom: 24, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${((recoStep + 1) / 3) * 100}%`, background: C.gradientPrimary, borderRadius: 2, transition: "width 0.4s" }} />
        </div>

        {recoStep === 0 && (
          <Card>
            <h3 style={{ fontFamily: fontDisplay, fontSize: 22, fontWeight: 500, marginBottom: 6 }}>Who deserves a shout-out?</h3>
            <p style={{ color: C.steel, fontSize: 13, marginBottom: 16 }}>Hold to select a household member.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {otherUsers.map((u) => (
                <HoldOption key={u.id} selected={false} onHoldComplete={() => { setRecoTarget(u.id); setRecoStep(1); }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <Avatar name={u.name} type={u.type} size={32} image={u.avatar} crop={u.avatarCrop} />
                    <p style={{ fontWeight: 600, fontSize: 15, color: C.dark }}>{u.name}</p>
                  </div>
                </HoldOption>
              ))}
            </div>
          </Card>
        )}

        {recoStep === 1 && targetUser && (
          <Card>
            <h3 style={{ fontFamily: fontDisplay, fontSize: 22, fontWeight: 500, marginBottom: 6 }}>
              What did {targetUser.name} do?
            </h3>
            <p style={{ color: C.steel, fontSize: 13, marginBottom: 20 }}>Celebrate something specific they did.</p>
            <textarea style={{ ...inputStyle, minHeight: 100, resize: "vertical", fontFamily: font }}
              placeholder="e.g. Thank you for taking care of dinner without being asked"
              value={recoMessage} onChange={(e) => setRecoMessage(e.target.value)} autoFocus />
            <button onClick={() => setRecoStep(2)} disabled={!recoMessage.trim()}
              style={{ ...btnPrimary, width: "100%", marginTop: 16, opacity: recoMessage.trim() ? 1 : 0.45 }}>
              Continue
            </button>
            <button onClick={() => setRecoStep(0)} style={{ ...btnGhost, width: "100%", marginTop: 4 }}>&larr; Previous</button>
          </Card>
        )}

        {recoStep === 2 && targetUser && (
          <Card>
            <h3 style={{ fontFamily: fontDisplay, fontSize: 22, fontWeight: 500, marginBottom: 6 }}>Award points</h3>
            <p style={{ color: C.steel, fontSize: 13, marginBottom: 20 }}>How many bonus points should {targetUser.name} earn?</p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 24 }}>
              <button onClick={() => setRecoPoints(Math.max(0, (parseInt(recoPoints) || 0) - 5))}
                style={{ ...btnBase, padding: "12px 20px", background: C.ice, color: C.navy, fontSize: 20, lineHeight: 1, borderRadius: 12 }}>
                &minus;
              </button>
              <input style={{ ...inputStyle, width: 90, textAlign: "center", fontSize: 28, fontWeight: 700, padding: "12px" }}
                type="number" min="0" value={recoPoints} onChange={(e) => setRecoPoints(e.target.value)} />
              <button onClick={() => setRecoPoints((parseInt(recoPoints) || 0) + 5)}
                style={{ ...btnBase, padding: "12px 20px", background: C.ice, color: C.navy, fontSize: 20, lineHeight: 1, borderRadius: 12 }}>
                +
              </button>
            </div>
            <div style={{ background: C.ice, borderRadius: 12, padding: "14px 16px", borderLeft: `3px solid ${C.sky}`, marginBottom: 20 }}>
              <p style={{ fontSize: 12, color: C.steel, marginBottom: 6 }}>Preview</p>
              <p style={{ fontSize: 14, color: C.dark, lineHeight: 1.5 }}>{recoMessage}</p>
              {recoPoints > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6 }}>
                  <StarIcon size={13} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.navy }}>+{recoPoints} points for {targetUser.name}</span>
                </div>
              )}
            </div>
            <button onClick={handleSendRecognition} style={{ ...btnPrimary, width: "100%" }}>Send recognition</button>
            <button onClick={() => setRecoStep(1)} style={{ ...btnGhost, width: "100%", marginTop: 4 }}>&larr; Previous</button>
          </Card>
        )}
      </PageShell>
    );
  }

  // ── RECOGNITION FEED ──
  const recos = [...(appData.recognitions || [])].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  return (
    <PageShell narrow topNav>
      <Header title="Recognition" onBack={onBack} />

      <button onClick={() => { resetRecoFlow(); setSubView("send"); }} style={{
        ...btnPrimary, width: "100%", marginBottom: 20,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.white} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
        </svg>
        Send a recognition
      </button>

      <Card delay={0.05}>
        <p style={{ ...labelStyle, marginBottom: 14 }}>Household Feed</p>
        {recos.length === 0 ? (
          <p style={{ color: C.steel, fontSize: 14, textAlign: "center", padding: "20px 0" }}>
            No recognitions yet. Be the first to celebrate someone.
          </p>
        ) : (
          recos.map((r, i) => {
            const from = appData.users.find((u) => u.id === r.fromUserId);
            const to = appData.users.find((u) => u.id === r.toUserId);
            const timeAgo = (() => {
              const mins = Math.floor((Date.now() - new Date(r.timestamp)) / 60000);
              if (mins < 1) return "Just now";
              if (mins < 60) return `${mins}m ago`;
              const hrs = Math.floor(mins / 60);
              if (hrs < 24) return `${hrs}h ago`;
              return `${Math.floor(hrs / 24)}d ago`;
            })();
            return (
              <div key={r.id}>
                <div style={{ padding: "14px 0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <Avatar name={from?.name} type={from?.type} size={28} image={from?.avatar} crop={from?.avatarCrop} />
                    <p style={{ fontSize: 13, color: C.steel }}>
                      <span style={{ fontWeight: 600, color: C.dark }}>{from?.name}</span>
                      {" recognized "}
                      <span style={{ fontWeight: 600, color: C.dark }}>{to?.name}</span>
                    </p>
                  </div>
                  <div style={{
                    background: C.ice, borderRadius: 12, padding: "14px 16px",
                    borderLeft: `3px solid ${C.sky}`,
                  }}>
                    <p style={{ fontSize: 14, color: C.dark, lineHeight: 1.5 }}>{r.message}</p>
                    {r.pointsAwarded > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 8 }}>
                        <StarIcon size={13} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: C.navy }}>+{r.pointsAwarded} points</span>
                      </div>
                    )}
                  </div>
                  <p style={{ fontSize: 11, color: C.steel, marginTop: 6 }}>{timeAgo}</p>
                </div>
                {i < recos.length - 1 && <Divider />}
              </div>
            );
          })
        )}
      </Card>
    </PageShell>
  );
}
