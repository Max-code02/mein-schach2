import re

with open('autoBackup.js', 'r') as f:
    content = f.read()

content = content.replace("async function runBackup(supabaseAdmin)", "async function runBackup(db)")
content = content.replace("function startBackupScheduler(supabaseAdmin)", "function startBackupScheduler(db)")
content = content.replace("runBackup(supabaseAdmin)", "runBackup(db)")

content = content.replace(
"""            const { data, error } = await supabaseAdmin.from(tableName).select('*');
            
            if (error) {
                console.error(`❌ [DB] Fehler bei ${tableName}:`, error.message);
                continue;
            }""",
"""            let data = [];
            try {
                const schema = require('./src/db/schema.ts');
                if (tableName === 'players') data = await db.select().from(schema.players);
                else if (tableName === 'ip_ban') data = await db.select().from(schema.ipBan);
                else if (tableName === 'messages') data = await db.select().from(schema.messages);
            } catch (err) {
                console.error(`❌ [DB] Fehler bei ${tableName}:`, err.message);
                continue;
            }"""
)

content = content.replace("'players', 'user_stats'", "'players', 'ip_ban', 'messages'")

with open('autoBackup.js', 'w') as f:
    f.write(content)

