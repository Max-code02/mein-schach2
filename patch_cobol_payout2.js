const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const regex = /if \(data\.type === 'game_over'\) \{([\s\S]*?)const targetRoom = data\.room \|\| ws\.room \|\| "global";/;

const replacement = `if (data.type === 'game_over') {
                const targetRoom = data.room || ws.room || "global";
                // === COBOL BANKING: POT PAYOUT ===
                let roomState = activeRoomStates.get(targetRoom);
                if (roomState && roomState.pot > 0) {
                    let winnerName = null;
                    if (data.winner === 'white' || (data.text && data.text.includes('Weiß'))) {
                        winnerName = roomState.whitePlayer;
                    } else if (data.winner === 'black' || (data.text && data.text.includes('Schwarz'))) {
                        winnerName = roomState.blackPlayer;
                    }
                    
                    if (winnerName && userDB[winnerName]) {
                        userDB[winnerName].coins = (userDB[winnerName].coins || 1000) + roomState.pot;
                        console.log(\`🏦 [COBOL BANK] \${winnerName} gewinnt den Pot von \${roomState.pot} Coins!\`);
                        broadcastRoomMessage({ type: 'chat', text: \`🏦 [COBOL BANK] \${winnerName} hat den Casino-Pot von \${roomState.pot} Coins gewonnen!\`, system: true }, targetRoom);
                        saveAll(winnerName);
                    } else if (data.text && (data.text.includes('Remis') || data.text.includes('Unentschieden'))) {
                         // Refund on draw
                         if (userDB[roomState.whitePlayer]) userDB[roomState.whitePlayer].coins = (userDB[roomState.whitePlayer].coins || 1000) + (roomState.pot / 2);
                         if (userDB[roomState.blackPlayer]) userDB[roomState.blackPlayer].coins = (userDB[roomState.blackPlayer].coins || 1000) + (roomState.pot / 2);
                         broadcastRoomMessage({ type: 'chat', text: \`🏦 [COBOL BANK] Unentschieden! Einsatz von \${roomState.pot} Coins wurde zurückerstattet.\`, system: true }, targetRoom);
                    }
                    roomState.pot = 0;
                }
                // =================================
`;
if (code.match(regex)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('server.js', code);
    console.log("Patched game_over COBOL payout!");
} else {
    console.log("Could not find regex!");
}
