import re

with open('server.js', 'r') as f:
    content = f.read()

content = content.replace(
"""async function loadProfilesFromSupabase() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/players`, {
            headers: { 
                'apikey': SUPABASE_KEY, 
                'Authorization': `Bearer ${SUPABASE_KEY}` 
            }
        });
        if (!response.ok) throw new Error("HTTP Fehler " + response.status);
        const data = await response.json();
        
        data.forEach(p => {
            profiles[p.username] = p;
        });
        console.log(`✅ ${data.length} Spielerprofile erfolgreich aus Supabase geladen.`);
    } catch (error) {
        console.error("❌ Fehler beim Laden der Spielerprofile aus Supabase:", error);
    }
}""",
"""async function loadProfilesFromSupabase() {
    try {
        const data = await db.select().from(schema.players);
        data.forEach(p => {
            profiles[p.username] = p;
        });
        console.log(`✅ ${data.length} Spielerprofile erfolgreich aus DB geladen.`);
    } catch (error) {
        console.error("❌ Fehler beim Laden der Spielerprofile aus DB:", error);
    }
}"""
)

with open('server.js', 'w') as f:
    f.write(content)

