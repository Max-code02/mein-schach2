const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const startIndex = code.indexOf("if (data.type === 'find_random' || data.type === 'findGame') {");
if (startIndex !== -1) {
    let braceCount = 0;
    let endIndex = -1;
    for (let i = startIndex; i < code.length; i++) {
        if (code[i] === '{') braceCount++;
        if (code[i] === '}') {
            braceCount--;
            if (braceCount === 0) {
                endIndex = i;
                break;
            }
        }
    }
    
    if (endIndex !== -1) {
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
            }`;
            
        code = code.substring(0, startIndex) + replacement + code.substring(endIndex + 1);
        fs.writeFileSync('server.js', code);
        console.log("Replaced find_random block perfectly!");
    } else {
        console.log("Could not find matching end brace.");
    }
} else {
    console.log("Could not find start index.");
}
