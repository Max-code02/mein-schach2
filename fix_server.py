import re

with open('server.js', 'r') as f:
    content = f.read()

# Fix loadBannedIPs
content = re.sub(
    r"async function loadBannedIPs\(\) \{[\s\S]*?\} catch \(err\) \{[\s\S]*?\}\n\}",
    """async function loadBannedIPs() {
    try {
        const schema = require('./src/db/schema.js');
        const data = await db.select().from(schema.ipBan);
        if (data) {
            data.forEach(row => bannedIPs.add(row.ip_address));
            console.log(`✅ ${bannedIPs.size} gesperrte IPs aus DB geladen.`);
        }
    } catch (err) {
        console.error("loadBannedIPs catch:", err.message);
    }
}""",
    content
)

# Fix loadProfilesFromSupabase
content = re.sub(
    r"async function loadProfilesFromSupabase\(\) \{[\s\S]*?console\.error\(\"❌ Fehler beim Laden der Spielerprofile aus Supabase:\", error\);\n    \}\n\}",
    """async function loadProfilesFromSupabase() {
    try {
        const schema = require('./src/db/schema.js');
        const data = await db.select().from(schema.players);
        data.forEach(p => {
            profiles[p.username] = p;
        });
        console.log(`✅ ${data.length} Spielerprofile erfolgreich aus DB geladen.`);
    } catch (error) {
        console.error("❌ Fehler beim Laden der Spielerprofile aus DB:", error);
    }
}""",
    content
)

with open('server.js', 'w') as f:
    f.write(content)

