const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const errorRegex = /ws\.lastBoardState = data\.board; \n                    let roomState = activeRoomStates\.get\(targetRoom\);/;
const replacement = `ws.lastBoardState = data.board; 
                    roomState = activeRoomStates.get(targetRoom) || roomState;`; // Just re-assign if needed, though it's already defined

code = code.replace(errorRegex, replacement);
fs.writeFileSync('server.js', code);
console.log("Fixed syntax error");
