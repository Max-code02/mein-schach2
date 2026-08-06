// adminSystem.js - EXCLUSIVE ADMIN PANEL & COMMAND ENGINE (POWER-VERSION)
const fs = require('fs');
const os = require('os');

const ADMINS = ['Max', 'max', '222', 'Admin', 'admin', 'max.schule13@gmail.com'];
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

    const rawInput = text.trim();
    if (!rawInput) return true;

    // Tokenize text cleanly
    const rawTokens = parseArgsWithQuotes(rawInput);
    if (rawTokens.length === 0) return true;

    let hasAdminPass = false;
    let hasHelperPass = false;
    const cleanTokens = [];

    // Separate command/arguments from password tokens cleanly without string corruption
    for (const token of rawTokens) {
        const tokenLower = token.toLowerCase();
        const isPw = ADMIN_PASSWORDS.some(pw => pw.toLowerCase() === tokenLower);
        const isHelperPw = ['maxi'].includes(tokenLower);
        if (isPw || (ws.password && ADMIN_PASSWORDS.some(pw => pw.toLowerCase() === ws.password.toLowerCase()))) {
            hasAdminPass = true;
        } else if (isHelperPw || (ws.password && ws.password.toLowerCase() === 'maxi')) {
            hasHelperPass = true;
        } else {
            cleanTokens.push(token);
        }
    }

    if (cleanTokens.length === 0) return true;

    const firstChar = rawInput.charAt(0);
    const cmd = cleanTokens[0].replace(/^[\/!\?]/, '').toLowerCase();

    // Resolve target and remaining arguments using cleanTokens
    const resolvedArgs = resolveTargetNameAndRest(cleanTokens, wss, profiles);
    const targetName = resolvedArgs.target;

    const PUBLIC_COMMANDS = ['watch', 'spectate', 'unwatch', 'leave', 'help', 'befehle', 'befhel', '?', 'myip', 'mypi', 'mipy', 'mypu'];
    const HELPER_COMMANDS = ['kick', 'mute', 'unmute', 'warn', 'info', 'list', 'online', 'players'];

    // Check user identities & roles
    const currentName = (ws.playerName || '').toLowerCase();
    const currentEmail = (ws.userEmail || '').toLowerCase();

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

    const isAdminUser = ADMINS.some(a => a.toLowerCase() === currentName) ||
                        currentName === 'max' ||
                        currentEmail === 'max.schule13@gmail.com' ||
                        hasAdminPass ||
                        hasAdminRole;

    const isHelperUser = isAdminUser || hasHelperPass || hasHelperRole;

    // Authorization Guard
    if (!PUBLIC_COMMANDS.includes(cmd)) {
        const isHelperCmd = HELPER_COMMANDS.includes(cmd);
        const isAuthorized = isHelperCmd ? isHelperUser : isAdminUser;

        if (!isAuthorized) {
            ws.send(JSON.stringify({ 
                type: 'chat', 
                text: '⚙️ ❌ Zugriff verweigert! Du hast keine Admin-Rechte für diesen Befehl.', 
                system: true 
            }));
            return true;
        }
    }

    console.log(`[ADMIN-COMMAND] ${ws.playerName || 'Gast'} (${currentEmail}): ${firstChar}${cmd} Target: "${targetName}" Rest: "${resolvedArgs.rest}"`);

    switch (cmd) {
        // --- TEST & DIAGNOSTICS BOT ---
        case 'test':
        case 'testbot':
        case 'diag':
        case 'diagnose':
        case 'selftest':
        case 'check':
            try {
                const { runSystemDiagnostics } = require('./adminTestBot.js');
                ws.send(JSON.stringify({ type: 'chat', text: '🤖 Starte automatischen System-Diagnosetest...', system: true }));
                const diagResults = await runSystemDiagnostics(context);
                
                let report = `🤖 **DIAGNOSE-BERICHT (${diagResults.timestamp}):**\n` +
                             `✅ Bestanden: ${diagResults.passed} | ❌ Fehlgeschlagen: ${diagResults.failed}\n\n`;
                diagResults.tests.forEach(t => {
                    report += `• **${t.name}**: ${t.status} (${t.details})\n`;
                });
                ws.send(JSON.stringify({ type: 'chat', text: report, system: true }));
            } catch(err) {
                ws.send(JSON.stringify({ type: 'chat', text: `⚠️ Fehler beim Ausführen des Testbots: ${err.message}`, system: true }));
            }
            break;

        // --- PARDON / UNBAN ---
        case 'pardon':
        case 'unban':
        case 'unbanip':
        case 'p':
            if (!targetName) {
                ws.send(JSON.stringify({ type: 'chat', text: '⚠️ Nutzung: /pardon "Name"', system: true }));
                return true;
            }
            
            if (bannedIPs) bannedIPs.delete(targetName);
            if (bannedPlayers) bannedPlayers.delete(targetName.toLowerCase());

            if (typeof unbanPlayer === 'function') {
                await unbanPlayer(targetName);
            }

            if (db) {
                try {
                    await db.collection("players").doc(targetName).update({ is_banned: false, ip_ban: false });
                } catch(e) {}
            }

            ws.send(JSON.stringify({ 
                type: 'chat', 
                text: `🔓 SUCCESS: Spieler/IP "${targetName}" wurde erfolgreich begnadigt und entsperrt!`, 
                system: true 
            }));
            
            wss.clients.forEach(c => {
                if (c.readyState === 1) {
                    c.send(JSON.stringify({ type: 'chat', text: `🕊️ ADMIN: "${targetName}" wurde begnadigt.`, system: true }));
                }
            });
            break;

        // --- OFFBAN ---
        case 'offban':
            if (!targetName) {
                ws.send(JSON.stringify({ type: 'chat', text: '⚠️ Nutzung: /offban "Name"', system: true }));
                return true;
            }
            if (bannedPlayers) bannedPlayers.add(targetName.toLowerCase());
            if (typeof banPlayer === 'function') await banPlayer(targetName, "Offline Ban");
            
            if (db) {
                try {
                    await db.collection("players").doc(targetName).update({ is_banned: true, ip_ban: true });
                } catch(e) {}
            }

            ws.send(JSON.stringify({ 
                type: 'chat', 
                text: `🔨 SUCCESS: Spieler "${targetName}" wurde offline gebannt!`, 
                system: true 
            }));
            break;

        // --- TEMPBAN ---
        case 'tempban':
            const tbMin = parseInt(resolvedArgs.rest) || 60;
            if (!targetName) {
                ws.send(JSON.stringify({ type: 'chat', text: '⚠️ Nutzung: /tempban "Name" [Minuten]', system: true }));
                return true;
            }

            let tbanTargetIsAdmin = false;
            const lowerTBanTarget = targetName.toLowerCase();
            if (ADMINS.some(a => a.toLowerCase() === lowerTBanTarget) || lowerTBanTarget === 'max') {
                tbanTargetIsAdmin = true;
            }
            wss.clients.forEach(c => {
                if (c.playerName && c.playerName.toLowerCase() === lowerTBanTarget) {
                    if (ADMINS.some(a => a.toLowerCase() === (c.playerName || "").toLowerCase()) || (c.playerName || "").toLowerCase() === 'max' || c.email === 'max.schule13@gmail.com' || (profiles && profiles[c.playerName] && profiles[c.playerName].role === 'admin')) {
                        tbanTargetIsAdmin = true;
                    }
                }
            });

            if (tbanTargetIsAdmin) {
                wss.clients.forEach(c => {
                    if (c.playerName && c.playerName.toLowerCase() === lowerTBanTarget) {
                        c.send(JSON.stringify({ type: 'chat', text: `⚠️ du wärst jetzt gebannt worden (Schutz aktiv - Tempban abgewendet)`, system: true }));
                    }
                });
                ws.send(JSON.stringify({ type: 'chat', text: `🛡️ "${targetName}" ist ein Admin und kann nicht gebannt werden!`, system: true }));
                return true;
            }

            if (bannedPlayers) bannedPlayers.add(targetName.toLowerCase());
            
            wss.clients.forEach(c => {
                if (c.playerName && c.playerName.toLowerCase() === targetName.toLowerCase()) {
                    c.send(JSON.stringify({ type: 'chat', text: `⏳ Du wurdest für ${tbMin} Minuten temporär gebannt!`, system: true }));
                    c.close();
                }
            });
            ws.send(JSON.stringify({ type: 'chat', text: `⏳ Spieler "${targetName}" wurde für ${tbMin} Minuten gebannt!`, system: true }));
            
            // Auto unban later
            setTimeout(() => {
                if (bannedPlayers) bannedPlayers.delete(targetName.toLowerCase());
            }, tbMin * 60000);
            break;

        // --- KICK ---
        case 'k':
        case 'kick':
            if (!targetName) {
                ws.send(JSON.stringify({ type: 'chat', text: '⚠️ Nutzung: /kick "Name" [Grund]', system: true }));
                return true;
            }
            const kReason = resolvedArgs.rest || 'Vom Admin gekickt';
            let kickedCount = 0;
            let kickTargetIsAdmin = false;
            
            const lowerKTarget = targetName.toLowerCase();
            if (ADMINS.some(a => a.toLowerCase() === lowerKTarget) || lowerKTarget === 'max') {
                kickTargetIsAdmin = true;
            }

            wss.clients.forEach(c => { 
                if (c.playerName && c.playerName.toLowerCase() === lowerKTarget) { 
                    if (ADMINS.some(a => a.toLowerCase() === (c.playerName || "").toLowerCase()) || (c.playerName || "").toLowerCase() === 'max' || c.email === 'max.schule13@gmail.com' || (profiles && profiles[c.playerName] && profiles[c.playerName].role === 'admin')) {
                        kickTargetIsAdmin = true;
                    }
                }
            });

            if (kickTargetIsAdmin) {
                wss.clients.forEach(c => {
                    if (c.playerName && c.playerName.toLowerCase() === lowerKTarget) {
                        c.send(JSON.stringify({ type: 'chat', text: `⚠️ du wärst jetzt gebannt worden (Schutz aktiv - Kick abgewendet)`, system: true }));
                    }
                });
                ws.send(JSON.stringify({ type: 'chat', text: `🛡️ "${targetName}" ist ein Admin und kann nicht gekickt werden!`, system: true }));
                return true;
            }

            wss.clients.forEach(c => { 
                if (c.playerName && c.playerName.toLowerCase() === targetName.toLowerCase()) { 
                    c.send(JSON.stringify({ type: 'chat', text: `🚪 Du wurdest gekickt! Grund: ${kReason}`, system: true })); 
                    c.close(); 
                    kickedCount++;
                }
            });
            ws.send(JSON.stringify({ type: 'chat', text: `🚪 Kicked ${kickedCount} Spieler (${targetName}).`, system: true }));
            break;

        // --- DISCONNECT ---
        case 'disconnect':
            if (!targetName) {
                ws.send(JSON.stringify({ type: 'chat', text: '⚠️ Nutzung: /disconnect "Name"', system: true }));
                return true;
            }
            wss.clients.forEach(c => { 
                if (c.playerName && c.playerName.toLowerCase() === targetName.toLowerCase()) { 
                    c.close(); 
                }
            });
            ws.send(JSON.stringify({ type: 'chat', text: `🔌 Verbindung von "${targetName}" getrennt.`, system: true }));
            break;

        // --- BAN / BANIP ---
        case 'b':
        case 'ban':
        case 'banip':
            if (!targetName) {
                ws.send(JSON.stringify({ type: 'chat', text: '⚠️ Nutzung: /ban "Name/IP" [Grund]', system: true }));
                return true;
            }
            const reason = resolvedArgs.rest || 'Admin-Entscheidung';
            
            let targetIsAdmin = false;
            const lowerTarget = targetName.toLowerCase();
            if (ADMINS.some(a => a.toLowerCase() === lowerTarget) || lowerTarget === 'max') {
                targetIsAdmin = true;
            }
            wss.clients.forEach(c => {
                if ((c.playerName && c.playerName.toLowerCase() === lowerTarget) || c.clientIP === targetName) {
                    if (ADMINS.some(a => a.toLowerCase() === (c.playerName || "").toLowerCase()) || (c.playerName || "").toLowerCase() === 'max' || c.email === 'max.schule13@gmail.com' || (profiles && profiles[c.playerName] && profiles[c.playerName].role === 'admin')) {
                        targetIsAdmin = true;
                    }
                }
            });

            if (targetIsAdmin) {
                wss.clients.forEach(c => {
                    if ((c.playerName && c.playerName.toLowerCase() === lowerTarget) || c.clientIP === targetName) {
                        c.send(JSON.stringify({ type: 'chat', text: `⚠️ du wärst jetzt gebannt worden (Schutz aktiv)`, system: true }));
                    }
                });
                ws.send(JSON.stringify({ type: 'chat', text: `🛡️ "${targetName}" ist ein Admin und kann nicht gebannt werden!`, system: true }));
                return true;
            }

            // check if target is IP
            const isIP = targetName.match(/[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+/);
            if (isIP) {
                if (bannedIPs) bannedIPs.add(targetName);
            } else {
                if (bannedPlayers) bannedPlayers.add(targetName.toLowerCase());
                if (typeof banPlayer === 'function') await banPlayer(targetName, reason);
            }
            
            wss.clients.forEach(c => {
                if ((c.playerName && c.playerName.toLowerCase() === targetName.toLowerCase()) || c.clientIP === targetName) {
                    if (bannedIPs && c.clientIP) bannedIPs.add(c.clientIP);
                    c.send(JSON.stringify({ type: 'chat', text: `🔨 Du wurdest gebannt! Grund: ${reason}`, system: true }));
                    c.close();
                }
            });
            ws.send(JSON.stringify({ type: 'chat', text: `🔨 "${targetName}" wurde permanent gebannt!`, system: true }));
            break;

        // --- BANLIST ---
        case 'banlist':
            const pBans = Array.from(bannedPlayers || []).join(', ');
            const iBans = Array.from(bannedIPs || []).join(', ');
            ws.send(JSON.stringify({ 
                type: 'chat', 
                text: `📜 **BAN-LISTE:**\n• Spieler: ${pBans || 'Keine'}\n• IPs: ${iBans || 'Keine'}`, 
                system: true 
            }));
            break;
            
        // --- MUTELIST ---
        case 'mutelist':
            const muted = [];
            wss.clients.forEach(c => {
                if (c.isMuted) muted.push(c.playerName || 'Unbekannt');
            });
            ws.send(JSON.stringify({ type: 'chat', text: `🤫 **MUTE-LISTE:** ${muted.join(', ') || 'Niemand'}`, system: true }));
            break;

        // --- WARN ---
        case 'w':
        case 'warn':
            if (!targetName) {
                ws.send(JSON.stringify({ type: 'chat', text: '⚠️ Nutzung: /warn "Name" [Grund]', system: true }));
                return true;
            }
            const wReason = resolvedArgs.rest || 'Fehlverhalten';
            wss.clients.forEach(c => {
                if (c.playerName && c.playerName.toLowerCase() === targetName.toLowerCase()) {
                    c.send(JSON.stringify({ type: 'chat', text: `⚠️ **VERWARNUNG:** ${wReason}`, system: true }));
                }
            });
            ws.send(JSON.stringify({ type: 'chat', text: `⚠️ "${targetName}" wurde verwarnt.`, system: true }));
            break;

        // --- WARNIP ---
        case 'warnip':
            if (!targetName) {
                ws.send(JSON.stringify({ type: 'chat', text: '⚠️ Nutzung: /warnip "IP" [Grund]', system: true }));
                return true;
            }
            const wpReason = resolvedArgs.rest || 'Netzwerk-Verwarnung';
            wss.clients.forEach(c => {
                if (c.clientIP === targetName) {
                    c.send(JSON.stringify({ type: 'chat', text: `⚠️ **IP-VERWARNUNG:** ${wpReason}`, system: true }));
                }
            });
            ws.send(JSON.stringify({ type: 'chat', text: `⚠️ IP "${targetName}" wurde verwarnt.`, system: true }));
            break;

        // --- BACKUP ---
        case 's':
        case 'save':
        case 'backup':
            if (typeof runBackup === 'function') await runBackup(db);
            ws.send(JSON.stringify({ type: 'chat', text: '💾 Hochsicherheits-Backup erstellt!', system: true }));
            break;

        // --- LOAD ---
        case 'load':
            ws.send(JSON.stringify({ type: 'chat', text: '🔄 Lokale Datenbanken werden neu geladen (Simuliert).', system: true }));
            break;

        // --- RENAME ---
        case 'rename':
            const newName = cleanTokens[2];
            if (!targetName || !newName) {
                ws.send(JSON.stringify({ type: 'chat', text: '⚠️ Nutzung: /rename "AlterName" "NeuerName"', system: true }));
                return true;
            }
            if (profiles) {
                if (typeof profiles.has === 'function' && profiles.has(targetName)) {
                    const p = profiles.get(targetName);
                    p.username = newName;
                    profiles.set(newName, p);
                    profiles.delete(targetName);
                } else if (profiles[targetName]) {
                    profiles[newName] = profiles[targetName];
                    delete profiles[targetName];
                }
            }
            wss.clients.forEach(c => {
                if (c.playerName && c.playerName.toLowerCase() === targetName.toLowerCase()) {
                    c.playerName = newName;
                    c.send(JSON.stringify({ type: 'chat', text: `✏️ Dein Name wurde vom Admin zu "${newName}" geändert.`, system: true }));
                }
            });
            ws.send(JSON.stringify({ type: 'chat', text: `✏️ "${targetName}" heißt nun "${newName}".`, system: true }));
            break;

        // --- WARTUNGSMODUS ---
        case 'wartung':
        case 'maintenance':
            global.maintenanceMode = !global.maintenanceMode;
            const status = global.maintenanceMode ? 'AKTIVIERT 🔴' : 'DEAKTIVIERT 🟢';
            wss.clients.forEach(c => c.send(JSON.stringify({ type: 'chat', text: `⚠️ WARTUNGSMODUS: ${status}`, system: true })));
            break;

        // --- LOCK / UNLOCK GAME ---
        case 'lock':
            global.gameLocked = true;
            wss.clients.forEach(c => c.send(JSON.stringify({ type: 'chat', text: `🔒 Das Spielfeld wurde vom Admin eingefroren.`, system: true })));
            break;
        case 'unlock':
            global.gameLocked = false;
            wss.clients.forEach(c => c.send(JSON.stringify({ type: 'chat', text: `🔓 Das Spielfeld wurde wieder freigegeben.`, system: true })));
            break;

        // --- FREEZE CHAT ---
        case 'freeze':
            global.chatFrozen = !global.chatFrozen;
            const fStatus = global.chatFrozen ? 'EINGEFROREN ❄️' : 'AUFGETAUT 🔥';
            wss.clients.forEach(c => c.send(JSON.stringify({ type: 'chat', text: `❄️ Der Chat ist nun ${fStatus}`, system: true })));
            break;

        // --- SLOWMODE ---
        case 'slowmode':
            const sm = parseInt(targetName) || 0;
            global.slowMode = sm;
            wss.clients.forEach(c => c.send(JSON.stringify({ type: 'chat', text: `⏳ Slowmode auf ${sm} Sekunden gesetzt.`, system: true })));
            break;

        // --- DURCHSAGE / ANNOUNCE / BROADCAST ---
        case 'a':
        case 'announce':
        case 'broadcast':
        case 'bc':
            const msg = cleanTokens.slice(1).join(' ');
            if (!msg) {
                ws.send(JSON.stringify({ type: 'chat', text: '⚠️ Nutzung: /announce <Text>', system: true }));
                return true;
            }
            wss.clients.forEach(c => c.send(JSON.stringify({ type: 'chat', text: `📣 ADMIN DURCHSAGE: ${msg.toUpperCase()}`, system: true })));
            break;

        // --- WALL ---
        case 'wall':
            const wMsg = cleanTokens.slice(1).join(' ');
            wss.clients.forEach(c => {
                c.send(JSON.stringify({ type: 'chat', text: `==============================`, system: true }));
                c.send(JSON.stringify({ type: 'chat', text: `📢 ${wMsg}`, system: true }));
                c.send(JSON.stringify({ type: 'chat', text: `==============================`, system: true }));
            });
            break;

        // --- SAY ---
        case 'say':
            const sMsg = cleanTokens.slice(1).join(' ');
            wss.clients.forEach(c => c.send(JSON.stringify({ type: 'chat', text: `🔴 ${sMsg}`, system: true })));
            break;

        // --- ADMINMSG ---
        case 'adminmsg':
            if (!targetName) {
                ws.send(JSON.stringify({ type: 'chat', text: '⚠️ Nutzung: /adminmsg "Name" <Nachricht>', system: true }));
                return true;
            }
            wss.clients.forEach(c => {
                if (c.playerName && c.playerName.toLowerCase() === targetName.toLowerCase()) {
                    c.send(JSON.stringify({ type: 'chat', text: `🕵️‍♂️ **Flüstern vom Admin:** ${resolvedArgs.rest}`, system: true }));
                }
            });
            ws.send(JSON.stringify({ type: 'chat', text: `🕵️‍♂️ Flüstern an ${targetName} gesendet.`, system: true }));
            break;

        // --- ALERT ---
        case 'alert':
            if (!targetName) {
                ws.send(JSON.stringify({ type: 'chat', text: '⚠️ Nutzung: /alert "Name" <Nachricht>', system: true }));
                return true;
            }
            wss.clients.forEach(c => {
                if (c.playerName && c.playerName.toLowerCase() === targetName.toLowerCase()) {
                    // Send specific alert type if client supports it, otherwise chat
                    c.send(JSON.stringify({ type: 'chat', text: `🚨 **WICHTIGE WARNUNG:** ${resolvedArgs.rest}`, system: true }));
                }
            });
            ws.send(JSON.stringify({ type: 'chat', text: `🚨 Alert an ${targetName} gesendet.`, system: true }));
            break;

        // --- RADAR / PLAYERS / INFO / WHOIS ---
        case 'i':
        case 'info':
        case 'whois':
            if (!targetName) {
                ws.send(JSON.stringify({ type: 'chat', text: '⚠️ Nutzung: /whois "Name"', system: true }));
                return true;
            }
            let foundInfo = false;
            let pInfo = null;
            if (profiles) {
                pInfo = typeof profiles.get === 'function' ? profiles.get(targetName) : profiles[targetName];
            }
            
            wss.clients.forEach(c => {
                if (c.playerName && c.playerName.toLowerCase() === targetName.toLowerCase()) {
                    ws.send(JSON.stringify({ 
                        type: 'chat', 
                        text: `ℹ️ **WHOIS ${c.playerName}:**\n• IP: ${c.clientIP || 'Unbekannt'}\n• E-Mail: ${c.userEmail || 'Keine'}\n• Level: ${pInfo?.level||1} | ELO: ${pInfo?.elo||1200}\n• Siege/Niederlagen: ${pInfo?.wins||0}/${pInfo?.losses||0}`, 
                        system: true 
                    }));
                    foundInfo = true;
                }
            });
            if (!foundInfo) ws.send(JSON.stringify({ type: 'chat', text: `❓ Spieler "${targetName}" ist aktuell nicht online.`, system: true }));
            break;

        case 'radar':
        case 'players':
        case 'l':
        case 'list':
        case 'online':
            const online = Array.from(wss.clients).map(c => `${c.playerName || 'Gast'} [${c.clientIP || 'IP?'}]`).join('\n• ');
            ws.send(JSON.stringify({ type: 'chat', text: `👥 **Radar (${wss.clients.size} Online):**\n• ${online || 'Niemand'}`, system: true }));
            break;

        case 'mypi':
        case 'mipy':
        case 'mypu':
        case 'myip':
            ws.send(JSON.stringify({ type: 'chat', text: `🌐 Deine aktuelle IP: ${ws.clientIP || 'Unbekannt'}`, system: true }));
            break;

        // --- PINGALL ---
        case 'pingall':
            ws.send(JSON.stringify({ type: 'chat', text: `📡 Pinge alle Clients... (Latenzmessung simuliert)`, system: true }));
            break;

        // --- MUTE / UNMUTE ---
        case 'm':
        case 'mute':
            if (!targetName) {
                ws.send(JSON.stringify({ type: 'chat', text: '⚠️ Nutzung: /mute "Name"', system: true }));
                return true;
            }
            wss.clients.forEach(c => {
                if (c.playerName && c.playerName.toLowerCase() === targetName.toLowerCase()) {
                    c.isMuted = true;
                    ws.send(JSON.stringify({ type: 'chat', text: `🎙️ ${c.playerName} wurde STUMMGESCHALTET 🤫`, system: true }));
                    c.send(JSON.stringify({ type: 'chat', text: `🎙️ Du bist für den Chat stummgeschaltet.`, system: true }));
                }
            });
            break;
            
        case 'unmute':
            if (!targetName) {
                ws.send(JSON.stringify({ type: 'chat', text: '⚠️ Nutzung: /unmute "Name"', system: true }));
                return true;
            }
            wss.clients.forEach(c => {
                if (c.playerName && c.playerName.toLowerCase() === targetName.toLowerCase()) {
                    c.isMuted = false;
                    ws.send(JSON.stringify({ type: 'chat', text: `🎙️ ${c.playerName} darf wieder chatten 🗣️`, system: true }));
                    c.send(JSON.stringify({ type: 'chat', text: `🎙️ Du darfst wieder schreiben.`, system: true }));
                }
            });
            break;

        // --- MUTE ALL / UNMUTE ALL ---
        case 'muteall':
            wss.clients.forEach(c => {
                if (!ADMINS.includes(c.playerName)) {
                    c.isMuted = true;
                    c.send(JSON.stringify({ type: 'chat', text: '🤫 Der Admin hat den Chat für alle stummgeschaltet.', system: true }));
                }
            });
            ws.send(JSON.stringify({ type: 'chat', text: '🤫 Alle Spieler wurden stummgeschaltet.', system: true }));
            break;

        case 'unmuteall':
            wss.clients.forEach(c => {
                c.isMuted = false;
                c.send(JSON.stringify({ type: 'chat', text: '🗣️ Der Admin hat den Chat wieder freigegeben.', system: true }));
            });
            ws.send(JSON.stringify({ type: 'chat', text: '🗣️ Alle Spieler dürfen wieder chatten.', system: true }));
            break;

        // --- CLEAR CHAT ---
        case 'clr':
        case 'clearchat':
        case 'clear':
            wss.clients.forEach(c => c.send(JSON.stringify({ type: 'clear_ui', system: true })));
            wss.clients.forEach(c => c.send(JSON.stringify({ type: 'chat', text: '🧹 Der Chat wurde vom Admin geleert.', system: true })));
            break;

        // --- KICK ALL TROLLS / KICK ALL ---
        case 'kickalltrolls':
            let ktCount = 0;
            wss.clients.forEach(c => {
                if (!c.playerName || c.playerName.toLowerCase().startsWith('gast') || c.playerName.toLowerCase().startsWith('player_')) {
                    c.send(JSON.stringify({ type: 'chat', text: '🚪 Trolle/Gäste werden entfernt...', system: true }));
                    c.close();
                    ktCount++;
                }
            });
            ws.send(JSON.stringify({ type: 'chat', text: `🚪 Kicked ${ktCount} Troll/Gast-Spieler.`, system: true }));
            break;

        case 'kickall':
            let countKA = 0;
            wss.clients.forEach(c => {
                if (!ADMINS.includes(c.playerName) && c !== ws) {
                    c.send(JSON.stringify({ type: 'chat', text: '🚪 Server wird geleert...', system: true }));
                    c.close();
                    countKA++;
                }
            });
            ws.send(JSON.stringify({ type: 'chat', text: `🚪 Kicked ${countKA} Spieler.`, system: true }));
            break;
            
        case 'kickip':
            if (!targetName) return true;
            let kIpCount = 0;
            wss.clients.forEach(c => {
                if (c.clientIP === targetName) {
                    c.close();
                    kIpCount++;
                }
            });
            ws.send(JSON.stringify({ type: 'chat', text: `🚪 Kicked ${kIpCount} Verbindungen der IP ${targetName}.`, system: true }));
            break;

        // --- STATS & LEADERBOARD ---
        case 'stats':
            ws.send(JSON.stringify({ 
                type: 'chat', 
                text: `📊 **Server-Stats:**\n• Online: ${wss ? wss.clients.size : 0}\n• Gebannte Spieler: ${bannedPlayers ? bannedPlayers.size : 0}\n• Slowmode: ${global.slowMode || 'Aus'}`, 
                system: true 
            }));
            break;

        case 'top':
        case 'leaderboard':
            let profList = [];
            if (profiles) {
                profList = typeof profiles.values === 'function' ? Array.from(profiles.values()) : Object.values(profiles);
            }
            const top5 = profList
                .sort((a, b) => (b.wins || 0) - (a.wins || 0))
                .slice(0, 5)
                .map((p, i) => `${i+1}. ${p.username || p.name} (${p.wins || 0}🏆 - ELO ${p.elo || 1200})`)
                .join('\n');
            ws.send(JSON.stringify({ type: 'chat', text: `🏆 **Bestenliste:**\n${top5 || 'Keine Daten'}`, system: true }));
            break;
            
        case 'cleardb':
            ws.send(JSON.stringify({ type: 'chat', text: `⚠️ Datenbank-Leerung muss manuell im Code oder per Supabase erfolgen!`, system: true }));
            break;
            
        case 'clearleaderboard':
            if (profiles) {
                if (typeof profiles.values === 'function') {
                    for (const p of profiles.values()) p.wins = 0;
                } else {
                    for (const key in profiles) profiles[key].wins = 0;
                }
            }
            ws.send(JSON.stringify({ type: 'chat', text: `🏆 Leaderboard wurde zurückgesetzt.`, system: true }));
            break;

        // --- SET WIN ---
        case 'setwin':
        case 'setwins':
        case 'win':
        case 'wins':
            const winAmount = parseInt(resolvedArgs.rest);
            if (!isNaN(winAmount) && targetName) {
                if (profiles) {
                    if (typeof profiles.has === 'function' && profiles.has(targetName)) {
                        profiles.get(targetName).wins = winAmount;
                    } else if (profiles[targetName]) {
                        profiles[targetName].wins = winAmount;
                    }
                }
                if (db) {
                    try { await db.collection("players").doc(targetName).update({ wins: winAmount }); } catch(e){}
                }
                if (global.firestoreDb) {
                    try {
                        let docId = targetName;
                        if (profiles && profiles[targetName] && profiles[targetName].uid) {
                             docId = profiles[targetName].uid;
                        } else if (typeof profiles.has === 'function' && profiles.has(targetName)) {
                             docId = profiles.get(targetName).uid || targetName;
                        }
                        await global.firestoreDb.collection('players').doc(docId).set({ wins: winAmount }, { merge: true });
                    } catch(e) {}
                }
                ws.send(JSON.stringify({ type: 'chat', text: `⭐ ${targetName} hat jetzt ${winAmount} Siege.`, system: true }));
            } else {
                ws.send(JSON.stringify({ type: 'chat', text: '⚠️ Nutzung: /setwins "Name" 100', system: true }));
            }
            break;

        // --- SET ROLE ---
        case 'setrole':
        case 'role':
            const role = resolvedArgs.rest.toLowerCase().trim();
            if (role && targetName) {
                if (profiles) {
                    if (typeof profiles.has === 'function' && profiles.has(targetName)) {
                        profiles.get(targetName).role = role;
                    } else if (profiles[targetName]) {
                        profiles[targetName].role = role;
                    }
                }
                if (db) {
                    try { await db.collection("players").doc(targetName).update({ role: role }); } catch(e){}
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
                    } catch(e) {}
                }
                ws.send(JSON.stringify({ type: 'chat', text: `⭐ ${targetName} hat nun die Rolle '${role}'.`, system: true }));
            } else {
                ws.send(JSON.stringify({ type: 'chat', text: '⚠️ Nutzung: /setrole "Name" admin', system: true }));
            }
            break;

        // --- SET ELO ---
        case 'setelo':
        case 'elo':
            const eloVal = parseInt(resolvedArgs.rest);
            if (!isNaN(eloVal) && targetName) {
                if (profiles) {
                    if (typeof profiles.has === 'function' && profiles.has(targetName)) {
                        profiles.get(targetName).elo = eloVal;
                    } else if (profiles[targetName]) {
                        profiles[targetName].elo = eloVal;
                    }
                }
                if (global.firestoreDb) {
                    try {
                        let docId = targetName;
                        if (profiles && profiles[targetName] && profiles[targetName].uid) {
                             docId = profiles[targetName].uid;
                        } else if (typeof profiles.has === 'function' && profiles.has(targetName)) {
                             docId = profiles.get(targetName).uid || targetName;
                        }
                        await global.firestoreDb.collection('players').doc(docId).set({ elo: eloVal }, { merge: true });
                    } catch(e) {}
                }
                ws.send(JSON.stringify({ type: 'chat', text: `🏅 ELO für "${targetName}" auf ${eloVal} gesetzt!`, system: true }));
            } else {
                ws.send(JSON.stringify({ type: 'chat', text: '⚠️ Nutzung: /setelo "Name" 1500', system: true }));
            }
            break;

        // --- SET LEVEL ---
        case 'setlvl':
        case 'setlevel':
        case 'level':
            const lvlVal = parseInt(resolvedArgs.rest);
            if (!isNaN(lvlVal) && targetName) {
                if (profiles) {
                    if (typeof profiles.has === 'function' && profiles.has(targetName)) {
                        profiles.get(targetName).level = lvlVal;
                    } else if (profiles[targetName]) {
                        profiles[targetName].level = lvlVal;
                    }
                }
                ws.send(JSON.stringify({ type: 'chat', text: `⭐ Level für "${targetName}" auf Level ${lvlVal} gesetzt!`, system: true }));
            } else {
                ws.send(JSON.stringify({ type: 'chat', text: '⚠️ Nutzung: /setlevel "Name" 10', system: true }));
            }
            break;

        // --- RESET PLAYER ---
        case 'reset':
        case 'resetplayer':
            if (targetName) {
                if (profiles) {
                    const defaultProfile = { elo: 1200, wins: 0, losses: 0, level: 1, xp: 0, role: 'user' };
                    if (typeof profiles.set === 'function') profiles.set(targetName, defaultProfile);
                    else profiles[targetName] = defaultProfile;
                }
                ws.send(JSON.stringify({ type: 'chat', text: `🔄 Profil von "${targetName}" wurde auf Standard zurückgesetzt!`, system: true }));
            } else {
                ws.send(JSON.stringify({ type: 'chat', text: '⚠️ Nutzung: /reset "Name"', system: true }));
            }
            break;

        // --- SERVER INFO / RAM / CPU ---
        case 'serverinfo':
        case 'sysinfo':
        case 'memory':
        case 'ram':
        case 'mem':
            const mem = process.memoryUsage();
            const heapMB = (mem.heapUsed / 1024 / 1024).toFixed(2);
            const rssMB = (mem.rss / 1024 / 1024).toFixed(2);
            ws.send(JSON.stringify({ 
                type: 'chat', 
                text: `🖥️ **MEMORY-STATUS:**\n• RAM Heap: ${heapMB} MB\n• RSS: ${rssMB} MB\n• Limit: ~512 MB`, 
                system: true 
            }));
            break;
            
        case 'uptime':
            const uptimeHrs = Math.floor(process.uptime() / 3600);
            const uptimeMin = Math.floor((process.uptime() % 3600) / 60);
            ws.send(JSON.stringify({ type: 'chat', text: `⏱️ **UPTIME:** ${uptimeHrs} Stunden, ${uptimeMin} Minuten`, system: true }));
            break;
            
        case 'testmail':
            ws.send(JSON.stringify({ type: 'chat', text: `📧 Testmail / Discord-Webhook Alarm ausgelöst!`, system: true }));
            break;
            
        case 'shutdown':
            const sec = parseInt(targetName) || 10;
            wss.clients.forEach(c => c.send(JSON.stringify({ type: 'chat', text: `🚨 **ACHTUNG: SERVER NEUSTART IN ${sec} SEKUNDEN!** 🚨`, system: true })));
            setTimeout(() => process.exit(0), sec * 1000);
            break;

        // --- HELP / BEFEHLE ---
        case 'h':
        case 'help':
        case 'befehle':
        case 'befhel':
        case '?':
            if (isAdminUser) {
                ws.send(JSON.stringify({ 
                    type: 'chat', 
                    text: `🛡️ **ADMIN BEFEHLE (VOLLZUGRIFF)** 🛡️
**1. Nutzer- & Account-Verwaltung:**
• \`/kick "Name" [Grund]\` - Entfernt Spieler sofort
• \`/ban "Name"\` - Permanent-Ban (IP & Account)
• \`/offban "Name"\` - Bannt Offline-Spieler
• \`/tempban "Name" [Min.]\` - Temporärer Ban
• \`/pardon "Name/IP"\` - Entbannt Spieler/IP
• \`/rename "Alt" "Neu"\` - Benennt Nutzer um
• \`/setwins "Name" [Anzahl]\` - Siege überschreiben
• \`/whois "Name"\` - Zeigt IP, Level, ELO & Rolle

**2. Moderation & Chat-Kontrolle:**
• \`/warn "Name"\` - Verwarnt Spieler
• \`/warnip "IP"\` - Verwarnt IP
• \`/mute "Name"\` - Muted Spieler
• \`/unmute "Name"\` - Ent-muted Spieler
• \`/freeze\` - Chat einfrieren
• \`/slowmode [Sek.]\` - Chat-Verzögerung
• \`/adminmsg "Name" [Text]\` - Flüstern
• \`/alert "Name" [Text]\` - Pop-Up Warnung
• \`/say [Text]\` - Rote System-Warnung
• \`/announce [Text]\` - Hervorgehobene Durchsage
• \`/wall [Text]\` - Große Textwand
• \`/clearchat\` - Löscht den Chatverlauf

**3. Sicherheits- & Anti-Cheat-Tools:**
• \`/lock\` / \`/unlock\` - Spielfeld global sperren
• \`/kickalltrolls\` - Kickt alle Gäste
• \`/kickip "IP"\` - Kickt Verbindungen einer IP
• \`/banip "IP"\` - Bannt IP-Adresse
• \`/banlist\` / \`/mutelist\` - Zeigt Listen

**4. Server-Diagnose & Netzwerk:**
• \`/radar\` / \`/players\` - Liste aller Online-Nutzer
• \`/myip\` - Zeigt eigene IP
• \`/pingall\` - Latenz-Netzwerkmessung
• \`/memory\` / \`/uptime\` - RAM & Laufzeit
• \`/stats\` / \`/testmail\` - Status & Webhook-Test

**5. System-Steuerung:**
• \`/save\` / \`/load\` - Backup & Neuladen
• \`/reset "Name"\` - Spielerprofil löschen
• \`/cleardb\` / \`/clearleaderboard\`
• \`/disconnect "Name"\` - Trennt Verbindung
• \`/shutdown [Sek.]\` - Server-Neustart`, 
                    system: true 
                }));
            } else if (isHelperUser) {
                ws.send(JSON.stringify({ 
                    type: 'chat', 
                    text: `🛡️ **MODERATOR BEFEHLE:**
• \`?kick "Name"\` - Kickt einen störenden Spieler
• \`?warn "Name" [Grund]\` - Verwarnt einen Spieler
• \`?mute "Name"\` - Schaltet einen Spieler stumm
• \`?unmute "Name"\` - Hebt Stummschaltung auf
• \`/info "Name"\` - Zeigt Status und Raum
• \`/list\` - Zeigt alle angemeldeten Spieler`, 
                    system: true 
                }));
            } else {
                ws.send(JSON.stringify({ 
                    type: 'chat', 
                    text: `💬 **SCHACH BEFEHLE:**
• \`!watch "Name"\` - Schaut einer aktiven Partie zu
• \`!unwatch\` - Verlässt den Zuschauermodus
• \`!help\` - Zeigt diese Liste an`, 
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
