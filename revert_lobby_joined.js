const fs = require('fs');
let script = fs.readFileSync('script.js', 'utf8');

const regex = /if \(data\.type === 'lobby_joined'\) \{[\s\S]*?return;\n        \}/;
script = script.replace(regex, '');

fs.writeFileSync('script.js', script);
