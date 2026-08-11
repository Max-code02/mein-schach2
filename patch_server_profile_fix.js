const fs = require('fs');
let server = fs.readFileSync('server.js', 'utf8');

server = server.replace(/d\.white === uname \? d\.black : d\.white/g, "d.white_player === uname ? d.black_player : d.white_player");

fs.writeFileSync('server.js', server);
