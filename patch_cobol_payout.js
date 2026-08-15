const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const regex = /if \(data\.type === 'game_over'\) \{([\s\S]*?)return;\n\s*\}/;

const match = code.match(regex);
if (match) {
    const originalBlock = match[1];
    const cobolPayoutLogic = `
                // === COBOL BANKING: POT PAYOUT ===
                const targetRoom = data.room || ws.room;
                if (targetRoom) {
                    let roomState = activeRoomStates.get(targetRoom);
                    if (roomState && roomState.pot > 0) {
                        let winnerName = null;
                        if (data.winner === 'white' || data.text.includes('Weiß gewinnt')) {
                            winnerName = roomState.whitePlayer;
                        } else if (data.winner === 'black' || data.text.includes('Schwarz gewinnt')) {
                            winnerName = roomState.blackPlayer;
                        }
                        
                        if (winnerName && userDB[winnerName]) {
                            userDB[winnerName].coins = (userDB[winnerName].coins || 1000) + roomState.pot;
                            console.log(\`🏦 [COBOL BANK] \${winnerName} gewinnt den Pot von \${roomState.pot} Coins!\`);
                            
                            // Benachrichtigung an alle im Raum!
                            broadcastRoomMessage({ type: 'chat', text: \`🏦 [COBOL BANK] \${winnerName} hat den Einsatz von \${roomState.pot} Coins gewonnen!\`, system: true }, targetRoom);
                            saveAll(winnerName);
                        }
                        roomState.pot = 0; // Leeren
                    }
                }
                // =================================
`;
    const replacement = `if (data.type === 'game_over') {${cobolPayoutLogic}${originalBlock}return;\n            }`;
    code = code.replace(regex, replacement);
    fs.writeFileSync('server.js', code);
    console.log("Patched COBOL Payout!");
} else {
    console.log("Could not find game_over handler.");
}
