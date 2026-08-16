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

    const PUBLIC_COMMANDS = [
        'watch', 'spectate', 'unwatch', 'leave', 'help', 'befehle', 'befhel', '?', 
        'myip', 'mypi', 'mipy', 'mypu', 'stats', 'profile', 'rank', 'top', 
        'draw', 'remis', 'resign', 'aufgeben', 'undo', 'zurueck', 
        'ticket', 'support', 'agb', 'rules', 'datenschutz', 'impressum', 
        'emotes', 'theme', 'glass', 'keybinds', 'lobby', 'ping'
    ];
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
                
                let report = `[CARD]\n[HEADER]🤖 DIAGNOSE-BERICHT (${diagResults.timestamp})[/HEADER]\n` +
                             `✅ Bestanden: ${diagResults.passed} | ❌ Fehlgeschlagen: ${diagResults.failed}\n[FLEX]\n`;
                diagResults.tests.forEach(t => {
                    report += `• **${t.name}**: ${t.status} (${t.details})\n`;
                });
                report += `[/FLEX]\n[/CARD]`;
                ws.send(JSON.stringify({ type: 'chat', text: report, system: true }));
            } catch(err) {
                ws.send(JSON.stringify({ type: 'chat', text: `⚠️ Fehler beim Ausführen des Testbots: ${err.message}`, system: true }));
            }
            break;

        // --- PARDON / UNBAN / CLEARBANS ---
        case 'pardon':
        case 'unban':
        case 'unbanip':
        case 'entbann':
        case 'entbannen':
        case 'unbanall':
        case 'clearbans':
        case 'p':
            if (cmd === 'clearbans' || cmd === 'unbanall' || targetName.toLowerCase() === 'all' || targetName === '*') {
                if (bannedIPs) bannedIPs.clear();
                if (bannedPlayers) bannedPlayers.clear();
                if (typeof unbanPlayer === 'function') {
                    await unbanPlayer('all');
                }
                ws.send(JSON.stringify({ 
                    type: 'chat', 
                    text: `🔓 SUCCESS: ALLE Bans (Spieler & IPs) wurden vollständig aus Firestore & Server gelöscht!`, 
                    system: true 
                }));
                wss.clients.forEach(c => {
                    if (c.readyState === 1) {
                        c.send(JSON.stringify({ type: 'chat', text: `🕊️ ADMIN: Alle Spielersperren und IP-Bans wurden aufgehoben!`, system: true }));
                    }
                });
                return true;
            }

            if (!targetName) {
                ws.send(JSON.stringify({ type: 'chat', text: '⚠️ Nutzung: /pardon "Name/IP" oder /unbanall', system: true }));
                return true;
            }
            
            if (bannedIPs) {
                bannedIPs.delete(targetName);
                bannedIPs.delete(targetName.toLowerCase());
            }
            if (bannedPlayers) {
                bannedPlayers.delete(targetName.toLowerCase());
                bannedPlayers.delete(targetName);
            }

            if (typeof unbanPlayer === 'function') {
                await unbanPlayer(targetName);
            }

            if (db) {
                try {
                    await db.collection("players").doc(targetName).set({ is_banned: false, ip_ban: false, ban_reason: null }, { merge: true });
                } catch(e) {}
            }

            ws.send(JSON.stringify({ 
                type: 'chat', 
                text: `🔓 SUCCESS: Spieler/IP "${targetName}" wurde erfolgreich begnadigt und der Ban gelöscht!`, 
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
        case 'offbann':
            if (!targetName) {
                ws.send(JSON.stringify({ type: 'chat', text: '⚠️ Nutzung: /offban "Name" [Grund]', system: true }));
                return true;
            }
            const offReason = resolvedArgs.rest || 'Offline Ban';
            if (bannedPlayers) bannedPlayers.add(targetName.toLowerCase());
            
            if (typeof banPlayer === 'function') {
                await banPlayer(targetName, offReason, ws);
            } else {
                if (profiles && profiles[targetName]) {
                    profiles[targetName].is_banned = true;
                    profiles[targetName].ban_reason = offReason;
                }
            }
            
            if (db) {
                try {
                    await db.collection("players").doc(targetName).set({ is_banned: true, ip_ban: true, ban_reason: offReason }, { merge: true });
                } catch(e) {}
            }

            ws.send(JSON.stringify({ 
                type: 'chat', 
                text: `🔨 SUCCESS: Spieler "${targetName}" wurde offline gebannt! (Grund: ${offReason})`, 
                system: true 
            }));
            break;

        // --- TEMPBAN ---
        case 'tempban':
        case 'tempbann':
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
                if (typeof global.logAdminConflict === 'function') {
                    global.logAdminConflict(ws, targetName, `Tempban-Versuch (${tbMin} Min)`);
                }
                wss.clients.forEach(c => {
                    if (c.playerName && c.playerName.toLowerCase() === lowerTBanTarget) {
                        c.send(JSON.stringify({ type: 'chat', text: `⚠️ Achtung: ${ws.playerName || 'Ein Admin/System'} hat versucht, dich temporär zu bannen (Schutz aktiv - Tempban abgewendet)`, system: true }));
                    }
                });
                ws.send(JSON.stringify({ type: 'chat', text: `🛡️ "${targetName}" ist ein Admin und kann nicht gebannt werden!`, system: true }));
                return true;
            }

            if (bannedPlayers) bannedPlayers.add(targetName.toLowerCase());
            
            wss.clients.forEach(c => {
                if (c.playerName && (c.playerName.toLowerCase() === targetName.toLowerCase() || c.clientIP === targetName)) {
                    c.send(JSON.stringify({ type: 'login_error', text: `Du wurdest für ${tbMin} Minuten temporär gebannt!` }));
                    c.send(JSON.stringify({ type: 'chat', text: `⏳ Du wurdest für ${tbMin} Minuten temporär gebannt!`, system: true }));
                    setTimeout(() => { c.close(); }, 300);
                }
            });
            ws.send(JSON.stringify({ type: 'chat', text: `⏳ Spieler "${targetName}" wurde für ${tbMin} Minuten gebannt!`, system: true }));
            
            // Auto unban later
            setTimeout(async () => {
                if (typeof unbanPlayer === 'function') {
                    await unbanPlayer(targetName);
                } else if (bannedPlayers) {
                    bannedPlayers.delete(targetName.toLowerCase());
                }
            }, tbMin * 60000);
            break;

        // --- KICK ---
        case 'k':
        case 'kick':
        case 'kicken':
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
                    if (ADMINS.some(a => a.toLowerCase() === (c.playerName || "").toLowerCase()) || (c.playerName || "").toLowerCase() === 'max' || c.userEmail === 'max.schule13@gmail.com' || (profiles && profiles[c.playerName] && profiles[c.playerName].role === 'admin')) {
                        kickTargetIsAdmin = true;
                    }
                }
            });

            if (kickTargetIsAdmin) {
                if (typeof global.logAdminConflict === 'function') {
                    global.logAdminConflict(ws, targetName, `Kick-Versuch (${kReason})`);
                }
                wss.clients.forEach(c => {
                    if (c.playerName && c.playerName.toLowerCase() === lowerKTarget) {
                        c.send(JSON.stringify({ type: 'chat', text: `⚠️ Achtung: ${ws.playerName || 'Ein Admin/System'} hat versucht, dich zu kicken (Schutz aktiv - Kick abgewendet)`, system: true }));
                    }
                });
                ws.send(JSON.stringify({ type: 'chat', text: `🛡️ "${targetName}" ist ein Admin und kann nicht gekickt werden!`, system: true }));
                return true;
            }

            wss.clients.forEach(c => { 
                const nameMatch = c.playerName && c.playerName.toLowerCase() === lowerKTarget;
                const ipMatch = c.clientIP && c.clientIP === targetName;
                if (nameMatch || ipMatch) { 
                    c.send(JSON.stringify({ type: 'system_alert', message: `🚪 Du wurdest vom Server gekickt!\nGrund: ${kReason}` }));
                    c.send(JSON.stringify({ type: 'chat', text: `🚪 Du wurdest gekickt! Grund: ${kReason}`, system: true })); 
                    setTimeout(() => { c.close(); }, 200);
                    kickedCount++;
                }
            });
            if (kickedCount > 0) {
                ws.send(JSON.stringify({ type: 'chat', text: `🚪 ${kickedCount} Verbindung(en) von "${targetName}" erfolgreich gekickt. (Grund: ${kReason})`, system: true }));
            } else {
                ws.send(JSON.stringify({ type: 'chat', text: `⚠️ Kein aktiver Spieler mit dem Namen/IP "${targetName}" online gefunden.`, system: true }));
            }
            break;

        // --- DISCONNECT ---
        case 'disconnect':
            if (!targetName) {
                ws.send(JSON.stringify({ type: 'chat', text: '⚠️ Nutzung: /disconnect "Name"', system: true }));
                return true;
            }
            let dcCount = 0;
            wss.clients.forEach(c => { 
                if (c.playerName && c.playerName.toLowerCase() === targetName.toLowerCase()) { 
                    c.close(); 
                    dcCount++;
                }
            });
            ws.send(JSON.stringify({ type: 'chat', text: `🔌 ${dcCount} Verbindung(en) von "${targetName}" getrennt.`, system: true }));
            break;

        // --- BAN / BANIP / SUPERBAN ---
        case 'b':
        case 'ban':
        case 'bann':
        case 'banip':
        case 'sperren':
        case 'superban':
            if (!targetName) {
                ws.send(JSON.stringify({ type: 'chat', text: '⚠️ Nutzung: /ban "Name/IP" [Grund]', system: true }));
                return true;
            }
            const reason = resolvedArgs.rest || 'Admin-Entscheidung';
            
            if (typeof banPlayer === 'function') {
                await banPlayer(targetName, reason, ws);
            } else {
                if (bannedPlayers) bannedPlayers.add(targetName.toLowerCase());
                if (bannedIPs && targetName.includes('.')) bannedIPs.add(targetName);
            }
            
            ws.send(JSON.stringify({ type: 'chat', text: `🔨 Vorgang für "${targetName}" abgeschlossen! (Grund: ${reason})`, system: true }));
            break;

        // --- BANLIST ---
        case 'banlist':
        case 'bans':
        case 'banned':
        case 'banliste':
        case 'sperrliste':
        case 'bannedlist':
        case 'banlog':
        case 'bannedplayers':
        case 'bannedips':
            try {
                const playerBansMap = new Map();
                const ipBansMap = new Map();

                // 1. In-Memory Set Bans
                if (bannedPlayers) {
                    bannedPlayers.forEach(p => {
                        if (p && p.toLowerCase() !== 'undefined' && p.toLowerCase() !== 'null') {
                            playerBansMap.set(p.toLowerCase(), {
                                name: p,
                                reason: 'Admin-Sperre',
                                type: 'Permanent',
                                source: 'RAM'
                            });
                        }
                    });
                }

                if (bannedIPs) {
                    bannedIPs.forEach(ip => {
                        if (ip && ip !== '0.0.0.0' && ip !== '127.0.0.1' && ip !== '::1') {
                            ipBansMap.set(ip, {
                                ip: ip,
                                reason: 'IP-Sperre',
                                source: 'RAM'
                            });
                        }
                    });
                }

                // 2. Scan UserDB / Profiles
                if (profiles) {
                    const profileEntries = typeof profiles.entries === 'function' ? Array.from(profiles.entries()) : Object.entries(profiles);
                    for (const [key, val] of profileEntries) {
                        if (val && (val.is_banned || val.ip_ban)) {
                            const uName = val.username || key;
                            playerBansMap.set(uName.toLowerCase(), {
                                name: uName,
                                reason: val.ban_reason || 'Admin-Sperre',
                                type: val.ip_ban ? 'Account & IP' : 'Account',
                                source: 'UserDB'
                            });
                            if (val.ip_address && val.ip_address !== '0.0.0.0' && val.ip_address !== '127.0.0.1' && val.ip_address !== '::1') {
                                ipBansMap.set(val.ip_address, {
                                    ip: val.ip_address,
                                    reason: val.ban_reason || `IP von ${uName}`,
                                    source: 'UserDB'
                                });
                            }
                        }
                    }
                }

                // 3. Scan Firestore 'bans' Collection
                if (db) {
                    try {
                        const bansSnap = await db.collection('bans').get();
                        if (bansSnap && !bansSnap.empty) {
                            bansSnap.forEach(docSnap => {
                                const bData = docSnap.data();
                                const docId = docSnap.id;
                                if (!bData) return;
                                
                                const target = bData.target || docId.replace(/^(username_|ip_|ban_)/i, '');
                                if (!target || target === '0.0.0.0' || target === 'system_ban_security') return;

                                const reason = bData.reason || 'Firestore Sperre';
                                const dateStr = bData.createdAt ? new Date(bData.createdAt).toLocaleDateString('de-DE') : '';

                                if (bData.type === 'ip' || target.includes('.') || target.includes(':')) {
                                    ipBansMap.set(target, {
                                        ip: target,
                                        reason: reason,
                                        date: dateStr,
                                        source: 'Firestore'
                                    });
                                } else {
                                    playerBansMap.set(target.toLowerCase(), {
                                        name: target,
                                        reason: reason,
                                        type: bData.type || 'Permanent',
                                        date: dateStr,
                                        source: 'Firestore'
                                    });
                                }
                            });
                        }
                    } catch (fsErr) {
                        console.warn("Notice: Firestore bans fetch in /banlist:", fsErr.message);
                    }
                }

                const totalBansCount = playerBansMap.size + ipBansMap.size;

                if (totalBansCount === 0) {
                    ws.send(JSON.stringify({ 
                        type: 'chat', 
                        text: `[CARD]\n[HEADER]📜 BAN-LISTE (0 Aktive Sperren)[/HEADER]\n✅ **Aktuell sind keine Spieler oder IP-Adressen gesperrt.**\nAlle Accounts und Netzwerke haben freien Zugriff.\n[/CARD]`, 
                        system: true 
                    }));
                    return true;
                }

                let banListReport = `[CARD]\n[HEADER]📜 BAN-LISTE (${totalBansCount} Aktive Sperren)[/HEADER]\n[FLEX]\n`;

                if (playerBansMap.size > 0) {
                    banListReport += `👥 **Gesperrte Spieler-Accounts (${playerBansMap.size}):**\n`;
                    let pIdx = 1;
                    playerBansMap.forEach((info) => {
                        const dateInfo = info.date ? ` [${info.date}]` : '';
                        banListReport += `${pIdx}. \`${info.name}\` — Grund: *${info.reason}* (${info.type}${dateInfo})\n`;
                        pIdx++;
                    });
                } else {
                    banListReport += `👥 **Gesperrte Spieler-Accounts:** Keine\n`;
                }

                banListReport += `\n`;

                if (ipBansMap.size > 0) {
                    banListReport += `🌐 **Gesperrte IP-Adressen (${ipBansMap.size}):**\n`;
                    let ipIdx = 1;
                    ipBansMap.forEach((info) => {
                        const dateInfo = info.date ? ` [${info.date}]` : '';
                        banListReport += `${ipIdx}. \`${info.ip}\` — Grund: *${info.reason}*${dateInfo}\n`;
                        ipIdx++;
                    });
                } else {
                    banListReport += `🌐 **Gesperrte IP-Adressen:** Keine\n`;
                }

                banListReport += `\n💡 *Befehl zum Entbannen: \`/pardon "Name/IP"\` oder \`/clearbans\`*\n[/FLEX]\n[/CARD]`;

                ws.send(JSON.stringify({ 
                    type: 'chat', 
                    text: banListReport, 
                    system: true 
                }));
            } catch (blErr) {
                console.error("Fehler bei /banlist:", blErr);
                ws.send(JSON.stringify({ 
                    type: 'chat', 
                    text: `⚠️ Fehler beim Laden der Ban-Liste: ${blErr.message}`, 
                    system: true 
                }));
            }
            break;
            
        // --- MUTELIST ---
        case 'mutelist':
            const muted = [];
            wss.clients.forEach(c => {
                if (c.isMuted) muted.push(c.playerName || 'Unbekannt');
            });
            ws.send(JSON.stringify({ type: 'chat', text: `[CARD]\n[HEADER]🤫 MUTE-LISTE[/HEADER]\n${muted.length > 0 ? muted.map(m => `• \`${m}\``).join('\n') : '✅ **Aktuell ist niemand stummgeschaltet.**'}\n[/CARD]`, system: true }));
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
                        text: `[CARD]\n[HEADER]ℹ️ WHOIS: ${c.playerName}[/HEADER]\n[FLEX]\n• **IP:** ${c.clientIP || 'Unbekannt'}\n• **E-Mail:** ${c.userEmail || 'Keine'}\n• **Level:** ${pInfo?.level||1} | **ELO:** ${pInfo?.elo||1200}\n• **Siege/Niederlagen:** ${pInfo?.wins||0}/${pInfo?.losses||0}\n[/FLEX]\n[/CARD]`, 
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
            const online = Array.from(wss.clients).map(c => `• ${c.playerName || 'Gast'} \`[${c.clientIP || 'IP?'}]\``).join('\n');
            ws.send(JSON.stringify({ type: 'chat', text: `[CARD]\n[HEADER]👥 RADAR (${wss.clients.size} Online)[/HEADER]\n[FLEX]\n${online || 'Niemand'}\n[/FLEX]\n[/CARD]`, system: true }));
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
                text: `[CARD]\n[HEADER]📊 Server-Stats[/HEADER]\n[FLEX]\n• Online: ${wss ? wss.clients.size : 0}\n• Gebannte Spieler: ${bannedPlayers ? bannedPlayers.size : 0}\n• Slowmode: ${global.slowMode || 'Aus'}\n[/FLEX]\n[/CARD]`, 
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
                .map((p, i) => `• **${i+1}.** ${p.username || p.name} (${p.wins || 0}🏆 - ELO ${p.elo || 1200})`)
                .join('\n');
            ws.send(JSON.stringify({ type: 'chat', text: `[CARD]\n[HEADER]🏆 Bestenliste[/HEADER]\n[FLEX]\n${top5 || 'Keine Daten'}\n[/FLEX]\n[/CARD]`, system: true }));
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
            // Check if user requested help for a specific command (e.g. /help ban)
            const helpTarget = (targetName || '').toLowerCase().replace(/^[\/!\?]/, '');

            if (helpTarget && isAdminUser) {
                const COMMAND_DOCS = {
                    'ban': `[CARD]\n[HEADER]🔨 BEFEHLS-HILFE: /ban[/HEADER]\n• **Syntax:** \`/ban "Name/IP" [Grund]\`\n• **Wirkung:** Vollständiger Permanent-Bann. Sperrt den Account in Firestore/RAM, sperrt die IP-Adresse und trennt alle aktiven Sessions sofort mit rotem Overlay.\n• **Beispiel:** \`/ban "Cheater99" Anti-Cheat Verdacht\`\n• **Entbannen:** \`/pardon "Cheater99"\`\n[/CARD]`,
                    'offban': `[CARD]\n[HEADER]🔨 BEFEHLS-HILFE: /offban[/HEADER]\n• **Syntax:** \`/offban "Name" [Grund]\`\n• **Wirkung:** Sperrt einen Spieler, der aktuell offline ist, in der Datenbank & Firestore, sodass er sich nicht mehr einloggen kann.\n• **Beispiel:** \`/offban "OfflineTroll" Beleidigungen\`\n[/CARD]`,
                    'tempban': `[CARD]\n[HEADER]⏳ BEFEHLS-HILFE: /tempban[/HEADER]\n• **Syntax:** \`/tempban "Name" [Minuten]\`\n• **Wirkung:** Bannt den Spieler temporär für X Minuten. Nach Ablauf der Zeit wird der Ban automatisch wieder aufgehoben.\n• **Beispiel:** \`/tempban "Störenfried" 30\`\n[/CARD]`,
                    'kick': `[CARD]\n[HEADER]🚪 BEFEHLS-HILFE: /kick[/HEADER]\n• **Syntax:** \`/kick "Name/IP" [Grund]\`\n• **Wirkung:** Schließt sofort alle WebSocket-Verbindungen des Spielers oder der IP mit einer Benachrichtigung. Spieler kann danach neu verbinden.\n• **Beispiel:** \`/kick "Spammer" Chat-Spam\`\n[/CARD]`,
                    'pardon': `[CARD]\n[HEADER]🔓 BEFEHLS-HILFE: /pardon[/HEADER]\n• **Syntax:** \`/pardon "Name/IP"\` oder \`/clearbans\`\n• **Wirkung:** Hebt alle Sperren (RAM, UserDB, Firestore, .htaccess, Support-Tickets) für den angegebenen Spieler oder die IP vollständig auf.\n• **Beispiel:** \`/pardon "Spieler123"\`\n[/CARD]`,
                    'unban': `[CARD]\n[HEADER]🔓 BEFEHLS-HILFE: /unban[/HEADER]\n• **Syntax:** \`/unban "Name/IP"\` oder \`/unbanall\`\n• **Wirkung:** Gleiche Funktion wie \`/pardon\`. Entbannt den Spieler oder die IP komplett.\n• **Beispiel:** \`/unban "192.168.1.1"\`\n[/CARD]`,
                    'banlist': `[CARD]\n[HEADER]📜 BEFEHLS-HILFE: /banlist[/HEADER]\n• **Syntax:** \`/banlist\` (Aliase: \`/bans\`, \`/banned\`, \`/sperrliste\`)\n• **Wirkung:** Durchsucht RAM, lokale Datenbank und Firestore nach allen aktiven Bans und gibt eine saubere, formatierte Liste aus.\n[/CARD]`,
                    'whois': `[CARD]\n[HEADER]ℹ️ BEFEHLS-HILFE: /whois[/HEADER]\n• **Syntax:** \`/whois "Name"\`\n• **Wirkung:** Zeigt detaillierte Spieler-Auskunft: IP-Adresse, E-Mail, ELO-Rating, Level, Siege/Niederlagen und Berechtigungsrolle.\n[/CARD]`,
                    'setwins': `[CARD]\n[HEADER]⭐ BEFEHLS-HILFE: /setwins[/HEADER]\n• **Syntax:** \`/setwins "Name" [Anzahl]\`\n• **Wirkung:** Überschreibt die Siege eines Spielers im RAM, in der UserDB und in Firestore.\n• **Beispiel:** \`/setwins "Max" 100\`\n[/CARD]`,
                    'setelo': `[CARD]\n[HEADER]🏅 BEFEHLS-HILFE: /setelo[/HEADER]\n• **Syntax:** \`/setelo "Name" [Rating]\`\n• **Wirkung:** Setzt das ELO-Rating des Spielers (Standard: 1200).\n• **Beispiel:** \`/setelo "Max" 1850\`\n[/CARD]`,
                    'setrole': `[CARD]\n[HEADER]👑 BEFEHLS-HILFE: /setrole[/HEADER]\n• **Syntax:** \`/setrole "Name" [admin/user/moderator]\`\n• **Wirkung:** Weist dem Spieler eine Berechtigungsrolle zu.\n• **Beispiel:** \`/setrole "Max" admin\`\n[/CARD]`,
                    'mute': `[CARD]\n[HEADER]🤫 BEFEHLS-HILFE: /mute[/HEADER]\n• **Syntax:** \`/mute "Name"\`\n• **Wirkung:** Schaltet den Spieler im Chat stumm. Der Spieler kann bis zum Unmute keine Nachrichten mehr senden.\n• **Entmuten:** \`/unmute "Name"\`\n[/CARD]`,
                    'freeze': `[CARD]\n[HEADER]❄️ BEFEHLS-HILFE: /freeze[/HEADER]\n• **Syntax:** \`/freeze\`\n• **Wirkung:** Schaltet den Chat für alle normalen Spieler global ein oder aus (Freeze/Unfreeze).\n[/CARD]`,
                    'slowmode': `[CARD]\n[HEADER]⏳ BEFEHLS-HILFE: /slowmode[/HEADER]\n• **Syntax:** \`/slowmode [Sekunden]\`\n• **Wirkung:** Setzt eine Wartezeit zwischen Chatnachrichten (z.B. \`/slowmode 5\` für 5 Sek. Cooldown, \`/slowmode 0\` zum Deaktivieren).\n[/CARD]`,
                    'diag': `[CARD]\n[HEADER]🤖 BEFEHLS-HILFE: /diag[/HEADER]\n• **Syntax:** \`/diag\` oder \`/testbot\`\n• **Wirkung:** Führt eine vollständige automatisierte System-Diagnose durch (Schachlogik, Anti-Cheat, Rate-Limits, RAM, Firestore-Verbindung).\n[/CARD]`
                };

                if (COMMAND_DOCS[helpTarget]) {
                    ws.send(JSON.stringify({ type: 'chat', text: COMMAND_DOCS[helpTarget], system: true }));
                    return true;
                }
            }

            if (isAdminUser) {
                const adminHelpMenu = `[CARD]
[HEADER]🛡️ ADMIN COMMAND CENTER[/HEADER]
[FLEX]
⚡ **1. Account- & Bann-Verwaltung:**
• \`/ban "Name/IP" [Grund]\` — Permanent-Bann
• \`/offban "Name" [Grund]\` — Bannt Offline-Spieler
• \`/tempban "Name" [Min]\` — Temporärer Bann
• \`/kick "Name/IP" [Grund]\` — Kickt vom Server
• \`/pardon "Name/IP"\` — Hebt Bann auf
• \`/clearbans\` — Löscht alle Bans
• \`/banlist\` — Übersicht aktiver Sperren
• \`/rename "Alt" "Neu"\` — Name ändern
• \`/whois "Name"\` — Spieler-Auskunft

💬 **2. Moderation & Chat:**
• \`/warn "Name" [Grund]\` — Verwarnung
• \`/warnip "IP" [Grund]\` — Verwarnung an IP
• \`/mute "Name"\` — Stummschalten
• \`/unmute "Name"\` — Stummschaltung aufheben
• \`/muteall\` / \`/unmuteall\` — Globaler Mute
• \`/mutelist\` — Übersicht stummgeschalteter
• \`/freeze\` — Chat einfrieren / auftauen
• \`/slowmode [Sek.]\` — Chat-Cooldown
• \`/clearchat\` — Chatverlauf löschen
• \`/say [Text]\` — Systemdurchsage
• \`/announce [Text]\` — Rundnachricht
• \`/wall [Text]\` — Textwand-Durchsage
• \`/adminmsg "Name"\` — Flüstern
• \`/alert "Name" [Text]\` — Alarmfenster

👑 **3. Profil-Verwaltung:**
• \`/setwins "Name" [Anzahl]\` — Siege setzen
• \`/setelo "Name" [Rating]\` — ELO setzen
• \`/setlevel "Name" [Level]\` — Level verändern
• \`/setrole "Name" [Rolle]\` — Rolle zuweisen
• \`/reset "Name"\` — Profil zurücksetzen
• \`/clearleaderboard\` — Leaderboard löschen

🔒 **4. Server-Sicherheit:**
• \`/lock\` / \`/unlock\` — Schachbrett global sperren
• \`/kickalltrolls\` — Gast-Accounts kicken
• \`/kickall\` — Alle Spieler kicken
• \`/kickip "IP"\` — IP-Verbindungen schließen
• \`/disconnect "Name"\` — Leise trennen

🖥️ **5. Diagnose & System:**
• \`/diag\` / \`/testbot\` — Diagnosetest
• \`/radar\` / \`/players\` — Live-Nutzerliste
• \`/stats\` — Serverauslastung
• \`/memory\` / \`/ram\` — RAM & Speicher
• \`/uptime\` — Server Laufzeit
• \`/pingall\` — Latenzmessung
• \`/save\` — Hochsicherheits-Backup
• \`/shutdown [Sek.]\` — Neustart
[/FLEX]

💡 *Tipp: Klicke auf einen Befehl!*
[/CARD]`;

                ws.send(JSON.stringify({ 
                    type: 'chat', 
                    text: adminHelpMenu, 
                    system: true 
                }));
            } else if (isHelperUser) {
                ws.send(JSON.stringify({ 
                    type: 'chat', 
                    text: `🛡️ **MODERATOR COMMANDS:**\n══════════════════════════════════════\n• \`?kick "Name" [Grund]\` — Kickt störenden Spieler vom Server\n• \`?warn "Name" [Grund]\` — Verwarnt einen Spieler offiziell\n• \`?mute "Name"\` — Schaltet Spieler für den Chat stumm\n• \`?unmute "Name"\` — Hebt Stummschaltung wieder auf\n• \`/whois "Name"\` — Zeigt Status, Rolle & Raum des Spielers\n• \`/players\` — Zeigt alle online angemeldeten Spieler\n• \`/clearchat\` — Leert das Chatfenster`, 
                    system: true 
                }));
            } else {
                ws.send(JSON.stringify({ 
                    type: 'chat', 
                    text: `💬 **PROCHESS SPIELER-BEFEHLE:**\n══════════════════════════════════════\n🎮 **1. Partie & Zuschauen:**\n• \`!watch "Name"\` — Schaut einer aktiven Partie live zu\n• \`!unwatch\` — Verlässt den Zuschauermodus\n• \`!draw\` / \`!remis\` — Bietet dem Gegner Remis an\n• \`!resign\` / \`!aufgeben\` — Gibt die aktuelle Partie auf\n• \`!undo\` / \`!zurueck\` — Fordert Zug-Rücknahme an\n\n📊 **2. Profil & Statistiken:**\n• \`!stats\` / \`!profile\` — Zeigt dein persönliches Profil & ELO\n• \`!stats "Name"\` — Profil & Statistiken eines Mitspielers\n• \`!rank\` / \`!top\` — Zeigt die Bestenliste\n• \`!myip\` — Zeigt deine aktuelle Verbindungs-IP\n• \`!ping\` — Misst Latenz zum Server\n\n💬 **3. Lobbies & Support:**\n• \`!lobby "Name"\` — Erstellt/Betritt eine Chat-Lobby\n• \`!ticket\` — Support-Ticket & Entbannungsantrag\n• \`!emotes\` — Liste aller Chat-Emojis & Reaktionen\n\n🎨 **4. Design & Einstellungen:**\n• \`!theme\` — Menü für Farb- & Brettdesigns\n• \`!glass\` — Glassmorphismus-Effekt umschalten\n• \`!keybinds\` — Tastenkombinationen-Übersicht\n\n⚖️ **5. Rechtliches:**\n• \`!rules\` / \`!agb\` — Fairplay-Regeln\n• \`!impressum\` — Kontakt & Datenschutz (Support: schachlivesupport.jailer914@slmail.me)`, 
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

        case 'myip':
        case 'mypi':
            ws.send(JSON.stringify({ type: 'chat', text: `🌐 **Deine IP-Adresse:** ${ws.clientIP || '127.0.0.1'}`, system: true }));
            break;

        case 'ping':
            ws.send(JSON.stringify({ type: 'chat', text: `🏓 **Pong!** Server-Latenz: ~12ms`, system: true }));
            break;

        case 'ticket':
        case 'support':
            ws.send(JSON.stringify({ type: 'chat', text: `📩 **Support-Kontakt:** E-Mail: schachlivesupport.jailer914@slmail.me oder nutze das Support-Ticket Formular im Profil/Modal.`, system: true }));
            break;

        case 'agb':
        case 'rules':
            ws.send(JSON.stringify({ type: 'chat', text: `📜 **AGB & Regeln:** Auf der Plattform gilt striktes Fairplay. Keine Engines, Bots oder Beleidigungen. Details unter /AGB.html`, system: true }));
            break;

        case 'datenschutz':
        case 'impressum':
            ws.send(JSON.stringify({ type: 'chat', text: `⚖️ **Impressum & Datenschutz:** E-Mail: schachlivesupport.jailer914@slmail.me | Details unter /impressum.html & /datenschutz.html`, system: true }));
            break;

        case 'emotes':
            ws.send(JSON.stringify({ type: 'chat', text: `😄 **Verfügbare Emotes:** :) :( :D xD <3 👍 👎 ♟️ 👑 🔥 ⚡ 🎯 🏆`, system: true }));
            break;

        default:
            return false;
    }

    return true; 
}

module.exports = { handleAdminCommand, ADMINS, ADMIN_PASSWORDS, parseArgsWithQuotes };
