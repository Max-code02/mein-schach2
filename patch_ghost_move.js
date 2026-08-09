const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const targetStr = `                    if (ws.isGhostMatch) {
                        const currentBotName = ws.opponentName || "Grandmaster_Ghost";
                        setTimeout(() => {
                            if (typeof ghost !== 'undefined' && ghost && ghost.handleGhostMove) {
                                ghost.handleGhostMove(ws, data.board, 'black', currentBotName);
                            }
                        }, 700);
                    }`;

const replaceStr = `                    if (ws.isGhostMatch) {
                        const currentBotName = ws.opponentName || "luca_99";
                        const tc = roomState && roomState.timeControl ? roomState.timeControl : '10+0';
                        if (typeof ghost !== 'undefined' && ghost && ghost.handleGhostMove) {
                            ghost.handleGhostMove(ws, data.board, 'black', currentBotName, tc);
                        }
                    }`;

code = code.replace(targetStr, replaceStr);
fs.writeFileSync('server.js', code);
