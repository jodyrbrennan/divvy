/**
 * Divvy Phase 2 Dashboard Patcher — Critical Bug Fixes
 * Run from project root: node phase2_dashboard_patch.cjs
 *
 * Fixes:
 *   2.1: Undo deducts points from wrong user (Bug 1 — HIGH)
 *   2.2: Bulk complete skips notifying the task creator (Bug 3 — MEDIUM)
 *   2.3: Voice command useEffect has stale closure data (Bug 5 — MEDIUM)
 *   2.4: AI approval overlay shows identical messages side-by-side (Bug 7 — LOW)
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'screens', 'Dashboard.jsx');

console.log('Reading Dashboard.jsx...');
let content = fs.readFileSync(filePath, 'utf-8');
let changeCount = 0;

// ═══════════════════════════════════════════════════════
// FIX 2.1: Undo deducts points from wrong user
// The bug: always deducts from appData.currentUserId
// The fix: deduct from the user who actually completed the task
// ═══════════════════════════════════════════════════════

const oldUncomplete = `  const handleUncomplete = async (taskId) => {
    const updatedTasks = appData.tasks.map((t) => t.id === taskId ? { ...t, lastCompleted: null, status: "assigned" } : t);
    const idx = [...appData.completions].reverse().findIndex((c) => c.taskId === taskId);
    let updatedCompletions = [...appData.completions];
    let pointsBack = 0;
    if (idx !== -1) { const realIdx = appData.completions.length - 1 - idx; pointsBack = appData.completions[realIdx].pointsEarned || 0; updatedCompletions.splice(realIdx, 1); }
    const updatedUsers = appData.users.map((u) => u.id === appData.currentUserId ? { ...u, pointBalance: Math.max(0, (u.pointBalance || 0) - pointsBack) } : u);
    const newData = { ...appData, tasks: updatedTasks, users: updatedUsers, completions: updatedCompletions };
    setAppData(newData); await saveData(newData);
  };`;

const newUncomplete = `  const handleUncomplete = async (taskId) => {
    const updatedTasks = appData.tasks.map((t) => t.id === taskId ? { ...t, lastCompleted: null, status: "assigned" } : t);
    const idx = [...appData.completions].reverse().findIndex((c) => c.taskId === taskId);
    let updatedCompletions = [...appData.completions];
    let pointsBack = 0;
    let completerId = appData.currentUserId; // fallback if no completion record found
    if (idx !== -1) {
      const realIdx = appData.completions.length - 1 - idx;
      pointsBack = appData.completions[realIdx].pointsEarned || 0;
      completerId = appData.completions[realIdx].userId; // deduct from whoever actually completed it
      updatedCompletions.splice(realIdx, 1);
    }
    const updatedUsers = appData.users.map((u) => u.id === completerId ? { ...u, pointBalance: Math.max(0, (u.pointBalance || 0) - pointsBack) } : u);
    const newData = { ...appData, tasks: updatedTasks, users: updatedUsers, completions: updatedCompletions };
    setAppData(newData); await saveData(newData);
  };`;

if (content.includes(oldUncomplete)) {
  content = content.replace(oldUncomplete, newUncomplete);
  console.log('✅ Fix 2.1: handleUncomplete now deducts points from the actual completer');
  changeCount++;
} else {
  console.log('⚠️  Fix 2.1: Could not find handleUncomplete block (may already be fixed)');
}

// ═══════════════════════════════════════════════════════
// FIX 2.2: Bulk complete skips notifying the task creator
// The bug: filters out appData.currentUserId instead of just userId
// The fix: remove the extra && task.createdBy !== appData.currentUserId
//          and remove && id !== appData.currentUserId from the others filter
// ═══════════════════════════════════════════════════════

const oldBulkCreatorCheck = `if (task.createdBy && task.createdBy !== userId && task.createdBy !== appData.currentUserId) {`;
const newBulkCreatorCheck = `if (task.createdBy && task.createdBy !== userId) {`;

if (content.includes(oldBulkCreatorCheck)) {
  content = content.replace(oldBulkCreatorCheck, newBulkCreatorCheck);
  console.log('✅ Fix 2.2a: Bulk complete creator notification condition fixed');
  changeCount++;
} else {
  console.log('⚠️  Fix 2.2a: Could not find bulk complete creator check');
}

const oldBulkOthersFilter = `const others = (task.assignedTo || []).filter((id) => id !== userId && id !== appData.currentUserId);`;
const newBulkOthersFilter = `const others = (task.assignedTo || []).filter((id) => id !== userId);`;

if (content.includes(oldBulkOthersFilter)) {
  content = content.replace(oldBulkOthersFilter, newBulkOthersFilter);
  console.log('✅ Fix 2.2b: Bulk complete others filter fixed');
  changeCount++;
} else {
  console.log('⚠️  Fix 2.2b: Could not find bulk complete others filter');
}

// ═══════════════════════════════════════════════════════
// FIX 2.3: Voice command useEffect has stale closure
// The bug: dependency array only has [voiceMode]
// The fix: add voiceTranscript, appData.users, appData.currentUserId
// ═══════════════════════════════════════════════════════

const oldVoiceDeps = `  }, [voiceMode]);

  const executeVoiceCommand`;
const newVoiceDeps = `  }, [voiceMode, voiceTranscript, appData.users, appData.currentUserId]);

  const executeVoiceCommand`;

if (content.includes(oldVoiceDeps)) {
  content = content.replace(oldVoiceDeps, newVoiceDeps);
  console.log('✅ Fix 2.3: Voice command useEffect dependencies updated');
  changeCount++;
} else {
  console.log('⚠️  Fix 2.3: Could not find voice useEffect dependency array');
}

// ═══════════════════════════════════════════════════════
// FIX 2.4: AI approval overlay shows identical messages
// The bug: when AI rewriting is disabled, original === rewritten,
//          but the overlay still shows both side-by-side
// The fix: when they match, show a simplified single-message view
//          with a note that AI personalization is not yet active
// ═══════════════════════════════════════════════════════

const oldApprovalHeader = `          {/* What you wrote */}
          <p style={{ fontSize: 11, fontWeight: 700, color: C.steel, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Your message</p>
          <div style={{
            background: C.bg, borderRadius: 14, padding: "14px 16px",
            border: \`1px solid \${C.border}\`, marginBottom: 18,
          }}>
            <p style={{ fontSize: 14, color: C.dark, lineHeight: 1.5 }}>{pendingApproval.original}</p>
          </div>

          {/* What recipient will see */}
          <p style={{ fontSize: 11, fontWeight: 700, color: C.navy, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
            What {pendingApproval.recipientName} will see
          </p>
          <div style={{
            background: C.ice, borderRadius: 14, padding: "14px 16px",
            border: \`1px solid \${C.sky}\`, marginBottom: 14,
            borderLeft: \`3px solid \${C.navy}\`,
          }}>
            <p style={{ fontSize: 14, color: C.dark, lineHeight: 1.5 }}>{pendingApproval.rewritten}</p>
          </div>

          {pendingApproval.original !== pendingApproval.rewritten && (
            <p style={{ fontSize: 12, color: C.steel, lineHeight: 1.5, marginBottom: 16, fontStyle: "italic" }}>
              Divvy adapts the tone to match {pendingApproval.recipientName}'s preferences. You can correct any factual inaccuracies below.
            </p>
          )}`;

const newApprovalHeader = `          {/* Message preview — simplified when AI rewriting is not active */}
          {pendingApproval.original === pendingApproval.rewritten ? (
            <>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.navy, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                Message to {pendingApproval.recipientName}
              </p>
              <div style={{
                background: C.ice, borderRadius: 14, padding: "14px 16px",
                border: \`1px solid \${C.sky}\`, marginBottom: 14,
                borderLeft: \`3px solid \${C.navy}\`,
              }}>
                <p style={{ fontSize: 14, color: C.dark, lineHeight: 1.5 }}>{pendingApproval.original}</p>
              </div>
              <p style={{ fontSize: 12, color: C.steel, lineHeight: 1.5, marginBottom: 16, fontStyle: "italic" }}>
                AI personalization is not yet active. Showing your original message.
              </p>
            </>
          ) : (
            <>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.steel, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Your message</p>
              <div style={{
                background: C.bg, borderRadius: 14, padding: "14px 16px",
                border: \`1px solid \${C.border}\`, marginBottom: 18,
              }}>
                <p style={{ fontSize: 14, color: C.dark, lineHeight: 1.5 }}>{pendingApproval.original}</p>
              </div>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.navy, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                What {pendingApproval.recipientName} will see
              </p>
              <div style={{
                background: C.ice, borderRadius: 14, padding: "14px 16px",
                border: \`1px solid \${C.sky}\`, marginBottom: 14,
                borderLeft: \`3px solid \${C.navy}\`,
              }}>
                <p style={{ fontSize: 14, color: C.dark, lineHeight: 1.5 }}>{pendingApproval.rewritten}</p>
              </div>
              <p style={{ fontSize: 12, color: C.steel, lineHeight: 1.5, marginBottom: 16, fontStyle: "italic" }}>
                Divvy adapts the tone to match {pendingApproval.recipientName}'s preferences. You can correct any factual inaccuracies below.
              </p>
            </>
          )}`;

if (content.includes(oldApprovalHeader)) {
  content = content.replace(oldApprovalHeader, newApprovalHeader);
  console.log('✅ Fix 2.4: Approval overlay now shows simplified view when AI is inactive');
  changeCount++;
} else {
  console.log('⚠️  Fix 2.4: Could not find approval overlay message section');
}

// ═══════════════════════════════════════════════════════
// WRITE
// ═══════════════════════════════════════════════════════

fs.writeFileSync(filePath, content, 'utf-8');
console.log(`\n✅ Phase 2 complete — ${changeCount} fix(es) applied to Dashboard.jsx`);
console.log('   Please run "npm run dev" and test:');
console.log('   • Complete a task as User A, switch to User B, undo it → User A should lose points');
console.log('   • Bulk-complete tasks where you are the creator → you should get notified');
console.log('   • Use voice commands after switching users → should use current user data');
console.log('   • Assign a task to someone → approval overlay should show single message (not duplicate)');
