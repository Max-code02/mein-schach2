// ==========================================
// script_chat.js - RICH CHAT SYSTEM & CLIENT CONTROLLER
// ==========================================

const RENDER_SERVER = 'mein-schach2.onrender.com';
const isGitHubPages = typeof window !== 'undefined' && window.location.hostname.includes('github.io');

const wsProtocol = (typeof window !== 'undefined' && (window.location.protocol === 'https:' || isGitHubPages)) ? 'wss:' : 'ws:';
const wsHost = isGitHubPages ? RENDER_SERVER : (typeof window !== 'undefined' ? window.location.host : RENDER_SERVER);
const socket = new WebSocket(`${wsProtocol}//${wsHost}`);
const adminPass = "Admina111"; 

// 1. ELEMENTE AUS DER HTML HOLEN
const chatMessages = document.getElementById("chat-messages");
const chatInput = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");
const userBadge = document.getElementById("user-badge");

// 2. NUTZER-IDENTITÄT
let myName = localStorage.getItem("chat_username") || "Max";
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
    console.log("Master-Server verbunden!");
    if(userBadge) userBadge.innerText = `👤 ${myName}`;
    socket.send(JSON.stringify({ type: 'join', room: 'global', name: myName }));
};

socket.onmessage = (e) => {
    try {
        const data = JSON.parse(e.data);
        if (data.type === 'chat') {
            let cleanText = (data.text || "").replace(adminPass, "").trim();
            
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
            alert("🚨 SERVER-MELDUNG: " + data.message);
        }
    } catch (err) {
        console.error("Fehler beim Verarbeiten:", err);
    }
};

// 4. DIE HAUPTFUNKTION ZUM SENDEN
function send() {
    const val = chatInput.value.trim();
    if (!val) return;

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

        let cleanDisplay = val;
        const pws = ['Admina111', 'admina111', 'Admin111', 'admin111', 'Admina1', 'admina1', 'Maxi'];
        pws.forEach(pw => { cleanDisplay = cleanDisplay.replaceAll(pw, '').trim(); });
        
        addMessage(myName, cleanDisplay, 'me', msgId, false);
        
        chatInput.value = "";
        chatInput.focus();
    } else {
        alert("Keine Verbindung zum Server!");
    }
}

/**
 * Text-Formatierung (**fett**, *kursiv*, ~durchgestrichen~)
 */
function formatChatMessage(text) {
    if (!text) return "";
    let safeText = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");

    // Markdown-style formatting
    safeText = safeText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    safeText = safeText.replace(/\*(.*?)\*/g, '<em>$1</em>');
    safeText = safeText.replace(/~(.*?)~/g, '<del>$1</del>');

    // Mention Highlight
    if (myName) {
        const mentionRegex = new RegExp(`@${myName}`, 'gi');
        safeText = safeText.replace(mentionRegex, `<span style="background: rgba(234, 179, 8, 0.3); color: #fef08a; padding: 2px 6px; border-radius: 4px; font-weight: bold;">@${myName}</span>`);
    }

    return safeText;
}

// 5. DESIGN-HELFER (Erstellt Nachrichten-Boxen mit Reaktionen)
function addMessage(name, text, type, msgId = null, isMentioned = false) {
    if (!chatMessages) return;
    const div = document.createElement("div");
    const id = msgId || ("msg_" + Date.now());
    div.id = id;
    div.className = `msg msg-${type} ${isMentioned ? 'mention-highlight' : ''}`;
    if (isMentioned) {
        div.style.borderLeft = "4px solid #eab308";
        div.style.backgroundColor = "rgba(234, 179, 8, 0.1)";
    }

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const formattedText = formatChatMessage(text);

    if (type === 'system') {
        div.innerText = text;
    } else {
        div.innerHTML = `
            <span class="name-tag">${type === 'me' ? 'DU' : name}</span>
            <div class="text">${formattedText}</div>
            <div class="reaction-bar" id="reactions-${id}" style="display: flex; gap: 4px; margin-top: 4px; font-size: 0.85rem;"></div>
            <div class="quick-reactions" style="margin-top: 2px; font-size: 0.75rem; opacity: 0.7; cursor: pointer;">
                <span onclick="sendReaction('${id}', '👍')">👍</span>
                <span onclick="sendReaction('${id}', '🔥')">🔥</span>
                <span onclick="sendReaction('${id}', '❤️')">❤️</span>
                <span onclick="sendReaction('${id}', '😂')">😂</span>
            </div>
            <span class="time-tag">${timeStr}</span>
        `;
    }
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function sendReaction(msgId, emoji) {
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'chat_reaction',
            msgId: msgId,
            emoji: emoji,
            sender: myName
        }));
        handleIncomingReaction(msgId, emoji, myName);
    }
}

function handleIncomingReaction(msgId, emoji, sender) {
    const reactionBar = document.getElementById(`reactions-${msgId}`);
    if (reactionBar) {
        let badge = reactionBar.querySelector(`[data-emoji="${emoji}"]`);
        if (!badge) {
            badge = document.createElement("span");
            badge.setAttribute("data-emoji", emoji);
            badge.style.cssText = "background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 12px;";
            badge.innerHTML = `${emoji} <span class="count">1</span>`;
            reactionBar.appendChild(badge);
        } else {
            const countEl = badge.querySelector(".count");
            if (countEl) {
                countEl.innerText = parseInt(countEl.innerText) + 1;
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
