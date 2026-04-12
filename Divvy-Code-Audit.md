# Divvy Code Audit Report
**Date:** April 12, 2026  
**Scope:** Redundancy, Inefficiency, and Bugs

---

## Summary

Your codebase is well-organized at a high level — nice folder structure, clear naming, and good separation between constants, utils, components, and screens. The design system is consistent and the app logic is solid.

That said, the audit uncovered **9 bugs**, **8 redundancy issues**, and **7 inefficiency concerns** — most of which stem from one root cause: **Dashboard.jsx has grown into a massive "God Component"** (~2,000+ lines) that handles everything. Fixing that one structural issue would resolve or simplify the majority of the findings below.

---

## SECTION 1: BUGS (Fix These First)

### BUG 1 — Undo deducts points from the wrong user ⚠️ HIGH
**File:** `Dashboard.jsx` → `handleUncomplete`

**What's happening:** When you undo a completed task, it always deducts points from `appData.currentUserId` (whoever is currently logged in). But the task may have been completed by a *different* user. So if User A completed a task and User B presses "undo," User B loses points they never earned.

**How to fix:** Look up who actually earned the points from the completion record, and deduct from *that* user instead:

```javascript
// CURRENT (broken):
const updatedUsers = appData.users.map((u) =>
  u.id === appData.currentUserId ? { ...u, pointBalance: ... } : u
);

// FIXED:
const completionRecord = appData.completions[realIdx];
const completerId = completionRecord.userId;
const updatedUsers = appData.users.map((u) =>
  u.id === completerId ? { ...u, pointBalance: Math.max(0, (u.pointBalance || 0) - pointsBack) } : u
);
```

---

### BUG 2 — Race condition in save operations ⚠️ HIGH
**Files:** `Dashboard.jsx` (multiple handlers)

**What's happening:** Many handlers follow this pattern: read `appData` → make changes → call `setAppData(newData)` → call `saveData(newData)`. If two handlers fire quickly (like completing a task and then getting a notification), the second handler still has the *old* `appData` in its closure. It overwrites the first handler's changes in Supabase.

**Example:** `handleSendRecognition` updates state with the recognition data, then immediately calls `sendNotification`, which reads the *stale* `appData` (without the recognition) and saves over it.

**How to fix:** Use React's functional state updater pattern (`setAppData(prev => ...)`) and/or consolidate all changes into a single save. Long-term, consider a reducer pattern (useReducer) to batch state updates.

---

### BUG 3 — Bulk complete skips notifying the task creator ⚠️ MEDIUM
**File:** `Dashboard.jsx` → `handleBulkComplete`

**What's happening:** The condition checks `task.createdBy !== appData.currentUserId`, which means "don't notify the person who pressed the button." But `handleComplete` (single task) checks `task.createdBy !== userId` (the actual completer). These are different when you're marking a task complete *for* someone else via the dialog.

**Result:** If you're the creator and someone bulk-completes your tasks for another person, you don't get notified.

**How to fix:** Change the condition to match `handleComplete`:
```javascript
// Change this:
if (task.createdBy && task.createdBy !== userId && task.createdBy !== appData.currentUserId)
// To this:
if (task.createdBy && task.createdBy !== userId)
```

---

### BUG 4 — `taskCompletedByOther` state is never used ⚠️ LOW
**File:** `Dashboard.jsx`

**What's happening:** `const [taskCompletedByOther, setTaskCompletedByOther] = useState(null)` is declared but `setTaskCompletedByOther` is never called anywhere. The state just sits there doing nothing.

**How to fix:** Remove it. It's dead code.

---

### BUG 5 — Voice command useEffect has stale closure data ⚠️ MEDIUM
**File:** `Dashboard.jsx` → voice parsing `useEffect`

**What's happening:** The `useEffect` that triggers AI parsing when `voiceMode` changes to `"processing"` lists only `[voiceMode]` as its dependency. But inside, it reads `voiceTranscript`, `appData`, and `currentUser`. If any of these changed since the effect was registered, it will use outdated values.

**How to fix:** Add the missing dependencies:
```javascript
useEffect(() => {
  if (voiceMode !== "processing" || !voiceTranscript.trim()) return;
  // ... parsing logic
}, [voiceMode, voiceTranscript, appData.users, appData.currentUserId]);
```

---

### BUG 6 — `uid()` has collision risk ⚠️ LOW
**File:** `storage.js`

**What's happening:** `uid()` uses `Math.random().toString(36).slice(2, 10)` which produces 8 characters of base-36. `Math.random()` is not cryptographically secure and has limited entropy. As your database grows, the chance of ID collisions increases.

**How to fix:** Use `crypto.randomUUID()` (supported in all modern browsers) or at minimum use a longer string:
```javascript
export const uid = () => crypto.randomUUID();
// or if you want short IDs:
export const uid = () => crypto.getRandomValues(new Uint8Array(8))
  .reduce((s, b) => s + b.toString(36).padStart(2, '0'), '').slice(0, 12);
```

---

### BUG 7 — AI Communication Engine shows confusing approval screen ⚠️ LOW
**File:** `communication.js`

**What's happening:** `rewriteForUser()` currently just returns the original message unchanged (AI is disabled). But the full approval overlay still shows both "original" and "rewritten" versions — which are identical. Users see a preview comparing a message to itself, which is confusing.

**How to fix:** Either skip the approval overlay when the rewritten message matches the original, or add a note that says "AI rewriting is not yet active."

---

### BUG 8 — Touch events can fire double-actions ⚠️ LOW
**File:** `HoldOption.jsx`

**What's happening:** The `onTouchStart` handler doesn't call `e.preventDefault()`. On some devices, both the touch event AND the mouse event fire, which can trigger the hold action twice.

**How to fix:** Add `e.preventDefault()` to `onTouchStart`:
```javascript
onTouchStart={(e) => { e.preventDefault(); setHovered(true); startHold(); }}
```

---

### BUG 9 — Junk directory in source folder ⚠️ LOW
**Location:** `src/{constants,utils,components,screens}/`

**What's happening:** There's an empty directory with curly braces in its name. This was likely created by a mis-typed shell command (like a failed bash glob expansion). It does no harm but is confusing.

**How to fix:** Delete it:
```
rm -rf "src/{constants,utils,components,screens}"
```

---

## SECTION 2: REDUNDANCY

### REDUNDANCY 1 — Duplicated task scheduling logic (biggest one)
**Files:** `taskHelpers.js` → `isTaskDueToday()` AND `calendarHelpers.js` → `isTaskActiveOnDate()`

These two functions share about 80% of their code — the same checks for temporary task date ranges, active range constraints, frequency matching (daily, weekdays, weekends, weekly, monthly, custom), etc. The main difference is that `isTaskDueToday` also checks completion status.

**Suggested fix:** Create one core function `isTaskScheduledForDate(task, date)` that handles all scheduling logic. Then `isTaskDueToday` calls it with `new Date()` and adds the "was it completed today" check on top.

---

### REDUNDANCY 2 — Notification creation code is copy-pasted everywhere
**Files:** `Dashboard.jsx` (handleComplete, handleBulkComplete, handleUnscheduledSubmit), `App.jsx` (handleAddMember)

The same notification object structure `{ id: uid(), type, targetUserId, fromUserId, rawMessage, message, read: false, timestamp }` is manually constructed in at least 5 different places.

**Suggested fix:** Create a helper function:
```javascript
function createNotification(type, targetUserId, fromUserId, rawMessage, meta = {}) {
  return {
    id: uid(), type, targetUserId, fromUserId,
    rawMessage, message: rawMessage,
    read: false, timestamp: new Date().toISOString(),
    ...meta,
  };
}
```

---

### REDUNDANCY 3 — `handleComplete` and `handleBulkComplete` duplicate each other
**File:** `Dashboard.jsx`

`handleBulkComplete` is essentially `handleComplete` wrapped in a loop, with slightly different notification logic (see Bug 3). These should share a core function.

---

### REDUNDANCY 4 — Communication profile options defined twice
**Files:** `ProfileSetupScreen.jsx` (step definitions) AND `Dashboard.jsx` (settings view `commOptions`)

Both define the same preference options (tone, sensitivity, askStyle, etc.) with the same values but in different formats. If you add a new option to one, you'll forget the other.

**Suggested fix:** Move the option definitions to a shared constants file like `constants/communicationOptions.js`.

---

### REDUNDANCY 5 — Relationship options defined twice
**Files:** `Dashboard.jsx` → `RELATIONSHIP_OPTIONS` AND `AddMemberScreen.jsx` → inline array in the relationship step

**Suggested fix:** Move to a shared constant in `utils/relationships.js` (which already exports `RECIPROCAL`).

---

### REDUNDANCY 6 — `getUserName` defined in two places
**Files:** `Dashboard.jsx` and `CalendarView.jsx` both define `const getUserName = (id) => appData.users.find(...)`.

**Suggested fix:** Make it a shared utility function.

---

### REDUNDANCY 7 — "Update users → set state → save" pattern repeated ~15 times
**File:** `Dashboard.jsx`

Almost every handler follows this exact pattern:
```javascript
const updatedUsers = appData.users.map((u) => u.id === someId ? { ...u, change } : u);
const newData = { ...appData, users: updatedUsers };
setAppData(newData);
await saveData(newData);
```

**Suggested fix:** Create a helper like `updateUser(userId, changes)` that handles the map, state update, and save in one call.

---

### REDUNDANCY 8 — Inline SVG icons repeated
**Files:** Throughout Dashboard.jsx, CalendarView.jsx, TopNav.jsx

The same SVG paths (bell icon, heart icon, checkmark, X, etc.) are copied and pasted multiple times rather than being imported from the existing `Icons.jsx` component.

**Suggested fix:** Add all recurring icons to `Icons.jsx` and import them.

---

## SECTION 3: INEFFICIENCY

### INEFFICIENCY 1 — Dashboard.jsx is a ~2,000+ line "God Component" ⚠️ HIGH IMPACT
**File:** `Dashboard.jsx`

This single component contains: the hub view, members list, member detail page, tasks view, calendar wrapper, recognition feed, send recognition flow, settings page, notifications page, reminders view, voice command system, text command system, avatar crop system, the message approval overlay, and the unscheduled task form. It has 30+ `useState` hooks and dozens of handler functions.

**Why this matters:** Any state change in *any* of these systems re-renders the *entire* Dashboard. Opening the avatar picker re-renders the notifications. Typing in the voice command re-renders the member list. It also makes the code very hard to maintain and debug.

**Suggested fix:** Split into separate components:
- `MembersView.jsx`
- `MemberDetailView.jsx`
- `TasksView.jsx`
- `RecognitionView.jsx`
- `SettingsView.jsx`
- `NotificationsView.jsx`
- `RemindersView.jsx`
- `VoiceCommandOverlay.jsx`
- `TextCommandOverlay.jsx`
- `MessageApprovalOverlay.jsx`

Each would receive only the props it needs.

---

### INEFFICIENCY 2 — Constants recreated on every render
**File:** `Dashboard.jsx`

`RELATIONSHIP_OPTIONS`, `TAG_SUGGESTIONS`, `WEEK_LABELS`, `WEEKDAY_LABELS`, and `commOptions` are all defined *inside* the component function body. This means JavaScript creates brand-new arrays and objects on every single render, even though their values never change.

**Suggested fix:** Move them outside the component (above the `export default function Dashboard`) so they're created once when the file loads.

---

### INEFFICIENCY 3 — No memoization of derived data
**File:** `Dashboard.jsx`

Computed values like filtered task lists, member point totals, unread notification counts, and upcoming tasks are recalculated on every render. With React's `useMemo`, these would only recalculate when the data they depend on actually changes.

**Example:**
```javascript
// Currently recalculates every render:
const dueTasks = appData.tasks.filter((t) => isTaskDueToday(t));

// With memoization:
const dueTasks = useMemo(
  () => appData.tasks.filter((t) => isTaskDueToday(t)),
  [appData.tasks]
);
```

---

### INEFFICIENCY 4 — Entire app re-renders on any data change
**Architecture issue**

The entire `appData` object is passed as a prop from `App.jsx` down through everything. When any tiny piece of data changes (like reading a notification), `setAppData` triggers a re-render of the entire component tree.

**Suggested fix (long-term):** Use React Context or a state management solution (like Zustand — it's simple and lightweight) to provide data to components. This way, components only re-render when the specific slice of data they use changes.

---

### INEFFICIENCY 5 — Base64 images stored in the main data blob
**File:** `storage.js` → saves entire `appData` to Supabase

Avatar photos are stored as full base64 strings directly in the user objects. A single photo can be 100KB-1MB+ of text. This gets included in every `saveData()` call and every real-time sync update.

**Suggested fix:** Store avatar images in Supabase Storage (a separate file bucket) and save only the URL/path in the user object.

---

### INEFFICIENCY 6 — No debounce on save operations
**File:** `Dashboard.jsx` (multiple handlers)

Every small change (toggling a relationship tag, changing a comm preference chip) immediately triggers a Supabase write. If a user clicks through several options quickly, that's several network requests in rapid succession.

**Suggested fix:** Add a debounced save function (e.g., save after 500ms of no changes):
```javascript
const debouncedSave = useMemo(
  () => debounce((data) => saveData(data), 500),
  []
);
```

---

### INEFFICIENCY 7 — Relationship propagation is O(n³) with repeated iterations
**File:** `relationships.js` → `propagateRelationships()`

The function has a triple-nested loop (users × users × users) that runs up to 10 times. For a household of 8 people, that's potentially 8 × 8 × 8 × 10 = 5,120 iterations. It works fine for small households, but it's worth noting if households ever get large (10+ members with complex relationships).

---

## QUICK WINS (Easy to fix, immediate benefit)

1. **Delete the junk directory** `src/{constants,utils,components,screens}/`
2. **Remove unused state** `taskCompletedByOther`
3. **Move constants outside component functions** (RELATIONSHIP_OPTIONS, TAG_SUGGESTIONS, etc.)
4. **Fix the undo-points bug** (Bug 1 — one line change)
5. **Add `e.preventDefault()` to HoldOption touch handler** (Bug 8)
6. **Extract shared constants** (relationship options, comm profile options)

---

## Recommended Priority Order

1. **Fix Bug 1** (undo deducting wrong user's points) — quick, high-impact
2. **Fix Bug 2** (race condition in saves) — prevents data loss
3. **Fix Bug 3** (bulk complete notification inconsistency)
4. **Move constants outside components** — easy performance win
5. **Split Dashboard.jsx** — biggest long-term improvement
6. **Extract shared helpers** (notification creation, user update pattern)
7. **Add memoization** where computed values are expensive
8. **Address remaining items** as time permits

---

*End of Audit*
