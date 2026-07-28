import re

with open('server.js', 'r') as f:
    content = f.read()

# 1. Setup
content = content.replace(
    "// Supabase setup\nconst SUPABASE_URL = process.env.SUPABASE_URL || 'https://sfbubqwnuthicpenmwye.supabase.co';\nconst SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || 'sb_publishable_H-ZV5me7vxZN_fNPdQ0ifA_--7AdGnZ';\n\nconst supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_KEY);",
    "// DB setup\nconst { db } = require('./src/db/index.ts');\nconst schema = require('./src/db/schema.ts');\nconst { eq, asc } = require('drizzle-orm');\nconst supabaseAdmin = null;"
)

# 2. Ban IP
content = content.replace(
"""        if (supabaseAdmin) {
            supabaseAdmin.from('ip_ban').insert([{ ip_address: ip, reason: reason }]).then(({ error }) => {
                if (error) console.error("Supabase Ban-Fehler:", error.message);
                else console.log(`🚫 IP ${ip} permanent in Supabase gespeichert.`);
            }).catch(err => console.error(err.message));
        }""",
"""        if (db) {
            db.insert(schema.ipBan).values({ ip_address: ip, reason: reason }).then(() => {
                console.log(`🚫 IP ${ip} permanent in DB gespeichert.`);
            }).catch(err => console.error(err.message));
        }"""
)

# 3. Realtime Channel
content = content.replace(
"""// Supabase Realtime Message Broker for cross-server & cross-client messaging
let realTimeChannel = null;
if (supabaseAdmin && typeof supabaseAdmin.channel === 'function') {
    try {
        realTimeChannel = supabaseAdmin.channel('global_chat_broker');
        realTimeChannel.on('broadcast', { event: 'message' }, (payload) => {
            if (payload && payload.payload) {
                const msgData = payload.payload;
                if (msgData._origin === SERVER_INSTANCE_ID) return; // Skip self
                
                // re-broadcast to local WS clients
                wss.clients.forEach(c => {
                    if (c.readyState === WebSocket.OPEN && c.room === msgData.room) {
                        c.send(JSON.stringify(msgData));
                    }
                });
            }
        }).subscribe();
    } catch (e) {
        console.error('Supabase Realtime konnte nicht gestartet werden:', e.message);
    }
}""",
"""// Removed Supabase Realtime
let realTimeChannel = null;"""
)

# 4. loadBannedIPs
content = content.replace(
"""async function loadBannedIPs() {
    try {
        const { data, error } = await supabaseAdmin
            .from('ip_ban')
            .select('ip_address');

        if (error) {
            console.error("Fehler beim Laden der Blacklist:", error);
            return;
        }

        if (data && data.length > 0) {
            data.forEach(entry => bannedIPs.add(entry.ip_address));
            console.log(`✅ ${data.length} IPs aus der Datenbank gebannt.`);
        } else {
            console.log("⚠️ Keine gesperrten IPs in der Datenbank gefunden.");
        }
    } catch (error) {
        console.error("❌ Supabase nicht erreichbar oder Fehler:", error);
    }
}""",
"""async function loadBannedIPs() {
    try {
        const data = await db.select({ ip_address: schema.ipBan.ip_address }).from(schema.ipBan);

        if (data && data.length > 0) {
            data.forEach(entry => bannedIPs.add(entry.ip_address));
            console.log(`✅ ${data.length} IPs aus der Datenbank gebannt.`);
        } else {
            console.log("⚠️ Keine gesperrten IPs in der Datenbank gefunden.");
        }
    } catch (error) {
        console.error("❌ DB nicht erreichbar oder Fehler:", error);
    }
}"""
)

# 5. update ban status
content = content.replace(
"""            try {
                const { error } = await supabaseAdmin
                    .from('players')
                    .update({ 
                        ip_ban: true, 
                        is_banned: true,  
                    })
                    .eq('username', currentName);
                if (error) throw error;
                console.log(`☁️ Supabase: Account ${currentName} und IP erfolgreich als gebannt markiert.`);
            } catch (err) {
                console.error("❌ Fehler beim Supabase-Update:", err.message);
            }""",
"""            try {
                await db.update(schema.players)
                    .set({ 
                        ip_ban: true, 
                        is_banned: true,  
                    })
                    .where(eq(schema.players.username, currentName));
                console.log(`☁️ DB: Account ${currentName} und IP erfolgreich als gebannt markiert.`);
            } catch (err) {
                console.error("❌ Fehler beim DB-Update:", err.message);
            }"""
)

# 6. supabaseAdmin references in handleAdminCommand
content = content.replace(
"                    supabaseAdmin, \n",
"                    db: db, \n"
)
content = content.replace(
"    if (typeof startBackupScheduler === 'function') {\n        startBackupScheduler(supabaseAdmin);\n    }",
"    if (typeof startBackupScheduler === 'function') {\n        startBackupScheduler(db);\n    }"
)

# 7. upsert logic for login
content = content.replace(
"""                const { data: user, error } = await supabaseAdmin
                    .from('players')
                    .upsert({ 
                        username: playerName, 
                        password: password, 
                        ip_address: clientIP,
                        last_login: new Date().toISOString()
                    }, { onConflict: 'username' })
                    .select()
                    .single();

                if (error) {
                    ws.send(JSON.stringify({ type: 'login_error', text: 'Datenbank-Fehler!' }));
                } else {""",
"""                let user;
                let error = null;
                try {
                    const result = await db.insert(schema.players).values({ 
                        username: playerName, 
                        password: password, 
                        ip_address: clientIP,
                        last_login: new Date()
                    }).onConflictDoUpdate({
                        target: schema.players.username,
                        set: {
                            password: password,
                            ip_address: clientIP,
                            last_login: new Date()
                        }
                    }).returning();
                    user = result[0];
                } catch (err) {
                    error = err;
                    console.error(err);
                }

                if (error || !user) {
                    ws.send(JSON.stringify({ type: 'login_error', text: 'Datenbank-Fehler!' }));
                } else {"""
)

# 8. messages
content = content.replace(
"                await supabaseAdmin.from('messages').insert([{ username, content }]);",
"                await db.insert(schema.messages).values({ username, content: content });"
)
content = content.replace(
"""            if (data.type === 'get_chat_history') {
                const { data: messages } = await supabaseAdmin
                    .from('messages')
                    .select('*')
                    .order('created_at', { ascending: true })
                    .limit(30);
                ws.send(JSON.stringify({ type: 'chat_history', messages: messages || [] }));""",
"""            if (data.type === 'get_chat_history') {
                const messages = await db.select().from(schema.messages).orderBy(asc(schema.messages.created_at)).limit(30);
                ws.send(JSON.stringify({ type: 'chat_history', messages: messages || [] }));"""
)

with open('server.js', 'w') as f:
    f.write(content)

