const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');
code = code.replace(/const ghostNames = \[.*?\];/, `const ghostNames = [
    "luca_99", "SchachMatt123", "JulianB", "Felix_M", "Anna_Chess", "alex88", "MariusK", "PawnStar", "max_gamer", "Lena_22", 
    "simon_p", "david_91", "kevin_pro", "sarah_k", "tim_123", "jan_schach", "peter_pan", "lara_croft", "michael_m", "tobias_k", 
    "stephan_b", "chris_99", "julia_s", "lisa_m", "marcel_x", "dennis_d", "philipp_r", "johannes_h", "matthias_w", "christian_g",
    "BulletKing", "blitz_god", "rapid_master", "slow_thinker", "aggressor_99", "defend_pro", "tactics_fan", "endgame_boss"
];`);
fs.writeFileSync('server.js', code);
