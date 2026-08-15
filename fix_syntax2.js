const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

code = code.replace("                    let roomState = activeRoomStates.get(targetRoom);\n                    if (!roomState) {", "                    roomState = activeRoomStates.get(targetRoom);\n                    if (!roomState) {");
fs.writeFileSync('server.js', code);
console.log("Fixed syntax error 2");
