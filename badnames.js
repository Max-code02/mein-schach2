// badnames.js - EXTENDED BAD NAME & SPOOFING PROTECTION FILTER

const FORBIDDEN_NAMES = [
    "admin",
    "administrator",
    "moderator",
    "mod",
    "system",
    "root",
    "server",
    "support",
    "official",
    "owner",
    "eigentümer",
    "chesslive",
    "ghostplayer",
    "bot"
];

const BAD_WORDS = [
    "idiot",
    "hacker",
    "cheater",
    "nigger",
    "neger",
    "hurensohn",
    "spast",
    "hitler",
    "nazi",
    "fotze",
    "wichser"
];

/**
 * Validiert Benutzernamen gegen Namensfälschung, Homoglyphen und Schimpfwörter
 * @param {string} name - Der gewählte Name
 * @returns {boolean} - true wenn erlaubt, false wenn abgelehnt
 */
function isNameAllowed(name) {
    if (!name || typeof name !== 'string') return false;
    
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 20) return false;

    // 1. Homoglyphen & Zero-Width Spaces verhindern (Invisible Unicode)
    if (/[\u200B-\u200D\uFEFF\u00A0]/.test(name)) return false;

    const lowerName = trimmed.toLowerCase();

    // 2. Exakte Übereinstimmungen mit verbotenen System-Namen
    if (FORBIDDEN_NAMES.some(forbidden => lowerName === forbidden)) {
        return false;
    }

    // 3. Verbotene Wörter in Kombination prüfen
    for (let word of BAD_WORDS) {
        if (lowerName.includes(word)) return false;
    }

    // 4. Keine gefälschten [System] oder [Admin] Präfixe im Namen
    if (lowerName.startsWith('[admin]') || lowerName.startsWith('[system]') || lowerName.startsWith('👑')) {
        return false;
    }

    // 5. Erlaubte Zeichen: Buchstaben, Zahlen, Bindestrich, Unterstrich und Leerzeichen
    const validRegex = /^[a-zA-Z0-9_\- ]+$/;
    if (!validRegex.test(trimmed)) return false;

    return true;
}

module.exports = { isNameAllowed, FORBIDDEN_NAMES, BAD_WORDS };
