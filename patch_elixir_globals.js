const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

if (!code.includes('let elixirMatchQueue = [];')) {
    const injectPoint = "const roomWaitingMap = new Map();";
    const replacement = `const roomWaitingMap = new Map();

// === ELIXIR-INSPIRED HIGH PERFORMANCE MATCHMAKING HUB ===
let elixirMatchQueue = [];
let elixirMatchTickId = null;

function processElixirMatchmaking() {
    if (elixirMatchQueue.length >= 2) {
        let matchMade = false;
        for (let i = 0; i < elixirMatchQueue.length; i++) {
            for (let j = i + 1; j < elixirMatchQueue.length; j++) {
                let p1 = elixirMatchQueue[i];
                let p2 = elixirMatchQueue[j];
                if (p1.timeControl === p2.timeControl) {
                    if (p1.ws.botTimeout) clearTimeout(p1.ws.botTimeout);
                    if (p2.ws.botTimeout) clearTimeout(p2.ws.botTimeout);
                    
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
`;

    code = code.replace(injectPoint, replacement);
    fs.writeFileSync('server.js', code);
    console.log("Injected elixir global logic perfectly!");
} else {
    console.log("Already has elixir globals.");
}
