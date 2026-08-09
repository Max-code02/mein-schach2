const fs = require('fs');

const names = ["luca_99", "SchachMatt123", "JulianB", "Felix_M", "Anna_Chess", "alex88", "MariusK", "PawnStar", "max_gamer", "Lena_22", "simon_p", "david_91", "kevin_pro", "sarah_k", "tim_123", "jan_schach", "peter_pan", "lara_croft", "michael_m", "tobias_k", "stephan_b", "chris_99", "julia_s", "lisa_m", "marcel_x", "dennis_d", "philipp_r", "johannes_h", "matthias_w", "christian_g"];

let personalities = {};

for (const name of names) {
    personalities[name] = {
        title: name,
        difficulty: (Math.random() > 0.8) ? "Grandmaster" : "Medium",
        aggressiveness: 0.3 + Math.random() * 0.6,
        chatFrequency: 0.2 + Math.random() * 0.4,
        messages: {
            greetings: [
                "moin", "hallo", "hi", "hi gl hf", "viel glück", "auf ein gutes spiel", "servus", "hey"
            ],
            thinking: [
                "hmm", "uff", "schwierig", "mal schauen", "interessant", "muss kurz nachdenken", "schwere stellung"
            ],
            aggressive: [
                "bam!", "den nehm ich", "ups", "angriff!", "danke", "nice"
            ],
            defensive: [
                "knapp", "gut gespielt", "phew", "oh man", "mist", "verteidigen ist schwer"
            ],
            check: [
                "schach", "schach!", "schach :p", "achtung schach"
            ],
            endgame: [
                "spannend", "gg coming up", "endspiel zeit", "jetzt wirds ernst"
            ],
            defeat: [
                "gg wp!", "respekt, gut gespielt", "ah mist, gg", "gg", "gut gespielt, danke", "ggs"
            ],
            victory: [
                "gg", "danke fürs spiel", "schachmatt gg", "ggs", "gut gespielt"
            ]
        }
    };
}

let code = fs.readFileSync('ghostplayer.js', 'utf8');

// Replace the old BOT_PERSONALITIES
const newDictStr = JSON.stringify(personalities, null, 4);
code = code.replace(/const BOT_PERSONALITIES = \{[\s\S]*?\};\n\n\/\*\*/, `const BOT_PERSONALITIES = ${newDictStr};\n\n/**`);

// Fix handleGhostGreeting signature
code = code.replace(/function handleGhostGreeting\(ws, botName = "Grandmaster_Ghost"\)/, 'function handleGhostGreeting(ws, botName)');
code = code.replace(/BOT_PERSONALITIES\[botName\] \|\| BOT_PERSONALITIES\["default_user"\];/g, 'BOT_PERSONALITIES[botName] || BOT_PERSONALITIES["luca_99"];');

// Fix handleGhostMove signature
code = code.replace(/function handleGhostMove\(ws, board, color, botName = "Grandmaster_Ghost"\)/, 'function handleGhostMove(ws, board, color, botName)');

// Remove console.logs that give away it's a ghost
code = code.replace(/console\.log\(\`\[GhostEngine\].*?\);\n/g, '');
code = code.replace(/console\.log\("🏳️ Ghost.*?\);\n/g, '');
code = code.replace(/console\.log\(\`✅ Ghost.*?\);\n/g, '');

fs.writeFileSync('ghostplayer.js', code);
