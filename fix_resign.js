const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const targetStr = `                if (winner && userDB[winner]) {
                    userDB[winner].wins += 1;
                    userDB[winner].xp += 50;
                    
                    if (userDB[winner].xp >= userDB[winner].level * 100) {
                        userDB[winner].xp -= userDB[winner].level * 100;
                        userDB[winner].level += 1;
                    }
                    
                    if (userDB[winner].level >= 10 && userDB[winner].role === 'Gast') userDB[winner].role = 'Meister';
                    if (userDB[winner].level >= 30 && userDB[winner].role === 'Meister') userDB[winner].role = 'Großmeister';
                    
                    if (userDB[loser]) {
                        const winnerElo = userDB[winner].elo || 1200;
                        const loserElo = userDB[loser].elo || 1200;
                        const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
                        const expectedLoser = 1 / (1 + Math.pow(10, (winnerElo - loserElo) / 400));
                        
                        const k = 32;
                        userDB[winner].elo = Math.round(winnerElo + k * (1 - expectedWinner));
                        userDB[loser].elo = Math.round(loserElo + k * (0 - expectedLoser));
                        userDB[loser].losses = (userDB[loser].losses || 0) + 1;
                    }
                    saveAll(winner);
                    if (userDB[loser]) saveAll(loser);
                    sendLeaderboardUpdate();
                }`;

const replaceStr = `                if (winner && userDB[winner]) {
                    userDB[winner].wins += 1;
                    userDB[winner].xp += 50;
                    
                    if (userDB[winner].xp >= userDB[winner].level * 100) {
                        userDB[winner].xp -= userDB[winner].level * 100;
                        userDB[winner].level += 1;
                    }
                    
                    if (userDB[winner].level >= 10 && userDB[winner].role === 'Gast') userDB[winner].role = 'Meister';
                    if (userDB[winner].level >= 30 && userDB[winner].role === 'Meister') userDB[winner].role = 'Großmeister';
                    
                    if (userDB[loser]) {
                        const winnerElo = userDB[winner].elo || 1200;
                        const loserElo = userDB[loser].elo || 1200;
                        const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
                        const expectedLoser = 1 / (1 + Math.pow(10, (winnerElo - loserElo) / 400));
                        
                        const k = 32;
                        userDB[winner].elo = Math.round(winnerElo + k * (1 - expectedWinner));
                        userDB[loser].elo = Math.round(loserElo + k * (0 - expectedLoser));
                        userDB[loser].losses = (userDB[loser].losses || 0) + 1;
                    }
                    saveAll(winner);
                } else if (ws.isBotMatch && userDB[loser]) {
                    const winnerElo = 1500; // Ghost bot is 1500
                    const loserElo = userDB[loser].elo || 1200;
                    const expectedLoser = 1 / (1 + Math.pow(10, (winnerElo - loserElo) / 400));
                    
                    const k = 16;
                    userDB[loser].elo = Math.round(loserElo + k * (0 - expectedLoser));
                    userDB[loser].losses = (userDB[loser].losses || 0) + 1;
                }
                
                if (userDB[loser]) saveAll(loser);
                sendLeaderboardUpdate();`;

code = code.replace(targetStr, replaceStr);
fs.writeFileSync('server.js', code);
