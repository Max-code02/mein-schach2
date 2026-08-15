const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

code = code.replace(/const roomState = activeRoomStates\.get\(targetRoom\);/g, "/* replaced const */");
fs.writeFileSync('server.js', code);
console.log("Fixed syntax 3");
