import { C } from "../constants/colors";
import { btnBase, btnGhost } from "../constants/styles";
import { saveData } from "../utils/storage";
import { isTaskDueToday } from "../utils/taskHelpers";
import PageShell from "../components/PageShell";
import Card from "../components/Card";
import Avatar from "../components/Avatar";
import Divider from "../components/Divider";
import Header from "../components/Header";

/**
 * Notifications view — extracted from Dashboard.jsx (Phase 6.1).
 * Phase 6.2: setAppData uses functional updater to prevent race conditions.
 *
 * Props:
 *   appData, setAppData — app state
 *   currentUser — the logged-in user object
 *   showToast — toast notification function
 *   sendNotification — sends a user notification through the approval flow
 *   sendDirectNotification — sends a notification bypassing approval
 *   onBack — navigate back to hub
 */
export default function NotificationsView({
  appData, setAppData, currentUser,
  showToast, sendNotification, sendDirectNotification, onBack,
}) {
  const myNotifs = (appData.notifications || [])
    .filter((n) => n.targetUserId === appData.currentUserId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // Mark a notification as actioned (using functional updater)
  const markActioned = (notifId) => {
    setAppData(prev => {
      const updNotifs = (prev.notifications || []).map((notif) =>
        notif.id === notifId ? { ...notif, actioned: true } : notif
      );
      const newData = { ...prev, notifications: updNotifs };
      saveData(newData);
      return newData;
    });
  };

  // Handle "Send thanks" button
  const handleSendThanks = (n, actionTargetId) => {
    const taskName = appData.tasks.find((t) => t.id === n.taskId)?.name || "the task";
    const msg = `Thank you for completing "${taskName}" for me!`;
    sendNotification(actionTargetId, "recognition", msg, {});
    markActioned(n.id);
  };

  // Handle "Take a task back" button
  const handleTakeTaskBack = (n, actionTargetId, completedByUser) => {
    const theirTasks = appData.tasks.filter((t) =>
      isTaskDueToday(t) && t.assignedTo?.includes(actionTargetId) && !t.assignedTo?.includes(appData.currentUserId)
    );
    if (theirTasks.length === 0) {
      showToast(`${completedByUser?.name || "They"} ha${completedByUser ? "s" : "ve"} no tasks you can take right now`);
      return;
    }
    const taskToTake = theirTasks[0];

    setAppData(prev => {
      const updatedTasks = prev.tasks.map((t) =>
        t.id === taskToTake.id ? { ...t, assignedTo: [...(t.assignedTo || []), prev.currentUserId] } : t
      );
      const updNotifs = (prev.notifications || []).map((notif) =>
        notif.id === n.id ? { ...notif, actioned: true } : notif
      );
      const newData = { ...prev, tasks: updatedTasks, notifications: updNotifs };
      saveData(newData);
      return newData;
    });

    sendDirectNotification(actionTargetId, "task", `${currentUser?.name} volunteered to help with "${taskToTake.name}" in return!`, { taskId: taskToTake.id });
    showToast(`You volunteered for "${taskToTake.name}"`);
  };

  return (
    <PageShell narrow topNav>
      <Header title="Notifications" onBack={onBack} />
      <Card delay={0.05}>
        {myNotifs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "28px 0" }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={C.mist} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12 }}>
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
            </svg>
            <p style={{ color: C.steel, fontSize: 14 }}>No notifications yet.</p>
            <p style={{ color: C.steel, fontSize: 13, marginTop: 4 }}>When someone assigns you a task or sends a recognition, it will appear here.</p>
          </div>
        ) : (
          myNotifs.map((n, i) => {
            const isSystem = n.fromUserId === "system";
            const from = isSystem ? null : appData.users.find((u) => u.id === n.fromUserId);
            const completedByUser = n.completedBy ? appData.users.find((u) => u.id === n.completedBy) : null;
            const timeAgo = (() => {
              const mins = Math.floor((Date.now() - new Date(n.timestamp)) / 60000);
              if (mins < 1) return "Just now";
              if (mins < 60) return `${mins}m ago`;
              const hrs = Math.floor(mins / 60);
              if (hrs < 24) return `${hrs}h ago`;
              return `${Math.floor(hrs / 24)}d ago`;
            })();
            const typeIcon = n.type === "task" ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.navy} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 12l2 2 4-4"/>
              </svg>
            ) : n.type === "recognition" ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.navy} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
              </svg>
            ) : n.type === "completion" ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2ecc71" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.navy} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
              </svg>
            );
            const isCompletedForMe = n.type === "completion" && n.completedBy && n.completedBy !== appData.currentUserId && !n.actioned;
            const actionTargetId = n.completedBy || n.fromUserId;
            return (
              <div key={n.id}>
                <div style={{ padding: "14px 0" }}>
                  <div style={{ display: "flex", gap: 12 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 12,
                      background: n.type === "completion" ? "rgba(46,204,113,0.1)" : (n.read ? C.mist : C.ice),
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      {typeIcon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        {isSystem ? (
                          <span style={{
                            fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 13,
                            color: C.dark, fontStyle: "italic", letterSpacing: "-0.01em",
                          }}>divvy</span>
                        ) : (
                          <>
                            <Avatar name={from?.name} type={from?.type} size={20} image={from?.avatar} crop={from?.avatarCrop} />
                            <span style={{ fontSize: 12, color: C.steel, fontWeight: 600 }}>{from?.name}</span>
                          </>
                        )}
                        <span style={{ fontSize: 11, color: C.steel, marginLeft: "auto" }}>{timeAgo}</span>
                      </div>
                      <p style={{ fontSize: 14, color: C.dark, lineHeight: 1.5 }}>{n.message}</p>

                      {isCompletedForMe && (
                        <div style={{ display: "flex", gap: 8, marginTop: 10, animation: "fadeUp 0.2s ease both" }}>
                          <button onClick={() => handleSendThanks(n, actionTargetId)} style={{
                            ...btnBase, padding: "8px 16px", fontSize: 12, borderRadius: 10,
                            background: C.ice, color: C.navy, border: `1px solid ${C.borderLight}`,
                            display: "flex", alignItems: "center", gap: 6,
                          }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.navy} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                            </svg>
                            Send thanks
                          </button>
                          <button onClick={() => handleTakeTaskBack(n, actionTargetId, completedByUser)} style={{
                            ...btnBase, padding: "8px 16px", fontSize: 12, borderRadius: 10,
                            background: C.gradientPrimary, color: C.white,
                            display: "flex", alignItems: "center", gap: 6,
                          }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.white} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14"/>
                              <path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/>
                            </svg>
                            Take a task back
                          </button>
                        </div>
                      )}
                      {n.actioned && n.type === "completion" && (
                        <p style={{ fontSize: 11, color: C.steel, fontStyle: "italic", marginTop: 6 }}>Responded</p>
                      )}
                    </div>
                  </div>
                </div>
                {i < myNotifs.length - 1 && <Divider />}
              </div>
            );
          })
        )}
      </Card>
    </PageShell>
  );
}
