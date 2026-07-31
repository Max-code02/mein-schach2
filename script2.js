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

// 3. Auth Modal Logic
let authMode = 'login';
window.switchAuthTab = function(mode) {
    authMode = mode;
    document.getElementById('tab-login').classList.remove('active');
    document.getElementById('tab-register').classList.remove('active');
    document.getElementById('tab-' + mode).classList.add('active');
    document.getElementById('auth-submit-btn').innerText = mode === 'login' ? 'Einloggen' : 'Registrieren';
    document.getElementById('auth-status').innerHTML = '';
};

window.submitAuth = function() {
    const name = document.getElementById('auth-username').value.trim();
    const pass = document.getElementById('auth-password').value;
    const status = document.getElementById('auth-status');

    if (!name || !pass) {
        status.innerHTML = "<span style='color: #e74c3c;'>❌ Bitte fülle alle Felder aus!</span>";
        return;
    }
    status.innerHTML = "<span style='color: #3498db;'>⏳ Verbinde mit Server...</span>";

    let hashedPass = pass;
    if (typeof CryptoJS !== 'undefined' && CryptoJS.SHA256) {
        hashedPass = CryptoJS.SHA256(pass).toString();
    }

    const ws = window.socket || (typeof socket !== 'undefined' ? socket : null);

    if (ws && ws.readyState === WebSocket.OPEN) {
        // Da der Server momentan nur 'login_attempt' versteht,
        // nutzen wir das für beides, er legt den Account automatisch an wenn er nicht existiert!
        localStorage.setItem('tempPasswordHash', hashedPass);
        ws.send(JSON.stringify({
            type: 'login_attempt',
            playerName: name,
            password: hashedPass,
            isRegister: authMode === 'register'
        }));
    } else {
        const apiBaseUrl = window.apiBase || (window.location.hostname.includes('github.io') ? 'https://mein-schach2.onrender.com' : '');
        fetch(`${apiBaseUrl}/api/${authMode}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: name, password: hashedPass })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                status.innerHTML = "<span style='color: #2ecc71;'>✅ Erfolgreich!</span>";
                localStorage.setItem('playerName', name);
                localStorage.setItem('playerPasswordHash', hashedPass);
                updateProfileDisplay(name, data.elo, data.wins);
                setTimeout(() => { document.getElementById('auth-modal').style.display = 'none'; }, 1000);
            } else {
                status.innerHTML = "<span style='color: #e74c3c;'>❌ " + (data.error || "Fehler") + "</span>";
            }
        })
        .catch(() => {
            status.innerHTML = "<span style='color: #e74c3c;'>❌ Netzwerk-Fehler</span>";
        });
    }
};

function updateProfileDisplay(name, elo, wins, losses = 0, level = 1, xp = 0, achievements = []) {
    const profileName = document.getElementById('profile-name');
    const profileStats = document.getElementById('profile-stats');
    if (profileName) profileName.innerText = name;
    if (profileStats) profileStats.innerText = `Elo: ${elo || 1200} | S: ${wins || 0} N: ${losses || 0}`;
    
    // Auth Button verstecken, wenn eingeloggt
    const authBtn = document.getElementById('openAuthBtn');
    if (authBtn) {
        authBtn.style.display = 'none';
    }

    // Achievements badges freischalten
    if (achievements && Array.isArray(achievements)) {
        // Reset all badges first
        const allBadges = document.querySelectorAll('.achievement-badge');
        allBadges.forEach(b => b.classList.add('locked'));
        
        achievements.forEach(achId => {
            const el = document.getElementById(`badge-${achId}`);
            if (el) {
                el.classList.remove('locked');
            }
        });
    }
}

function showAchievementNotification(title, description) {
    const oldNotif = document.getElementById('achievement-notification');
    if (oldNotif) oldNotif.remove();
    
    const notif = document.createElement('div');
    notif.id = 'achievement-notification';
    notif.innerHTML = `
        <div style="font-size: 2em; animation: pulse 1s infinite;">🏆</div>
        <div>
            <div style="font-weight: bold; color: #f1c40f; font-size: 1.05em; margin-bottom: 2px;">Erfolg freigeschaltet!</div>
            <div style="font-size: 0.95em; font-weight: 600; color: white;">${title}</div>
            <div style="font-size: 0.8em; color: #aaa; margin-top: 1px;">${description}</div>
        </div>
    `;
    
    document.body.appendChild(notif);
    
    // Play a lovely success audio sound!
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        // Beautiful arpeggio chime!
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, osc.frequency.setValueAtTime ? audioCtx.currentTime : 0); // fallback
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.2); // G5
        osc.frequency.setValueAtTime(1046.50, audioCtx.currentTime + 0.3); // C6
        
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
        
        osc.start();
        osc.stop(audioCtx.currentTime + 0.8);
    } catch (e) {
        console.warn("Could not play achievement audio chime:", e);
    }
    
    setTimeout(() => {
        notif.style.animation = 'slideInRight 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) reverse forwards';
        setTimeout(() => notif.remove(), 500);
    }, 4500);
}

window.addEventListener('load', () => {
    const openAuthBtn = document.getElementById('openAuthBtn');
    if (openAuthBtn) {
        openAuthBtn.onclick = () => {
            document.getElementById('auth-modal').style.display = 'flex';
        };
    }

    const savedName = localStorage.getItem('playerName');
    if (savedName) {
        updateProfileDisplay(savedName, 1200, 0); // Will be updated by server
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
                            listEl.innerHTML = data.list.map((p, i) => {
                                let badge = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
                                let color = i === 0 ? '#f1c40f' : i === 1 ? '#bdc3c7' : i === 2 ? '#cd7f32' : 'rgba(255,255,255,0.7)';
                                let bg = i === 0 ? 'linear-gradient(135deg, rgba(241,196,15,0.2) 0%, rgba(0,0,0,0) 100%)' : 'rgba(255,255,255,0.03)';
                                return `
                                <div style="background: ${bg}; padding: 12px; border-radius: 10px; margin-bottom: 8px; border: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: space-between; transition: 0.2s;" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                                    <div style="display: flex; align-items: center; gap: 10px;">
                                        <div style="width: 24px; text-align: center; font-weight: bold; color: ${color}; font-size: 1.1em;">
                                            ${badge || `#${i + 1}`}
                                        </div>
                                        <div style="display: flex; flex-direction: column;">
                                            <strong style="color: white; font-size: 1.05em; text-shadow: 0 1px 3px rgba(0,0,0,0.5);">${p.name}</strong>
                                            <span style="color: #95a5a6; font-size: 0.8em;">Lvl ${p.level || 1} • Elo: ${p.elo || 1200}</span>
                                        </div>
                                    </div>
                                    <div style="text-align: right;">
                                        <div style="color: #f1c40f; font-weight: bold; font-size: 1.1em;">${p.wins || 0} 🏆</div>
                                    </div>
                                </div>
                            `;
                            }).join('');
                        }
                    } else if (data.type === 'login_success') {
                        const status = document.getElementById('auth-status');
                        if (status) status.innerHTML = "<span style='color: #2ecc71;'>✅ Erfolgreich!</span>";
                        localStorage.setItem('playerName', data.name);
                        const tempHash = localStorage.getItem('tempPasswordHash');
                        if (tempHash) {
                            localStorage.setItem('playerPasswordHash', tempHash);
                            localStorage.removeItem('tempPasswordHash');
                        }
                        updateProfileDisplay(data.name, data.elo, data.wins, data.losses || 0, data.level || 1, data.xp || 0, data.achievements || []);
                        
                        // Apply themes from database
                        if (data.board_theme) {
                            localStorage.setItem('board_theme', data.board_theme);
                            const bSelect = document.getElementById('boardThemeSelect');
                            if (bSelect) bSelect.value = data.board_theme;
                        }
                        if (data.piece_theme) {
                            localStorage.setItem('piece_theme', data.piece_theme);
                            const pSelect = document.getElementById('pieceThemeSelect');
                            if (pSelect) pSelect.value = data.piece_theme;
                        }
                        if (typeof window.applyThemes === 'function') {
                            window.applyThemes(data.board_theme, data.piece_theme);
                        }

                        setTimeout(() => { 
                            const modal = document.getElementById('auth-modal');
                            if(modal) modal.style.display = 'none'; 
                        }, 1000);
                    } else if (data.type === 'login_error') {
                        const status = document.getElementById('auth-status');
                        if (status) status.innerHTML = "<span style='color: #e74c3c;'>❌ " + (data.text || "Fehler") + "</span>";
                        localStorage.removeItem('tempPasswordHash');
                        localStorage.removeItem('playerPasswordHash');
                    } else if (data.type === 'achievement_unlocked') {
                        const badgeEl = document.getElementById(`badge-${data.id}`);
                        if (badgeEl) badgeEl.classList.remove('locked');
                        showAchievementNotification(data.title, data.description);
                    }
                } catch(err) {}
            });
        }
    }, 500);
});
