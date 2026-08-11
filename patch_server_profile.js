const fs = require('fs');

let server = fs.readFileSync('server.js', 'utf8');

const profileHandler = `
            if (data.type === 'get_player_profile') {
                const uname = data.username;
                const user = userDB[uname];
                if (!user) return;
                
                let recentWins = [];
                if (firestoreDb) {
                    try {
                        const snapshot = await firestoreDb.collection('games')
                            .where('winner', '==', uname)
                            .orderBy('timestamp', 'desc')
                            .limit(10)
                            .get();
                        
                        snapshot.forEach(doc => {
                            const d = doc.data();
                            recentWins.push({
                                opp: d.white === uname ? d.black : d.white,
                                time: d.timestamp,
                                reason: d.reason || 'checkmate'
                            });
                        });
                    } catch (e) {
                        console.error('Error fetching player history:', e);
                    }
                }
                
                ws.send(JSON.stringify({
                    type: 'player_profile_data',
                    name: uname,
                    elo: user.elo || 1200,
                    level: user.level || 1,
                    role: user.role || 'Gast',
                    wins: user.wins || 0,
                    recentWins
                }));
                return;
            }
`;

server = server.replace(/if \(data\.type === 'chat_message'\) \{/, profileHandler + "\n            if (data.type === 'chat_message') {");

fs.writeFileSync('server.js', server);
