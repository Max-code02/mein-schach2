const fs = require('fs');
let code = fs.readFileSync('autoBackup.js', 'utf8');

const regex = /const \{ data, error \} = await supabaseAdmin\.from\(tableName\)\.select\('\*'\);\s*if \(error\) \{\s*\}/g;

code = code.replace(regex, `let data = [];
            try {
                const schema = require('./src/db/schema.js');
                if (tableName === 'players') data = await db.select().from(schema.players);
                else if (tableName === 'ip_ban') data = await db.select().from(schema.ipBan);
                else if (tableName === 'messages') data = await db.select().from(schema.messages);
            } catch (err) {
                console.error(\`❌ [DB] Fehler bei \${tableName}:\`, err.message);
                continue;
            }`);

fs.writeFileSync('autoBackup.js', code);
