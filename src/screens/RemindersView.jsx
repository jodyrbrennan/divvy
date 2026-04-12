import { C, fontDisplay } from "../constants/colors";
import { btnBase, labelStyle } from "../constants/styles";
import { isTaskDueToday, getScheduleLabel } from "../utils/taskHelpers";
import { PlusIcon } from "../components/Icons";
import PageShell from "../components/PageShell";
import Card from "../components/Card";
import Divider from "../components/Divider";
import Header from "../components/Header";
import TaskRow from "../components/TaskRow";

// Phase 7.1: Use context instead of props for app data
import { useAppData } from "../contexts/AppDataContext";

/**
 * RemindersView — shows today's reminders and a full list of all reminders.
 * Phase 7.1: Now uses useAppData() context instead of receiving appData as a prop.
 */
export default function RemindersView({ onBack, onCreateReminder, onDeleteTask, taskRowProps }) {
  // Phase 7.1: Pull data from context
  const { appData } = useAppData();

  const dueReminders = appData.tasks.filter((t) => t.isReminder && isTaskDueToday(t));
  const completedReminders = appData.tasks.filter(
    (t) => t.isReminder && !isTaskDueToday(t) && t.lastCompleted && new Date(t.lastCompleted).toDateString() === new Date().toDateString()
  );
  const allReminders = appData.tasks.filter((t) => t.isReminder);

  return (
    <PageShell narrow topNav>
      <Header title="Reminders" onBack={onBack} />

      <Card delay={0.05}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontFamily: fontDisplay, fontSize: 19, fontWeight: 600 }}>Today's Reminders</h3>
          <button onClick={onCreateReminder} style={{
            ...btnBase, padding: "8px 16px", fontSize: 13, borderRadius: 10,
            background: C.gradientPrimary, color: C.white, boxShadow: "0 2px 10px rgba(41,53,60,0.2)",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <PlusIcon size={16} /> Add
          </button>
        </div>

        {dueReminders.length === 0 && completedReminders.length === 0 ? (
          <p style={{ color: C.steel, fontSize: 14, textAlign: "center", padding: "28px 0" }}>
            {allReminders.length === 0 ? "No reminders yet. Tap \"Add\" to create your first one." : "No reminders for today."}
          </p>
        ) : (
          <>
            {dueReminders.map((t, i) => (
              <div key={t.id}>
                <TaskRow task={t} {...taskRowProps} />
                {i < dueReminders.length - 1 && <Divider />}
              </div>
            ))}
            {completedReminders.length > 0 && (
              <>
                {dueReminders.length > 0 && <div style={{ margin: "8px 0" }} />}
                <p style={{ ...labelStyle, marginBottom: 8, fontSize: 10 }}>Done</p>
                {completedReminders.map((t, i) => (
                  <div key={t.id}>
                    <TaskRow task={t} compact {...taskRowProps} />
                    {i < completedReminders.length - 1 && <Divider />}
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </Card>

      {/* All reminders list */}
      {allReminders.length > 0 && (
        <Card style={{ marginTop: 12 }} delay={0.1}>
          <p style={{ ...labelStyle, marginBottom: 12 }}>All Reminders</p>
          {allReminders.map((t, i) => (
            <div key={t.id}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.sky, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: 14, color: C.dark }}>{t.name}</p>
                  <p style={{ fontSize: 11, color: C.steel, marginTop: 2 }}>{getScheduleLabel(t)}</p>
                </div>
                <button onClick={() => onDeleteTask(t.id)} style={{
                  ...btnBase, padding: "4px 10px", fontSize: 11, borderRadius: 6,
                  background: "rgba(192,57,43,0.06)", color: C.danger,
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.danger} strokeWidth="2" strokeLinecap="round">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </button>
              </div>
              {i < allReminders.length - 1 && <Divider />}
            </div>
          ))}
        </Card>
      )}
    </PageShell>
  );
}
