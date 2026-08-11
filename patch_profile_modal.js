const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

const modalHtml = `
    <!-- Player Profile Modal -->
    <div id="player-profile-modal" style="display:none; position:fixed; z-index:10000; left:0; top:0; width:100%; height:100%; background:rgba(0,0,0,0.8); backdrop-filter:blur(5px); justify-content:center; align-items:center;">
        <div style="background:#1a1a1a; padding:20px; border-radius:15px; border:1px solid #444; max-width:500px; width:90%; max-height:80vh; overflow-y:auto;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                <h2 id="ppm-name" style="margin:0; color:#f1c40f;">Spielername</h2>
                <button onclick="document.getElementById('player-profile-modal').style.display='none'" class="glass-btn" style="background:#e74c3c;">X</button>
            </div>
            <div style="display:flex; gap:10px; margin-bottom:15px; color:#ccc;">
                <span id="ppm-elo">Elo: 1200</span> | <span id="ppm-level">Level: 1</span> | <span id="ppm-role">Gast</span>
            </div>
            <h3 style="margin-bottom:10px;">🏆 Sieges-Historie</h3>
            <div id="ppm-history" style="display:flex; flex-direction:column; gap:8px;">
                <div style="color:#888; font-style:italic;">Lädt...</div>
            </div>
        </div>
    </div>
`;

if (!html.includes('id="player-profile-modal"')) {
    html = html.replace('</body>', modalHtml + '\n</body>');
}

fs.writeFileSync('index.html', html);
