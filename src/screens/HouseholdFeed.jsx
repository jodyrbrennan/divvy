import { useState, useEffect, useMemo, useRef } from "react";
import { C, font, fontDisplay } from "../constants/colors";
import { btnBase, btnPrimary, btnGhost, btnSecondary, inputStyle, labelStyle } from "../constants/styles";
import { askOllama, AI_ENABLED } from "../utils/aiConfig";
import { getUpcomingEvents } from "../utils/eventHelpers";
import { isTaskDueToday } from "../utils/taskHelpers";
import { uid, saveData } from "../utils/storage";
import Card from "../components/Card";
import Avatar from "../components/Avatar";

import { useAppData } from "../contexts/AppDataContext";

/**
 * HouseholdFeed — Central dashboard feed with messaging + Divvy AI.
 *
 * Features:
 * - Post messages to the household or specific members
 * - Reply to any feed item (messages, recognitions, completions, AI posts)
 * - Divvy AI assistant for questions, reports, and actions
 */

const DIVVY_OPTIONS = [
  { key: "agenda",   emoji: "☀️", label: "Today's Agenda",    desc: "Overview of what's on deck today" },
  { key: "recap",    emoji: "🌙", label: "Daily Recap",       desc: "What did the household accomplish today?" },
  { key: "fairness", emoji: "⚖️", label: "Fairness Analysis", desc: "How balanced is our task distribution?" },
  { key: "tips",     emoji: "💡", label: "Suggestions",       desc: "Ideas to help the household run smoother" },
];

export default function HouseholdFeed({ onStartVoice, onStartText }) {
  const { appData, setAppData, currentUser, currentUserId } = useAppData();

  // ── Divvy AI state ──
  const [menuOpen, setMenuOpen] = useState(false);
  const [generating, setGenerating] = useState(null);
  const [customInput, setCustomInput] = useState("");
  const customRef = useRef(null);

  // ── Messaging state ──
  const [composeText, setComposeText] = useState("");
  const [composeTarget, setComposeTarget] = useState("household"); // "household" or a userId
  const [replyTo, setReplyTo] = useState(null); // { id, type, preview } of item being replied to
  const [showTargetPicker, setShowTargetPicker] = useState(false);
  const composeRef = useRef(null);

  const users = appData.users || [];
  const recognitions = appData.recognitions || [];
  const completions = appData.completions || [];
  const tasks = appData.tasks || [];
  const events = appData.events || [];
  const aiPosts = appData.aiPosts || [];
  const feedMessages = appData.feedMessages || [];

  // ════════════════════════════════════════════════════════════════
  // MESSAGING
  // ════════════════════════════════════════════════════════════════

  const sendMessage = () => {
    const text = composeText.trim();
    if (!text) return;

    const msg = {
      id: uid(),
      fromUserId: currentUserId,
      targetType: composeTarget === "household" ? "household" : "user",
      targetUserId: composeTarget === "household" ? null : composeTarget,
      message: text,
      replyToId: replyTo?.id || null,
      replyToType: replyTo?.type || null,
      replyToPreview: replyTo?.preview || null,
      timestamp: new Date().toISOString(),
    };

    setAppData((prev) => {
      const newData = { ...prev, feedMessages: [...(prev.feedMessages || []), msg] };
      saveData(newData);
      return newData;
    });

    setComposeText("");
    setReplyTo(null);
  };

  const startReply = (feedItem) => {
    let preview = "";
    if (feedItem.type === "recognition") preview = `${feedItem.senderName} recognized ${feedItem.recipientName}`;
    else if (feedItem.type === "completion") preview = `${feedItem.userName} completed "${feedItem.taskName}"`;
    else if (feedItem.type === "ai_post") preview = `Divvy: ${feedItem.content?.slice(0, 60)}...`;
    else if (feedItem.type === "message") preview = `${feedItem.senderName}: ${feedItem.message?.slice(0, 60)}`;
    else preview = "feed item";

    setReplyTo({ id: feedItem.id, type: feedItem.type, preview });
    setTimeout(() => composeRef.current?.focus(), 100);
  };

  const getTargetLabel = () => {
    if (composeTarget === "household") return "Everyone";
    const user = users.find((u) => u.id === composeTarget);
    return user?.name || "Someone";
  };

  // ════════════════════════════════════════════════════════════════
  // DIVVY AI (all existing logic preserved)
  // ════════════════════════════════════════════════════════════════

  const saveAiPost = (type, label, content, userMessage) => {
    const post = { id: uid(), type, label, content, userMessage: userMessage || null, date: new Date().toISOString().slice(0, 10), timestamp: new Date().toISOString(), requestedBy: currentUserId };
    setAppData((prev) => { const newData = { ...prev, aiPosts: [...(prev.aiPosts || []), post] }; saveData(newData); return newData; });
  };

  const executeCreateTask = (parsed) => {
    const assigneeId = parsed.targetUserId ? users.find((u) => u.id === parsed.targetUserId || u.name.toLowerCase() === (parsed.targetUserName || "").toLowerCase())?.id : null;
    const scheduleMap = { once: "once", daily: "daily", weekly: "weekly", weekdays: "weekdays", weekends: "weekends", monthly: "monthly", yearly: "yearly" };
    const freq = scheduleMap[parsed.schedule] || "once";
    const dayNameMap = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
    let weeklyDays = [];
    if (freq === "weekly" && parsed.weeklyDays) weeklyDays = parsed.weeklyDays.map((d) => typeof d === "number" ? d : dayNameMap[d.toLowerCase()] ?? -1).filter((d) => d >= 0);
    const newTask = {
      id: uid(), name: parsed.title || parsed.description || "New task", description: parsed.description || "",
      schedule: freq, scheduleConfig: { frequency: freq, weeklyDays, monthlyDays: [], monthlyMode: "dayOfMonth", monthlyWeek: 1, monthlyWeekday: 1 },
      taskType: freq === "once" ? "one-time" : "permanent", tempConfig: null,
      dueConfig: parsed.dueDate ? { type: parsed.dueTime ? "datetime" : "date", date: parsed.dueDate, time: parsed.dueTime || "" } : { type: "none" },
      timeDue: parsed.dueTime || null, assignedTo: assigneeId ? [assigneeId] : [currentUserId], assignMode: assigneeId || "me",
      rotation: null, points: parsed.points || 10, status: "assigned", lastCompleted: null,
      createdAt: new Date().toISOString(), createdBy: currentUserId, isReminder: parsed.intent === "reminder",
    };
    setAppData((prev) => { const newData = { ...prev, tasks: [...prev.tasks, newTask] }; saveData(newData); return newData; });
    return newTask;
  };

  const executeCreateEvent = (parsed) => {
    const newEvent = {
      id: uid(), name: parsed.title || "New event", description: parsed.description || "",
      eventType: parsed.eventType || "other", date: parsed.dueDate || new Date().toISOString().slice(0, 10),
      time: parsed.dueTime || null, endDate: parsed.endDate || null, linkedMembers: parsed.linkedMembers || [],
      recurrence: parsed.recurrence || (parsed.eventType === "birthday" ? "yearly" : "none"),
      createdBy: currentUserId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    setAppData((prev) => { const newData = { ...prev, events: [...(prev.events || []), newEvent] }; saveData(newData); return newData; });
    return newEvent;
  };

  const executeCreateRecognition = (parsed) => {
    const recipientId = parsed.targetUserId ? users.find((u) => u.id === parsed.targetUserId || u.name.toLowerCase() === (parsed.targetUserName || "").toLowerCase())?.id : null;
    if (!recipientId) return null;
    const pts = parsed.points || 5;
    const reco = { id: uid(), fromUserId: currentUserId, toUserId: recipientId, message: parsed.recognitionMessage || parsed.description || parsed.title, pointsAwarded: pts, timestamp: new Date().toISOString() };
    setAppData((prev) => {
      const updatedUsers = prev.users.map((u) => u.id === recipientId ? { ...u, pointBalance: (u.pointBalance || 0) + pts } : u);
      const newData = { ...prev, recognitions: [...(prev.recognitions || []), reco], users: updatedUsers }; saveData(newData); return newData;
    });
    return reco;
  };

  const buildContext = () => {
    const activeUsers = users.filter((u) => u.status !== "pending");
    const memberList = activeUsers.map((u) => `${u.name} (id: ${u.id})`).join(", ");
    const todayTasks = tasks.filter((t) => !t.isReminder && isTaskDueToday(t));
    const todayReminders = tasks.filter((t) => t.isReminder && isTaskDueToday(t));
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayCompletions = completions.filter((c) => c.timestamp.startsWith(todayStr));
    const upcomingEvents = getUpcomingEvents(events, 7);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const weekCompletions = completions.filter((c) => c.timestamp > weekAgo);
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const twoWeekCompletions = completions.filter((c) => c.timestamp > twoWeeksAgo);
    const weekStats = activeUsers.map((u) => { const count = weekCompletions.filter((c) => c.userId === u.id).length; const pts = weekCompletions.filter((c) => c.userId === u.id).reduce((s, c) => s + (c.pointsEarned || 0), 0); return `${u.name}: ${count} tasks, ${pts} pts`; }).join("\n");
    const twoWeekStats = activeUsers.map((u) => { const count = twoWeekCompletions.filter((c) => c.userId === u.id).length; return `${u.name}: ${count} tasks`; }).join("\n");
    const taskList = todayTasks.length > 0 ? todayTasks.map((t) => { const a = (t.assignedTo || []).map((id) => users.find((u) => u.id === id)?.name || "?").join(", "); return `- ${t.name} (${a}, ${t.points || 0} pts)`; }).join("\n") : "No tasks today.";
    const completionList = todayCompletions.length > 0 ? todayCompletions.map((c) => { const u = users.find((u2) => u2.id === c.userId); const t = tasks.find((t2) => t2.id === c.taskId); return `- ${u?.name || "?"} completed "${t?.name || "?"}" (+${c.pointsEarned || 0})`; }).join("\n") : "Nothing completed yet.";
    const eventList = upcomingEvents.length > 0 ? upcomingEvents.map((e) => `- ${e.event.name}${e.daysAway === 0 ? " (TODAY)" : ` (in ${e.daysAway}d)`}`).join("\n") : "No upcoming events.";
    return { memberList, taskList, completionList, eventList, weekStats, twoWeekStats, todayTasks, todayReminders, todayCompletions, weekCompletions };
  };

  const handlePresetOption = async (optionKey) => {
    if (!AI_ENABLED || generating) return;
    setMenuOpen(false); setGenerating(optionKey);
    const ctx = buildContext(); const houseName = appData.household?.name || "Home";
    const dateStr = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    const baseRules = "Keep it to 2-4 sentences. Be warm and positive. Never shame or blame anyone.";
    const prompts = {
      agenda: `You are Divvy, household assistant for "${houseName}". Morning briefing for ${dateStr}.\nMembers: ${ctx.memberList}\nTasks:\n${ctx.taskList}\n${ctx.todayReminders.length > 0 ? `Reminders: ${ctx.todayReminders.length}` : ""}\nEvents:\n${ctx.eventList}\n${baseRules}`,
      recap: `You are Divvy, household assistant for "${houseName}". End-of-day recap for ${dateStr}.\nCompleted:\n${ctx.completionList}\nTotal: ${ctx.todayCompletions.length}\n${baseRules} Celebrate wins. Don't mention incomplete tasks.`,
      fairness: `You are Divvy, household assistant for "${houseName}". Fairness analysis.\nThis week:\n${ctx.weekStats}\nLast 2 weeks:\n${ctx.twoWeekStats}\n${baseRules} If balanced, celebrate. If uneven, frame as opportunity. 3-5 sentences.`,
      tips: `You are Divvy, household assistant for "${houseName}". Give 2-3 suggestions.\nMembers: ${ctx.memberList}\nThis week:\n${ctx.weekStats}\nToday:\n${ctx.taskList}\nEvents:\n${ctx.eventList}\n${baseRules} Be specific.`,
    };
    try { const result = await askOllama(prompts[optionKey], `Generate the ${optionKey}.`); if (result?.trim()) { const opt = DIVVY_OPTIONS.find((o) => o.key === optionKey); saveAiPost(optionKey, opt?.label || optionKey, result.trim()); } } catch (e) { console.error(e); }
    setGenerating(null);
  };

  const handleCustomMessage = async () => {
    const msg = customInput.trim(); if (!msg || !AI_ENABLED || generating) return;
    setMenuOpen(false); setGenerating("custom");
    const ctx = buildContext(); const houseName = appData.household?.name || "Home";
    const systemPrompt = `You are Divvy, AI assistant for "${houseName}". You can ANSWER QUESTIONS and TAKE ACTIONS.\n\nHOUSEHOLD:\nCurrent user: ${currentUser?.name} (id: ${currentUserId})\nMembers: ${ctx.memberList}\nDate: ${new Date().toISOString().slice(0, 10)}\nTasks:\n${ctx.taskList}\nWeek:\n${ctx.weekStats}\nEvents:\n${ctx.eventList}\n\nReturn ONLY valid JSON, no markdown.\n\nFor QUESTIONS: {"intent":"answer","message":"response"}\nFor TASKS: {"intent":"task","message":"confirmation","title":"name","description":"","targetUserId":"id or null","targetUserName":"name","schedule":"once|daily|weekly|monthly","weeklyDays":["monday"],"dueDate":"YYYY-MM-DD or null","dueTime":"HH:MM or null","points":10}\nFor REMINDERS: {"intent":"reminder","message":"confirmation","title":"name","dueDate":"YYYY-MM-DD or null","dueTime":"HH:MM or null"}\nFor EVENTS: {"intent":"event","message":"confirmation","title":"name","eventType":"birthday|appointment|gathering|school|holiday|travel|other","dueDate":"YYYY-MM-DD","dueTime":"HH:MM or null","endDate":"YYYY-MM-DD or null","linkedMembers":["id"],"recurrence":"none|yearly"}\nFor RECOGNITION: {"intent":"recognition","message":"confirmation","targetUserId":"id","targetUserName":"name","recognitionMessage":"thanks","points":5}\n\nInterpret relative dates. Match names loosely. Be warm.`;
    try {
      const result = await askOllama(systemPrompt, msg); if (!result?.trim()) throw new Error("No response");
      const parsed = JSON.parse(result.replace(/```json|```/g, "").trim());
      if (parsed.intent === "task" || parsed.intent === "reminder") { const c = executeCreateTask(parsed); saveAiPost("action", parsed.intent === "reminder" ? "Reminder Created" : "Task Created", parsed.message || `Created "${c.name}".`, msg); }
      else if (parsed.intent === "event") { const c = executeCreateEvent(parsed); saveAiPost("action", "Event Created", parsed.message || `"${c.name}" added to calendar.`, msg); }
      else if (parsed.intent === "recognition") { const c = executeCreateRecognition(parsed); saveAiPost("action", c ? "Recognition Sent" : "Error", c ? (parsed.message || "Recognition sent!") : "Couldn't find that member.", msg); }
      else { saveAiPost("custom", "Ask Divvy", parsed.message || result.trim(), msg); }
    } catch (e) {
      try { const fb = await askOllama("You are Divvy, a friendly household assistant. Answer helpfully in 2-3 sentences.", msg); if (fb?.trim()) saveAiPost("custom", "Ask Divvy", fb.trim(), msg); } catch { saveAiPost("custom", "Ask Divvy", "Sorry, I had trouble with that. Could you try rephrasing?", msg); }
    }
    setGenerating(null); setCustomInput("");
  };

  // ════════════════════════════════════════════════════════════════
  // BUILD FEED ITEMS
  // ════════════════════════════════════════════════════════════════

  const feedItems = useMemo(() => {
    const items = [];

    // AI posts
    for (const post of aiPosts) items.push({ type: "ai_post", id: post.id, timestamp: post.timestamp, aiType: post.type, label: post.label, content: post.content, userMessage: post.userMessage });

    // Public recognitions
    for (const reco of recognitions) {
      const sender = users.find((u) => u.id === reco.fromUserId); const recipient = users.find((u) => u.id === reco.toUserId);
      if (recipient?.communicationProfile?.recognitionPref === "private") continue;
      items.push({ type: "recognition", id: reco.id, timestamp: reco.timestamp, senderName: sender?.name || "Someone", senderAvatar: sender, recipientName: recipient?.name || "Someone", recipientAvatar: recipient, message: reco.message, points: reco.pointsAwarded });
    }

    // Task completions (48h)
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    for (const comp of completions) {
      if (comp.timestamp < cutoff) continue;
      const user = users.find((u) => u.id === comp.userId); const task = tasks.find((t) => t.id === comp.taskId);
      if (!task || task.isReminder) continue;
      items.push({ type: "completion", id: comp.id, timestamp: comp.timestamp, userName: user?.name || "Someone", userAvatar: user, taskName: task.name, points: comp.pointsEarned });
    }

    // Feed messages (visible to current user: household-wide OR targeted to them OR sent by them)
    for (const msg of feedMessages) {
      if (msg.targetType === "user" && msg.targetUserId !== currentUserId && msg.fromUserId !== currentUserId) continue;
      const sender = users.find((u) => u.id === msg.fromUserId);
      const targetUser = msg.targetUserId ? users.find((u) => u.id === msg.targetUserId) : null;
      items.push({
        type: "message", id: msg.id, timestamp: msg.timestamp,
        fromUserId: msg.fromUserId, senderName: sender?.name || "Someone", senderAvatar: sender,
        targetType: msg.targetType, targetUserId: msg.targetUserId, targetUserName: targetUser?.name || null,
        message: msg.message,
        replyToId: msg.replyToId, replyToPreview: msg.replyToPreview,
      });
    }

    items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return items;
  }, [recognitions, completions, users, tasks, aiPosts, feedMessages, currentUserId]);

  const timeAgo = (ts) => { const m = Math.floor((Date.now() - new Date(ts).getTime()) / 60000); if (m < 1) return "Just now"; if (m < 60) return `${m}m ago`; const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`; return `${Math.floor(h / 24)}d ago`; };
  const AI_COLORS = { agenda: "#E67E22", recap: "#8E44AD", fairness: "#2980B9", tips: "#2ECC71", custom: "#44576D", action: "#E74C3C" };

  // ════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════

  // Shared reply button for feed items
  const ReplyBtn = ({ item }) => (
    <button onClick={() => startReply(item)} style={{
      all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
      padding: "4px 10px", borderRadius: 8, fontSize: 11, color: C.steel,
      background: "transparent", transition: "all 0.15s",
    }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10l7-7v4c11 0 11 8 11 14-3-5-7-6-11-6v4l-7-7z" transform="scale(-1,1) translate(-24,0)"/></svg>
      Reply
    </button>
  );

  return (
    <div>
      {/* Title */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: fontDisplay, fontSize: 28, fontWeight: 700, color: C.dark }}>{appData.household?.name || "Home"}</h1>
        <p style={{ fontSize: 13, color: C.steel, marginTop: 4 }}>Household Feed</p>
      </div>

      {/* Action bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button onClick={onStartVoice} style={{ all: "unset", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, flex: 1, padding: "12px 10px", borderRadius: 12, background: C.gradientPrimary, boxShadow: "0 3px 16px rgba(41,53,60,0.2)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.white} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/></svg>
          <span style={{ fontFamily: font, fontWeight: 600, fontSize: 12, color: C.white }}>Voice</span>
        </button>
        <button onClick={onStartText} style={{ all: "unset", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, flex: 1, padding: "12px 10px", borderRadius: 12, background: `linear-gradient(135deg, ${C.navy} 0%, ${C.steel} 100%)`, boxShadow: "0 3px 16px rgba(41,53,60,0.2)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.white} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
          <span style={{ fontFamily: font, fontWeight: 600, fontSize: 12, color: C.white }}>Text</span>
        </button>
        {AI_ENABLED && (
          <button onClick={() => setMenuOpen(!menuOpen)} style={{
            all: "unset", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, flex: 1, padding: "12px 10px", borderRadius: 12,
            background: menuOpen ? C.ice : "linear-gradient(135deg, #E67E22 0%, #E74C3C 100%)", color: menuOpen ? C.navy : C.white,
            boxShadow: menuOpen ? "none" : "0 3px 16px rgba(230,126,34,0.3)", border: menuOpen ? `1.5px solid ${C.sky}` : "none", transition: "all 0.2s",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            <span style={{ fontFamily: font, fontWeight: 600, fontSize: 12 }}>Divvy</span>
          </button>
        )}
      </div>

      {/* ═══ COMPOSE MESSAGE ═══ */}
      <Card style={{ marginBottom: 16, padding: "14px 16px" }}>
        {/* Reply indicator */}
        {replyTo && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, background: C.ice, marginBottom: 10, fontSize: 12 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.navy} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10l7-7v4c11 0 11 8 11 14-3-5-7-6-11-6v4l-7-7z" transform="scale(-1,1) translate(-24,0)"/></svg>
            <span style={{ flex: 1, color: C.steel, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Replying to: {replyTo.preview}</span>
            <button onClick={() => setReplyTo(null)} style={{ all: "unset", cursor: "pointer", color: C.steel, fontSize: 14, lineHeight: 1 }}>×</button>
          </div>
        )}

        {/* Target selector + input */}
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <div style={{ position: "relative" }}>
            <button onClick={() => setShowTargetPicker(!showTargetPicker)} style={{
              all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
              padding: "8px 12px", borderRadius: 10, fontSize: 12, fontWeight: 600,
              background: C.ice, color: C.navy, border: `1px solid ${C.sky}`, whiteSpace: "nowrap",
            }}>
              To: {getTargetLabel()}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 9l6 6 6-6"/></svg>
            </button>
            {showTargetPicker && (
              <div style={{
                position: "absolute", top: "100%", left: 0, marginTop: 4, zIndex: 20,
                background: C.white, borderRadius: 12, border: `1px solid ${C.border}`,
                boxShadow: "0 8px 32px rgba(0,0,0,0.12)", padding: 6, minWidth: 180,
                animation: "fadeUp 0.15s ease both",
              }}>
                <button onClick={() => { setComposeTarget("household"); setShowTargetPicker(false); }} style={{
                  all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 12px", borderRadius: 8, width: "100%", boxSizing: "border-box",
                  background: composeTarget === "household" ? C.ice : "transparent",
                  fontSize: 13, fontWeight: composeTarget === "household" ? 700 : 500, color: C.dark,
                }}>
                  <span style={{ fontSize: 16 }}>🏠</span> Everyone
                </button>
                {users.filter((u) => u.id !== currentUserId && u.status !== "pending").map((u) => (
                  <button key={u.id} onClick={() => { setComposeTarget(u.id); setShowTargetPicker(false); }} style={{
                    all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 12px", borderRadius: 8, width: "100%", boxSizing: "border-box",
                    background: composeTarget === u.id ? C.ice : "transparent",
                    fontSize: 13, fontWeight: composeTarget === u.id ? 700 : 500, color: C.dark,
                  }}>
                    <Avatar name={u.name} type={u.type} size={20} image={u.avatar} crop={u.avatarCrop} />
                    {u.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <textarea
            ref={composeRef}
            style={{ ...inputStyle, flex: 1, minHeight: 38, maxHeight: 120, resize: "vertical", fontSize: 14, padding: "8px 12px" }}
            placeholder={replyTo ? "Write your reply..." : "Post a message to the feed..."}
            value={composeText}
            onChange={(e) => setComposeText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && composeText.trim()) { e.preventDefault(); sendMessage(); } }}
          />
          <button onClick={sendMessage} disabled={!composeText.trim()} style={{
            ...btnBase, padding: "8px 16px", fontSize: 12, borderRadius: 10, alignSelf: "flex-end",
            background: composeText.trim() ? C.gradientPrimary : C.ice, color: composeText.trim() ? C.white : C.steel,
          }}>Send</button>
        </div>
      </Card>

      {/* ═══ DIVVY MENU ═══ */}
      {menuOpen && (
        <Card style={{ marginBottom: 16, animation: "fadeUp 0.2s ease both" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: C.gradientPrimary, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.white} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            </div>
            <div><p style={{ fontWeight: 700, fontSize: 14, color: C.dark }}>Divvy Assistant</p><p style={{ fontSize: 11, color: C.steel }}>Ask a question or tell me what to do</p></div>
          </div>

          {/* Chat input */}
          <div style={{ padding: "12px 14px", borderRadius: 12, background: C.ice, border: `1px solid ${C.sky}`, marginBottom: 12 }}>
            <textarea ref={customRef} style={{ ...inputStyle, minHeight: 50, resize: "vertical", fontSize: 14, marginBottom: 8, background: "rgba(255,255,255,0.9)" }}
              placeholder={'Try: "Add a task for Jake to vacuum every Monday" or "How are we doing this week?"'}
              value={customInput} onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && customInput.trim()) { e.preventDefault(); handleCustomMessage(); } }} />
            <div style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center" }}>
              <p style={{ fontSize: 10, color: C.steel, flex: 1 }}>Tasks, events, reminders, recognitions, or questions</p>
              <button onClick={handleCustomMessage} disabled={!customInput.trim() || !!generating} style={{
                ...btnBase, padding: "8px 20px", fontSize: 12, borderRadius: 8,
                background: customInput.trim() && !generating ? C.gradientPrimary : C.ice, color: customInput.trim() && !generating ? C.white : C.steel,
              }}>{generating === "custom" ? "Thinking..." : "Send"}</button>
            </div>
          </div>

          {/* Quick options */}
          <p style={{ fontSize: 10, fontWeight: 700, color: C.steel, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Quick Reports</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {DIVVY_OPTIONS.map((opt) => (
              <button key={opt.key} onClick={() => handlePresetOption(opt.key)} disabled={!!generating} style={{
                all: "unset", cursor: generating ? "default" : "pointer", display: "flex", alignItems: "center", gap: 12,
                padding: "10px 14px", borderRadius: 12, background: generating === opt.key ? C.ice : "rgba(255,255,255,0.5)",
                border: `1px solid ${generating === opt.key ? C.sky : C.borderLight}`, opacity: generating && generating !== opt.key ? 0.5 : 1, transition: "all 0.15s",
              }}>
                <span style={{ fontSize: 18 }}>{opt.emoji}</span>
                <div style={{ flex: 1 }}><p style={{ fontWeight: 600, fontSize: 13, color: C.dark }}>{opt.label}</p><p style={{ fontSize: 11, color: C.steel }}>{opt.desc}</p></div>
                {generating === opt.key && <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${C.sky}`, borderTopColor: C.navy, animation: "spin 0.8s linear infinite" }} />}
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Loading */}
      {generating && !menuOpen && (
        <Card style={{ marginBottom: 14, borderLeft: `3px solid ${C.navy}`, padding: "14px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: C.gradientPrimary, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.white} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            </div>
            <p style={{ fontWeight: 600, fontSize: 13, color: C.navy }}>Divvy is thinking...</p>
          </div>
        </Card>
      )}

      {/* ═══ FEED ═══ */}
      {feedItems.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {feedItems.slice(0, 50).map((item) => {

            {/* ── User Message ── */}
            if (item.type === "message") {
              const isFromMe = item.fromUserId === currentUserId;
              const isDM = item.targetType === "user";
              return (
                <Card key={item.id} style={{ padding: "14px 18px", borderLeft: isDM ? `3px solid ${C.sky}` : undefined }}>
                  {/* Reply context */}
                  {item.replyToPreview && (
                    <div style={{ padding: "6px 10px", borderRadius: 6, background: "rgba(68,87,109,0.05)", marginBottom: 8, borderLeft: `2px solid ${C.steel}` }}>
                      <p style={{ fontSize: 11, color: C.steel, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.replyToPreview}</p>
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <Avatar name={item.senderName} type={item.senderAvatar?.type} size={32} image={item.senderAvatar?.avatar} crop={item.senderAvatar?.avatarCrop} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontWeight: 700, fontSize: 13, color: C.dark }}>{item.senderName}</span>
                        {isDM && <span style={{ fontSize: 11, color: C.sky, fontWeight: 600 }}>→ {isFromMe ? item.targetUserName : "You"}</span>}
                        {!isDM && <span style={{ fontSize: 11, color: C.steel }}>to everyone</span>}
                      </div>
                      <p style={{ fontSize: 14, color: C.dark, lineHeight: 1.5, marginTop: 4 }}>{item.message}</p>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6 }}>
                        <span style={{ fontSize: 11, color: C.steel }}>{timeAgo(item.timestamp)}</span>
                        <ReplyBtn item={item} />
                      </div>
                    </div>
                  </div>
                </Card>
              );
            }

            {/* ── AI Post ── */}
            if (item.type === "ai_post") {
              const color = AI_COLORS[item.aiType] || C.navy;
              const opt = DIVVY_OPTIONS.find((o) => o.key === item.aiType);
              return (
                <Card key={item.id} style={{ padding: "16px 18px", borderLeft: `3px solid ${color}` }}>
                  {item.userMessage && (
                    <div style={{ padding: "8px 12px", borderRadius: 10, background: "rgba(68,87,109,0.06)", marginBottom: 10 }}>
                      <p style={{ fontSize: 12, color: C.steel, fontWeight: 600 }}>You asked:</p>
                      <p style={{ fontSize: 13, color: C.dark, marginTop: 2 }}>{item.userMessage}</p>
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: C.gradientPrimary, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.white} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                    </div>
                    <div style={{ flex: 1 }}><p style={{ fontWeight: 700, fontSize: 13, color: C.navy }}>Divvy</p><p style={{ fontSize: 10, color: C.steel }}>{opt?.emoji || (item.aiType === "action" ? "✅" : "💬")} {item.label}</p></div>
                    <span style={{ fontSize: 11, color: C.steel }}>{timeAgo(item.timestamp)}</span>
                  </div>
                  <p style={{ fontSize: 14, color: C.dark, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{item.content}</p>
                  <div style={{ marginTop: 8 }}><ReplyBtn item={item} /></div>
                </Card>
              );
            }

            {/* ── Recognition ── */}
            if (item.type === "recognition") {
              return (
                <Card key={item.id} style={{ padding: "16px 18px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <Avatar name={item.senderName} type={item.senderAvatar?.type} size={32} image={item.senderAvatar?.avatar} crop={item.senderAvatar?.avatarCrop} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 700, fontSize: 13, color: C.dark }}>{item.senderName}</span>
                        <span style={{ fontSize: 12, color: C.steel }}>recognized</span>
                        <span style={{ fontWeight: 700, fontSize: 13, color: C.dark }}>{item.recipientName}</span>
                        {item.points > 0 && <span style={{ fontSize: 11, fontWeight: 600, color: C.navy, background: C.ice, padding: "2px 8px", borderRadius: 50 }}>+{item.points} pts</span>}
                      </div>
                      <p style={{ fontSize: 14, color: C.dark, lineHeight: 1.5, marginTop: 6 }}>"{item.message}"</p>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6 }}>
                        <span style={{ fontSize: 11, color: C.steel }}>{timeAgo(item.timestamp)}</span>
                        <ReplyBtn item={item} />
                      </div>
                    </div>
                  </div>
                </Card>
              );
            }

            {/* ── Completion ── */}
            if (item.type === "completion") {
              return (
                <Card key={item.id} style={{ padding: "14px 18px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <Avatar name={item.userName} type={item.userAvatar?.type} size={28} image={item.userAvatar?.avatar} crop={item.userAvatar?.avatarCrop} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 600, fontSize: 13, color: C.dark }}>{item.userName}</span>
                        <span style={{ fontSize: 12, color: C.steel }}>completed</span>
                        <span style={{ fontWeight: 600, fontSize: 13, color: C.navy }}>"{item.taskName}"</span>
                        {item.points > 0 && <span style={{ fontSize: 11, fontWeight: 600, color: "#2ECC71", background: "rgba(46,204,113,0.1)", padding: "2px 8px", borderRadius: 50 }}>+{item.points}</span>}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
                        <span style={{ fontSize: 11, color: C.steel }}>{timeAgo(item.timestamp)}</span>
                        <ReplyBtn item={item} />
                      </div>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#2ECC71" /><path d="M8 12.5l2.5 2.5 5-5" stroke={C.white} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>
                </Card>
              );
            }
            return null;
          })}
        </div>
      ) : (
        <Card style={{ textAlign: "center", padding: "32px 20px" }}>
          <p style={{ fontSize: 22, marginBottom: 8 }}>🏠</p>
          <p style={{ fontSize: 15, fontWeight: 600, color: C.dark, marginBottom: 4 }}>Your household feed</p>
          <p style={{ fontSize: 13, color: C.steel, lineHeight: 1.5 }}>Post a message, send a recognition, or ask Divvy for help to get started.</p>
        </Card>
      )}
    </div>
  );
}
