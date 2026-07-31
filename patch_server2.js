const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

// replace saveAll logic
code = code.replace(/sqlOps\.push\(\s*db\.insert\(schema\.players\)[\s\S]*?\}\);\s*\n/g, '');

code = code.replace(/try \{\s*db\.insert\(schema\.players\)[\s\S]*?\}\s*catch\s*\(e\)\s*\{\}/g, '');

fs.writeFileSync('server.js', code);
