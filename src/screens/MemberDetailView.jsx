import { useState, useRef } from "react";
import { C, font } from "../constants/colors";
import { btnBase, btnPrimary, btnGhost, inputStyle, labelStyle } from "../constants/styles";
import { uid, saveData } from "../utils/storage";
import { RECIPROCAL, RELATIONSHIP_OPTIONS, propagateRelationships } from "../utils/relationships";
import { isTaskDueToday } from "../utils/taskHelpers";
import { isTaskActiveOnDate } from "../utils/calendarHelpers";
import { StarIcon } from "../components/Icons";
import PageShell from "../components/PageShell";
import Card from "../components/Card";
import Avatar from "../components/Avatar";
import Divider from "../components/Divider";
import TaskRow from "../components/TaskRow";
import SelectionBar from "../components/SelectionBar";
import TaskCompletionDialog from "../components/TaskCompletionDialog";
import { useAppData } from "../contexts/AppDataContext";

const TAG_SUGGESTIONS = {
  parent: ["Dad", "Mom", "Papa", "Mama", "Pop", "Mother", "Father"],
  child: [],
  spouse: ["Hubby", "Wifey", "Love", "Honey", "Babe"],
  partner: ["Love", "Honey", "Babe", "Partner"],
  sibling: ["Bro", "Sis", "Brother", "Sister"],
  grandparent: ["Grandpa", "Grandma", "Nana", "Papa", "Gramps", "Grammy", "Abuela", "Abuelo"],
  grandchild: [],
  roommate: [],
  other: [],
};

/**
 * MemberDetailView — the personal page for any household member.
 * Shows name/avatar, points, tasks, relationships, rewards, and history.
 *
 * Phase 6.2: All setAppData calls now use functional updater pattern
 * to prevent race conditions between rapid state updates.
 *
 * Props:
 *   appData, setAppData     – global data + setter
 *   selectedMember           – the member object being viewed
 *   currentUser              – the currently-logged-in user
 *   showToast                – toast feedback helper
 *   onBack                   – callback to go back to members list
 *   selectedTaskIds, setSelectedTaskIds – shared selection state
 *   completionDialogTasks, setCompletionDialogTasks – shared dialog state
 *   handleBulkComplete       – callback for bulk task completion
 *   taskRowProps              – spread-props for <TaskRow>
 *   selectionBarProps         – spread-props for <SelectionBar>
 */
export default function MemberDetailView({
  selectedMember, showToast, onBack,
  selectedTaskIds, setSelectedTaskIds,
  completionDialogTasks, setCompletionDialogTasks, handleBulkComplete,
  taskRowProps, selectionBarProps,
}) {
  const { appData, setAppData, currentUser, currentUserId } = useAppData();
  // ── Member-detail-only state ──
  const [showReports, setShowReports] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [newRewardName, setNewRewardName] = useState("");
  const [newRewardCost, setNewRewardCost] = useState(50);
  const [historyOpen, setHistoryOpen] = useState(null);
  const [historySelected, setHistorySelected] = useState([]);
  const [historyAutoDelete, setHistoryAutoDelete] = useState(null);
  const [avatarCropMode, setAvatarCropMode] = useState(false);
  const [cropImage, setCropImage] = useState(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const fileInputRef = useRef(null);

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCropImage(reader.result);
      setCropZoom(1);
      setCropOffset({ x: 0, y: 0 });
      setAvatarCropMode(true);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleCropSave = () => {
    if (!cropImage || !selectedMember.id) return;
    setAppData(prev => {
      const updatedUsers = prev.users.map((u) =>
        u.id === selectedMember.id ? { ...u, avatar: cropImage, avatarCrop: { zoom: cropZoom, x: cropOffset.x, y: cropOffset.y } } : u
      );
      const newData = { ...prev, users: updatedUsers };
      saveData(newData);
      return newData;
    });
    setAvatarCropMode(false);
    setCropImage(null);
    setShowAvatarPicker(false);
  };

  const handleCropCancel = () => {
    setAvatarCropMode(false);
    setCropImage(null);
  };

  const handleDeleteAvatar = () => {
    if (!selectedMember.id) return;
    setAppData(prev => {
      const updatedUsers = prev.users.map((u) =>
        u.id === selectedMember.id ? { ...u, avatar: null, avatarCrop: null } : u
      );
      const newData = { ...prev, users: updatedUsers };
      saveData(newData);
      return newData;
    });
    setShowAvatarPicker(false);
  };

  const handleEditExistingPhoto = () => {
    const member = appData.users.find((u) => u.id === selectedMember.id);
    if (member?.avatar) {
      setCropImage(member.avatar);
      setCropZoom(member.avatarCrop?.zoom || 1);
      setCropOffset({ x: member.avatarCrop?.x || 0, y: member.avatarCrop?.y || 0 });
      setAvatarCropMode(true);
    }
  };

  const onDragStart = (clientX, clientY) => {
    setDragging(true);
    dragStart.current = { x: clientX, y: clientY, ox: cropOffset.x, oy: cropOffset.y };
  };
  const onDragMove = (clientX, clientY) => {
    if (!dragging) return;
    const dx = clientX - dragStart.current.x;
    const dy = clientY - dragStart.current.y;
    setCropOffset({ x: dragStart.current.ox + dx, y: dragStart.current.oy + dy });
  };
  const onDragEnd = () => setDragging(false);

  const handleAddReward = () => {
    if (!newRewardName.trim() || !selectedMember.id) return;
    const reward = { id: uid(), name: newRewardName.trim(), pointCost: Math.max(1, parseInt(newRewardCost) || 50), assignedTo: selectedMember.id, createdBy: appData.currentUserId };
    setAppData(prev => {
      const newData = { ...prev, rewards: [...(prev.rewards || []), reward] };
      saveData(newData);
      return newData;
    });
    setNewRewardName(""); setNewRewardCost(50);
  };

  const handleDeleteReward = (rewardId) => {
    setAppData(prev => {
      const newData = { ...prev, rewards: (prev.rewards || []).filter((r) => r.id !== rewardId) };
      saveData(newData);
      return newData;
    });
  };

  const handleRedeemReward = (reward) => {
    const member = appData.users.find((u) => u.id === reward.assignedTo);
    if (!member || (member.pointBalance || 0) < reward.pointCost) {
      showToast("Not enough points to redeem this reward");
      return;
    }
    const redemption = { id: uid(), rewardId: reward.id, rewardName: reward.name, userId: reward.assignedTo, pointsSpent: reward.pointCost, timestamp: new Date().toISOString() };
    setAppData(prev => {
      // Re-check balance inside updater for safety
      const freshMember = prev.users.find((u) => u.id === reward.assignedTo);
      if (!freshMember || (freshMember.pointBalance || 0) < reward.pointCost) return prev;
      const updatedUsers = prev.users.map((u) =>
        u.id === reward.assignedTo ? { ...u, pointBalance: (u.pointBalance || 0) - reward.pointCost } : u
      );
      const newData = { ...prev, users: updatedUsers, redemptions: [...(prev.redemptions || []), redemption] };
      saveData(newData);
      return newData;
    });
    showToast(`${reward.name} redeemed for ${reward.pointCost} points`);
  };

  const setRelationshipTag = (userId, forUserId, tag) => {
    setAppData(prev => {
      const updatedUsers = prev.users.map((u) =>
        u.id === userId ? { ...u, relationshipTags: { ...(u.relationshipTags || {}), [forUserId]: tag } } : u
      );
      const newData = { ...prev, users: updatedUsers };
      saveData(newData);
      return newData;
    });
    showToast(`Tag updated to "${tag}"`);
  };

  // Get valid relationship options for fromUser → toUser
  const getValidOptions = (fromUserId, toUserId) => {
    const fromUser = appData.users.find((u) => u.id === fromUserId);
    const toUser = appData.users.find((u) => u.id === toUserId);
    if (!fromUser || !toUser) return RELATIONSHIP_OPTIONS;

    const fromRels = fromUser.relationships || {};
    const toRels = toUser.relationships || {};

    // If the other side already set theirs, only allow the reciprocal
    if (toRels[fromUserId]) {
      const required = RECIPROCAL[toRels[fromUserId]];
      if (required) return RELATIONSHIP_OPTIONS.filter((o) => o.v === required);
    }

    let valid = [...RELATIONSHIP_OPTIONS];

    // Only one spouse allowed
    const hasSpouse = Object.entries(fromRels).some(([id, r]) => r === "spouse" && id !== toUserId);
    if (hasSpouse) valid = valid.filter((o) => o.v !== "spouse");

    // Only one partner allowed
    const hasPartner = Object.entries(fromRels).some(([id, r]) => r === "partner" && id !== toUserId);
    if (hasPartner) valid = valid.filter((o) => o.v !== "partner");

    // Can't be both spouse and partner to different people
    if (hasSpouse) valid = valid.filter((o) => o.v !== "partner");
    if (hasPartner) valid = valid.filter((o) => o.v !== "spouse");

    // Context from other relationships in the household
    // If someone who is my parent is also toUser's parent → toUser is my sibling
    for (const other of appData.users) {
      if (other.id === fromUserId || other.id === toUserId) continue;
      const otherRels = other.relationships || {};
      // Same parent → must be sibling
      if (fromRels[other.id] === "child" && (otherRels[toUserId] === "parent" || toRels[other.id] === "child")) {
        return RELATIONSHIP_OPTIONS.filter((o) => o.v === "sibling");
      }
      // My spouse/partner is their parent → I'm their parent
      if ((fromRels[other.id] === "spouse" || fromRels[other.id] === "partner") && otherRels[toUserId] === "parent") {
        return RELATIONSHIP_OPTIONS.filter((o) => o.v === "parent");
      }
    }

    return valid;
  };

  const setRelationship = (fromUserId, toUserId, relationship) => {
    // Capture before-count from closure for toast (display only)
    const beforeCount = appData.users.reduce((sum, u) => sum + Object.keys(u.relationships || {}).length, 0);

    setAppData(prev => {
      let updatedUsers = prev.users.map((u) => {
        if (u.id === fromUserId) return { ...u, relationships: { ...(u.relationships || {}), [toUserId]: relationship } };
        return u;
      });

      // Propagate all inferred relationships
      updatedUsers = propagateRelationships(updatedUsers.map((u) => ({ ...u, relationships: { ...(u.relationships || {}) } })));

      const newData = { ...prev, users: updatedUsers };
      saveData(newData);

      // Count auto-set for toast
      const afterCount = updatedUsers.reduce((sum, u) => sum + Object.keys(u.relationships || {}).length, 0);
      const autoSet = afterCount - beforeCount - 1;
      if (autoSet > 0) showToast(`Relationship updated — ${autoSet} other${autoSet !== 1 ? "s" : ""} auto-filled`);
      else showToast(`Relationship updated`);

      return newData;
    });
  };

  const toggleHistorySection = (section) => {
    setHistoryOpen(historyOpen === section ? null : section);
    setHistorySelected([]);
    setHistoryAutoDelete(null);
  };

  const toggleHistoryItem = (id) => {
    setHistorySelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  };

  const deleteHistoryItems = (type, ids) => {
    setAppData(prev => {
      let newData = { ...prev };
      if (type === "sentMsg" || type === "rcvdMsg") {
        newData.notifications = (newData.notifications || []).filter((n) => !ids.includes(n.id));
      } else {
        newData.recognitions = (newData.recognitions || []).filter((r) => !ids.includes(r.id));
      }
      saveData(newData);
      return newData;
    });
    setHistorySelected([]);
    showToast(`${ids.length} item${ids.length !== 1 ? "s" : ""} deleted`);
  };

  const deleteAllHistory = (type, items) => {
    deleteHistoryItems(type, items.map((i) => i.id));
  };

  const setAutoDeletePref = (userId, section, period) => {
    setAppData(prev => {
      const updatedUsers = prev.users.map((u) =>
        u.id === userId ? { ...u, autoDelete: { ...(u.autoDelete || {}), [section]: period } } : u
      );
      const newData = { ...prev, users: updatedUsers };
      saveData(newData);
      return newData;
    });
    setHistoryAutoDelete(null);
    showToast(`Auto-delete set to ${period === "never" ? "never" : period}`);
  };


  // ── Computed values ──
  const now = new Date();
  const todayStr = now.toDateString();

  const memberTasks = appData.tasks.filter((t) => {
    if (!isTaskDueToday(t)) return false;
    if (!t.assignedTo || t.assignedTo.length === 0) return true;
    return t.assignedTo.includes(selectedMember.id);
  });

  const todayCompletions = appData.completions.filter((c) =>
    c.userId === selectedMember.id && new Date(c.timestamp).toDateString() === todayStr
  );
  const pointsToday = todayCompletions.reduce((sum, c) => sum + (c.pointsEarned || 0), 0);
  const totalPoints = selectedMember.pointBalance || 0;

  const getUpcomingTasks = () => {
    const upcoming = [];
    const memberTaskPool = appData.tasks.filter((t) => {
      if (!t.assignedTo || t.assignedTo.length === 0) return true;
      return t.assignedTo.includes(selectedMember.id);
    });
    for (let d = 1; d <= 30; d++) {
      const future = new Date(now.getTime() + d * 86400000);
      const dateStr = future.toISOString().slice(0, 10);
      const dayLabel = d === 1 ? "Tomorrow" : future.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      for (const t of memberTaskPool) {
        if (isTaskActiveOnDate(t, future) && !upcoming.find((u) => u.task.id === t.id)) {
          upcoming.push({ task: t, date: dayLabel, daysAway: d });
        }
      }
      if (upcoming.length >= 5) break;
    }
    return upcoming;
  };

  const upcomingTasks = memberTasks.length === 0 ? getUpcomingTasks() : [];

  return (
      <>
      <PageShell narrow topNav>
        <button onClick={() => { onBack(); }} style={{ ...btnGhost, padding: "4px 0", marginBottom: 16 }}>&larr; Back</button>

        {/* 1. Member Name (tappable for reports) + Avatar */}
        <Card style={{ marginBottom: 12, padding: "20px 22px" }} delay={0.05}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button onClick={() => setShowReports(!showReports)} style={{
              all: "unset", cursor: "pointer", flex: 1, display: "flex", alignItems: "center", gap: 12,
            }}>
              <h2 style={{
                fontFamily: font, fontSize: 22, fontWeight: 800, color: C.dark,
                textTransform: "uppercase", letterSpacing: "0.06em", lineHeight: 1.1,
              }}>
                {selectedMember.name}
              </h2>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.steel} strokeWidth="2.5" strokeLinecap="round"
                style={{ transition: "transform 0.2s", transform: showReports ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }}>
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {/* Clickable Avatar */}
            <button onClick={() => setShowAvatarPicker(!showAvatarPicker)} style={{
              all: "unset", cursor: "pointer", position: "relative",
            }}>
              <Avatar name={selectedMember.name} type={selectedMember.type} size={42} image={selectedMember.avatar} crop={selectedMember.avatarCrop} />
              <div style={{
                position: "absolute", bottom: -2, right: -2,
                width: 18, height: 18, borderRadius: "50%",
                background: C.white, border: `1.5px solid ${C.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.navy} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </div>
            </button>
          </div>

          {/* Avatar Picker */}
          {showAvatarPicker && !avatarCropMode && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.border}`, animation: "fadeUp 0.2s ease both" }}>
              <p style={{ ...labelStyle, marginBottom: 12 }}>Change Avatar</p>

              <input ref={fileInputRef} type="file" accept="image/*"
                onChange={handlePhotoUpload} style={{ display: "none" }} />

              {/* If photo exists: show current photo with edit/replace/delete */}
              {selectedMember.avatar ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <button onClick={handleEditExistingPhoto} style={{
                    all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 16px", borderRadius: 12, width: "100%",
                    background: "rgba(255,255,255,0.4)", border: `1.5px solid ${C.border}`,
                    transition: "all 0.2s", boxSizing: "border-box",
                  }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: C.ice, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.navy} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M3 15l4-4 4 4M14 11l3-3 4 4"/>
                      </svg>
                    </div>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 14, color: C.dark }}>Reposition photo</p>
                      <p style={{ fontSize: 12, color: C.steel }}>Adjust zoom and position</p>
                    </div>
                  </button>
                  <button onClick={() => fileInputRef.current?.click()} style={{
                    all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 16px", borderRadius: 12, width: "100%",
                    background: "rgba(255,255,255,0.4)", border: `1.5px solid ${C.border}`,
                    transition: "all 0.2s", boxSizing: "border-box",
                  }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: C.ice, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.navy} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                      </svg>
                    </div>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 14, color: C.dark }}>Replace photo</p>
                      <p style={{ fontSize: 12, color: C.steel }}>Upload a different photo</p>
                    </div>
                  </button>
                  <button onClick={handleDeleteAvatar} style={{
                    all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 16px", borderRadius: 12, width: "100%",
                    background: "rgba(192,57,43,0.04)", border: `1.5px solid rgba(192,57,43,0.15)`,
                    transition: "all 0.2s", boxSizing: "border-box",
                  }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(192,57,43,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.danger} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                      </svg>
                    </div>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 14, color: C.danger }}>Delete photo</p>
                      <p style={{ fontSize: 12, color: C.steel }}>Revert to default avatar</p>
                    </div>
                  </button>
                </div>
              ) : (
                <>
                  {/* No photo yet: upload option */}
                  <button onClick={() => fileInputRef.current?.click()} style={{
                    all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 16px", borderRadius: 12, width: "100%",
                    background: "rgba(255,255,255,0.4)", border: `1.5px solid ${C.border}`,
                    transition: "all 0.2s", marginBottom: 12, boxSizing: "border-box",
                  }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: C.ice, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.navy} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                      </svg>
                    </div>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 14, color: C.dark }}>Upload photo</p>
                      <p style={{ fontSize: 12, color: C.steel }}>Use a photo from your device</p>
                    </div>
                  </button>
                </>
              )}

              {/* Preloaded avatars */}
              <p style={{ fontSize: 12, color: C.steel, fontWeight: 600, marginBottom: 10, marginTop: 16, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Choose an avatar
              </p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {["A", "B", "C", "D", "E", "F", "G", "H"].map((letter) => (
                  <button key={letter} onClick={() => showToast("Preloaded avatars — coming soon")} style={{
                    all: "unset", cursor: "pointer",
                    width: 44, height: 44, borderRadius: "50%",
                    background: C.gradientAccent,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 700, fontSize: 16, fontFamily: font, color: C.white,
                    border: "2px solid transparent", opacity: 0.35, transition: "all 0.2s",
                  }}>
                    {letter}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: 11, color: C.steel, fontStyle: "italic", marginTop: 10 }}>
                Preloaded avatars coming soon
              </p>
            </div>
          )}

          {/* Crop Mode */}
          {avatarCropMode && cropImage && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.border}`, animation: "fadeUp 0.2s ease both" }}>
              <p style={{ ...labelStyle, marginBottom: 12 }}>Position Your Photo</p>
              <p style={{ fontSize: 12, color: C.steel, marginBottom: 16 }}>Drag to reposition. Use the slider to zoom.</p>

              {/* Crop preview */}
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                <div
                  onMouseDown={(e) => { e.preventDefault(); onDragStart(e.clientX, e.clientY); }}
                  onMouseMove={(e) => onDragMove(e.clientX, e.clientY)}
                  onMouseUp={onDragEnd}
                  onMouseLeave={onDragEnd}
                  onTouchStart={(e) => { const t = e.touches[0]; onDragStart(t.clientX, t.clientY); }}
                  onTouchMove={(e) => { const t = e.touches[0]; onDragMove(t.clientX, t.clientY); }}
                  onTouchEnd={onDragEnd}
                  style={{
                    width: 160, height: 160, borderRadius: "50%",
                    overflow: "hidden", cursor: dragging ? "grabbing" : "grab",
                    border: `3px solid ${C.sky}`,
                    boxShadow: "0 4px 24px rgba(0,0,0,0.1)",
                    position: "relative",
                  }}
                >
                  <img src={cropImage} alt="Crop preview" style={{
                    width: "100%", height: "100%", objectFit: "cover",
                    transform: `scale(${cropZoom}) translate(${cropOffset.x / cropZoom}px, ${cropOffset.y / cropZoom}px)`,
                    pointerEvents: "none", userSelect: "none",
                  }} />
                </div>
              </div>

              {/* Zoom slider */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, padding: "0 12px" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.steel} strokeWidth="2" strokeLinecap="round">
                  <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35M8 11h6"/>
                </svg>
                <input type="range" min="1" max="3" step="0.05" value={cropZoom}
                  onChange={(e) => setCropZoom(parseFloat(e.target.value))}
                  style={{ flex: 1, accentColor: C.navy }} />
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.steel} strokeWidth="2" strokeLinecap="round">
                  <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35M8 11h6M11 8v6"/>
                </svg>
              </div>

              {/* Save / Cancel */}
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={handleCropCancel} style={{ ...btnGhost, flex: 1 }}>Cancel</button>
                <button onClick={handleCropSave} style={{ ...btnPrimary, flex: 2 }}>Save</button>
              </div>
            </div>
          )}

          {/* Reports dropdown */}
          {showReports && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.border}`, animation: "fadeUp 0.2s ease both" }}>
              <p style={{ ...labelStyle, marginBottom: 10 }}>Reports</p>
              <div style={{ display: "flex", gap: 8 }}>
                {["Daily", "Weekly", "Monthly", "Yearly"].map((period) => (
                  <button key={period} onClick={() => showToast(`${period} report — coming soon`)} style={{
                    ...btnBase, padding: "10px 0", fontSize: 13, borderRadius: 10,
                    background: C.ice, color: C.navy, border: `1px solid ${C.borderLight}`,
                    flex: 1, minWidth: 0,
                  }}>
                    {period}
                  </button>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Relationships */}
        <Card style={{ marginBottom: 12, padding: "16px 22px" }} delay={0.07}>
          <p style={{ ...labelStyle, marginBottom: 12 }}>Relationships</p>
          {(() => {
            const otherUsers = appData.users.filter((u) => u.id !== selectedMember.id && u.status !== "pending");
            const memberRels = selectedMember.relationships || {};
            const isMe = selectedMember.id === appData.currentUserId;
            const isManagedByMe = selectedMember.managedBy === appData.currentUserId;
            const canEdit = isMe || isManagedByMe;

            if (otherUsers.length === 0) {
              return <p style={{ color: C.steel, fontSize: 13 }}>No other members to relate to yet.</p>;
            }

            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {otherUsers.map((u) => {
                  const rel = memberRels[u.id];
                  const missing = !rel;
                  const memberTags = selectedMember.relationshipTags || {};
                  const currentTag = memberTags[u.id];
                  const suggestions = rel ? (TAG_SUGGESTIONS[rel] || []) : [];
                  return (
                    <div key={u.id} style={{
                      padding: "12px 14px", borderRadius: 12,
                      background: missing ? "rgba(170,199,216,0.1)" : "rgba(255,255,255,0.4)",
                      border: `1.5px solid ${missing ? C.sky : C.border}`,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Avatar name={u.name} type={u.type} size={28} image={u.avatar} crop={u.avatarCrop} />
                        <span style={{ fontSize: 14, fontWeight: 600, color: C.dark, flex: 1 }}>{u.name}</span>
                        {(() => {
                          const validOpts = getValidOptions(selectedMember.id, u.id);
                          if (canEdit && validOpts.length > 1) {
                            return (
                              <select value={rel || ""} onChange={(e) => setRelationship(selectedMember.id, u.id, e.target.value)}
                                style={{
                                  ...inputStyle, width: "auto", padding: "6px 28px 6px 10px", fontSize: 12,
                                  borderRadius: 8, border: `1.5px solid ${missing ? C.sky : C.border}`,
                                  background: missing ? C.ice : "rgba(255,255,255,0.8)",
                                  fontWeight: missing ? 700 : 500, color: missing ? C.navy : C.dark,
                                  appearance: "none",
                                  backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2710%27 height=%276%27%3E%3Cpath d=%27M0 0l5 5 5-5%27 stroke=%27%23768A96%27 fill=%27none%27 stroke-width=%271.5%27/%3E%3C/svg%3E")',
                                  backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center",
                                }}>
                                <option value="">Set relationship</option>
                                {validOpts.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                              </select>
                            );
                          }
                          if (canEdit && validOpts.length === 1 && !rel) {
                            return (
                              <button onClick={() => setRelationship(selectedMember.id, u.id, validOpts[0].v)} style={{
                                ...btnBase, padding: "6px 14px", fontSize: 12, borderRadius: 8,
                                background: C.gradientPrimary, color: C.white,
                              }}>Set as {validOpts[0].l}</button>
                            );
                          }
                          return (
                            <span style={{ fontSize: 12, fontWeight: 600, color: rel ? C.navy : C.steel, background: rel ? C.ice : C.mist, padding: "4px 12px", borderRadius: 50 }}>
                              {rel ? (RELATIONSHIP_OPTIONS.find((o) => o.v === rel)?.l || rel) : "Not set"}
                            </span>
                          );
                        })()}
                      </div>

                      {/* Tag editor: how this member appears to the other person */}
                      {rel && canEdit && (
                        <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
                          <p style={{ fontSize: 10, fontWeight: 700, color: C.steel, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                            {u.name} calls me
                          </p>
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
                            {/* Suggested tags */}
                            {suggestions.map((s) => (
                              <button key={s} onClick={() => setRelationshipTag(selectedMember.id, u.id, s)} style={{
                                ...btnBase, padding: "5px 12px", fontSize: 11, borderRadius: 50,
                                background: currentTag === s ? C.gradientPrimary : C.ice,
                                color: currentTag === s ? C.white : C.navy,
                                border: `1px solid ${currentTag === s ? "transparent" : C.borderLight}`,
                              }}>{s}</button>
                            ))}
                            {/* First name option */}
                            <button onClick={() => setRelationshipTag(selectedMember.id, u.id, selectedMember.name)} style={{
                              ...btnBase, padding: "5px 12px", fontSize: 11, borderRadius: 50,
                              background: currentTag === selectedMember.name ? C.gradientPrimary : C.ice,
                              color: currentTag === selectedMember.name ? C.white : C.navy,
                              border: `1px solid ${currentTag === selectedMember.name ? "transparent" : C.borderLight}`,
                            }}>{selectedMember.name}</button>
                            {/* Custom input */}
                            <input
                              placeholder="Custom..."
                              defaultValue={currentTag && !suggestions.includes(currentTag) && currentTag !== selectedMember.name ? currentTag : ""}
                              onBlur={(e) => { if (e.target.value.trim()) setRelationshipTag(selectedMember.id, u.id, e.target.value.trim()); }}
                              onKeyDown={(e) => { if (e.key === "Enter" && e.target.value.trim()) { setRelationshipTag(selectedMember.id, u.id, e.target.value.trim()); e.target.blur(); } }}
                              style={{
                                ...inputStyle, width: 80, padding: "5px 10px", fontSize: 11,
                                borderRadius: 50, border: `1px solid ${C.borderLight}`,
                              }}
                            />
                          </div>
                          {currentTag && (
                            <p style={{ fontSize: 11, color: C.steel, marginTop: 6, fontStyle: "italic" }}>
                              Messages to {u.name} will be signed as "— {currentTag}"
                            </p>
                          )}
                        </div>
                      )}

                      {/* Show tag for non-editable view */}
                      {rel && !canEdit && currentTag && (
                        <div style={{ marginTop: 8 }}>
                          <p style={{ fontSize: 11, color: C.steel }}>
                            Known as <span style={{ fontWeight: 700, color: C.navy }}>"{currentTag}"</span> to {u.name}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </Card>

        {/* 2. Points: Today | Total */}
        <Card style={{ marginBottom: 12, padding: "24px 22px" }} delay={0.08}>
          <p style={{ ...labelStyle, marginBottom: 14 }}>Points</p>
          <div style={{ display: "flex", gap: 20 }}>
            <div style={{ flex: 1, textAlign: "center" }}>
              <span style={{ fontSize: 36, fontWeight: 800, color: C.dark, display: "block", lineHeight: 1 }}>{pointsToday}</span>
              <span style={{ fontSize: 12, color: C.steel, fontWeight: 600, marginTop: 6, display: "block", textTransform: "uppercase", letterSpacing: "0.06em" }}>today</span>
            </div>
            <div style={{ width: 1, background: C.border }} />
            <div style={{ flex: 1, textAlign: "center" }}>
              <span style={{ fontSize: 36, fontWeight: 800, color: C.dark, display: "block", lineHeight: 1 }}>{totalPoints}</span>
              <span style={{ fontSize: 12, color: C.steel, fontWeight: 600, marginTop: 6, display: "block", textTransform: "uppercase", letterSpacing: "0.06em" }}>total</span>
            </div>
          </div>
        </Card>

        {/* 3. Tasks Due Today / Upcoming Tasks */}
        <Card style={{ marginBottom: 12, padding: "16px 22px" }} delay={0.11}>
          {memberTasks.length > 0 ? (
            <>
              <p style={{ ...labelStyle, marginBottom: 10 }}>Tasks Due Today</p>
              <SelectionBar tasks={memberTasks} {...selectionBarProps} />
              {memberTasks.map((t, i) => (
                <div key={t.id}>
                  <TaskRow task={t} compact {...taskRowProps} />
                  {i < memberTasks.length - 1 && <Divider />}
                </div>
              ))}
            </>
          ) : (
            <>
              <p style={{ ...labelStyle, marginBottom: 4 }}>Tasks Due Today</p>
              <p style={{ color: C.steel, fontSize: 14, marginBottom: 14 }}>No tasks due today.</p>
              {upcomingTasks.length > 0 && (
                <>
                  <p style={{ ...labelStyle, marginBottom: 10 }}>Upcoming Tasks</p>
                  {upcomingTasks.map((u, i) => (
                    <div key={u.task.id}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0" }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.sky, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontWeight: 600, fontSize: 14, color: C.dark }}>{u.task.name}</p>
                          <p style={{ fontSize: 12, color: C.steel, marginTop: 2 }}>{u.date}</p>
                        </div>
                        {u.task.points > 0 && (
                          <span style={{ fontSize: 11, color: C.navy, fontWeight: 600 }}>{u.task.points} pts</span>
                        )}
                      </div>
                      {i < upcomingTasks.length - 1 && <Divider />}
                    </div>
                  ))}
                </>
              )}
              {upcomingTasks.length === 0 && (
                <p style={{ color: C.steel, fontSize: 13, fontStyle: "italic" }}>No upcoming tasks in the next 30 days.</p>
              )}
            </>
          )}
        </Card>

        {/* 4. Reminders / Upcoming Reminders */}
        <Card style={{ marginBottom: 12, padding: "16px 22px" }} delay={0.14}>
          <p style={{ ...labelStyle, marginBottom: 4 }}>Reminders</p>
          <p style={{ color: C.steel, fontSize: 14, marginBottom: 14 }}>No reminders for today.</p>
          <p style={{ ...labelStyle, marginBottom: 10 }}>Upcoming Reminders</p>
          <p style={{ color: C.steel, fontSize: 13, fontStyle: "italic" }}>No upcoming reminders.</p>
        </Card>

        {/* 5. Rewards & Redemption (all members) */}
        <Card style={{ marginBottom: 12, padding: "16px 22px" }} delay={0.17}>
          <p style={{ ...labelStyle, marginBottom: 12 }}>Rewards</p>
          {(() => {
            const memberRewards = (appData.rewards || []).filter((r) => r.assignedTo === selectedMember.id);
            const memberRedemptions = (appData.redemptions || []).filter((r) => r.userId === selectedMember.id);
            const canManage = appData.currentUserId === selectedMember.managedBy || appData.currentUserId === selectedMember.id;
            return (
              <>
                {memberRewards.length === 0 ? (
                  <p style={{ color: C.steel, fontSize: 14, marginBottom: 14 }}>No rewards set up yet.</p>
                ) : (
                  <div style={{ marginBottom: 14 }}>
                    {memberRewards.map((reward, i) => {
                      const canAfford = (selectedMember.pointBalance || 0) >= reward.pointCost;
                      return (
                        <div key={reward.id}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0" }}>
                            <div style={{
                              width: 36, height: 36, borderRadius: 10, background: canAfford ? C.ice : C.mist,
                              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                            }}>
                              <StarIcon size={16} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontWeight: 600, fontSize: 14, color: C.dark }}>{reward.name}</p>
                              <p style={{ fontSize: 12, color: canAfford ? C.navy : C.steel, fontWeight: 600 }}>
                                {reward.pointCost} points
                                {canAfford && <span style={{ color: C.steel, fontWeight: 400 }}> — available</span>}
                              </p>
                            </div>
                            <div style={{ display: "flex", gap: 6 }}>
                              {canAfford && (
                                <button onClick={() => handleRedeemReward(reward)} style={{
                                  ...btnBase, padding: "6px 14px", fontSize: 12, borderRadius: 8,
                                  background: C.gradientPrimary, color: C.white,
                                }}>
                                  Redeem
                                </button>
                              )}
                              {canManage && (
                                <button onClick={() => handleDeleteReward(reward.id)} style={{
                                  ...btnBase, padding: "6px 10px", fontSize: 12, borderRadius: 8,
                                  background: "rgba(192,57,43,0.06)", color: C.danger,
                                }}>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.danger} strokeWidth="2" strokeLinecap="round">
                                    <path d="M18 6L6 18M6 6l12 12"/>
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>
                          {i < memberRewards.length - 1 && <Divider />}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Add reward form */}
                {canManage && (
                  <div style={{
                    padding: "14px 16px", borderRadius: 12,
                    background: "rgba(255,255,255,0.4)", border: `1.5px solid ${C.border}`,
                  }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: C.steel, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                      Add a reward
                    </p>
                    <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                      <input style={{ ...inputStyle, flex: 1, padding: "10px 14px", fontSize: 13 }}
                        placeholder="e.g. Extra screen time"
                        value={newRewardName} onChange={(e) => setNewRewardName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddReward()} />
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: C.steel, fontWeight: 600 }}>Cost:</span>
                      <button onClick={() => setNewRewardCost(Math.max(5, newRewardCost - 25))}
                        style={{ ...btnBase, padding: "4px 10px", fontSize: 14, background: C.ice, color: C.navy, borderRadius: 8 }}>&minus;</button>
                      <span style={{ fontSize: 15, fontWeight: 700, color: C.dark, minWidth: 40, textAlign: "center" }}>{newRewardCost}</span>
                      <button onClick={() => setNewRewardCost(newRewardCost + 25)}
                        style={{ ...btnBase, padding: "4px 10px", fontSize: 14, background: C.ice, color: C.navy, borderRadius: 8 }}>+</button>
                      <span style={{ fontSize: 12, color: C.steel }}>pts</span>
                      <button onClick={handleAddReward} disabled={!newRewardName.trim()}
                        style={{ ...btnPrimary, padding: "8px 16px", fontSize: 13, marginLeft: "auto", opacity: newRewardName.trim() ? 1 : 0.45 }}>
                        Add
                      </button>
                    </div>
                  </div>
                )}

                {/* Recent redemptions */}
                {memberRedemptions.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <p style={{ ...labelStyle, marginBottom: 8 }}>Recent Redemptions</p>
                    {memberRedemptions.slice(-3).reverse().map((rd) => (
                      <div key={rd.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.sky, flexShrink: 0 }} />
                        <p style={{ fontSize: 13, color: C.steel }}>
                          <span style={{ color: C.dark, fontWeight: 600 }}>{rd.rewardName}</span>
                          {" — "}{rd.pointsSpent} pts
                          {" · "}{new Date(rd.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            );
          })()}
        </Card>

        {/* 6. Message & Recognition History */}
        {(() => {
          const sentMsgs = (appData.notifications || []).filter((n) => n.fromUserId === selectedMember.id).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
          const rcvdMsgs = (appData.notifications || []).filter((n) => n.targetUserId === selectedMember.id).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
          const sentRecos = (appData.recognitions || []).filter((r) => r.fromUserId === selectedMember.id).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
          const rcvdRecos = (appData.recognitions || []).filter((r) => r.toUserId === selectedMember.id).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
          const autoPrefs = selectedMember.autoDelete || {};

          const formatDate = (ts) => new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

          const sections = [
            { key: "sentMsg", label: "Sent Messages", icon: "M22 2L11 13M22 2l-7 20-4-9-9-4z", items: sentMsgs, nameField: "targetUserId", msgField: "rawMessage" },
            { key: "rcvdMsg", label: "Received Messages", icon: "M22 2L11 13M22 2l-7 20-4-9-9-4z", items: rcvdMsgs, nameField: "fromUserId", msgField: "message" },
            { key: "sentReco", label: "Sent Recognitions", icon: "M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z", items: sentRecos, nameField: "toUserId", msgField: "message" },
            { key: "rcvdReco", label: "Received Recognitions", icon: "M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z", items: rcvdRecos, nameField: "fromUserId", msgField: "message" },
          ];

          return sections.map((sec) => {
            const isOpen = historyOpen === sec.key;
            const selectMode = isOpen && historySelected.length > 0;
            const showAutoDelete = historyAutoDelete === sec.key;
            return (
              <Card key={sec.key} style={{ marginBottom: 12, padding: "14px 18px" }} delay={0.22}>
                <button onClick={() => toggleHistorySection(sec.key)} style={{
                  all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, width: "100%",
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.navy} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={sec.icon} />
                  </svg>
                  <span style={{ fontWeight: 600, fontSize: 14, color: C.dark, flex: 1 }}>{sec.label}</span>
                  <span style={{ fontSize: 12, color: C.steel, marginRight: 8 }}>{sec.items.length}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.steel} strokeWidth="2.5" strokeLinecap="round"
                    style={{ transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>

                {isOpen && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}`, animation: "fadeUp 0.15s ease both" }}>
                    {/* Toolbar */}
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                      {sec.items.length > 0 && (
                        <>
                          {historySelected.length > 0 && (
                            <button onClick={() => deleteHistoryItems(sec.key, historySelected)} style={{
                              ...btnBase, padding: "6px 14px", fontSize: 11, borderRadius: 8,
                              background: "rgba(192,57,43,0.06)", color: C.danger,
                            }}>Delete selected ({historySelected.length})</button>
                          )}
                          <button onClick={() => {
                            if (historySelected.length === sec.items.length) setHistorySelected([]);
                            else setHistorySelected(sec.items.map((i) => i.id));
                          }} style={{
                            ...btnBase, padding: "6px 14px", fontSize: 11, borderRadius: 8,
                            background: C.ice, color: C.navy,
                          }}>{historySelected.length === sec.items.length ? "Deselect all" : "Select all"}</button>
                          <button onClick={() => deleteAllHistory(sec.key, sec.items)} style={{
                            ...btnBase, padding: "6px 14px", fontSize: 11, borderRadius: 8,
                            background: "rgba(192,57,43,0.06)", color: C.danger,
                          }}>Delete all</button>
                        </>
                      )}
                      <button onClick={() => setHistoryAutoDelete(showAutoDelete ? null : sec.key)} style={{
                        ...btnBase, padding: "6px 14px", fontSize: 11, borderRadius: 8,
                        background: showAutoDelete ? C.navy : C.ice,
                        color: showAutoDelete ? C.white : C.navy,
                      }}>
                        Auto-delete{autoPrefs[sec.key] && autoPrefs[sec.key] !== "never" ? `: ${autoPrefs[sec.key]}` : ""}
                      </button>
                    </div>

                    {/* Auto-delete picker */}
                    {showAutoDelete && (
                      <div style={{
                        padding: "12px 14px", borderRadius: 10, background: C.ice,
                        border: `1px solid ${C.sky}`, marginBottom: 12,
                        animation: "fadeUp 0.15s ease both",
                      }}>
                        <p style={{ fontSize: 12, color: C.steel, fontWeight: 600, marginBottom: 8 }}>Auto-delete after:</p>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {[
                            { v: "never", l: "Never" },
                            { v: "7 days", l: "7 days" },
                            { v: "30 days", l: "30 days" },
                            { v: "90 days", l: "90 days" },
                            { v: "1 year", l: "1 year" },
                          ].map((opt) => (
                            <button key={opt.v} onClick={() => setAutoDeletePref(selectedMember.id, sec.key, opt.v)} style={{
                              ...btnBase, padding: "7px 14px", fontSize: 12, borderRadius: 8,
                              background: autoPrefs[sec.key] === opt.v ? C.gradientPrimary : C.white,
                              color: autoPrefs[sec.key] === opt.v ? C.white : C.navy,
                              border: `1px solid ${autoPrefs[sec.key] === opt.v ? "transparent" : C.border}`,
                            }}>{opt.l}</button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Items list */}
                    {sec.items.length === 0 ? (
                      <p style={{ color: C.steel, fontSize: 13, padding: "8px 0" }}>No items yet.</p>
                    ) : (
                      sec.items.map((item, i) => {
                        const other = appData.users.find((u) => u.id === item[sec.nameField]);
                        const isSel = historySelected.includes(item.id);
                        return (
                          <div key={item.id}>
                            <div style={{ display: "flex", gap: 10, padding: "10px 0", alignItems: "flex-start" }}>
                              <button onClick={() => toggleHistoryItem(item.id)} style={{
                                all: "unset", cursor: "pointer", flexShrink: 0, marginTop: 2,
                                width: 20, height: 20, borderRadius: 6,
                                border: `2px solid ${isSel ? C.navy : C.border}`,
                                background: isSel ? C.navy : "transparent",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                transition: "all 0.15s",
                              }}>
                                {isSel && (
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.white} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M20 6L9 17l-5-5" />
                                  </svg>
                                )}
                              </button>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                                  <Avatar name={other?.name} type={other?.type} size={18} image={other?.avatar} crop={other?.avatarCrop} />
                                  <span style={{ fontSize: 12, color: C.steel, fontWeight: 600 }}>{other?.name || "Unknown"}</span>
                                  <span style={{ fontSize: 10, color: C.steel, marginLeft: "auto" }}>{formatDate(item.timestamp)}</span>
                                </div>
                                <p style={{ fontSize: 13, color: C.dark, lineHeight: 1.4 }}>
                                  {item[sec.msgField] || item.message || item.rawMessage}
                                </p>
                                {/* Show rewritten version for sent items */}
                                {(sec.key === "sentMsg" || sec.key === "sentReco") && item.message && item.rawMessage && item.message !== item.rawMessage && (
                                  <div style={{
                                    marginTop: 6, padding: "8px 10px", borderRadius: 8,
                                    background: C.ice, borderLeft: `2px solid ${C.sky}`,
                                  }}>
                                    <p style={{ fontSize: 10, fontWeight: 700, color: C.navy, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>
                                      {other?.name} saw
                                    </p>
                                    <p style={{ fontSize: 12, color: C.dark, lineHeight: 1.4 }}>{item.message}</p>
                                  </div>
                                )}
                                {item.pointsAwarded > 0 && (
                                  <span style={{ fontSize: 11, color: C.navy, fontWeight: 700, display: "block", marginTop: 4 }}>+{item.pointsAwarded} pts</span>
                                )}
                              </div>
                            </div>
                            {i < sec.items.length - 1 && <Divider />}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </Card>
            );
          });
        })()}
      </PageShell>
      {completionDialogTasks && (
        <TaskCompletionDialog
          tasks={completionDialogTasks}
          users={appData.users}
          currentUserId={appData.currentUserId}
          onConfirm={handleBulkComplete}
          onCancel={() => { setCompletionDialogTasks(null); }}
        />
      )}
      </>
    );
}
