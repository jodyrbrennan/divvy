import { useState, useEffect, useRef, useMemo } from "react";
import { C, font } from "../constants/colors";
import { btnBase, btnGhost } from "../constants/styles";
import { uid, saveData, defaultData } from "../utils/storage";
import { createNotification } from "../utils/notificationHelpers";
import { rewriteForUser } from "../utils/communication";
import { isTaskDueToday } from "../utils/taskHelpers";

import { useDebouncedSave } from "../utils/useDebouncedSave";
import { useToast } from "../components/Toast";
import PageShell from "../components/PageShell";
import Card from "../components/Card";
import Avatar from "../components/Avatar";
import Divider from "../components/Divider";
import Select from "../components/Select";
import Chip from "../components/Chip";
import HoldOption from "../components/HoldOption";
import CalendarView from "./CalendarView";
import MembersView from "./MembersView";
import NotificationsView from "./NotificationsView";
import RecognitionView from "./RecognitionView";
import SettingsView from "./SettingsView";
import TasksView from "./TasksView";
import RemindersView from "./RemindersView";
import MemberDetailView from "./MemberDetailView";
import Header from "../components/Header";
import VoiceCommandOverlay from "../components/VoiceCommandOverlay";
import TextCommandOverlay from "../components/TextCommandOverlay";
import MessageApprovalOverlay from "../components/MessageApprovalOverlay";
import TaskCompletionDialog from "../components/TaskCompletionDialog";
import TaskRow from "../components/TaskRow";
import SelectionBar from "../components/SelectionBar";


// ─── Dashboard ─────────────────────────────────────────────────
export default function Dashboard({ appData, setAppData, onAddMember, onCreateTask, onCreateReminder, onEditTask, requestedView, clearRequestedView, pendingPreview, clearPendingPreview }) {
  const currentUser = appData.users.find((u) => u.id === appData.currentUserId);
  const [view, setView] = useState("hub");
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);
  const [completionDialogTasks, setCompletionDialogTasks] = useState(null);

  // Handle external view requests (e.g. bell click from TopNav)
  useEffect(() => {
    if (requestedView) {
      setView(requestedView);
      clearRequestedView();
    }
  }, [requestedView]);

  // Handle preview from App (wizard-created tasks) → route to approval
  useEffect(() => {
    if (pendingPreview) {
      setPendingApproval({
        ...pendingPreview,
        editMode: false,
        editText: "",
      });
      clearPendingPreview();
    }
  }, [pendingPreview]);
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const showToast = useToast();
  const { debouncedSave } = useDebouncedSave(500);
  const [pendingApproval, setPendingApproval] = useState(null);
  const [voiceMode, setVoiceMode] = useState("idle"); // idle, listening, processing, result
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceParsed, setVoiceParsed] = useState(null);
  const [voiceError, setVoiceError] = useState("");
  const [textCommandOpen, setTextCommandOpen] = useState(false);
  const [textCommandInput, setTextCommandInput] = useState("");
  const [textShift, setTextShift] = useState(false);
  const textInputRef = useRef(null);
  const recognitionRef = useRef(null);


  // ── PHASE 6.2: All handlers now use functional updater pattern ──
  // This prevents race conditions when two updates fire close together.
  // Inside the updater, `prev` is always the latest state.

  const handleReset = () => {
    const fresh = defaultData();
    setAppData(() => {
      saveData(fresh);
      return fresh;
    });
  };

  // completeTasksCore now takes `prev` (latest state) as its first argument
  // instead of reading `appData` from the closure.
  const completeTasksCore = (prev, taskIds, userId) => {
    const now = new Date().toISOString();
    const tasksToComplete = taskIds.map((id) => prev.tasks.find((t) => t.id === id)).filter(Boolean);
    if (tasksToComplete.length === 0) return null;
    let totalPoints = 0;
    const newCompletions = tasksToComplete.map((task) => { totalPoints += (task.points || 0); return { id: uid(), taskId: task.id, userId, timestamp: now, pointsEarned: task.points || 0 }; });
    const completedIds = new Set(taskIds);
    const updatedTasks = prev.tasks.map((t) => completedIds.has(t.id) ? { ...t, lastCompleted: now, status: "completed" } : t);
    const updatedUsers = prev.users.map((u) => u.id === userId ? { ...u, pointBalance: (u.pointBalance || 0) + totalPoints } : u);
    const completerName = prev.users.find((u) => u.id === userId)?.name || "Someone";
    const newNotifications = [];
    for (const task of tasksToComplete) {
      if (task.createdBy && task.createdBy !== userId) newNotifications.push(createNotification("completion", task.createdBy, "system", `${completerName} completed the task: "${task.name}"`, { taskId: task.id, completedBy: userId }));
      for (const otherId of (task.assignedTo || []).filter((id) => id !== userId)) { if (otherId === task.createdBy) continue; newNotifications.push(createNotification("completion", otherId, "system", `${completerName} completed your task: "${task.name}"`, { taskId: task.id, completedBy: userId })); }
    }
    return { ...prev, tasks: updatedTasks, users: updatedUsers, completions: [...prev.completions, ...newCompletions], notifications: [...(prev.notifications || []), ...newNotifications] };
  };

  const handleComplete = (taskId, completerId) => {
    // Read display info from closure (safe — just for toast text)
    const task = appData.tasks.find((t) => t.id === taskId);
    if (!task) return;
    const userId = completerId || appData.currentUserId;

    setAppData(prev => {
      const newData = completeTasksCore(prev, [taskId], userId);
      if (!newData) return prev;
      saveData(newData);
      return newData;
    });

    if (userId !== appData.currentUserId) {
      const name = appData.users.find((u) => u.id === userId)?.name;
      showToast(`Marked "${task.name}" complete for ${name}`);
    }
  };

  const handleBulkComplete = (completerId) => {
    if (!completionDialogTasks || completionDialogTasks.length === 0) return;

    const taskIds = completionDialogTasks.map((t) => t.id);
    const count = taskIds.length;

    setAppData(prev => {
      const newData = completeTasksCore(prev, taskIds, completerId);
      if (!newData) return prev;
      saveData(newData);
      return newData;
    });

    setCompletionDialogTasks(null);
    setSelectedTaskIds([]);
    showToast(`${count} task${count !== 1 ? "s" : ""} marked complete`);
  };

  const toggleTaskSelection = (taskId) => {
    setSelectedTaskIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  const handleUncomplete = (taskId) => {
    setAppData(prev => {
      const updatedTasks = prev.tasks.map((t) => t.id === taskId ? { ...t, lastCompleted: null, status: "assigned" } : t);
      const idx = [...prev.completions].reverse().findIndex((c) => c.taskId === taskId);
      let updatedCompletions = [...prev.completions];
      let pointsBack = 0;
      if (idx !== -1) { const realIdx = prev.completions.length - 1 - idx; pointsBack = prev.completions[realIdx].pointsEarned || 0; updatedCompletions.splice(realIdx, 1); }
      let completerId = prev.currentUserId;
      if (idx !== -1) { completerId = prev.completions[prev.completions.length - 1 - idx].userId; }
      const updatedUsers = prev.users.map((u) => u.id === completerId ? { ...u, pointBalance: Math.max(0, (u.pointBalance || 0) - pointsBack) } : u);
      const newData = { ...prev, tasks: updatedTasks, users: updatedUsers, completions: updatedCompletions };
      saveData(newData);
      return newData;
    });
  };

  
  const handleDeleteTask = (taskId) => {
    setAppData(prev => {
      const newData = { ...prev, tasks: prev.tasks.filter((t) => t.id !== taskId), completions: prev.completions.filter((c) => c.taskId !== taskId) };
      saveData(newData);
      return newData;
    });
  };

  const selectedMember = appData.users.find((u) => u.id === selectedMemberId);

  // ── Reward, relationship, and history handlers moved to MemberDetailView.jsx ──

  // Get the tag a sender should use when messaging a specific recipient
  const getSenderTag = (senderId, recipientId) => {
    const sender = appData.users.find((u) => u.id === senderId);
    if (!sender) return null;
    const tags = sender.relationshipTags || {};
    if (tags[recipientId]) return tags[recipientId];
    // Auto-default based on relationship
    const rel = (sender.relationships || {})[recipientId];
    if (!rel) return sender.name;
    // If relationship is parent and no custom tag, use first name (they'll set it)
    return sender.name;
  };


  // Count missing relationships for current user
  const missingRelationships = appData.users.filter((u) => {
    if (u.id === appData.currentUserId) return false;
    if (u.status === "pending") return false;
    const myRels = currentUser?.relationships || {};
    return !myRels[u.id];
  });


  // ── Voice Command ──
  const startVoice = () => {
    setVoiceTranscript("");
    setVoiceParsed(null);
    setVoiceError("");
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceMode("result");
      setVoiceError("Voice recognition is not supported in this browser.");
      return;
    }
    const recog = new SpeechRecognition();
    recog.continuous = false;
    recog.interimResults = true;
    recog.lang = "en-US";
    recognitionRef.current = recog;
    recog.onresult = (event) => {
      const t = Array.from(event.results).map((r) => r[0].transcript).join("");
      setVoiceTranscript(t);
    };
    recog.onerror = (event) => {
      setVoiceMode("result");
      setVoiceError(event.error === "not-allowed" ? "Microphone access denied. Please allow microphone access and try again." : `Voice error: ${event.error}`);
    };
    recog.onend = () => {
      setVoiceMode((m) => m === "listening" ? "processing" : m);
    };
    setVoiceMode("listening");
    recog.start();
  };

  const stopVoice = () => {
    if (recognitionRef.current) recognitionRef.current.stop();
    if (voiceTranscript.trim()) {
      setVoiceMode("processing");
    } else {
      setVoiceMode("idle");
    }
  };

  // Parse voice with AI when processing starts
  useEffect(() => {
    if (voiceMode !== "processing" || !voiceTranscript.trim()) return;
    const memberList = appData.users.map((u) => `${u.name} (id: ${u.id}, type: ${u.type})`).join(", ");
    const parse = async () => {
      try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 1000,
            system: `You are a voice command parser for a household task app called Divvy. Parse the user's voice command and return ONLY valid JSON with no markdown or backticks.

Current user: ${currentUser?.name} (id: ${appData.currentUserId})
Household members: ${memberList}
Today's date: ${new Date().toISOString().slice(0, 10)}

Return this JSON format:
{
  "type": "task" | "reminder" | "recognition" | "unknown",
  "summary": "brief human-readable summary of what will be created",
  "targetUserId": "user id this is for, or null if for self",
  "targetUserName": "name of target user",
  "title": "task/reminder name",
  "description": "full description of what needs to be done",
  "dueDate": "YYYY-MM-DD or null",
  "dueTime": "HH:MM or null",
  "schedule": "once" | "daily" | "weekly" | "monthly",
  "points": number (suggest appropriate points 5-25),
  "recognitionMessage": "if type is recognition, the thank-you message",
  "confidence": "high" | "medium" | "low"
}

Interpret relative dates like "next Saturday" into actual dates. If the command mentions telling someone or asking someone to do something, it's a task assigned to that person. If it's about thanking or appreciating someone, it's a recognition. If it's a reminder for the user themselves, it's a reminder.`,
            messages: [{ role: "user", content: voiceTranscript }],
          }),
        });
        const data = await response.json();
        const text = data.content?.map((c) => c.text || "").join("") || "";
        const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
        setVoiceParsed(parsed);
        setVoiceMode("result");
      } catch (e) {
        setVoiceError("Could not understand the command. Please try again.");
        setVoiceMode("result");
      }
    };
    parse();
  }, [voiceMode, voiceTranscript, appData.users, appData.currentUserId]);

  const executeVoiceCommand = () => {
    if (!voiceParsed) return;
    const p = voiceParsed;

    if (p.type === "task") {
      const newTask = {
        id: uid(), name: p.title || p.description, description: p.description || "",
        schedule: p.schedule || "once",
        scheduleConfig: { frequency: p.schedule || "once", weeklyDays: [], monthlyDays: [] },
        taskType: p.schedule === "once" ? "one-time" : "permanent",
        tempConfig: null,
        dueConfig: p.dueDate ? { type: p.dueTime ? "datetime" : "date", date: p.dueDate, time: p.dueTime || "" } : { type: "none" },
        timeDue: p.dueTime || null,
        assignedTo: p.targetUserId ? [p.targetUserId] : [appData.currentUserId],
        assignMode: p.targetUserId || "me",
        rotation: null,
        points: p.points || 10,
        status: "assigned",
        lastCompleted: null,
        createdAt: new Date().toISOString(), createdBy: appData.currentUserId,
      };
      setAppData(prev => {
        const newData = { ...prev, tasks: [...prev.tasks, newTask] };
        saveData(newData);
        return newData;
      });
      if (p.targetUserId && p.targetUserId !== appData.currentUserId) {
        sendNotification(p.targetUserId, "task", `${currentUser?.name} assigned you a task: "${newTask.name}"${p.dueDate ? ` — due ${p.dueDate}` : ""}`, { taskId: newTask.id });
      }
      showToast(`Task created: "${newTask.name}" assigned to ${p.targetUserName || currentUser?.name}`);
    }

    if (p.type === "recognition" && p.targetUserId) {
      const recognition = {
        id: uid(), fromUserId: appData.currentUserId, toUserId: p.targetUserId,
        message: p.recognitionMessage || p.description || p.title,
        pointsAwarded: p.points || 5,
        timestamp: new Date().toISOString(),
      };
      setAppData(prev => {
        const updatedUsers = prev.users.map((u) =>
          u.id === p.targetUserId ? { ...u, pointBalance: (u.pointBalance || 0) + recognition.pointsAwarded } : u
        );
        const newData = { ...prev, recognitions: [...(prev.recognitions || []), recognition], users: updatedUsers };
        saveData(newData);
        return newData;
      });
      sendNotification(p.targetUserId, "recognition", `${currentUser?.name} recognized you: "${recognition.message}"${recognition.pointsAwarded > 0 ? ` (+${recognition.pointsAwarded} points)` : ""}`, { recognitionId: recognition.id });
      showToast(`Recognition sent to ${p.targetUserName}`);
    }

    if (p.type === "reminder") {
      const newTask = {
        id: uid(), name: p.title || p.description, description: p.description || "",
        schedule: "once",
        scheduleConfig: { frequency: "once" },
        taskType: "one-time",
        tempConfig: null,
        dueConfig: p.dueDate ? { type: p.dueTime ? "datetime" : "date", date: p.dueDate, time: p.dueTime || "" } : { type: "none" },
        timeDue: p.dueTime || null,
        assignedTo: [appData.currentUserId],
        assignMode: "me",
        rotation: null,
        points: 0,
        status: "assigned",
        lastCompleted: null,
        createdAt: new Date().toISOString(), createdBy: appData.currentUserId,
        isReminder: true,
      };
      setAppData(prev => {
        const newData = { ...prev, tasks: [...prev.tasks, newTask] };
        saveData(newData);
        return newData;
      });
      showToast(`Reminder set: "${newTask.name}"`);
    }

    setVoiceMode("idle");
    setVoiceParsed(null);
    setVoiceTranscript("");
  };

  const cancelVoice = () => {
    if (recognitionRef.current) try { recognitionRef.current.stop(); } catch {}
    setVoiceMode("idle");
    setVoiceParsed(null);
    setVoiceTranscript("");
    setVoiceError("");
  };

  const startTextCommand = () => {
    setTextCommandOpen(true);
    setTextCommandInput("");
    setTextShift(false);
    setTimeout(() => textInputRef.current?.focus(), 50);
  };

  const submitTextCommand = () => {
    if (!textCommandInput.trim()) return;
    setVoiceTranscript(textCommandInput.trim());
    setTextCommandOpen(false);
    setTextCommandInput("");
    setVoiceMode("processing");
  };

  const cancelTextCommand = () => {
    setTextCommandOpen(false);
    setTextCommandInput("");
  };

  const typeKey = (key) => {
    if (key === "SHIFT") { setTextShift(!textShift); return; }
    if (key === "BACK") { setTextCommandInput((v) => v.slice(0, -1)); return; }
    if (key === "SPACE") { setTextCommandInput((v) => v + " "); setTextShift(false); return; }
    const char = textShift ? key.toUpperCase() : key.toLowerCase();
    setTextCommandInput((v) => v + char);
    setTextShift(false);
    textInputRef.current?.focus();
  };

  const handleHiddenKeyDown = (e) => {
    e.preventDefault();
    if (e.key === "Enter") { submitTextCommand(); return; }
    if (e.key === "Backspace") { setTextCommandInput((v) => v.slice(0, -1)); return; }
    if (e.key === "Shift") { setTextShift(true); return; }
    if (e.key === "Escape") { cancelTextCommand(); return; }
    if (e.key.length === 1) {
      setTextCommandInput((v) => v + e.key);
      setTextShift(false);
    }
  };

  const handleHiddenKeyUp = (e) => {
    if (e.key === "Shift") setTextShift(false);
  };

  // ── Notification Engine ──
  const sendNotification = async (targetUserId, type, rawMessage, meta = {}) => {
    const sender = currentUser;
    const recipient = appData.users.find((u) => u.id === targetUserId);
    if (!recipient || targetUserId === appData.currentUserId) return;

    const tag = getSenderTag(appData.currentUserId, targetUserId);
    const rewritten = await rewriteForUser(rawMessage, sender?.name || "Someone", recipient.communicationProfile, tag);

    setPendingApproval({
      recipientName: recipient.name,
      recipientId: targetUserId,
      original: rawMessage,
      rewritten,
      senderTag: tag,
      type,
      meta,
      editMode: false,
      editText: "",
    });
  };

  const commitNotification = (approvedMessage) => {
    if (!pendingApproval) return;
    const notification = {
      id: uid(), type: pendingApproval.type,
      targetUserId: pendingApproval.recipientId,
      fromUserId: appData.currentUserId,
      rawMessage: pendingApproval.original,
      message: approvedMessage,
      read: false, timestamp: new Date().toISOString(),
      ...pendingApproval.meta,
    };
    setAppData(prev => {
      const newData = { ...prev, notifications: [...(prev.notifications || []), notification] };
      saveData(newData);
      return newData;
    });
    showToast(`Message sent to ${pendingApproval.recipientName}`);
    setPendingApproval(null);
  };

  const reRewriteForApproval = async (correctedText) => {
    if (!pendingApproval) return;
    const recipient = appData.users.find((u) => u.id === pendingApproval.recipientId);
    const tag = getSenderTag(appData.currentUserId, pendingApproval.recipientId);
    const rewritten = await rewriteForUser(correctedText, currentUser?.name || "Someone", recipient?.communicationProfile, tag);
    setPendingApproval((p) => ({ ...p, original: correctedText, rewritten, editMode: false, editText: "" }));
  };

  // Direct notification — bypasses approval, used for system events like task completions
  const sendDirectNotification = async (targetUserId, type, rawMessage, meta = {}) => {
    const sender = currentUser;
    const recipient = appData.users.find((u) => u.id === targetUserId);
    if (!recipient || targetUserId === appData.currentUserId) return;
    const tag = getSenderTag(appData.currentUserId, targetUserId);
    const rewritten = await rewriteForUser(rawMessage, sender?.name || "Someone", recipient.communicationProfile, tag);
    const notification = {
      id: uid(), type, targetUserId, fromUserId: appData.currentUserId,
      rawMessage, message: rewritten, read: false,
      timestamp: new Date().toISOString(), ...meta,
    };
    setAppData(prev => {
      const newData = { ...prev, notifications: [...(prev.notifications || []), notification] };
      saveData(newData);
      return newData;
    });
  };

  // System notification — sent from "Divvy" (the app), not a user
  const sendSystemNotification = async (targetUserId, type, rawMessage, meta = {}) => {
    const recipient = appData.users.find((u) => u.id === targetUserId);
    if (!recipient || targetUserId === appData.currentUserId) return;
    const rewritten = await rewriteForUser(rawMessage, "Divvy", recipient.communicationProfile, "Divvy");
    const notification = {
      id: uid(), type, targetUserId, fromUserId: "system",
      rawMessage, message: rewritten, read: false,
      timestamp: new Date().toISOString(), ...meta,
    };
    setAppData(prev => {
      const newData = { ...prev, notifications: [...(prev.notifications || []), notification] };
      saveData(newData);
      return newData;
    });
  };

  const markNotificationsRead = () => {
    setAppData(prev => {
      const updated = (prev.notifications || []).map((n) =>
        n.targetUserId === prev.currentUserId ? { ...n, read: true } : n
      );
      const newData = { ...prev, notifications: updated };
      saveData(newData);
      return newData;
    });
  };

  const myUnreadCount = useMemo(() => (appData.notifications || []).filter((n) => n.targetUserId === appData.currentUserId && !n.read).length, [appData.notifications, appData.currentUserId]);

  // TaskRow and SelectionBar — extracted to ../components/TaskRow.jsx and ../components/SelectionBar.jsx
  // Shared props helper objects for passing to extracted components:
  const taskRowProps = {
    users: appData.users,
    selectedTaskIds,
    onToggleSelect: toggleTaskSelection,
    onUncomplete: handleUncomplete,
    onDelete: handleDeleteTask,
    onEdit: onEditTask,
  };
  const selectionBarProps = {
    selectedTaskIds,
    setSelectedTaskIds,
    allTasks: appData.tasks,
    onRequestComplete: (tasks) => setCompletionDialogTasks(tasks),
  };

  // Header imported from ../components/Header

  // ════════════════════════════════════════════════════════════════
  // VOICE COMMAND OVERLAY (renders over any view)
  // ════════════════════════════════════════════════════════════════
  // VOICE — extracted to VoiceCommandOverlay.jsx
  if (voiceMode !== "idle") {
    return (<VoiceCommandOverlay voiceMode={voiceMode} voiceTranscript={voiceTranscript}
      voiceParsed={voiceParsed} voiceError={voiceError} startVoice={startVoice} stopVoice={stopVoice}
      cancelVoice={cancelVoice} executeVoiceCommand={executeVoiceCommand} />);
  }

  // ════════════════════════════════════════════════════════════════
  // MESSAGE APPROVAL OVERLAY (sender reviews before delivering)
  // ════════════════════════════════════════════════════════════════
  // APPROVAL — extracted to MessageApprovalOverlay.jsx
  if (pendingApproval) {
    return (<MessageApprovalOverlay pendingApproval={pendingApproval} setPendingApproval={setPendingApproval}
      commitNotification={commitNotification} reRewriteForApproval={reRewriteForApproval} />);
  }

  // ════════════════════════════════════════════════════════════════
  // TEXT COMMAND OVERLAY
  // ════════════════════════════════════════════════════════════════
  // TEXT COMMAND — extracted to TextCommandOverlay.jsx
  if (textCommandOpen) {
    return (<TextCommandOverlay textCommandInput={textCommandInput} setTextCommandInput={setTextCommandInput}
      textShift={textShift} setTextShift={setTextShift} textInputRef={textInputRef}
      submitTextCommand={submitTextCommand} cancelTextCommand={cancelTextCommand} />);
  }

  // ════════════════════════════════════════════════════════════════
  // HUB VIEW
  // ════════════════════════════════════════════════════════════════
  if (view === "hub") {
    const todayTasks = appData.tasks.filter((t) => !t.isReminder && isTaskDueToday(t));
    const todayReminders = appData.tasks.filter((t) => t.isReminder && isTaskDueToday(t));
    return (
      <PageShell narrow topNav>
        <div style={{ textAlign: "center", marginTop: 16, marginBottom: 32, animation: "fadeUp 0.4s ease both" }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 700, color: C.dark, letterSpacing: "-0.01em" }}>
            {appData.household?.name}
          </h1>
        </div>

        {/* Missing relationships warning */}
        {missingRelationships.length > 0 && (
          <button onClick={() => { setSelectedMemberId(appData.currentUserId); setView("memberDetail"); }} style={{
            all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
            width: "100%", padding: "14px 18px", marginBottom: 16,
            borderRadius: 14, background: "rgba(170,199,216,0.15)",
            border: `1.5px solid ${C.sky}`,
            animation: "fadeUp 0.3s ease both",
            boxSizing: "border-box",
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.navy} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
            </svg>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>
                {missingRelationships.length} relationship{missingRelationships.length !== 1 ? "s" : ""} to set up
              </p>
              <p style={{ fontSize: 12, color: C.steel, marginTop: 1 }}>
                Tap to update how you're related to {missingRelationships.map((u) => u.name).join(", ")}
              </p>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.steel} strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { key: "calendar", icon: (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.navy} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="17" rx="3"/><path d="M3 9h18M8 2v4M16 2v4"/>
              </svg>
            ), label: "Calendar", sub: new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) },
            { key: "tasks", icon: (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.navy} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 12l2 2 4-4"/>
              </svg>
            ), label: "Tasks", sub: `${todayTasks.length} due today` },
            { key: "reminders", icon: (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.navy} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
              </svg>
            ), label: "Reminders", sub: `${todayReminders.length} today` },
            { key: "recognition", icon: (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.navy} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
              </svg>
            ), label: "Recognition", sub: `${(appData.recognitions || []).length} shout-out${(appData.recognitions || []).length !== 1 ? "s" : ""}` },
            { key: "members", icon: (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.navy} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/><circle cx="19" cy="7" r="3"/><path d="M21 21v-2a3 3 0 00-2-2.83"/>
              </svg>
            ), label: "Members", sub: `${appData.users.length} member${appData.users.length !== 1 ? "s" : ""}` },
          ].map((item) => (
            <button key={item.key} onClick={() => setView(item.key)} style={{
              all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 18,
              padding: "22px 24px", borderRadius: 18,
              background: C.cardBg, backdropFilter: "blur(24px)",
              border: `1px solid ${C.borderLight}`,
              boxShadow: "0 4px 24px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.6)",
              animation: "fadeUp 0.4s ease both",
              transition: "all 0.2s",
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16, background: C.ice,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                {item.icon}
              </div>
              <div>
                <p style={{ fontWeight: 600, fontSize: 18, color: C.dark }}>{item.label}</p>
                <p style={{ fontSize: 13, color: C.steel, marginTop: 2 }}>{item.sub}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Command Buttons */}
        <div style={{ display: "flex", gap: 10, marginTop: 20, animation: "fadeUp 0.4s ease both" }}>
          <button onClick={startVoice} style={{
            all: "unset", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            flex: 1, padding: "16px 12px",
            borderRadius: 16, background: C.gradientPrimary,
            boxShadow: "0 4px 20px rgba(41,53,60,0.25)",
            transition: "all 0.2s",
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.white} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
              <path d="M19 10v2a7 7 0 01-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
            <span style={{ fontFamily: font, fontWeight: 600, fontSize: 14, color: C.white }}>Voice</span>
          </button>
          <button onClick={startTextCommand} style={{
            all: "unset", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            flex: 1, padding: "16px 12px",
            borderRadius: 16,
            background: `linear-gradient(135deg, ${C.navy} 0%, ${C.steel} 100%)`,
            boxShadow: "0 4px 20px rgba(41,53,60,0.25)",
            transition: "all 0.2s",
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.white} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
            <span style={{ fontFamily: font, fontWeight: 600, fontSize: 14, color: C.white }}>Text</span>
          </button>
        </div>

        {/* ── DEV ONLY: User Switcher ── */}
        <Card style={{ marginTop: 28, padding: "14px 18px", border: "2px dashed rgba(192,57,43,0.3)", background: "rgba(192,57,43,0.03)" }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: C.danger, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Dev — Switch User</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {appData.users.map((u) => {
              const isActive = u.id === appData.currentUserId;
              return (
                <button key={u.id} onClick={() => {
                  if (isActive) return;
                  setAppData(prev => {
                    const newData = { ...prev, currentUserId: u.id };
                    saveData(newData);
                    return newData;
                  });
                }} style={{
                  all: "unset", cursor: isActive ? "default" : "pointer",
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 12px", borderRadius: 10,
                  background: isActive ? C.ice : "transparent",
                  border: `1.5px solid ${isActive ? C.sky : C.border}`,
                  opacity: isActive ? 1 : 0.7,
                  transition: "all 0.15s",
                }}>
                  <Avatar name={u.name} type={u.type} size={24} image={u.avatar} crop={u.avatarCrop} />
                  <span style={{ fontSize: 13, fontWeight: isActive ? 700 : 500, color: isActive ? C.dark : C.steel }}>{u.name}</span>
                  {isActive && <span style={{ fontSize: 9, fontWeight: 700, color: C.navy, background: C.sky, padding: "2px 8px", borderRadius: 50, marginLeft: "auto", textTransform: "uppercase", letterSpacing: "0.06em" }}>Active</span>}
                </button>
              );
            })}
          </div>
        </Card>

        <div style={{ textAlign: "center", marginTop: 12 }}>
          <button onClick={handleReset} style={{ ...btnGhost, color: C.danger, fontSize: 13 }}>Reset everything</button>
        </div>
      </PageShell>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // MEMBERS VIEW
  // ════════════════════════════════════════════════════════════════
  // MEMBERS — extracted to MembersView.jsx
  if (view === "members") {
    return (<MembersView appData={appData} currentUser={currentUser}
      onSelectMember={(id) => { setSelectedMemberId(id); setView("memberDetail"); }}
      onAddMember={onAddMember} onBack={() => setView("hub")} />);
  }

  // ════════════════════════════════════════════════════════════════
  // PERSONAL MEMBER PAGE
  // ════════════════════════════════════════════════════════════════
  // MEMBER DETAIL — extracted to MemberDetailView.jsx
  if (view === "memberDetail" && selectedMember) {
    return (<MemberDetailView appData={appData} setAppData={setAppData}
      selectedMember={selectedMember} currentUser={currentUser} showToast={showToast}
      onBack={() => { setView("members"); setSelectedTaskIds([]); }}
      selectedTaskIds={selectedTaskIds} setSelectedTaskIds={setSelectedTaskIds}
      completionDialogTasks={completionDialogTasks} setCompletionDialogTasks={setCompletionDialogTasks}
      handleBulkComplete={handleBulkComplete} taskRowProps={taskRowProps} selectionBarProps={selectionBarProps} />);
  }

  // ════════════════════════════════════════════════════════════════
  // TASKS VIEW
  // ════════════════════════════════════════════════════════════════
  // TASKS — extracted to TasksView.jsx
  if (view === "tasks") {
    return (<TasksView appData={appData} setAppData={setAppData} currentUser={currentUser}
      showToast={showToast} onBack={() => setView("hub")} onCreateTask={onCreateTask}
      selectedTaskIds={selectedTaskIds} setSelectedTaskIds={setSelectedTaskIds}
      completionDialogTasks={completionDialogTasks} setCompletionDialogTasks={setCompletionDialogTasks}
      handleBulkComplete={handleBulkComplete} taskRowProps={taskRowProps} selectionBarProps={selectionBarProps} />);
  }

  // ════════════════════════════════════════════════════════════════
  // REMINDERS VIEW
  // ════════════════════════════════════════════════════════════════
  // REMINDERS — extracted to RemindersView.jsx
  if (view === "reminders") {
    return (<RemindersView appData={appData} onBack={() => setView("hub")}
      onCreateReminder={onCreateReminder} onDeleteTask={handleDeleteTask}
      taskRowProps={taskRowProps} />);
  }

  // ════════════════════════════════════════════════════════════════
  // CALENDAR VIEW
  // ════════════════════════════════════════════════════════════════
  if (view === "calendar") {
    return (
      <>
      <PageShell narrow topNav>
        <Header title="Calendar" onBack={() => setView("hub")} />
        <CalendarView appData={appData} onRequestComplete={(tasks) => setCompletionDialogTasks(tasks)} />
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

  // ════════════════════════════════════════════════════════════════
  // RECOGNITION VIEW
  // ════════════════════════════════════════════════════════════════
  // RECOGNITION VIEW — extracted to RecognitionView.jsx
  if (view === "recognition" || view === "sendRecognition") {
    return (<RecognitionView appData={appData} setAppData={setAppData} currentUser={currentUser}
      showToast={showToast} sendNotification={sendNotification} onBack={() => setView("hub")} />);
  }

  // ════════════════════════════════════════════════════════════════
  // SEND RECOGNITION FLOW
  // ════════════════════════════════════════════════════════════════
  // sendRecognition handled by RecognitionView

// ════════════════════════════════════════════════════════════════
  // SETTINGS VIEW
  // ════════════════════════════════════════════════════════════════
  // SETTINGS VIEW — extracted to SettingsView.jsx
  if (view === "settings") {
    return (<SettingsView appData={appData} setAppData={setAppData} currentUser={currentUser}
      showToast={showToast} onBack={() => setView("hub")} />);
  }

  // ════════════════════════════════════════════════════════════════
  // NOTIFICATIONS VIEW
  // ════════════════════════════════════════════════════════════════
  // NOTIFICATIONS — extracted to NotificationsView.jsx
  if (view === "notifications") {
    return (<NotificationsView appData={appData} setAppData={setAppData} currentUser={currentUser}
      showToast={showToast} sendNotification={sendNotification}
      sendDirectNotification={sendDirectNotification} onBack={() => setView("hub")} />);
  }

  return null;
}
