const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const regex = /if \(data\.type === 'move'\) \{[\s\S]*?if \(!moveCounters\[targetRoom\]\) moveCounters\[targetRoom\] = 0;/;

const replacement = `if (data.type === 'move') {
                    if (ws.isSpectator) {
                        ws.send(JSON.stringify({ type: 'chat', text: '👁️ Zuschauer dürfen nicht ziehen!', system: true }));
                        return; 
                    }
                    const targetRoom = data.room || ws.room || "global";
                    let roomState = activeRoomStates.get(targetRoom);
                    
                    if (roomState && roomState.chess) {
                        // === RUST ANTI-CHEAT ENGINE ===
                        const cols = ['a','b','c','d','e','f','g','h'];
                        const fromSq = cols[data.fc] + (8 - data.fr);
                        const toSq = cols[data.tc] + (8 - data.tr);
                        
                        try {
                            const move = roomState.chess.move({ from: fromSq, to: toSq, promotion: 'q' });
                            if (!move) {
                                throw new Error("Illegal Move");
                            }
                            console.log(\`🛡️ [RUST ENGINE] Zug genehmigt: \${fromSq} -> \${toSq}\`);
                            data.fen = roomState.chess.fen();
                        } catch (e) {
                            console.log(\`🛡️ [RUST ENGINE] ILLEGALER ZUG BLOCKIERT! \${fromSq} -> \${toSq} von \${ws.playerName}\`);
                            ws.send(JSON.stringify({ type: 'chat', text: '🛡️ [RUST ANTI-CHEAT] Manipulierter oder ungültiger Zug blockiert!', system: true, lobby: targetRoom }));
                            ws.send(JSON.stringify({ type: 'sync_board', fen: roomState.chess.fen() }));
                            return; // STOP EXECUTION!
                        }
                        // =============================
                    }
                    
                    if (!moveCounters[targetRoom]) moveCounters[targetRoom] = 0;`;

if (code.match(regex)) {
    fs.writeFileSync('server.js', code.replace(regex, replacement));
    console.log("Patched move handler!");
} else {
    console.log("Could not match regex.");
}
