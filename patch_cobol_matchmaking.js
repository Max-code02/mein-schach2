const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

// 1. Update push to queue to include bet
code = code.replace(
    /elixirMatchQueue\.push\(\{ ws: ws, playerName: ws\.playerName \|\| "Gast", timeControl: data\.timeControl \|\| 'unlimited' \}\);/,
    "elixirMatchQueue.push({ ws: ws, playerName: ws.playerName || \"Gast\", timeControl: data.timeControl || 'unlimited', bet: parseInt(data.bet) || 50 });"
);

// 2. Update matchmaking loop condition and COBOL deduction
const matchLogicOld = `                if (p1.timeControl === p2.timeControl) {
                    if (p1.ws.botTimeout) clearTimeout(p1.ws.botTimeout);
                    if (p2.ws.botTimeout) clearTimeout(p2.ws.botTimeout);
                    
                    const roomID = "room_" + Math.random().toString(36).substr(2, 9);
                    p1.ws.room = roomID;
                    p2.ws.room = roomID;
                    p1.ws.color = 'black';
                    p2.ws.color = 'white';
                    p1.ws.opponentName = p2.playerName || "Spieler 2";
                    p2.ws.opponentName = p1.playerName || "Spieler 1";

                    // === COBOL BANKING SYSTEM: BETTING ===
                    let p1Coins = userDB[p1.playerName] ? (userDB[p1.playerName].coins || 1000) : 1000;
                    let p2Coins = userDB[p2.playerName] ? (userDB[p2.playerName].coins || 1000) : 1000;
                    let pot = 0;
                    
                    if (p1Coins >= 50 && p2Coins >= 50) {
                        p1Coins -= 50;
                        p2Coins -= 50;
                        pot = 100;
                        if (userDB[p1.playerName]) userDB[p1.playerName].coins = p1Coins;
                        if (userDB[p2.playerName]) userDB[p2.playerName].coins = p2Coins;
                        console.log(\`🏦 [COBOL BANK] 50 Coins von \${p1.playerName} und \${p2.playerName} abgebucht. Pot: 100\`);
                    } else {
                        console.log(\`🏦 [COBOL BANK] Match ohne Einsatz (nicht genug Coins).\`);
                    }
                    // ===================================`;

const matchLogicNew = `                if (p1.timeControl === p2.timeControl && p1.bet === p2.bet) {
                    if (p1.ws.botTimeout) clearTimeout(p1.ws.botTimeout);
                    if (p2.ws.botTimeout) clearTimeout(p2.ws.botTimeout);
                    
                    const roomID = "room_" + Math.random().toString(36).substr(2, 9);
                    p1.ws.room = roomID;
                    p2.ws.room = roomID;
                    p1.ws.color = 'black';
                    p2.ws.color = 'white';
                    p1.ws.opponentName = p2.playerName || "Spieler 2";
                    p2.ws.opponentName = p1.playerName || "Spieler 1";

                    // === COBOL BANKING SYSTEM: DYNAMIC BETTING ===
                    let p1Coins = userDB[p1.playerName] ? (userDB[p1.playerName].coins !== undefined ? userDB[p1.playerName].coins : 1000) : 1000;
                    let p2Coins = userDB[p2.playerName] ? (userDB[p2.playerName].coins !== undefined ? userDB[p2.playerName].coins : 1000) : 1000;
                    let pot = 0;
                    let betAmount = p1.bet || 50;
                    
                    if (p1Coins >= betAmount && p2Coins >= betAmount && betAmount > 0) {
                        p1Coins -= betAmount;
                        p2Coins -= betAmount;
                        pot = betAmount * 2;
                        if (userDB[p1.playerName]) userDB[p1.playerName].coins = p1Coins;
                        if (userDB[p2.playerName]) userDB[p2.playerName].coins = p2Coins;
                        console.log(\`🏦 [COBOL BANK] \${betAmount} Coins von \${p1.playerName} und \${p2.playerName} abgebucht. Pot: \${pot}\`);
                    } else if (betAmount > 0) {
                        console.log(\`🏦 [COBOL BANK] Match ohne Einsatz (nicht genug Coins bei einem Spieler).\`);
                    }
                    // ===================================`;

if (code.includes('if (p1Coins >= 50 && p2Coins >= 50)')) {
    code = code.replace(matchLogicOld, matchLogicNew);
} else {
    console.log("Match logic old not found. Did it already get patched?");
}

// 3. Ghost match fallback (bot match)
// Let's find the ghost logic inside find_random
