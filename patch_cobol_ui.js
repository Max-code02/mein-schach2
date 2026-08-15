const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const statsRegex = /<div id="profile-stats" style="font-size: 0\.9em; color: #ccc;">Elo: 1200 \| Siege: 0<\/div>/;
const statsReplacement = `<div id="profile-stats" style="font-size: 0.9em; color: #ccc;">Elo: 1200 | Siege: 0</div>
                            <div id="profile-coins" style="font-size: 1.1em; color: #2ecc71; font-weight: bold; background: rgba(46,204,113,0.1); padding: 4px 12px; border-radius: 20px; border: 1px solid rgba(46,204,113,0.3); margin-top: 5px;" title="COBOL Bank Coins">🏦 Coins: 1000</div>`;

if (html.match(statsRegex)) {
    html = html.replace(statsRegex, statsReplacement);
    fs.writeFileSync('index.html', html);
    console.log("Patched COBOL UI in index.html!");
} else {
    console.log("Could not find regex!");
}
