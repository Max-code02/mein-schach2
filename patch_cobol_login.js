const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const loginSuccessRegex = /ws\.send\(JSON\.stringify\(\{\s*type: 'login_success',\s*name: playerName,\s*role: user\.role \|\| 'user',\s*elo: user\.elo \|\| 1200,\s*wins: user\.wins \|\| 0,\s*losses: user\.losses \|\| 0,/;

const replacement = `ws.send(JSON.stringify({ 
                    type: 'login_success', 
                    name: playerName, 
                    role: user.role || 'user',
                    elo: user.elo || 1200,
                    wins: user.wins || 0,
                    losses: user.losses || 0,
                    coins: user.coins !== undefined ? user.coins : 1000,`;

if (code.match(loginSuccessRegex)) {
    code = code.replace(loginSuccessRegex, replacement);
    fs.writeFileSync('server.js', code);
    console.log("Patched login_success!");
} else {
    console.log("Could not patch login_success!");
}
