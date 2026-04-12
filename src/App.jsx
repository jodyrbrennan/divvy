import { useState, useEffect } from "react";
import { C, font } from "./constants/colors";
import { loadData, saveData, uid, subscribeToChanges } from "./utils/storage";
import { createNotification } from "./utils/notificationHelpers";
import { rewriteForUser } from "./utils/communication";
import { propagateRelationships } from "./utils/relationships";

// Phase 7.1: Import the context provider
import { AppDataProvider } from "./contexts/AppDataContext";

import GlobalStyles from "./components/GlobalStyles";
import ToastProvider from "./components/Toast";
import TopNav from "./components/TopNav";
import PageShell from "./components/PageShell";
import Logo from "./components/Logo";
import WelcomeScreen from "./screens/WelcomeScreen";
import CreateHouseholdScreen from "./screens/CreateHouseholdScreen";
import JoinHouseholdScreen from "./screens/JoinHouseholdScreen";
import InviteCodeScreen from "./screens/InviteCodeScreen";
import ProfileSetupScreen from "./screens/ProfileSetupScreen";
import Dashboard from "./screens/Dashboard";
import CreateTaskScreen from "./screens/CreateTaskScreen";
import AddMemberScreen from "./screens/AddMemberScreen";

export default function App() {
  const [appData, setAppData] = useState(null);
  const [screen, setScreen] = useState("loading");
  const [pendingHousehold, setPendingHousehold] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [requestedView, setRequestedView] = useState(null);
  const [pendingPreview, setPendingPreview] = useState(null);
  const [pendingUserId, setPendingUserId] = useState(null);

  useEffect(() => {
    loadData().then((data) => {
      setAppData(data);
      setScreen(data.household && data.currentUserId ? "dashboard" : "welcome");
    });
  }, []);

  // Real-time sync: update when another device changes data
  useEffect(() => {
    const unsubscribe = subscribeToChanges((newData) => {
      setAppData(newData);
    });
    return () => unsubscribe();
  }, []);

  const handleHouseholdCreated = (household) => { setPendingHousehold(household); setScreen("profileSetup"); };

  const handleJoined = (result) => {
    setPendingHousehold(result.household);
    setPendingUserId(result.pendingUser?.id || null);
    setScreen("profileSetup");
  };

  // Phase 6.2: Uses functional updater to prevent race conditions
  const handleProfileComplete = (profile) => {
    const newUserId = pendingUserId || uid();

    setAppData(prev => {
      let newData;

      if (pendingUserId) {
        const updatedUsers = prev.users.map((u) =>
          u.id === pendingUserId
            ? {
                ...u,
                name: profile.name,
                type: "full",
                status: "active",
                inviteCode: null,
                communicationProfile: {
                  tone: profile.tone, sensitivity: profile.sensitivity, forgetfulness: profile.forgetfulness,
                  undoneFeelings: profile.undoneFeelings, askStyle: profile.askStyle,
                  notifFrequency: profile.notifFrequency, recognitionPref: profile.recognitionPref,
                },
              }
            : u
        );
        newData = {
          ...prev,
          household: pendingHousehold || prev.household,
          users: updatedUsers,
          currentUserId: pendingUserId,
        };
      } else {
        const user = {
          id: newUserId, name: profile.name, type: profile.type, pointBalance: 0,
          relationships: {}, relationshipTags: {},
          communicationProfile: {
            tone: profile.tone, sensitivity: profile.sensitivity, forgetfulness: profile.forgetfulness,
            undoneFeelings: profile.undoneFeelings, askStyle: profile.askStyle,
            notifFrequency: profile.notifFrequency, recognitionPref: profile.recognitionPref,
          },
        };
        newData = {
          ...prev, household: pendingHousehold || prev.household,
          users: [...(prev?.users || []), user], currentUserId: user.id,
        };
      }

      saveData(newData);
      return newData;
    });

    setPendingUserId(null);
    setScreen("dashboard");
  };

  // Phase 6.2: Uses functional updater to prevent race conditions
  const handleAddMember = (memberData) => {
    const userId = uid();

    const newUserRels = {};
    if (memberData.relationships) {
      for (const [key, val] of Object.entries(memberData.relationships)) {
        if (key === "__creator__") newUserRels[appData.currentUserId] = val;
        else newUserRels[key] = val;
      }
    }

    const user = {
      id: userId,
      name: memberData.name,
      type: memberData.type,
      status: memberData.status || "active",
      pointBalance: 0,
      managedBy: memberData.type === "dependent" ? appData.currentUserId : null,
      inviteCode: memberData.inviteCode || null,
      relationships: newUserRels,
      relationshipTags: {},
      communicationProfile: memberData.communicationProfile || (memberData.type === "dependent" ? {
        tone: "casual", sensitivity: "low", forgetfulness: "sometimes",
        undoneFeelings: "unbothered", askStyle: "direct",
        notifFrequency: "moderate", recognitionPref: "public",
      } : null),
    };

    setAppData(prev => {
      let updatedUsers = [...prev.users];
      if (memberData.creatorRelationship) {
        updatedUsers = updatedUsers.map((u) =>
          u.id === prev.currentUserId
            ? { ...u, relationships: { ...(u.relationships || {}), [userId]: memberData.creatorRelationship } }
            : u
        );
      }

      let notifications = [...(prev.notifications || [])];
      for (const existing of prev.users) {
        if (existing.id === prev.currentUserId) continue;
        notifications.push(
          createNotification("relationship", existing.id, prev.currentUserId,
            `${memberData.name} has joined the household. Please update your relationship with them.`,
            { newMemberId: userId })
        );
      }

      const allUsers = [...updatedUsers, user].map((u) => ({ ...u, relationships: { ...(u.relationships || {}) } }));
      const propagated = propagateRelationships(allUsers);

      const newData = { ...prev, users: propagated, notifications };
      saveData(newData);
      return newData;
    });

    if (memberData.type === "dependent") setScreen("dashboard");
  };

  // Phase 6.2: Uses functional updater to prevent race conditions
  const handleTaskCreated = async (task) => {
    // Build the task data before updating state
    let taskToAdd = { ...task };
    const deleteTaskId = task._deleteTaskId;
    if (deleteTaskId) delete taskToAdd._deleteTaskId;

    setAppData(prev => {
      let tasks = [...prev.tasks];
      if (deleteTaskId) {
        tasks = tasks.filter((t) => t.id !== deleteTaskId);
      }
      const newData = { ...prev, tasks: [...tasks, taskToAdd] };
      saveData(newData);
      return newData;
    });

    // Side effects: send notification preview for assignees (reads closure for display data)
    const creator = appData.users.find((u) => u.id === appData.currentUserId);
    const assignees = (task.assignedTo || []).filter((id) => id !== appData.currentUserId);
    if (assignees.length > 0) {
      const recipient = appData.users.find((u) => u.id === assignees[0]);
      if (recipient) {
        const creatorTags = creator?.relationshipTags || {};
        const tag = creatorTags[recipient.id] || creator?.name || "Someone";
        const rawMsg = `${creator?.name || "Someone"} assigned you a new task: "${task.name}"${task.dueConfig?.date ? ` — due ${task.dueConfig.date}` : ""}`;
        const rewritten = await rewriteForUser(rawMsg, creator?.name || "Someone", recipient.communicationProfile, tag);
        setPendingPreview({
          recipientName: recipient.name,
          recipientId: recipient.id,
          original: rawMsg,
          rewritten,
          senderTag: tag,
          type: "task",
          meta: { taskId: task.id },
        });
      }
    }
    setScreen("dashboard");
  };

  // Phase 6.2: Uses functional updater to prevent race conditions
  const handleTaskEdited = (updatedTask) => {
    setAppData(prev => {
      const newData = { ...prev, tasks: prev.tasks.map((t) => t.id === updatedTask.id ? updatedTask : t) };
      saveData(newData);
      return newData;
    });
    setEditingTask(null);
    setScreen("dashboard");
  };

  if (screen === "loading" || !appData) {
    return (
      <PageShell narrow>
        <div style={{ textAlign: "center", marginTop: 140 }}>
          <Logo size={44} />
          <div style={{
            marginTop: 20, height: 3, width: 60, borderRadius: 2, margin: "20px auto 0",
            background: `linear-gradient(90deg, ${C.ice}, ${C.sky}, ${C.ice})`,
            backgroundSize: "200% 100%", animation: "shimmer 1.5s ease infinite",
          }} />
        </div>
      </PageShell>
    );
  }

  const loggedIn = appData?.currentUserId && ["dashboard", "createTask", "editTask", "createReminder", "addMember"].includes(screen);
  const currentUserName = appData?.users?.find((u) => u.id === appData?.currentUserId)?.name || "";
  const myUnreadCount = (appData?.notifications || []).filter((n) => n.targetUserId === appData?.currentUserId && !n.read).length;

  return (
    <ToastProvider>
      <GlobalStyles />
      {/* Phase 7.1: Wrap everything in AppDataProvider so any component
          can access appData via useAppData() instead of receiving props */}
      <AppDataProvider appData={appData} setAppData={setAppData}>
        {loggedIn && <TopNav userName={currentUserName} unreadCount={myUnreadCount}
          onBellClick={() => {
            // Phase 6.2: functional updater for marking notifications read
            setAppData(prev => {
              const updated = (prev.notifications || []).map((n) =>
                n.targetUserId === prev.currentUserId ? { ...n, read: true } : n
              );
              const newData = { ...prev, notifications: updated };
              saveData(newData);
              return newData;
            });
            setScreen("dashboard");
            setRequestedView("notifications");
          }}
          onSettings={() => {
            setScreen("dashboard");
            setRequestedView("settings");
          }}
          onSignOut={() => {
            localStorage.removeItem('divvy-current-user');
            setAppData({ ...appData, currentUserId: null });
            setScreen("welcome");
          }}
        />}
        {screen === "welcome" && <WelcomeScreen onCreateNew={() => setScreen("createHousehold")} onJoin={() => setScreen("joinHousehold")} />}
        {screen === "createHousehold" && <CreateHouseholdScreen onCreated={handleHouseholdCreated} onBack={() => setScreen("welcome")} />}
        {screen === "joinHousehold" && <JoinHouseholdScreen onJoined={handleJoined} onBack={() => setScreen("welcome")} />}
        {screen === "inviteCode" && <InviteCodeScreen household={pendingHousehold} onContinue={() => setScreen("profileSetup")} />}
        {screen === "profileSetup" && <ProfileSetupScreen onComplete={handleProfileComplete} householdName={pendingHousehold?.name || appData.household?.name || "your home"} />}
        {/* Phase 7.1: Dashboard no longer receives appData/setAppData as props —
            it pulls them from context. Only navigation callbacks remain as props. */}
        {screen === "dashboard" && <Dashboard
          onAddMember={() => setScreen("addMember")}
          onCreateTask={() => setScreen("createTask")}
          onCreateReminder={() => setScreen("createReminder")}
          onEditTask={(task) => { setEditingTask(task); setScreen("editTask"); }}
          requestedView={requestedView} clearRequestedView={() => setRequestedView(null)}
          pendingPreview={pendingPreview} clearPendingPreview={() => setPendingPreview(null)}
        />}
        {/* Phase 7.1: CreateTaskScreen uses context for users/currentUserId/tasks */}
        {screen === "createTask" && <CreateTaskScreen onComplete={handleTaskCreated} onBack={() => setScreen("dashboard")} />}
        {screen === "editTask" && <CreateTaskScreen editingTask={editingTask} onComplete={handleTaskEdited} onBack={() => { setEditingTask(null); setScreen("dashboard"); }} />}
        {screen === "createReminder" && <CreateTaskScreen isReminder onComplete={handleTaskCreated} onBack={() => setScreen("dashboard")} />}
        {screen === "addMember" && <AddMemberScreen onComplete={handleAddMember} onBack={() => setScreen("dashboard")} />}
      </AppDataProvider>
    </ToastProvider>
  );
}
