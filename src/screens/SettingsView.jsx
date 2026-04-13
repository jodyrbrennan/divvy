import { useState } from "react";
import { C, font } from "../constants/colors";
import { btnBase, btnPrimary, btnGhost, btnSecondary, inputStyle, labelStyle } from "../constants/styles";
import { saveData } from "../utils/storage";
import { COMM_PROFILE_FIELDS } from "../constants/communicationOptions";
import { useDebouncedSave } from "../utils/useDebouncedSave";
import PageShell from "../components/PageShell";
import Card from "../components/Card";
import Avatar from "../components/Avatar";
import Header from "../components/Header";

// Phase 7.1: Use context instead of props for app data
import { useAppData } from "../contexts/AppDataContext";

/**
 * Settings view — extracted from Dashboard.jsx (Phase 6.1).
 * Phase 7.1: Now uses useAppData() context instead of receiving appData/setAppData/currentUser as props.
 */
export default function SettingsView({ showToast, onBack }) {
  // Phase 7.1: Pull data from context
  const { appData, setAppData, currentUser } = useAppData();

  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState("");
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const { debouncedSave } = useDebouncedSave(500);

  const currentUserId = appData.currentUserId;
  const commProfile = currentUser?.communicationProfile || {};
  const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const userTimezone = currentUser?.timezone || detectedTimezone;

  // Head of household: the user who created the household, or fallback to first user
  const headOfHouseholdId = appData.household?.createdBy || appData.users[0]?.id;
  const isHeadOfHousehold = currentUserId === headOfHouseholdId;

  // Delete a member and clean up all references to them
  const handleDeleteMember = (userId) => {
    const userToDelete = appData.users.find((u) => u.id === userId);
    if (!userToDelete) return;

    setAppData((prev) => {
      // Remove the user
      const updatedUsers = prev.users
        .filter((u) => u.id !== userId)
        .map((u) => {
          // Clean up relationship references
          const rels = { ...(u.relationships || {}) };
          delete rels[userId];
          const tags = { ...(u.relationshipTags || {}) };
          delete tags[userId];
          return { ...u, relationships: rels, relationshipTags: tags };
        });

      // Remove from task assignments
      const updatedTasks = prev.tasks.map((t) => ({
        ...t,
        assignedTo: (t.assignedTo || []).filter((id) => id !== userId),
        rotation: (t.rotation || []).filter((r) => r.userId !== userId),
      }));

      // Remove their completions
      const updatedCompletions = (prev.completions || []).filter((c) => c.userId !== userId);

      // Remove their recognitions (sent and received)
      const updatedRecognitions = (prev.recognitions || []).filter(
        (r) => r.fromUserId !== userId && r.toUserId !== userId
      );

      // Remove notifications targeting or from them
      const updatedNotifications = (prev.notifications || []).filter(
        (n) => n.targetUserId !== userId && n.fromUserId !== userId
      );

      // Remove their rewards and redemptions
      const updatedRewards = (prev.rewards || []).filter((r) => r.assignedTo !== userId);
      const updatedRedemptions = (prev.redemptions || []).filter((r) => r.userId !== userId);

      // Remove from event linked members
      const updatedEvents = (prev.events || []).map((e) => ({
        ...e,
        linkedMembers: (e.linkedMembers || []).filter((id) => id !== userId),
      }));

      const newData = {
        ...prev,
        users: updatedUsers,
        tasks: updatedTasks,
        completions: updatedCompletions,
        recognitions: updatedRecognitions,
        notifications: updatedNotifications,
        rewards: updatedRewards,
        redemptions: updatedRedemptions,
        events: updatedEvents,
      };
      saveData(newData);
      return newData;
    });

    setConfirmDeleteId(null);
    showToast(`${userToDelete.name} has been removed from the household`);
  };

  const handleUpdateName = (newName) => {
    if (!newName.trim()) return;
    setAppData(prev => {
      const updatedUsers = prev.users.map((u) =>
        u.id === prev.currentUserId ? { ...u, name: newName.trim() } : u
      );
      const newData = { ...prev, users: updatedUsers };
      saveData(newData);
      return newData;
    });
    setEditingName(false);
    showToast("Name updated");
  };

  const handleUpdateTimezone = (tz) => {
    setAppData(prev => {
      const updatedUsers = prev.users.map((u) =>
        u.id === prev.currentUserId ? { ...u, timezone: tz } : u
      );
      const newData = { ...prev, users: updatedUsers };
      saveData(newData);
      return newData;
    });
    showToast(`Time zone set to ${tz}`);
  };

  const handleUpdateCommPref = (key, value) => {
    setAppData((prev) => {
      const newData = {
        ...prev,
        users: prev.users.map((u) =>
          u.id === prev.currentUserId ? { ...u, communicationProfile: { ...(u.communicationProfile || {}), [key]: value } } : u
        ),
      };
      debouncedSave(newData);
      return newData;
    });
  };

  return (
    <PageShell narrow topNav>
      <Header title="Settings" onBack={onBack} />

      {/* Account */}
      <Card style={{ marginBottom: 12 }} delay={0.05}>
        <p style={{ ...labelStyle, marginBottom: 14 }}>Account</p>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
          <Avatar name={currentUser?.name} type={currentUser?.type} size={48} image={currentUser?.avatar} crop={currentUser?.avatarCrop} />
          <div style={{ flex: 1 }}>
            {editingName ? (
              <div style={{ display: "flex", gap: 8 }}>
                <input style={{ ...inputStyle, flex: 1, padding: "8px 12px", fontSize: 14 }}
                  value={tempName} onChange={(e) => setTempName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleUpdateName(tempName)}
                  autoFocus />
                <button onClick={() => handleUpdateName(tempName)}
                  style={{ ...btnPrimary, padding: "8px 16px", fontSize: 13 }}>Save</button>
                <button onClick={() => setEditingName(false)}
                  style={{ ...btnGhost, padding: "8px 12px", fontSize: 13 }}>Cancel</button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <p style={{ fontWeight: 700, fontSize: 18, color: C.dark }}>{currentUser?.name}</p>
                <button onClick={() => { setTempName(currentUser?.name || ""); setEditingName(true); }}
                  style={{ ...btnBase, padding: "4px 12px", fontSize: 11, borderRadius: 8, background: C.ice, color: C.navy }}>
                  Edit
                </button>
              </div>
            )}
            <p style={{ fontSize: 12, color: C.steel, marginTop: 4 }}>{currentUser?.type === "dependent" ? "Restricted member" : "Full member"}</p>
          </div>
        </div>
      </Card>

      {/* Household */}
      <Card style={{ marginBottom: 12 }} delay={0.08}>
        <p style={{ ...labelStyle, marginBottom: 14 }}>Household</p>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <p style={{ fontSize: 12, color: C.steel, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Name</p>
            <p style={{ fontSize: 16, fontWeight: 600, color: C.dark, marginTop: 2 }}>{appData.household?.name || "—"}</p>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: 12, color: C.steel, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Invite code</p>
            <p style={{ fontSize: 20, fontWeight: 700, color: C.navy, marginTop: 2, letterSpacing: "0.15em", fontFamily: "monospace" }}>
              {appData.household?.inviteCode || "—"}
            </p>
          </div>
          <button onClick={() => {
            navigator.clipboard?.writeText(appData.household?.inviteCode || "");
            showToast("Invite code copied");
          }} style={{ ...btnBase, padding: "8px 16px", fontSize: 12, borderRadius: 8, background: C.ice, color: C.navy }}>
            Copy
          </button>
        </div>
        <p style={{ fontSize: 11, color: C.steel, marginTop: 8 }}>
          {appData.users.length} member{appData.users.length !== 1 ? "s" : ""} in household
        </p>
      </Card>

      {/* Manage Members — only visible to head of household */}
      {isHeadOfHousehold && (
        <Card style={{ marginBottom: 12 }} delay={0.09}>
          <p style={{ ...labelStyle, marginBottom: 14 }}>Manage Members</p>
          <p style={{ fontSize: 12, color: C.steel, marginBottom: 14 }}>
            As head of household, you can remove members. This will delete their tasks, points, recognitions, and all associated data.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {appData.users.filter((u) => u.id !== currentUserId).map((user) => {
              const isConfirming = confirmDeleteId === user.id;
              return (
                <div key={user.id} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 14px", borderRadius: 12,
                  background: isConfirming ? "rgba(192,57,43,0.04)" : "rgba(223,235,246,0.25)",
                  border: `1px solid ${isConfirming ? "rgba(192,57,43,0.2)" : C.borderLight}`,
                  transition: "all 0.2s",
                }}>
                  <Avatar name={user.name} type={user.type} size={32} image={user.avatar} crop={user.avatarCrop} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: 14, color: C.dark }}>{user.name}</p>
                    <p style={{ fontSize: 11, color: C.steel }}>
                      {user.type === "dependent" ? "Restricted" : "Member"}
                      {user.status === "pending" ? " (pending)" : ""}
                    </p>
                  </div>
                  {!isConfirming ? (
                    <button onClick={() => setConfirmDeleteId(user.id)} style={{
                      ...btnBase, padding: "6px 14px", fontSize: 11, borderRadius: 8,
                      background: "rgba(192,57,43,0.06)", color: C.danger,
                    }}>Remove</button>
                  ) : (
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => setConfirmDeleteId(null)} style={{
                        ...btnBase, padding: "6px 12px", fontSize: 11, borderRadius: 8,
                        background: C.ice, color: C.steel,
                      }}>Cancel</button>
                      <button onClick={() => handleDeleteMember(user.id)} style={{
                        ...btnBase, padding: "6px 12px", fontSize: 11, borderRadius: 8,
                        background: C.danger, color: C.white,
                      }}>Confirm</button>
                    </div>
                  )}
                </div>
              );
            })}
            {appData.users.length <= 1 && (
              <p style={{ fontSize: 13, color: C.steel, fontStyle: "italic", padding: "8px 0" }}>No other members to manage.</p>
            )}
          </div>
        </Card>
      )}

      {/* DEV: Delete any member (always visible, bypasses head-of-household check) */}
      {!isHeadOfHousehold && (
        <Card style={{ marginBottom: 12, border: "2px dashed rgba(192,57,43,0.3)", background: "rgba(192,57,43,0.03)" }} delay={0.09}>
          <p style={{ fontSize: 10, fontWeight: 700, color: C.danger, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Dev — Manage Members</p>
          <p style={{ fontSize: 12, color: C.steel, marginBottom: 14 }}>
            Dev override: remove any member regardless of head-of-household status.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {appData.users.filter((u) => u.id !== currentUserId).map((user) => {
              const isConfirming = confirmDeleteId === user.id;
              const isHead = user.id === headOfHouseholdId;
              return (
                <div key={user.id} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 14px", borderRadius: 10,
                  background: isConfirming ? "rgba(192,57,43,0.06)" : "transparent",
                  border: `1.5px solid ${isConfirming ? "rgba(192,57,43,0.2)" : C.border}`,
                  transition: "all 0.2s",
                }}>
                  <Avatar name={user.name} type={user.type} size={28} image={user.avatar} crop={user.avatarCrop} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <p style={{ fontWeight: 600, fontSize: 13, color: C.dark }}>{user.name}</p>
                      {isHead && <span style={{ fontSize: 9, fontWeight: 700, color: C.navy, background: C.ice, padding: "2px 6px", borderRadius: 50, textTransform: "uppercase", letterSpacing: "0.06em" }}>Head</span>}
                    </div>
                  </div>
                  {!isConfirming ? (
                    <button onClick={() => setConfirmDeleteId(user.id)} style={{
                      ...btnBase, padding: "5px 12px", fontSize: 11, borderRadius: 8,
                      background: "rgba(192,57,43,0.06)", color: C.danger,
                    }}>Remove</button>
                  ) : (
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => setConfirmDeleteId(null)} style={{
                        ...btnBase, padding: "5px 10px", fontSize: 11, borderRadius: 8,
                        background: C.ice, color: C.steel,
                      }}>Cancel</button>
                      <button onClick={() => handleDeleteMember(user.id)} style={{
                        ...btnBase, padding: "5px 10px", fontSize: 11, borderRadius: 8,
                        background: C.danger, color: C.white,
                      }}>Confirm</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Time Zone */}
      <Card style={{ marginBottom: 12 }} delay={0.11}>
        <p style={{ ...labelStyle, marginBottom: 14 }}>Time Zone</p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: C.dark }}>{userTimezone}</p>
            <p style={{ fontSize: 11, color: C.steel, marginTop: 2 }}>
              {currentUser?.timezone ? "Manually set" : "Auto-detected"}
            </p>
          </div>
          {currentUser?.timezone && (
            <button onClick={() => handleUpdateTimezone(null)}
              style={{ ...btnBase, padding: "6px 14px", fontSize: 11, borderRadius: 8, background: C.ice, color: C.navy }}>
              Reset to auto
            </button>
          )}
        </div>
        <select value={userTimezone}
          onChange={(e) => handleUpdateTimezone(e.target.value)}
          style={{ ...inputStyle, marginTop: 12, fontSize: 13, appearance: "none",
            backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2710%27 height=%276%27%3E%3Cpath d=%27M0 0l5 5 5-5%27 stroke=%27%23768A96%27 fill=%27none%27 stroke-width=%271.5%27/%3E%3C/svg%3E")',
            backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center",
          }}>
          {Intl.supportedValuesOf?.("timeZone")?.map((tz) => (
            <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>
          )) || (
            ["America/New_York","America/Chicago","America/Denver","America/Los_Angeles","America/Phoenix",
             "America/Anchorage","Pacific/Honolulu","Europe/London","Europe/Paris","Europe/Berlin",
             "Asia/Tokyo","Asia/Shanghai","Australia/Sydney","America/Sao_Paulo","America/Toronto"
            ].map((tz) => <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>)
          )}
        </select>
      </Card>

      {/* Communication Preferences */}
      <Card style={{ marginBottom: 12 }} delay={0.14}>
        <p style={{ ...labelStyle, marginBottom: 14 }}>Communication Preferences</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {COMM_PROFILE_FIELDS.map((fieldDef) => (
            <div key={fieldDef.field}>
              <p style={{ fontSize: 12, color: C.steel, fontWeight: 600, marginBottom: 6 }}>{fieldDef.settingsLabel}</p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {fieldDef.options.map((opt) => {
                  const isActive = commProfile[fieldDef.field] === opt.v;
                  return (
                    <button key={opt.v} onClick={() => handleUpdateCommPref(fieldDef.field, opt.v)} style={{
                      ...btnBase, padding: "7px 14px", fontSize: 12, borderRadius: 50,
                      background: isActive ? C.gradientPrimary : C.ice,
                      color: isActive ? C.white : C.navy,
                      border: `1px solid ${isActive ? "transparent" : C.borderLight}`,
                      fontWeight: isActive ? 700 : 500,
                    }}>{opt.l}</button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Sign Out */}
      <Card style={{ marginBottom: 12 }} delay={0.17}>
        {!confirmSignOut ? (
          <button onClick={() => setConfirmSignOut(true)} style={{
            all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
            width: "100%", padding: "14px 0",
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.danger} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            <span style={{ fontSize: 15, fontWeight: 600, color: C.danger }}>Sign out</span>
          </button>
        ) : (
          <div style={{ animation: "fadeUp 0.15s ease both" }}>
            <p style={{ fontSize: 14, color: C.dark, fontWeight: 600, marginBottom: 4 }}>Sign out of this device?</p>
            <p style={{ fontSize: 13, color: C.steel, marginBottom: 14 }}>Your data is saved. You can sign back in with the invite code.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmSignOut(false)}
                style={{ ...btnSecondary, flex: 1 }}>Cancel</button>
              <button onClick={() => {
                localStorage.removeItem('divvy-current-user');
                window.location.reload();
              }} style={{
                ...btnBase, flex: 1, padding: "12px 20px", borderRadius: 12,
                background: C.danger, color: C.white, fontWeight: 600,
              }}>Sign out</button>
            </div>
          </div>
        )}
      </Card>

      {/* About */}
      <Card style={{ marginBottom: 12 }} delay={0.2}>
        <p style={{ ...labelStyle, marginBottom: 10 }}>About</p>
        <p style={{ fontSize: 13, color: C.steel }}>Divvy v2.0</p>
        <p style={{ fontSize: 12, color: C.steel, marginTop: 4 }}>Split the work. Share the load.</p>
      </Card>
    </PageShell>
  );
}
