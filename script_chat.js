// ==========================================
// script_chat.js - RICH CHAT SYSTEM & CLIENT CONTROLLER
// ==========================================

const RENDER_SERVER = 'mein-schach2.onrender.com';
const isGitHubPages = typeof window !== 'undefined' && window.location.hostname.includes('github.io');

const wsProtocol = (typeof window !== 'undefined' && (window.location.protocol === 'https:' || isGitHubPages)) ? 'wss:' : 'ws:';
const wsHost = isGitHubPages ? RENDER_SERVER : (typeof window !== 'undefined' ? window.location.host : RENDER_SERVER);
const socket = new WebSocket(`${wsProtocol}//${wsHost}`);

function escapeChatHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escapeRegExp(str) {
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const ALLOWED_REACTIONS = new Set(['👍', '🔥', '❤️', '😂']);

// 1. ELEMENTE AUS DER HTML HOLEN
const chatMessages = document.getElementById("chat-messages");
const chatInput = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");
const userBadge = document.getElementById("user-badge");

// 2. NUTZER-IDENTITÄT (Sicherer Gast-Standard)
let myName = localStorage.getItem("chat_username") || localStorage.getItem("playerName") || ("Gast_" + Math.floor(1000 + Math.random() * 9000));
myName = String(myName).replace(/[^a-zA-Z0-9_.\- äöüÄÖÜß]/g, '').trim().slice(0, 30) || ("Gast_" + Math.floor(1000 + Math.random() * 9000));
localStorage.setItem("chat_username", myName);

// Sound Feedback
function playMentionSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
        osc.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.15); // E6
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.2);
    } catch (e) {}
}

// 3. VERBINDUNGSMANAGER
socket.onopen = () => {
    if (userBadge) userBadge.innerText = `👤 ${myName}`;
    socket.send(JSON.stringify({ type: 'join', room: 'global', name: myName }));
};

socket.onmessage = (e) => {
    try {
        const data = JSON.parse(e.data);
        if (data.type === 'chat') {
            const cleanText = String(data.text || "").trim();

            // Check for @Mention
            const isMentioned = myName && cleanText.toLowerCase().includes(`@${myName.toLowerCase()}`);
            if (isMentioned) playMentionSound();

            if (data.name !== myName) {
                addMessage(data.name || "SYSTEM", cleanText, data.system ? 'system' : 'other', data.id, isMentioned);
            }
        }
        else if (data.type === 'chat_reaction') {
            handleIncomingReaction(data.msgId, data.emoji, data.sender);
        }
        else if (data.type === 'system_alert') {
            console.warn("Server-Meldung:", data.message);
        }
    } catch (err) {
        console.error("Fehler beim Verarbeiten:", err);
    }
};

// 4. DIE HAUPTFUNKTION ZUM SENDEN
function send() {
    if (!chatInput) return;
    const val = chatInput.value.trim();
    if (!val || val.length > 450) return;

    if (val.toLowerCase() === "/clear") {
        if (chatMessages) chatMessages.innerHTML = "";
        chatInput.value = "";
        return;
    }

    if (socket.readyState === WebSocket.OPEN) {
        const msgId = "msg_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4);

        socket.send(JSON.stringify({
            type: 'chat',
            name: myName,
            text: val,
            room: 'global',
            id: msgId
        }));

        addMessage(myName, val, 'me', msgId, false);

        chatInput.value = "";
        chatInput.focus();
    }
}

/**
 * Text-Formatierung (**fett**, *kursiv*, ~durchgestrichen~) nach strengem HTML-Escaping
 */
function formatChatMessage(text) {
    if (!text) return "";
    let safeText = escapeChatHtml(text);

    // Markdown-style formatting on escaped string
    safeText = safeText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    safeText = safeText.replace(/\*(.*?)\*/g, '<em>$1</em>');
    safeText = safeText.replace(/~(.*?)~/g, '<del>$1</del>');

    // Mention Highlight (RegExp-sicher + HTML-escaped)
    if (myName) {
        const safeName = escapeChatHtml(myName);
        const mentionRegex = new RegExp(`@${escapeRegExp(safeName)}`, 'gi');
        safeText = safeText.replace(mentionRegex, `<span style="background: rgba(234, 179, 8, 0.3); color: #fef08a; padding: 2px 6px; border-radius: 4px; font-weight: bold;">@${safeName}</span>`);
    }

    return safeText;
}

// 5. DESIGN-HELFER (Erstellt Nachrichten-Boxen mit Reaktionen)
function addMessage(name, text, type, msgId = null, isMentioned = false) {
    if (!chatMessages) return;
    const div = document.createElement("div");
    const rawId = String(msgId || ("msg_" + Date.now()));
    const safeId = rawId.replace(/[^a-zA-Z0-9_-]/g, '') || ("msg_" + Date.now());
    const safeType = ['me', 'other', 'system'].includes(type) ? type : 'other';

    div.id = safeId;
    div.className = `msg msg-${safeType} ${isMentioned ? 'mention-highlight' : ''}`;
    if (isMentioned) {
        div.style.borderLeft = "4px solid #eab308";
        div.style.backgroundColor = "rgba(234, 179, 8, 0.1)";
    }

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const formattedText = formatChatMessage(text);

    if (safeType === 'system') {
        div.textContent = String(text || '');
    } else {
        const safeSender = safeType === 'me' ? 'DU' : escapeChatHtml(name || 'Gast');
        div.innerHTML = `
            <span class="name-tag">${safeSender}</span>
            <div class="text">${formattedText}</div>
            <div class="reaction-bar" id="reactions-${safeId}" style="display: flex; gap: 4px; margin-top: 4px; font-size: 0.85rem;"></div>
            <div class="quick-reactions" style="margin-top: 2px; font-size: 0.75rem; opacity: 0.7; cursor: pointer;">
                <span data-react-id="${safeId}" data-react-emoji="👍">👍</span>
                <span data-react-id="${safeId}" data-react-emoji="🔥">🔥</span>
                <span data-react-id="${safeId}" data-react-emoji="❤️">❤️</span>
                <span data-react-id="${safeId}" data-react-emoji="😂">😂</span>
            </div>
            <span class="time-tag">${escapeChatHtml(timeStr)}</span>
        `;
        div.querySelectorAll('[data-react-emoji]').forEach(el => {
            el.addEventListener('click', () => {
                sendReaction(el.getAttribute('data-react-id'), el.getAttribute('data-react-emoji'));
            });
        });
    }
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function sendReaction(msgId, emoji) {
    if (!ALLOWED_REACTIONS.has(emoji)) return;
    const safeId = String(msgId || '').replace(/[^a-zA-Z0-9_-]/g, '');
    if (!safeId) return;
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'chat_reaction',
            msgId: safeId,
            emoji: emoji,
            sender: myName
        }));
        handleIncomingReaction(safeId, emoji, myName);
    }
}

function handleIncomingReaction(msgId, emoji) {
    if (!ALLOWED_REACTIONS.has(emoji)) return;
    const safeId = String(msgId || '').replace(/[^a-zA-Z0-9_-]/g, '');
    if (!safeId) return;
    const reactionBar = document.getElementById(`reactions-${safeId}`);
    if (reactionBar) {
        let badge = reactionBar.querySelector(`[data-emoji="${emoji}"]`);
        if (!badge) {
            badge = document.createElement("span");
            badge.setAttribute("data-emoji", emoji);
            badge.style.cssText = "background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 12px;";
            const emojiSpan = document.createTextNode(emoji + " ");
            const countSpan = document.createElement("span");
            countSpan.className = "count";
            countSpan.textContent = "1";
            badge.appendChild(emojiSpan);
            badge.appendChild(countSpan);
            reactionBar.appendChild(badge);
        } else {
            const countEl = badge.querySelector(".count");
            if (countEl) {
                countEl.textContent = String((parseInt(countEl.textContent, 10) || 0) + 1);
            }
        }
    }
}

if (typeof window !== 'undefined') {
    window.sendReaction = sendReaction;
}

// 6. EVENT-LISTENER
if (sendBtn) sendBtn.onclick = send;
if (chatInput) {
    chatInput.onkeydown = (e) => { if (e.key === "Enter") send(); };
}
