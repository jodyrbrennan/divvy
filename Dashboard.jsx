import { useState, useEffect, useRef } from "react";
import { C, font, fontDisplay } from "../constants/colors";
import { btnBase, btnPrimary, btnSecondary, btnGhost, inputStyle, labelStyle } from "../constants/styles";
import { uid, saveData, defaultData } from "../utils/storage";
import { rewriteForUser } from "../utils/communication";
import { RECIPROCAL, propagateRelationships } from "../utils/relationships";
import { getScheduleLabel, isTaskDueToday } from "../utils/taskHelpers";
import { useToast } from "../components/Toast";
import PageShell from "../components/PageShell";
import Card from "../components/Card";
import Avatar from "../components/Avatar";
import Divider from "../components/Divider";
import Select from "../components/Select";
import Chip from "../components/Chip";
import HoldOption from "../components/HoldOption";
import { CheckCircleIcon, PlusIcon, RepeatIcon, StarIcon } from "../components/Icons";
import CalendarView from "./CalendarView";
import TaskCompletionDialog from "../components/TaskCompletionDialog";

// ─── Dashboard ─────────────────────────────────────────────────
export default function Dashboard({ appData, setAppData, onAddMember, onCreateTask, onEditTask, requestedView, clearRequestedView, pendingPreview, clearPendingPreview }) {
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
  const [showReports, setShowReports] = useState(false);
  const showToast = useToast();
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [recoStep, setRecoStep] = useState(0); // 0=pick member, 1=write message, 2=set points
  const [recoTarget, setRecoTarget] = useState(null);
  const [recoMessage, setRecoMessage] = useState("");
  const [recoPoints, setRecoPoints] = useState(5);
  const [newRewardName, setNewRewardName] = useState("");
  const [newRewardCost, setNewRewardCost] = useState(50);
  const [historyOpen, setHistoryOpen] = useState(null); // "sentMsg","rcvdMsg","sentReco","rcvdReco"
  const [historySelected, setHistorySelected] = useState([]);
  const [historyAutoDelete, setHistoryAutoDelete] = useState(null);
  const [pendingApproval, setPendingApproval] = useState(null);
  const [taskCompletedByOther, setTaskCompletedByOther] = useState(null); // { task, completerId, completerName } // { recipientName, recipientId, original, rewritten, type, onApprove, editMode, editText } // shows auto-delete picker
  const [voiceMode, setVoiceMode] = useState("idle"); // idle, listening, processing, result
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceParsed, setVoiceParsed] = useState(null);
  const [voiceError, setVoiceError] = useState("");
  const [textCommandOpen, setTextCommandOpen] = useState(false);
  const [textCommandInput, setTextCommandInput] = useState("");
  const [textShift, setTextShift] = useState(false);
  const textInputRef = useRef(null);
  const recognitionRef = useRef(null);
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

  const handleCropSave = async () => {
    if (!cropImage || !selectedMemberId) return;
    const updatedUsers = appData.users.map((u) =>
      u.id === selectedMemberId ? { ...u, avatar: cropImage, avatarCrop: { zoom: cropZoom, x: cropOffset.x, y: cropOffset.y } } : u
    );
    const newData = { ...appData, users: updatedUsers };
    setAppData(newData);
    await saveData(newData);
    setAvatarCropMode(false);
    setCropImage(null);
    setShowAvatarPicker(false);
  };

  const handleCropCancel = () => {
    setAvatarCropMode(false);
    setCropImage(null);
  };

  const handleDeleteAvatar = async () => {
    if (!selectedMemberId) return;
    const updatedUsers = appData.users.map((u) =>
      u.id === selectedMemberId ? { ...u, avatar: null, avatarCrop: null } : u
    );
    const newData = { ...appData, users: updatedUsers };
    setAppData(newData);
    await saveData(newData);
    setShowAvatarPicker(false);
  };

  const handleEditExistingPhoto = () => {
    const member = appData.users.find((u) => u.id === selectedMemberId);
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

  const handleReset = async () => {
    const fresh = defaultData();
    setAppData(fresh);
    await saveData(fresh);
  };

  const handleComplete = async (taskId, completerId) => {
    const task = appData.tasks.find((t) => t.id === taskId);
    if (!task) return;
    const userId = completerId || appData.currentUserId;
    const completion = { id: uid(), taskId, userId, timestamp: new Date().toISOString(), pointsEarned: task.points || 0 };
    const updatedTasks = appData.tasks.map((t) => t.id === taskId ? { ...t, lastCompleted: completion.timestamp, status: "completed" } : t);
    const updatedUsers = appData.users.map((u) => u.id === userId ? { ...u, pointBalance: (u.pointBalance || 0) + (task.points || 0) } : u);
    const newData = { ...appData, tasks: updatedTasks, users: updatedUsers, completions: [...appData.completions, completion] };
    setAppData(newData); await saveData(newData);

    const completerName = appData.users.find((u) => u.id === userId)?.name || "Someone";
    const assignees = task.assignedTo || [];
    const completedForOthers = assignees.filter((id) => id !== userId);

    if (task.createdBy && task.createdBy !== userId) {
      sendSystemNotification(task.createdBy, "completion", `${completerName} completed the task: "${task.name}"`, { taskId, completedBy: userId });
    }

    for (const uid2 of completedForOthers) {
      sendSystemNotification(uid2, "completion", `${completerName} completed your task: "${task.name}"`, { taskId, completedBy: userId });
    }

    if (userId !== appData.currentUserId) {
      showToast(`Marked "${task.name}" complete for ${completerName}`);
    }
  };

  const handleBulkComplete = async (completerId) => {
    if (!completionDialogTasks || completionDialogTasks.length === 0) return;

    const userId = completerId;
    const now = new Date().toISOString();
    let totalPoints = 0;

    const newCompletions = completionDialogTasks.map((task) => {
      totalPoints += (task.points || 0);
      return { id: uid(), taskId: task.id, userId, timestamp: now, pointsEarned: task.points || 0 };
    });

    const completedIds = new Set(completionDialogTasks.map((t) => t.id));
    const updatedTasks = appData.tasks.map((t) =>
      completedIds.has(t.id) ? { ...t, lastCompleted: now, status: "completed" } : t
    );

    const updatedUsers = appData.users.map((u) =>
      u.id === userId ? { ...u, pointBalance: (u.pointBalance || 0) + totalPoints } : u
    );

    const newData = {
      ...appData,
      tasks: updatedTasks,
      users: updatedUsers,
      completions: [...appData.completions, ...newCompletions],
    };

    // Send notifications
    const completerName = appData.users.find((u) => u.id === userId)?.name || "Someone";
    for (const task of completionDialogTasks) {
      if (task.createdBy && task.createdBy !== userId) {
        sendSystemNotification(task.createdBy, "completion", `${completerName} completed the task: "${task.name}"`, { taskId: task.id, completedBy: userId });
      }
      const others = (task.assignedTo || []).filter((id) => id !== userId);
      for (const otherId of others) {
        sendSystemNotification(otherId, "completion", `${completerName} completed your task: "${task.name}"`, { taskId: task.id, completedBy: userId });
      }
    }

    const count = completionDialogTasks.length;
    setCompletionDialogTasks(null);
    setSelectedTaskIds([]);
    setAppData(newData);
    await saveData(newData);
    showToast(`${count} task${count !== 1 ? "s" : ""} marked complete`);
  };

  const toggleTaskSelection = (taskId) => {
    setSelectedTaskIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  const handleUncomplete = async (taskId) => {
    const updatedTasks = appData.tasks.map((t) => t.id === taskId ? { ...t, lastCompleted: null, status: "assigned" } : t);
    const idx = [...appData.completions].reverse().findIndex((c) => c.taskId === taskId);
    let updatedCompletions = [...appData.completions];
    let pointsBack = 0;
    if (idx !== -1) { const realIdx = appData.completions.length - 1 - idx; pointsBack = appData.completions[realIdx].pointsEarned || 0; updatedCompletions.splice(realIdx, 1); }
    const updatedUsers = appData.users.map((u) => u.id === appData.currentUserId ? { ...u, pointBalance: Math.max(0, (u.pointBalance || 0) - pointsBack) } : u);
    const newData = { ...appData, tasks: updatedTasks, users: updatedUsers, completions: updatedCompletions };
    setAppData(newData); await saveData(newData);
  };

  const handleDeleteTask = async (taskId) => {
    const newData = { ...appData, tasks: appData.tasks.filter((t) => t.id !== taskId), completions: appData.completions.filter((c) => c.taskId !== taskId) };
    setAppData(newData); await saveData(newData);
  };

  const getUserName = (id) => appData.users.find((u) => u.id === id)?.name || "Unassigned";
  const selectedMember = appData.users.find((u) => u.id === selectedMemberId);

  // ── Recognition handlers ──
  const handleSendRecognition = async () => {
    if (!recoTarget || !recoMessage.trim()) return;
    const recognition = {
      id: uid(), fromUserId: appData.currentUserId, toUserId: recoTarget,
      message: recoMessage.trim(), pointsAwarded: Math.max(0, parseInt(recoPoints) || 0),
      timestamp: new Date().toISOString(),
    };
    const updatedUsers = appData.users.map((u) =>
      u.id === recoTarget ? { ...u, pointBalance: (u.pointBalance || 0) + recognition.pointsAwarded } : u
    );
    const newData = { ...appData, recognitions: [...(appData.recognitions || []), recognition], users: updatedUsers };
    setAppData(newData); await saveData(newData);
    sendNotification(recoTarget, "recognition", `${currentUser?.name} recognized you: "${recoMessage.trim()}"${recognition.pointsAwarded > 0 ? ` (+${recognition.pointsAwarded} points)` : ""}`, { recognitionId: recognition.id });
    setRecoTarget(null); setRecoMessage(""); setRecoPoints(5); setRecoStep(0);
    setView("recognition");
  };

  const resetRecoFlow = () => { setRecoTarget(null); setRecoMessage(""); setRecoPoints(5); setRecoStep(0); };

  // ── Reward handlers ──
  const handleAddReward = async () => {
    if (!newRewardName.trim() || !selectedMemberId) return;
    const reward = { id: uid(), name: newRewardName.trim(), pointCost: Math.max(1, parseInt(newRewardCost) || 50), assignedTo: selectedMemberId, createdBy: appData.currentUserId };
    const newData = { ...appData, rewards: [...(appData.rewards || []), reward] };
    setAppData(newData); await saveData(newData);
    setNewRewardName(""); setNewRewardCost(50);
  };

  const handleDeleteReward = async (rewardId) => {
    const newData = { ...appData, rewards: (appData.rewards || []).filter((r) => r.id !== rewardId) };
    setAppData(newData); await saveData(newData);
  };

  const handleRedeemReward = async (reward) => {
    const member = appData.users.find((u) => u.id === reward.assignedTo);
    if (!member || (member.pointBalance || 0) < reward.pointCost) {
      showToast("Not enough points to redeem this reward");
      return;
    }
    const redemption = { id: uid(), rewardId: reward.id, rewardName: reward.name, userId: reward.assignedTo, pointsSpent: reward.pointCost, timestamp: new Date().toISOString() };
    const updatedUsers = appData.users.map((u) =>
      u.id === reward.assignedTo ? { ...u, pointBalance: (u.pointBalance || 0) - reward.pointCost } : u
    );
    const newData = { ...appData, users: updatedUsers, redemptions: [...(appData.redemptions || []), redemption] };
    setAppData(newData); await saveData(newData);
    showToast(`${reward.name} redeemed for ${reward.pointCost} points`);
  };

  // ── History Management ──
  const RELATIONSHIP_OPTIONS = [
    { v: "spouse", l: "Spouse" },
    { v: "partner", l: "Partner" },
    { v: "parent", l: "Parent" },
    { v: "child", l: "Child" },
    { v: "sibling", l: "Sibling" },
    { v: "roommate", l: "Roommate" },
    { v: "grandparent", l: "Grandparent" },
    { v: "grandchild", l: "Grandchild" },
    { v: "other", l: "Other" },
  ];

  // Tag suggestions based on relationship type
  const TAG_SUGGESTIONS = {
    parent: ["Dad", "Mom", "Papa", "Mama", "Pop", "Mother", "Father"],
    child: [], // uses first name
    spouse: ["Hubby", "Wifey", "Love", "Honey", "Babe"],
    partner: ["Love", "Honey", "Babe", "Partner"],
    sibling: ["Bro", "Sis", "Brother", "Sister"],
    grandparent: ["Grandpa", "Grandma", "Nana", "Papa", "Gramps", "Grammy", "Abuela", "Abuelo"],
    grandchild: [], // uses first name
    roommate: [], // uses first name
    other: [],
  };

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

  const setRelationshipTag = async (userId, forUserId, tag) => {
    const updatedUsers = appData.users.map((u) =>
      u.id === userId ? { ...u, relationshipTags: { ...(u.relationshipTags || {}), [forUserId]: tag } } : u
    );
    const newData = { ...appData, users: updatedUsers };
    setAppData(newData);
    await saveData(newData);
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

  const setRelationship = async (fromUserId, toUserId, relationship) => {
    let updatedUsers = appData.users.map((u) => {
      if (u.id === fromUserId) return { ...u, relationships: { ...(u.relationships || {}), [toUserId]: relationship } };
      return u;
    });

    // Propagate all inferred relationships
    updatedUsers = propagateRelationships(updatedUsers.map((u) => ({ ...u, relationships: { ...(u.relationships || {}) } })));

    const newData = { ...appData, users: updatedUsers };
    setAppData(newData);
    await saveData(newData);

    // Count how many were auto-set
    const before = appData.users.reduce((sum, u) => sum + Object.keys(u.relationships || {}).length, 0);
    const after = updatedUsers.reduce((sum, u) => sum + Object.keys(u.relationships || {}).length, 0);
    const autoSet = after - before - 1; // -1 for the one we just set
    if (autoSet > 0) showToast(`Relationship updated — ${autoSet} other${autoSet !== 1 ? "s" : ""} auto-filled`);
    else showToast(`Relationship updated`);
  };

  // Count missing relationships for current user
  const missingRelationships = appData.users.filter((u) => {
    if (u.id === appData.currentUserId) return false;
    if (u.status === "pending") return false;
    const myRels = currentUser?.relationships || {};
    return !myRels[u.id];
  });

  const toggleHistorySection = (section) => {
    setHistoryOpen(historyOpen === section ? null : section);
    setHistorySelected([]);
    setHistoryAutoDelete(null);
  };

  const toggleHistoryItem = (id) => {
    setHistorySelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  };

  const deleteHistoryItems = async (type, ids) => {
    let newData = { ...appData };
    if (type === "sentMsg" || type === "rcvdMsg") {
      newData.notifications = (newData.notifications || []).filter((n) => !ids.includes(n.id));
    } else {
      newData.recognitions = (newData.recognitions || []).filter((r) => !ids.includes(r.id));
    }
    setAppData(newData);
    await saveData(newData);
    setHistorySelected([]);
    showToast(`${ids.length} item${ids.length !== 1 ? "s" : ""} deleted`);
  };

  const deleteAllHistory = async (type, items) => {
    await deleteHistoryItems(type, items.map((i) => i.id));
  };

  const setAutoDeletePref = async (userId, section, period) => {
    const updatedUsers = appData.users.map((u) =>
      u.id === userId ? { ...u, autoDelete: { ...(u.autoDelete || {}), [section]: period } } : u
    );
    const newData = { ...appData, users: updatedUsers };
    setAppData(newData);
    await saveData(newData);
    setHistoryAutoDelete(null);
    showToast(`Auto-delete set to ${period === "never" ? "never" : period}`);
  };

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
  }, [voiceMode]);

  const executeVoiceCommand = async () => {
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
      const newData = { ...appData, tasks: [...appData.tasks, newTask] };
      setAppData(newData); await saveData(newData);
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
      const updatedUsers = appData.users.map((u) =>
        u.id === p.targetUserId ? { ...u, pointBalance: (u.pointBalance || 0) + recognition.pointsAwarded } : u
      );
      const newData = { ...appData, recognitions: [...(appData.recognitions || []), recognition], users: updatedUsers };
      setAppData(newData); await saveData(newData);
      sendNotification(p.targetUserId, "recognition", `${currentUser?.name} recognized you: "${recognition.message}"${recognition.pointsAwarded > 0 ? ` (+${recognition.pointsAwarded} points)` : ""}`, { recognitionId: recognition.id });
      showToast(`Recognition sent to ${p.targetUserName}`);
    }

    if (p.type === "reminder") {
      // Create as a one-time task assigned to self for now
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
      const newData = { ...appData, tasks: [...appData.tasks, newTask] };
      setAppData(newData); await saveData(newData);
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

  const commitNotification = async (approvedMessage) => {
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
    const newData = { ...appData, notifications: [...(appData.notifications || []), notification] };
    setAppData(newData);
    await saveData(newData);
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
    const newData = { ...appData, notifications: [...(appData.notifications || []), notification] };
    setAppData(newData);
    await saveData(newData);
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
    const newData = { ...appData, notifications: [...(appData.notifications || []), notification] };
    setAppData(newData);
    await saveData(newData);
  };

  const markNotificationsRead = async () => {
    const updated = (appData.notifications || []).map((n) =>
      n.targetUserId === appData.currentUserId ? { ...n, read: true } : n
    );
    const newData = { ...appData, notifications: updated };
    setAppData(newData);
    await saveData(newData);
  };

  const myUnreadCount = (appData.notifications || []).filter((n) => n.targetUserId === appData.currentUserId && !n.read).length;

  // ── Task Row (reusable) ──
  const TaskRow = ({ task, compact }) => {
    const done = !isTaskDueToday(task);
    const assignees = (task.assignedTo || []).map(getUserName).join(", ") || "Unassigned";
    const [showActions, setShowActions] = useState(false);
    const isSelected = selectedTaskIds.includes(task.id);

    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: compact ? 10 : 14, padding: compact ? "10px 0" : "14px 0" }}>
          {/* Checkbox for selection */}
          {!done ? (
            <button onClick={() => toggleTaskSelection(task.id)}
              style={{
                all: "unset", cursor: "pointer", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                width: compact ? 28 : 32, height: compact ? 28 : 32,
                borderRadius: 8,
                background: isSelected ? C.gradientPrimary : "rgba(255,255,255,0.6)",
                border: `2px solid ${isSelected ? C.navy : "rgba(68,87,109,0.3)"}`,
                transition: "all 0.2s",
              }}>
              {isSelected && (
                <svg width={compact ? 14 : 16} height={compact ? 14 : 16} viewBox="0 0 24 24" fill="none" stroke={C.white} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12l5 5L19 7" />
                </svg>
              )}
            </button>
          ) : (
            <button onClick={() => handleUncomplete(task.id)}
              style={{
                all: "unset", cursor: "pointer", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                width: compact ? 28 : 32, height: compact ? 28 : 32,
                borderRadius: 8,
                background: "rgba(68,87,109,0.08)",
                border: `2px solid ${C.navy}`,
                transition: "all 0.2s",
              }}>
              <CheckCircleIcon done={true} size={compact ? 16 : 18} />
            </button>
          )}
          <div style={{ flex: 1, minWidth: 0, opacity: done ? 0.5 : 1 }} onClick={() => setShowActions(!showActions)}>
            <p style={{ fontWeight: 600, fontSize: compact ? 14 : 15, textDecoration: done ? "line-through" : "none", color: done ? C.steel : C.dark }}>{task.name}</p>
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 3, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, color: C.steel }}>{assignees}</span>
              {task.schedule && task.schedule !== "once" && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, color: C.steel }}><RepeatIcon /> {getScheduleLabel(task)}</span>
              )}
              {task.points > 0 && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, color: C.navy, fontWeight: 600 }}><StarIcon /> {task.points}</span>
              )}
            </div>
          </div>
          {/* Undo button for done tasks */}
          {done && !compact && (
            <button onClick={() => handleUncomplete(task.id)}
              style={{
                ...btnBase, padding: "6px 14px", fontSize: 11, borderRadius: 8, flexShrink: 0,
                background: "rgba(68,87,109,0.06)", color: C.steel,
              }}>
              Undo
            </button>
          )}
        </div>
        {showActions && (
          <div style={{ display: "flex", gap: 8, padding: "0 0 8px 46px", animation: "fadeUp 0.2s ease both" }}>
            <button onClick={() => onEditTask(task)} style={{ ...btnGhost, fontSize: 12, padding: "6px 14px", color: C.navy, background: C.ice, borderRadius: 8 }}>Edit</button>
            <button onClick={() => handleDeleteTask(task.id)} style={{ ...btnGhost, fontSize: 12, padding: "6px 14px", color: C.danger, background: "rgba(192,57,43,0.06)", borderRadius: 8 }}>Delete</button>
          </div>
        )}
      </div>
    );
  };

  // ── Selection Controls (reusable) ──
  const SelectionBar = ({ tasks }) => {
    const dueTasks = tasks.filter((t) => isTaskDueToday(t));
    const selectedDueCount = selectedTaskIds.filter((id) => dueTasks.some((t) => t.id === id)).length;
    const allDueSelected = dueTasks.length > 0 && selectedDueCount === dueTasks.length;
    const someSelected = selectedTaskIds.length > 0;

    if (dueTasks.length === 0) return null;

    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 0", marginBottom: 8,
        borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={() => {
            if (allDueSelected) {
              setSelectedTaskIds([]);
            } else {
              setSelectedTaskIds(dueTasks.map((t) => t.id));
            }
          }} style={{
            ...btnBase, padding: "6px 14px", fontSize: 12, borderRadius: 8,
            background: allDueSelected ? C.ice : "transparent",
            color: allDueSelected ? C.navy : C.steel,
            border: `1.5px solid ${allDueSelected ? C.sky : C.border}`,
          }}>
            {allDueSelected ? "Clear all" : "Select all"}
          </button>
          {someSelected && (
            <span style={{ fontSize: 12, color: C.steel, fontWeight: 500 }}>
              {selectedTaskIds.length} selected
            </span>
          )}
        </div>

        {someSelected && (
          <button onClick={() => {
            const tasks = appData.tasks.filter((t) => selectedTaskIds.includes(t.id) && isTaskDueToday(t));
            if (tasks.length > 0) setCompletionDialogTasks(tasks);
          }} style={{
            ...btnBase, padding: "8px 18px", fontSize: 13, borderRadius: 10,
            background: C.gradientPrimary, color: C.white,
            boxShadow: "0 2px 10px rgba(41,53,60,0.2)",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <CheckCircleIcon done={true} size={16} /> Complete
          </button>
        )}
      </div>
    );
  };

  // ── Header ──
  const Header = ({ title, onBack }) => (
    <div style={{ marginBottom: 24, animation: "fadeUp 0.3s ease both" }}>
      {onBack && <button onClick={onBack} style={{ ...btnGhost, padding: "4px 0", marginBottom: 8 }}>&larr; Back</button>}
      <h2 style={{ fontFamily: fontDisplay, fontSize: 24, fontWeight: 500, color: C.dark }}>{title}</h2>
    </div>
  );

  // ════════════════════════════════════════════════════════════════
  // VOICE COMMAND OVERLAY (renders over any view)
  // ════════════════════════════════════════════════════════════════
  if (voiceMode !== "idle") {
    const pulseAnim = voiceMode === "listening" ? "glowPulse 1.2s ease-in-out infinite" : "none";
    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(41,53,60,0.92)", backdropFilter: "blur(16px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20, animation: "fadeUp 0.2s ease both",
      }}>
        <div style={{ maxWidth: 420, width: "100%", textAlign: "center" }}>

          {voiceMode === "listening" && (
            <>
              <div style={{
                width: 100, height: 100, borderRadius: "50%",
                background: `radial-gradient(circle, ${C.sky} 0%, ${C.navy} 100%)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 24px", boxShadow: `0 0 40px ${C.sky}`,
                animation: pulseAnim,
              }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={C.white} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
                  <path d="M19 10v2a7 7 0 01-14 0v-2"/>
                  <line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
              </div>
              <h3 style={{ fontFamily: fontDisplay, fontSize: 22, fontWeight: 500, color: C.white, marginBottom: 8 }}>Listening...</h3>
              <p style={{ color: C.sky, fontSize: 14, marginBottom: 8, minHeight: 44 }}>
                {voiceTranscript || "Speak your command"}
              </p>
              <p style={{ color: C.steel, fontSize: 12, marginBottom: 32 }}>Tap below when finished</p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                <button onClick={cancelVoice} style={{ ...btnGhost, color: C.mist }}>Cancel</button>
                <button onClick={stopVoice} style={{
                  ...btnBase, padding: "14px 32px", background: C.white, color: C.dark,
                  boxShadow: "0 4px 20px rgba(255,255,255,0.2)",
                }}>Done speaking</button>
              </div>
            </>
          )}

          {voiceMode === "processing" && (
            <>
              <div style={{
                width: 80, height: 80, borderRadius: "50%", background: C.navy,
                display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px",
              }}>
                <div style={{
                  width: 40, height: 3, borderRadius: 2,
                  background: `linear-gradient(90deg, ${C.ice}, ${C.sky}, ${C.ice})`,
                  backgroundSize: "200% 100%", animation: "shimmer 1s ease infinite",
                }} />
              </div>
              <h3 style={{ fontFamily: fontDisplay, fontSize: 22, fontWeight: 500, color: C.white, marginBottom: 8 }}>Understanding...</h3>
              <p style={{ color: C.sky, fontSize: 14 }}>"{voiceTranscript}"</p>
            </>
          )}

          {voiceMode === "result" && voiceError && (
            <>
              <div style={{
                width: 80, height: 80, borderRadius: "50%", background: "rgba(192,57,43,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px",
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.danger} strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/>
                </svg>
              </div>
              <h3 style={{ fontFamily: fontDisplay, fontSize: 20, fontWeight: 500, color: C.white, marginBottom: 8 }}>Something went wrong</h3>
              <p style={{ color: C.steel, fontSize: 14, marginBottom: 24 }}>{voiceError}</p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                <button onClick={cancelVoice} style={{ ...btnGhost, color: C.mist }}>Close</button>
                <button onClick={startVoice} style={{ ...btnBase, padding: "14px 28px", background: C.white, color: C.dark }}>Try again</button>
              </div>
            </>
          )}

          {voiceMode === "result" && !voiceError && voiceParsed && (
            <>
              <div style={{
                width: 80, height: 80, borderRadius: "50%", background: "rgba(170,199,216,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px",
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.sky} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>
                </svg>
              </div>
              <h3 style={{ fontFamily: fontDisplay, fontSize: 20, fontWeight: 500, color: C.white, marginBottom: 16 }}>Got it</h3>

              <div style={{
                background: "rgba(255,255,255,0.1)", borderRadius: 16, padding: 20,
                textAlign: "left", marginBottom: 24, border: "1px solid rgba(255,255,255,0.1)",
              }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em",
                    color: C.dark, background: C.sky, padding: "3px 10px", borderRadius: 50,
                  }}>{voiceParsed.type}</span>
                  {voiceParsed.confidence && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: C.steel, padding: "3px 10px", borderRadius: 50, background: "rgba(255,255,255,0.1)" }}>
                      {voiceParsed.confidence} confidence
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 16, fontWeight: 600, color: C.white, marginBottom: 6 }}>
                  {voiceParsed.title || voiceParsed.summary}
                </p>
                {voiceParsed.description && voiceParsed.description !== voiceParsed.title && (
                  <p style={{ fontSize: 13, color: C.sky, marginBottom: 8, lineHeight: 1.4 }}>{voiceParsed.description}</p>
                )}
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
                  {voiceParsed.targetUserName && (
                    <span style={{ fontSize: 12, color: C.steel }}>For: <span style={{ color: C.white, fontWeight: 600 }}>{voiceParsed.targetUserName}</span></span>
                  )}
                  {voiceParsed.dueDate && (
                    <span style={{ fontSize: 12, color: C.steel }}>Due: <span style={{ color: C.white, fontWeight: 600 }}>{voiceParsed.dueDate}{voiceParsed.dueTime ? ` at ${voiceParsed.dueTime}` : ""}</span></span>
                  )}
                  {voiceParsed.points > 0 && (
                    <span style={{ fontSize: 12, color: C.steel }}>Points: <span style={{ color: C.white, fontWeight: 600 }}>{voiceParsed.points}</span></span>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                <button onClick={cancelVoice} style={{ ...btnGhost, color: C.mist }}>Cancel</button>
                <button onClick={startVoice} style={{ ...btnGhost, color: C.sky }}>Redo</button>
                <button onClick={executeVoiceCommand} style={{
                  ...btnBase, padding: "14px 32px", background: C.white, color: C.dark,
                  boxShadow: "0 4px 20px rgba(255,255,255,0.2)",
                }}>Confirm</button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // MESSAGE APPROVAL OVERLAY (sender reviews before delivering)
  // ════════════════════════════════════════════════════════════════
  if (pendingApproval) {
    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(41,53,60,0.6)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20, animation: "fadeUp 0.15s ease both",
      }}>
        <div onClick={(e) => e.stopPropagation()} style={{
          background: C.white, borderRadius: 22, padding: 28,
          maxWidth: 460, width: "100%",
          boxShadow: "0 16px 48px rgba(0,0,0,0.15)",
          animation: "fadeUp 0.25s ease both",
          maxHeight: "90vh", overflowY: "auto",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.navy} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
            <h3 style={{ fontFamily: fontDisplay, fontSize: 20, fontWeight: 600, color: C.dark }}>Review Before Sending</h3>
          </div>

          {/* What you wrote */}
          <p style={{ fontSize: 11, fontWeight: 700, color: C.steel, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Your message</p>
          <div style={{
            background: C.bg, borderRadius: 14, padding: "14px 16px",
            border: `1px solid ${C.border}`, marginBottom: 18,
          }}>
            <p style={{ fontSize: 14, color: C.dark, lineHeight: 1.5 }}>{pendingApproval.original}</p>
          </div>

          {/* What recipient will see */}
          <p style={{ fontSize: 11, fontWeight: 700, color: C.navy, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
            What {pendingApproval.recipientName} will see
          </p>
          <div style={{
            background: C.ice, borderRadius: 14, padding: "14px 16px",
            border: `1px solid ${C.sky}`, marginBottom: 14,
            borderLeft: `3px solid ${C.navy}`,
          }}>
            <p style={{ fontSize: 14, color: C.dark, lineHeight: 1.5 }}>{pendingApproval.rewritten}</p>
          </div>

          {pendingApproval.original !== pendingApproval.rewritten && (
            <p style={{ fontSize: 12, color: C.steel, lineHeight: 1.5, marginBottom: 16, fontStyle: "italic" }}>
              Divvy adapts the tone to match {pendingApproval.recipientName}'s preferences. You can correct any factual inaccuracies below.
            </p>
          )}

          {/* Edit for accuracy mode */}
          {pendingApproval.editMode ? (
            <div style={{ marginBottom: 16, animation: "fadeUp 0.15s ease both" }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: C.dark, marginBottom: 8 }}>
                Edit your original message for accuracy. The tone will be re-adapted automatically.
              </p>
              <textarea
                style={{ ...inputStyle, minHeight: 80, resize: "vertical", fontFamily: font, fontSize: 14 }}
                value={pendingApproval.editText}
                onChange={(e) => setPendingApproval((p) => ({ ...p, editText: e.target.value }))}
                autoFocus
              />
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button onClick={() => setPendingApproval((p) => ({ ...p, editMode: false, editText: "" }))}
                  style={{ ...btnGhost, flex: 1 }}>Cancel edit</button>
                <button onClick={() => reRewriteForApproval(pendingApproval.editText)}
                  disabled={!pendingApproval.editText.trim()}
                  style={{ ...btnPrimary, flex: 2, opacity: pendingApproval.editText.trim() ? 1 : 0.45 }}>
                  Re-adapt message
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <button onClick={() => setPendingApproval((p) => ({ ...p, editMode: true, editText: p.original }))}
                style={{ ...btnGhost, fontSize: 13, color: C.navy }}>
                Correct inaccuracy
              </button>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setPendingApproval(null)}
              style={{ ...btnSecondary, flex: 1 }}>Cancel</button>
            <button onClick={() => commitNotification(pendingApproval.rewritten)}
              style={{ ...btnPrimary, flex: 2 }}>
              Approve and send
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // TEXT COMMAND OVERLAY
  // ════════════════════════════════════════════════════════════════
  if (textCommandOpen) {
    const audioCtxRef = { current: null };
    const playClick = (freq = 3800, dur = 0.03, vol = 0.08) => {
      try {
        if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
        const ctx = audioCtxRef.current;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.5, ctx.currentTime + dur);
        gain.gain.setValueAtTime(vol, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + dur);
      } catch {}
    };
    const haptic = (ms = 8) => { try { navigator.vibrate?.(ms); } catch {} };
    const feedback = (special) => { haptic(special ? 12 : 6); playClick(special ? 2800 : 3800, special ? 0.04 : 0.025); };

    const kH = 54;
    const kGap = 5;
    const numRow = ["1","2","3","4","5","6","7","8","9","0"];
    const row1 = ["Q","W","E","R","T","Y","U","I","O","P"];
    const row2 = ["A","S","D","F","G","H","J","K","L"];
    const row3 = ["Z","X","C","V","B","N","M"];
    const puncRow = [".",",","?","!","'","-","@"];

    const Key = ({ k, flex, special, children, onTap }) => {
      const isShiftActive = k === "SHIFT" && textShift;
      const bg = isShiftActive
        ? `linear-gradient(180deg, ${C.navy} 0%, ${C.dark} 100%)`
        : special
          ? "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)"
          : "linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.12) 100%)";
      const handlePress = () => {
        feedback(special);
        if (onTap) onTap(); else typeKey(k);
      };
      return (
        <button onClick={handlePress} style={{
          all: "unset", cursor: "pointer", WebkitTapHighlightColor: "transparent",
          display: "flex", alignItems: "center", justifyContent: "center",
          height: kH, borderRadius: 12, fontFamily: font,
          fontWeight: 600, fontSize: special ? 13 : 20,
          background: bg, color: C.white, flex: flex || 1, minWidth: 0,
          transition: "transform 0.08s, filter 0.08s",
          boxShadow: "0 1px 0 rgba(0,0,0,0.3), 0 3px 6px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}>
          {children}
        </button>
      );
    };

    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(29,38,44,0.97)",
        display: "flex", flexDirection: "column",
        animation: "fadeUp 0.15s ease both",
      }} onClick={() => textInputRef.current?.focus()}>
        <input ref={textInputRef} inputMode="none"
          onKeyDown={handleHiddenKeyDown} onKeyUp={handleHiddenKeyUp}
          style={{ position: "absolute", opacity: 0, pointerEvents: "none", top: -100 }}
          autoFocus />

        {/* Top bar */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 16px", flexShrink: 0,
          background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}>
          <button onClick={() => { feedback(true); cancelTextCommand(); }} style={{
            ...btnGhost, color: "rgba(255,255,255,0.5)", fontSize: 15, padding: "8px 12px",
          }}>Cancel</button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.sky} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
            <p style={{ fontFamily: font, fontSize: 15, fontWeight: 600, color: C.white, letterSpacing: "0.02em" }}>Command</p>
          </div>
          <button onClick={() => { if (textCommandInput.trim()) { feedback(true); submitTextCommand(); } }} disabled={!textCommandInput.trim()} style={{
            ...btnBase, padding: "8px 20px", fontSize: 15, borderRadius: 10,
            background: textCommandInput.trim() ? `linear-gradient(135deg, ${C.sky} 0%, ${C.white} 100%)` : "rgba(255,255,255,0.08)",
            color: textCommandInput.trim() ? C.dark : "rgba(255,255,255,0.25)",
            fontWeight: 700, boxShadow: textCommandInput.trim() ? "0 2px 12px rgba(170,199,216,0.3)" : "none",
          }}>Send</button>
        </div>

        {/* Input display */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", padding: "0 20px", overflow: "auto" }}>
          <div style={{
            width: "100%", maxWidth: 520, margin: "0 auto",
            background: "rgba(255,255,255,0.04)", borderRadius: 20, padding: "28px 24px",
            border: "1px solid rgba(255,255,255,0.06)", minHeight: 80,
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
          }}>
            <p style={{ fontFamily: font, fontSize: 20, color: C.white, lineHeight: 1.6, wordBreak: "break-word" }}>
              {textCommandInput}
              <span style={{
                display: "inline-block", width: 2, height: 22,
                background: C.sky, marginLeft: 2, borderRadius: 1,
                animation: "glowPulse 1s ease-in-out infinite",
                verticalAlign: "text-bottom", boxShadow: `0 0 8px ${C.sky}`,
              }} />
            </p>
            {!textCommandInput && (
              <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 18, marginTop: -32, pointerEvents: "none" }}>
                Type a command...
              </p>
            )}
          </div>
        </div>

        {/* Keyboard */}
        <div style={{
          background: "linear-gradient(180deg, rgba(35,45,52,0.98) 0%, rgba(25,32,38,0.99) 100%)",
          borderTop: "1px solid rgba(255,255,255,0.04)",
          padding: "8px 3px 24px", maxWidth: 560, width: "100%", margin: "0 auto",
        }}>
          <div style={{ display: "flex", gap: kGap, marginBottom: kGap, padding: "0 2px" }}>
            {numRow.map((n) => (
              <Key key={n} k={n} onTap={() => { feedback(); setTextCommandInput((v) => v + n); }}>
                <span style={{ fontSize: 18 }}>{n}</span>
              </Key>
            ))}
          </div>
          <div style={{ display: "flex", gap: kGap, marginBottom: kGap, padding: "0 2px" }}>
            {row1.map((k) => <Key key={k} k={k}><span>{textShift ? k : k.toLowerCase()}</span></Key>)}
          </div>
          <div style={{ display: "flex", gap: kGap, marginBottom: kGap, padding: "0 18px" }}>
            {row2.map((k) => <Key key={k} k={k}><span>{textShift ? k : k.toLowerCase()}</span></Key>)}
          </div>
          <div style={{ display: "flex", gap: kGap, marginBottom: kGap, padding: "0 2px" }}>
            <Key k="SHIFT" flex="1.6" special>
              <svg width="22" height="22" viewBox="0 0 24 24" fill={textShift ? C.white : "none"} stroke={C.white} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2l9 12h-6v8H9v-8H3z"/>
              </svg>
            </Key>
            {row3.map((k) => <Key key={k} k={k}><span>{textShift ? k : k.toLowerCase()}</span></Key>)}
            <Key k="BACK" flex="1.6" special>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.white} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z"/><path d="M18 9l-6 6M12 9l6 6"/>
              </svg>
            </Key>
          </div>
          <div style={{ display: "flex", gap: kGap, padding: "0 2px" }}>
            {puncRow.slice(0, 3).map((p) => (
              <Key key={p} k={p} flex="0.72" onTap={() => { feedback(); setTextCommandInput((v) => v + p); }}>
                <span style={{ fontSize: 22 }}>{p}</span>
              </Key>
            ))}
            <Key k="SPACE" flex="4.5" onTap={() => { feedback(); typeKey("SPACE"); }}>
              <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.15em", opacity: 0.4 }}>space</span>
            </Key>
            {puncRow.slice(3).map((p) => (
              <Key key={p} k={p} flex="0.72" onTap={() => { feedback(); setTextCommandInput((v) => v + p); }}>
                <span style={{ fontSize: 22 }}>{p}</span>
              </Key>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // HUB VIEW
  // ════════════════════════════════════════════════════════════════
  if (view === "hub") {
    const todayTasks = appData.tasks.filter((t) => isTaskDueToday(t));
    const todayDone = appData.tasks.filter((t) => !isTaskDueToday(t) && t.lastCompleted && new Date(t.lastCompleted).toDateString() === new Date().toDateString());
    return (
      <PageShell narrow topNav>
        <div style={{ textAlign: "center", marginTop: 16, marginBottom: 32, animation: "fadeUp 0.4s ease both" }}>
          <p style={{ fontSize: 13, color: C.steel }}>{appData.household?.name}</p>
          <p style={{ color: C.steel, fontSize: 14, marginTop: 8 }}>
            {todayTasks.length > 0 ? `${todayTasks.length} task${todayTasks.length !== 1 ? "s" : ""} due today` : "You're all caught up"}
          </p>
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

        {/* Command Buttons */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20, animation: "fadeUp 0.4s ease both" }}>
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

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { key: "members", icon: (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.navy} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/><circle cx="19" cy="7" r="3"/><path d="M21 21v-2a3 3 0 00-2-2.83"/>
              </svg>
            ), label: "Members", sub: `${appData.users.length} member${appData.users.length !== 1 ? "s" : ""}` },
            { key: "tasks", icon: (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.navy} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 12l2 2 4-4"/>
              </svg>
            ), label: "Tasks", sub: `${todayTasks.length} due today` },
            { key: "calendar", icon: (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.navy} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="17" rx="3"/><path d="M3 9h18M8 2v4M16 2v4"/>
              </svg>
            ), label: "Calendar", sub: new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) },
            { key: "recognition", icon: (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.navy} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
              </svg>
            ), label: "Recognition", sub: `${(appData.recognitions || []).length} shout-out${(appData.recognitions || []).length !== 1 ? "s" : ""}` },
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

        {/* ── DEV ONLY: User Switcher ── */}
        <Card style={{ marginTop: 28, padding: "14px 18px", border: "2px dashed rgba(192,57,43,0.3)", background: "rgba(192,57,43,0.03)" }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: C.danger, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Dev — Switch User</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {appData.users.map((u) => {
              const isActive = u.id === appData.currentUserId;
              return (
                <button key={u.id} onClick={async () => {
                  if (isActive) return;
                  const newData = { ...appData, currentUserId: u.id };
                  setAppData(newData);
                  await saveData(newData);
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
  if (view === "members") {
    const activeMembers = appData.users.filter((u) => u.status !== "pending");
    const pendingMembers = appData.users.filter((u) => u.status === "pending");
    return (
      <PageShell narrow topNav>
        <Header title="Active Members" onBack={() => setView("hub")} />
        <Card delay={0.05}>
          {activeMembers.length === 0 && pendingMembers.length === 0 && (
            <p style={{ color: C.steel, fontSize: 14, textAlign: "center", padding: "16px 0" }}>No members yet.</p>
          )}
          {activeMembers.map((u, i) => (
            <div key={u.id}>
              <button onClick={() => { setSelectedMemberId(u.id); setView("memberDetail"); }} style={{
                all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 14, padding: "14px 0", width: "100%", transition: "all 0.15s",
              }}>
                <Avatar name={u.name} type={u.type} size={40} image={u.avatar} crop={u.avatarCrop} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: 15, color: C.dark }}>{u.name}</p>
                  <p style={{ fontSize: 12, color: C.steel }}>
                    {u.type === "dependent" ? "Restricted" : "Member"}
                    {(() => { const rel = (currentUser?.relationships || {})[u.id]; return rel ? ` · ${RELATIONSHIP_OPTIONS.find((o) => o.v === rel)?.l || rel}` : ""; })()}
                    {u.pointBalance > 0 ? ` · ${u.pointBalance} pts` : ""}
                  </p>
                </div>
                {u.id === appData.currentUserId && (
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: C.navy, background: C.ice, padding: "4px 10px", borderRadius: 50 }}>You</span>
                )}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.steel} strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
              </button>
              {(i < activeMembers.length - 1 || pendingMembers.length > 0) && <Divider />}
            </div>
          ))}
          {pendingMembers.length > 0 && (
            <>
              <p style={{ ...labelStyle, marginTop: 12, marginBottom: 8 }}>Pending</p>
              {pendingMembers.map((u, i) => (
                <div key={u.id}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", opacity: 0.45 }}>
                    <Avatar name={u.name} type={u.type} size={40} image={u.avatar} crop={u.avatarCrop} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600, fontSize: 15, color: C.steel }}>{u.name}</p>
                      <p style={{ fontSize: 12, color: C.steel, fontStyle: "italic" }}>Awaiting profile setup</p>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: C.steel, background: C.mist, padding: "4px 10px", borderRadius: 50 }}>Pending</span>
                  </div>
                  {i < pendingMembers.length - 1 && <Divider />}
                </div>
              ))}
            </>
          )}
        </Card>
        <button onClick={onAddMember} style={{ ...btnPrimary, width: "100%", marginTop: 16 }}>Add Member</button>
      </PageShell>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // PERSONAL MEMBER PAGE
  // ════════════════════════════════════════════════════════════════
  if (view === "memberDetail" && selectedMember) {
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

    // Find upcoming tasks (next 30 days) for this member if none due today
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
        <button onClick={() => { setView("members"); setSelectedTaskIds([]); }} style={{ ...btnGhost, padding: "4px 0", marginBottom: 16 }}>&larr; Back</button>

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
              <SelectionBar tasks={memberTasks} />
              {memberTasks.map((t, i) => (
                <div key={t.id}>
                  <TaskRow task={t} compact />
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

  // ════════════════════════════════════════════════════════════════
  // TASKS VIEW
  // ════════════════════════════════════════════════════════════════
  if (view === "tasks") {
    const dueTasks = appData.tasks.filter((t) => isTaskDueToday(t));
    const doneTasks = appData.tasks.filter((t) => !isTaskDueToday(t));
    return (
      <>
      <PageShell narrow topNav>
        <Header title="Tasks" onBack={() => { setView("hub"); setSelectedTaskIds([]); }} />

        <Card delay={0.05}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontFamily: fontDisplay, fontSize: 19, fontWeight: 600 }}>All Tasks</h3>
            <button onClick={onCreateTask} style={{
              ...btnBase, padding: "8px 16px", fontSize: 13, borderRadius: 10,
              background: C.gradientPrimary, color: C.white, boxShadow: "0 2px 10px rgba(41,53,60,0.2)",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <PlusIcon size={16} /> Add task
            </button>
          </div>

          {appData.tasks.length === 0 ? (
            <p style={{ color: C.steel, fontSize: 14, textAlign: "center", padding: "28px 0" }}>
              No tasks yet. Tap "Add task" to create your first one.
            </p>
          ) : (
            <>
              <SelectionBar tasks={appData.tasks} />
              {dueTasks.length > 0 && dueTasks.map((t, i) => (
                <div key={t.id}>
                  <TaskRow task={t} />
                  {i < dueTasks.length - 1 && <Divider />}
                </div>
              ))}
              {doneTasks.length > 0 && (
                <>
                  {dueTasks.length > 0 && <div style={{ margin: "12px 0" }} />}
                  <p style={{ ...labelStyle, marginBottom: 10, fontSize: 10 }}>Completed</p>
                  {doneTasks.map((t, i) => (
                    <div key={t.id}>
                      <TaskRow task={t} />
                      {i < doneTasks.length - 1 && <Divider />}
                    </div>
                  ))}
                </>
              )}
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
      </>
    );
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
  if (view === "recognition") {
    const recos = [...(appData.recognitions || [])].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return (
      <PageShell narrow topNav>
        <Header title="Recognition" onBack={() => setView("hub")} />

        <button onClick={() => { resetRecoFlow(); setView("sendRecognition"); }} style={{
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

  // ════════════════════════════════════════════════════════════════
  // SEND RECOGNITION FLOW
  // ════════════════════════════════════════════════════════════════
  if (view === "sendRecognition") {
    const otherUsers = appData.users.filter((u) => u.id !== appData.currentUserId);
    const targetUser = appData.users.find((u) => u.id === recoTarget);

    return (
      <PageShell narrow topNav>
        <Header title="Send Recognition" onBack={() => { resetRecoFlow(); setView("recognition"); }} />
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

  // ════════════════════════════════════════════════════════════════
  // NOTIFICATIONS VIEW
  // ════════════════════════════════════════════════════════════════
  if (view === "notifications") {
    const myNotifs = (appData.notifications || [])
      .filter((n) => n.targetUserId === appData.currentUserId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return (
      <PageShell narrow topNav>
        <Header title="Notifications" onBack={() => setView("hub")} />
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
              // Check if this is a "completed for you" notification with actions
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

                        {/* Action buttons for completed-for-me notifications */}
                        {isCompletedForMe && (
                          <div style={{ display: "flex", gap: 8, marginTop: 10, animation: "fadeUp 0.2s ease both" }}>
                            <button onClick={async () => {
                              const msg = `Thank you for completing "${appData.tasks.find((t) => t.id === n.taskId)?.name || "the task"}" for me!`;
                              sendNotification(actionTargetId, "recognition", msg, {});
                              const updNotifs = (appData.notifications || []).map((notif) =>
                                notif.id === n.id ? { ...notif, actioned: true } : notif
                              );
                              const nd = { ...appData, notifications: updNotifs };
                              setAppData(nd); await saveData(nd);
                            }} style={{
                              ...btnBase, padding: "8px 16px", fontSize: 12, borderRadius: 10,
                              background: C.ice, color: C.navy, border: `1px solid ${C.borderLight}`,
                              display: "flex", alignItems: "center", gap: 6,
                            }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.navy} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                              </svg>
                              Send thanks
                            </button>
                            <button onClick={async () => {
                              const theirTasks = appData.tasks.filter((t) =>
                                isTaskDueToday(t) && t.assignedTo?.includes(actionTargetId) && !t.assignedTo?.includes(appData.currentUserId)
                              );
                              if (theirTasks.length === 0) {
                                showToast(`${completedByUser?.name || "They"} ha${completedByUser ? "s" : "ve"} no tasks you can take right now`);
                                return;
                              }
                              const taskToTake = theirTasks[0];
                              const updatedTasks = appData.tasks.map((t) =>
                                t.id === taskToTake.id ? { ...t, assignedTo: [...(t.assignedTo || []), appData.currentUserId] } : t
                              );
                              const nd2 = { ...appData, tasks: updatedTasks };
                              setAppData(nd2); await saveData(nd2);
                              sendDirectNotification(actionTargetId, "task", `${currentUser?.name} volunteered to help with "${taskToTake.name}" in return!`, { taskId: taskToTake.id });
                              const updNotifs = (nd2.notifications || []).map((notif) =>
                                notif.id === n.id ? { ...notif, actioned: true } : notif
                              );
                              const nd3 = { ...nd2, notifications: updNotifs };
                              setAppData(nd3); await saveData(nd3);
                              showToast(`You volunteered for "${taskToTake.name}"`);
                            }} style={{
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

  return null;
}

