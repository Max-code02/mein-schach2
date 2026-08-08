// emojis.js - EXPANDED EMOJI DICTIONARY & PICKER BUILDER

const emojiMap = {
    ":win:": "🏆",
    ":lose:": "💀",
    ":fire:": "🔥",
    ":check:": "✅",
    ":x:": "❌",
    ":chess:": "♟️",
    ":king:": "👑",
    ":cool:": "😎",
    ":love:": "❤️",
    ":haha:": "😂",
    ":wow:": "😮",
    ":gg:": "🤝",
    ":party:": "🎉",
    ":rip:": "🪦",
    ":robot:": "🤖",
    ":ghost:": "👻",
    ":clap:": "👏",
    ":sword:": "⚔️",
    ":100:": "💯",
    ":eyes:": "👀",
    ":rocket:": "🚀",
    ":think:": "🤔",
    ":heart:": "💖",
    ":star:": "⭐"
};

/**
 * Ersetzt Text-Shortcuts durch echte Emojis
 * @param {string} text - Die Chat-Nachricht
 * @returns {string} - Der Text mit Emojis
 */
function parseEmojis(text) {
    if (!text || typeof text !== 'string') return text;

    let newText = text;
    for (const [shortcut, emoji] of Object.entries(emojiMap)) {
        const regex = new RegExp(shortcut, 'g');
        newText = newText.replace(regex, emoji);
    }
    return newText;
}

/**
 * Generiert HTML-Buttons für ein Emoji-Picker Menü im Chat
 */
function getEmojiPickerHTML(targetInputId = "chat-input") {
    let html = `<div class="emoji-picker-grid" style="display: flex; flex-wrap: wrap; gap: 6px; padding: 8px; background: rgba(15, 23, 42, 0.95); border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); max-width: 320px;">`;
    for (const [shortcut, emoji] of Object.entries(emojiMap)) {
        html += `<button type="button" class="emoji-btn" onclick="insertEmoji('${emoji}', '${targetInputId}')" title="${shortcut}" style="background: none; border: none; font-size: 1.3rem; cursor: pointer; padding: 4px; transition: transform 0.1s;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">${emoji}</button>`;
    }
    html += `</div>`;
    return html;
}

if (typeof window !== 'undefined') {
    window.insertEmoji = function(emoji, targetInputId = "chat-input") {
        const input = document.getElementById(targetInputId);
        if (input) {
            input.value += emoji;
            input.focus();
        }
    };
}

module.exports = { parseEmojis, getEmojiPickerHTML, emojiMap };
