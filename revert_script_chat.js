const fs = require('fs');
let script = fs.readFileSync('script.js', 'utf8');

// Revert sendMsg
script = script.replace(/function sendMsg\(\) \{[\s\S]*?\}\nwindow\.sendMsg = sendMsg;/m, 
`function sendMsg() {
    const inp = document.getElementById("chat-input") || chatInput;
    if (!inp) return;
    const t = inp.value.trim();
    if (t && socket && socket.readyState === WebSocket.OPEN) {
        if (typeof isSpectatorMode !== 'undefined' && isSpectatorMode) {
            socket.send(JSON.stringify({
                type: 'spectate_chat',
                room: onlineRoom,
                username: getMyName(),
                text: t
            }));
        } else {
            socket.send(JSON.stringify({ 
                 type: 'chat_message', 
                 username: getMyName(),
                 content: t
            }));
        }
        inp.value = "";
    }
}
window.sendMsg = sendMsg;`);

// Revert loadChatHistory
script = script.replace(/function loadChatHistory\(\) \{[\s\S]*?\}\n/m,
`function loadChatHistory() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'get_chat_history' }));
    }
}
`);

// Revert chat receiving block
script = script.replace(/if \(data\.type === 'chat'\) \{[\s\S]*?if \(data\.lobby && data\.lobby !== currentLobby\) return;/m,
`if (data.type === 'chat') {`);

script = script.replace(/if \(data\.type === 'chat_history'\) \{[\s\S]*?if \(data\.lobby && data\.lobby !== currentLobby\) return;/m,
`if (data.type === 'chat_history') {`);

// Remove the event listeners block at the end (lines 3337 to end approx)
const lobbyBlockRegex = /window\.currentChatLobby = 'global';[\s\S]*?\}\);/m;
script = script.replace(lobbyBlockRegex, '');

fs.writeFileSync('script.js', script);
