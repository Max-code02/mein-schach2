const fs = require('fs');

const names = [
    "luca_99", "SchachMatt123", "JulianB", "Felix_M", "Anna_Chess", "alex88", "MariusK", "PawnStar", "max_gamer", "Lena_22", 
    "simon_p", "david_91", "kevin_pro", "sarah_k", "tim_123", "jan_schach", "peter_pan", "lara_croft", "michael_m", "tobias_k", 
    "stephan_b", "chris_99", "julia_s", "lisa_m", "marcel_x", "dennis_d", "philipp_r", "johannes_h", "matthias_w", "christian_g",
    "BulletKing", "blitz_god", "rapid_master", "slow_thinker", "aggressor_99", "defend_pro", "tactics_fan", "endgame_boss"
];

let personalities = {};

for (const name of names) {
    let diff = (Math.random() > 0.7) ? "Grandmaster" : "Medium";
    let speedPref = "balanced";
    let r = Math.random();
    if (r < 0.2) speedPref = "bullet";
    else if (r < 0.5) speedPref = "blitz";
    else if (r < 0.7) speedPref = "rapid";

    let playstyle = "balanced";
    if (name.includes("aggressor") || Math.random() < 0.2) playstyle = "aggressive";
    else if (name.includes("defend") || Math.random() < 0.2) playstyle = "defensive";

    personalities[name] = {
        title: name,
        difficulty: diff,
        speedPreference: speedPref,
        playstyle: playstyle,
        aggressiveness: playstyle === 'aggressive' ? 0.9 : (playstyle === 'defensive' ? 0.3 : 0.5 + Math.random() * 0.3),
        chatFrequency: 0.1 + Math.random() * 0.3,
        messages: {
            greetings: ["moin", "hallo", "hi", "hi gl hf", "viel glück", "auf ein gutes spiel", "servus", "hey", "let's go"],
            thinking: ["hmm", "uff", "schwierig", "mal schauen", "interessant", "muss kurz nachdenken", "schwere stellung", "was spiel ich da..."],
            aggressive: ["bam!", "den nehm ich", "ups", "angriff!", "danke", "nice", "schach und matt bald", "taktik!"],
            defensive: ["knapp", "gut gespielt", "phew", "oh man", "mist", "verteidigen ist schwer", "starker angriff"],
            check: ["schach", "schach!", "schach :p", "achtung schach"],
            endgame: ["spannend", "gg coming up", "endspiel zeit", "jetzt wirds ernst"],
            defeat: ["gg wp!", "respekt, gut gespielt", "ah mist, gg", "gg", "gut gespielt, danke", "ggs", "wow, stark"],
            victory: ["gg", "danke fürs spiel", "schachmatt gg", "ggs", "gut gespielt", "war knapp"]
        }
    };
}

const newDictStr = JSON.stringify(personalities, null, 4);

const newCode = `// ghostplayer.js - ULTIMATIVE GHOST-KI ENGINE & BOT-PERSONALITIES
const engine = require('./engineWorker.js');

// Bot-Persönlichkeiten mit individueller Spielweise und Chat-Profilen
const BOT_PERSONALITIES = ${newDictStr};

/**
 * Begrüßung beim Spielstart
 */
function handleGhostGreeting(ws, botName) {
    const profile = BOT_PERSONALITIES[botName] || BOT_PERSONALITIES["luca_99"];
    const list = profile.messages.greetings;
    const spruch = list[Math.floor(Math.random() * list.length)];

    setTimeout(() => {
        if (ws && ws.readyState === 1) {
            ws.send(JSON.stringify({ 
                 type: 'chat', 
                 text: spruch, 
                 sender: botName, 
                 system: false 
             }));
        }
    }, 1200 + Math.random() * 800);
}

/**
 * Einfache Stellungsbewertung für kluge Zugauswahl
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
 * Die Hauptfunktion für den Ghost-Player Zug
 */
function handleGhostMove(ws, board, color, botName, timeControl = "10+0") {
    try {
        const profile = BOT_PERSONALITIES[botName] || BOT_PERSONALITIES["luca_99"];
        
        // Nutzt vorhandenen engineWorker
        const moves = engine.generateMoves(board, color);

        if (!moves || moves.length === 0) {
            const defeatMsg = profile.messages.defeat[Math.floor(Math.random() * profile.messages.defeat.length)];
            if (ws && ws.readyState === 1) {
                ws.send(JSON.stringify({ 
                     type: 'chat', 
                     text: defeatMsg, 
                     sender: botName, 
                     system: false 
                 }));
            }
            return;
        }

        // Bewerten & Sortieren der Züge
        const scoredMoves = moves.map(m => ({ move: m, score: evaluateMove(m, board, color, profile) }));
        scoredMoves.sort((a, b) => b.score - a.score);

        // Zug-Auswahl mit realistischer menschlicher Streuung
        let chosenMove;
        if (profile.difficulty === "Grandmaster") {
            const topCandidates = scoredMoves.slice(0, Math.min(2, scoredMoves.length));
            chosenMove = topCandidates[Math.floor(Math.random() * topCandidates.length)].move;
        } else {
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
            const typingSpeed = 200 + Math.random() * 500;
            setTimeout(() => {
                if (ws && ws.readyState === 1) {
                    ws.send(JSON.stringify({ 
                         type: 'chat', 
                         text: spruch, 
                         sender: botName, 
                         system: false 
                     }));
                }
            }, typingSpeed);
        }

        // Parse Time Control
        let minutes = 10;
        if (timeControl.includes('+')) {
            minutes = parseInt(timeControl.split('+')[0]) || 10;
        }
        
        // Variable Reaktions- & Bedenkzeit based on Time Control and Speed Preference
        let baseThinkingTime = 800;
        let randThinkingTime = 1500;
        
        if (minutes <= 1) { // Bullet
            baseThinkingTime = 100;
            randThinkingTime = 300;
        } else if (minutes <= 3) { // Blitz
            baseThinkingTime = 300;
            randThinkingTime = 700;
        } else if (minutes <= 5) {
            baseThinkingTime = 500;
            randThinkingTime = 1000;
        } else { // Rapid / Classic
            baseThinkingTime = 1000;
            randThinkingTime = 2000;
        }
        
        if (profile.speedPreference === 'bullet') {
            baseThinkingTime *= 0.6;
            randThinkingTime *= 0.6;
        } else if (profile.speedPreference === 'rapid') {
            baseThinkingTime *= 1.3;
            randThinkingTime *= 1.3;
        }

        let complexityBonus = moves.length * (minutes <= 3 ? 5 : 15);
        let thinkingTime = baseThinkingTime + Math.random() * randThinkingTime + complexityBonus;

        if (chosenMove.capture) thinkingTime += (minutes <= 3 ? 100 : 300);
        
        // Ensure minimum delay so UI doesn't glitch
        thinkingTime = Math.max(thinkingTime, 150);

        setTimeout(() => {
            if (ws && ws.readyState === 1) {
                ws.send(JSON.stringify({
                    type: 'move',
                    move: chosenMove,
                    sender: botName,
                    nextTurn: color === 'white' ? 'black' : 'white',
                    board: board 
                 }));
            }
        }, thinkingTime);

    } catch (err) {
        console.error("❌ Fehler in GhostEngine handleGhostMove:", err);
    }
}

module.exports = { handleGhostMove, handleGhostGreeting, BOT_PERSONALITIES };
`;

fs.writeFileSync('ghostplayer.js', newCode);
