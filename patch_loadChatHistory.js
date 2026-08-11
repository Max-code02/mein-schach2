const fs = require('fs');
let script = fs.readFileSync('script.js', 'utf8');

script = script.replace(/socket\.send\(JSON\.stringify\(\{ type: 'get_chat_history' \}\)\);/,
`socket.send(JSON.stringify({ type: 'get_chat_history', lobby: window.currentChatLobby || 'global', room: onlineRoom }));`);

fs.writeFileSync('script.js', script);
