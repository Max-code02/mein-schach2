import re
import os

with open('server.js', 'r') as f:
    content = f.read()

# Remove Supabase client requirement
content = re.sub(r"const \{ createClient \} = require\('@supabase/supabase-js'\);\n*", "", content)
content = re.sub(r"const supabaseAdmin = null;\n*", "", content)

# Remove RealTimeChannel code
content = re.sub(r"let realTimeChannel = null;\nif \(supabaseAdmin && typeof supabaseAdmin\.channel === 'function'\) \{[\s\S]*?\}\n\}", "let realTimeChannel = null;", content)

# Remove realTimeChannel calls in broadcastGlobalMessage
content = re.sub(r"    if \(publishToRealtime && realTimeChannel\) \{[\s\S]*?\}\.catch\(\(\) => \{\}\);\n    \}", "", content)
# Remove realTimeChannel calls in broadcastRoomMessage
content = re.sub(r"    if \(publishToRealtime && realTimeChannel\) \{[\s\S]*?\}\.catch\(\(\) => \{\}\);\n    \}", "", content)

# Replace loadProfilesFromSupabase
content = re.sub(r"async function loadProfilesFromSupabase\(\) \{[\s\S]*?\n\}", """async function loadProfilesFromSupabase() {
    try {
        const schema = require('./src/db/schema.js');
        const data = await db.select().from(schema.players);
        data.forEach(p => {
            userDB[p.username] = {
                password: p.password || "",
                wins: p.wins || 0,
                xp: p.xp || 0,
                level: p.level || 1,
                ip_ban: p.ip_ban || false,
                is_banned: p.is_banned || false
            };
        });
        console.log(`✅ ${data.length} Profile erfolgreich aus DB geladen.`);
    } catch (err) {
        console.error("❌ Fehler beim Laden von DB:", err);
    }
}""", content)

with open('server.js', 'w') as f:
    f.write(content)

