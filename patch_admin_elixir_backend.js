const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const target = "const q = elixirMatchQueue.map(p => ({ playerName: p.playerName, timeControl: p.timeControl }));";
const replacement = "const q = elixirMatchQueue.map(p => ({ playerName: p.playerName, timeControl: p.timeControl, bet: p.bet || 0 }));";
code = code.replace(target, replacement);

fs.writeFileSync('server.js', code);
console.log("Patched get_admin_elixir");
