const fs = require('fs');
let script = fs.readFileSync('script.js', 'utf8');

const regex = /    \}\s*const joinBtn = document\.getElementById\('join-custom-lobby-btn'\);[\s\S]*?\}\);\s*\}\);/;
script = script.replace(regex, '');

fs.writeFileSync('script.js', script);
