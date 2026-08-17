// antihack.js - ADVANCED REAL-TIME ANTI-CHEAT & SPOOFING DEFENSE ENGINE
const fs = require('fs');

async function logBanToFirebase(playerName, reason, ip) {
    try {
        const firestoreDb = global.firestoreDb || (typeof globalThis !== 'undefined' ? globalThis.firestoreDb : null);
        if (firestoreDb) {
            if (ip && ip !== "unknown" && ip !== "127.0.0.1" && ip !== "::1") {
                await firestoreDb.collection('banned_ips').doc(ip).set({
                    ip: ip,
                    reason: reason,
                    banned_at: new Date().toISOString()
                }, { merge: true });
                console.log(`🔥 Firebase: IP ${ip} als gebannt hinterlegt.`);
            }

            if (playerName && playerName !== "Unbekannter_Spieler") {
                await firestoreDb.collection('players').doc(playerName).set({
                    is_banned: true,
                    ip_ban: true,
                    ban_reason: reason,
                    banned_at: new Date().toISOString()
                }, { merge: true });
                console.log(`🔥 Firebase: Spieler-Account ${playerName} als gesperrt markiert.`);
            }
        }
    } catch (err) {
        console.error("❌ Fehler beim Schreiben des Bans in Firebase:", err.message);
    }
}

async function sendDiscordAlarm(playerName, reason, ip) {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) return;

    const payload = {
        embeds: [{
            title: "🚨 ANTI-HACK ALARM",
            color: 0xff0000,
            fields: [
                { name: "Spieler", value: playerName || "Unbekannt", inline: true },
                { name: "IP-Adresse", value: ip || "Unbekannt", inline: true },
                { name: "Grund", value: reason || "Unbekannt" }
            ],
            timestamp: new Date()
        }]
    };

    try {
        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch (e) {
        console.error("Discord-Alarm konnte nicht gesendet werden");
    }
}

/**
 * Validiert In-Game Zeitstempel gegen Server-Uhr (Zeitmanipulation / Clock Hacks)
 */
function validateTimeDelta(ws, clientTimestamp) {
    if (!clientTimestamp || typeof clientTimestamp !== 'number') return true;
    const now = Date.now();
    const drift = Math.abs(now - clientTimestamp);

    // Wenn der Client-Zeitstempel um mehr als 15 Sekunden in der Zukunft oder Vergangenheit liegt
    if (drift > 300000) { // 5 Minuten Toleranz statt 15 Sekunden
        console.warn(`⚠️ [TIME-HACK DETECTED] Client Clock Drift: ${drift}ms bei WS ${ws.playerName}`);
        return false;
    }
    return true;
}

/**
 * Prüft ob der Spieler am Zug ist (Turn-Spoofing & Unberechtigte Züge)
 */
function validateTurnAuthorization(ws, data, roomStates) {
    if (data.type !== 'move') return true;
    if (!ws.room || !roomStates || !roomStates.has(ws.room)) return true;

    const roomState = roomStates.get(ws.room);
    if (!roomState) return true;

    const playerColor = ws.color || (ws.playerName === roomState.whitePlayer ? 'white' : (ws.playerName === roomState.blackPlayer ? 'black' : null));
    
    if (playerColor && roomState.turn && playerColor !== roomState.turn) {
        console.warn(`⛔ [TURN SPOOFING] ${ws.playerName} (${playerColor}) wollte am Zug von ${roomState.turn} ziehen!`);
        return false;
    }

    return true;
}

function validateSecurity(data, ws, bannedIPs, triggerUltraBan, roomStates = null) {
    const now = Date.now();
    const ip = ws.clientIP || "unknown";
    const name = ws.playerName || "Unbekannter_Spieler";

    const executeBan = (reason) => {
        const ADMIN_LIST = ['max', '222', 'admin', 'max.schule13@gmail.com', 'owner', 'eigentümer'];
        const isNameAdmin = name && ADMIN_LIST.includes(String(name).toLowerCase().trim());
        const isEmailAdmin = ws.userEmail && ADMIN_LIST.includes(String(ws.userEmail).toLowerCase().trim());
        const isWsAdmin = ws.isAdmin || ws.is_owner || ws.role === 'admin';
        
        if (isNameAdmin || isEmailAdmin || isWsAdmin) {
            console.warn(`🛡️ ADMIN-CONFLICT INTERCEPTED in antihack.js: User '${name}' (${ip}) triggered '${reason}'.`);
            if (typeof global.logAdminConflict === 'function') {
                global.logAdminConflict(ws, name, reason);
            }
            if (ws.readyState === 1) {
                ws.send(JSON.stringify({
                    type: 'system_alert',
                    message: `🛡️ ADMIN-CONFLICT 🛡️\n\nAnti-Cheat Trigger (${reason}) für Administrator/Eigentümer '${name}' abgefangen.`
                }));
            }
            return true;
        }

        console.error(`⛔ ANTI-HACK TRIGGER: User: ${name} | IP: ${ip} | Grund: ${reason}`);

        logBanToFirebase(name, reason, ip).catch(() => {});

        if (ip && ip !== "unknown" && ip !== "127.0.0.1" && ip !== "::1") {
            try {
                if (typeof global.banIPPermanently === 'function') {
                    global.banIPPermanently(ip, reason);
                }
            } catch (err) {
                console.error("Konnte IP nicht bannen:", err);
            }
        }

        if (ws.readyState === 1) { 
            ws.send(JSON.stringify({ 
                type: 'system_alert', 
                message: `☠️ ANTI-CHEAT SYSTEM ☠️\n\nDu wurdest beim Hacken/Spoofing erwischt!\nGrund: ${reason}\n\nDein Account und deine IP wurden gesperrt!` 
            }));
        }

        sendDiscordAlarm(name, reason, ip).catch(() => {});
        return triggerUltraBan ? triggerUltraBan(reason) : false;
    };

    if (!data || typeof data !== 'object') return executeBan("Manipuliertes Datenpaket (Ungültiges Objekt)");

    // 1. Payload Limit
    const rawLength = JSON.stringify(data).length;
    if (rawLength > 5000) return executeBan("Payload-Attacke (Datenmenge zu groß)");

    // 2. Client-Identität-Check
    if (typeof data.type !== 'string') return executeBan("Protokoll-Manipulation (Typ-Fälschung)");

    // 3. Zeitmanipulations-Prüfung
    if (data.timestamp && !validateTimeDelta(ws, data.timestamp)) {
        return executeBan("Zeitmanipulation / Clock-Speed Hack");
    }

    // 4. Turn & Move Authorization Check
    if (!validateTurnAuthorization(ws, data, roomStates)) {
        return executeBan("Unberechtigter Zug außerhalb der eigenen Reihe (Turn Spoofing)");
    }

    // 5. SQL-Injection Check in Auth-Feldern (Spezifisch gegen echte Exploits, keine False-Positives bei normalen Begriffen)
    const sqlRegex = /\b(UNION\s+ALL\s+SELECT|UNION\s+SELECT|DROP\s+TABLE|DELETE\s+FROM|INSERT\s+INTO)\b|'\s*OR\s*['"0-9\=]|"\s*OR\s*['"0-9\=]|\bOR\s+['"0-9a-z_]+=['"0-9a-z_]+|--\s*$/i;
    const authFieldsToCheck = [data.playerName, data.name, data.password, data.room, data.roomID];

    for (const val of authFieldsToCheck) {
        if (typeof val === 'string' && sqlRegex.test(val)) {
            return executeBan(`SQL-Injection Versuch in Eingabefeld: "${val.substring(0, 20)}"`);
        }
    }

    // 6. Chat XSS Protection
    if (data.type === 'chat_message' || data.type === 'chat') {
        const msg = data.text || data.content || "";
        if (typeof msg === 'string') {
            if (/<script|<iframe|javascript:/i.test(msg)) {
                return executeBan("XSS-Versuch (Script-Injektion im Chat)");
            }
            if (/[\u200B-\u200D\uFEFF]/.test(msg)) {
                return executeBan("Zero-Width-Space Identity Attacke");
            }
        }
    }

    // 7. Spiel-Logik Schutz
    if (data.type === 'move') {
        if (ws.isSpectator) return executeBan("Spectator-Move-Hack");

        const { fr, fc, tr, tc } = data;
        if ([fr, fc, tr, tc].some(v => typeof v !== 'number' || v < 0 || v > 7)) {
            return executeBan("Illegale Board-Koordinaten (Out of Bounds)");
        }

        if (fr === tr && fc === tc) return executeBan("Null-Move-Manipulation");
    }

    // 8. Technical Hacks
    if (JSON.stringify(data).includes("__proto__") || JSON.stringify(data).includes("constructor")) {
        return executeBan("Prototype Pollution Attacke");
    }

    if (data.type === 'game_win') {
        const gameTime = (now - (ws.gameStartTimestamp || now)) / 1000;
        if (ws.gameStartTimestamp && gameTime < 2) return executeBan("Speed-Win-Hack (Sieg unter 2 Sek)");
    }

    if (data.system === true || data.sender === 'SYSTEM' || data.sender === 'System') {
        return executeBan("System-Rechte Fälschung (Admin-Spoofing)");
    }

    return true;
}

module.exports = { validateSecurity, validateTimeDelta, validateTurnAuthorization };
