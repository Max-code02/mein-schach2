const fs = require('fs');
let script = fs.readFileSync('script.js', 'utf8');

script = script.replace(/if \(data\.type === 'chat'\) \{/,
`if (data.type === 'chat') {
            const currentLobby = window.currentChatLobby || 'global';
            if (data.lobby && data.lobby !== currentLobby) return;`);

script = script.replace(/if \(data\.type === 'chat_history'\) \{/,
`if (data.type === 'chat_history') {
            const currentLobby = window.currentChatLobby || 'global';
            if (data.lobby && data.lobby !== currentLobby) return;`);

fs.writeFileSync('script.js', script);
