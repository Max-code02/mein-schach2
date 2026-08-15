const fs = require('fs');
let code = fs.readFileSync('script.js', 'utf8');

const regex = /if \(profileStats\) profileStats\.innerText = \`Elo: \$\{data\.elo \|\| 1200\} \| Siege: \$\{data\.wins \|\| 0\}\`;/;
const replacement = `if (profileStats) profileStats.innerText = \`Elo: \$\{data.elo || 1200\} | Siege: \$\{data.wins || 0\}\`;
                const profileCoins = document.getElementById('profile-coins');
                if (profileCoins) profileCoins.innerText = '🏦 Coins: ' + (data.coins !== undefined ? data.coins : 1000);`;

if (code.match(regex)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('script.js', code);
    console.log("Patched COBOL UI Script!");
} else {
    console.log("Regex not found in script.js!");
}
