const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

// Remove Drizzle imports
code = code.replace(/const { db } = require\('\.\/src\/db\/index\.js'\);\n/g, '');
code = code.replace(/const schema = require\('\.\/src\/db\/schema\.js'\);\n/g, '');
code = code.replace(/const { eq, asc, desc } = require\('drizzle-orm'\);\n/g, '');

// Remove if (db) blocks
code = code.replace(/if \(db\) \{[\s\S]*?\}\n/g, (match) => {
    // We only want to remove simple blocks if they are just doing db stuff.
    return '';
});

// Remove specific db lines
code = code.replace(/const data = await db\.select\(\)\.from\(schema\.players\)[\s\S]*?;\n/g, '');
code = code.replace(/await db\.update\(schema\.players\)[\s\S]*?;\n/g, '');
code = code.replace(/await db\.delete\(schema\.ipBan\)[\s\S]*?;\n/g, '');
code = code.replace(/await db\.insert\(schema\.messages\)[\s\S]*?;\n/g, '');
code = code.replace(/const messages = await db\.select\(\)\.from\(schema\.messages\)[\s\S]*?;\n/g, '');
code = code.replace(/const data = await db\.select\(\)\.from\(schema\.ipBan\);\n/g, '');

fs.writeFileSync('server.js', code);
console.log('Patched server.js');
