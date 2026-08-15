const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const targetPush = "elixirMatchQueue.push({ ws: ws, playerName: ws.playerName || \"Gast\", timeControl: data.timeControl || 'unlimited' });";
const replacePush = "elixirMatchQueue.push({ ws: ws, playerName: ws.playerName || \"Gast\", timeControl: data.timeControl || 'unlimited', bet: parseInt(data.bet) || 0 });";

code = code.replace(targetPush, replacePush);

// Fix activeRoomStates.set for Ghost Match to include pot and chess
const ghostTarget = "activeRoomStates.set(roomID, { board: null, turn: 'white', isGhostMatch: true,";
const ghostReplace = `
                            let pCoins = userDB[ws.playerName] ? (userDB[ws.playerName].coins !== undefined ? userDB[ws.playerName].coins : 1000) : 1000;
                            let pot = 0;
                            let betAmount = parseInt(data.bet) || 0;
                            if (pCoins >= betAmount && betAmount > 0) {
                                if (userDB[ws.playerName]) userDB[ws.playerName].coins = pCoins - betAmount;
                                pot = betAmount * 2; // Ghost covers the bet
                                console.log(\`🏦 [COBOL BANK] \${betAmount} Coins von \${ws.playerName} abgebucht. Ghost covert. Pot: \${pot}\`);
                            }
                            
                            activeRoomStates.set(roomID, { pot: pot, chess: new Chess(), board: null, turn: 'white', isGhostMatch: true,`;

code = code.replace(ghostTarget, ghostReplace);
fs.writeFileSync('server.js', code);
console.log("Patched ghost match + queue push");
