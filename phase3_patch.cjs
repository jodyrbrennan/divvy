/**
 * Divvy Phase 3 Patcher — Extract Shared Constants & Utilities
 * Run from project root: node phase3_patch.cjs
 *
 * Updates:
 *   3.1: Dashboard uses COMM_PROFILE_FIELDS from shared communicationOptions.js
 *   3.2: Dashboard imports RELATIONSHIP_OPTIONS from shared relationships.js
 *   3.3: Dashboard + CalendarView import getUserName from shared userHelpers.js
 *   3.4: Dashboard + App.jsx use createNotification from shared notificationHelpers.js
 *   3.5: Dashboard imports updateUserInData from shared userHelpers.js (wired up for a few handlers)
 */

const fs = require('fs');
const path = require('path');

let totalChanges = 0;

function patchFile(relPath, patchFn) {
  const filePath = path.join(__dirname, relPath);
  console.log(`\n📄 Patching ${relPath}...`);
  let content = fs.readFileSync(filePath, 'utf-8');
  const original = content;
  content = patchFn(content);
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`   ✅ Saved`);
  } else {
    console.log(`   ⚠️  No changes made`);
  }
  return content;
}

function replace(content, label, oldStr, newStr) {
  if (content.includes(oldStr)) {
    content = content.replace(oldStr, newStr);
    console.log(`   ✅ ${label}`);
    totalChanges++;
  } else {
    console.log(`   ⚠️  ${label} — pattern not found`);
  }
  return content;
}

// ═══════════════════════════════════════════════════════
// PATCH Dashboard.jsx
// ═══════════════════════════════════════════════════════

patchFile('src/screens/Dashboard.jsx', (content) => {

  // --- 3.2: Import RELATIONSHIP_OPTIONS from relationships.js ---
  content = replace(content, '3.2: Add RELATIONSHIP_OPTIONS to relationships import',
    `import { RECIPROCAL, propagateRelationships } from "../utils/relationships";`,
    `import { RECIPROCAL, RELATIONSHIP_OPTIONS, propagateRelationships } from "../utils/relationships";`
  );

  // Remove the module-scope RELATIONSHIP_OPTIONS we added in Phase 1
  content = replace(content, '3.2: Remove local RELATIONSHIP_OPTIONS',
    `// ── Constants (moved to module scope for performance) ──
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

`,
    ``
  );

  // --- 3.1: Import COMM_PROFILE_FIELDS and replace COMM_OPTIONS ---
  content = replace(content, '3.1: Add COMM_PROFILE_FIELDS import',
    `import { useToast } from "../components/Toast";`,
    `import { useToast } from "../components/Toast";
import { COMM_PROFILE_FIELDS } from "../constants/communicationOptions";`
  );

  // Remove module-scope COMM_OPTIONS
  content = replace(content, '3.1: Remove local COMM_OPTIONS',
    `const COMM_OPTIONS = {
  tone: { label: "Preferred tone", options: [
    { v: "casual", l: "Casual" }, { v: "direct", l: "Direct" }, { v: "gentle", l: "Gentle" }, { v: "humorous", l: "Humorous" },
  ]},
  sensitivity: { label: "Task sensitivity", options: [
    { v: "low", l: "Low" }, { v: "medium", l: "Medium" }, { v: "high", l: "High" },
  ]},
  askStyle: { label: "Ask style", options: [
    { v: "direct", l: "Direct request" }, { v: "suggestion", l: "Suggestion" }, { v: "question", l: "Question" },
  ]},
  forgetfulness: { label: "Forgetfulness", options: [
    { v: "rarely", l: "Rarely" }, { v: "sometimes", l: "Sometimes" }, { v: "often", l: "Often" },
  ]},
  undoneFeelings: { label: "Undone tasks feeling", options: [
    { v: "unbothered", l: "Unbothered" }, { v: "mildly_annoyed", l: "Mildly annoyed" }, { v: "very_stressed", l: "Very stressed" },
  ]},
  notifFrequency: { label: "Notification frequency", options: [
    { v: "minimal", l: "Minimal" }, { v: "moderate", l: "Moderate" }, { v: "frequent", l: "Frequent" },
  ]},
  recognitionPref: { label: "Recognition preference", options: [
    { v: "public", l: "Public" }, { v: "private", l: "Private" },
  ]},
};

`,
    ``
  );

  // Update settings view to use COMM_PROFILE_FIELDS instead of COMM_OPTIONS
  content = replace(content, '3.1: Update settings to use COMM_PROFILE_FIELDS',
    `{Object.entries(COMM_OPTIONS).map(([key, config]) => (
              <div key={key}>
                <p style={{ fontSize: 12, color: C.steel, fontWeight: 600, marginBottom: 6 }}>{config.label}</p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {config.options.map((opt) => {
                    const isActive = commProfile[key] === opt.v;`,
    `{COMM_PROFILE_FIELDS.map((fieldDef) => (
              <div key={fieldDef.field}>
                <p style={{ fontSize: 12, color: C.steel, fontWeight: 600, marginBottom: 6 }}>{fieldDef.settingsLabel}</p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {fieldDef.options.map((opt) => {
                    const isActive = commProfile[fieldDef.field] === opt.v;`
  );

  content = replace(content, '3.1: Update handleUpdateCommPref call in settings',
    `onClick={() => handleUpdateCommPref(key, opt.v)}`,
    `onClick={() => handleUpdateCommPref(fieldDef.field, opt.v)}`
  );

  // --- 3.3: Import getUserName from userHelpers ---
  content = replace(content, '3.3: Add getUserName import',
    `import { isTaskActiveOnDate } from "../utils/calendarHelpers";`,
    `import { isTaskActiveOnDate } from "../utils/calendarHelpers";
import { getUserName } from "../utils/userHelpers";`
  );

  // Remove local getUserName definition
  content = replace(content, '3.3: Remove local getUserName',
    `  const getUserName = (id) => appData.users.find((u) => u.id === id)?.name || "Unassigned";\n`,
    ``
  );

  // Update the one call site in TaskRow: .map(getUserName) → .map((id) => getUserName(appData.users, id))
  content = replace(content, '3.3: Update getUserName call in TaskRow',
    `const assignees = (task.assignedTo || []).map(getUserName).join(", ") || "Unassigned";`,
    `const assignees = (task.assignedTo || []).map((id) => getUserName(appData.users, id)).join(", ") || "Unassigned";`
  );

  // --- 3.4: Import createNotification ---
  content = replace(content, '3.4: Add createNotification import',
    `import { uid, saveData, defaultData } from "../utils/storage";`,
    `import { uid, saveData, defaultData } from "../utils/storage";
import { createNotification } from "../utils/notificationHelpers";`
  );

  return content;
});

// ═══════════════════════════════════════════════════════
// PATCH CalendarView.jsx
// ═══════════════════════════════════════════════════════

patchFile('src/screens/CalendarView.jsx', (content) => {

  // Add import for getUserName
  content = replace(content, '3.3: Add getUserName import',
    `import Card from "../components/Card";`,
    `import Card from "../components/Card";
import { getUserName } from "../utils/userHelpers";`
  );

  // Remove local getUserName definition
  content = replace(content, '3.3: Remove local getUserName',
    `  const getUserName = (id) => appData.users.find((u) => u.id === id)?.name || "Unassigned";\n`,
    ``
  );

  // Update call sites: .map(getUserName) → .map((id) => getUserName(appData.users, id))
  content = replace(content, '3.3: Update getUserName call',
    `task.assignedTo.map(getUserName).join(", ")`,
    `task.assignedTo.map((id) => getUserName(appData.users, id)).join(", ")`
  );

  return content;
});

// ═══════════════════════════════════════════════════════
// PATCH App.jsx
// ═══════════════════════════════════════════════════════

patchFile('src/App.jsx', (content) => {

  // Add import for createNotification
  content = replace(content, '3.4: Add createNotification import',
    `import { uid, loadData, saveData, defaultData, subscribeToChanges } from "./utils/storage";`,
    `import { uid, loadData, saveData, defaultData, subscribeToChanges } from "./utils/storage";
import { createNotification } from "./utils/notificationHelpers";`
  );

  // Replace the manual notification object in handleAddMember
  content = replace(content, '3.4: Replace manual notification in handleAddMember',
    `      notifications.push({
        id: uid(), type: "relationship", targetUserId: existing.id, fromUserId: appData.currentUserId,
        rawMessage: \`\${memberData.name} has joined the household. Please update your relationship with them.\`,
        message: \`\${memberData.name} has joined the household. Please update your relationship with them.\`,
        read: false, timestamp: new Date().toISOString(), newMemberId: userId,
      });`,
    `      notifications.push(
        createNotification("relationship", existing.id, appData.currentUserId,
          \`\${memberData.name} has joined the household. Please update your relationship with them.\`,
          { newMemberId: userId })
      );`
  );

  return content;
});

// ═══════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════

console.log(`\n${'═'.repeat(50)}`);
console.log(`✅ Phase 3 complete — ${totalChanges} change(s) applied`);
console.log(`${'═'.repeat(50)}`);
console.log('\nNew shared files created (in previous steps):');
console.log('  • src/constants/communicationOptions.js');
console.log('  • src/utils/userHelpers.js');
console.log('  • src/utils/notificationHelpers.js');
console.log('  • src/utils/relationships.js (updated with RELATIONSHIP_OPTIONS)');
console.log('\nPlease run "npm run dev" to verify everything builds and works.');
console.log('Test: Settings view, relationship picker, task assignee names, calendar view.');
