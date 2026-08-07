// autoMessages.js - AUTOMATED SYSTEM ANNOUNCEMENTS & TIP BOT FOR CHESSLIVE
let intervalId = null;
let isPaused = false;
let messageIndex = 0;

// Informative & abwechslungsreiche System-Nachrichten
const BROADCAST_MESSAGES = [
    "📢 Willkommen auf SchachLive! Viel Spaß bei deinen Partien! 🎮",
    "💡 Tipp: Nutze `/watch [Spieler]`, um Freunden live beim Schachspiel zuzuschauen!",
    "💡 Tipp: Ändere dein Brett- und Figuren-Design jederzeit unten in den Einstellungen! 🎨",
    "🚫 Bitte bleib höflich im Chat. Fairplay steht an erster Stelle! 🤝",
    "💡 Tipp: Du kannst gegen den Grandmaster Ghost KI-Bot antreten, um deine Fähigkeiten zu testen!",
    "🏆 Meistere deine Taktik im Puzzle-Modus oder fordere Spieler im Multiplayer heraus!",
    "💡 Tipp: Bei Verbindungsproblemen synchronisiert Google Firestore deine Daten automatisch neu."
];

/**
 * Startet den automatischen Info-Bot für das WebSocket-Server-Netzwerk
 * @param {WebSocketServer} wss - WebSocket Server Instanz
 * @param {number} intervalMs - Intervall in Millisekunden (Standard: 6 Minuten)
 */
function startAutoMessages(wss, intervalMs = 360000) {
    if (intervalId) {
        clearInterval(intervalId);
    }

    console.log(`🤖 AutoMessages-Bot gestartet (Intervall: ${Math.round(intervalMs / 1000)}s)`);

    intervalId = setInterval(() => {
        if (isPaused) return;

        if (wss && wss.clients && wss.clients.size > 0) {
            // Zähle aktiver Verbindungen
            let activeClients = 0;
            wss.clients.forEach(client => {
                if (client.readyState === 1) activeClients++;
            });

            if (activeClients === 0) return;

            const text = BROADCAST_MESSAGES[messageIndex];
            const broadcastPayload = JSON.stringify({
                type: 'chat',
                text: `🤖 INFO: ${text}`,
                system: true
            });

            wss.clients.forEach(client => {
                if (client.readyState === 1) {
                    client.send(broadcastPayload);
                }
            });

            console.log(`[AutoMessages] Broadcast gesendet an ${activeClients} Client(s): "${text}"`);
            messageIndex = (messageIndex + 1) % BROADCAST_MESSAGES.length;
        }
    }, intervalMs);
}

/**
 * Sendet sofort eine manuelle System-Ankündigung an alle verbundenen Spieler
 */
function sendBroadcastNow(wss, customText) {
    if (!wss || !wss.clients || !customText) return;
    
    const payload = JSON.stringify({
        type: 'chat',
        text: `📢 ANKÜNDIGUNG: ${customText}`,
        system: true
    });

    let count = 0;
    wss.clients.forEach(client => {
        if (client.readyState === 1) {
            client.send(payload);
            count++;
        }
    });

    console.log(`[AutoMessages] Manuelle Ankündigung an ${count} Spieler gesendet.`);
}

/**
 * Fügt eine neue Nachricht zur Rotation hinzu
 */
function addAutoMessage(msgText) {
    if (msgText && typeof msgText === 'string') {
        BROADCAST_MESSAGES.push(msgText);
    }
}

/**
 * Pausiert oder reaktiviert die automatischen Durchsagen
 */
function toggleAutoMessages(pauseState) {
    isPaused = typeof pauseState === 'boolean' ? pauseState : !isPaused;
    console.log(`[AutoMessages] Status geändert. Pausiert: ${isPaused}`);
}

module.exports = { 
    startAutoMessages, 
    sendBroadcastNow, 
    addAutoMessage, 
    toggleAutoMessages, 
    BROADCAST_MESSAGES 
};
