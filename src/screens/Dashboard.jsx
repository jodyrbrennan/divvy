import { useState, useEffect, useRef, useMemo } from "react";
import { C, font } from "../constants/colors";
import { btnBase, btnGhost } from "../constants/styles";
import { uid, saveData, defaultData } from "../utils/storage";
import { createNotification } from "../utils/notificationHelpers";
import { rewriteForUser } from "../utils/communication";
import { askOllama } from "../utils/aiConfig";
import { isTaskDueToday } from "../utils/taskHelpers";

// Phase 7.1: Import the context hook instead of receiving props
import { useAppData } from "../contexts/AppDataContext";

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
import BalanceReportView from "./BalanceReportView";
import HouseholdFeed from "./HouseholdFeed";
import MemberDetailView from "./MemberDetailView";
import Header from "../components/Header";
import VoiceCommandOverlay from "../components/VoiceCommandOverlay";
import TextCommandOverlay from "../components/TextCommandOverlay";
import MessageApprovalOverlay from "../components/MessageApprovalOverlay";
import TaskCompletionDialog from "../components/TaskCompletionDialog";
import TaskRow from "../components/TaskRow";
import SelectionBar from "../components/SelectionBar";


// ─── Dashboard ─────────────────────────────────────────────────
// Phase 7.1: Removed appData and setAppData from props — now pulled from context.
// Only navigation callbacks and App-owned UI state remain as props.
export default function Dashboard({ onAddMember, onCreateTask, onCreateReminder, onEditTask, onCreateEvent, onEditEvent, requestedView, clearRequestedView, pendingPreview, clearPendingPreview }) {
  // Phase 7.1: Pull data from context instead of props
  const { appData, setAppData, currentUser, currentUserId } = useAppData();

  const [view, setView] = useState("hub");
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
    const userId = completerId || currentUserId;

    setAppData(prev => {
      const newData = completeTasksCore(prev, [taskId], userId);
      if (!newData) return prev;
      saveData(newData);
      return newData;
    });

    if (userId !== currentUserId) {
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
    if (u.id === currentUserId) return false;
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
        const systemPrompt = `You are a voice command parser for a household task app called Divvy. Parse the user's voice command and return ONLY valid JSON with no markdown or backticks.

Current user: ${currentUser?.name} (id: ${currentUserId})
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

Interpret relative dates like "next Saturday" into actual dates. If the command mentions telling someone or asking someone to do something, it's a task assigned to that person. If it's about thanking or appreciating someone, it's a recognition. If it's a reminder for the user themselves, it's a reminder.`;

        const text = await askOllama(systemPrompt, voiceTranscript);
        if (!text) throw new Error("No response from Ollama");
        const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
        setVoiceParsed(parsed);
        setVoiceMode("result");
      } catch (e) {
        setVoiceError("Could not understand the command. Please try again.");
        setVoiceMode("result");
      }
    };
    parse();
  }, [voiceMode, voiceTranscript, appData.users, currentUserId]);

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
        assignedTo: p.targetUserId ? [p.targetUserId] : [currentUserId],
        assignMode: p.targetUserId || "me",
        rotation: null,
        points: p.points || 10,
        status: "assigned",
        lastCompleted: null,
        createdAt: new Date().toISOString(), createdBy: currentUserId,
      };
      setAppData(prev => {
        const newData = { ...prev, tasks: [...prev.tasks, newTask] };
        saveData(newData);
        return newData;
      });
      if (p.targetUserId && p.targetUserId !== currentUserId) {
        sendNotification(p.targetUserId, "task", `${currentUser?.name} assigned you a task: "${newTask.name}"${p.dueDate ? ` — due ${p.dueDate}` : ""}`, { taskId: newTask.id });
      }
      showToast(`Task created: "${newTask.name}" assigned to ${p.targetUserName || currentUser?.name}`);
    }

    if (p.type === "recognition" && p.targetUserId) {
      const recognition = {
        id: uid(), fromUserId: currentUserId, toUserId: p.targetUserId,
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
        assignedTo: [currentUserId],
        assignMode: "me",
        rotation: null,
        points: 0,
        status: "assigned",
        lastCompleted: null,
        createdAt: new Date().toISOString(), createdBy: currentUserId,
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
    if (!recipient || targetUserId === currentUserId) return;

    const tag = getSenderTag(currentUserId, targetUserId);
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
      fromUserId: currentUserId,
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
    const tag = getSenderTag(currentUserId, pendingApproval.recipientId);
    const rewritten = await rewriteForUser(correctedText, currentUser?.name || "Someone", recipient?.communicationProfile, tag);
    setPendingApproval((p) => ({ ...p, original: correctedText, rewritten, editMode: false, editText: "" }));
  };

  // Direct notification — bypasses approval, used for system events like task completions
  const sendDirectNotification = async (targetUserId, type, rawMessage, meta = {}) => {
    const sender = currentUser;
    const recipient = appData.users.find((u) => u.id === targetUserId);
    if (!recipient || targetUserId === currentUserId) return;
    const tag = getSenderTag(currentUserId, targetUserId);
    const rewritten = await rewriteForUser(rawMessage, sender?.name || "Someone", recipient.communicationProfile, tag);
    const notification = {
      id: uid(), type, targetUserId, fromUserId: currentUserId,
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
    if (!recipient || targetUserId === currentUserId) return;
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

  const myUnreadCount = useMemo(() => (appData.notifications || []).filter((n) => n.targetUserId === currentUserId && !n.read).length, [appData.notifications, currentUserId]);

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
  if (voiceMode !== "idle") {
    return (<VoiceCommandOverlay voiceMode={voiceMode} voiceTranscript={voiceTranscript}
      voiceParsed={voiceParsed} voiceError={voiceError} startVoice={startVoice} stopVoice={stopVoice}
      cancelVoice={cancelVoice} executeVoiceCommand={executeVoiceCommand} />);
  }

  // ════════════════════════════════════════════════════════════════
  // MESSAGE APPROVAL OVERLAY
  // ════════════════════════════════════════════════════════════════
  if (pendingApproval) {
    return (<MessageApprovalOverlay pendingApproval={pendingApproval} setPendingApproval={setPendingApproval}
      commitNotification={commitNotification} reRewriteForApproval={reRewriteForApproval} />);
  }

  // ════════════════════════════════════════════════════════════════
  // TEXT COMMAND OVERLAY
  // ════════════════════════════════════════════════════════════════
  if (textCommandOpen) {
    return (<TextCommandOverlay textCommandInput={textCommandInput} setTextCommandInput={setTextCommandInput}
      textShift={textShift} setTextShift={setTextShift} textInputRef={textInputRef}
      submitTextCommand={submitTextCommand} cancelTextCommand={cancelTextCommand} />);
  }

  // ════════════════════════════════════════════════════════════════
  // SIDEBAR + CONTENT LAYOUT
  // ════════════════════════════════════════════════════════════════
  const SIDEBAR_W = 200;
  const SIDEBAR_COLLAPSED = 56;
  const NAV_ITEMS = [
    { key: "hub", label: "Home", icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><path d="M9 22V12h6v10"/>
      </svg>
    ) },
    { key: "calendar", label: "Calendar", icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="17" rx="3"/><path d="M3 9h18M8 2v4M16 2v4"/>
      </svg>
    ) },
    { key: "events", label: "Events", icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
    ) },
    { key: "tasks", label: "Tasks", icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 12l2 2 4-4"/>
      </svg>
    ) },
    { key: "reminders", label: "Reminders", icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
      </svg>
    ) },
    { key: "recognition", label: "Recognition", icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
      </svg>
    ) },
    { key: "balance", label: "Balance", icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 20V10M12 20V4M6 20v-6"/>
      </svg>
    ) },
    { key: "members", label: "Members", icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/>
      </svg>
    ) },
  ];

  const renderContent = () => {
    switch (view) {
      case "hub":
        return (
          <PageShell narrow topNav>
            {/* Missing relationships warning */}
            {missingRelationships.length > 0 && (
              <button onClick={() => { setSelectedMemberId(currentUserId); setView("memberDetail"); }} style={{
                all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
                width: "100%", padding: "14px 18px", marginBottom: 16, borderRadius: 14,
                background: "rgba(170,199,216,0.15)", border: `1.5px solid ${C.sky}`, boxSizing: "border-box",
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.navy} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
                </svg>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{missingRelationships.length} relationship{missingRelationships.length !== 1 ? "s" : ""} to set up</p>
                  <p style={{ fontSize: 12, color: C.steel, marginTop: 1 }}>Tap to update how you're related to {missingRelationships.map((u) => u.name).join(", ")}</p>
                </div>
              </button>
            )}

            <HouseholdFeed onStartVoice={startVoice} onStartText={startTextCommand} />

            {/* DEV: User Switcher */}
            <Card style={{ marginTop: 28, padding: "14px 18px", border: "2px dashed rgba(192,57,43,0.3)", background: "rgba(192,57,43,0.03)" }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: C.danger, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Dev — Switch User</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {appData.users.map((u) => {
                  const isActive = u.id === currentUserId;
                  return (
                    <button key={u.id} onClick={() => {
                      if (isActive) return;
                      setAppData(prev => { const newData = { ...prev, currentUserId: u.id }; saveData(newData); return newData; });
                    }} style={{
                      all: "unset", cursor: isActive ? "default" : "pointer",
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "8px 12px", borderRadius: 10,
                      background: isActive ? C.ice : "transparent",
                      border: `1.5px solid ${isActive ? C.sky : C.border}`,
                      opacity: isActive ? 1 : 0.7,
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

      case "members":
        return (<MembersView onSelectMember={(id) => { setSelectedMemberId(id); setView("memberDetail"); }}
          onAddMember={onAddMember} onBack={() => setView("hub")} />);

      case "memberDetail":
        return selectedMember ? (<MemberDetailView
          selectedMember={selectedMember} showToast={showToast}
          onBack={() => { setView("members"); setSelectedTaskIds([]); }}
          selectedTaskIds={selectedTaskIds} setSelectedTaskIds={setSelectedTaskIds}
          completionDialogTasks={completionDialogTasks} setCompletionDialogTasks={setCompletionDialogTasks}
          handleBulkComplete={handleBulkComplete} taskRowProps={taskRowProps} selectionBarProps={selectionBarProps} />) : null;

      case "tasks":
        return (<TasksView showToast={showToast} onBack={() => setView("hub")} onCreateTask={onCreateTask}
          selectedTaskIds={selectedTaskIds} setSelectedTaskIds={setSelectedTaskIds}
          completionDialogTasks={completionDialogTasks} setCompletionDialogTasks={setCompletionDialogTasks}
          handleBulkComplete={handleBulkComplete} taskRowProps={taskRowProps} selectionBarProps={selectionBarProps} />);

      case "reminders":
        return (<RemindersView onBack={() => setView("hub")}
          onCreateReminder={onCreateReminder} onDeleteTask={handleDeleteTask}
          taskRowProps={taskRowProps} />);

      case "balance":
        return (<BalanceReportView onBack={() => setView("hub")} />);

      case "events": {
        const allEvents = (appData.events || []).sort((a, b) => new Date(a.date) - new Date(b.date));
        const EVENT_CFG = { birthday: { emoji: "🎂", color: "#E67E22" }, appointment: { emoji: "🏥", color: "#8E44AD" }, gathering: { emoji: "🎉", color: "#E74C3C" }, school: { emoji: "📚", color: "#2980B9" }, holiday: { emoji: "🌟", color: "#F1C40F" }, travel: { emoji: "✈️", color: "#1ABC9C" }, other: { emoji: "📌", color: "#7F8C8D" } };
        const formatEvtDate = (d) => d ? new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : "";
        return (
          <PageShell narrow topNav>
            <Header title="Events" onBack={() => setView("hub")} />
            <button onClick={onCreateEvent} style={{
              all: "unset", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              width: "100%", padding: "14px 16px", borderRadius: 14, marginBottom: 20, boxSizing: "border-box",
              background: C.gradientPrimary, color: C.white, boxShadow: "0 4px 20px rgba(41,53,60,0.25)",
              fontFamily: font, fontWeight: 600, fontSize: 14,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
              Add Event
            </button>
            {allEvents.length === 0 ? (
              <Card style={{ textAlign: "center", padding: "32px 20px" }}>
                <p style={{ fontSize: 22, marginBottom: 8 }}>📅</p>
                <p style={{ fontSize: 15, fontWeight: 600, color: C.dark, marginBottom: 4 }}>No events yet</p>
                <p style={{ fontSize: 13, color: C.steel }}>Add birthdays, appointments, gatherings, and more.</p>
              </Card>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {allEvents.map((evt) => {
                  const cfg = EVENT_CFG[evt.eventType] || EVENT_CFG.other;
                  const linkedNames = (evt.linkedMembers || []).map((id) => appData.users.find((u) => u.id === id)?.name).filter(Boolean).join(", ");
                  return (
                    <Card key={evt.id} style={{ padding: "14px 18px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ fontSize: 24 }}>{cfg.emoji}</span>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontWeight: 600, fontSize: 15, color: C.dark }}>{evt.name}</p>
                          <div style={{ display: "flex", gap: 8, marginTop: 3, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 12, color: C.steel }}>{formatEvtDate(evt.date)}</span>
                            {evt.time && <span style={{ fontSize: 12, color: C.steel }}>at {evt.time}</span>}
                            {evt.recurrence === "yearly" && <span style={{ fontSize: 11, fontWeight: 600, color: cfg.color }}>Yearly</span>}
                          </div>
                          {linkedNames && <p style={{ fontSize: 12, color: C.steel, marginTop: 3 }}>{linkedNames}</p>}
                          {evt.description && <p style={{ fontSize: 13, color: C.dark, marginTop: 6, lineHeight: 1.4 }}>{evt.description}</p>}
                        </div>
                        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                          <button onClick={() => onEditEvent(evt)} style={{ ...btnBase, padding: "6px 12px", fontSize: 11, borderRadius: 8, background: C.ice, color: C.navy }}>Edit</button>
                          <button onClick={() => {
                            if (window.confirm(`Delete "${evt.name}"?`)) {
                              setAppData((prev) => { const newData = { ...prev, events: (prev.events || []).filter((e) => e.id !== evt.id) }; saveData(newData); return newData; });
                            }
                          }} style={{ ...btnBase, padding: "6px 12px", fontSize: 11, borderRadius: 8, background: "rgba(192,57,43,0.06)", color: C.danger }}>Delete</button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </PageShell>
        );
      }

      case "calendar":
        return (
          <>
          <PageShell narrow topNav>
            <Header title="Calendar" onBack={() => setView("hub")} />
            <CalendarView onRequestComplete={(tasks) => setCompletionDialogTasks(tasks)} onEditEvent={onEditEvent} />
            <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
              <button onClick={onCreateEvent} style={{
                all: "unset", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                flex: 1, padding: "14px 16px", borderRadius: 14,
                background: C.gradientPrimary, color: C.white,
                boxShadow: "0 4px 20px rgba(41,53,60,0.25)",
                fontFamily: font, fontWeight: 600, fontSize: 14,
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                Add Event
              </button>
            </div>
          </PageShell>
          {completionDialogTasks && (
            <TaskCompletionDialog tasks={completionDialogTasks} users={appData.users}
              currentUserId={currentUserId} onConfirm={handleBulkComplete}
              onCancel={() => setCompletionDialogTasks(null)} />
          )}
          </>
        );

      case "recognition":
      case "sendRecognition":
        return (<RecognitionView showToast={showToast} sendNotification={sendNotification} onBack={() => setView("hub")} />);

      case "settings":
        return (<SettingsView showToast={showToast} onBack={() => setView("hub")} />);

      case "notifications":
        return (<NotificationsView showToast={showToast} sendNotification={sendNotification}
          sendDirectNotification={sendDirectNotification} onBack={() => setView("hub")} />);

      default:
        return null;
    }
  };

  const currentSidebarW = sidebarOpen ? SIDEBAR_W : SIDEBAR_COLLAPSED;

  return (
    <>
      {/* ── Fixed Sidebar ── */}
      <nav style={{
        position: "fixed", left: 0, top: 0, bottom: 0,
        width: currentSidebarW, zIndex: 90,
        background: "rgba(255,255,255,0.85)", backdropFilter: "blur(20px)",
        borderRight: `1px solid ${C.border}`,
        display: "flex", flexDirection: "column",
        padding: "72px 0 16px",
        overflowY: "auto", overflowX: "hidden",
        transition: "width 0.25s cubic-bezier(.4,0,.2,1)",
      }}>
        {/* Toggle button */}
        <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{
          all: "unset", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: sidebarOpen ? "flex-end" : "center",
          padding: sidebarOpen ? "6px 14px" : "6px 0",
          marginBottom: 4, width: "100%", boxSizing: "border-box",
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.steel} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ transition: "transform 0.25s", transform: sidebarOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>

        {/* Nav Items */}
        <div style={{ flex: 1, padding: sidebarOpen ? "4px 10px" : "4px 6px", display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV_ITEMS.map((item) => {
            const isActive = view === item.key;
            return (
              <button key={item.key} onClick={() => setView(item.key)} title={!sidebarOpen ? item.label : undefined} style={{
                all: "unset", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 12,
                padding: sidebarOpen ? "10px 14px" : "10px 0",
                justifyContent: sidebarOpen ? "flex-start" : "center",
                borderRadius: 12,
                background: isActive ? C.ice : "transparent",
                color: isActive ? C.navy : C.steel,
                fontFamily: font, fontSize: 13, fontWeight: isActive ? 700 : 500,
                transition: "all 0.15s",
                whiteSpace: "nowrap", overflow: "hidden",
              }}>
                <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", width: 20, height: 20 }}>
                  {item.icon}
                </div>
                {sidebarOpen && <span style={{ opacity: 1, transition: "opacity 0.2s" }}>{item.label}</span>}
              </button>
            );
          })}
        </div>

        {/* Bottom section */}
        <div style={{ padding: sidebarOpen ? "8px 10px" : "8px 6px", borderTop: `1px solid ${C.border}`, display: "flex", flexDirection: "column", gap: 2 }}>
          <button onClick={() => setView("notifications")} title={!sidebarOpen ? "Notifications" : undefined} style={{
            all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
            padding: sidebarOpen ? "10px 14px" : "10px 0",
            justifyContent: sidebarOpen ? "flex-start" : "center",
            borderRadius: 12, position: "relative",
            background: view === "notifications" ? C.ice : "transparent",
            color: view === "notifications" ? C.navy : C.steel,
            fontFamily: font, fontSize: 13, fontWeight: view === "notifications" ? 700 : 500,
          }}>
            <div style={{ position: "relative", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", width: 20, height: 20 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
              </svg>
              {!sidebarOpen && myUnreadCount > 0 && (
                <span style={{ position: "absolute", top: -4, right: -6, fontSize: 8, fontWeight: 700, color: C.white,
                  background: C.danger, borderRadius: 50, padding: "1px 4px", minWidth: 12, textAlign: "center", lineHeight: "12px",
                }}>{myUnreadCount}</span>
              )}
            </div>
            {sidebarOpen && <span>Notifications</span>}
            {sidebarOpen && myUnreadCount > 0 && (
              <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, color: C.white,
                background: C.danger, borderRadius: 50, padding: "2px 7px", minWidth: 16, textAlign: "center",
              }}>{myUnreadCount}</span>
            )}
          </button>
          <button onClick={() => setView("settings")} title={!sidebarOpen ? "Settings" : undefined} style={{
            all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
            padding: sidebarOpen ? "10px 14px" : "10px 0",
            justifyContent: sidebarOpen ? "flex-start" : "center",
            borderRadius: 12,
            background: view === "settings" ? C.ice : "transparent",
            color: view === "settings" ? C.navy : C.steel,
            fontFamily: font, fontSize: 13, fontWeight: view === "settings" ? 700 : 500,
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
            {sidebarOpen && <span>Settings</span>}
          </button>
        </div>
      </nav>

      {/* ── Main Content (offset by sidebar width) ── */}
      <div style={{ marginLeft: currentSidebarW, transition: "margin-left 0.25s cubic-bezier(.4,0,.2,1)" }}>
        {renderContent()}
      </div>

      {/* ── Task Completion Dialog ── */}
      {completionDialogTasks && view !== "calendar" && (
        <TaskCompletionDialog tasks={completionDialogTasks} users={appData.users}
          currentUserId={currentUserId} onConfirm={handleBulkComplete}
          onCancel={() => setCompletionDialogTasks(null)} />
      )}
    </>
  );
}
