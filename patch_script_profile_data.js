const fs = require('fs');
let script = fs.readFileSync('script.js', 'utf8');

const handler = `
        if (data.type === 'player_profile_data') {
            document.getElementById('ppm-elo').textContent = "Elo: " + (data.elo || 1200);
            document.getElementById('ppm-level').textContent = "Level: " + (data.level || 1);
            document.getElementById('ppm-role').textContent = "Rolle: " + (data.role || 'Gast');
            
            const histEl = document.getElementById('ppm-history');
            if (data.recentWins && data.recentWins.length > 0) {
                histEl.innerHTML = data.recentWins.map(w => {
                    const dateStr = new Date(w.time).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
                    return '<div style="background:rgba(255,255,255,0.05); padding:8px; border-radius:5px; font-size:0.9em;">' +
                           '<div style="color:#2ecc71; font-weight:bold;">Sieg vs ' + (w.opp || 'Unbekannt') + '</div>' +
                           '<div style="color:#aaa; font-size:0.8em;">' + dateStr + ' - ' + w.reason + '</div>' +
                           '</div>';
                }).join('');
            } else {
                histEl.innerHTML = '<div style="color:#888; font-style:italic;">Keine Siege gefunden.</div>';
            }
            return;
        }
`;

script = script.replace(/if \(data\.type === 'lobby_joined'\) \{/, handler + "\n        if (data.type === 'lobby_joined') {");

fs.writeFileSync('script.js', script);
