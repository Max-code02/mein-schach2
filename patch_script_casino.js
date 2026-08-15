const fs = require('fs');
let code = fs.readFileSync('script.js', 'utf8');

const adminElixirUpdateRegex = /html \+\= '<span style="color: #d2b4de;">⏱️ ' \+ p\.timeControl \+ '<\/span>';/;
const replacementAdmin = `html += '<div style="display: flex; gap: 10px;"><span style="color: #d2b4de;">⏱️ ' + p.timeControl + '</span>' + (p.bet > 0 ? '<span style="color: #e67e22;">💰 ' + p.bet + '</span>' : '') + '</div>';`;
code = code.replace(adminElixirUpdateRegex, replacementAdmin);

const findRandomRegex = /socket\.send\(JSON\.stringify\(\{ type: 'find_random', playerName: getMyName\(\), timeControl: timeControl, variant: variant \}\)\);/;
const replaceRandomVariant = `socket.send(JSON.stringify({ type: 'find_random', playerName: getMyName(), timeControl: timeControl, variant: variant, bet: window.casinoBet || 0 }));`;
code = code.replace(findRandomRegex, replaceRandomVariant);

const findRandomRegex2 = /socket\.send\(JSON\.stringify\(\{ type: 'find_random', playerName: getMyName\(\), timeControl: timeControl \}\)\);/;
const replaceRandom2 = `socket.send(JSON.stringify({ type: 'find_random', playerName: getMyName(), timeControl: timeControl, bet: window.casinoBet || 0 }));`;
code = code.replace(findRandomRegex2, replaceRandom2);

const jsAdditions = `
window.casinoBet = 0;
window.setCasinoBet = function(amount) {
    window.casinoBet = amount;
    document.getElementById('current-bet-display').innerText = amount + ' Coins';
    
    // Update active class on buttons
    const btns = document.querySelectorAll('.casino-bet-btn');
    btns.forEach(btn => btn.classList.remove('active-bet'));
    
    const targetBtn = Array.from(btns).find(b => parseInt(b.innerText) === amount || (amount===1000 && b.innerText.includes('1000')));
    if (targetBtn) targetBtn.classList.add('active-bet');
};
`;

code += "\n" + jsAdditions;

fs.writeFileSync('script.js', code);
console.log("Patched script.js for Casino logic");
