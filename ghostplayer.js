// ghostplayer.js - SAUBERE SCHACH-KI & BOT-ENGINE (KEINE FAKE-SPIELER)
const engine = require('./engineWorker.js');

// Klare, ehrliche Bot-Persönlichkeiten für das Training gegen den Computer (KI)
const BOT_PERSONALITIES = {
    "SchachBot (KI)": {
        "title": "SchachBot (KI)",
        "difficulty": "Medium",
        "speedPreference": "normal",
        "playstyle": "balanced",
        "aggressiveness": 0.5,
        "chatFrequency": 0.05,
        "messages": {
            "greetings": ["🤖 Hallo! Ich bin dein Schach-Trainingsbot. Viel Erfolg!", "🤖 Runde gestartet! Auf eine gute Partie."],
            "thinking": ["🤖 Berechne Züge...", "🤖 Analysiere Position..."],
            "aggressive": ["🤖 Taktischer Angriff!", "🤖 Dynamischer Zug."],
            "defensive": ["🤖 Solide Verteidigung."],
            "check": ["🤖 Schach!"],
            "endgame": ["🤖 Übergang ins Endspiel."],
            "defeat": ["🤖 Gut gespielt! Gratulation zum Sieg.", "🤖 Schachmatt! Starke Leistung."],
            "victory": ["🤖 Schachmatt! Danke für die Partie.", "🤖 Gutes Spiel! Weiter so beim Üben."]
        }
    },
    "AnfängerBot (KI)": {
        "title": "AnfängerBot (KI)",
        "difficulty": "Easy",
        "speedPreference": "normal",
        "playstyle": "defensive",
        "aggressiveness": 0.3,
        "chatFrequency": 0.05,
        "messages": {
            "greetings": ["🤖 Hallo! Ich spiele auf Einsteiger-Niveau. Lass uns lernen!", "🤖 Viel Spaß!"],
            "thinking": ["🤖 Hmm, mal sehen..."],
            "aggressive": ["🤖 Ich probiere einen Zug."],
            "defensive": ["🤖 Figur gesichert."],
            "check": ["🤖 Schach!"],
            "endgame": ["🤖 Endspiel beginnt."],
            "defeat": ["🤖 Glückwunsch! Das hast du super gelöst.", "🤖 Toller Sieg für dich!"],
            "victory": ["🤖 Gut gekämpft! Gleich nochmal?"]
        }
    },
    "MeisterBot (KI)": {
        "title": "MeisterBot (KI)",
        "difficulty": "Hard",
        "speedPreference": "fast",
        "playstyle": "aggressive",
        "aggressiveness": 0.85,
        "chatFrequency": 0.05,
        "messages": {
            "greetings": ["🤖 Meister-KI bereit. Zeig dein bestes Schach!", "🤖 Meister-Algorithmus aktiv."],
            "thinking": ["🤖 Tiefe Berechnung läuft..."],
            "aggressive": ["🤖 Druck im Zentrum."],
            "defensive": ["🤖 Ausgeglichen."],
            "check": ["🤖 Schach."],
            "endgame": ["🤖 Präzises Endspiel."],
            "defeat": ["🤖 Beeindruckend! Ausgezeichnet gespielt.", "🤖 Chapeau, meisterhaft."],
            "victory": ["🤖 Schachmatt. Sehr lehrreiche Partie."]
        }
    },
    "SofortBot": {
        "title": "SofortBot (KI)",
        "difficulty": "Instant",
        "speedPreference": "instant",
        "playstyle": "aggressive",
        "aggressiveness": 0.85,
        "chatFrequency": 0.05,
        "messages": {
            "greetings": ["⚡ SofortBot bereit!", "Blitzschnell am Start!"],
            "thinking": ["Zack!"],
            "aggressive": ["Schlag!"],
            "defensive": ["Weiter!"],
            "check": ["Schach!"],
            "endgame": ["Endspiel!"],
            "defeat": ["Gutes Spiel! GG!", "Respekt, gg!"],
            "victory": ["GG!", "Danke für die schnelle Runde!"]
        }
    },
    "FlashBot": {
        "title": "FlashBot (KI)",
        "difficulty": "Instant",
        "speedPreference": "instant",
        "playstyle": "aggressive",
        "aggressiveness": 0.9,
        "chatFrequency": 0.05,
        "messages": {
            "greetings": ["⚡ Speed-Schach Bot!", "Blitz-Partie aktiv!"],
            "thinking": ["Sofortzug!"],
            "aggressive": ["Attacke!"],
            "defensive": ["Gleich weiter!"],
            "check": ["Schach!"],
            "endgame": ["Endphase!"],
            "defeat": ["GG WP!", "Stark gespielt!"],
            "victory": ["GG!", "Schachmatt, gut gespielt!"]
        }
    }
};

// Fallback wenn unbekannter Bot-Name
function getBotProfile(name) {
    if (BOT_PERSONALITIES[name]) return BOT_PERSONALITIES[name];
    for (const key of Object.keys(BOT_PERSONALITIES)) {
        if (name && name.toLowerCase().includes(key.toLowerCase().split(' ')[0])) {
            return BOT_PERSONALITIES[key];
        }
    }
    return BOT_PERSONALITIES["SchachBot (KI)"];
}

/**
 * Begrüßung beim Bot-Spielstart
 */
function handleGhostGreeting(ws, botName) {
    const profile = getBotProfile(botName);
    const list = profile.messages.greetings;
    const spruch = list[Math.floor(Math.random() * list.length)];

    setTimeout(() => {
        if (ws && ws.readyState === 1) {
            ws.send(JSON.stringify({ 
                 type: 'chat', 
                 text: spruch, 
                 sender: profile.title, 
                 system: false 
             }));
        }
    }, 800 + Math.random() * 600);
}

/**
 * Einfache Stellungsbewertung für Bot-Zugauswahl
 */
function evaluateMove(move, board, color, profile) {
    let score = 0;
    const pieceValues = { 'p': 10, 'n': 30, 'b': 30, 'r': 50, 'q': 90, 'k': 1000 };

    if (move.capture) {
        const capturedPiece = move.captured || 'p';
        score += (pieceValues[capturedPiece.toLowerCase()] || 10) * 1.5;
        if (profile.playstyle === 'aggressive') score += 10;
    }
    
    if (move.check || move.isCheck) {
        score += 25;
        if (profile.playstyle === 'aggressive') score += 15;
    }
    
    if (move.isCastle) {
        score += 35; 
        if (profile.playstyle === 'defensive') score += 20;
    }

    // Zentrums-Bonus
    if (move.tr >= 2 && move.tr <= 5 && move.tc >= 2 && move.tc <= 5) {
        score += 15;
    }

    return score;
}

/**
 * Die Hauptfunktion für den Bot-Zug
 */
function handleGhostMove(ws, board, color, botName, timeControl = "10+0") {
    try {
        const profile = getBotProfile(botName);
        
        // Nutzt vorhandenen engineWorker
        const moves = engine.generateMoves(board, color);

        if (!moves || moves.length === 0) {
            const defeatMsg = profile.messages.defeat[Math.floor(Math.random() * profile.messages.defeat.length)];
            if (ws && ws.readyState === 1) {
                ws.send(JSON.stringify({ 
                     type: 'chat', 
                     text: defeatMsg, 
                     sender: profile.title, 
                     system: false 
                 }));
            }
            return;
        }

        // Bewerten & Sortieren der Züge
        const scoredMoves = moves.map(m => ({
            move: m,
            score: evaluateMove(m, board, color, profile) + (Math.random() * 10 - 5)
        }));

        scoredMoves.sort((a, b) => b.score - a.score);

        // Zugauswahl basierend auf Schwierigkeit
        let chosenMove = null;
        if (profile.difficulty === 'Instant' || profile.difficulty === 'Hard') {
            chosenMove = scoredMoves[0].move;
        } else if (profile.difficulty === 'Medium') {
            const topMoves = scoredMoves.slice(0, Math.min(3, scoredMoves.length));
            chosenMove = topMoves[Math.floor(Math.random() * topMoves.length)].move;
        } else {
            // Easy
            const topMoves = scoredMoves.slice(0, Math.min(5, scoredMoves.length));
            chosenMove = topMoves[Math.floor(Math.random() * topMoves.length)].move;
        }

        // Realistische Bedenkzeit berechnen
        let thinkingTime = 400;
        if (profile.speedPreference === 'instant') {
            thinkingTime = Math.floor(Math.random() * 150) + 100;
        } else if (profile.speedPreference === 'fast') {
            thinkingTime = Math.floor(Math.random() * 400) + 300;
        } else {
            thinkingTime = Math.floor(Math.random() * 700) + 500;
        }

        // Gelegentlicher kurzer Bot-Kommentar
        if (Math.random() < profile.chatFrequency) {
            let msgType = 'thinking';
            if (chosenMove.capture) msgType = 'aggressive';
            else if (chosenMove.check || chosenMove.isCheck) msgType = 'check';

            const pool = profile.messages[msgType] || profile.messages.thinking;
            const chatText = pool[Math.floor(Math.random() * pool.length)];

            setTimeout(() => {
                if (ws && ws.readyState === 1) {
                    ws.send(JSON.stringify({
                        type: 'chat',
                        text: chatText,
                        sender: profile.title,
                        system: false
                    }));
                }
            }, Math.floor(thinkingTime * 0.4));
        }

        setTimeout(() => {
            if (ws && ws.readyState === 1) {
                const p = (board && board[chosenMove.fr]) ? board[chosenMove.fr][chosenMove.fc] : 'p';
                ws.send(JSON.stringify({
                    type: 'move',
                    fr: chosenMove.fr,
                    fc: chosenMove.fc,
                    tr: chosenMove.tr,
                    tc: chosenMove.tc,
                    move: chosenMove,
                    piece: p,
                    sender: profile.title,
                    turn: color === 'white' ? 'black' : 'white',
                    nextTurn: color === 'white' ? 'black' : 'white',
                    board: board 
                 }));
            }
        }, thinkingTime);

    } catch (err) {
        console.error("❌ Fehler in BotEngine handleGhostMove:", err);
    }
}

module.exports = { handleGhostMove, handleGhostGreeting, BOT_PERSONALITIES, getBotProfile };
