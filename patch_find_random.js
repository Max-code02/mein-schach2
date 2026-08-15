const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const regex = /if\s*\(data\.type\s*===\s*'find_random'\s*\|\|\s*data\.type\s*===\s*'findGame'\)\s*\{[\s\S]*?(?=if\s*\(data\.type\s*===\s*'cancel_find_random'\))/;

const replacement = `if (data.type === 'find_random' || data.type === 'findGame') {
                if (data.room && data.room.trim().length > 0) {
                    data.type = 'join_room';
                } else {
                    console.log(\`⚢ [Elixir BEAM Engine] Spieler \${ws.playerName || "Gast"} in die Matchmaking-Queue eingereiht!\`);
                    // Use Elixir Matchmaking Queue
                    elixirMatchQueue.push({ ws: ws, playerName: ws.playerName || "Gast", timeControl: data.timeControl || 'unlimited' });
                    
                    // Broadcast to client about Elixir queue
                    ws.send(JSON.stringify({ type: 'chat', text: '⚢ [Elixir Hub] In der Matchmaking-Queue eingereiht...', playerName: 'System', lobby: 'global' }));
                    
                    // Ghost bot fallback after 12 seconds in elixir queue
                    ws.botTimeout = setTimeout(() => {
                        const qIndex = elixirMatchQueue.findIndex(p => p.ws === ws);
                        if (qIndex !== -1) {
                            elixirMatchQueue.splice(qIndex, 1); // Remove from queue
                            const roomID = "room_" + Date.now();
                            const botName = ghostNames[Math.floor(Math.random() * ghostNames.length)];
                            if (!userDB[botName]) {
                                userDB[botName] = { level: 1 + Math.floor(Math.random() * 5), xp: Math.floor(Math.random() * 100), wins: Math.floor(Math.random() * 20), losses: Math.floor(Math.random() * 20), elo: 1000 + Math.floor(Math.random() * 500), role: 'user' };
                            }
                            let tc = data.timeControl || 'unlimited';
                            let tSecs = 600, tInc = 0;
                            if (tc !== 'unlimited') {
                                if (tc.includes('+')) {
                                    const pts = tc.split('+');
                                    tSecs = (parseInt(pts[0]) || 10) * 60;
                                    tInc = parseInt(pts[1]) || 0;
                                } else {
                                    tSecs = (parseInt(tc) || 10) * 60;
                                }
                            } else { tSecs = Infinity; }
                            
                            activeRoomStates.set(roomID, { board: null, turn: 'white', isGhostMatch: true, whitePlayer: ws.playerName || "Gast", blackPlayer: botName, timeControl: tc, timeWhite: tSecs, timeBlack: tSecs, timeInc: tInc, gameOver: false });
                            ws.room = roomID;
                            ws.isGhostMatch = true;
                            ws.opponentName = botName;
                            ws.color = 'white';
                            ws.send(JSON.stringify({ type: 'gameStart', opponent: botName, room: roomID, color: 'white', timeControl: tc, timeWhite: tSecs, timeBlack: tSecs }));
                            console.log(\`👻 [Elixir Hub] Ghost-Player '\${botName}' hat das Spiel gegen \${ws.playerName || "Gast"} übernommen.\`);
                        }
                    }, 12000);
                }
                return;
            }
            
            `;

if (code.match(regex)) {
    fs.writeFileSync('server.js', code.replace(regex, replacement));
    console.log("Successfully replaced find_random via Regex!");
} else {
    console.log("Regex match failed!");
    
    // Check what is actually below find_random
    const match = code.match(/if\s*\(data\.type\s*===\s*'find_random'.{0,500}/s);
    console.log(match ? match[0] : "Not found at all");
}
