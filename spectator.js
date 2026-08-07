// spectator.js - ADVANCED STADIUM & SPECTATOR ENGINE FOR CHESSLIVE

// Map: WebSocket => RoomID
const spectators = new Map();

/**
 * Adds a spectator to a room or targets a specific player to spectate
 * @param {WebSocket} ws - Spectator WebSocket client
 * @param {string} target - Room ID (e.g. "room_1") or player name
 * @param {WebSocketServer} wss - Server instance to resolve active sockets
 * @param {Map} roomStates - Current board states of all active games
 */
function addSpectator(ws, target, wss, roomStates = null) {
    if (!ws) return;

    if (!target) {
        if (ws.readyState === 1) {
            ws.send(JSON.stringify({ 
                type: 'chat', 
                text: '❌ Nutzung: /watch [Name oder RaumID]', 
                system: true 
            }));
        }
        return;
    }

    let finalRoom = target;
    let foundPlayerName = null;

    // 1. Smart Player/Room Name Lookup
    if (!target.startsWith('room_') && !target.startsWith('bot_room_')) {
        let found = false;

        // 1a. Search local active WebSocket clients
        if (wss && wss.clients) {
            wss.clients.forEach(client => {
                if (client.playerName && client.playerName.toLowerCase() === target.toLowerCase()) {
                    if (client.room) {
                        finalRoom = client.room;
                        foundPlayerName = client.playerName;
                        found = true;
                    }
                }
            });
        }

        // 1b. Search room states
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
            if (ws.readyState === 1) {
                ws.send(JSON.stringify({ 
                    type: 'chat', 
                    text: `❌ Spieler oder Raum "${target}" wurde nicht gefunden oder hat keine aktive Partie.`, 
                    system: true 
                }));
            }
            return;
        }
    }

    // 2. Register Spectator
    spectators.set(ws, finalRoom);
    ws.isSpectator = true;
    ws.spectatingRoom = finalRoom;

    const spectatorName = ws.playerName || 'Gast';
    console.log(`👁️ [Spectator] ${spectatorName} schaut jetzt in Raum ${finalRoom} zu.`);

    // 3. Confirmation to Spectator
    if (ws.readyState === 1) {
        ws.send(JSON.stringify({ 
            type: 'chat', 
            text: `👁️ Du schaust jetzt in Raum [${finalRoom}] zu!`, 
            system: true 
        }));

        // 4. Send Initial Room State
        if (roomStates && roomStates.has(finalRoom)) {
            const state = roomStates.get(finalRoom);
            ws.send(JSON.stringify({
                type: 'spectate_init',
                room: finalRoom,
                board: state.board,
                turn: state.turn,
                whitePlayer: state.whitePlayer || 'Weiß',
                blackPlayer: state.blackPlayer || 'Schwarz',
                timeWhite: state.timeWhite,
                timeBlack: state.timeBlack
            }));
        } else {
            ws.send(JSON.stringify({
                type: 'spectate_init',
                room: finalRoom,
                text: `👁️ Verbindung zu Raum ${finalRoom} hergestellt. Warte auf den nächsten Zug...`
            }));
        }
    }

    // 5. Notify all spectators in room about count update
    const count = getSpectatorCount(finalRoom);
    broadcastToSpectators({
        type: 'chat',
        text: `📢 Ein neuer Zuschauer schaut zu. (Insgesamt: ${count} Zuschauer)`,
        system: true
    }, finalRoom);
}

/**
 * Removes a spectator from spectate mode
 */
function removeSpectator(ws) {
    if (spectators.has(ws)) {
        const roomID = spectators.get(ws);
        spectators.delete(ws);
        ws.isSpectator = false;
        ws.spectatingRoom = null;

        if (ws.readyState === 1) {
            ws.send(JSON.stringify({ type: 'chat', text: '👁️ Beobachter-Modus beendet.', system: true }));
            ws.send(JSON.stringify({ type: 'spectate_end' }));
        }

        if (roomID) {
            const remaining = getSpectatorCount(roomID);
            broadcastToSpectators({
                type: 'chat',
                text: `👁️ Ein Zuschauer hat den Raum verlassen. (${remaining} verbleiben)`,
                system: true
            }, roomID);
        }
    }
}

/**
 * Broadcasts events/moves/messages specifically to spectators of a room
 */
function broadcastToSpectators(data, roomID) {
    if (!roomID) return;
    const message = typeof data === 'string' ? data : JSON.stringify(data);

    spectators.forEach((targetRoom, client) => {
        if (client && client.readyState === 1 && targetRoom === roomID) {
            try {
                client.send(message);
            } catch (err) {
                console.error("Spectator broadcast send error:", err.message);
            }
        }
    });
}

/**
 * Handles spectator-only chat (spectators talk without interfering with players)
 */
function handleSpectatorChat(ws, text) {
    if (!ws) return;
    const room = spectators.get(ws);
    if (!room) return;

    const senderName = ws.playerName || 'Gast';
    const chatData = {
        type: 'chat',
        sender: `👁️ [Beobachter] ${senderName}`,
        text: text,
        isSpectatorChat: true
    };

    broadcastToSpectators(chatData, room);
}

/**
 * Gets spectator count for a specific room
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
