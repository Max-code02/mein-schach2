const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const regex = /<div id="lobby-controls".*?<\/div>/s;
html = html.replace(regex, '');

fs.writeFileSync('index.html', html);
