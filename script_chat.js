// ==========================================
// script_chat.js - MAX' SUPREME CONTROL CENTER
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
            // TARNUNG: Passwort Admina111 überall löschen, bevor es angezeigt wird
            let cleanText = data.text.replace(adminPass, "").trim();
            
            // Nur anzeigen, wenn es nicht von uns selbst kommt
            if (data.name !== myName) {
                addMessage(data.name || "SYSTEM", cleanText, data.system ? 'system' : 'other');
            }
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

    // Lokaler Befehl (nur für dich)
    if (val.toLowerCase() === "/clear") {
        chatMessages.innerHTML = "";
        chatInput.value = "";
        return;
    }

    if (socket.readyState === WebSocket.OPEN) {
        // HIER PASSIERT ALLES:
        // Wir schicken den Text EXAKT so wie du ihn tippst.
        // Wenn du "/stats Admina111" tippst, kriegt der Server alle 18 Befehle mit Passwort.
        socket.send(JSON.stringify({
            type: 'chat',
            name: myName,
            text: val,
            room: 'global'
        }));

        // TARNUNG LOKAL: In deiner Sprechblase das PW sofort löschen
        let cleanDisplay = val;
        const pws = ['Admina111', 'admina111', 'Admin111', 'admin111', 'Admina1', 'admina1', 'Maxi'];
        pws.forEach(pw => { cleanDisplay = cleanDisplay.replaceAll(pw, '').trim(); });
        addMessage(myName, cleanDisplay, 'me');
        
        chatInput.value = "";
        chatInput.focus();
    } else {
        alert("Keine Verbindung zum Server!");
    }
}

// 5. DESIGN-HELFER (Erstellt die blauen/grauen Boxen)
function addMessage(name, text, type) {
    if (!chatMessages) return;
    const div = document.createElement("div");
    div.className = `msg msg-${type}`;
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Sicherheit gegen Hacker-HTML
    const safeText = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");

    if(type === 'system') {
        div.innerText = text;
    } else {
        div.innerHTML = `
            <span class="name-tag">${type === 'me' ? 'DU' : name}</span>
            <div class="text">${safeText}</div>
            <span class="time-tag">${timeStr}</span>
        `;
    }
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 6. EVENT-LISTENER (Enter-Taste und Button)
if(sendBtn) sendBtn.onclick = send;
if(chatInput) {
    chatInput.onkeydown = (e) => { if (e.key === "Enter") send(); };
}
