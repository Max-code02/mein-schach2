// ghostplayer.js - ULTIMATIVE GHOST-KI ENGINE & BOT-PERSONALITIES
const engine = require('./engineWorker.js');

// Bot-Persönlichkeiten mit individueller Spielweise und Chat-Profilen
const BOT_PERSONALITIES = {
    "Grandmaster_Ghost": {
        title: "Grandmaster Ghost 👑",
        difficulty: "Grandmaster",
        aggressiveness: 0.5,
        chatFrequency: 0.3,
        messages: {
            greetings: [
                "Guten Tag! Auf eine hochklassige Schachpartie.",
                "Hallo! Mal sehen, wie gut deine Eröffnungsvorbereitung ist.",
                "Willkommen am Brett! Möge der Bessere gewinnen. 👑",
                "Hi! Schach ist eine Kunst – lass uns ein Meisterwerk schaffen."
            ],
            thinking: [
                "Eine tiefgründige Position...",
                "Interessantes strategisches Motiv.",
                "Hier gibt es mehrere plausible Fortsetzungen.",
                "Positionelle Feinarbeit erforderlich...",
                "Mmh, wie schätze ich die Bauernstruktur ein?"
            ],
            aggressive: [
                "Taktischer Schlag! Ich übernehme die Initiative.",
                "Die Spannung steigt – ich schlage zu!",
                "Konkretes Spiel zahlt sich aus."
            ],
            defensive: [
                "Präzise Verteidigung ist der Schlüssel.",
                "Keine Schwächen zulassen...",
                "Ein solider Konsolidierungszug."
            ],
            check: [
                "Schach! Der König muss weichen. 👑",
                "Direkter Angriff auf deinen Monarch!",
                "Schachgebot – passe gut auf!"
            ],
            endgame: [
                "Das Endspiel erfordert höchste Präzision.",
                "Jetzt entscheidet jede Einzeltempo-Nuance.",
                "Ein klassisches Endspiel entsteht."
            ],
            defeat: [
                "Fantastisch gespielt! Eine wohlverdiente Niederlage für mich. Gratulation! 👏",
                "Ausgezeichnete Partie von dir. Respekt!"
            ],
            victory: [
                "Gutes Spiel! Danke für die lehrreiche Partie.",
                "Schachmatt! Eine spannende Auseinandersetzung."
            ]
        }
    },
    "Ghost_Bot": {
        title: "Ghost Bot 🤖",
        difficulty: "Medium",
        aggressiveness: 0.7,
        chatFrequency: 0.4,
        messages: {
            greetings: [
                "Beep boop! Ghost Bot ist bereit! 🤖",
                "Hi! Lass uns eine schnelle Partie spielen!",
                "Hallo Mensch! Möge der Algorithmus mit uns sein! ⚡"
            ],
            thinking: [
                "Berechne Pfade...",
                "Analyzing moves...",
                "Puh, da muss ich tüfteln...",
                "Soll ich angreifen oder absichern?"
            ],
            aggressive: [
                "Zack! Die Figur nehme ich mit! 💥",
                "Angriff ist die beste Verteidigung!",
                "Vorsicht, Gegenwind kommt!"
            ],
            defensive: [
                "Muss meinen Turm schützen...",
                "Guter Versuch, aber ich blocke!"
            ],
            check: [
                "Schach! 👑 Achtung!",
                "König in Gefahr!",
                "Schach-Gebot!"
            ],
            endgame: [
                "Jetzt geht's um die Wurst!",
                "Endspiel-Modus aktiviert 🚀"
            ],
            defeat: [
                "Oha, du hast mich geschlagen! Gut gemacht! 🎉",
                "Fehler in meiner Matrix... Stark gespielt!"
            ],
            victory: [
                "Schachmatt! Das war eine tolle Runde!",
                "Sieg für die Maschinen! 🤖 GG!"
            ]
        }
    }
};

/**
 * Begrüßung beim Spielstart
 */
function handleGhostGreeting(ws, botName = "Grandmaster_Ghost") {
    const profile = BOT_PERSONALITIES[botName] || BOT_PERSONALITIES["Grandmaster_Ghost"];
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
    }, 1200 + Math.random() * 800);
}

/**
 * Einfache Stellungsbewertung für kluge Zugauswahl
 */
function evaluateMove(move, board, color) {
    let score = 0;
    const pieceValues = { 'p': 10, 'n': 30, 'b': 30, 'r': 50, 'q': 90, 'k': 1000 };

    if (move.capture) {
        const capturedPiece = move.captured || 'p';
        score += (pieceValues[capturedPiece.toLowerCase()] || 10) * 1.5;
    }

    if (move.check || move.isCheck) score += 25;
    if (move.isCastle) score += 35; // Rochade wird belohnt

    // Zentrums-Bonus
    if (move.tr >= 2 && move.tr <= 5 && move.tc >= 2 && move.tc <= 5) {
        score += 15;
    }

    return score;
}

/**
 * Die Hauptfunktion für den Ghost-Player Zug
 */
function handleGhostMove(ws, board, color, botName = "Grandmaster_Ghost") {
    try {
        console.log(`[GhostEngine] ${botName} analysiert die Stellung...`);
        const profile = BOT_PERSONALITIES[botName] || BOT_PERSONALITIES["Grandmaster_Ghost"];

        // Nutzt vorhandenen engineWorker
        const moves = engine.generateMoves(board, color);

        if (!moves || moves.length === 0) {
            console.log("🏳️ Ghost hat keine legalen Züge mehr.");
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
        const scoredMoves = moves.map(m => ({ move: m, score: evaluateMove(m, board, color) }));
        scoredMoves.sort((a, b) => b.score - a.score);

        // Zug-Auswahl mit realistischer menschlicher Streuung
        let chosenMove;
        if (profile.difficulty === "Grandmaster") {
            // GM wählt meistens den besten oder zweitbesten Zug (90% top 2)
            const topCandidates = scoredMoves.slice(0, Math.min(2, scoredMoves.length));
            chosenMove = topCandidates[Math.floor(Math.random() * topCandidates.length)].move;
        } else {
            // Medium Bot wählt unter den besten 4 Zügen
            const topCandidates = scoredMoves.slice(0, Math.min(4, scoredMoves.length));
            chosenMove = topCandidates[Math.floor(Math.random() * topCandidates.length)].move;
        }

        // Contextual Chat Generation
        const chance = Math.random();
        let spruch = "";

        if (chance < profile.chatFrequency) {
            if (chosenMove.check || chosenMove.isCheck) {
                spruch = profile.messages.check[Math.floor(Math.random() * profile.messages.check.length)];
            } else if (chosenMove.capture) {
                spruch = profile.messages.aggressive[Math.floor(Math.random() * profile.messages.aggressive.length)];
            } else if (moves.length < 12) {
                spruch = profile.messages.endgame[Math.floor(Math.random() * profile.messages.endgame.length)];
            } else {
                spruch = profile.messages.thinking[Math.floor(Math.random() * profile.messages.thinking.length)];
            }
        }

        // Sende Chat mit Tipp-Verzögerung
        if (spruch && ws && ws.readyState === 1) {
            const typingSpeed = 400 + Math.random() * 800;
            setTimeout(() => {
                if (ws && ws.readyState === 1) {
                    ws.send(JSON.stringify({ 
                        type: 'chat', 
                        text: spruch, 
                        sender: profile.title, 
                        system: false 
                    }));
                }
            }, typingSpeed);
        }

        // Variable Reaktions- & Bedenkzeit
        let complexityBonus = moves.length * 18;
        let thinkingTime = 800 + Math.random() * 1500 + complexityBonus;
        if (chosenMove.capture) thinkingTime += 300;

        setTimeout(() => {
            if (ws && ws.readyState === 1) {
                ws.send(JSON.stringify({
                    type: 'move',
                    move: chosenMove,
                    sender: botName,
                    nextTurn: color === 'white' ? 'black' : 'white',
                    board: board 
                }));
                console.log(`✅ Ghost (${botName}) gezogen: ${chosenMove.fr},${chosenMove.fc} -> ${chosenMove.tr},${chosenMove.tc}`);
            }
        }, thinkingTime);

    } catch (err) {
        console.error("❌ Fehler in GhostEngine handleGhostMove:", err);
    }
}

module.exports = { handleGhostMove, handleGhostGreeting, BOT_PERSONALITIES };
