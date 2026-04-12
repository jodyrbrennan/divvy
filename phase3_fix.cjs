// Quick fix: Add the missing createNotification import to App.jsx
const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'src', 'App.jsx');
let content = fs.readFileSync(filePath, 'utf-8');

const target = `import { loadData, saveData, uid, subscribeToChanges } from "./utils/storage";`;
const replacement = `import { loadData, saveData, uid, subscribeToChanges } from "./utils/storage";
import { createNotification } from "./utils/notificationHelpers";`;

if (content.includes(replacement)) {
  console.log('✅ Import already exists — no change needed');
} else if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log('✅ Added createNotification import to App.jsx');
} else {
  console.log('⚠️  Could not find the storage import line to add after');
}
