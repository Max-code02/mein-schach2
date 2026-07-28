import re

with open('script2.js', 'r') as f:
    content = f.read()

# Replace loadLeaderboard
content = re.sub(
    r"async function loadLeaderboard\(\) \{[\s\S]*?\}",
    """function loadLeaderboard() {
    // handled by WebSocket now
}""",
    content
)

# Replace saveAccountBtn click listener
content = re.sub(
    r"saveBtn\.addEventListener\('click', async \(\) => \{[\s\S]*?\}\);",
    """saveBtn.addEventListener('click', () => {
        const name = document.getElementById('playerName').value;
        const pass = document.getElementById('playerPass').value;
        const status = document.getElementById('save-status');

        if (!name || !pass) {
            status.innerHTML = "<span style='color: #ff4444;'>❌ Felder leer!</span>";
            return;
        }

        status.innerText = "⏳ Synchronisiere...";
        const hashedPass = CryptoJS.SHA256(pass).toString();

        if (window.socket && window.socket.readyState === WebSocket.OPEN) {
            window.socket.send(JSON.stringify({ 
                type: 'login_attempt', 
                playerName: name, 
                password: hashedPass 
            }));
        } else if (typeof socket !== 'undefined' && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ 
                type: 'login_attempt', 
                playerName: name, 
                password: hashedPass 
            }));
        } else {
            status.innerHTML = "<span style='color: #ff4444;'>❌ Keine Verbindung zum Server</span>";
        }
    });""",
    content
)

content += """
// Listen for messages from server for leaderboard and login
if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        setTimeout(() => {
            const ws = window.socket || (typeof socket !== 'undefined' ? socket : null);
            if (ws) {
                ws.addEventListener('message', (e) => {
                    try {
                        const data = JSON.parse(e.data);
                        if (data.type === 'leaderboard') {
                            const listEl = document.getElementById('leaderboard-list');
                            if (listEl && data.list) {
                                listEl.innerHTML = data.list.map((p, i) => `
                                    <div style="background: rgba(255,255,255,0.05); padding: 8px; border-radius: 8px; margin-bottom: 8px; border: 1px solid rgba(255,255,255,0.1); display: flex; flex-direction: column;">
                                        <div style="display: flex; justify-content: space-between; align-items: center;">
                                            <div style="display: flex; align-items: center; gap: 8px;">
                                                <span style="color: #888; font-size: 0.8em;">#${i + 1}</span>
                                                <strong style="color: white;">${p.name}</strong>
                                            </div>
                                            <span style="color: #f1c40f; font-size: 0.9em;">${p.wins || 0} 🏆</span>
                                        </div>
                                    </div>
                                `).join('');
                            }
                        } else if (data.type === 'login_success') {
                            const status = document.getElementById('save-status');
                            if (status) status.innerHTML = "<span style='color: #00ff00;'>✅ Profil gesichert!</span>";
                            if (window.myName !== undefined) window.myName = data.name;
                        } else if (data.type === 'login_error') {
                            const status = document.getElementById('save-status');
                            if (status) status.innerHTML = "<span style='color: #ff4444;'>❌ " + (data.text || "Fehler") + "</span>";
                        }
                    } catch(err) {}
                });
            }
        }, 1000);
    });
}
"""

with open('script2.js', 'w') as f:
    f.write(content)
