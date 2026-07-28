import re

with open('adminSystem.js', 'r') as f:
    content = f.read()

content = content.replace(
"    const { wss, supabaseAdmin, runBackup, banPlayer, unbanPlayer, bannedIPs, bannedPlayers, profiles, addSpectator, removeSpectator, roomStates } = context;",
"    const { wss, db, runBackup, banPlayer, unbanPlayer, bannedIPs, bannedPlayers, profiles, addSpectator, removeSpectator, roomStates } = context;"
)

content = content.replace(
"""            if (supabaseAdmin) {
                try {
                    await supabaseAdmin.from('players').update({ is_banned: false, ban_reason: null }).eq('username', targetName);
                    await supabaseAdmin.from('bans').delete().eq('username', targetName);
                } catch(e) {
                    console.error("Supabase Unban Error:", e);
                }
            }""",
"""            if (db) {
                try {
                    const schema = require('./src/db/schema.ts');
                    const { eq } = require('drizzle-orm');
                    await db.update(schema.players).set({ is_banned: false }).where(eq(schema.players.username, targetName));
                } catch(e) {
                    console.error("DB Unban Error:", e);
                }
            }"""
)

content = content.replace(
"            if (typeof runBackup === 'function') await runBackup(supabaseAdmin);",
"            if (typeof runBackup === 'function') await runBackup(db);"
)

content = content.replace(
"""                if (supabaseAdmin) {
                    try {
                        await supabaseAdmin.from('players').update({ wins: amount }).eq('username', targetName);
                    } catch(e){}
                }""",
"""                if (db) {
                    try {
                        const schema = require('./src/db/schema.ts');
                        const { eq } = require('drizzle-orm');
                        await db.update(schema.players).set({ wins: amount }).where(eq(schema.players.username, targetName));
                    } catch(e){}
                }"""
)

with open('adminSystem.js', 'w') as f:
    f.write(content)

