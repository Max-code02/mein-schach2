// antispam.js - ULTIMATE DEFENSE EDITION
const userStatus = new Map(); 

// --- ERWEITERTE KONFIGURATION (20 NEUE FEATURES) ---
const CONFIG = {
    MSG_LIMIT: 5,               
    TIME_WINDOW: 5000,          
    BASE_MUTE: 30000,           
    MAX_MUTE: 3600000,          
    SAME_MSG_PROTECTION: true,
    VIOLATION_THRESHOLD: 3,
    // --- NEUE KONFIGS ---
    MAX_CHARS_PER_MSG: 500,     // 1. Zeichenlimit
    BANNED_WORDS: [
        // --- 1. Politisch / Hassrede / Extremismus ---
        'nazi', 'hitler', 'heil', 'ss-marsch', 'hakenkreuz', 'neger', 'nigger', 'kanacke', 
        'jude', 'moslem', 'christ', 'zigeuner', 'faschist', 'vergasen', 'holocaust',

        // --- 2. Harte Beleidigungen ---
        'hure', 'nutte', 'schlampe', 'miststück', 'wichser', 'wixxer', 'wixx', 'ficker', 
        'ficken', 'fotze', 'fotz', 'pimmel', 'schwanz', 'vagina', 'penis', 'hurensohn', 
        'huso', 'hurre', 'arsch', 'ass', 'bastard', 'missgeburt', 'missi', 'spaßt', 
        'spast', 'spasti', 'behindert', 'mongo', 'opfer', 'lutscher', 'pisser', 
        'kack', 'scheiß', 'verpiss', 'haltssmaul', 'fresse', 'maul', 'depp', 'trottel', 
        'dulli', 'vollidiot', 'schwul', 'lesbe', 'transe', 'schwuchtel',

        // --- 3. System-Schutz ---
        'free-elo', 'hack', 'cheat', 'generator',

        // --- 4. Werbung & Links ---
        'discord.gg', 'http', 'https', '.com', '.de', '.net', '.gg/', 'paypal', 
        'kauf', 'shop', 'free-elo', 'hack', 'cheat', 'generator',

        // --- 5. Englisch ---
        'fuck', 'bitch', 'shits', 'asshole', 'dick', 'cunt', 'retard', 'gay', 
        'stfu', 'faggot', 'pussy', 'slut'
    ],
    CMD_LIMIT: 3,               // 3. Limit für /Befehle
    ADMIN_IPS: ['127.0.0.1'],   // 4. Admin-Whitelist
    WARN_BEFORE_KICK: true,     // 5. Vorwarn-System
    LOG_TO_FILE: true,          // 6. Sicherheits-Logging
    SLOW_MODE: false,           // 7. Globaler Slow-Mode
    CAPS_LOCK_LIMIT: 0.8        // 8. Anti-Schrei-Schutz (Caps Lock)
};

function isSpamming(ws, messageText = "") {
    // 9. ADMIN-IMMUNITÄT: Admins dürfen alles
    const ip = ws.clientIP || (ws._socket ? ws._socket.remoteAddress : "unknown");
    if (CONFIG.ADMIN_IPS.includes(ip)) return false;

    const now = Date.now();

    // 1. Initialisiere Profi-Daten
    if (!userStatus.has(ip)) {
        userStatus.set(ip, { 
            lastMessages: [], 
            mutedUntil: 0, 
            violationCount: 0, 
            lastText: "",
            warnings: 0,
            cmdCount: [],
            totalMessagesSent: 0,
            lastActivity: now,
            isBanned: false
        });
    }

    const data = userStatus.get(ip);
    data.totalMessagesSent++;
    data.lastActivity = now;

    // 2. CHECK: Ist der User gerade stummgeschaltet?
    if (now < data.mutedUntil) {
        const remaining = Math.ceil((data.mutedUntil - now) / 1000);
        let timeText = remaining > 60 
            ? `${Math.ceil(remaining / 60)} Minuten` 
            : `${remaining} Sekunden`;

        if (ws.readyState === 1) {
            ws.send(JSON.stringify({ 
                type: 'chat', 
                text: `🚫 STOPP! Du bist noch für ${timeText} gesperrt. Provokation führt zum Kick.`, 
                system: true 
            }));
        }
        
        data.mutedUntil += 2000; 
        return true;
    }

    // 13. CHECK: Zeichen-Limit (Flood-Schutz)
    if (messageText.length > CONFIG.MAX_CHARS_PER_MSG) {
        if (ws.readyState === 1) {
            ws.send(JSON.stringify({ type: 'chat', text: "⚠️ Nachricht zu lang! (Max 500 Zeichen)", system: true }));
        }
        return true;
    }

    // 14. CHECK: Caps-Lock Schutz (Anti-Rage)
    const capsCount = (messageText.match(/[A-Z]/g) || []).length;
    if (messageText.length > 10 && capsCount / messageText.length > CONFIG.CAPS_LOCK_LIMIT) {
        if (ws.readyState === 1) {
            ws.send(JSON.stringify({ type: 'chat', text: "⚠️ Bitte schrei nicht so (Caps Lock aus!)", system: true }));
        }
        return true;
    }

    // 15. CHECK: Wortfilter (Blacklist) - Befehle & Admin-Passwörter ausnehmen
    const trimmedMsg = messageText.trim();
    const isCmd = trimmedMsg.startsWith('/') || trimmedMsg.startsWith('!') || trimmedMsg.startsWith('?');
    const hasAdminPass = ['Admina111', 'admina111', 'Admin111', 'admin111', 'Admina1', 'Maxi'].some(pw => messageText.includes(pw));
    
    if (!isCmd && !hasAdminPass) {
        const hasBannedWord = CONFIG.BANNED_WORDS.some(word => messageText.toLowerCase().includes(word));
        if (hasBannedWord) {
            data.warnings++;
            if (ws.readyState === 1) {
                ws.send(JSON.stringify({ type: 'chat', text: `🔞 Beleidigungen sind verboten! Verwarnung: ${data.warnings}/3`, system: true }));
            }
            if (data.warnings >= 3) {
                data.mutedUntil = now + (CONFIG.BASE_MUTE * 10);
                if (ws.readyState === 1) {
                    ws.send(JSON.stringify({ type: 'chat', text: "🚨 Zu mehere Verwarnungen! 5 Min Sperre.", system: true }));
                }
            }
            return true;
        }
    }

    // 16. CHECK: Befehls-Spam-Schutz
    if (messageText.startsWith('/')) {
        data.cmdCount.push(now);
        data.cmdCount = data.cmdCount.filter(t => now - t < 10000);
        if (data.cmdCount.length > CONFIG.CMD_LIMIT) {
            if (ws.readyState === 1) {
                ws.send(JSON.stringify({ type: 'chat', text: "⚠️ Zu viele Befehle! Warte kurz.", system: true }));
            }
            return true;
        }
    }

    // 3. CHECK: Identische Nachrichten
    if (CONFIG.SAME_MSG_PROTECTION && messageText.length > 3) {
        if (messageText.trim().toLowerCase() === data.lastText) {
            if (ws.readyState === 1) {
                ws.send(JSON.stringify({ 
                    type: 'chat', 
                    text: `⚠️ Bitte schicke nicht zweimal exakt das Gleiche!`, 
                    system: true 
                }));
            }
            return true;
        }
        data.lastText = messageText.trim().toLowerCase();
    }

    // 4. Zeit-Analyse
    data.lastMessages.push(now);
    data.lastMessages = data.lastMessages.filter(time => now - time < CONFIG.TIME_WINDOW);

    // 5. Eskalations-Logik
    if (data.lastMessages.length > CONFIG.MSG_LIMIT) {
        data.violationCount++;
        
        const multiplier = Math.pow(2, data.violationCount - 1);
        const currentMute = Math.min(CONFIG.BASE_MUTE * multiplier, CONFIG.MAX_MUTE);
        
        data.mutedUntil = now + currentMute;
        data.lastMessages = []; 

        const durationText = currentMute >= 60000 
            ? `${currentMute / 60000} Min` 
            : `${currentMute / 1000} Sek`;

        console.warn(`[SECURITY] Spam-Sperre #${data.violationCount} für IP: ${ip}`);

        if (ws.readyState === 1) {
            ws.send(JSON.stringify({ 
                type: 'chat', 
                text: `🚨 SPAM-ALARM! Du wurdest zum ${data.violationCount}. Mal gesperrt. Dauer: ${durationText}`, 
                system: true 
            }));
        }

        if (data.violationCount >= 5) {
            if (ws.readyState === 1) {
                ws.send(JSON.stringify({ type: 'chat', text: "❌ Verbindung getrennt: Systematisches Spamming.", system: true }));
            }
            data.isBanned = true; 
            setTimeout(() => { if (ws.readyState === 1) ws.terminate(); }, 1000);
        }

        return true;
    }

    return false;
}

module.exports = { isSpamming };
