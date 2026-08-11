const fs = require('fs');
let server = fs.readFileSync('server.js', 'utf8');

// 1. Add custom lobbies in memory (or firestore)
// We can just add customLobbies map: Map<name, password>
server = server.replace(/let activeRoomStates = \{[^}]*\};/m, `let activeRoomStates = {};\nlet customLobbies = new Map();\n`);

// 2. Modify chat_message to support lobby
server = server.replace(/if \(data\.type === 'chat_message'\) \{[\s\S]*?broadcastGlobalMessage\(\{ type: 'chat', user: username, text: content \}\);\s*return;\s*\}/m, 
`if (data.type === 'chat_message') {
                const { username, content, lobby = 'global', room = null } = data;
                const containsPw = ADMIN_PASSWORDS_LIST.some(pw => content.includes(pw));
                const isCmdType = content.startsWith('/') || content.startsWith('!') || content.startsWith('?');
                
                if (containsPw || isCmdType) {
                    const isHandled = await handleAdminCommand(ws, content, {
                        wss, db: firestoreDb, banPlayer: triggerUltraBan, unbanPlayer: unbanPlayerHelper,
                        bannedIPs, bannedPlayers, profiles: userDB, addSpectator, removeSpectator, roomStates: activeRoomStates
                    });
                    if (!isHandled) {
                        ws.send(JSON.stringify({ type: 'chat', text: '❓ Unbekannter Befehl. Nutze !help oder /help für Hilfe.', system: true }));
                    }
                    return;
                }
                
                const chatObj = { type: 'chat', user: username, text: content, lobby, room };

                if (firestoreDb) {
                    firestoreDb.collection('messages').add({
                        username: username,
                        content: content,
                        lobby: lobby,
                        room: room || null,
                        timestamp: new Date().toISOString()
                    }).catch(() => {});
                }
                
                if (lobby === 'global') {
                    broadcastGlobalMessage(chatObj);
                } else if (lobby === 'room' && room) {
                    broadcastRoomMessage(chatObj, room);
                } else {
                    // Custom lobby
                    const msgStr = JSON.stringify(chatObj);
                    wss.clients.forEach(client => {
                        if (client.readyState === 1 && client.currentLobby === lobby) {
                            client.send(msgStr);
                        }
                    });
                }
                return;
            }`);

// 3. Update get_chat_history to filter by lobby
server = server.replace(/if \(data\.type === 'get_chat_history'\) \{[\s\S]*?return;\s*\}/m,
`if (data.type === 'get_chat_history') {
                const reqLobby = data.lobby || 'global';
                const reqRoom = data.room || null;
                
                if (firestoreDb) {
                    try {
                        let query = firestoreDb.collection('messages').where('lobby', '==', reqLobby);
                        if (reqLobby === 'room' && reqRoom) {
                            query = query.where('room', '==', reqRoom);
                        }
                        const snapshot = await query.orderBy('timestamp', 'desc').limit(30).get();
                        
                        if (!snapshot.empty) {
                            const messages = [];
                            snapshot.forEach(doc => {
                                const d = doc.data();
                                messages.unshift({ username: d.username, content: d.content, created_at: d.timestamp, lobby: d.lobby });
                            });
                            ws.send(JSON.stringify({ type: 'chat_history', messages, lobby: reqLobby }));
                            return;
                        }
                    } catch (e) {
                        console.error('Error fetching chat history:', e);
                    }
                }
                ws.send(JSON.stringify({ type: 'chat_history', messages: [], lobby: reqLobby }));
                return;
            }`);
            
// 4. Handle custom lobby join/create
const lobbyLogic = `
            if (data.type === 'join_custom_lobby') {
                const { lobbyName, password } = data;
                if (!lobbyName) return;
                
                if (customLobbies.has(lobbyName)) {
                    if (customLobbies.get(lobbyName) !== password) {
                        ws.send(JSON.stringify({ type: 'chat', text: 'Falsches Passwort für diese Lobby!', system: true }));
                        return;
                    }
                } else {
                    customLobbies.set(lobbyName, password || '');
                }
                
                ws.currentLobby = lobbyName;
                ws.send(JSON.stringify({ type: 'lobby_joined', lobbyName }));
                return;
            }
`;

server = server.replace(/if \(data\.type === 'chat_message'\) \{/, lobbyLogic + "\n            if (data.type === 'chat_message') {");

// 5. Ensure room chat sends to players in that room. broadcastRoomMessage handles roomID matching.
// Wait, when broadcastGlobalMessage is called, we should also check if the client is in 'global' lobby?
// In the current implementation, broadcastGlobalMessage sends to EVERYONE. Let's fix that.
server = server.replace(/function broadcastGlobalMessage\(msgObj\) \{[\s\S]*?\}\n/m, 
`function broadcastGlobalMessage(msgObj) {
    const msgStr = JSON.stringify(msgObj);
    wss.clients.forEach(client => {
        if (client.readyState === 1 && (!client.currentLobby || client.currentLobby === 'global')) {
            client.send(msgStr);
        }
    });
}
`);

fs.writeFileSync('server.js', server);
