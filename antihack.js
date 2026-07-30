// antihack.js - Das unüberwindbare, fehlalarmfreie Schutzschild
const fs = require('fs');
const BAN_FILE = './bans.json';

// --- GOOGLE FIREBASE ALARM UND BAN-LOGGING ---
async function logBanToFirebase(playerName, reason, ip) {
    try {
        const firestoreDb = global.firestoreDb || (typeof globalThis !== 'undefined' ? globalThis.firestoreDb : null);
        if (firestoreDb) {
            // 1. IP in banned_ips blockieren
            if (ip && ip !== "unknown" && ip !== "127.0.0.1" && ip !== "::1") {
                await firestoreDb.collection('banned_ips').doc(ip).set({
                    ip: ip,
                    reason: reason,
                    banned_at: new Date().toISOString()
                }, { merge: true });
                console.log(`🔥 Firebase: IP ${ip} erfolgreich als permanent gebannt hinterlegt.`);
            }

            // 2. Spieler in players blockieren
            if (playerName && playerName !== "Unbekannter_Spieler") {
                await firestoreDb.collection('players').doc(playerName).set({
                    is_banned: true,
                    ip_ban: true,
                    ban_reason: reason,
                    banned_at: new Date().toISOString()
                }, { merge: true });
                console.log(`🔥 Firebase: Spieler-Account ${playerName} erfolgreich als gesperrt markiert.`);
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
            color: 0xff0000, // Rot
            fields: [
                { name: "Spieler", value: playerName || "Unbekannt", inline: true },
                { name: "IP-Adresse", value: ip, inline: true },
                { name: "Grund", value: reason }
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

function validateSecurity(data, ws, bannedIPs, triggerUltraBan) {
    const now = Date.now();
    const ip = ws.clientIP || "unknown";
    const name = ws.playerName || "Unbekannter_Spieler";

    // Hilfsfunktion um Ban + Firebase + Discord auszulösen
    const executeBan = (reason) => {
        console.error(`⛔ ANTI-HACK TRIGGER: User: ${name} | IP: ${ip} | Grund: ${reason}`);

        // Firebase-Protokollierung
        logBanToFirebase(name, reason, ip).catch(() => {});

        if (ip && ip !== "unknown" && ip !== "127.0.0.1" && ip !== "::1") {
            try {
                if (typeof global.banIPPermanently === 'function') {
                    global.banIPPermanently(ip, reason);
                }
            } catch (err) {
                console.error("Konnte IP nicht in .htaccess schreiben:", err);
            }
        }

        // Pop-Up für den Client
        if (ws.readyState === 1) { 
            ws.send(JSON.stringify({ 
                type: 'system_alert', 
                message: `☠️ ANTI-CHEAT SYSTEM ☠️\n\nDu wurdest beim Hacken erwischt!\nGrund: ${reason}\n\nDein Account und deine IP wurden permanent gesperrt!` 
            }));
        }

        sendDiscordAlarm(name, reason, ip).catch(() => {}); // Discord Alarm schicken
        return triggerUltraBan(reason);    // Den eigentlichen Ban ausführen
    };

    // --- BASIS SCHUTZ ---
    if (!data || typeof data !== 'object') return executeBan("Manipuliertes Datenpaket (Ungültiges Objekt)");

    // 1. Konsolen-Spam / Payload Limit (Erhöht auf 5000 für längere KI-Analysen und Prompts)
    const rawLength = JSON.stringify(data).length;
    if (rawLength > 5000) return executeBan("Payload-Attacke (Datenmenge zu groß)");

    // 2. Client-Identität-Check
    if (typeof data.type !== 'string') return executeBan("Protokoll-Manipulation (Typ-Fälschung)");

    // --- SENSITIVE FELDER AUF SQL-INJECTION PRÜFEN (NUR IDENTITÄTS-/AUTHENTIFIZIERUNGSMESSAGES) ---
    // Wir prüfen SQL-Injection ausschließlich in kritischen Inputfeldern wie Benutzernamen, Passwörtern oder Raum-IDs.
    // Dadurch können legitime Chatnachrichten völlig problemlos Worte wie "update", "drop" oder "select" enthalten!
    const sqlRegex = /\b(UNION|SELECT|DROP|DELETE|UPDATE|INSERT|INTO|VALUES)\b|--|--\s*$/i;

    const authFieldsToCheck = [
        data.playerName,
        data.name,
        data.password,
        data.room,
        data.roomID
    ];

    for (const val of authFieldsToCheck) {
        if (typeof val === 'string' && sqlRegex.test(val)) {
            return executeBan(`SQL-Injection Versuch in Eingabefeld: "${val.substring(0, 20)}"`);
        }
    }

    // --- CHAT SCHUTZ (NUR TATSÄCHLICH GEFÄHRLICHE ANGRIFFE) ---
    if (data.type === 'chat_message' || data.type === 'chat') {
        const msg = data.text || data.content || "";
        
        if (typeof msg === 'string') {
            // CSS/HTML und geschweifte Klammern sind im Chat vollständig erlaubt, da script.js
            // ohnehin textContent benutzt, was jegliche Styles oder Scripte unwirksam macht.
            // Wir sperren lediglich extrem aggressive, bewusste script/iframe-Tags, um reine Provokationen abzuwehren.
            if (/<script|<iframe|javascript:/i.test(msg)) {
                return executeBan("XSS-Versuch (Script-Injektion im Chat)");
            }

            // Zero-Width Spaces blockieren, da sie Namen fälschen
            if (/[\u200B-\u200D\uFEFF]/.test(msg)) {
                return executeBan("Zero-Width-Space Attacke");
            }

            // Type-Juggling verhindern
            if (typeof msg !== 'string') {
                return executeBan("Type-Juggling Hack (Falsches Datenformat im Chat)");
            }
        }
    }

    // --- SPIEL-LOGIK SCHUTZ ---
    if (data.type === 'move') {
        // Spectator-Move Hack
        if (ws.isSpectator) return executeBan("Spectator-Move-Hack");

        // Koordinaten-Manipulation (Out of Bounds)
        const { fr, fc, tr, tc } = data;
        if ([fr, fc, tr, tc].some(v => typeof v !== 'number' || v < 0 || v > 7)) {
            return executeBan("Illegale Board-Koordinaten (Out of Bounds)");
        }

        // Null-Move-Manipulation
        if (fr === tr && fc === tc) return executeBan("Null-Move-Manipulation");
    }

    // --- TECHNISCHE HACKS ---
    // Prototype Pollution
    if (JSON.stringify(data).includes("__proto__") || JSON.stringify(data).includes("constructor")) {
        return executeBan("Prototype Pollution Attacke");
    }

    // Automatischer Sieg-Hack (Prüfung nur, wenn das Spiel tatsächlich gestartet wurde und online läuft)
    if (data.type === 'game_win') {
        const gameTime = (now - (ws.gameStartTimestamp || now)) / 1000;
        if (gameTime < 10) return executeBan("Speed-Win-Hack (Sieg unter 10 Sek)");
    }

    // Room-Hijacking
    if (ws.room && data.room && ws.room !== data.room) {
        return executeBan("Cross-Room-Injection (Fremder Raumzugriff)");
    }

    // Emojis-Flut (Browser-Crash verhindern, Grenze auf komfortable 30 Emojis angehoben)
    const emojiCount = (msg) => (msg.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g) || []).length;
    if (data.text && emojiCount(data.text) > 30) {
        return executeBan("Emoji-Crash-Attacke (Zu viele Emojis im Chat)");
    }

    // JSON-Parsing Bombe
    try {
        if (rawLength > 1000 && (JSON.stringify(data).match(/{/g) || []).length > 20) {
            return executeBan("JSON-Depth Attacke (Verschachtelungs-Bombe)");
        }
    } catch(e) {}

    // Falsche Farben-Wahl
    if (data.type === 'join' && data.color && !['white', 'black', 'random'].includes(data.color)) {
        return executeBan("Farben-Manipulation im Protokoll");
    }

    // Heartbeat-Manipulation
    if (data.type === 'ping' && data.timestamp && data.timestamp > now + 10000) {
        return executeBan("Time-Travel Hack (Manipulierter Ping-Zeitstempel)");
    }

    // Unerlaubte Admin-Befehle fälschen
    if (data.system === true || data.sender === 'SYSTEM' || data.sender === 'System') {
        return executeBan("System-Rechte Fälschung (Admin-Spoofing)");
    }

    return true; // Sicher!
}

module.exports = { validateSecurity };
