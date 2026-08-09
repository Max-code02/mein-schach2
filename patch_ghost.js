const fs = require('fs');
let code = fs.readFileSync('ghostplayer.js', 'utf8');

code = code.replace(/sender: profile.title/g, "sender: botName");

fs.writeFileSync('ghostplayer.js', code);
