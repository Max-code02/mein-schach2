// antispam.js - ADVANCED REAL-TIME CHAT & COMMAND PROTECTION SYSTEM
const userStatus = new Map();

// --- CONFIGURATION ENGINE ---
const CONFIG = {
    MSG_LIMIT: 5,               // Max messages within TIME_WINDOW
    TIME_WINDOW: 5000,          // Time window in ms (5 seconds)
    BASE_MUTE: 30000,           // Base mute duration (30 seconds)
    MAX_MUTE: 3600000,          // Max mute duration (1 hour)
    SAME_MSG_PROTECTION: true,  // Detect duplicate or fuzzy-duplicate messages
    SIMILARITY_THRESHOLD: 0.85,  // Text similarity limit (85%)
    VIOLATION_THRESHOLD: 3,     // Escalation trigger limit
    MAX_CHARS_PER_MSG: 450,     // Character limit per message
    REPEAT_CHAR_LIMIT: 12,      // Max consecutive identical characters (e.g. "aaaaa...")
    CAPS_LOCK_LIMIT: 0.75,      // Max percentage of uppercase characters
    CMD_LIMIT: 4,               // Max /commands in 10 seconds
    
    ADMIN_IPS: ['127.0.0.1', '::1'],
    
    BANNED_WORDS: [
        // Politisch / Hassrede / Extremismus
        'nazi', 'hitler', 'heil', 'ss-marsch', 'hakenkreuz', 'neger', 'nigger', 'kanacke', 
        'jude', 'moslem', 'christ', 'zigeuner', 'faschist', 'vergasen', 'holocaust',

        // Harte Beleidigungen
        'hure', 'nutte', 'schlampe', 'miststück', 'wichser', 'wixxer', 'wixx', 'ficker', 
        'ficken', 'fotze', 'fotz', 'pimmel', 'schwanz', 'vagina', 'penis', 'hurensohn', 
        'huso', 'hurre', 'arsch', 'ass', 'bastard', 'missgeburt', 'missi', 'spaßt', 
        'spast', 'spasti', 'behindert', 'mongo', 'opfer', 'lutscher', 'pisser', 
        'kack', 'scheiß', 'verpiss', 'haltssmaul', 'fresse', 'maul', 'depp', 'trottel', 
        'dulli', 'vollidiot', 'schwul', 'lesbe', 'transe', 'schwuchtel',

        // System & Hack Schutz
        'free-elo', 'cheat-engine', 'exploit', 'token-grabber',

        // Werbung & Phishing Links
        'discord.gg', 'http://', 'https://', '.com/', '.net/', '.gg/', 'paypal.me', 
        'free-elo', 'cheat-bot',

        // Englisch
        'fuck', 'bitch', 'shits', 'asshole', 'dick', 'cunt', 'retard', 'stfu', 'faggot', 'pussy', 'slut'
    ]
};

// Periodic Cleanup Task: Remove stale IP entries every 15 minutes
setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of userStatus.entries()) {
        if (now - data.lastActivity > 15 * 60 * 1000 && now > data.mutedUntil) {
            userStatus.delete(ip);
        }
    }
}, 15 * 60 * 1000);

/**
 * Calculates string similarity ratio (0.0 to 1.0)
 */
function calculateSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    if (str1 === str2) return 1.0;
    const len1 = str1.length;
    const len2 = str2.length;
    if (Math.abs(len1 - len2) > 15) return 0;

    let matches = 0;
    const minLen = Math.min(len1, len2);
    for (let i = 0; i < minLen; i++) {
        if (str1[i] === str2[i]) matches++;
    }
    return matches / Math.max(len1, len2);
}

/**
 * Checks for character repetitions like "hahahahaha" or "aaaaaaa"
 */
function hasExcessiveRepetition(text) {
    const repeatRegex = /(.)\1{11,}/g; // 12 or more identical chars
    return repeatRegex.test(text);
}

/**
 * Main Antispam Guard Function
 */
function isSpamming(ws, messageText = "") {
    if (!ws) return false;

    // Admin Immunity Check
    const ip = ws.clientIP || (ws._socket ? ws._socket.remoteAddress : "unknown");
    if (CONFIG.ADMIN_IPS.includes(ip) || ws.isAdmin) return false;

    const now = Date.now();

    // Initialize tracking profile
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

    // 1. MUTE CHECK: Currently muted?
    if (now < data.mutedUntil) {
        const remainingSec = Math.ceil((data.mutedUntil - now) / 1000);
        const timeText = remainingSec > 60 
            ? `${Math.ceil(remainingSec / 60)} Minute(n)` 
            : `${remainingSec} Sekunde(n)`;

        if (ws.readyState === 1) {
            ws.send(JSON.stringify({ 
                type: 'chat', 
                text: `🚫 STOPP! Du bist noch für ${timeText} gesperrt.`, 
                system: true 
            }));
        }
        data.mutedUntil += 1000; // Penalty for trying during mute
        return true;
    }

    // 2. CHARACTER LENGTH CHECK
    if (messageText.length > CONFIG.MAX_CHARS_PER_MSG) {
        if (ws.readyState === 1) {
            ws.send(JSON.stringify({ 
                type: 'chat', 
                text: `⚠️ Nachricht zu lang! Maximum: ${CONFIG.MAX_CHARS_PER_MSG} Zeichen.`, 
                system: true 
            }));
        }
        return true;
    }

    // 3. REPETITIVE CHARACTERS CHECK
    if (hasExcessiveRepetition(messageText)) {
        if (ws.readyState === 1) {
            ws.send(JSON.stringify({ 
                type: 'chat', 
                text: "⚠️ Zu viele aufeinanderfolgende gleiche Zeichen!", 
                system: true 
            }));
        }
        return true;
    }

    // 4. CAPS LOCK CHECK
    if (messageText.length > 12) {
        const capsCount = (messageText.match(/[A-Z]/g) || []).length;
        if (capsCount / messageText.length > CONFIG.CAPS_LOCK_LIMIT) {
            if (ws.readyState === 1) {
                ws.send(JSON.stringify({ 
                    type: 'chat', 
                    text: "⚠️ Bitte deaktiviere CAPS LOCK (Grossschreibung)!", 
                    system: true 
                }));
            }
            return true;
        }
    }

    // 5. WORD FILTER (Blacklist) - Exclude Admin passwords or special system commands
    const trimmedMsg = messageText.trim();
    const isCmd = trimmedMsg.startsWith('/') || trimmedMsg.startsWith('!') || trimmedMsg.startsWith('?');
    const hasAdminPass = ['Admina111', 'admina111', 'Admin111', 'admin111', 'Admina1', 'Maxi'].some(pw => messageText.includes(pw));

    if (!isCmd && !hasAdminPass) {
        const lowerMsg = messageText.toLowerCase();
        const hasBannedWord = CONFIG.BANNED_WORDS.some(word => lowerMsg.includes(word));
        if (hasBannedWord) {
            data.warnings++;
            console.warn(`[ANTISPAM WARNING] IP: ${ip} | Warning #${data.warnings}`);

            if (ws.readyState === 1) {
                ws.send(JSON.stringify({ 
                    type: 'chat', 
                    text: `🔞 Beleidigungen / verbotene Ausdrücke! Verwarnung ${data.warnings}/3`, 
                    system: true 
                }));
            }

            if (data.warnings >= 3) {
                data.mutedUntil = now + (CONFIG.BASE_MUTE * 10); // 5 Min Mute
                if (ws.readyState === 1) {
                    ws.send(JSON.stringify({ 
                        type: 'chat', 
                        text: "🚨 3 Verwarnungen erreicht! 5 Minuten Chat-Sperre.", 
                        system: true 
                    }));
                }
            }
            return true;
        }
    }

    // 6. COMMAND SPAM CHECK
    if (isCmd) {
        data.cmdCount.push(now);
        data.cmdCount = data.cmdCount.filter(t => now - t < 10000);
        if (data.cmdCount.length > CONFIG.CMD_LIMIT) {
            if (ws.readyState === 1) {
                ws.send(JSON.stringify({ 
                    type: 'chat', 
                    text: "⚠️ Zu viele Befehle gesendet! Bitte warte kurz.", 
                    system: true 
                }));
            }
            return true;
        }
    }

    // 7. DUPLICATE & FUZZY REPETITION CHECK
    if (CONFIG.SAME_MSG_PROTECTION && messageText.length > 3) {
        const cleanMsg = messageText.trim().toLowerCase();
        const similarity = calculateSimilarity(cleanMsg, data.lastText);
        if (similarity >= CONFIG.SIMILARITY_THRESHOLD) {
            if (ws.readyState === 1) {
                ws.send(JSON.stringify({ 
                    type: 'chat', 
                    text: "⚠️ Wiederhole bitte nicht mehrmals den gleichen Satz!", 
                    system: true 
                }));
            }
            return true;
        }
        data.lastText = cleanMsg;
    }

    // 8. FREQUENCY TIME-WINDOW CHECK
    data.lastMessages.push(now);
    data.lastMessages = data.lastMessages.filter(time => now - time < CONFIG.TIME_WINDOW);

    if (data.lastMessages.length > CONFIG.MSG_LIMIT) {
        data.violationCount++;
        const multiplier = Math.pow(2, data.violationCount - 1);
        const currentMute = Math.min(CONFIG.BASE_MUTE * multiplier, CONFIG.MAX_MUTE);
        
        data.mutedUntil = now + currentMute;
        data.lastMessages = [];

        const durationText = currentMute >= 60000 
            ? `${Math.round(currentMute / 60000)} Minute(n)` 
            : `${Math.round(currentMute / 1000)} Sekunde(n)`;

        console.warn(`[SECURITY] Anti-Spam Mute #${data.violationCount} for IP: ${ip}`);

        if (ws.readyState === 1) {
            ws.send(JSON.stringify({ 
                type: 'chat', 
                text: `🚨 SPAM-ALARM! Du wurdest gesperrt. Dauer: ${durationText}`, 
                system: true 
            }));
        }

        if (data.violationCount >= 6) {
            if (ws.readyState === 1) {
                ws.send(JSON.stringify({ 
                    type: 'chat', 
                    text: "❌ Verbindung getrennt aufgrund von persistentem Spamming.", 
                    system: true 
                }));
            }
            data.isBanned = true;
            setTimeout(() => { if (ws.readyState === 1) ws.terminate(); }, 800);
        }

        return true;
    }

    return false;
}

/**
 * Helper to un-mute a player manually (e.g. by Admin command)
 */
function unmutePlayer(ip) {
    if (userStatus.has(ip)) {
        const data = userStatus.get(ip);
        data.mutedUntil = 0;
        data.warnings = 0;
        data.violationCount = 0;
        return true;
    }
    return false;
}

module.exports = { isSpamming, unmutePlayer, CONFIG };
