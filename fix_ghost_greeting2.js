const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const targetStr = `ws.send(JSON.stringify({
                                    type: 'gameStart',
                                    opponent: botName,
                                    isBotMatch: true,
                                    room: roomName,
                                    color: 'white'
                                }));`;

const replaceStr = `ws.send(JSON.stringify({
                                    type: 'gameStart',
                                    opponent: botName,
                                    isBotMatch: true,
                                    room: roomName,
                                    color: 'white'
                                }));
                                if (typeof ghost !== 'undefined' && ghost && ghost.handleGhostGreeting) {
                                    ghost.handleGhostGreeting(ws, botName);
                                }`;

code = code.replace(targetStr, replaceStr);
fs.writeFileSync('server.js', code);
