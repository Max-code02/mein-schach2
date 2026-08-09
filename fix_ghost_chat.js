const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const regex = /text:\s*\`\$\{randomName\}:\s*\$\{ghostSentences\[Math\.floor\(Math\.random\(\)\s*\*\s*ghostSentences\.length\)\]\}\`/g;
code = code.replace(regex, 'text: ghostSentences[Math.floor(Math.random() * ghostSentences.length)]');

fs.writeFileSync('server.js', code);
