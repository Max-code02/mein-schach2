// adminSystem.js - EXCLUSIVE ADMIN PANEL (POWER-VERSION)
const fs = require('fs');

const ADMINS = ['Max', '222', 'Admin'];
const ADMIN_PASSWORDS = ['Admina111', 'admina111', 'Admin111', 'admin111', 'Admina1', 'admina1', 'Maxi', '222'];

function parseArgsWithQuotes(text) {
    const regex = /"([^"]+)"|'([^']+)'|(\S+)/g;
    const tokens = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
        tokens.push(match[1] || match[2] || match[3]);
    }
    return tokens;
}

async function handleAdminCommand(ws, text, context) {
    const { wss, db, runBackup, banPlayer, unbanPlayer, bannedIPs, bannedPlayers, profiles, addSpectator, removeSpectator, roomStates } = context;

    let rawText = text.trim();
    let hasAdminPass = false;

    // Check for admin passwords in text or ws object
    for (const pw of ADMIN_PASSWORDS) {
        if (rawText.includes(pw) || (ws.password && ws.password === pw)) {
            hasAdminPass = true;
            // Clean the password out of the command text
            rawText = rawText.replaceAll(pw, '').trim();
        }
    }

    const tokens = parseArgsWithQuotes(rawText);
    if (tokens.length === 0) return true;

    const cmd = tokens[0].replace(/^[\/!\?]/, '').toLowerCase();
    const targetName = tokens[1] || '';

    const PUBLIC_COMMANDS = ['watch', 'spectate', 'unwatch', 'leave', 'help', 'befehle', 'befhel', '?'];

    if (!PUBLIC_COMMANDS.includes(cmd)) {
        const isAuthorized = ADMINS.includes(ws.playerName) || hasAdminPass;
        if (!isAuthorized) {
            ws.send(JSON.stringify({ 
                type: 'chat', 
                text: '⚙️ ❌ Passwort falsch oder gefehlt! (Nutze: /befehl "Name" Admina111)', 
                system: true 
            }));
            return true;
        }
    }

    console.log(`[COMMAND] ${ws.playerName || 'Gast'} nutzt Befehl: /${cmd} Target: ${targetName}`);

    switch (cmd) {
        // --- PARDON / UNBAN ---
        case 'pardon':
        case 'unban':
        case 'unbanip':
        case 'p':
            if (!targetName) {
                ws.send(JSON.stringify({ type: 'chat', text: '⚠️ Nutzung: /pardon "Name" Admina111', system: true }));
                return true;
            }
            
            // 1. Memory IP & Player bans clearing
            if (bannedIPs) bannedIPs.delete(targetName);
            if (bannedPlayers) bannedPlayers.delete(targetName);

            // 2. Postgres DB unban if configured
            if (db) {
                try {
                    const schema = require('./src/db/schema.js');
                    const { eq } = require('drizzle-orm');
                    await db.update(schema.players).set({ is_banned: false }).where(eq(schema.players.username, targetName));
                } catch(e) {
                    console.error("DB Unban Error:", e);
                }
            }

            // 3. Confirm to admin
            ws.send(JSON.stringify({ 
                type: 'chat', 
                text: `🔓 SUCCESS: Spieler/IP "${targetName}" wurde erfolgreich begnadigt und entsperrt!`, 
                system: true 
            }));
            
            // 4. Global notice
            wss.clients.forEach(c => {
                if (c.readyState === 1) {
                    c.send(JSON.stringify({ type: 'chat', text: `🕊️ ADMIN: "${targetName}" wurde begnadigt.`, system: true }));
                }
            });
            break;

        case 'k': // Kick
        case 'kick':
            if (!targetName) {
                ws.send(JSON.stringify({ type: 'chat', text: '⚠️ Nutzung: /kick "Name" Admina111', system: true }));
                return true;
            }
            let kickedCount = 0;
            wss.clients.forEach(c => { 
                if (c.playerName && c.playerName.toLowerCase() === targetName.toLowerCase()) { 
                    c.send(JSON.stringify({ type: 'chat', text: '🚪 Du wurdest vom Admin gekickt!', system: true })); 
                    c.close(); 
                    kickedCount++;
                }
            });
            ws.send(JSON.stringify({ type: 'chat', text: `🚪 Kicked ${kickedCount} Spieler (${targetName}).`, system: true }));
            break;

        case 'b': // Ban
        case 'ban':
            if (!targetName) {
                ws.send(JSON.stringify({ type: 'chat', text: '⚠️ Nutzung: /ban "Name" Admina111 [Grund]', system: true }));
                return true;
            }
            const reason = tokens.slice(2).join(' ') || 'Admin-Entscheidung';
            if (bannedPlayers) bannedPlayers.add(targetName);
            if (typeof banPlayer === 'function') await banPlayer(targetName, reason);
            
            wss.clients.forEach(c => {
                if (c.playerName && c.playerName.toLowerCase() === targetName.toLowerCase()) {
                    if (bannedIPs && c.clientIP) bannedIPs.add(c.clientIP);
                    c.send(JSON.stringify({ type: 'chat', text: `🔨 Du wurdest gebannt! Grund: ${reason}`, system: true }));
                    c.close();
                }
            });
            ws.send(JSON.stringify({ type: 'chat', text: `🔨 Spieler "${targetName}" wurde gebannt!`, system: true }));
            break;

        case 's': // Save/Backup
        case 'backup':
            if (typeof runBackup === 'function') await runBackup(db);
            ws.send(JSON.stringify({ type: 'chat', text: '💾 Hochsicherheits-Backup erstellt!', system: true }));
            break;

        case 'w': // Wartung an/aus
        case 'wartung':
            global.maintenanceMode = !global.maintenanceMode;
            const status = global.maintenanceMode ? 'AKTIVIERT 🔴' : 'DEAKTIVIERT 🟢';
            wss.clients.forEach(c => c.send(JSON.stringify({ type: 'chat', text: `⚠️ WARTUNG: ${status}`, system: true })));
            break;

        case 'a': // Durchsage (Announce)
        case 'announce':
            const msg = tokens.slice(1).join(' ');
            wss.clients.forEach(c => c.send(JSON.stringify({ type: 'chat', text: `📣 ADMIN DURCHSAGE: ${msg}`, system: true })));
            break;

        case 'i': // Info (IP & Status eines Spielers)
        case 'info':
            let foundInfo = false;
            wss.clients.forEach(c => {
                if (c.playerName && c.playerName.toLowerCase() === targetName.toLowerCase()) {
                    ws.send(JSON.stringify({ type: 'chat', text: `ℹ️ Player: ${c.playerName} | IP: ${c.clientIP || 'Unbekannt'} | Raum: ${c.room || 'Keiner'}`, system: true }));
                    foundInfo = true;
                }
            });
            if (!foundInfo) ws.send(JSON.stringify({ type: 'chat', text: '❓ Spieler nicht online.', system: true }));
            break;

        case 'l': // List (Wer ist online?)
        case 'list':
            const online = Array.from(wss.clients).map(c => c.playerName || 'Gast').join(', ');
            ws.send(JSON.stringify({ type: 'chat', text: `👥 Online (${wss.clients.size}): ${online}`, system: true }));
            break;

        case 'm': // Mute / Unmute
        case 'mute':
            wss.clients.forEach(c => {
                if (c.playerName && c.playerName.toLowerCase() === targetName.toLowerCase()) {
                    c.isMuted = !c.isMuted;
                    ws.send(JSON.stringify({ type: 'chat', text: `🎙️ ${c.playerName} Mute-Status: ${c.isMuted ? 'STUMM' : 'AKTIV'}`, system: true }));
                    c.send(JSON.stringify({ type: 'chat', text: `🎙️ Dein Mute-Status wurde geändert: ${c.isMuted ? 'Du bist jetzt stumm' : 'Du darfst wieder schreiben'}`, system: true }));
                }
            });
            break;

        case 'clr': // Clear Chat
        case 'clear':
            wss.clients.forEach(c => c.send(JSON.stringify({ type: 'clear_ui', system: true })));
            wss.clients.forEach(c => c.send(JSON.stringify({ type: 'chat', text: '🧹 Der Chat wurde vom Admin geleert.', system: true })));
            break;

        case 'kickall':
            wss.clients.forEach(c => {
                if (!ADMINS.includes(c.playerName)) {
                    c.send(JSON.stringify({ type: 'chat', text: '🚪 Server wird geleert...', system: true }));
                    c.close();
                }
            });
            break;

        case 'stats':
            const p = profiles ? profiles.get(targetName) : null;
            if (p) ws.send(JSON.stringify({ type: 'chat', text: `📊 ${targetName}: ${p.wins || 0} Siege`, system: true }));
            else ws.send(JSON.stringify({ type: 'chat', text: `📊 ${targetName}: Profil wird geladen...`, system: true }));
            break;

        case 'top':
            const top3 = Array.from(profiles ? profiles.values() : [])
                .sort((a, b) => (b.wins || 0) - (a.wins || 0))
                .slice(0, 5)
                .map((p, i) => `${i+1}. ${p.username || p.name} (${p.wins || 0}🏆)`)
                .join(' | ');
            ws.send(JSON.stringify({ type: 'chat', text: `🏆 Bestenliste: ${top3 || 'Keine Daten'}`, system: true }));
            break;

        case 'setwin':
            const amount = parseInt(tokens[2]);
            if (!isNaN(amount) && targetName) {
                if (profiles && profiles.has(targetName)) {
                    const profile = profiles.get(targetName);
                    profile.wins = amount;
                }
                if (db) {
                    try {
                        const schema = require('./src/db/schema.js');
                        const { eq } = require('drizzle-orm');
                        await db.update(schema.players).set({ wins: amount }).where(eq(schema.players.username, targetName));
                    } catch(e){}
                }
                ws.send(JSON.stringify({ type: 'chat', text: `⭐ ${targetName} hat jetzt ${amount} Siege.`, system: true }));
            } else {
                ws.send(JSON.stringify({ type: 'chat', text: '⚠️ Nutzung: /setwin "Name" 100 Admina111', system: true }));
            }
            break;

        case 'h':
        case 'help':
        case 'befehle':
        case 'befhel':
        case '?':
            if (hasAdminPass || ADMINS.includes(ws.playerName)) {
                ws.send(JSON.stringify({ 
                    type: 'chat', 
                    text: '🛠️ **ADMIN BEFEHLE (PW: Admina111):**\n' +
                          '• `/pardon "Name" Admina111` - Spieler/IP entsperren\n' +
                          '• `/ban "Name" Admina111 [Grund]` - Spieler bannen\n' +
                          '• `/kick "Name" Admina111` - Spieler kicken\n' +
                          '• `/mute "Name" Admina111` - Spieler stummschalten\n' +
                          '• `/setwin "Name" <Anzahl> Admina111` - Siege anpassen\n' +
                          '• `/clear Admina111` - Chat leeren\n' +
                          '• `/announce <Text> Admina111` - Durchsage machen\n' +
                          '• `!watch <Name/Raum>` - Spiel zuschauen\n' +
                          '• `!unwatch` - Zuschauen beenden\n' +
                          '• `!list` - Online-Spieler anzeigen', 
                    system: true 
                }));
            } else {
                ws.send(JSON.stringify({ 
                    type: 'chat', 
                    text: '💬 **SCHACH BEFEHLE:**\n' +
                          '• `!watch <Spieler/Raum>` oder `/watch <Spieler/Raum>` - Spiel zuschauen\n' +
                          '• `!unwatch` oder `/unwatch` - Zuschauen beenden\n' +
                          '• `!help`, `!befehle` oder `!befhel` - Befehle & Hilfe anzeigen\n' +
                          '• Admin-Befehle nutzen: `/befehl "Name" Admina111` (z.B. `/pardon "Spieler" Admina111`)', 
                    system: true 
                }));
            }
            break;

        case 'watch':
        case 'spectate':
            if (typeof addSpectator === 'function') {
                addSpectator(ws, targetName, wss, roomStates);
            }
            break;

        case 'unwatch':
        case 'leave':
            if (typeof removeSpectator === 'function') {
                removeSpectator(ws);
            }
            break;

        default:
            return false;
    }

    return true; 
}

module.exports = { handleAdminCommand, ADMINS, ADMIN_PASSWORDS, parseArgsWithQuotes };
