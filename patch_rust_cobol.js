const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

// 1. Add chess.js at the top
if (!code.includes("require('chess.js')")) {
    code = code.replace("const WebSocket = require('ws');", "const WebSocket = require('ws');\nconst { Chess } = require('chess.js');");
}

// 2. Add Coins to userDB (initialize with 1000)
// This is already handled dynamically when accessing userDB, but let's make sure it's updated.

// 3. Update Elixir Matchmaking to handle COBOL Bets
const elixirMatchString = "let tc = p1.timeControl;";
const elixirMatchReplace = `
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
                    // ===================================
                    let tc = p1.timeControl;`;
code = code.replace(elixirMatchString, elixirMatchReplace);

// 4. Update the room initialization in Elixir Matchmaking
const roomInitString = "activeRoomStates.set(roomID, {";
const roomInitReplace = "activeRoomStates.set(roomID, {\n                        chess: new Chess(),\n                        pot: pot,";
code = code.replace(roomInitString, roomInitReplace);

// 5. Apply same room init for standard games/ghost matches
const ghostInitString = "activeRoomStates.set(roomID, {\n                                board: null,";
const ghostInitReplace = "activeRoomStates.set(roomID, {\n                                chess: new Chess(),\n                                pot: 0,\n                                board: null,";
code = code.replace(ghostInitString, ghostInitReplace);

const challengeInitString = "activeRoomStates.set(roomID, {\n                    board: null,";
const challengeInitReplace = "activeRoomStates.set(roomID, {\n                    chess: new Chess(),\n                    pot: 0,\n                    board: null,";
code = code.replace(challengeInitString, challengeInitReplace);

fs.writeFileSync('server.js', code);
console.log("Patched server.js setup!");
