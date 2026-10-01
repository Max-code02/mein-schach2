// adminDashboard.js - High-Security Dedicated Admin Portal for Chess Server
const fs = require('fs');
const path = require('path');

let firebaseConfig = {
    projectId: "schachlive",
    apiKey: "AIzaSyA3KVyicVW1wqLjhNmJf3g9hJUAaovhDv0",
    authDomain: "schachlive.firebaseapp.com"
};

try {
    const configPath = path.join(__dirname, 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
        firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
} catch (e) {}

function renderAdminLoginPage(errorMessage = '') {
    const safeError = errorMessage ? String(errorMessage).replace(/[<>&"']/g, '') : '';
    const fbConfigJson = JSON.stringify(firebaseConfig);

    return `<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Schach-Server – Administrator-Portal</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: radial-gradient(circle at 50% 20%, #151a28 0%, #0a0c13 100%);
            color: #f1f2f6;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .login-card {
            background: rgba(22, 27, 41, 0.95);
            border: 1px solid rgba(241, 196, 15, 0.3);
            border-radius: 20px;
            box-shadow: 0 12px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(241, 196, 15, 0.15);
            max-width: 460px;
            width: 100%;
            padding: 36px 30px;
            text-align: center;
            backdrop-filter: blur(10px);
        }
        .admin-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: rgba(241, 196, 15, 0.15);
            border: 1px solid rgba(241, 196, 15, 0.4);
            color: #f1c40f;
            padding: 6px 14px;
            border-radius: 999px;
            font-size: 0.85rem;
            font-weight: 600;
            margin-bottom: 20px;
            letter-spacing: 0.5px;
        }
        h1 {
            font-size: 1.65rem;
            font-weight: 700;
            margin-bottom: 8px;
            color: #ffffff;
        }
        p.subtitle {
            color: #95a5a6;
            font-size: 0.9rem;
            line-height: 1.4;
            margin-bottom: 24px;
        }
        .alert-error {
            background: rgba(231, 76, 60, 0.15);
            border: 1px solid #e74c3c;
            color: #ff6b6b;
            padding: 12px 14px;
            border-radius: 10px;
            font-size: 0.88rem;
            margin-bottom: 20px;
            text-align: left;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .btn-google {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            width: 100%;
            background: #ffffff;
            color: #1a1a1a;
            border: none;
            padding: 12px 16px;
            border-radius: 12px;
            font-size: 0.95rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            margin-bottom: 20px;
        }
        .btn-google:hover {
            background: #f1f2f6;
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
        }
        .btn-google svg {
            width: 20px;
            height: 20px;
        }
        .divider {
            display: flex;
            align-items: center;
            text-align: center;
            margin: 20px 0;
            color: #7f8c8d;
            font-size: 0.8rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .divider::before, .divider::after {
            content: '';
            flex: 1;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .divider span {
            padding: 0 10px;
        }
        .form-group {
            margin-bottom: 16px;
            text-align: left;
        }
        .form-group label {
            display: block;
            font-size: 0.82rem;
            font-weight: 600;
            color: #bdc3c7;
            margin-bottom: 6px;
        }
        .form-input {
            width: 100%;
            background: rgba(10, 12, 18, 0.7);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 10px;
            padding: 12px 14px;
            font-size: 0.95rem;
            color: #ffffff;
            outline: none;
            transition: border-color 0.2s;
        }
        .form-input:focus {
            border-color: #f1c40f;
            box-shadow: 0 0 0 2px rgba(241, 196, 15, 0.2);
        }
        .btn-submit {
            width: 100%;
            background: linear-gradient(135deg, #f39c12, #e67e22);
            color: #ffffff;
            border: none;
            padding: 13px;
            border-radius: 12px;
            font-size: 1rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 4px 15px rgba(230, 126, 34, 0.4);
            margin-top: 6px;
        }
        .btn-submit:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(230, 126, 34, 0.6);
        }
        .btn-submit:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }
        .footer-links {
            margin-top: 24px;
            display: flex;
            justify-content: center;
            gap: 16px;
            font-size: 0.85rem;
        }
        .footer-links a {
            color: #95a5a6;
            text-decoration: none;
            transition: color 0.2s;
        }
        .footer-links a:hover {
            color: #f1c40f;
            text-decoration: underline;
        }
        .status-msg {
            margin-top: 14px;
            font-size: 0.88rem;
            min-height: 20px;
        }
    </style>
</head>
<body>
    <div class="login-card">
        <div class="admin-badge">
            <span>🛡️</span>
            <span>RESTRICTED ACCESS</span>
        </div>
        <h1>Admin Control Portal</h1>
        <p class="subtitle">Nur autorisierte Administratoren dürfen auf das System-Dashboard zugreifen.</p>

        ${safeError ? `<div class="alert-error"><span>⛔</span><span>${safeError}</span></div>` : ''}
        <div id="status-box" class="status-msg"></div>

        <!-- Google / Firebase Admin Sign-In -->
        <button id="googleAdminBtn" class="btn-google" type="button">
            <svg viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>Mit Admin-Google-Konto anmelden</span>
        </button>

        <div class="divider">
            <span>ODER MASTER-PASSWORT</span>
        </div>

        <!-- Master Password Form -->
        <form id="adminPassForm" onsubmit="handlePasswordLogin(event)">
            <div class="form-group">
                <label for="adminPass">Administrator-Passwort</label>
                <input type="password" id="adminPass" class="form-input" placeholder="••••••••••••" required autocomplete="current-password">
            </div>
            <button type="submit" id="submitPassBtn" class="btn-submit">
                🔐 Als Admin einloggen
            </button>
        </form>

        <div class="footer-links">
            <a href="/">← Zurück zum Schachspiel</a>
            <a href="/handy">Handy-Version</a>
        </div>
    </div>

    <!-- Firebase SDK for Google Auth -->
    <script type="module">
        import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
        import { getAuth, signInWithPopup, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

        const firebaseConfig = ${fbConfigJson};
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const provider = new GoogleAuthProvider();

        const googleBtn = document.getElementById('googleAdminBtn');
        const statusBox = document.getElementById('status-box');

        googleBtn.addEventListener('click', async () => {
            googleBtn.disabled = true;
            statusBox.innerHTML = '<span style="color: #f1c40f;">⏳ Authentifiziere mit Google...</span>';
            try {
                const result = await signInWithPopup(auth, provider);
                const user = result.user;
                statusBox.innerHTML = '<span style="color: #3498db;">🔍 Überprüfe Administratorrechte...</span>';
                
                const idToken = await user.getIdToken(true);
                
                // Post token to server login endpoint
                const res = await fetch('/admin/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ firebaseToken: idToken })
                });

                const data = await res.json();
                if (data.success) {
                    statusBox.innerHTML = '<span style="color: #2ecc71;">✅ Berechtigung bestätigt! Leite weiter...</span>';
                    window.location.href = '/admin';
                } else {
                    statusBox.innerHTML = '<span style="color: #e74c3c;">⛔ ' + (data.message || 'Zugriff verweigert: Kein Admin-Konto') + '</span>';
                    googleBtn.disabled = false;
                }
            } catch (err) {
                console.error("Auth Error:", err);
                statusBox.innerHTML = '<span style="color: #e74c3c;">❌ Anmeldung fehlgeschlagen: ' + (err.message || 'Unbekannter Fehler') + '</span>';
                googleBtn.disabled = false;
            }
        });
    </script>

    <script>
        async function handlePasswordLogin(e) {
            e.preventDefault();
            const passInput = document.getElementById('adminPass');
            const submitBtn = document.getElementById('submitPassBtn');
            const statusBox = document.getElementById('status-box');
            
            const password = passInput.value.trim();
            if (!password) return;

            submitBtn.disabled = true;
            statusBox.innerHTML = '<span style="color: #f1c40f;">⏳ Überprüfe Master-Passwort...</span>';

            try {
                const res = await fetch('/admin/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password })
                });

                const data = await res.json();
                if (data.success) {
                    statusBox.innerHTML = '<span style="color: #2ecc71;">✅ Master-Login erfolgreich! Leite weiter...</span>';
                    window.location.href = '/admin';
                } else {
                    statusBox.innerHTML = '<span style="color: #e74c3c;">⛔ ' + (data.message || 'Falsches Passwort!') + '</span>';
                    submitBtn.disabled = false;
                }
            } catch (err) {
                statusBox.innerHTML = '<span style="color: #e74c3c;">❌ Verbindungsfehler zum Server</span>';
                submitBtn.disabled = false;
            }
        }
    </script>
</body>
</html>`;
}

function renderAdminDashboard(adminInfo, stats, users, tickets, bannedIPsList, bannedPlayersList) {
    const safeAdminName = String(adminInfo.adminName || 'Admin').replace(/[<>&"']/g, '');
    const safeAdminEmail = String(adminInfo.email || '').replace(/[<>&"']/g, '');

    const usersJson = JSON.stringify(users || []);
    const ticketsJson = JSON.stringify(tickets || []);
    const bannedIPsJson = JSON.stringify(bannedIPsList || []);
    const bannedPlayersJson = JSON.stringify(bannedPlayersList || []);

    return `<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Schach-Server – Administrator-Zentrale</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
            --bg-dark: #0a0c14;
            --bg-card: rgba(18, 22, 34, 0.85);
            --border-card: rgba(255, 255, 255, 0.08);
            --primary: #f1c40f;
            --primary-hover: #f39c12;
            --danger: #e74c3c;
            --success: #2ecc71;
            --info: #3498db;
            --text-main: #f1f2f6;
            --text-muted: #95a5a6;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: var(--bg-dark);
            color: var(--text-main);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }
        header {
            background: rgba(15, 18, 28, 0.95);
            border-bottom: 1px solid var(--border-card);
            backdrop-filter: blur(10px);
            padding: 14px 24px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            position: sticky;
            top: 0;
            z-index: 1000;
        }
        .header-brand {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .header-brand h1 {
            font-size: 1.25rem;
            font-weight: 700;
            color: #fff;
            letter-spacing: -0.3px;
        }
        .badge-verified {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: rgba(46, 204, 113, 0.15);
            border: 1px solid rgba(46, 204, 113, 0.4);
            color: #2ecc71;
            padding: 4px 10px;
            border-radius: 999px;
            font-size: 0.78rem;
            font-weight: 600;
        }
        .header-actions {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .btn-nav {
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.12);
            color: var(--text-main);
            padding: 8px 14px;
            border-radius: 8px;
            text-decoration: none;
            font-size: 0.85rem;
            font-weight: 600;
            transition: all 0.2s;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            cursor: pointer;
        }
        .btn-nav:hover {
            background: rgba(255, 255, 255, 0.12);
            color: var(--primary);
            border-color: var(--primary);
        }
        .btn-logout {
            background: rgba(231, 76, 60, 0.15);
            border-color: rgba(231, 76, 60, 0.4);
            color: #ff6b6b;
        }
        .btn-logout:hover {
            background: var(--danger);
            color: #fff;
            border-color: var(--danger);
        }

        .container {
            max-width: 1400px;
            width: 100%;
            margin: 0 auto;
            padding: 24px;
            flex: 1;
        }

        /* KPI Grid */
        .kpi-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
        }
        .kpi-card {
            background: var(--bg-card);
            border: 1px solid var(--border-card);
            border-radius: 14px;
            padding: 18px 20px;
            position: relative;
            overflow: hidden;
        }
        .kpi-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 4px;
            height: 100%;
            background: var(--primary);
        }
        .kpi-title {
            color: var(--text-muted);
            font-size: 0.8rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 6px;
        }
        .kpi-value {
            font-size: 1.8rem;
            font-weight: 800;
            color: #fff;
        }
        .kpi-sub {
            font-size: 0.75rem;
            color: #7f8c8d;
            margin-top: 4px;
        }

        /* Tabs Navigation */
        .tabs-nav {
            display: flex;
            gap: 8px;
            border-bottom: 1px solid var(--border-card);
            margin-bottom: 20px;
            overflow-x: auto;
        }
        .tab-btn {
            background: transparent;
            border: none;
            color: var(--text-muted);
            padding: 12px 18px;
            font-size: 0.95rem;
            font-weight: 600;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            transition: all 0.2s;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            white-space: nowrap;
        }
        .tab-btn:hover {
            color: #fff;
        }
        .tab-btn.active {
            color: var(--primary);
            border-bottom-color: var(--primary);
        }

        /* Card Section */
        .card {
            background: var(--bg-card);
            border: 1px solid var(--border-card);
            border-radius: 16px;
            padding: 22px;
            margin-bottom: 24px;
        }
        .card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 18px;
            flex-wrap: wrap;
            gap: 12px;
        }
        .card-header h2 {
            font-size: 1.2rem;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        /* Search & Filter */
        .search-box {
            background: rgba(10, 12, 18, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 8px;
            padding: 8px 12px;
            color: #fff;
            font-size: 0.88rem;
            min-width: 250px;
            outline: none;
        }
        .search-box:focus {
            border-color: var(--primary);
        }

        /* Modern Table */
        .table-responsive {
            overflow-x: auto;
            border-radius: 10px;
            border: 1px solid rgba(255, 255, 255, 0.05);
        }
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.88rem;
            text-align: left;
        }
        thead th {
            background: rgba(255, 255, 255, 0.03);
            color: var(--text-muted);
            padding: 12px 14px;
            font-weight: 600;
            border-bottom: 1px solid var(--border-card);
            white-space: nowrap;
        }
        tbody td {
            padding: 12px 14px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.03);
            vertical-align: middle;
        }
        tbody tr:hover {
            background: rgba(255, 255, 255, 0.02);
        }

        /* Action Buttons */
        .btn-action {
            padding: 5px 10px;
            border-radius: 6px;
            font-size: 0.78rem;
            font-weight: 600;
            border: none;
            cursor: pointer;
            transition: 0.15s;
            display: inline-flex;
            align-items: center;
            gap: 4px;
        }
        .btn-action.ban {
            background: rgba(231, 76, 60, 0.2);
            color: #ff6b6b;
            border: 1px solid rgba(231, 76, 60, 0.4);
        }
        .btn-action.ban:hover {
            background: var(--danger);
            color: #fff;
        }
        .btn-action.unban {
            background: rgba(46, 204, 113, 0.2);
            color: #2ecc71;
            border: 1px solid rgba(46, 204, 113, 0.4);
        }
        .btn-action.unban:hover {
            background: var(--success);
            color: #fff;
        }
        .btn-action.role {
            background: rgba(241, 196, 15, 0.2);
            color: #f1c40f;
            border: 1px solid rgba(241, 196, 15, 0.4);
        }
        .btn-action.role:hover {
            background: var(--primary);
            color: #000;
        }
        .btn-action.kick {
            background: rgba(230, 126, 34, 0.2);
            color: #e67e22;
            border: 1px solid rgba(230, 126, 34, 0.4);
        }
        .btn-action.kick:hover {
            background: #e67e22;
            color: #fff;
        }

        .badge-status {
            padding: 3px 8px;
            border-radius: 999px;
            font-size: 0.72rem;
            font-weight: 700;
            display: inline-block;
        }
        .badge-online { background: rgba(46, 204, 113, 0.2); color: #2ecc71; }
        .badge-offline { background: rgba(149, 165, 166, 0.2); color: #95a5a6; }
        .badge-banned { background: rgba(231, 76, 60, 0.25); color: #e74c3c; }
        .badge-admin { background: rgba(241, 196, 15, 0.2); color: #f1c40f; }

        /* Notification Toast */
        #toast {
            position: fixed;
            bottom: 24px;
            right: 24px;
            background: #1e2433;
            border: 1px solid var(--primary);
            color: #fff;
            padding: 12px 20px;
            border-radius: 10px;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5);
            font-size: 0.9rem;
            font-weight: 600;
            display: none;
            z-index: 9999;
        }
    </style>
</head>
<body>
    <header>
        <div class="header-brand">
            <span style="font-size: 1.5rem;">🛡️</span>
            <div>
                <h1>Admin Control Center</h1>
                <div class="badge-verified">
                    <span>●</span>
                    <span>Verifiziert: ${safeAdminName} ${safeAdminEmail ? `(${safeAdminEmail})` : ''}</span>
                </div>
            </div>
        </div>
        <div class="header-actions">
            <button class="btn-nav" onclick="refreshData()">🔄 Aktualisieren</button>
            <a href="/" class="btn-nav" target="_blank">🎮 Zum Schachspiel</a>
            <a href="/handy" class="btn-nav" target="_blank">📱 Handy-Version</a>
            <a href="/admin/logout" class="btn-nav btn-logout">🚪 Abmelden</a>
        </div>
    </header>

    <div class="container">
        <!-- KPI Metrics Grid -->
        <div class="kpi-grid">
            <div class="kpi-card">
                <div class="kpi-title">Online-Spieler</div>
                <div class="kpi-value" id="kpi-online">${stats.onlineCount || 0}</div>
                <div class="kpi-sub">Aktive WebSocket Verbindungen</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-title">Laufende Partien</div>
                <div class="kpi-value" id="kpi-games">${stats.activeGames || 0}</div>
                <div class="kpi-sub">Schach-Räume live</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-title">Registrierte Accounts</div>
                <div class="kpi-value" id="kpi-users">${stats.totalUsers || 0}</div>
                <div class="kpi-sub">Gesamt in Datenbank</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-title">Gesperrte Entitäten</div>
                <div class="kpi-value" style="color: var(--danger);" id="kpi-bans">${stats.totalBans || 0}</div>
                <div class="kpi-sub">${bannedPlayersList.length} Spieler / ${bannedIPsList.length} IPs</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-title">Offene Tickets</div>
                <div class="kpi-value" style="color: var(--primary);" id="kpi-tickets">${tickets.filter(t => t.status === 'Offen').length}</div>
                <div class="kpi-sub">Entbannungsanträge</div>
            </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="tabs-nav">
            <button class="tab-btn active" onclick="switchTab('usersTab', this)">👥 Spieler & Rollen</button>
            <button class="tab-btn" onclick="switchTab('bansTab', this)">🔨 Bann-Zentrale & IPs</button>
            <button class="tab-btn" onclick="switchTab('ticketsTab', this)">📩 Support-Tickets (${tickets.length})</button>
            <button class="tab-btn" onclick="switchTab('actionsTab', this)">📢 Server-Befehle & Chat</button>
        </div>

        <!-- TAB 1: USERS -->
        <div id="usersTab" class="tab-content">
            <div class="card">
                <div class="card-header">
                    <h2>👥 Alle Spieler & Konten</h2>
                    <input type="text" id="userSearchInput" class="search-box" placeholder="🔍 Spieler suchen (Name, IP, Rolle)..." oninput="filterUsersTable()">
                </div>
                <div class="table-responsive">
                    <table id="usersTable">
                        <thead>
                            <tr>
                                <th>Spielername</th>
                                <th>Status</th>
                                <th>Rolle</th>
                                <th>Elo</th>
                                <th>Siege / Niederlagen</th>
                                <th>IP-Adresse</th>
                                <th>Aktionen</th>
                            </tr>
                        </thead>
                        <tbody id="usersTableBody">
                            <!-- Populated via JavaScript -->
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- TAB 2: BANS -->
        <div id="bansTab" class="tab-content" style="display: none;">
            <div class="card">
                <div class="card-header">
                    <h2>🔨 Manuelle Sperre verhängen</h2>
                </div>
                <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                    <input type="text" id="manualBanTarget" class="search-box" placeholder="Spielername oder IP-Adresse" style="flex: 1;">
                    <input type="text" id="manualBanReason" class="search-box" placeholder="Grund für Sperrung..." style="flex: 2;">
                    <button class="btn-action ban" style="padding: 10px 18px;" onclick="submitManualBan()">🔨 Sperren</button>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div class="card">
                    <div class="card-header">
                        <h2>🚫 Gesperrte Spieler (${bannedPlayersList.length})</h2>
                    </div>
                    <div class="table-responsive">
                        <table>
                            <thead>
                                <tr>
                                    <th>Spieler</th>
                                    <th>Aktion</th>
                                </tr>
                            </thead>
                            <tbody id="bannedPlayersTableBody"></tbody>
                        </table>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <h2>🌐 Gesperrte IPs (${bannedIPsList.length})</h2>
                    </div>
                    <div class="table-responsive">
                        <table>
                            <thead>
                                <tr>
                                    <th>IP-Adresse</th>
                                    <th>Aktion</th>
                                </tr>
                            </thead>
                            <tbody id="bannedIPsTableBody"></tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>

        <!-- TAB 3: TICKETS -->
        <div id="ticketsTab" class="tab-content" style="display: none;">
            <div class="card">
                <div class="card-header">
                    <h2>📩 Support-Tickets & Entbannungsanträge</h2>
                </div>
                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Ticket-ID</th>
                                <th>Spieler / Absender</th>
                                <th>IP</th>
                                <th>Grund / Vorwurf</th>
                                <th>Nachricht</th>
                                <th>Status</th>
                                <th>Aktionen</th>
                            </tr>
                        </thead>
                        <tbody id="ticketsTableBody"></tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- TAB 4: ACTIONS -->
        <div id="actionsTab" class="tab-content" style="display: none;">
            <div class="card">
                <div class="card-header">
                    <h2>📢 Globale System-Nachricht senden</h2>
                </div>
                <p style="color: var(--text-muted); font-size: 0.88rem; margin-bottom: 12px;">
                    Sendet eine auffällige In-App-Benachrichtigung an alle momentan verbundenen Schachspieler.
                </p>
                <div style="display: flex; gap: 12px; margin-bottom: 16px;">
                    <input type="text" id="broadcastTitle" class="search-box" placeholder="Titel (z.B. Wartungsankündigung)" style="flex: 1;">
                    <input type="text" id="broadcastMsg" class="search-box" placeholder="Nachricht an alle Spieler..." style="flex: 3;">
                    <button class="btn-action role" style="padding: 10px 18px;" onclick="sendBroadcast()">📢 Senden</button>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div class="card">
                    <div class="card-header">
                        <h2>💬 Chat-Moderation</h2>
                    </div>
                    <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 14px;">
                        Löscht alle bisherigen globalen Chatnachrichten auf dem Server.
                    </p>
                    <button class="btn-action ban" style="padding: 10px 16px;" onclick="clearServerChat()">🧹 Globalen Chat leeren</button>
                </div>

                <div class="card">
                    <div class="card-header">
                        <h2>💾 Datenbank-Backup</h2>
                    </div>
                    <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 14px;">
                        Erstellt sofort ein vollständiges Backup aller Spielerprofile, Elo-Werte und Statistiken.
                    </p>
                    <button class="btn-action unban" style="padding: 10px 16px;" onclick="triggerServerBackup()">💾 Backup jetzt ausführen</button>
                </div>
            </div>
        </div>
    </div>

    <div id="toast"></div>

    <script>
        let currentUsers = ${usersJson};
        let currentTickets = ${ticketsJson};
        let currentBannedIPs = ${bannedIPsJson};
        let currentBannedPlayers = ${bannedPlayersJson};

        function showToast(msg, isSuccess = true) {
            const toast = document.getElementById('toast');
            toast.textContent = msg;
            toast.style.borderColor = isSuccess ? 'var(--success)' : 'var(--danger)';
            toast.style.display = 'block';
            setTimeout(() => { toast.style.display = 'none'; }, 3500);
        }

        function switchTab(tabId, btn) {
            document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            const target = document.getElementById(tabId);
            if (target) target.style.display = 'block';
            if (btn) btn.classList.add('active');
        }

        function renderUsers(users) {
            const tbody = document.getElementById('usersTableBody');
            if (!tbody) return;
            if (!users || users.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #7f8c8d; padding: 20px;">Keine Spieler gefunden.</td></tr>';
                return;
            }

            tbody.innerHTML = users.map(u => {
                const isBanned = !!u.is_banned;
                const isAdmin = u.role === 'admin';
                const isOnline = !!u.is_online;
                const safeName = String(u.username || u.id || '').replace(/[<>&"']/g, '');
                const safeIP = String(u.ip_address || 'Unbekannt').replace(/[<>&"']/g, '');
                const encName = encodeURIComponent(u.username || u.id || '');

                return \`
                    <tr>
                        <td>
                            <strong>\${safeName}</strong>
                            \${isAdmin ? '<span class="badge-status badge-admin" style="margin-left: 6px;">ADMIN</span>' : ''}
                        </td>
                        <td>
                            \${isBanned 
                                ? '<span class="badge-status badge-banned">GESPERRT</span>' 
                                : (isOnline ? '<span class="badge-status badge-online">● ONLINE</span>' : '<span class="badge-status badge-offline">OFFLINE</span>')
                            }
                        </td>
                        <td>
                            <span class="badge-status \${isAdmin ? 'badge-admin' : 'badge-offline'}">\${u.role || 'user'}</span>
                        </td>
                        <td>\${u.elo || 1200}</td>
                        <td>\${u.wins || 0} / \${u.losses || 0}</td>
                        <td><code>\${safeIP}</code></td>
                        <td>
                            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                                <button class="btn-action role" onclick="toggleRole(decodeURIComponent('\${encName}'), '\${isAdmin ? 'user' : 'admin'}')">
                                    \${isAdmin ? '👤 Zu User' : '👑 Zu Admin'}
                                </button>
                                \${isOnline ? \`<button class="btn-action kick" onclick="kickUser(decodeURIComponent('\${encName}'))">⚡ Kick</button>\` : ''}
                                \${isBanned 
                                    ? \`<button class="btn-action unban" onclick="unbanUser(decodeURIComponent('\${encName}'))">✅ Entbannen</button>\`
                                    : \`<button class="btn-action ban" onclick="banUser(decodeURIComponent('\${encName}'))">🔨 Bannen</button>\`
                                }
                            </div>
                        </td>
                    </tr>
                \`;
            }).join('');
        }

        function renderBans(players, ips) {
            const pBody = document.getElementById('bannedPlayersTableBody');
            const ipBody = document.getElementById('bannedIPsTableBody');

            if (pBody) {
                pBody.innerHTML = (!players || players.length === 0) 
                    ? '<tr><td colspan="2" style="text-align: center; color: #7f8c8d; padding: 12px;">Keine gesperrten Spieler</td></tr>'
                    : players.map(p => {
                        const safeP = String(p).replace(/[<>&"']/g, '');
                        const encP = encodeURIComponent(p);
                        return \`
                        <tr>
                            <td><strong>\${safeP}</strong></td>
                            <td style="text-align: right;"><button class="btn-action unban" onclick="unbanUser(decodeURIComponent('\${encP}'))">✅ Entsperren</button></td>
                        </tr>
                    \`;}).join('');
            }

            if (ipBody) {
                ipBody.innerHTML = (!ips || ips.length === 0) 
                    ? '<tr><td colspan="2" style="text-align: center; color: #7f8c8d; padding: 12px;">Keine gesperrten IPs</td></tr>'
                    : ips.map(ip => {
                        const safeIP = String(ip).replace(/[<>&"']/g, '');
                        const encIP = encodeURIComponent(ip);
                        return \`
                        <tr>
                            <td><code>\${safeIP}</code></td>
                            <td style="text-align: right;"><button class="btn-action unban" onclick="unbanUser(decodeURIComponent('\${encIP}'))">✅ Entsperren</button></td>
                        </tr>
                    \`;}).join('');
            }
        }

        function renderTickets(tickets) {
            const tBody = document.getElementById('ticketsTableBody');
            if (!tBody) return;
            if (!tickets || tickets.length === 0) {
                tBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #7f8c8d; padding: 20px;">Keine Support-Tickets vorhanden.</td></tr>';
                return;
            }

            tBody.innerHTML = tickets.map(t => {
                const isPending = t.status === 'Offen';
                const safeUser = String(t.user || t.contact || '').replace(/[<>&"']/g, '');
                const safeText = String(t.text || '').replace(/[<>&"']/g, '');
                const safeReason = String(t.banReason || '').replace(/[<>&"']/g, '');
                const safeIP = String(t.clientIP || '').replace(/[<>&"']/g, '');
                const encId = encodeURIComponent(t.id);

                return \`
                    <tr>
                        <td><code>\${String(t.id).replace(/[<>&"']/g, '')}</code></td>
                        <td><strong>\${safeUser}</strong></td>
                        <td><code>\${safeIP}</code></td>
                        <td style="color: var(--danger);">\${safeReason}</td>
                        <td style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="\${safeText}">\${safeText}</td>
                        <td>
                            <span class="badge-status \${isPending ? 'badge-banned' : 'badge-online'}">\${t.status}</span>
                        </td>
                        <td>
                            \${isPending ? \`
                                <button class="btn-action unban" onclick="resolveTicket(decodeURIComponent('\${encId}'))">✅ Entbannen & Schließen</button>
                            \` : '<span style="color: #7f8c8d; font-size: 0.8rem;">Erledigt</span>'}
                        </td>
                    </tr>
                \`;
            }).join('');
        }

        function filterUsersTable() {
            const query = (document.getElementById('userSearchInput')?.value || '').toLowerCase().trim();
            if (!query) {
                renderUsers(currentUsers);
                return;
            }
            const filtered = currentUsers.filter(u => {
                const name = (u.username || u.id || '').toLowerCase();
                const ip = (u.ip_address || '').toLowerCase();
                const role = (u.role || '').toLowerCase();
                return name.includes(query) || ip.includes(query) || role.includes(query);
            });
            renderUsers(filtered);
        }

        async function refreshData() {
            try {
                const res = await fetch('/admin/api/data');
                const data = await res.json();
                if (data.success) {
                    currentUsers = data.users || [];
                    currentTickets = data.tickets || [];
                    currentBannedIPs = data.bannedIPs || [];
                    currentBannedPlayers = data.bannedPlayers || [];

                    document.getElementById('kpi-online').innerText = data.stats.onlineCount || 0;
                    document.getElementById('kpi-games').innerText = data.stats.activeGames || 0;
                    document.getElementById('kpi-users').innerText = data.stats.totalUsers || 0;
                    document.getElementById('kpi-bans').innerText = (currentBannedIPs.length + currentBannedPlayers.length);
                    document.getElementById('kpi-tickets').innerText = currentTickets.filter(t => t.status === 'Offen').length;

                    renderUsers(currentUsers);
                    renderBans(currentBannedPlayers, currentBannedIPs);
                    renderTickets(currentTickets);
                    showToast("✅ Daten aktualisiert");
                }
            } catch (e) {
                console.error("Refresh error:", e);
            }
        }

        async function toggleRole(username, newRole) {
            if (!confirm(\`Möchtest du die Rolle von '\${username}' wirklich auf '\${newRole}' setzen?\`)) return;
            try {
                const res = await fetch('/api/admin/set-role', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ target: username, role: newRole })
                });
                const data = await res.json();
                if (data.success) {
                    showToast(data.message || "Rolle aktualisiert");
                    refreshData();
                } else {
                    showToast(data.message || "Fehler", false);
                }
            } catch (err) {
                showToast("Fehler bei Rollenänderung", false);
            }
        }

        async function kickUser(username) {
            if (!confirm(\`Möchtest du '\${username}' wirklich kicken?\`)) return;
            try {
                const res = await fetch('/api/admin/kick-user', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ target: username })
                });
                const data = await res.json();
                showToast(data.message || "Spieler gekickt");
                refreshData();
            } catch(e) {
                showToast("Fehler beim Kicken", false);
            }
        }

        async function banUser(username) {
            const reason = prompt(\`Grund für den permanenten Bann von '\${username}':\`, "Admin-Entscheidung");
            if (reason === null) return;
            try {
                const res = await fetch('/api/admin/ban-user', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ target: username, reason: reason })
                });
                const data = await res.json();
                showToast(data.message || "Spieler gesperrt");
                refreshData();
            } catch(e) {
                showToast("Fehler beim Bannen", false);
            }
        }

        async function unbanUser(target) {
            if (!confirm(\`Soll '\${target}' wirklich entsperrt werden?\`)) return;
            try {
                const res = await fetch('/api/admin/unban-user', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ target: target })
                });
                const data = await res.json();
                showToast(data.message || "Entsperrt");
                refreshData();
            } catch(e) {
                showToast("Fehler beim Entbannen", false);
            }
        }

        async function submitManualBan() {
            const target = document.getElementById('manualBanTarget').value.trim();
            const reason = document.getElementById('manualBanReason').value.trim() || 'Admin-Sperre';
            if (!target) {
                showToast("Bitte Spielername oder IP eingeben!", false);
                return;
            }
            await banUser(target);
            document.getElementById('manualBanTarget').value = '';
            document.getElementById('manualBanReason').value = '';
        }

        async function resolveTicket(ticketId) {
            const reply = prompt("Antwort / Begründung für die Entbannung:", "Entbannungsantrag genehmigt.");
            if (reply === null) return;
            try {
                const res = await fetch('/api/admin/unban-ticket', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ticketId, reply })
                });
                const data = await res.json();
                showToast(data.message || "Ticket gelöst");
                refreshData();
            } catch(e) {
                showToast("Fehler beim Ticket-Abschluss", false);
            }
        }

        async function sendBroadcast() {
            const title = document.getElementById('broadcastTitle').value.trim() || 'System-Mitteilung';
            const message = document.getElementById('broadcastMsg').value.trim();
            if (!message) {
                showToast("Bitte Nachricht eingeben!", false);
                return;
            }
            try {
                const res = await fetch('/api/admin/broadcast', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title, message })
                });
                const data = await res.json();
                showToast(data.message || "Nachricht gesendet!");
                document.getElementById('broadcastMsg').value = '';
            } catch(e) {
                showToast("Fehler beim Senden", false);
            }
        }

        async function clearServerChat() {
            if (!confirm("Möchtest du den gesamten globalen Chatverlauf wirklich leeren?")) return;
            try {
                const res = await fetch('/api/admin/clear-chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                const data = await res.json();
                showToast(data.message || "Chat geleert");
            } catch(e) {
                showToast("Fehler beim Leeren des Chats", false);
            }
        }

        async function triggerServerBackup() {
            try {
                const res = await fetch('/api/admin/backup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                const data = await res.json();
                showToast(data.message || "Backup erfolgreich erstellt!");
            } catch(e) {
                showToast("Fehler beim Backup", false);
            }
        }

        // Initial render
        renderUsers(currentUsers);
        renderBans(currentBannedPlayers, currentBannedIPs);
        renderTickets(currentTickets);
    </script>
</body>
</html>`;
}

module.exports = {
    renderAdminLoginPage,
    renderAdminDashboard
};
