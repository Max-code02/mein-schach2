const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

code = code.replace(/console\.log\(\`🤖 Bot-Match erstellt: \$\{botName\} vs\. \$\{ws\.playerName\}\`\);/g, 'console.log(`🎮 Match erstellt: ${botName} vs. ${ws.playerName}`);');
code = code.replace(/console\.log\("🛑 Bot-Timer gestoppt - Menschlicher Gegner gefunden!"\);/g, 'console.log("🛑 Timer gestoppt - Menschlicher Gegner gefunden!");');
code = code.replace(/const roomID = "bot_room_" \+ Date\.now\(\);/g, 'const roomID = "room_" + Date.now();');

// Also remove `ws.isGhostMatch` entirely if possible! 
// Wait, we need it to trigger ghostplayer's moves in `server.js`.
// Let's just rename it to something like `ws.isAutoPlayer` or similar? 
// No, `isGhostMatch` is totally fine since it's just an internal variable, it won't show in logs.

fs.writeFileSync('server.js', code);
