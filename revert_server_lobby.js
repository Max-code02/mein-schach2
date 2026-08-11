const fs = require('fs');
let server = fs.readFileSync('server.js', 'utf8');

server = server.replace(/let activeRoomStates = \{\};\nlet customLobbies = new Map\(\);\n/, 'let activeRoomStates = new Map();\n');

// The replacement for `chat_message` was quite large. Let's restore the original `chat_message` block:
const chatMsgBlock = `            if (data.type === 'chat_message') {
                const { username, content } = data;
                const containsPw = ADMIN_PASSWORDS_LIST.some(pw => content.includes(pw));
                const isCmdType = content.startsWith('/') || content.startsWith('!') || content.startsWith('?');
                
                if (containsPw || isCmdType) {
                    const isHandled = await handleAdminCommand(ws, content, {
                        wss, 
                        db: firestoreDb, 
                        banPlayer: triggerUltraBan, 
                        unbanPlayer: unbanPlayerHelper,
                        bannedIPs, 
                        bannedPlayers, 
                        profiles: userDB, 
                        addSpectator, 
                        removeSpectator,
                        roomStates: activeRoomStates
                    });
                    if (!isHandled) {
                        ws.send(JSON.stringify({ 
                            type: 'chat', 
                            text: '❓ Unbekannter Befehl. Nutze !help oder /help für Hilfe.', 
                            system: true 
                        }));
                    }
                    return;
                }

                if (firestoreDb) {
                    firestoreDb.collection('messages').add({
                        username: username,
                        content: content,
                        timestamp: new Date().toISOString()
                    }).catch(() => {});
                }

                broadcastGlobalMessage({ type: 'chat', user: username, text: content });
                return;
            }`;

server = server.replace(/if \(data\.type === 'join_custom_lobby'\) \{[\s\S]*?return;\n            \}\n            if \(data\.type === 'chat_message'\) \{[\s\S]*?broadcastGlobalMessage\(chatObj\);\n                \} else if \(lobby === 'room' && room\) \{[\s\S]*?\}\n                return;\n            \}/, chatMsgBlock);

// The replacement for `get_chat_history`
const chatHistoryBlock = `            if (data.type === 'get_chat_history') {
                if (firestoreDb) {
                    try {
                        const snapshot = await firestoreDb.collection('messages').orderBy('timestamp', 'desc').limit(30).get();
                        
                        if (!snapshot.empty) {
                            const messages = [];
                            snapshot.forEach(doc => {
                                const d = doc.data();
                                messages.unshift({ username: d.username, content: d.content, created_at: d.timestamp });
                            });
                            ws.send(JSON.stringify({ type: 'chat_history', messages }));
                            return;
                        }
                    } catch (e) {
                        console.error('Error fetching chat history:', e);
                    }
                }
                ws.send(JSON.stringify({ type: 'chat_history', messages: [] }));
                return;
            }`;

server = server.replace(/if \(data\.type === 'get_chat_history'\) \{[\s\S]*?ws\.send\(JSON\.stringify\(\{ type: 'chat_history', messages: \[\], lobby: reqLobby \}\)\);\n                return;\n            \}/, chatHistoryBlock);

// The replacement for `broadcastGlobalMessage`
const broadcastGlobalOrig = `function broadcastGlobalMessage(msgObj) {
    const msgStr = JSON.stringify(msgObj);
    wss.clients.forEach(client => {
        if (client.readyState === 1) {
            client.send(msgStr);
        }
    });
}`;
server = server.replace(/function broadcastGlobalMessage\(msgObj\) \{\n    const msgStr = JSON\.stringify\(msgObj\);\n    wss\.clients\.forEach\(client => \{\n        if \(client\.readyState === 1 && \(\!client\.currentLobby \|\| client\.currentLobby === 'global'\)\) \{\n            client\.send\(msgStr\);\n        \}\n    \}\);\n\}/, broadcastGlobalOrig);

fs.writeFileSync('server.js', server);
