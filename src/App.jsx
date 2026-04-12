/**
 * App.jsx — Main application shell with authentication.
 *
 * DEV BYPASS:
 * Sign up with any email containing "dev" (e.g. dev@test.com) and the app
 * skips Supabase auth entirely — no real account created, no email sent.
 * Goes straight to Create Household → Profile Setup → Dashboard.
 */

import { useState, useEffect, useRef } from "react";
import { C, font } from "./constants/colors";
import { loadData, saveData, uid, subscribeToChanges, findPendingInviteByEmail, updatePendingInviteStatus } from "./utils/storage";
import { createNotification } from "./utils/notificationHelpers";
import { rewriteForUser } from "./utils/communication";
import { propagateRelationships } from "./utils/relationships";
import { getSession, onAuthChange, signOut as authSignOut } from "./utils/auth";

import { AppDataProvider } from "./contexts/AppDataContext";

import GlobalStyles from "./components/GlobalStyles";
import ToastProvider from "./components/Toast";
import TopNav from "./components/TopNav";
import PageShell from "./components/PageShell";
import Logo from "./components/Logo";

import WelcomeScreen from "./screens/WelcomeScreen";
import SignUpScreen from "./screens/SignUpScreen";
import SignInScreen from "./screens/SignInScreen";
import VerifyEmailScreen from "./screens/VerifyEmailScreen";
import ForgotPasswordScreen from "./screens/ForgotPasswordScreen";
import ResetPasswordScreen from "./screens/ResetPasswordScreen";
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

  const [authSession, setAuthSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [verifyEmail, setVerifyEmail] = useState("");
  const [pendingInvite, setPendingInvite] = useState(null);
  const [authRouted, setAuthRouted] = useState(false);

  // ─── DEV BYPASS state ──────────────────────────────────────────
  // When set, the app acts as if this email is authenticated.
  // No real Supabase session exists — this is purely local.
  const [devEmail, setDevEmail] = useState(null);

  const appDataRef = useRef(appData);
  useEffect(() => { appDataRef.current = appData; }, [appData]);

  useEffect(() => { loadData().then((data) => { setAppData(data); }); }, []);

  useEffect(() => {
    const unsubscribe = subscribeToChanges((newData) => { setAppData(newData); });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    getSession().then((session) => { setAuthSession(session); setAuthLoading(false); });
    const unsubscribe = onAuthChange((event, session) => {
      console.log("Auth event:", event, session?.user?.email);
      setAuthSession(session);
      setAuthLoading(false);
      if (event === "PASSWORD_RECOVERY") { setScreen("resetPassword"); return; }
      if (event === "SIGNED_IN") { setAuthRouted(false); }
      if (event === "SIGNED_OUT") { setAuthRouted(false); }
    });
    return unsubscribe;
  }, []);

  // ─── Auth Routing Logic ────────────────────────────────────────
  useEffect(() => {
    if (authLoading || !appData) return;
    if (authRouted) return;
    // Don't auto-route if dev bypass is active (dev user is already routed)
    if (devEmail) return;

    if (!authSession) {
      if (screen === "loading" || screen === "signIn" || screen === "signUp") {
        setScreen("welcome");
      }
      return;
    }

    const email = authSession.user?.email?.toLowerCase().trim();
    if (!email) return;

    const existingUser = appData.users.find(
      (u) => u.email && u.email.toLowerCase() === email && u.status === "active"
    );
    if (existingUser) {
      setAppData((prev) => { const newData = { ...prev, currentUserId: existingUser.id }; saveData(newData); return newData; });
      setAuthRouted(true);
      setScreen("dashboard");
      return;
    }

    const localUserId = localStorage.getItem("divvy-current-user");
    if (localUserId) {
      const localUser = appData.users.find((u) => u.id === localUserId && u.status === "active" && !u.email);
      if (localUser) {
        setAppData((prev) => {
          const updatedUsers = prev.users.map((u) => u.id === localUserId ? { ...u, email } : u);
          const newData = { ...prev, users: updatedUsers, currentUserId: localUserId };
          saveData(newData);
          return newData;
        });
        setAuthRouted(true);
        setScreen("dashboard");
        return;
      }
    }

    (async () => {
      try {
        const { data: invite } = await findPendingInviteByEmail(email);
        if (invite) {
          await updatePendingInviteStatus(invite.id, "accepted");
          setPendingInvite(invite);
          setAppData((prev) => {
            const notification = createNotification("invite_accepted", invite.invited_by_user_id, "system",
              `${email} has accepted your invitation and is setting up their profile.`, { email });
            const newData = { ...prev, notifications: [...(prev.notifications || []), notification] };
            saveData(newData);
            return newData;
          });
          setAuthRouted(true);
          setScreen("profileSetup");
          return;
        }
      } catch (e) {
        console.log("No pending invite found for", email);
      }
      setAuthRouted(true);
      setScreen("createHousehold");
    })();
  }, [authSession, appData, authLoading, authRouted, devEmail]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── DEV BYPASS Handler ────────────────────────────────────────
  // Called from SignUpScreen when email contains "dev".
  // Skips Supabase entirely and goes straight to Create Household.
  const handleDevBypass = (email) => {
    console.log("DEV BYPASS activated for:", email);
    setDevEmail(email.toLowerCase().trim());
    setAuthRouted(true);    // Prevent the auth routing useEffect from interfering
    setScreen("createHousehold");
  };

  // ─── Helper: get the current user's email ──────────────────────
  // Returns the real auth email OR the dev bypass email.
  const getCurrentEmail = () => {
    return authSession?.user?.email?.toLowerCase().trim() || devEmail || null;
  };

  // ─── Handlers ──────────────────────────────────────────────────

  const handleHouseholdCreated = (household) => { setPendingHousehold(household); setScreen("profileSetup"); };

  const handleJoined = (result) => { setPendingHousehold(result.household); setPendingUserId(result.pendingUser?.id || null); setScreen("profileSetup"); };

  const handleProfileComplete = async (profile) => {
    const newUserId = pendingUserId || uid();
    const email = getCurrentEmail();  // Uses real auth OR dev bypass email

    setAppData((prev) => {
      let newData;
      if (pendingUserId) {
        const updatedUsers = prev.users.map((u) =>
          u.id === pendingUserId ? { ...u, name: profile.name, email, type: "full", status: "active", inviteCode: null,
            communicationProfile: { tone: profile.tone, sensitivity: profile.sensitivity, forgetfulness: profile.forgetfulness,
              undoneFeelings: profile.undoneFeelings, askStyle: profile.askStyle, notifFrequency: profile.notifFrequency, recognitionPref: profile.recognitionPref } } : u
        );
        newData = { ...prev, household: pendingHousehold || prev.household, users: updatedUsers, currentUserId: pendingUserId };
      } else {
        const user = { id: newUserId, name: profile.name, email, type: profile.type, pointBalance: 0,
          relationships: {}, relationshipTags: {},
          communicationProfile: { tone: profile.tone, sensitivity: profile.sensitivity, forgetfulness: profile.forgetfulness,
            undoneFeelings: profile.undoneFeelings, askStyle: profile.askStyle, notifFrequency: profile.notifFrequency, recognitionPref: profile.recognitionPref } };
        newData = { ...prev, household: pendingHousehold || prev.household, users: [...(prev?.users || []), user], currentUserId: user.id };
      }
      saveData(newData);
      return newData;
    });

    if (pendingInvite) {
      try { await updatePendingInviteStatus(pendingInvite.id, "completed"); } catch (e) { console.error("Failed to update invite status:", e); }
      setAppData((prev) => {
        const notification = createNotification("invite_completed", pendingInvite.invited_by_user_id, "system",
          `${profile.name} has finished setting up their profile and joined the household!`, { email: pendingInvite.email, newMemberName: profile.name });
        const relationshipNotifs = prev.users.filter((u) => u.id !== newUserId && u.status !== "pending").map((existing) =>
          createNotification("relationship", existing.id, "system", `${profile.name} has joined the household. Please update your relationship with them.`, { newMemberId: newUserId }));
        const newData = { ...prev, notifications: [...(prev.notifications || []), notification, ...relationshipNotifs] };
        saveData(newData);
        return newData;
      });
      setPendingInvite(null);
    }
    setPendingUserId(null);
    setScreen("dashboard");
  };

  const handleAddMember = (memberData) => {
    if (memberData.type === "invite") {
      setAppData((prev) => {
        const notification = createNotification("invite_sent", prev.currentUserId, "system",
          `Invitation email sent to ${memberData.email} successfully.`, { email: memberData.email });
        const newData = { ...prev, notifications: [...(prev.notifications || []), notification] };
        saveData(newData);
        return newData;
      });
      setScreen("dashboard");
      return;
    }

    const userId = uid();
    const newUserRels = {};
    if (memberData.relationships) { for (const [key, val] of Object.entries(memberData.relationships)) { if (key === "__creator__") newUserRels[appData.currentUserId] = val; else newUserRels[key] = val; } }
    const user = { id: userId, name: memberData.name, type: memberData.type, status: memberData.status || "active", pointBalance: 0,
      managedBy: memberData.type === "dependent" ? appData.currentUserId : null, inviteCode: memberData.inviteCode || null,
      relationships: newUserRels, relationshipTags: {},
      communicationProfile: memberData.communicationProfile || (memberData.type === "dependent" ? { tone: "casual", sensitivity: "low", forgetfulness: "sometimes", undoneFeelings: "unbothered", askStyle: "direct", notifFrequency: "moderate", recognitionPref: "public" } : null) };

    setAppData((prev) => {
      let updatedUsers = [...prev.users];
      if (memberData.creatorRelationship) { updatedUsers = updatedUsers.map((u) => u.id === prev.currentUserId ? { ...u, relationships: { ...(u.relationships || {}), [userId]: memberData.creatorRelationship } } : u); }
      let notifications = [...(prev.notifications || [])];
      for (const existing of prev.users) { if (existing.id === prev.currentUserId) continue; if (existing.status === "pending") continue;
        notifications.push(createNotification("relationship", existing.id, prev.currentUserId, `${memberData.name} has joined the household. Please update your relationship with them.`, { newMemberId: userId })); }
      const allUsers = [...updatedUsers, user].map((u) => ({ ...u, relationships: { ...(u.relationships || {}) } }));
      const propagated = propagateRelationships(allUsers);
      const newData = { ...prev, users: propagated, notifications };
      saveData(newData);
      return newData;
    });
    if (memberData.type === "dependent") setScreen("dashboard");
  };

  const handleTaskCreated = async (task) => {
    let taskToAdd = { ...task };
    const deleteTaskId = task._deleteTaskId;
    if (deleteTaskId) delete taskToAdd._deleteTaskId;
    setAppData((prev) => { let tasks = [...prev.tasks]; if (deleteTaskId) { tasks = tasks.filter((t) => t.id !== deleteTaskId); } const newData = { ...prev, tasks: [...tasks, taskToAdd] }; saveData(newData); return newData; });
    const creator = appData.users.find((u) => u.id === appData.currentUserId);
    const assignees = (task.assignedTo || []).filter((id) => id !== appData.currentUserId);
    if (assignees.length > 0) {
      const recipient = appData.users.find((u) => u.id === assignees[0]);
      if (recipient) {
        const creatorTags = creator?.relationshipTags || {};
        const tag = creatorTags[recipient.id] || creator?.name || "Someone";
        const rawMsg = `${creator?.name || "Someone"} assigned you a new task: "${task.name}"${task.dueConfig?.date ? ` — due ${task.dueConfig.date}` : ""}`;
        const rewritten = await rewriteForUser(rawMsg, creator?.name || "Someone", recipient.communicationProfile, tag);
        setPendingPreview({ recipientName: recipient.name, recipientId: recipient.id, original: rawMsg, rewritten, senderTag: tag, type: "task", meta: { taskId: task.id } });
      }
    }
    setScreen("dashboard");
  };

  const handleTaskEdited = (updatedTask) => {
    setAppData((prev) => { const newData = { ...prev, tasks: prev.tasks.map((t) => t.id === updatedTask.id ? updatedTask : t) }; saveData(newData); return newData; });
    setEditingTask(null);
    setScreen("dashboard");
  };

  const handlePasswordResetComplete = () => {
    if (!appData || !authSession?.user?.email) { setScreen("signIn"); return; }
    const email = authSession.user.email.toLowerCase().trim();
    const existingUser = appData.users.find((u) => u.email && u.email.toLowerCase() === email && u.status === "active");
    if (existingUser) { setAppData((prev) => { const newData = { ...prev, currentUserId: existingUser.id }; saveData(newData); return newData; }); setScreen("dashboard"); }
    else { setScreen("signIn"); }
  };

  const handleSignOut = async () => {
    // Clear dev bypass if active
    if (devEmail) {
      setDevEmail(null);
    } else {
      await authSignOut();
    }
    localStorage.removeItem("divvy-current-user");
    setAppData((prev) => ({ ...prev, currentUserId: null }));
    setAuthSession(null);
    setAuthRouted(false);
    setScreen("welcome");
  };

  // ─── Loading Screen ────────────────────────────────────────────
  if (screen === "loading" || !appData || authLoading) {
    return (<PageShell narrow><div style={{ textAlign: "center", marginTop: 140 }}><Logo size={44} />
      <div style={{ marginTop: 20, height: 3, width: 60, borderRadius: 2, margin: "20px auto 0",
        background: `linear-gradient(90deg, ${C.ice}, ${C.sky}, ${C.ice})`, backgroundSize: "200% 100%", animation: "shimmer 1.5s ease infinite" }} />
    </div></PageShell>);
  }

  const loggedIn = appData?.currentUserId && ["dashboard", "createTask", "editTask", "createReminder", "addMember"].includes(screen);
  const currentUserName = appData?.users?.find((u) => u.id === appData?.currentUserId)?.name || "";
  const myUnreadCount = (appData?.notifications || []).filter((n) => n.targetUserId === appData?.currentUserId && !n.read).length;

  return (
    <ToastProvider>
      <GlobalStyles />
      <AppDataProvider appData={appData} setAppData={setAppData}>
        {loggedIn && <TopNav userName={currentUserName} unreadCount={myUnreadCount}
          onBellClick={() => {
            setAppData((prev) => { const updated = (prev.notifications || []).map((n) => n.targetUserId === prev.currentUserId ? { ...n, read: true } : n);
              const newData = { ...prev, notifications: updated }; saveData(newData); return newData; });
            setScreen("dashboard"); setRequestedView("notifications");
          }}
          onSettings={() => { setScreen("dashboard"); setRequestedView("settings"); }}
          onSignOut={handleSignOut}
        />}

        {screen === "welcome" && <WelcomeScreen onSignUp={() => setScreen("signUp")} onSignIn={() => setScreen("signIn")} />}
        {screen === "signUp" && <SignUpScreen
          onSignUpSuccess={(email) => { setVerifyEmail(email); setScreen("verifyEmail"); }}
          onDevBypass={handleDevBypass}
          onBack={() => setScreen("welcome")}
        />}
        {screen === "signIn" && <SignInScreen onBack={() => setScreen("welcome")} onForgotPassword={() => setScreen("forgotPassword")} />}
        {screen === "verifyEmail" && <VerifyEmailScreen email={verifyEmail} onBackToSignIn={() => setScreen("signIn")} />}
        {screen === "forgotPassword" && <ForgotPasswordScreen onBack={() => setScreen("signIn")} />}
        {screen === "resetPassword" && <ResetPasswordScreen onComplete={handlePasswordResetComplete} />}

        {screen === "createHousehold" && <CreateHouseholdScreen onCreated={handleHouseholdCreated} onBack={() => setScreen("welcome")} />}
        {screen === "joinHousehold" && <JoinHouseholdScreen onJoined={handleJoined} onBack={() => setScreen("welcome")} />}
        {screen === "inviteCode" && <InviteCodeScreen household={pendingHousehold} onContinue={() => setScreen("profileSetup")} />}
        {screen === "profileSetup" && <ProfileSetupScreen onComplete={handleProfileComplete} householdName={pendingHousehold?.name || appData.household?.name || "your home"} />}

        {screen === "dashboard" && <Dashboard onAddMember={() => setScreen("addMember")} onCreateTask={() => setScreen("createTask")}
          onCreateReminder={() => setScreen("createReminder")} onEditTask={(task) => { setEditingTask(task); setScreen("editTask"); }}
          requestedView={requestedView} clearRequestedView={() => setRequestedView(null)}
          pendingPreview={pendingPreview} clearPendingPreview={() => setPendingPreview(null)} />}
        {screen === "createTask" && <CreateTaskScreen onComplete={handleTaskCreated} onBack={() => setScreen("dashboard")} />}
        {screen === "editTask" && <CreateTaskScreen editingTask={editingTask} onComplete={handleTaskEdited} onBack={() => { setEditingTask(null); setScreen("dashboard"); }} />}
        {screen === "createReminder" && <CreateTaskScreen isReminder onComplete={handleTaskCreated} onBack={() => setScreen("dashboard")} />}
        {screen === "addMember" && <AddMemberScreen onComplete={handleAddMember} onBack={() => setScreen("dashboard")} />}
      </AppDataProvider>
    </ToastProvider>
  );
}
