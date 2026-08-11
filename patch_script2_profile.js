const fs = require('fs');

let script2 = fs.readFileSync('script2.js', 'utf8');

script2 = script2.replace(/<div style="background: \$\{bg\}; padding: 12px;/g,
    `<div onclick="viewPlayerProfile('\${p.name}')" style="cursor: pointer; background: \${bg}; padding: 12px;`);

script2 += `
window.viewPlayerProfile = function(name) {
    document.getElementById('player-profile-modal').style.display = 'flex';
    document.getElementById('ppm-name').textContent = name;
    document.getElementById('ppm-history').innerHTML = '<div style="color:#888; font-style:italic;">Lädt...</div>';
    
    if (window.socket && window.socket.readyState === WebSocket.OPEN) {
        window.socket.send(JSON.stringify({
            type: 'get_player_profile',
            username: name
        }));
    }
};
`;

fs.writeFileSync('script2.js', script2);
