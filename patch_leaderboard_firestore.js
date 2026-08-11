const fs = require('fs');

let server = fs.readFileSync('server.js', 'utf8');

// Update sendLeaderboardUpdate
server = server.replace(/function sendLeaderboardUpdate\(target\) \{[\s\S]*?const msg = JSON\.stringify\(\{/m, `function sendLeaderboardUpdate(target) {
    const sorted = Object.entries(userDB)
        .map(([name, u]) => ({
            name: name,
            wins: u.wins || 0,
            elo: u.elo || 1200,
            level: u.level || 1,
            xp: u.xp || 0,
            role: u.role || 'user'
        }))
        .sort((a, b) => b.wins - a.wins)
        .slice(0, 100);

    const msg = JSON.stringify({`);

// Update saveAll
// We look for:
//        const sqlOps = [];
//        const playersToSave = specificPlayerName ? [specificPlayerName] : Object.keys(userDB);
//        for (const uname of playersToSave) {
//            const u = userDB[uname];
//            if (!u) continue;
//        }
server = server.replace(/const sqlOps = \[\];\s*const playersToSave = specificPlayerName \? \[specificPlayerName\] : Object\.keys\(userDB\);\s*for \(const uname of playersToSave\) \{\s*const u = userDB\[uname\];\s*if \(\!u\) continue;\s*\}/m, 
`const sqlOps = [];
        const playersToSave = specificPlayerName ? [specificPlayerName] : Object.keys(userDB);
        for (const uname of playersToSave) {
            const u = userDB[uname];
            if (!u) continue;
            
            // 🔥 Firebase Cloud Firestore Sync!
            if (typeof firestoreDb !== 'undefined' && firestoreDb) {
                firestoreDb.collection('players').doc(uname).set(u, { merge: true }).catch(e => console.error('Firestore save err:', e));
            }
        }`);

fs.writeFileSync('server.js', server);
