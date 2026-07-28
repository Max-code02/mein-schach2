import re

with open('autoBackup.js', 'r') as f:
    content = f.read()

content = re.sub(r"const \{ data, error \} = await supabaseAdmin\.from\(tableName\)\.select\('\*'\);[\s\S]*?continue;\n\s*\}", """let data = [];
            try {
                const schema = require('./src/db/schema.js');
                if (tableName === 'players') data = await db.select().from(schema.players);
                else if (tableName === 'ip_ban') data = await db.select().from(schema.ipBan);
                else if (tableName === 'messages') data = await db.select().from(schema.messages);
            } catch (err) {
                console.error(`❌ [DB] Fehler bei ${tableName}:`, err.message);
                continue;
            }""", content)

content = content.replace("throw new Error(`Supabase-Fehler bei Tabelle ${tableName}: ${error.message}`);", "")

with open('autoBackup.js', 'w') as f:
    f.write(content)

