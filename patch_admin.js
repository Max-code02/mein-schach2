const fs = require('fs');
let code = fs.readFileSync('adminSystem.js', 'utf8');

// Replace db updates with firestoreDb updates
code = code.replace(/const schema = require\('\.\/src\/db\/schema\.js'\);\s*const { eq } = require\('drizzle-orm'\);\s*await db\.update\(schema\.players\)\.set\(\{ is_banned: false, ip_ban: false \}\)\.where\(eq\(schema\.players\.username, targetName\)\);/g, 'await db.collection("players").doc(targetName).update({ is_banned: false, ip_ban: false });');

code = code.replace(/const schema = require\('\.\/src\/db\/schema\.js'\);\s*const { eq } = require\('drizzle-orm'\);\s*await db\.update\(schema\.players\)\.set\(\{ wins: amount \}\)\.where\(eq\(schema\.players\.username, targetName\)\);/g, 'await db.collection("players").doc(targetName).update({ wins: amount });');

code = code.replace(/\/\/ Optional fallback if SQLite schema has role column\s*\/\/ await db\.update\(schema\.players\)\.set\(\{ role: role \}\)\.where\(eq\(schema\.players\.username, targetName\)\);/g, 'await db.collection("players").doc(targetName).update({ role: role });');
code = code.replace(/const schema = require\('\.\/src\/db\/schema\.js'\);\s*const { eq } = require\('drizzle-orm'\);/g, '');

fs.writeFileSync('adminSystem.js', code);
