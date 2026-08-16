const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const target1 = `if (uid) user.uid = uid;
                    user.username = playerName;
                } else {`;
const replace1 = `if (uid) user.uid = uid;
                    user.username = playerName;
                    if (user.coins === undefined) user.coins = 1000;
                } else {`;
code = code.replace(target1, replace1);

const target2 = `                        level: 1,
                        ip_address: clientIP,`;
const replace2 = `                        level: 1,
                        coins: 1000,
                        ip_address: clientIP,`;
code = code.replace(target2, replace2);

// Let's also patch all existing users loaded in memory on startup.
const loadPlayersRegex = /fs\.existsSync\(USER_FILE\)\) \{([\s\S]*?)userDB = JSON\.parse\(fs\.readFileSync\(USER_FILE\)\);\n\s*\}/;
if (code.match(loadPlayersRegex)) {
    // we can't easily patch inside if we don't match the exact string well, let's just do a startup pass after load.
}
// Safer: Add a block right after loadFromFirebase to ensure coins are 1000 for everyone.
const startupPassTarget = "console.log(`✅ ${Object.keys(userDB).length} Profile erfolgreich aus Firestore geladen.`);";
const startupPassReplace = `console.log(\`✅ \${Object.keys(userDB).length} Profile erfolgreich aus Firestore geladen.\`);
        // Init coins for all users
        for (let u in userDB) {
            if (userDB[u] && userDB[u].coins === undefined) {
                userDB[u].coins = 1000;
                saveAll(u); // Save back to firebase immediately
            }
        }`;
code = code.replace(startupPassTarget, startupPassReplace);

fs.writeFileSync('server.js', code);
console.log("Patched server.js for persistent coins");
