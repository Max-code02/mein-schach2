const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

// 1. Add isGhostMatch to roomState if the original ws was in a ghost match
code = code.replace(/if \(!roomState\) \{([\s\S]*?)whitePlayer:([\s\S]*?)blackPlayer:([\s\S]*?)\};/g, 'if (!roomState) {$1whitePlayer:$2blackPlayer:$3, isGhostMatch: ws.isGhostMatch || false };');

// 2. Add isGhostMatch when explicitly creating a ghost match room state
code = code.replace(/activeRoomStates\.set\(roomID, \{([\s\S]*?)board: null,([\s\S]*?)turn: 'white',([\s\S]*?)whitePlayer:/g, 'activeRoomStates.set(roomID, {$1board: null,$2turn: \'white\',$3isGhostMatch: ws.isGhostMatch || false,\n                        whitePlayer:');

// 3. Fix the rejoin_room logic
code = code.replace(/if \(ws\.isGhostMatch\) \{\s*ws\.isGhostMatch = true;\s*\}/g, 'if (roomState.isGhostMatch) { ws.isGhostMatch = true; }');

fs.writeFileSync('server.js', code);
