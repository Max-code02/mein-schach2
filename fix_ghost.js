const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const oldNamesRegex = /const ghostNames = \[.*?\];/;
const newNames = `const ghostNames = ["luca_99", "SchachMatt123", "JulianB", "Felix_M", "Anna_Chess", "alex88", "MariusK", "PawnStar", "max_gamer", "Lena_22", "simon_p", "david_91", "kevin_pro", "sarah_k", "tim_123", "jan_schach", "peter_pan", "lara_croft", "michael_m", "tobias_k", "stephan_b", "chris_99", "julia_s", "lisa_m", "marcel_x", "dennis_d", "philipp_r", "johannes_h", "matthias_w", "christian_g"];`;
code = code.replace(oldNamesRegex, newNames);

const initGhostCode = `const botName = ghostNames[Math.floor(Math.random() * ghostNames.length)];
                            if (!userDB[botName]) {
                                userDB[botName] = { 
                                    level: 1 + Math.floor(Math.random() * 5), 
                                    xp: Math.floor(Math.random() * 100), 
                                    wins: Math.floor(Math.random() * 20), 
                                    losses: Math.floor(Math.random() * 20), 
                                    elo: 1000 + Math.floor(Math.random() * 500), 
                                    role: 'user' 
                                };
                            }`;

code = code.replace(/const botName = ghostNames\[Math\.floor\(Math\.random\(\) \* ghostNames\.length\)\];/g, initGhostCode);

code = code.replace(/ws\.isBotMatch/g, 'ws.isGhostMatch');
code = code.replace(/opponent\.isBotMatch/g, 'opponent.isGhostMatch');
code = code.replace(/roomState\.isBotMatch/g, 'roomState.isGhostMatch');
code = code.replace(/isBotMatch:\s*true,/g, '');
code = code.replace(/isBotMatch:\s*false,/g, '');

code = code.replace(/ws\.isGhostMatch \|\| ws\.opponentName === 'Grandmaster_Ghost' \|\| ws\.opponentName === 'Ghost_Bot'/g, 'ws.isGhostMatch');
code = code.replace(/roomState\.isGhostMatch \|\| \(ws\.opponentName && \(ws\.opponentName\.includes\('Ghost'\) \|\| ws\.opponentName\.includes\('Bot'\)\)\)/g, 'ws.isGhostMatch');

fs.writeFileSync('server.js', code);
