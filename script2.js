// script2.js - Account & Leaderboard Management

// 1. Demo-Modus (Das automatische Schachspiel im Hintergrund)
const demoMoves = [
    { from: 'e2', to: 'e4' }, { from: 'e7', to: 'e5' },
    { from: 'g1', to: 'f3' }, { from: 'b8', to: 'c6' },
    { from: 'f1', to: 'b5' }, { from: 'a7', to: 'a6' },
    { from: 'b5', to: 'a4' }, { from: 'g8', to: 'f6' }
];
let demoInterval;
let moveIndex = 0;

function startDemo() {
    if (!window.makeMove) {
        setTimeout(startDemo, 500);
        return;
    }
    demoInterval = setInterval(() => {
        if (moveIndex < demoMoves.length) {
            const move = demoMoves[moveIndex];
            window.makeMove(move.from, move.to);
            moveIndex++;
        } else {
            moveIndex = 0;
            if (window.resetGame) window.resetGame();
        }
    }, 1800);
}

// 2. AGB & Start-Logik
window.addEventListener('load', () => {
    if (!localStorage.getItem('agbAkzeptiert')) {
        const popup = document.getElementById('agb-popup');
        if (popup) popup.style.display = 'flex';
        setTimeout(startDemo, 1000);
    }
});

window.acceptAGB = function() {
    if (demoInterval) clearInterval(demoInterval);
    localStorage.setItem('agbAkzeptiert', 'true');
    const popup = document.getElementById('agb-popup');
    if (popup) popup.style.display = 'none';
    if (window.resetGame) window.resetGame();
};

// 3. Account speichern / Login / Registrierung
function handleSaveAccount() {
    const nameEl = document.getElementById('playerName');
    const passEl = document.getElementById('playerPass');
    const status = document.getElementById('save-status');

    const name = nameEl ? nameEl.value.trim() : '';
    const pass = passEl ? passEl.value : '';

    if (!name || !pass) {
        if (status) status.innerHTML = "<span style='color: #ff4444;'>❌ bitte Name & Passwort eingeben!</span>";
        return;
    }

    if (status) status.innerHTML = "<span style='color: #3498db;'>⏳ Synchronisiere...</span>";

    let hashedPass = pass;
    if (typeof CryptoJS !== 'undefined' && CryptoJS.SHA256) {
        hashedPass = CryptoJS.SHA256(pass).toString();
    }

    const ws = window.socket || (typeof socket !== 'undefined' ? socket : null);

    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'login_attempt',
            playerName: name,
            password: hashedPass
        }));
    } else {
        // HTTP API Fallback
        const apiBaseUrl = window.apiBase || (window.location.hostname.includes('github.io') ? 'https://mein-schach2.onrender.com' : '');
        fetch(`${apiBaseUrl}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: name, password: hashedPass })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                if (status) status.innerHTML = "<span style='color: #00ff00;'>✅ Profil gesichert!</span>";
                localStorage.setItem('playerName', name);
            } else {
                if (status) status.innerHTML = "<span style='color: #ff4444;'>❌ " + (data.error || "Fehler") + "</span>";
            }
        })
        .catch(() => {
            if (status) status.innerHTML = "<span style='color: #ff4444;'>❌ Netzwerk-Fehler</span>";
        });
    }
}

// Attach event handlers
window.addEventListener('load', () => {
    const saveBtn = document.getElementById('saveAccountBtn');
    if (saveBtn) {
        saveBtn.onclick = handleSaveAccount;
    }

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
                        localStorage.setItem('playerName', data.name);
                    } else if (data.type === 'login_error') {
                        const status = document.getElementById('save-status');
                        if (status) status.innerHTML = "<span style='color: #ff4444;'>❌ " + (data.text || "Fehler") + "</span>";
                    }
                } catch(err) {}
            });
        }
    }, 500);
});
