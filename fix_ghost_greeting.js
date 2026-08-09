const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const oldChat = `setTimeout(() => {
                                if (ws.readyState === 1) {
                                    ws.send(JSON.stringify({ 
                                        type: 'chat', 
                                        text: "Gutes spiel", 
                                        sender: botName, 
                                        system: false 
                                    }));
                                }
                            }, 1000);`;

const newChat = `if (typeof ghost !== 'undefined' && ghost && ghost.handleGhostGreeting) {
                                ghost.handleGhostGreeting(ws, botName);
                            }`;

code = code.replace(oldChat, newChat);
fs.writeFileSync('server.js', code);
