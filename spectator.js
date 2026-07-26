// spectator.js - Das ULTIMATIVE Stadion-System für Max' Server

// Speichert: Map { WebSocket => RoomID }
const spectators = new Map();

/**
 * Fügt einen Zuschauer zu einem Raum oder einem Spieler hinzu
 * @param {WebSocket} ws - Der Zuschauer
 * @param {string} target - Die Raumnummer (z.B. "room_1") oder ein Spielername
 * @param {WebSocketServer} wss - Um Spieler zu finden
 * @param {Map} roomStates - Aktuelle Brett-Zustände aller Räume
 */
function addSpectator(ws, target, wss, roomStates = null) {
    if (!target) {
        ws.send(JSON.stringify({ type: 'chat', text: '❌ Nutzung: /watch [Name oder Raum]', system: true }));
        return;
    }

    let finalRoom = target;
    let foundPlayerName = null;

    // 1. Smarte Suche: Ist 'target' vielleicht ein Spielername?
    if (!target.startsWith('room_') && !target.startsWith('bot_room_')) {
        let found = false;
        
        // 1a. Check local WebSocket clients
        wss.clients.forEach(client => {
            if (client.playerName && client.playerName.toLowerCase() === target.toLowerCase()) {
                if (client.room) {
                    finalRoom = client.room;
                    foundPlayerName = client.playerName;
                    found = true;
                }
            }
        });

        // 1b. Check cross-instance room states
        if (!found && roomStates) {
            for (const [roomID, state] of roomStates.entries()) {
                if ((state.whitePlayer && state.whitePlayer.toLowerCase() === target.toLowerCase()) || 
                    (state.blackPlayer && state.blackPlayer.toLowerCase() === target.toLowerCase())) {
                    finalRoom = roomID;
                    foundPlayerName = target;
                    found = true;
                    break;
                }
            }
        }

        if (!found) {
            ws.send(JSON.stringify({ type: 'chat', text: `❌ Spieler "${target}" wurde nicht gefunden oder ist in keinem aktiven Spiel.`, system: true }));
            return;
        }
    }

    // 2. Zuschauer registrieren
    spectators.set(ws, finalRoom);
    ws.isSpectator = true;
    ws.spectatingRoom = finalRoom;

    // 3. Bestätigung an Zuschauer
    ws.send(JSON.stringify({ 
        type: 'chat', 
        text: `👁️ Du schaust jetzt in Raum [${finalRoom}] zu!`, 
        system: true 
    }));

    // 4. Sende aktuellen Brett-Zustand an Zuschauer
    if (roomStates && roomStates.has(finalRoom)) {
        const state = roomStates.get(finalRoom);
        ws.send(JSON.stringify({
            type: 'spectate_init',
            room: finalRoom,
            board: state.board,
            turn: state.turn,
            whitePlayer: state.whitePlayer || 'Weiß',
            blackPlayer: state.blackPlayer || 'Schwarz'
        }));
    } else {
        ws.send(JSON.stringify({
            type: 'spectate_init',
            room: finalRoom,
            text: `👁️ Verbindung zu Raum ${finalRoom} hergestellt. Warte auf den nächsten Zug...`
        }));
    }

    // 5. Info an die Zuschauer im Raum
    const count = getSpectatorCount(finalRoom);
    broadcastToSpectators({
        type: 'chat',
        text: `📢 Ein neuer Zuschauer schaut zu. (Gesamt: ${count})`,
        system: true
    }, finalRoom);
}

/**
 * Entfernt einen Zuschauer (z.B. bei Logout oder /unwatch)
 */
function removeSpectator(ws) {
    if (spectators.has(ws)) {
        spectators.delete(ws);
        ws.isSpectator = false;
        ws.spectatingRoom = null;
        
        if (ws.readyState === 1) {
            ws.send(JSON.stringify({ type: 'chat', text: '👁️ Beobachter-Modus beendet.', system: true }));
            ws.send(JSON.stringify({ type: 'spectate_end' }));
        }
    }
}

/**
 * Sendet Daten (Züge/Bilder/Chat) NUR an die Zuschauer eines bestimmten Raums
 */
function broadcastToSpectators(data, roomID) {
    if (!roomID) return;
    const message = typeof data === 'string' ? data : JSON.stringify(data);
    
    spectators.forEach((targetRoom, client) => {
        if (client.readyState === 1 && targetRoom === roomID) {
            client.send(message);
        }
    });
}

/**
 * Spezieller Zuschauer-Chat (Zuschauer können untereinander schreiben, ohne die Spieler zu stören)
 */
function handleSpectatorChat(ws, text) {
    const room = spectators.get(ws);
    if (!room) return;

    const chatData = {
        type: 'chat',
        sender: `👁️ [Beobachter] ${ws.playerName || 'Gast'}`,
        text: text,
        isSpectatorChat: true
    };

    broadcastToSpectators(chatData, room);
}

/**
 * Zählt, wie viele Leute gerade in einem bestimmten Raum zuschauen
 */
function getSpectatorCount(roomID) {
    let count = 0;
    spectators.forEach(room => { if (room === roomID) count++; });
    return count;
}

module.exports = { 
    addSpectator, 
    removeSpectator, 
    broadcastToSpectators, 
    handleSpectatorChat,
    getSpectatorCount,
    spectators 
};
