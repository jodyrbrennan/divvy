import { useState } from "react";
import { C, font, fontDisplay } from "../constants/colors";
import { btnBase, btnPrimary, btnSecondary, inputStyle, labelStyle } from "../constants/styles";
import { uid, saveData } from "../utils/storage";
import { isTaskDueToday } from "../utils/taskHelpers";
import { PlusIcon } from "../components/Icons";
import PageShell from "../components/PageShell";
import Card from "../components/Card";
import Divider from "../components/Divider";
import Header from "../components/Header";
import TaskRow from "../components/TaskRow";
import SelectionBar from "../components/SelectionBar";
import TaskCompletionDialog from "../components/TaskCompletionDialog";

/**
 * TasksView — shows today's due tasks with selection, completion,
 * and an unscheduled-task logging form.
 *
 * Phase 6.2: setAppData uses functional updater to prevent race conditions.
 */
export default function TasksView({
  appData, setAppData, currentUser, showToast,
  onBack, onCreateTask,
  selectedTaskIds, setSelectedTaskIds,
  completionDialogTasks, setCompletionDialogTasks, handleBulkComplete,
  taskRowProps, selectionBarProps,
}) {
  // ── Local state for the "Log unscheduled task" form ──
  const [showUnscheduledForm, setShowUnscheduledForm] = useState(false);
  const [unschedName, setUnschedName] = useState("");
  const [unschedDesc, setUnschedDesc] = useState("");
  const [unschedPoints, setUnschedPoints] = useState(10);

  const handleUnscheduledSubmit = () => {
    if (!unschedName.trim()) return;
    const now = new Date().toISOString();
    const taskId = uid();
    const pointsVal = Math.max(0, parseInt(unschedPoints) || 0);
    const taskName = unschedName.trim();
    const newTask = {
      id: taskId, name: taskName, description: unschedDesc.trim(),
      schedule: "none", scheduleConfig: { frequency: "none" },
      taskType: "unscheduled", tempConfig: null,
      dueConfig: { type: "none" },
      assignedTo: [appData.currentUserId], assignMode: "me",
      rotation: null, points: pointsVal,
      status: "completed", lastCompleted: now,
      createdAt: now, createdBy: appData.currentUserId,
    };
    const completion = { id: uid(), taskId, userId: appData.currentUserId, timestamp: now, pointsEarned: pointsVal };
    const completerName = currentUser?.name || "Someone";

    setAppData(prev => {
      const updatedUsers = prev.users.map((u) =>
        u.id === prev.currentUserId ? { ...u, pointBalance: (u.pointBalance || 0) + pointsVal } : u
      );
      const newNotifications = [];
      for (const u of prev.users) {
        if (u.id === prev.currentUserId || u.status === "pending") continue;
        newNotifications.push({
          id: uid(), type: "completion", targetUserId: u.id, fromUserId: "system",
          rawMessage: `${completerName} completed an unscheduled task: "${taskName}"`,
          message: `${completerName} completed an unscheduled task: "${taskName}"`,
          read: false, timestamp: now, taskId, completedBy: prev.currentUserId,
        });
      }
      const newData = {
        ...prev,
        tasks: [...prev.tasks, newTask],
        completions: [...prev.completions, completion],
        users: updatedUsers,
        notifications: [...(prev.notifications || []), ...newNotifications],
      };
      saveData(newData);
      return newData;
    });

    showToast(`"${taskName}" logged — +${pointsVal} points`);
    setUnschedName(""); setUnschedDesc(""); setUnschedPoints(10);
    setShowUnscheduledForm(false);
  };

  const dueTasks = appData.tasks.filter((t) => !t.isReminder && isTaskDueToday(t));

  return (
    <>
    <PageShell narrow topNav>
      <Header title="Tasks" onBack={() => { onBack(); setSelectedTaskIds([]); }} />

      <Card delay={0.05}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontFamily: fontDisplay, fontSize: 19, fontWeight: 600 }}>Tasks Due Today</h3>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={onCreateTask} style={{
              ...btnBase, padding: "8px 12px", fontSize: 12, borderRadius: 10,
              background: C.gradientPrimary, color: C.white, boxShadow: "0 2px 10px rgba(41,53,60,0.2)",
              display: "flex", alignItems: "center", gap: 5,
            }}>
              <PlusIcon size={14} /> Scheduled
            </button>
            <button onClick={() => setShowUnscheduledForm(true)} style={{
              ...btnBase, padding: "8px 12px", fontSize: 12, borderRadius: 10,
              background: C.ice, color: C.navy, border: `1.5px solid ${C.sky}`,
              display: "flex", alignItems: "center", gap: 5,
            }}>
              <PlusIcon size={14} /> Unscheduled
            </button>
          </div>
        </div>

        {dueTasks.length === 0 ? (
          <p style={{ color: C.steel, fontSize: 14, textAlign: "center", padding: "28px 0" }}>
            {appData.tasks.length === 0 ? "No tasks yet. Tap \"Add task\" to create your first one." : "You're all caught up! No tasks due right now."}
          </p>
        ) : (
          <>
            <SelectionBar tasks={appData.tasks} {...selectionBarProps} />
            {dueTasks.map((t, i) => (
              <div key={t.id}>
                <TaskRow task={t} {...taskRowProps} />
                {i < dueTasks.length - 1 && <Divider />}
              </div>
            ))}
          </>
        )}
      </Card>
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
    {showUnscheduledForm && (
      <div style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(41,53,60,0.5)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20, animation: "fadeUp 0.2s ease both",
      }}>
        <div style={{
          background: C.white, borderRadius: 20, padding: 28,
          maxWidth: 420, width: "100%",
          boxShadow: "0 16px 48px rgba(0,0,0,0.15)",
        }}>
          <h3 style={{ fontFamily: fontDisplay, fontSize: 20, fontWeight: 600, color: C.dark, marginBottom: 4 }}>Log a completed task</h3>
          <p style={{ color: C.steel, fontSize: 13, lineHeight: 1.5, marginBottom: 20 }}>
            Record something you already did. You'll earn points and your household will be notified.
          </p>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>What did you do?</label>
            <input style={inputStyle} placeholder='e.g. "Called the plumber", "Replaced garage light"'
              value={unschedName} onChange={(e) => setUnschedName(e.target.value)} autoFocus />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Details (optional)</label>
            <textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical", fontFamily: font }}
              placeholder="Any extra notes"
              value={unschedDesc} onChange={(e) => setUnschedDesc(e.target.value)} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Points earned</label>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6 }}>
              <button onClick={() => setUnschedPoints(Math.max(0, (parseInt(unschedPoints) || 0) - 5))}
                style={{ ...btnBase, padding: "8px 16px", background: C.ice, color: C.navy, fontSize: 18, borderRadius: 10 }}>&minus;</button>
              <input style={{ ...inputStyle, width: 70, textAlign: "center", fontSize: 22, fontWeight: 700, padding: "8px" }}
                type="number" min="0" value={unschedPoints} onChange={(e) => setUnschedPoints(e.target.value)} />
              <button onClick={() => setUnschedPoints((parseInt(unschedPoints) || 0) + 5)}
                style={{ ...btnBase, padding: "8px 16px", background: C.ice, color: C.navy, fontSize: 18, borderRadius: 10 }}>+</button>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => { setShowUnscheduledForm(false); setUnschedName(""); setUnschedDesc(""); setUnschedPoints(10); }}
              style={{ ...btnSecondary, flex: 1 }}>Cancel</button>
            <button onClick={handleUnscheduledSubmit} disabled={!unschedName.trim()}
              style={{ ...btnPrimary, flex: 2, opacity: unschedName.trim() ? 1 : 0.45 }}>Log task</button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
