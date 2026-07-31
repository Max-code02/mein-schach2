// adminSystem.js - EXCLUSIVE ADMIN PANEL (POWER-VERSION)
const fs = require('fs');

const ADMINS = []; // Gelöscht: ['Max', '222', 'Admin']
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

function resolveTargetNameAndRest(tokens, wss, profiles) {
    if (tokens.length <= 1) {
        return { target: '', rest: '' };
    }
    const fullArgs = tokens.slice(1).join(' ');
    
    // Check online players
    if (wss && wss.clients) {
        for (const c of wss.clients) {
            if (c.playerName) {
                const name = c.playerName;
                if (fullArgs.toLowerCase().startsWith(name.toLowerCase() + ' ')) {
                    return {
                        target: name,
                        rest: fullArgs.slice(name.length).trim()
                    };
                }
                if (fullArgs.toLowerCase() === name.toLowerCase()) {
                    return { target: name, rest: '' };
                }
            }
        }
    }
    
    if (profiles) {
        let keys = [];
        if (typeof profiles.keys === 'function') {
            keys = Array.from(profiles.keys());
        } else {
            keys = Object.keys(profiles);
        }
        for (const name of keys) {
            if (fullArgs.toLowerCase().startsWith(name.toLowerCase() + ' ')) {
                return {
                    target: name,
                    rest: fullArgs.slice(name.length).trim()
                };
            }
            if (fullArgs.toLowerCase() === name.toLowerCase()) {
                return { target: name, rest: '' };
            }
        }
    }
    
    // Fallback: If the last token is a number, the target is everything except the last token
    const lastToken = tokens[tokens.length - 1];
    if (tokens.length > 2 && !isNaN(parseInt(lastToken))) {
        return {
            target: tokens.slice(1, tokens.length - 1).join(' '),
            rest: lastToken
        };
    }
    
    // Default fallback: target is the first token, rest is the rest
    return {
        target: tokens[1] || '',
        rest: tokens.slice(2).join(' ')
    };
}

async function handleAdminCommand(ws, text, context) {
    const { wss, db, runBackup, banPlayer, unbanPlayer, bannedIPs, bannedPlayers, profiles, addSpectator, removeSpectator, roomStates } = context;

    const originalText = text.trim();
    let rawText = originalText;
    let hasAdminPass = false;
    let hasHelperPass = false;

    // Admin passwords check and cleaning
    const adminPWs = ['Admina111', 'admina111', 'Admin111', 'admin111', 'Admina1', 'admina1', '222'];
    for (const pw of adminPWs) {
        const regex = new RegExp(pw, 'gi');
        if (regex.test(rawText) || (ws.password && ws.password === pw)) {
            hasAdminPass = true;
            rawText = rawText.replace(regex, '').trim();
        }
    }

    // Helper passwords check and cleaning
    const helperPWs = ['Maxi', 'maxi'];
    for (const pw of helperPWs) {
        const regex = new RegExp(pw, 'gi');
        if (regex.test(rawText) || (ws.password && ws.password === pw)) {
            hasHelperPass = true;
            rawText = rawText.replace(regex, '').trim();
        }
    }

    const tokens = parseArgsWithQuotes(rawText);
    if (tokens.length === 0) return true;

    const firstChar = originalText.charAt(0);
    const cmd = tokens[0].replace(/^[\/!\?]/, '').toLowerCase();
    
    // Resolve target and remaining arguments using our ultra-robust parser
    const resolvedArgs = resolveTargetNameAndRest(tokens, wss, profiles);
    const targetName = resolvedArgs.target;

    const PUBLIC_COMMANDS = ['watch', 'spectate', 'unwatch', 'leave', 'help', 'befehle', 'befhel', '?'];
    const HELPER_COMMANDS = ['kick', 'mute', 'info', 'list'];

    // Tiered Authorization check
    if (!PUBLIC_COMMANDS.includes(cmd)) {
        const isHelperCmd = HELPER_COMMANDS.includes(cmd);
        
        let hasAdminRole = false;
        let hasHelperRole = false;
        if (profiles) {
            let myProfile = null;
            if (typeof profiles.get === 'function') {
                myProfile = profiles.get(ws.playerName);
            } else {
                myProfile = profiles[ws.playerName];
            }
            if (myProfile) {
                if (myProfile.role === 'admin') hasAdminRole = true;
                if (myProfile.role === 'helper' || myProfile.role === 'moderator') hasHelperRole = true;
            }
        }
        
        const isAdminUser = ADMINS.includes(ws.playerName) || hasAdminPass || hasAdminRole;
        const isHelperUser = hasHelperPass || hasHelperRole;

        let isAuthorized = isAdminUser;
        if (isHelperCmd && isHelperUser) {
            isAuthorized = true;
        }

        if (!isAuthorized) {
            ws.send(JSON.stringify({ 
                type: 'chat', 
                text: '⚙️ ❌ Zugriff verweigert! Passwort falsch oder unzureichende Rechte.', 
                system: true 
            }));
            return true;
        }
    }

    console.log(`[COMMAND] ${ws.playerName || 'Gast'} nutzt Befehl: ${firstChar}${cmd} Target: ${targetName}`);


    switch (cmd) {
        // --- PARDON / UNBAN ---
        case 'pardon':
        case 'unban':
        case 'unbanip':
        case 'p':
            if (!targetName) {
                ws.send(JSON.stringify({ type: 'chat', text: '⚠️ Nutzung: /pardon "Name" [Passwort]', system: true }));
                return true;
            }
            
            // 1. Memory IP & Player bans clearing
            if (bannedIPs) bannedIPs.delete(targetName);
            if (bannedPlayers) bannedPlayers.delete(targetName.toLowerCase());

            // 2. Centralized unbanPlayer helper
            if (typeof unbanPlayer === 'function') {
                await unbanPlayer(targetName);
            }

            // 3. Postgres DB unban if configured
            if (db) {
                try {
                    await db.collection("players").doc(targetName).update({ is_banned: false, ip_ban: false });
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
                ws.send(JSON.stringify({ type: 'chat', text: '⚠️ Nutzung: /kick "Name" [Passwort]', system: true }));
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
                ws.send(JSON.stringify({ type: 'chat', text: '⚠️ Nutzung: /ban "Name" [Passwort] [Grund]', system: true }));
                return true;
            }
            const reason = resolvedArgs.rest || 'Admin-Entscheidung';
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
            const amount = parseInt(resolvedArgs.rest);
            if (!isNaN(amount) && targetName) {
                if (profiles) {
                    if (typeof profiles.has === 'function' && profiles.has(targetName)) {
                        const profile = profiles.get(targetName);
                        profile.wins = amount;
                    } else if (profiles[targetName]) {
                        profiles[targetName].wins = amount;
                    }
                }
                if (db) {
                    try {
                        await db.collection("players").doc(targetName).update({ wins: amount });
                    } catch(e){}
                }
                if (global.firestoreDb) {
                    try {
                        let docId = targetName;
                        if (profiles && profiles[targetName] && profiles[targetName].uid) {
                             docId = profiles[targetName].uid;
                        } else if (typeof profiles.has === 'function' && profiles.has(targetName)) {
                             docId = profiles.get(targetName).uid || targetName;
                        }
                        await global.firestoreDb.collection('players').doc(docId).set({ wins: amount }, { merge: true });
                        console.log(`🔥 Admin command updated Firestore for ${targetName}: wins=${amount}`);
                    } catch(e) { console.error("Firestore Admin Update Error:", e); }
                }
                ws.send(JSON.stringify({ type: 'chat', text: `⭐ ${targetName} hat jetzt ${amount} Siege.`, system: true }));
            } else {
                ws.send(JSON.stringify({ type: 'chat', text: '⚠️ Nutzung: /setwin "Name" 100 [Passwort]', system: true }));
            }
            break;

        case 'setrole':
            const role = resolvedArgs.rest.toLowerCase().trim();
            if (role && targetName) {
                if (profiles) {
                    if (typeof profiles.has === 'function' && profiles.has(targetName)) {
                        const profile = profiles.get(targetName);
                        profile.role = role;
                    } else if (profiles[targetName]) {
                        profiles[targetName].role = role;
                    }
                }
                if (db) {
                    try {
                        
                        await db.collection("players").doc(targetName).update({ role: role });
                    } catch(e){}
                }
                if (global.firestoreDb) {
                    try {
                        let docId = targetName;
                        if (profiles && profiles[targetName] && profiles[targetName].uid) {
                             docId = profiles[targetName].uid;
                        } else if (typeof profiles.has === 'function' && profiles.has(targetName)) {
                             docId = profiles.get(targetName).uid || targetName;
                        }
                        await global.firestoreDb.collection('players').doc(docId).set({ role: role }, { merge: true });
                        console.log(`🔥 Admin command updated Firestore for ${targetName}: role=${role}`);
                    } catch(e) { console.error("Firestore Admin Update Error:", e); }
                }
                ws.send(JSON.stringify({ type: 'chat', text: `⭐ ${targetName} hat nun die Rolle '${role}'.`, system: true }));
            } else {
                ws.send(JSON.stringify({ type: 'chat', text: '⚠️ Nutzung: /setrole "Name" admin [Passwort]', system: true }));
            }
            break;

        case 'h':
        case 'help':
        case 'befehle':
        case 'befhel':
        case '?':
            if (firstChar === '/' && hasAdminPass) {
                ws.send(JSON.stringify({ 
                    type: 'chat', 
                    text: '🛠️ **ADMIN BEFEHLE:**\n' +
                          '• `/pardon <Spieler/IP>` - Begnadigt einen Spieler oder eine gesperrte IP-Adresse\n' +
                          '• `/ban <Spieler> [Grund]` - Bannt einen Spieler permanent\n' +
                          '• `/kick <Spieler>` - Kickt einen Spieler vom Server\n' +
                          '• `/mute <Spieler>` - Stummschaltung umschalten (stummschalten/freischalten)\n' +
                          '• `/setwin <Spieler> <Anzahl>` - Passt die Siege eines Spielers an\n' +
                          '• `/setrole <Spieler> <Rolle>` - Ändert die Rolle eines Spielers (z.B. admin)\n' +
                          '• `/clear` - Leert den Chatverlauf komplett\n' +
                          '• `/announce <Nachricht>` - Sendet eine globale System-Durchsage\n' +
                          '• `/wartung` - Schaltet den Wartungsmodus ein/aus\n' +
                          '• `/backup` - Erstellt ein manuelles Backup der Datenbank\n' +
                          '• `/info <Spieler>` - Zeigt IP und Raum eines Spielers an', 
                    system: true 
                }));
            } else if (firstChar === '?' && hasHelperPass) {
                ws.send(JSON.stringify({ 
                    type: 'chat', 
                    text: '🛡️ **SUPPORTER/HELFER BEFEHLE:**\n' +
                          '• `/kick <Spieler>` - Kickt einen störenden Spieler\n' +
                          '• `/mute <Spieler>` - Schaltet einen Spieler stumm\n' +
                          '• `/info <Spieler>` - Zeigt Status und IP eines Spielers an\n' +
                          '• `!list` - Zeigt alle angemeldeten Online-Spieler an', 
                    system: true 
                }));
            } else if (firstChar === '!') {
                ws.send(JSON.stringify({ 
                    type: 'chat', 
                    text: '💬 **SCHACH BEFEHLE:**\n' +
                          '• `!watch <Spieler>` - Schaut einer aktiven Partie oder einem Spieler zu\n' +
                          '• `!unwatch` - Verlässt den Zuschauermodus\n' +
                          '• `!help` - Zeigt diese Liste normaler Befehle an', 
                    system: true 
                }));
            } else {
                ws.send(JSON.stringify({ 
                    type: 'chat', 
                    text: '💡 Tipp: Nutze `!help` für normale Schach-Befehle.', 
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
