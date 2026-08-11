const fs = require('fs');
let script = fs.readFileSync('script.js', 'utf8');

// Update sendMsg
script = script.replace(/function sendMsg\(\) \{[\s\S]*?\}\nwindow\.sendMsg = sendMsg;/m, 
`function sendMsg() {
    const inp = document.getElementById("chat-input") || chatInput;
    if (!inp) return;
    const t = inp.value.trim();
    if (t && socket && socket.readyState === WebSocket.OPEN) {
        let lobby = window.currentChatLobby || 'global';
        if (lobby === 'room' && !onlineRoom) {
            addChat("System", "Du bist in keinem Spiel-Raum.", "system");
            return;
        }
        
        socket.send(JSON.stringify({ 
             type: 'chat_message', 
             username: getMyName(),
             content: t,
             lobby: lobby,
             room: lobby === 'room' ? onlineRoom : null
        }));
        inp.value = "";
    }
}
window.sendMsg = sendMsg;`);

// Add chat lobby selector logic
const lobbySelectorLogic = `
window.currentChatLobby = 'global';
window.addEventListener('DOMContentLoaded', () => {
    const lobbySelect = document.getElementById('chat-lobby-select');
    if (lobbySelect) {
        lobbySelect.addEventListener('change', (e) => {
            window.currentChatLobby = e.target.value;
            const chatMessages = document.getElementById("chat-messages");
            if (chatMessages) chatMessages.innerHTML = '';
            
            if (window.currentChatLobby === 'global') {
                 socket.send(JSON.stringify({ type: 'get_chat_history', lobby: 'global' }));
                 addChat("System", "Du bist im Globalen Chat.", "system");
            } else if (window.currentChatLobby === 'room') {
                 if (!onlineRoom) {
                     addChat("System", "Du bist in keinem Spiel-Raum.", "system");
                 } else {
                     socket.send(JSON.stringify({ type: 'get_chat_history', lobby: 'room', room: onlineRoom }));
                     addChat("System", "Du bist im Raum-Chat: " + onlineRoom, "system");
                 }
            } else {
                 socket.send(JSON.stringify({ type: 'get_chat_history', lobby: window.currentChatLobby }));
                 addChat("System", "Du bist im privaten Chat: " + window.currentChatLobby, "system");
            }
        });
    }
    
    const joinBtn = document.getElementById('join-custom-lobby-btn');
    if (joinBtn) {
        joinBtn.addEventListener('click', () => {
            const lobbyName = prompt("Gib den Namen der privaten Lobby ein:");
            if (!lobbyName) return;
            const password = prompt("Gib das Passwort für '" + lobbyName + "' ein (oder lass es leer, wenn es keins gibt):");
            
            socket.send(JSON.stringify({ type: 'join_custom_lobby', lobbyName, password }));
        });
    }
});
`;

script = script + "\n" + lobbySelectorLogic;

// Also handle 'lobby_joined' 
script = script.replace(/if \(data\.type === 'chat_history'\) \{/, 
`if (data.type === 'lobby_joined') {
            const select = document.getElementById('chat-lobby-select');
            if (select) {
                // Check if option exists
                let exists = false;
                for(let i=0; i<select.options.length; i++) {
                    if (select.options[i].value === data.lobbyName) exists = true;
                }
                if (!exists) {
                    const opt = document.createElement('option');
                    opt.value = data.lobbyName;
                    opt.textContent = '🔒 ' + data.lobbyName;
                    select.appendChild(opt);
                }
                select.value = data.lobbyName;
                select.dispatchEvent(new Event('change'));
            }
            return;
        }
        if (data.type === 'chat_history') {`);

fs.writeFileSync('script.js', script);
