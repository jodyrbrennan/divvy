import { useState, useEffect } from "react";
import { C, font } from "./constants/colors";
import { loadData, saveData, uid } from "./utils/storage";
import { rewriteForUser } from "./utils/communication";
import { propagateRelationships } from "./utils/relationships";
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

  useEffect(() => {
    loadData().then((data) => {
      setAppData(data);
      setScreen(data.household && data.currentUserId ? "dashboard" : "welcome");
    });
  }, []);

  const handleHouseholdCreated = (household) => { setPendingHousehold(household); setScreen("profileSetup"); };
  const handleJoined = (household) => { setPendingHousehold(household); setScreen("profileSetup"); };

  const handleProfileComplete = async (profile) => {
    const user = {
      id: uid(), name: profile.name, type: profile.type, pointBalance: 0,
      relationships: {}, relationshipTags: {},
      communicationProfile: {
        tone: profile.tone, sensitivity: profile.sensitivity, forgetfulness: profile.forgetfulness,
        undoneFeelings: profile.undoneFeelings, askStyle: profile.askStyle,
        notifFrequency: profile.notifFrequency, recognitionPref: profile.recognitionPref,
      },
    };
    const newData = {
      ...appData, household: pendingHousehold || appData.household,
      users: [...(appData?.users || []), user], currentUserId: user.id,
    };
    setAppData(newData);
    await saveData(newData);
    setScreen("dashboard");
  };

  const handleAddMember = async (memberData) => {
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

    let updatedUsers = [...appData.users];
    if (memberData.creatorRelationship) {
      updatedUsers = updatedUsers.map((u) =>
        u.id === appData.currentUserId
          ? { ...u, relationships: { ...(u.relationships || {}), [userId]: memberData.creatorRelationship } }
          : u
      );
    }

    let notifications = [...(appData.notifications || [])];
    for (const existing of appData.users) {
      if (existing.id === appData.currentUserId) continue;
      notifications.push({
        id: uid(), type: "relationship", targetUserId: existing.id, fromUserId: appData.currentUserId,
        rawMessage: `${memberData.name} has joined the household. Please update your relationship with them.`,
        message: `${memberData.name} has joined the household. Please update your relationship with them.`,
        read: false, timestamp: new Date().toISOString(), newMemberId: userId,
      });
    }

    const allUsers = [...updatedUsers, user].map((u) => ({ ...u, relationships: { ...(u.relationships || {}) } }));
    const propagated = propagateRelationships(allUsers);

    const newData = { ...appData, users: propagated, notifications };
    setAppData(newData);
    await saveData(newData);
    if (memberData.type === "dependent") setScreen("dashboard");
  };

  const handleTaskCreated = async (task) => {
    let tasks = [...appData.tasks];
    if (task._deleteTaskId) {
      tasks = tasks.filter((t) => t.id !== task._deleteTaskId);
      delete task._deleteTaskId;
    }
    const newData = { ...appData, tasks: [...tasks, task] };
    setAppData(newData);
    await saveData(newData);

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

  const handleTaskEdited = async (updatedTask) => {
    const newData = { ...appData, tasks: appData.tasks.map((t) => t.id === updatedTask.id ? updatedTask : t) };
    setAppData(newData);
    await saveData(newData);
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

  const loggedIn = appData?.currentUserId && ["dashboard", "createTask", "editTask", "addMember"].includes(screen);
  const currentUserName = appData?.users?.find((u) => u.id === appData?.currentUserId)?.name || "";
  const myUnreadCount = (appData?.notifications || []).filter((n) => n.targetUserId === appData?.currentUserId && !n.read).length;

  return (
    <ToastProvider>
      <GlobalStyles />
      {loggedIn && <TopNav userName={currentUserName} unreadCount={myUnreadCount} onBellClick={async () => {
        const updated = (appData.notifications || []).map((n) =>
          n.targetUserId === appData.currentUserId ? { ...n, read: true } : n
        );
        const newData = { ...appData, notifications: updated };
        setAppData(newData);
        await saveData(newData);
        setScreen("dashboard");
        setRequestedView("notifications");
      }} />}
      {screen === "welcome" && <WelcomeScreen onCreateNew={() => setScreen("createHousehold")} onJoin={() => setScreen("joinHousehold")} />}
      {screen === "createHousehold" && <CreateHouseholdScreen onCreated={handleHouseholdCreated} onBack={() => setScreen("welcome")} />}
      {screen === "joinHousehold" && <JoinHouseholdScreen appData={appData} onJoined={handleJoined} onBack={() => setScreen("welcome")} />}
      {screen === "inviteCode" && <InviteCodeScreen household={pendingHousehold} onContinue={() => setScreen("profileSetup")} />}
      {screen === "profileSetup" && <ProfileSetupScreen onComplete={handleProfileComplete} householdName={pendingHousehold?.name || appData.household?.name || "your home"} />}
      {screen === "dashboard" && <Dashboard appData={appData} setAppData={setAppData}
        onAddMember={() => setScreen("addMember")}
        onCreateTask={() => setScreen("createTask")}
        onEditTask={(task) => { setEditingTask(task); setScreen("editTask"); }}
        requestedView={requestedView} clearRequestedView={() => setRequestedView(null)}
        pendingPreview={pendingPreview} clearPendingPreview={() => setPendingPreview(null)}
      />}
      {screen === "createTask" && <CreateTaskScreen onComplete={handleTaskCreated} onBack={() => setScreen("dashboard")} users={appData.users} currentUserId={appData.currentUserId} existingTasks={appData.tasks} />}
      {screen === "editTask" && <CreateTaskScreen editingTask={editingTask} onComplete={handleTaskEdited} onBack={() => { setEditingTask(null); setScreen("dashboard"); }} users={appData.users} currentUserId={appData.currentUserId} existingTasks={appData.tasks} />}
      {screen === "addMember" && <AddMemberScreen onComplete={handleAddMember} onBack={() => setScreen("dashboard")} />}
    </ToastProvider>
  );
}
