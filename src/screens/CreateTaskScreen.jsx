import { useState } from "react";
import { C, font, fontDisplay } from "../constants/colors";
import { btnBase, btnPrimary, btnSecondary, btnGhost, inputStyle, labelStyle } from "../constants/styles";
import { uid } from "../utils/storage";
import { DAY_NAMES, MONTH_NAMES } from "../utils/taskHelpers";
import { isTaskActiveOnDate } from "../utils/calendarHelpers";
import { parseCustomSchedule } from "../utils/parseSchedule";
import PageShell from "../components/PageShell";
import Card from "../components/Card";
import Chip from "../components/Chip";
import Avatar from "../components/Avatar";
import HoldOption from "../components/HoldOption";
import WizardNav from "../components/WizardNav";
import MiniCalendar from "../components/MiniCalendar";
import { DayOfWeekPicker, DayOfMonthPicker } from "../components/DayPickers";
import TaskPicker from "../components/TaskPicker";

export default function CreateTaskScreen({ onComplete, onBack, users, editingTask, currentUserId, existingTasks }) {
  const isEditing = !!editingTask;
  const [mode, setMode] = useState(isEditing ? "form" : "pick");
  const [step, setStep] = useState(0);
  const [parsing, setParsing] = useState(false);
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());

  const [task, setTask] = useState(() => {
    if (editingTask) {
      const sc = editingTask.scheduleConfig || { frequency: editingTask.schedule || "daily", weeklyDays: [], monthlyDays: [], yearlyMonth: 0, yearlyDay: 1, customDescription: "", customSummary: "", customInterval: null };
      return {
        name: editingTask.name || "", description: editingTask.description || "", points: editingTask.points || 10,
        scheduleConfig: sc,
        taskType: editingTask.taskType || "permanent",
        tempConfig: editingTask.tempConfig || { mode: "duration", count: 1, unit: "weeks", rangeStart: "", rangeEnd: "", dates: [], startDate: new Date().toISOString().slice(0, 10) },
        dueConfig: editingTask.dueConfig || { type: "none", date: "", time: "", timeEnd: "" },
        assignMode: editingTask.assignMode === "rotating" ? "rotating" : editingTask.assignedTo?.length === users.length ? "all" : editingTask.assignedTo?.length === 1 && editingTask.assignedTo[0] === currentUserId ? "me" : editingTask.assignedTo?.length === 1 ? editingTask.assignedTo[0] : editingTask.assignMode || "all",
        assignedTo: editingTask.assignedTo || [], rotation: editingTask.rotation || [],
      };
    }
    return {
      name: "", description: "", points: 10,
      scheduleConfig: { frequency: "daily", weeklyDays: [], monthlyDays: [], yearlyMonth: 0, yearlyDay: 1, customDescription: "", customSummary: "", customInterval: null },
      taskType: "permanent",
      tempConfig: { mode: "duration", count: 1, unit: "weeks", rangeStart: "", rangeEnd: "", dates: [], startDate: new Date().toISOString().slice(0, 10) },
      dueConfig: { type: "none", date: "", time: "", timeEnd: "" },
      assignMode: "all", assignedTo: [], rotation: [],
    };
  });

  const set = (key) => (val) => setTask((t) => ({ ...t, [key]: val }));
  const setSched = (key) => (val) => setTask((t) => ({ ...t, scheduleConfig: { ...t.scheduleConfig, [key]: val } }));
  const setTemp = (key) => (val) => setTask((t) => ({ ...t, tempConfig: { ...t.tempConfig, [key]: val } }));
  const setDue = (key) => (val) => setTask((t) => ({ ...t, dueConfig: { ...t.dueConfig, [key]: val } }));

  const freq = task.scheduleConfig.frequency;
  const isRecurring = ["daily", "weekdays", "weekends", "weekly", "monthly", "yearly", "custom"].includes(freq);
  const needsDatePicker = task.taskType === "one-time" || !isRecurring;

  const TOTAL_STEPS = 6;
  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  const changeCalMonth = (dir) => {
    let m = calMonth + dir, y = calYear;
    if (m < 0) { m = 11; y--; } else if (m > 11) { m = 0; y++; }
    setCalMonth(m); setCalYear(y);
  };

  const toggleCalDate = (dateStr) => {
    const dates = task.tempConfig.dates || [];
    setTemp("dates")(dates.includes(dateStr) ? dates.filter((d) => d !== dateStr) : [...dates, dateStr].sort());
  };

  const handleCatalogSelect = (catalogTask) => {
    setTask((t) => ({
      ...t,
      name: catalogTask.name,
      scheduleConfig: { ...t.scheduleConfig, frequency: catalogTask.schedule },
      points: catalogTask.points,
    }));
    setMode("form");
    setStep(0);
  };

  const handleParseCustom = async () => {
    if (!task.scheduleConfig.customDescription.trim()) return;
    setParsing(true);
    const result = await parseCustomSchedule(task.scheduleConfig.customDescription);
    setSched("customSummary")(result.summary || "Custom schedule");
    if (result.intervalDays && result.startDate) {
      setSched("customInterval")({ days: result.intervalDays, startDate: result.startDate });
    }
    setParsing(false);
  };

  const resolveAssignment = () => {
    if (task.assignMode === "all") return users.map((u) => u.id);
    if (task.assignMode === "me") return [currentUserId];
    if (task.assignMode === "rotating") return task.assignedTo;
    const matchedUser = users.find((u) => u.id === task.assignMode);
    if (matchedUser) return [matchedUser.id];
    return task.assignedTo;
  };

  const [duplicateModal, setDuplicateModal] = useState(null);
  const [dupeReason, setDupeReason] = useState("");

  const buildTaskData = () => ({
    id: isEditing ? editingTask.id : uid(),
    name: task.name.trim(), description: task.description.trim(),
    schedule: task.scheduleConfig.frequency, scheduleConfig: task.scheduleConfig,
    taskType: task.taskType,
    tempConfig: (task.taskType === "temporary" || task.taskType === "seasonal") ? task.tempConfig : null,
    dueConfig: task.dueConfig,
    timeDue: task.dueConfig.time || null,
    assignedTo: resolveAssignment(), assignMode: task.assignMode,
    rotation: task.assignMode === "rotating" ? task.rotation : null,
    points: Math.max(0, parseInt(task.points) || 0),
    status: resolveAssignment().length > 0 ? "assigned" : "unassigned",
    lastCompleted: isEditing ? editingTask.lastCompleted : null,
    createdAt: isEditing ? editingTask.createdAt : new Date().toISOString(),
    createdBy: isEditing ? editingTask.createdBy : currentUserId,
  });

  const findDuplicate = (newTask) => {
    const name = newTask.name.toLowerCase();
    return (existingTasks || []).find((t) => {
      if (isEditing && t.id === editingTask.id) return false;
      if (t.name.toLowerCase() !== name) return false;
      const now = new Date();
      for (let d = 0; d < 30; d++) {
        const date = new Date(now.getTime() + d * 86400000);
        const existingActive = isTaskActiveOnDate(t, date);
        const newSched = newTask.scheduleConfig || {};
        const f = newSched.frequency || newTask.schedule || "once";
        const dow = date.getDay();
        const dom = date.getDate();
        let newActive = false;
        if (f === "daily") newActive = true;
        else if (f === "weekdays") newActive = dow >= 1 && dow <= 5;
        else if (f === "weekends") newActive = dow === 0 || dow === 6;
        else if (f === "weekly" && newSched.weeklyDays?.length) newActive = newSched.weeklyDays.includes(dow);
        else if (f === "monthly" && newSched.monthlyDays?.length) newActive = newSched.monthlyDays.includes(dom);
        else if (f === "once") newActive = d === 0;
        else newActive = true;
        if (existingActive && newActive) return true;
      }
      return false;
    });
  };

  const handleCreate = () => {
    if (!task.name.trim()) return;
    const newTask = buildTaskData();
    const existing = findDuplicate(newTask);
    if (existing) {
      setDuplicateModal({ existing, newTask });
      return;
    }
    onComplete(newTask);
  };

  const handleDupeDeleteExisting = () => {
    if (!duplicateModal) return;
    onComplete({ ...duplicateModal.newTask, _deleteTaskId: duplicateModal.existing.id });
    setDuplicateModal(null);
  };

  const handleDupeCancel = () => {
    setDuplicateModal(null);
  };

  const handleDupeAllow = () => {
    if (!duplicateModal) return;
    onComplete({ ...duplicateModal.newTask, duplicateOf: duplicateModal.existing.id, duplicateReason: dupeReason.trim() || "Intentional duplicate" });
    setDuplicateModal(null);
    setDupeReason("");
  };

  const toggleUser = (userId) => {
    setTask((t) => ({
      ...t,
      assignedTo: t.assignedTo.includes(userId) ? t.assignedTo.filter((id) => id !== userId) : [...t.assignedTo, userId],
    }));
  };

  const toggleRotationDay = (userId, day) => {
    setTask((t) => {
      const rot = [...(t.rotation || [])];
      const idx = rot.findIndex((r) => r.userId === userId);
      const existing = idx >= 0 ? rot[idx].days : [];
      const newDays = existing.includes(day) ? existing.filter((d) => d !== day) : [...existing, day].sort();
      if (idx >= 0) rot[idx] = { ...rot[idx], days: newDays };
      else rot.push({ userId, days: newDays });
      return { ...t, rotation: rot };
    });
  };

  const isStepValid = () => {
    if (step === 0) return task.name.trim().length > 0;
    if (step === 1 && freq === "weekly") return task.scheduleConfig.weeklyDays.length > 0;
    if (step === 1 && freq === "monthly") return task.scheduleConfig.monthlyDays.length > 0;
    return true;
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <Card>
            <h3 style={{ fontFamily: fontDisplay, fontSize: 22, fontWeight: 500, marginBottom: 4 }}>Task name</h3>
            <p style={{ color: C.steel, fontSize: 13, lineHeight: 1.5, marginBottom: 22 }}>What needs to be done?</p>
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Name</label>
              <input style={inputStyle} placeholder="e.g. Vacuum the floors"
                value={task.name} onChange={(e) => set("name")(e.target.value)} autoFocus />
            </div>
            <div>
              <label style={labelStyle}>Description (optional)</label>
              <textarea style={{ ...inputStyle, minHeight: 70, resize: "vertical", fontFamily: font }}
                placeholder="Any extra details or notes"
                value={task.description} onChange={(e) => set("description")(e.target.value)} />
            </div>
            <button onClick={next} disabled={!task.name.trim()}
              style={{ ...btnPrimary, width: "100%", marginTop: 22, opacity: task.name.trim() ? 1 : 0.45 }}>
              Continue
            </button>
          </Card>
        );

      case 1:
        return (
          <Card>
            <h3 style={{ fontFamily: fontDisplay, fontSize: 22, fontWeight: 500, marginBottom: 4 }}>Frequency</h3>
            <p style={{ color: C.steel, fontSize: 13, lineHeight: 1.5, marginBottom: 22 }}>How often should this task repeat?</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
              {[
                { v: "daily", l: "Daily" }, { v: "weekdays", l: "Weekdays" }, { v: "weekends", l: "Weekends" },
                { v: "weekly", l: "Weekly" }, { v: "monthly", l: "Monthly" }, { v: "yearly", l: "Yearly" },
                { v: "custom", l: "Custom" },
              ].map((o) => (
                <Chip key={o.v} label={o.l} selected={freq === o.v} onClick={() => setSched("frequency")(o.v)} />
              ))}
            </div>
            {freq === "weekly" && (
              <div style={{ animation: "fadeUp 0.2s ease both" }}>
                <label style={labelStyle}>Which days?</label>
                <DayOfWeekPicker selected={task.scheduleConfig.weeklyDays} onChange={setSched("weeklyDays")} />
              </div>
            )}
            {freq === "monthly" && (
              <div style={{ animation: "fadeUp 0.2s ease both" }}>
                <label style={labelStyle}>Which days of the month?</label>
                <DayOfMonthPicker selected={task.scheduleConfig.monthlyDays} onChange={setSched("monthlyDays")} />
              </div>
            )}
            {freq === "yearly" && (
              <div style={{ animation: "fadeUp 0.2s ease both", display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Month</label>
                  <select value={task.scheduleConfig.yearlyMonth} onChange={(e) => setSched("yearlyMonth")(parseInt(e.target.value))}
                    style={{ ...inputStyle, appearance: "none" }}>
                    {MONTH_NAMES.map((m, i) => <option key={i} value={i}>{m}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Day</label>
                  <input type="number" min="1" max="31" value={task.scheduleConfig.yearlyDay}
                    onChange={(e) => setSched("yearlyDay")(parseInt(e.target.value) || 1)} style={inputStyle} />
                </div>
              </div>
            )}
            {freq === "custom" && (
              <div style={{ animation: "fadeUp 0.2s ease both" }}>
                <label style={labelStyle}>Describe the schedule</label>
                <textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical", fontFamily: font, marginBottom: 10 }}
                  placeholder='e.g. "Every 11 days starting February 8th"'
                  value={task.scheduleConfig.customDescription}
                  onChange={(e) => setSched("customDescription")(e.target.value)} />
                <button onClick={handleParseCustom} disabled={parsing || !task.scheduleConfig.customDescription.trim()}
                  style={{ ...btnSecondary, fontSize: 13, padding: "10px 20px", opacity: task.scheduleConfig.customDescription.trim() ? 1 : 0.45 }}>
                  {parsing ? "Interpreting..." : "Interpret schedule"}
                </button>
                {task.scheduleConfig.customSummary && (
                  <div style={{ marginTop: 12, padding: "12px 16px", borderRadius: 10, background: C.ice, border: `1px solid ${C.sky}`, animation: "fadeUp 0.2s ease both" }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: C.navy }}>{task.scheduleConfig.customSummary}</p>
                    {task.scheduleConfig.customInterval?.days && (
                      <p style={{ fontSize: 12, color: C.steel, marginTop: 4 }}>
                        Every {task.scheduleConfig.customInterval.days} days
                        {task.scheduleConfig.customInterval.startDate ? ` starting ${task.scheduleConfig.customInterval.startDate}` : ""}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
            <button onClick={next} disabled={!isStepValid()}
              style={{ ...btnPrimary, width: "100%", marginTop: 22, opacity: isStepValid() ? 1 : 0.45 }}>
              Continue
            </button>
          </Card>
        );

      case 2:
        return (
          <Card>
            <h3 style={{ fontFamily: fontDisplay, fontSize: 22, fontWeight: 500, marginBottom: 4 }}>Task type</h3>
            <p style={{ color: C.steel, fontSize: 13, lineHeight: 1.5, marginBottom: 22 }}>How long will this task be active?</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
              {[
                { v: "permanent", l: "Permanent" }, { v: "temporary", l: "Temporary" },
                { v: "seasonal", l: "Seasonal" }, { v: "one-time", l: "One-time" },
              ].map((o) => (
                <Chip key={o.v} label={o.l} selected={task.taskType === o.v} onClick={() => set("taskType")(o.v)} />
              ))}
            </div>
            {(task.taskType === "temporary" || task.taskType === "seasonal") && (
              <div style={{ marginTop: 18, animation: "fadeUp 0.2s ease both" }}>
                <label style={labelStyle}>How long is it active?</label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                  {[
                    { v: "duration", l: "Set duration" }, { v: "dateRange", l: "Date range" },
                    { v: "specificDates", l: "Pick specific dates" },
                  ].map((o) => (
                    <Chip key={o.v} label={o.l} selected={task.tempConfig.mode === o.v} onClick={() => setTemp("mode")(o.v)} />
                  ))}
                </div>
                {task.tempConfig.mode === "duration" && (
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-end", animation: "fadeUp 0.15s ease both" }}>
                    <div>
                      <label style={labelStyle}>Starting from</label>
                      <input type="date" value={task.tempConfig.startDate} onChange={(e) => setTemp("startDate")(e.target.value)} style={{ ...inputStyle, width: 160 }} />
                    </div>
                    <div>
                      <label style={labelStyle}>For</label>
                      <input type="number" min="1" value={task.tempConfig.count} onChange={(e) => setTemp("count")(parseInt(e.target.value) || 1)} style={{ ...inputStyle, width: 70, textAlign: "center" }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <select value={task.tempConfig.unit} onChange={(e) => setTemp("unit")(e.target.value)} style={{ ...inputStyle, appearance: "none" }}>
                        {["days", "weeks", "months", "years"].map((u) => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                  </div>
                )}
                {task.tempConfig.mode === "dateRange" && (
                  <div style={{ display: "flex", gap: 10, animation: "fadeUp 0.15s ease both" }}>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>From</label>
                      <input type="date" value={task.tempConfig.rangeStart} onChange={(e) => setTemp("rangeStart")(e.target.value)} style={inputStyle} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>To</label>
                      <input type="date" value={task.tempConfig.rangeEnd} onChange={(e) => setTemp("rangeEnd")(e.target.value)} style={inputStyle} />
                    </div>
                  </div>
                )}
                {task.tempConfig.mode === "specificDates" && (
                  <div style={{ animation: "fadeUp 0.15s ease both" }}>
                    <MiniCalendar selectedDates={task.tempConfig.dates || []} onToggleDate={toggleCalDate}
                      month={calMonth} year={calYear} onChangeMonth={changeCalMonth} />
                    {(task.tempConfig.dates || []).length > 0 && (
                      <p style={{ fontSize: 12, color: C.steel, marginTop: 8 }}>
                        {task.tempConfig.dates.length} date{task.tempConfig.dates.length !== 1 ? "s" : ""} selected
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
            <button onClick={next} style={{ ...btnPrimary, width: "100%", marginTop: 22 }}>Continue</button>
          </Card>
        );

      case 3:
        return (
          <Card>
            <h3 style={{ fontFamily: fontDisplay, fontSize: 22, fontWeight: 500, marginBottom: 4 }}>Due Date/Time</h3>
            <p style={{ color: C.steel, fontSize: 13, lineHeight: 1.5, marginBottom: 22 }}>
              {needsDatePicker ? "When is this task due?" : "Is there a specific time this task should be completed by?"}
            </p>
            {!needsDatePicker && (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    { v: "none", l: "No specific time", desc: "Complete it any time during the day" },
                    { v: "datetime", l: "At a specific time", desc: "Due by a certain time each day" },
                    { v: "timeRange", l: "Between a time range", desc: "Should be done within a window" },
                  ].map((o) => {
                    const sel = task.dueConfig.type === o.v;
                    return (
                      <button key={o.v} onClick={() => setDue("type")(o.v)} style={{
                        all: "unset", cursor: "pointer", padding: "14px 18px", borderRadius: 12,
                        background: sel ? C.ice : "rgba(255,255,255,0.4)",
                        border: `1.5px solid ${sel ? C.sky : C.border}`, transition: "all 0.2s",
                      }}>
                        <p style={{ fontWeight: 600, fontSize: 15, color: sel ? C.dark : C.navy }}>{o.l}</p>
                        <p style={{ fontSize: 12, color: C.steel, marginTop: 2 }}>{o.desc}</p>
                      </button>
                    );
                  })}
                </div>
                {task.dueConfig.type === "datetime" && (
                  <div style={{ marginTop: 16, animation: "fadeUp 0.15s ease both" }}>
                    <label style={labelStyle}>Due by</label>
                    <input type="time" value={task.dueConfig.time} onChange={(e) => setDue("time")(e.target.value)} style={{ ...inputStyle, width: 180 }} />
                  </div>
                )}
                {task.dueConfig.type === "timeRange" && (
                  <div style={{ display: "flex", gap: 10, marginTop: 16, animation: "fadeUp 0.15s ease both" }}>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Between</label>
                      <input type="time" value={task.dueConfig.time} onChange={(e) => setDue("time")(e.target.value)} style={inputStyle} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>And</label>
                      <input type="time" value={task.dueConfig.timeEnd} onChange={(e) => setDue("timeEnd")(e.target.value)} style={inputStyle} />
                    </div>
                  </div>
                )}
              </>
            )}
            {needsDatePicker && (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    { v: "none", l: "No specific date or time", desc: "Complete it whenever" },
                    { v: "date", l: "Date only", desc: "Due on a specific day" },
                    { v: "datetime", l: "Date and time", desc: "Due on a specific day at a specific time" },
                  ].map((o) => {
                    const sel = task.dueConfig.type === o.v;
                    return (
                      <button key={o.v} onClick={() => setDue("type")(o.v)} style={{
                        all: "unset", cursor: "pointer", padding: "14px 18px", borderRadius: 12,
                        background: sel ? C.ice : "rgba(255,255,255,0.4)",
                        border: `1.5px solid ${sel ? C.sky : C.border}`, transition: "all 0.2s",
                      }}>
                        <p style={{ fontWeight: 600, fontSize: 15, color: sel ? C.dark : C.navy }}>{o.l}</p>
                        <p style={{ fontSize: 12, color: C.steel, marginTop: 2 }}>{o.desc}</p>
                      </button>
                    );
                  })}
                </div>
                {(task.dueConfig.type === "date" || task.dueConfig.type === "datetime") && (
                  <div style={{ display: "flex", gap: 10, marginTop: 16, animation: "fadeUp 0.15s ease both" }}>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Date</label>
                      <input type="date" value={task.dueConfig.date} onChange={(e) => setDue("date")(e.target.value)} style={inputStyle} />
                    </div>
                    {task.dueConfig.type === "datetime" && (
                      <div style={{ flex: 1 }}>
                        <label style={labelStyle}>Time</label>
                        <input type="time" value={task.dueConfig.time} onChange={(e) => setDue("time")(e.target.value)} style={inputStyle} />
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
            <button onClick={next} style={{ ...btnPrimary, width: "100%", marginTop: 22 }}>Continue</button>
          </Card>
        );

      case 4: {
        const currentMember = users.find((u) => u.id === currentUserId);
        const otherUsers = users.filter((u) => u.id !== currentUserId);
        const isMe = task.assignMode === "me";
        const isAll = task.assignMode === "all";
        const isRotating = task.assignMode === "rotating";

        return (
          <Card>
            <h3 style={{ fontFamily: fontDisplay, fontSize: 22, fontWeight: 500, marginBottom: 4 }}>Assignment</h3>
            <p style={{ color: C.steel, fontSize: 13, lineHeight: 1.5, marginBottom: 18 }}>Who is responsible for this task?</p>
            <p style={{ fontSize: 12, color: C.steel, marginBottom: 14, fontStyle: "italic" }}>Hold to select</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {currentMember && (
                <HoldOption selected={isMe && !isRotating} onHoldComplete={() => { set("assignMode")("me"); set("assignedTo")([currentUserId]); set("rotation")([]); next(); }}>
                  <p style={{ fontWeight: 700, fontSize: 15, color: C.dark, textTransform: "uppercase", letterSpacing: "0.04em" }}>Me</p>
                  <p style={{ fontSize: 12, color: C.steel, marginTop: 2 }}>{currentMember.name}</p>
                </HoldOption>
              )}
              {otherUsers.map((u) => (
                <HoldOption key={u.id} selected={task.assignMode === u.id} onHoldComplete={() => { set("assignMode")(u.id); set("assignedTo")([u.id]); set("rotation")([]); next(); }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar name={u.name} type={u.type} size={28} image={u.avatar} crop={u.avatarCrop} />
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 15, color: C.dark, textTransform: "uppercase", letterSpacing: "0.04em" }}>{u.name}</p>
                      <p style={{ fontSize: 12, color: C.steel, marginTop: 1 }}>{u.type === "dependent" ? "Restricted member" : "Member"}</p>
                    </div>
                  </div>
                </HoldOption>
              ))}
              <HoldOption selected={isAll} onHoldComplete={() => { set("assignMode")("all"); set("assignedTo")(users.map((u) => u.id)); set("rotation")([]); next(); }}>
                <p style={{ fontWeight: 700, fontSize: 15, color: C.dark, textTransform: "uppercase", letterSpacing: "0.04em" }}>Everyone</p>
                <p style={{ fontSize: 12, color: C.steel, marginTop: 2 }}>All {users.length} household members</p>
              </HoldOption>
              <HoldOption selected={isRotating} onHoldComplete={() => { set("assignMode")("rotating"); set("assignedTo")([]); }}>
                <p style={{ fontWeight: 700, fontSize: 15, color: C.dark, textTransform: "uppercase", letterSpacing: "0.04em" }}>Rotating</p>
                <p style={{ fontSize: 12, color: C.steel, marginTop: 2 }}>Different person on different days</p>
              </HoldOption>
            </div>
            {isRotating && (
              <div style={{ marginTop: 18, animation: "fadeUp 0.15s ease both" }}>
                <p style={{ fontSize: 13, color: C.steel, marginBottom: 14 }}>
                  Pick which days of the week each person is responsible.
                </p>
                {users.map((u) => {
                  const userDays = task.rotation?.find((r) => r.userId === u.id)?.days || [];
                  return (
                    <div key={u.id} style={{ marginBottom: 16 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                        <Avatar name={u.name} type={u.type} size={28} image={u.avatar} crop={u.avatarCrop} />
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{u.name}</span>
                      </div>
                      <div style={{ display: "flex", gap: 4 }}>
                        {DAY_NAMES.map((name, i) => {
                          const sel = userDays.includes(i);
                          return (
                            <button key={i} onClick={() => toggleRotationDay(u.id, i)} style={{
                              ...btnBase, padding: "7px 0", flex: 1, fontSize: 11, borderRadius: 8,
                              background: sel ? C.gradientAccent : "rgba(255,255,255,0.4)",
                              color: sel ? C.white : C.steel,
                              border: `1px solid ${sel ? "transparent" : C.border}`, minWidth: 0,
                            }}>{name}</button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                <button onClick={next} style={{ ...btnPrimary, width: "100%", marginTop: 8 }}>Continue</button>
              </div>
            )}
          </Card>
        );
      }

      case 5:
        return (
          <Card>
            <h3 style={{ fontFamily: fontDisplay, fontSize: 22, fontWeight: 500, marginBottom: 4 }}>Points</h3>
            <p style={{ color: C.steel, fontSize: 13, lineHeight: 1.5, marginBottom: 22 }}>
              How many points is this task worth? Higher-effort tasks can be worth more.
            </p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 24 }}>
              <button onClick={() => set("points")(Math.max(0, (parseInt(task.points) || 0) - 5))}
                style={{ ...btnBase, padding: "12px 20px", background: C.ice, color: C.navy, fontSize: 20, lineHeight: 1, borderRadius: 12 }}>
                &minus;
              </button>
              <input style={{ ...inputStyle, width: 90, textAlign: "center", fontSize: 28, fontWeight: 700, padding: "12px" }}
                type="number" min="0" value={task.points} onChange={(e) => set("points")(e.target.value)} />
              <button onClick={() => set("points")((parseInt(task.points) || 0) + 5)}
                style={{ ...btnBase, padding: "12px 20px", background: C.ice, color: C.navy, fontSize: 20, lineHeight: 1, borderRadius: 12 }}>
                +
              </button>
            </div>
            <button onClick={handleCreate} disabled={!task.name.trim()}
              style={{ ...btnPrimary, width: "100%", opacity: task.name.trim() ? 1 : 0.45 }}>
              {isEditing ? "Save changes" : "Create task"}
            </button>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <>
    <PageShell narrow topNav>
      {mode === "pick" && (
        <>
          <button onClick={onBack} style={btnGhost}>&larr; Back</button>
          <h2 style={{ fontFamily: fontDisplay, fontSize: 28, fontWeight: 500, margin: "20px 0 8px" }}>Add a task</h2>
          <p style={{ color: C.steel, fontSize: 15, lineHeight: 1.55, marginBottom: 32 }}>
            Pick from common household tasks or search for something specific.
          </p>
          <Card style={{ marginBottom: 16 }}>
            <TaskPicker onSelect={handleCatalogSelect} />
          </Card>
          <Card>
            <p style={{ color: C.steel, fontSize: 14, marginBottom: 14 }}>Don't see what you need?</p>
            <button onClick={() => { setMode("form"); setStep(0); }} style={{ ...btnSecondary, width: "100%", fontSize: 14 }}>
              Create a custom task
            </button>
          </Card>
        </>
      )}
      {mode === "form" && (
        <>
          <div style={{ marginBottom: 20 }}>
            <p style={{ color: C.steel, fontSize: 14 }}>Step {step + 1} of {TOTAL_STEPS}</p>
          </div>
          {renderStep()}
          <div style={{ marginTop: 20 }}>
            <WizardNav step={step} totalSteps={TOTAL_STEPS} onBack={prev}
              onBackToList={isEditing ? onBack : () => setMode("pick")} />
          </div>
        </>
      )}
    </PageShell>

    {duplicateModal && (
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
          <h3 style={{ fontFamily: fontDisplay, fontSize: 20, fontWeight: 600, color: C.dark, marginBottom: 8 }}>
            Duplicate task detected
          </h3>
          <p style={{ color: C.steel, fontSize: 14, lineHeight: 1.5, marginBottom: 20 }}>
            A task named <span style={{ fontWeight: 700, color: C.dark }}>"{duplicateModal.existing.name}"</span> already
            exists and is active on the same day(s). What would you like to do?
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 8 }}>
            <button onClick={handleDupeDeleteExisting} style={{
              all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
              padding: "14px 16px", borderRadius: 12,
              background: "rgba(192,57,43,0.04)", border: "1.5px solid rgba(192,57,43,0.15)", transition: "all 0.2s",
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.danger} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
              <div>
                <p style={{ fontWeight: 600, fontSize: 14, color: C.danger }}>Delete existing task</p>
                <p style={{ fontSize: 12, color: C.steel, marginTop: 2 }}>Remove the old one and create this new one</p>
              </div>
            </button>
            <button onClick={handleDupeCancel} style={{
              all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
              padding: "14px 16px", borderRadius: 12,
              background: "rgba(255,255,255,0.4)", border: `1.5px solid ${C.border}`, transition: "all 0.2s",
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.steel} strokeWidth="1.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
              <div>
                <p style={{ fontWeight: 600, fontSize: 14, color: C.dark }}>Cancel</p>
                <p style={{ fontSize: 12, color: C.steel, marginTop: 2 }}>Don't create the new task</p>
              </div>
            </button>
            <button onClick={() => document.getElementById("dupe-reason-input")?.focus()} style={{
              all: "unset", cursor: "pointer", display: "flex", flexDirection: "column", gap: 10,
              padding: "14px 16px", borderRadius: 12,
              background: C.ice, border: `1.5px solid ${C.sky}`, transition: "all 0.2s",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.navy} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="8" y="2" width="13" height="13" rx="2"/><path d="M3 9a2 2 0 012-2h1m0 12H5a2 2 0 01-2-2v-1"/>
                </svg>
                <div>
                  <p style={{ fontWeight: 600, fontSize: 14, color: C.dark }}>Allow duplicate</p>
                  <p style={{ fontSize: 12, color: C.steel, marginTop: 2 }}>Keep both tasks active</p>
                </div>
              </div>
              <input id="dupe-reason-input" style={{ ...inputStyle, fontSize: 13, padding: "10px 14px" }}
                placeholder="Reason for duplicate (optional)"
                value={dupeReason} onChange={(e) => setDupeReason(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.key === "Enter" && handleDupeAllow()} />
              <button onClick={(e) => { e.stopPropagation(); handleDupeAllow(); }} style={{
                ...btnPrimary, width: "100%", padding: "12px 20px", fontSize: 14,
              }}>
                Create duplicate
              </button>
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
