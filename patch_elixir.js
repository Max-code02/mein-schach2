const fs = require('fs');

let serverCode = fs.readFileSync('server.js', 'utf8');

// Replace the matchmaking logic
serverCode = serverCode.replace(/let waitingPlayer = null;/g, `
// === ELIXIR-INSPIRED HIGH PERFORMANCE MATCHMAKING HUB ===
let elixirMatchQueue = [];
let elixirMatchTickId = null;

function broadcastElixirHubStatus() {
    console.log("⚢ [Elixir BEAM Engine] Matchmaking Queue active: " + elixirMatchQueue.length + " players");
}

function processElixirMatchmaking() {
    if (elixirMatchQueue.length >= 2) {
        // Find players with similar time controls
        let matchMade = false;
        for (let i = 0; i < elixirMatchQueue.length; i++) {
            for (let j = i + 1; j < elixirMatchQueue.length; j++) {
                let p1 = elixirMatchQueue[i];
                let p2 = elixirMatchQueue[j];
                if (p1.timeControl === p2.timeControl) {
                    // Match found!
                    if (p1.botTimeout) clearTimeout(p1.botTimeout);
                    if (p2.botTimeout) clearTimeout(p2.botTimeout);
                    
                    const roomID = "room_" + Math.random().toString(36).substr(2, 9);
                    p1.ws.room = roomID;
                    p2.ws.room = roomID;
                    p1.ws.color = 'black';
                    p2.ws.color = 'white';
                    p1.ws.opponentName = p2.playerName || "Spieler 2";
                    p2.ws.opponentName = p1.playerName || "Spieler 1";
                    
                    let tc = p1.timeControl;
                    let tSecs = 600, tInc = 0;
                    if (tc !== 'unlimited') {
                        if (tc.includes('+')) {
                            const pts = tc.split('+');
                            tSecs = (parseInt(pts[0]) || 10) * 60;
                            tInc = parseInt(pts[1]) || 0;
                        } else {
                            tSecs = (parseInt(tc) || 10) * 60;
                        }
                    } else {
                        tSecs = null;
                    }
                    
                    activeRoomStates.set(roomID, {
                        board: null, turn: 'white', isGhostMatch: false,
                        whitePlayer: p2.playerName, blackPlayer: p1.playerName,
                        timeControl: tc, timeWhite: tSecs, timeBlack: tSecs, timeInc: tInc, gameOver: false
                    });
                    
                    p1.ws.send(JSON.stringify({ type: 'gameStart', room: roomID, color: 'black', opponent: p1.ws.opponentName, timeControl: tc, timeWhite: tSecs, timeBlack: tSecs }));
                    p2.ws.send(JSON.stringify({ type: 'gameStart', room: roomID, color: 'white', opponent: p2.ws.opponentName, timeControl: tc, timeWhite: tSecs, timeBlack: tSecs }));
                    
                    // Remove matched players
                    elixirMatchQueue.splice(j, 1);
                    elixirMatchQueue.splice(i, 1);
                    console.log("🎉 [Elixir Hub] Match gefunden! " + p2.playerName + " vs " + p1.playerName + " (Raum: " + roomID + ")");
                    matchMade = true;
                    break;
                }
            }
            if (matchMade) break;
        }
    }
}
setInterval(processElixirMatchmaking, 1000);
// === END ELIXIR HUB ===
let waitingPlayer = null; // keep for legacy fallback if needed
`);

// Now replace find_random logic
const findRandomLogicRegex = /if \(data\.type === 'find_random' \|\| data\.type === 'findGame'\) \{[\s\S]*?(?=if \(data\.type === 'create_open_challenge'\))/;
// Wait, create_open_challenge is at line 2653, but find_random is at 2865. The regex might need to be specific.
