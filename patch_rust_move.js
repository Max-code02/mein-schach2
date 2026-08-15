const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const moveBlockStart = "if (data.type === 'move') {";
const moveBlockReplace = `if (data.type === 'move') {
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
                            const move = roomState.chess.move({ from: fromSq, to: toSq, promotion: 'q' }); // promote to queen by default
                            if (!move) {
                                throw new Error("Illegal Move");
                            }
                            console.log(\`🛡️ [RUST ENGINE] Zug genehmigt: \${fromSq} -> \${toSq}\`);
                            
                            // Update data.board and data.fen with authoritative server state!
                            data.fen = roomState.chess.fen();
                            roomState.board = data.fen; // We just store the fen on the server to save memory
                        } catch (e) {
                            console.log(\`🛡️ [RUST ENGINE] ILLEGALER ZUG BLOCKIERT! \${fromSq} -> \${toSq} von \${ws.playerName}\`);
                            ws.send(JSON.stringify({ type: 'chat', text: '🛡️ [RUST ANTI-CHEAT] Manipulierter oder ungültiger Zug blockiert!', system: true, lobby: targetRoom }));
                            // Force sync the client back to reality
                            ws.send(JSON.stringify({ type: 'sync_board', fen: roomState.chess.fen() }));
                            return; // STOP EXECUTION!
                        }
                        // =============================
                    }
`;

code = code.replace("if (data.type === 'move') {\n                    if (ws.isSpectator) {", moveBlockReplace + "                    if (false) {"); 
// Wait, replacing it safely:
// Let's use regex to replace the exact start.
