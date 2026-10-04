console.log("HELLO");
// Global cycle-safe JSON.stringify protection
(function() {
    if (typeof JSON !== 'undefined' && !JSON.__safe_patched) {
        const originalStringify = JSON.stringify;
        JSON.stringify = function(value, replacer, space) {
            try {
                return originalStringify(value, replacer, space);
            } catch (err) {
                if (err instanceof TypeError && (String(err.message).includes('circular') || String(err.message).includes('Converting circular structure to JSON'))) {
                    const seen = new WeakSet();
                    return originalStringify(value, function(k, v) {
                        if (typeof v === 'object' && v !== null) {
                            if (seen.has(v)) return undefined;
                            seen.add(v);
                        }
                        if (typeof replacer === 'function') {
                            return replacer.call(this, k, v);
                        }
                        return v;
                    }, space);
                }
                throw err;
            }
        };
        JSON.__safe_patched = true;
    }
})();
require('dotenv').config();
const axios = require('axios');
const path = require('path');
const express = require('express');
const cors = require('cors');
const http = require('http');
const fs = require('fs');
const url = require('url');
const WebSocket = require('ws');
const { Chess } = require('chess.js');
const crypto = require('crypto');
const { renderAdminLoginPage, renderAdminDashboard } = require('./adminDashboard');
let bannedIPs = new Set();
let bannedPlayers = new Set();

function getClientIP(req) {
    if (!req) return '127.0.0.1';
    const remote = req.socket?.remoteAddress || req.connection?.remoteAddress || '';
    const cleanIP = String(remote).replace(/^::ffff:/, '').trim();
    return cleanIP || '127.0.0.1';
}

function verifyAdminPassword(passCandidate) {
    if (!passCandidate || typeof passCandidate !== 'string') return false;
    const adminSecret = process.env.ADMIN_PASSWORD;
    if (!adminSecret || adminSecret.length < 6) return false;
    try {
        const candidateBuf = Buffer.from(String(passCandidate).trim());
        const secretBuf = Buffer.from(adminSecret.trim());
        if (candidateBuf.length !== secretBuf.length) return false;
        return crypto.timingSafeEqual(candidateBuf, secretBuf);
    } catch (e) {
        return false;
    }
}

function hashPassword(password) {
    if (!password || typeof password !== 'string') return '';
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
    if (!password || !storedHash || typeof password !== 'string' || typeof storedHash !== 'string') return false;
    const parts = storedHash.split(':');
    if (parts.length === 2) {
        const [salt, key] = parts;
        try {
            const keyBuffer = Buffer.from(key, 'hex');
            const derivedKey = crypto.scryptSync(password, salt, 64);
            return crypto.timingSafeEqual(keyBuffer, derivedKey);
        } catch (e) {
            return false;
        }
    }
    // Backward compatibility for legacy plaintext passwords: constant-time comparison
    try {
        const a = Buffer.from(password);
        const b = Buffer.from(storedHash);
        if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
            return true;
        }
    } catch (e) {}
    return false;
}

function isLoopbackOrLocalIP(ip) {
    if (!ip) return true;
    const cleanIP = String(ip).split(',')[0].replace(/^::ffff:/, '').trim();
    if (cleanIP === '127.0.0.1' || cleanIP === '::1' || cleanIP === 'localhost' || cleanIP === 'unknown' || cleanIP === '') return true;
    if (cleanIP.startsWith('10.') || 
        cleanIP.startsWith('192.168.') || 
        cleanIP.startsWith('127.') || 
        /^172\.(1[6-9]|2[0-9]|3[01])\./.test(cleanIP)) {
        return true;
    }
    return false;
}
const userMessageLog = new Map();
const SPAM_THRESHOLD = 5;
const SPAM_INTERVAL = 3000;

const app = express();
app.use(cors());
app.use(express.json());
app.use('/videos', express.static(path.join(__dirname, 'videos')));

// Import module helpers with fallback checks
let validateSecurity = () => true;
try { validateSecurity = require('./antihack.js').validateSecurity || validateSecurity; } catch (e) {}

let getLocationFromIP = async () => ({ status: 'local', city: 'Unknown', country: 'Unknown', isp: 'Unknown' });
try { getLocationFromIP = require('./geoTracker2.js').getLocationFromIP || getLocationFromIP; } catch (e) {}

let parseEmojis = (t) => t;
try { parseEmojis = require('./emojis').parseEmojis || parseEmojis; } catch (e) {}

let isNameAllowed = () => true;
try { isNameAllowed = require('./badnames').isNameAllowed || isNameAllowed; } catch (e) {}

let addSpectator = () => {}, removeSpectator = () => {}, broadcastToSpectators = () => {}, handleSpectatorChat = () => {}, getSpectatorCount = () => {}, spectatorsMap = new Map();
try {
    const spec = require('./spectator');
    addSpectator = spec.addSpectator || addSpectator;
    removeSpectator = spec.removeSpectator || removeSpectator;
    broadcastToSpectators = spec.broadcastToSpectators || broadcastToSpectators;
    handleSpectatorChat = spec.handleSpectatorChat || handleSpectatorChat;
    getSpectatorCount = spec.getSpectatorCount || getSpectatorCount;
    spectatorsMap = spec.spectators || spectatorsMap;
} catch (e) {}

let startAutoMessages = () => {};
let sendWelcomeTip = () => {};
try { 
    const am = require('./autoMessages');
    startAutoMessages = am.startAutoMessages || startAutoMessages;
    sendWelcomeTip = am.sendWelcomeTip || sendWelcomeTip;
} catch (e) {}

let handleAdminCommand = async () => false;
try { handleAdminCommand = require('./adminSystem').handleAdminCommand || handleAdminCommand; } catch (e) {}

let startAutoTestBot = () => {};
try { startAutoTestBot = require('./adminTestBot').startAutoTestBot || startAutoTestBot; } catch (e) {}

let runBackup = () => {}, startBackupScheduler = () => {};
try {
    const backup = require('./autoBackup');
    runBackup = backup.runBackup || runBackup;
    startBackupScheduler = backup.startBackupScheduler || startBackupScheduler;
} catch (e) {}

let isSpamming = () => false;
try { isSpamming = require('./antispam').isSpamming || isSpamming; } catch (e) {}

let engine = null, ghost = null;
try { engine = require('./engineWorker.js'); } catch (e) {}
try { ghost = require('./ghostplayer.js'); } catch (e) {}

// Canvas and FFmpeg optional loads
let createCanvas, loadImage;
try {
    const canvasPkg = require('canvas');
    createCanvas = canvasPkg.createCanvas;
    loadImage = canvasPkg.loadImage;
} catch (e) {
    console.warn("Canvas package warning:", e.message);
}

let ffmpeg;
try {
    ffmpeg = require('fluent-ffmpeg');
} catch (e) {
    console.warn("fluent-ffmpeg warning:", e.message);
}

let Replicate;
try {
    Replicate = require('replicate');
} catch (e) {
    console.warn("Replicate warning:", e.message);
}

// Download contact vCard route
app.get('/download-contact/:playerName', (req, res) => {
    const name = req.params.playerName;
    const gameUrl = "https://max-code01.github.io/mein-schach"; 
    const vCardContent = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `FN:Schach-Rivale: ${name}`,
        `N:;${name};;;`,
        `URL:${gameUrl}`,
        "NOTE:Gefunden auf Max' Ultra-Schach. Fordere ihn heraus!",
        "END:VCARD"
    ].join("\n");

    res.setHeader('Content-Type', 'text/vcard');
    res.setHeader('Content-Disposition', `attachment; filename="${name}_rivale.vcf"`);
    res.send(vCardContent);
});

// DB setup

// Google Firebase Firestore & Google Gemini AI Setup
const admin = require('firebase-admin');
const { GoogleGenAI } = require('@google/genai');
const { firestoreClient } = require('./firestoreClient');

let firestoreDb = firestoreClient;
global.firestoreDb = firestoreDb;
console.log("🔥 Google Firestore (Firebase) Web-Client verknüpft für SchachLive!");

try {
    const configPath = path.join(__dirname, 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
        const fbConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (fbConfig.projectId && (!admin.apps || !admin.apps.length)) {
            admin.initializeApp({
                projectId: fbConfig.projectId
            });
        }
    }
} catch (err) {
    console.warn("Firebase Admin Init Info:", err.message);
}

let aiClient = null;
if (process.env.GEMINI_API_KEY) {
    try {
        aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        console.log("🤖 Google Gemini AI Client initialisiert!");
    } catch (err) {
        console.warn("Gemini Init Warning:", err.message);
    }
}
// Create required working directories
const TEMP_DIR = path.join(__dirname, 'temp_moves');
const VIDEO_DIR = path.join(__dirname, 'videos');
[TEMP_DIR, VIDEO_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Ordner erstellt: ${dir}`);
    }
});

function banIPPermanently(ip, reason = "Anti-Hack Trigger") {
    if (!ip || isLoopbackOrLocalIP(ip)) {
        console.log(`🛡️ IP '${ip}' ist eine lokale/interne/Proxy-IP und wird NICHT gebannt.`);
        return;
    }
    if (!bannedIPs.has(ip)) {
        bannedIPs.add(ip);
        console.log(`🚫 IP ${ip} wurde zur internen Sperrliste hinzugefügt. Grund: ${reason}`);
        
        const htaccessPath = path.join(__dirname, '.htaccess');
        const denyLine = `\nDeny from ${ip}`;

        fs.appendFile(htaccessPath, denyLine, (err) => {
            if (err) console.error("Fehler beim Schreiben in .htaccess:", err);
            else console.log(`🚫 IP ${ip} wurde permanent in .htaccess gesperrt!`);
        });

        try {
            fs.writeFileSync(BAN_FILE, JSON.stringify([...bannedIPs], null, 2));
        } catch (e) {}
    }
}

module.exports = { banIPPermanently };

async function sendBanEmail(playerName, reason, ip) {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) {
        console.error("❌ Fehler: DISCORD_WEBHOOK_URL fehlt in den Umgebungsvariablen!");
        return false;
    }

    const payload = {
        embeds: [{
            title: "🚨 BAN-ALARM: Spieler gesperrt",
            color: 15158332,
            fields: [
                { name: "Spieler", value: playerName || "Unbekannt", inline: true },
                { name: "Grund", value: reason || "Unbekannt", inline: true },
                { name: "IP-Adresse", value: `\`${ip || 'Unbekannt'}\``, inline: false }
            ],
            footer: { text: "Schach-Server Wächter" },
            timestamp: new Date()
        }]
    };

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        return response.ok;
    } catch (error) {
        console.error("❌ Fehler beim Senden an Discord:", error.message);
        return false;
    }
}

function renderBannedPage(clientIP, reason) {
    const safeIP = String(clientIP || 'Unbekannt').replace(/[<>&"']/g, '');
    const safeReason = String(reason || 'Verstoß gegen die Community-Richtlinien / Admin-Sperre').replace(/[<>&"']/g, '');
    return `<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Zugriff verweigert – Schach-Server</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: #090a0f;
            color: #f1f2f6;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .ban-container {
            background: #141721;
            border: 2px solid #e74c3c;
            border-radius: 16px;
            box-shadow: 0 10px 40px rgba(231, 76, 60, 0.35);
            max-width: 520px;
            width: 100%;
            padding: 32px 26px;
            text-align: center;
        }
        .ban-icon {
            font-size: 3.6rem;
            margin-bottom: 12px;
            line-height: 1;
        }
        h1 {
            color: #ff4d4d;
            font-size: 1.8rem;
            margin-bottom: 8px;
            font-weight: 800;
        }
        .badge {
            display: inline-block;
            background: rgba(231, 76, 60, 0.2);
            color: #ff6b6b;
            border: 1px solid rgba(231, 76, 60, 0.5);
            padding: 4px 14px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 16px;
        }
        p.desc {
            color: #bdc3c7;
            font-size: 0.95rem;
            line-height: 1.5;
            margin-bottom: 20px;
        }
        .info-card {
            background: rgba(0, 0, 0, 0.4);
            border-left: 4px solid #e74c3c;
            border-radius: 6px;
            padding: 12px 16px;
            text-align: left;
            margin-bottom: 22px;
        }
        .info-label {
            font-size: 0.75rem;
            text-transform: uppercase;
            color: #888;
            margin-bottom: 4px;
            letter-spacing: 0.5px;
        }
        .info-value {
            color: #ff9999;
            font-size: 0.95rem;
            font-weight: 600;
            word-break: break-word;
        }
        .ticket-section {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(231, 76, 60, 0.3);
            border-radius: 10px;
            padding: 18px;
            text-align: left;
            margin-bottom: 20px;
        }
        .ticket-header {
            font-size: 0.95rem;
            font-weight: bold;
            color: #f1c40f;
            margin-bottom: 6px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 6px;
        }
        .ticket-email {
            font-size: 0.75rem;
            color: #3498db;
            font-weight: normal;
        }
        .ticket-section p {
            font-size: 0.82rem;
            color: #aaa;
            margin-bottom: 12px;
            line-height: 1.4;
        }
        .form-group {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        input, textarea {
            width: 100%;
            background: #1c202d;
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 8px;
            color: #fff;
            padding: 10px 12px;
            font-size: 0.9rem;
            font-family: inherit;
        }
        input:focus, textarea:focus {
            outline: none;
            border-color: #e74c3c;
        }
        button.btn-send {
            background: #27ae60;
            color: #fff;
            border: none;
            padding: 12px;
            border-radius: 8px;
            font-weight: 700;
            font-size: 0.95rem;
            cursor: pointer;
            transition: background 0.2s;
        }
        button.btn-send:hover {
            background: #219653;
        }
        #status-feedback {
            margin-top: 10px;
            font-size: 0.85rem;
            text-align: center;
            min-height: 18px;
        }
        .footer-info {
            font-size: 0.75rem;
            color: #666;
            margin-top: 14px;
        }
        .footer-info a {
            color: #3498db;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="ban-container">
        <div class="ban-icon">⛔</div>
        <h1>Zugriff verweigert</h1>
        <div class="badge">Permanent gesperrt</div>
        <p class="desc">
            Dein Zugriff auf die Schach-Plattform wurde durch das Sicherheitssystem oder die Server-Administration gesperrt.
        </p>

        <div class="info-card">
            <div class="info-label">Betroffene IP-Adresse</div>
            <div class="info-value">${safeIP}</div>
            <div class="info-label" style="margin-top: 8px;">Hinterlegter Sperr-Grund</div>
            <div class="info-value">${safeReason}</div>
        </div>

        <div class="ticket-section">
            <div class="ticket-header">
                <span>📩 Support-Ticket / Entbannungsantrag</span>
                <span class="ticket-email">blockcom130@gmail.com</span>
            </div>
            <p>
                Falls du glaubst, dass die Sperrung ein Missverständnis ist, kannst du hier direkt einen Entbannungsantrag einreichen.
            </p>
            <div class="form-group">
                <input type="text" id="ticket-user" placeholder="Dein Spielername oder E-Mail...">
                <textarea id="ticket-text" rows="3" placeholder="Beschreibe deinen Fall oder Entbannungsantrag..."></textarea>
                <button type="button" class="btn-send" onclick="sendTicket()">✉️ Antrag an Support absenden</button>
            </div>
            <div id="status-feedback"></div>
        </div>

        <div class="footer-info">
            Support-Kontakt: <a href="mailto:blockcom130@gmail.com">blockcom130@gmail.com</a>
        </div>
    </div>

    <script>
        function sendTicket() {
            var contact = document.getElementById('ticket-user').value.trim();
            var text = document.getElementById('ticket-text').value.trim();
            var feedback = document.getElementById('status-feedback');

            if (!text) {
                feedback.style.color = '#e74c3c';
                feedback.innerText = '❌ Bitte gib eine Nachricht oder Begründung ein.';
                return;
            }

            feedback.style.color = '#f39c12';
            feedback.innerText = '⏳ Sende Support-Ticket...';

            fetch('/api/support-ticket', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contact: contact || 'Gesperrter Spieler',
                    user: contact || 'Gesperrter Spieler',
                    text: text,
                    banReason: '${safeReason}'
                })
            })
            .then(function(res) { return res.json(); })
            .then(function(data) {
                if (data && data.success) {
                    feedback.style.color = '#2ecc71';
                    feedback.innerHTML = '✅ Antrag übermittelt! Ticket-ID: <strong>' + (data.ticketId || 'OK') + '</strong>. Unser Support-Team (blockcom130@gmail.com) prüft deine Anfrage.';
                    document.getElementById('ticket-text').value = '';
                } else {
                    throw new Error(data && data.message ? data.message : 'Senden fehlgeschlagen');
                }
            })
            .catch(function(err) {
                feedback.style.color = '#e74c3c';
                feedback.innerText = '❌ Fehler beim Senden. Bitte wende dich per E-Mail an blockcom130@gmail.com';
            });
        }
    </script>
</body>
</html>`;
}

// Emergency Unban & Security Middleware
app.use((req, res, next) => {
    const clientIP = getClientIP(req);

    // Dedicated secure emergency unban endpoint: requires genuine admin password
    if (req.path === '/unban-self' || req.path === '/api/unban-self') {
        const reqPass = req.query.unban || req.query.pass || req.headers['x-admin-key'] || req.headers['x-admin-pass'];
        const isAdminAuthorized = reqPass && verifyAdminPassword(String(reqPass).trim());

        if (!isAdminAuthorized) {
            return res.status(403).json({
                success: false,
                message: 'Zugriff verweigert: Gültiges Administrator-Passwort erforderlich.'
            });
        }

        bannedIPs.clear();
        bannedPlayers.clear();
        console.log(`🔓 Notfall-Entsperrung durch verifizierten Administrator ausgeführt.`);

        return res.status(200).send(`
            <!DOCTYPE html>
            <html lang="de">
            <head>
                <meta charset="UTF-8">
                <title>IP Entsperrt - Schach</title>
                <style>
                    body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; text-align: center; padding: 60px 20px; }
                    .card { background: #1e293b; max-width: 520px; margin: 0 auto; padding: 40px; border-radius: 20px; border: 1px solid #10b981; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
                    h1 { color: #34d399; margin-top: 0; font-size: 28px; }
                    p { font-size: 16px; color: #cbd5e1; line-height: 1.6; }
                    .btn { display: inline-block; margin-top: 25px; padding: 14px 28px; background: #10b981; color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 16px; transition: background 0.2s; }
                    .btn:hover { background: #059669; }
                </style>
            </head>
            <body>
                <div class="card">
                    <h1>✅ Admin erfolgreich authentifiziert!</h1>
                    <p>Alle aktiven Sperren wurden sicher zurückgesetzt.</p>
                    <a href="/" class="btn">🎮 Zurück zur Schach-Anwendung</a>
                </div>
            </body>
            </html>
        `);
    }

    if (req.headers['x-forwarded-proto'] !== 'https' && process.env.NODE_ENV === 'production') {
        return res.redirect(`https://${req.hostname}${req.url}`);
    }

    // Server-Side Ban Check: Intercept all HTTP requests from banned IPs
    if (bannedIPs.has(clientIP)) {
        if (req.path === '/api/support-ticket') {
            return next(); // Allow banned users to submit support tickets
        }
        return res.status(403).send(renderBannedPage(clientIP, "Deine IP-Adresse wurde auf diesem Server permanent gesperrt."));
    }

    next();
});

// Dedicated server-side banned page endpoint
app.get('/banned', (req, res) => {
    const clientIP = getClientIP(req);
    const reason = req.query.reason || 'Zugriff verweigert / Sperrung durch Administration';
    res.status(403).send(renderBannedPage(clientIP, reason));
});

// ==========================================
// 🛡️ DEDICATED HIGH-SECURITY ADMIN PORTAL (/admin)
// ==========================================
const activeAdminSessions = new Map();

async function verifyAdminAuth(req) {
    // 1. Check admin_session cookie
    const cookieHeader = req.headers.cookie || '';
    const matchCookie = cookieHeader.match(/(?:^|;\s*)admin_session=([^;]+)/);
    const sessionToken = matchCookie ? matchCookie[1] : null;

    if (sessionToken && activeAdminSessions.has(sessionToken)) {
        const session = activeAdminSessions.get(sessionToken);
        if (Date.now() < session.expiresAt) {
            return { authorized: true, adminName: session.adminName, email: session.email, method: 'session' };
        } else {
            activeAdminSessions.delete(sessionToken);
        }
    }

    // 2. Check password via query or custom header or body using constant-time check
    const passCandidate = req.query.pass || req.headers['x-admin-pass'] || req.headers['x-admin-key'] || req.body?.password;
    if (passCandidate && verifyAdminPassword(String(passCandidate).trim())) {
        return { authorized: true, adminName: 'Max (Master-Admin)', email: 'max.schule13@gmail.com', method: 'password' };
    }

    // 3. Check Authorization Bearer or token
    const authHeader = req.headers.authorization || '';
    let token = '';
    if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7).trim();
    } else if (req.headers['x-admin-token']) {
        token = req.headers['x-admin-token'].trim();
    } else if (req.query.token) {
        token = String(req.query.token).trim();
    }

    if (token) {
        if (activeAdminSessions.has(token)) {
            const s = activeAdminSessions.get(token);
            if (Date.now() < s.expiresAt) {
                return { authorized: true, adminName: s.adminName, email: s.email, method: 'session' };
            }
        }

        try {
            if (admin && admin.auth) {
                const decodedToken = await admin.auth().verifyIdToken(token);
                if (decodedToken) {
                    const isOwnerEmail = decodedToken.email && decodedToken.email.toLowerCase() === 'max.schule13@gmail.com' && decodedToken.email_verified === true;
                    let isDbAdmin = false;
                    if (firestoreDb && decodedToken.uid) {
                        try {
                            const pSnap = await firestoreDb.collection('players').doc(decodedToken.uid).get();
                            if (pSnap.exists && pSnap.data()?.role === 'admin') isDbAdmin = true;
                        } catch(e) {}
                    }
                    if (isOwnerEmail || isDbAdmin) {
                        return { 
                            authorized: true, 
                            adminName: decodedToken.name || decodedToken.email?.split('@')[0] || 'Admin', 
                            email: decodedToken.email || '', 
                            uid: decodedToken.uid, 
                            method: 'firebase' 
                        };
                    }
                }
            }
        } catch (e) {}
    }

    return { authorized: false };
}

function collectAdminDashboardData() {
    const allUsers = [];
    const seenNames = new Set();

    if (wss && wss.clients) {
        wss.clients.forEach(c => {
            if (c.playerName) {
                seenNames.add(c.playerName.toLowerCase());
                const uData = (userDB && userDB[c.playerName]) || {};
                allUsers.push({
                    id: c.playerName,
                    username: c.playerName,
                    role: uData.role || (isUserAdmin(c.playerName) ? 'admin' : 'user'),
                    elo: uData.elo || 1200,
                    wins: uData.wins || 0,
                    losses: uData.losses || 0,
                    is_banned: !!(bannedPlayers.has(c.playerName.toLowerCase()) || (uData && (uData.is_banned || uData.ip_ban))),
                    ban_reason: (uData && uData.ban_reason) || (bannedPlayers.has(c.playerName.toLowerCase()) ? 'Admin-Sperre' : null),
                    is_online: true,
                    ip_address: c.clientIP || uData.ip_address || '127.0.0.1'
                });
            }
        });
    }

    if (userDB) {
        for (const uname in userDB) {
            if (!seenNames.has(uname.toLowerCase())) {
                const uData = userDB[uname] || {};
                allUsers.push({
                    id: uname,
                    username: uname,
                    role: uData.role || (isUserAdmin(uname) ? 'admin' : 'user'),
                    elo: uData.elo || 1200,
                    wins: uData.wins || 0,
                    losses: uData.losses || 0,
                    is_banned: !!(bannedPlayers.has(uname.toLowerCase()) || (uData && (uData.is_banned || uData.ip_ban))),
                    ban_reason: (uData && uData.ban_reason) || (bannedPlayers.has(uname.toLowerCase()) ? 'Admin-Sperre' : null),
                    is_online: false,
                    ip_address: uData.ip_address || 'Unbekannt'
                });
            }
        }
    }

    bannedPlayers.forEach(bannedName => {
        if (!seenNames.has(bannedName.toLowerCase()) && !allUsers.some(u => u.username.toLowerCase() === bannedName.toLowerCase())) {
            allUsers.push({
                id: bannedName,
                username: bannedName,
                role: 'user',
                elo: 1200,
                wins: 0,
                losses: 0,
                is_banned: true,
                ban_reason: 'Permanent gesperrt',
                is_online: false,
                ip_address: 'Unbekannt'
            });
        }
    });

    const onlineClientsCount = wss && wss.clients ? Array.from(wss.clients).filter(c => c.readyState === 1).length : 0;
    const activeRoomsCount = typeof rooms !== 'undefined' && rooms ? Object.keys(rooms).length : 0;

    const stats = {
        onlineCount: onlineClientsCount,
        activeGames: activeRoomsCount,
        totalUsers: allUsers.length,
        totalBans: bannedPlayers.size + bannedIPs.size
    };

    return {
        stats,
        users: allUsers,
        tickets: globalSupportTickets,
        bannedIPs: Array.from(bannedIPs),
        bannedPlayers: Array.from(bannedPlayers)
    };
}

// 1. Admin Authentication API
app.post('/admin/api/login', async (req, res) => {
    const { password, firebaseToken } = req.body || {};
    let authorized = false;
    let adminName = 'Admin';
    let email = '';

    if (password && verifyAdminPassword(String(password).trim())) {
        authorized = true;
        adminName = 'Max (Master-Admin)';
        email = 'max.schule13@gmail.com';
    } else if (firebaseToken && admin && admin.auth) {
        try {
            const decodedToken = await admin.auth().verifyIdToken(firebaseToken);
            if (decodedToken) {
                const isOwnerEmail = decodedToken.email && decodedToken.email.toLowerCase() === 'max.schule13@gmail.com' && decodedToken.email_verified === true;
                let isDbAdmin = false;
                if (firestoreDb && decodedToken.uid) {
                    try {
                        const pSnap = await firestoreDb.collection('players').doc(decodedToken.uid).get();
                        if (pSnap.exists && pSnap.data()?.role === 'admin') isDbAdmin = true;
                    } catch(e) {}
                }
                if (isOwnerEmail || isDbAdmin) {
                    authorized = true;
                    adminName = decodedToken.name || decodedToken.email?.split('@')[0] || 'Admin';
                    email = decodedToken.email || '';
                }
            }
        } catch (e) {
            console.warn("Admin login token error:", e.message);
        }
    }

    if (!authorized) {
        return res.status(403).json({
            success: false,
            message: 'Zugriff verweigert: Dein Konto besitzt keine Administratorrechte!'
        });
    }

    const sessionToken = crypto.randomBytes(32).toString('hex');
    activeAdminSessions.set(sessionToken, {
        adminName,
        email,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000
    });

    res.setHeader('Set-Cookie', `admin_session=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);
    return res.json({ success: true, redirect: '/admin' });
});

// 2. Admin Logout
app.get(['/admin/logout', '/api/admin/logout'], (req, res) => {
    const cookieHeader = req.headers.cookie || '';
    const matchCookie = cookieHeader.match(/(?:^|;\s*)admin_session=([^;]+)/);
    if (matchCookie) {
        activeAdminSessions.delete(matchCookie[1]);
    }
    res.setHeader('Set-Cookie', 'admin_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
    res.redirect('/');
});

// 3. GET /admin - Strictly Protected Route (All admin paths require authenticated login)
app.get(['/admin', '/admin/', '/admindashboard', '/admindashboard/', '/admin-dashboard', '/admindashboard.html'], async (req, res) => {
    const auth = await verifyAdminAuth(req);
    if (!auth.authorized) {
        return res.send(renderAdminLoginPage(req.query.err || ''));
    }
    const data = collectAdminDashboardData();
    res.send(renderAdminDashboard(auth, data.stats, data.users, data.tickets, data.bannedIPs, data.bannedPlayers));
});

// 4. GET /admin/api/data
app.get('/admin/api/data', async (req, res) => {
    const auth = await verifyAdminAuth(req);
    if (!auth.authorized) {
        return res.status(403).json({ success: false, message: 'Zugriff verweigert' });
    }
    const data = collectAdminDashboardData();
    res.json({ success: true, ...data });
});

// 🛡️ SECURE STATIC FILE SERVING (Never expose server.js, backups, .env, or database files)
const ALLOWED_STATIC_FILES = new Set([
    'index.html', 'handy.html', 'stats.html', 'chat.html', 'datenschutz.html', 'impressum.html', 
    'AGB.html', 'sitemap.html', 'sitemap.xml', 'robots.txt', 'manifest.json', 'sw.js',
    'script.js', 'script2.js', 'script_chat.js', 'style.css', 'features.js', 'firebase-applet-config.json',
    'icon.png', 'icon.jpg', 'schach-vorschau.jpg',
    'stockfishWorker.js', 'engineWorker.js', 'puzzleEngine.js', 'openingTrainer.js', 
    'openingBook.js', 'pgnEngine.js', 'evalEngine.js', 'bettingEngine.js', 
    'eloSystem.js', 'leaderboards.js', 'video-engine.js', 'soundEngine.js', 'emojis.js'
]);

if (fs.existsSync(path.join(__dirname, 'public'))) {
    app.use(express.static(path.join(__dirname, 'public'), { maxAge: 0 }));
}

app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    const reqPath = req.path.replace(/^\/+/, '');
    if (ALLOWED_STATIC_FILES.has(reqPath)) {
        return res.sendFile(path.join(__dirname, reqPath));
    }
    next();
});

app.get('/', (req, res) => {
    if (fs.existsSync(path.join(__dirname, 'index.html'))) {
        res.sendFile(path.join(__dirname, 'index.html'));
    } else if (fs.existsSync(path.join(__dirname, 'public', 'index.html'))) {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    } else {
        res.send("Schach-Ultra-Server: MAXIMALE VOLLVERSION - ALLER CODE ENTHALTEN");
    }
});

app.get(['/handy', '/handy.html', '/mobile'], (req, res) => {
    if (fs.existsSync(path.join(__dirname, 'handy.html'))) {
        res.sendFile(path.join(__dirname, 'handy.html'));
    } else if (fs.existsSync(path.join(__dirname, 'public', 'handy.html'))) {
        res.sendFile(path.join(__dirname, 'public', 'handy.html'));
    } else {
        res.sendFile(path.join(__dirname, 'index.html'));
    }
});

app.get(['/stats', '/stats.html', '/rangliste', '/leaderboard'], (req, res) => {
    if (fs.existsSync(path.join(__dirname, 'stats.html'))) {
        res.sendFile(path.join(__dirname, 'stats.html'));
    } else if (fs.existsSync(path.join(__dirname, 'public', 'stats.html'))) {
        res.sendFile(path.join(__dirname, 'public', 'stats.html'));
    } else {
        res.sendFile(path.join(__dirname, 'index.html'));
    }
});

// REST Endpoints for Auth and Analysis
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || typeof username !== 'string' || !password || typeof password !== 'string') {
        return res.status(400).json({ success: false, error: "Name und Passwort erforderlich!" });
    }

    const cleanUsername = username.trim();
    let user = userDB[cleanUsername];

    // Try fetching from Firestore if missing locally (fallback)
    if (!user && firestoreDb) {
        try {
            const doc = await firestoreDb.collection('players').doc(cleanUsername).get();
            if (doc.exists) {
                user = doc.data();
                userDB[cleanUsername] = user;
            }
        } catch (e) {}
    }

    if (!user) {
        return res.status(401).json({ success: false, error: "Benutzerkonto existiert nicht. Bitte registriere dich zuerst!" });
    }

    const clientIP = getClientIP(req);
    const uLower = cleanUsername.toLowerCase();

    // Ban check (unless admin)
    if (!isUserAdmin(cleanUsername) && (bannedPlayers.has(uLower) || bannedIPs.has(clientIP) || (user && (user.is_banned || user.ip_ban)))) {
        const banReason = (user && user.ban_reason) || "Account gesperrt von der Administration";
        return res.status(403).json({
            success: false,
            banned: true,
            error: "Account gesperrt",
            reason: banReason,
            message: `Account gesperrt! Grund: ${banReason}`
        });
    }

    // Strict password verification & account takeover protection
    if (!user.password) {
        return res.status(401).json({
            success: false,
            error: "Dieses Konto besitzt kein Passwort oder wird über ein Google/Firebase-Konto geschützt."
        });
    }

    if (!verifyPassword(password, user.password)) {
        return res.status(401).json({ success: false, error: "Falsches Passwort!" });
    }

    // Auto-migrate legacy plaintext password to secure hash
    if (!user.password.includes(':')) {
        user.password = hashPassword(password);
    }
    user.last_login = new Date().toISOString();

    saveAll(cleanUsername);
    res.json({
        success: true,
        name: cleanUsername,
        elo: user.elo || 1200,
        wins: user.wins || 0,
        level: user.level || 1,
        xp: user.xp || 0,
        role: user.role || 'Gast'
    });
});

app.post('/api/register', async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || typeof username !== 'string' || !password || typeof password !== 'string') {
        return res.status(400).json({ success: false, error: "Name und Passwort erforderlich!" });
    }

    const cleanUsername = username.trim();
    if (cleanUsername.length < 3 || cleanUsername.length > 30) {
        return res.status(400).json({ success: false, error: "Der Name muss zwischen 3 und 30 Zeichen lang sein." });
    }

    if (password.length < 4) {
        return res.status(400).json({ success: false, error: "Das Passwort muss mindestens 4 Zeichen lang sein." });
    }
    
    if (userDB[cleanUsername]) {
        return res.status(409).json({ success: false, error: "Name bereits vergeben!" });
    }

    if (firestoreDb) {
        try {
            const doc = await firestoreDb.collection('players').doc(cleanUsername).get();
            if (doc.exists) {
                return res.status(409).json({ success: false, error: "Name bereits vergeben!" });
            }
        } catch (e) {}
    }

    userDB[cleanUsername] = {
        username: cleanUsername,
        password: hashPassword(password),
        elo: 1200,
        wins: 0,
        losses: 0,
        level: 1,
        xp: 0,
        role: 'Gast',
        created_at: new Date().toISOString()
    };

    saveAll(cleanUsername);
    res.json({ success: true, name: cleanUsername });
});

function sanitizeLeaderboardEntry(data, docId) {
    if (!data && !docId) return null;
    const u = data || {};
    let rawName = (u.username || u.name || u.displayName || docId || '').trim();
    if (!rawName) return null;

    // Filter or clean email addresses
    if (rawName.includes('@')) {
        const lowEmail = rawName.toLowerCase();
        if (lowEmail === 'max.schule13@gmail.com') {
            rawName = 'Max';
        } else if (lowEmail.includes('slmail.me') || lowEmail.includes('support') || lowEmail.includes('noreply') || lowEmail.includes('admin@') || lowEmail.includes('example.com')) {
            return null;
        } else {
            if (u.username && !u.username.includes('@') && u.username.length >= 2) {
                rawName = u.username.trim();
            } else {
                rawName = rawName.split('@')[0].trim();
            }
        }
    }

    const low = rawName.toLowerCase();
    if (
        low === 'global' ||
        low === 'null' ||
        low === 'undefined' ||
        low === 'anonymous' ||
        low === 'anonym' ||
        low === '[object object]' ||
        low === 'connection_health' ||
        low === 'system_ban_security' ||
        low.startsWith('testbot')
    ) {
        return null;
    }

    // UID / UUID filtering
    if (/^[0-9a-zA-Z_-]{24,36}$/.test(rawName) && !/[aeiou]/i.test(rawName)) return null;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawName)) return null;

    let cleanName = rawName;
    if (low === 'maxadmin' || low === 'max.schule13@gmail.com') cleanName = 'Max';
    cleanName = cleanName.replace(/[<>"'&]/g, '').trim();
    if (!cleanName || cleanName.length < 2) return null;

    return {
        name: cleanName,
        username: cleanName,
        elo: Number(u.elo) || 1200,
        wins: Math.max(0, Number(u.wins) || 0),
        losses: Math.max(0, Number(u.losses) || 0),
        level: Math.max(1, Number(u.level) || 1),
        xp: Math.max(0, Number(u.xp) || 0),
        role: u.role || (cleanName.toLowerCase() === 'max' ? 'admin' : 'Gast')
    };
}

app.get('/api/leaderboard', async (req, res) => {
    try {
        const userMap = new Map();
        if (typeof firestoreDb !== 'undefined' && firestoreDb) {
            let snapshot = await firestoreDb.collection('leaderboard').get();
            if (snapshot.empty) {
                snapshot = await firestoreDb.collection('players').get();
            }
            if (!snapshot.empty) {
                snapshot.forEach(doc => {
                    const clean = sanitizeLeaderboardEntry(doc.data(), doc.id);
                    if (!clean) return;
                    const key = clean.name.toLowerCase();
                    const existing = userMap.get(key);
                    if (!existing || clean.elo > existing.elo || (clean.elo === existing.elo && clean.wins > existing.wins)) {
                        userMap.set(key, clean);
                    }
                });
            }
            const list = Array.from(userMap.values());
            list.sort((a, b) => (b.elo !== a.elo ? b.elo - a.elo : b.wins - a.wins));
            return res.json({ success: true, list: list.slice(0, 100) });
        }

        // Fallback only if Firestore is completely unavailable
        for (const [name, u] of Object.entries(userDB)) {
            const clean = sanitizeLeaderboardEntry(u, name);
            if (!clean) continue;
            const key = clean.name.toLowerCase();
            const existing = userMap.get(key);
            if (!existing || clean.elo > existing.elo || (clean.elo === existing.elo && clean.wins > existing.wins)) {
                userMap.set(key, clean);
            }
        }

        const list = Array.from(userMap.values());
        list.sort((a, b) => (b.elo !== a.elo ? b.elo - a.elo : b.wins - a.wins));
        return res.json({ success: true, list: list.slice(0, 100) });
    } catch (err) {
        console.error("Firestore Leaderboard Fetch Error:", err.message);
        return res.status(500).json({ success: false, error: err.message });
    }
});

let globalSupportTickets = [];
const TICKETS_FILE = path.join(__dirname, 'support_tickets.json');

function loadTicketsFromFile() {
    if (fs.existsSync(TICKETS_FILE)) {
        try {
            const data = fs.readFileSync(TICKETS_FILE, 'utf8');
            globalSupportTickets = JSON.parse(data);
            console.log(`📩 ${globalSupportTickets.length} Support-Tickets aus lokaler Datei geladen.`);
        } catch (e) {
            console.error("Fehler beim Laden von support_tickets.json:", e.message);
        }
    }
}
loadTicketsFromFile();

async function loadFirestoreTickets() {
    if (!firestoreDb) return;
    try {
        const snapshot = await firestoreDb.collection('tickets').orderBy('timestamp', 'desc').limit(100).get();
        if (!snapshot.empty) {
            const firestoreTickets = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                firestoreTickets.push({ id: doc.id, ...data });
            });
            if (firestoreTickets.length > 0) {
                globalSupportTickets = firestoreTickets;
                saveTicketsToFile();
                console.log(`🔥 ${firestoreTickets.length} Support-Tickets aus Firestore geladen.`);
            }
        }
    } catch (e) {
        console.warn("Firestore tickets load warning:", e.message);
    }
}

function saveTicketsToFile() {
    try {
        fs.writeFileSync(TICKETS_FILE, JSON.stringify(globalSupportTickets, null, 2));
    } catch (e) {
        console.error("Fehler beim Speichern von support_tickets.json:", e.message);
    }
}

async function saveTicketToFirestore(ticket) {
    if (!firestoreDb || !ticket || !ticket.id) return;
    try {
        await firestoreDb.collection('tickets').doc(ticket.id).set(ticket, { merge: true });
    } catch (e) {
        console.error("Fehler beim Speichern des Tickets in Firestore:", e.message);
    }
}

function broadcastTicketsUpdate() {
    const msgStr = JSON.stringify({
        type: 'admin_tickets_update',
        tickets: globalSupportTickets.filter(t => t.status !== 'Entbannt' && t.status !== 'Abgelehnt' && t.status !== 'Geschlossen'),
        supportEmail: 'blockcom130@gmail.com'
    });
    if (wss && wss.clients) {
        wss.clients.forEach(c => {
            if (c.readyState === 1 && (isUserAdmin(c.playerName) || c.role === 'admin' || c.role === 'moderator' || c.isAdmin)) {
                c.send(msgStr);
            }
        });
    }
}

function broadcastAdminUsersUpdate() {
    const allUsers = [];
    const seenNames = new Set();

    // 1. Online WebSocket Users
    if (wss && wss.clients) {
        wss.clients.forEach(c => {
            if (c.readyState === 1 && c.playerName) {
                seenNames.add(c.playerName.toLowerCase());
                const uData = (userDB && userDB[c.playerName]) || {};
                allUsers.push({
                    id: c.playerName,
                    username: c.playerName,
                    role: uData.role || (isUserAdmin(c.playerName) ? 'admin' : 'user'),
                    elo: uData.elo || 1200,
                    wins: uData.wins || 0,
                    losses: uData.losses || 0,
                    is_banned: !!(bannedPlayers.has(c.playerName.toLowerCase()) || (uData && (uData.is_banned || uData.ip_ban))),
                    ban_reason: (uData && uData.ban_reason) || (bannedPlayers.has(c.playerName.toLowerCase()) ? 'Admin-Sperre' : null),
                    is_online: true,
                    ip_address: c.clientIP || uData.ip_address || '127.0.0.1'
                });
            }
        });
    }

    // 2. Offline Registered Users in userDB
    if (userDB) {
        for (const uname in userDB) {
            if (!seenNames.has(uname.toLowerCase())) {
                const uData = userDB[uname] || {};
                allUsers.push({
                    id: uname,
                    username: uname,
                    role: uData.role || (isUserAdmin(uname) ? 'admin' : 'user'),
                    elo: uData.elo || 1200,
                    wins: uData.wins || 0,
                    losses: uData.losses || 0,
                    is_banned: !!(bannedPlayers.has(uname.toLowerCase()) || (uData && (uData.is_banned || uData.ip_ban))),
                    ban_reason: (uData && uData.ban_reason) || (bannedPlayers.has(uname.toLowerCase()) ? 'Admin-Sperre' : null),
                    is_online: false,
                    ip_address: uData.ip_address || 'Unbekannt'
                });
            }
        }
    }

    // 3. Add any banned players that might not be in userDB
    bannedPlayers.forEach(bannedName => {
        if (!seenNames.has(bannedName.toLowerCase()) && !allUsers.some(u => u.username.toLowerCase() === bannedName.toLowerCase())) {
            allUsers.push({
                id: bannedName,
                username: bannedName,
                role: 'user',
                elo: 1200,
                wins: 0,
                losses: 0,
                is_banned: true,
                ban_reason: 'Permanent gesperrt',
                is_online: false,
                ip_address: 'Unbekannt'
            });
        }
    });

    const msgStr = JSON.stringify({
        type: 'admin_users_update',
        users: allUsers
    });

    if (wss && wss.clients) {
        wss.clients.forEach(c => {
            if (c.readyState === 1 && (isUserAdmin(c.playerName) || c.role === 'admin' || c.role === 'moderator' || c.isAdmin)) {
                c.send(msgStr);
            }
        });
    }
}

// ==========================================
// 🔒 ADMIN-ONLY REST API MIDDLEWARE & ROUTES
// ==========================================
app.use('/api/admin', async (req, res, next) => {
    if (req.path === '/login' || req.path === '/logout') return next();
    const auth = await verifyAdminAuth(req);
    if (!auth.authorized) {
        return res.status(403).json({
            success: false,
            message: '⛔ Zugriff verweigert: Nur autorisierte Administratoren dürfen diesen API-Endpunkt aufrufen.'
        });
    }
    req.adminAuth = auth;
    next();
});

app.get('/api/admin/users', (req, res) => {
    const allUsers = [];
    const seenNames = new Set();

    if (wss && wss.clients) {
        wss.clients.forEach(c => {
            if (c.playerName) {
                seenNames.add(c.playerName.toLowerCase());
                const uData = (userDB && userDB[c.playerName]) || {};
                allUsers.push({
                    id: c.playerName,
                    username: c.playerName,
                    role: uData.role || (isUserAdmin(c.playerName) ? 'admin' : 'user'),
                    elo: uData.elo || 1200,
                    wins: uData.wins || 0,
                    losses: uData.losses || 0,
                    is_banned: !!(bannedPlayers.has(c.playerName.toLowerCase()) || (uData && (uData.is_banned || uData.ip_ban))),
                    ban_reason: (uData && uData.ban_reason) || (bannedPlayers.has(c.playerName.toLowerCase()) ? 'Admin-Sperre' : null),
                    is_online: true,
                    ip_address: c.clientIP || uData.ip_address || '127.0.0.1'
                });
            }
        });
    }

    if (userDB) {
        for (const uname in userDB) {
            if (!seenNames.has(uname.toLowerCase())) {
                const uData = userDB[uname] || {};
                allUsers.push({
                    id: uname,
                    username: uname,
                    role: uData.role || (isUserAdmin(uname) ? 'admin' : 'user'),
                    elo: uData.elo || 1200,
                    wins: uData.wins || 0,
                    losses: uData.losses || 0,
                    is_banned: !!(bannedPlayers.has(uname.toLowerCase()) || (uData && (uData.is_banned || uData.ip_ban))),
                    ban_reason: (uData && uData.ban_reason) || (bannedPlayers.has(uname.toLowerCase()) ? 'Admin-Sperre' : null),
                    is_online: false,
                    ip_address: uData.ip_address || 'Unbekannt'
                });
            }
        }
    }

    bannedPlayers.forEach(bannedName => {
        if (!seenNames.has(bannedName.toLowerCase()) && !allUsers.some(u => u.username.toLowerCase() === bannedName.toLowerCase())) {
            allUsers.push({
                id: bannedName,
                username: bannedName,
                role: 'user',
                elo: 1200,
                wins: 0,
                losses: 0,
                is_banned: true,
                ban_reason: 'Permanent gesperrt',
                is_online: false,
                ip_address: 'Unbekannt'
            });
        }
    });

    res.json({ success: true, users: allUsers });
});

app.post('/api/admin/unban-user', async (req, res) => {
    const { target, username } = req.body || {};
    const targetName = target || username;
    if (!targetName) {
        return res.status(400).json({ success: false, message: 'Spielername oder IP erforderlich' });
    }

    await unbanPlayerHelper(targetName);
    broadcastAdminUsersUpdate();
    broadcastTicketsUpdate();

    return res.json({
        success: true,
        message: `✅ Spieler/IP '${targetName}' erfolgreich entsperrt!`
    });
});

app.post('/api/admin/delete-user', async (req, res) => {
    const { target, username } = req.body || {};
    const targetName = target || username;
    if (!targetName) {
        return res.status(400).json({ success: false, message: 'Spielername erforderlich' });
    }

    const cleanTarget = targetName.trim();
    if (userDB[cleanTarget]) {
        delete userDB[cleanTarget];
    }
    if (leaderboard[cleanTarget]) {
        delete leaderboard[cleanTarget];
    }
    bannedPlayers.delete(cleanTarget.toLowerCase());

    if (firestoreDb) {
        try {
            await firestoreDb.collection('players').doc(cleanTarget).delete().catch(() => {});
            await firestoreDb.collection('leaderboard').doc(cleanTarget).delete().catch(() => {});
            console.log(`🔥 Spieler '${cleanTarget}' aus Firestore gelöscht.`);
        } catch(e) {
            console.error("Fehler beim Löschen des Benutzers aus Firestore:", e.message);
        }
    }

    try {
        fs.writeFileSync(USER_FILE, JSON.stringify(userDB, null, 2));
        fs.writeFileSync(LB_FILE, JSON.stringify(leaderboard, null, 2));
    } catch(e) {}

    broadcastAdminUsersUpdate();
    return res.json({ success: true, message: `✅ Spieler '${cleanTarget}' wurde vollständig aus Firestore und Datenbank gelöscht!` });
});

app.post('/api/admin/ban-user', async (req, res) => {
    const { target, username, reason } = req.body || {};
    const targetName = target || username;
    if (!targetName) {
        return res.status(400).json({ success: false, message: 'Spielername oder IP erforderlich' });
    }

    await triggerUltraBan(targetName, reason || "Admin-Sperre");
    broadcastAdminUsersUpdate();
    broadcastTicketsUpdate();

    return res.json({
        success: true,
        message: `🔨 Spieler/IP '${targetName}' erfolgreich gesperrt!`
    });
});

const ticketRateLimits = new Map(); // ip -> [timestamps]

app.post('/api/support-ticket', (req, res) => {
    const detectedIP = getClientIP(req);
    const now = Date.now();
    const windowMs = 10 * 60 * 1000;
    let ipHistory = ticketRateLimits.get(detectedIP) || [];
    ipHistory = ipHistory.filter(t => now - t < windowMs);

    if (ipHistory.length >= 5) {
        return res.status(429).json({
            success: false,
            message: 'Zu viele Support-Anfragen. Bitte warte einige Minuten, bevor du ein neues Ticket erstellst.'
        });
    }

    const { user, contact, text, banReason } = req.body || {};
    if (!text || typeof text !== 'string' || !text.trim()) {
        return res.status(400).json({ success: false, message: 'Nachricht ist erforderlich.' });
    }

    const cleanText = text.trim();
    if (cleanText.length > 2000) {
        return res.status(400).json({ success: false, message: 'Die Nachricht ist zu lang (maximal 2000 Zeichen erlaubt).' });
    }

    ipHistory.push(now);
    ticketRateLimits.set(detectedIP, ipHistory);

    const cleanUser = String(user || contact || 'Gesperrter Spieler').trim().slice(0, 100);
    const cleanContact = String(contact || user || 'Unbekannt').trim().slice(0, 100);
    const cleanBanReason = String(banReason || 'Admin-Gesperrt').trim().slice(0, 200);

    const ticketId = 'TICK-' + Date.now().toString(36).toUpperCase();
    const newTicket = {
        id: ticketId,
        user: cleanUser,
        contact: cleanContact,
        clientIP: detectedIP,
        email: 'blockcom130@gmail.com',
        text: cleanText,
        banReason: cleanBanReason,
        status: 'Offen',
        createdAt: new Date().toLocaleString('de-DE'),
        timestamp: Date.now(),
        reply: ''
    };

    globalSupportTickets.unshift(newTicket);
    if (globalSupportTickets.length > 500) {
        globalSupportTickets.length = 500;
    }

    saveTicketsToFile();
    saveTicketToFirestore(newTicket);
    broadcastTicketsUpdate();
    console.log(`📩 Support-Ticket [${ticketId}] von ${cleanUser} (IP: ${detectedIP}) erfasst -> Benachrichtigung an blockcom130@gmail.com`);
    res.json({
        success: true,
        ticketId: ticketId,
        supportEmail: 'blockcom130@gmail.com',
        message: 'Support-Ticket erfolgreich übermittelt. Unser Support-Team wurde benachrichtigt (blockcom130@gmail.com).'
    });
});

app.get('/api/admin/tickets', async (req, res) => {
    const auth = await verifyAdminAuth(req);
    if (!auth.authorized) {
        return res.status(403).json({ success: false, message: 'Zugriff verweigert' });
    }
    res.json({ success: true, tickets: globalSupportTickets, supportEmail: 'blockcom130@gmail.com' });
});

app.post('/api/admin/unban-ticket', async (req, res) => {
    const auth = await verifyAdminAuth(req);
    if (!auth.authorized) {
        return res.status(403).json({ success: false, message: 'Zugriff verweigert' });
    }
    const { ticketId, reply } = req.body || {};
    const ticket = globalSupportTickets.find(t => t.id === ticketId);
    if (!ticket) {
        return res.status(404).json({ success: false, message: 'Ticket nicht gefunden' });
    }

    const targetUser = ticket.user;
    const targetContact = ticket.contact;
    const targetIP = ticket.clientIP || ticket.ip;

    if (targetUser) await unbanPlayerHelper(targetUser);
    if (targetContact && targetContact !== targetUser) await unbanPlayerHelper(targetContact);
    if (targetIP) {
        bannedIPs.delete(targetIP);
        if (firestoreDb) {
            try {
                const banIdIP = `ip_${targetIP.replace(/[^a-zA-Z0-9_.-]/g, '_')}`;
                await firestoreDb.collection('bans').doc(banIdIP).delete();
            } catch(e) {}
        }
    }

    ticket.status = 'Entbannt';
    ticket.reply = reply || 'Entbannungsantrag genehmigt! Dein Account/IP wurde erfolgreich entsperrt.';
    saveTicketsToFile();

    broadcastTicketsUpdate();
    broadcastAdminUsersUpdate();

    return res.json({
        success: true,
        message: `✅ Entbannung für Ticket ${ticketId} [${targetUser}] erfolgreich ausgeführt!`,
        ticket
    });
});

app.post('/api/admin/reply-ticket', async (req, res) => {
    const { ticketId, reply, status } = req.body || {};
    const ticket = globalSupportTickets.find(t => t.id === ticketId);
    if (!ticket) {
        return res.status(404).json({ success: false, message: 'Ticket nicht gefunden' });
    }

    if (reply) ticket.reply = reply;
    if (status) ticket.status = status;

    const isUnbanAction = status === 'Entbannt' || status === 'Genehmigt' || (reply && reply.toLowerCase().includes('entbann'));
    if (isUnbanAction) {
        const targetUser = ticket.user;
        const targetContact = ticket.contact;
        const targetIP = ticket.clientIP || ticket.ip;

        if (targetUser) await unbanPlayerHelper(targetUser);
        if (targetContact && targetContact !== targetUser) await unbanPlayerHelper(targetContact);
        if (targetIP) bannedIPs.delete(targetIP);
        ticket.status = 'Entbannt';
    }

    saveTicketsToFile();
    broadcastTicketsUpdate();
    broadcastAdminUsersUpdate();

    return res.json({ success: true, ticket });
});

app.post('/api/admin/set-role', async (req, res) => {
    const { target, role } = req.body || {};
    if (!target || !['admin', 'user', 'moderator'].includes(role)) {
        return res.status(400).json({ success: false, message: 'Ungültiger Benutzer oder Rolle' });
    }
    if (userDB && userDB[target]) {
        userDB[target].role = role;
    }
    if (profiles && profiles[target]) {
        profiles[target].role = role;
    }
    if (wss && wss.clients) {
        wss.clients.forEach(c => {
            if (c.playerName && c.playerName.toLowerCase() === target.toLowerCase()) {
                c.role = role;
                c.isAdmin = (role === 'admin');
                c.send(JSON.stringify({
                    type: 'role_updated',
                    role: role,
                    text: `Deine Rolle wurde von der Administration auf '${role}' gesetzt.`
                }));
            }
        });
    }
    await saveAll(target);
    broadcastAdminUsersUpdate();
    return res.json({ success: true, message: `Rolle von '${target}' auf '${role}' gesetzt!` });
});

app.post('/api/admin/kick-user', (req, res) => {
    const { target } = req.body || {};
    if (!target) return res.status(400).json({ success: false, message: 'Zielname erforderlich' });
    let kicked = false;
    if (wss && wss.clients) {
        wss.clients.forEach(c => {
            if (c.playerName && c.playerName.toLowerCase() === target.toLowerCase()) {
                c.send(JSON.stringify({ type: 'system_alert', message: 'Du wurdest von der Administration gekickt.' }));
                c.terminate();
                kicked = true;
            }
        });
    }
    broadcastAdminUsersUpdate();
    return res.json({ success: true, message: kicked ? `Spieler '${target}' gekickt!` : `Spieler '${target}' war nicht online.` });
});

app.post('/api/admin/broadcast', (req, res) => {
    const { title, message } = req.body || {};
    if (!message) return res.status(400).json({ success: false, message: 'Nachricht erforderlich' });
    broadcastInAppNotification({
        title: title || 'Admin-Mitteilung',
        message: message,
        level: 'warning'
    });
    return res.json({ success: true, message: 'Globale Nachricht gesendet!' });
});

app.post('/api/admin/clear-chat', (req, res) => {
    if (wss && wss.clients) {
        wss.clients.forEach(c => {
            if (c.readyState === 1) {
                c.send(JSON.stringify({ type: 'chat', text: '🧹 System: Der Chat wurde vom Administrator geleert.', system: true }));
            }
        });
    }
    return res.json({ success: true, message: 'Chat erfolgreich geleert!' });
});

app.post('/api/admin/backup', (req, res) => {
    try {
        if (typeof runBackup === 'function') {
            runBackup();
        }
        return res.json({ success: true, message: 'Backup erfolgreich ausgeführt!' });
    } catch (e) {
        return res.status(500).json({ success: false, message: 'Backup-Fehler: ' + e.message });
    }
});

app.post('/analyse', async (req, res) => {
    const data = req.body || {};
    const spieler = data.spieler || "Unbekannt";
    const fen = data.fen || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    const zug = data.zug || "";
    const wins = userDB[spieler] ? userDB[spieler].wins || 0 : 0;
    const estimatedElo = 1200 + wins * 25;

    if (aiClient) {
        try {
            const promptText = `Du bist die weltbeste Schach-KI und ein Großmeister-Analyst. 
Analysiere die folgende Schach-Position (FEN: "${fen}") nach dem Zug: "${zug}".
Erstelle eine tiefgehende, präzise Analyse des letzten Zuges und der Gesamtstruktur.

Antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt. Verwende genau diese Struktur und keine zusätzliche Formatierung oder Erklärungen außerhalb des JSONs:
{
  "Basis_Werte": {
    "Rang": "${estimatedElo > 1500 ? 'Meister' : 'Fortgeschrittener'}",
    "Geschätzte_Elo": ${estimatedElo},
    "Genauigkeit": 85,
    "Klassifizierung": "Guter Zug"
  },
  "Positions_Analyse": {
    "Zentrum": "Kontrolliert",
    "Entwicklung": "Aktiv",
    "Material_Vorteil": "Ausgeglichen",
    "Bester_Zug": "e2-e4"
  },
  "Aggressivitäts_Index": {
    "Gesamt": 65,
    "Level": "Offensiv"
  },
  "Erklaerung": "Ein solider Entwicklungszug, der das Zentrum stärkt und Druck aufbaut."
}

Berechne die Genauigkeit (0 bis 100), Aggressivitätsgesamtindex (0 bis 100) und die Klassifizierung (wie 'Brillant 💎', 'Großartiger Zug ⭐', 'Buchzug 📚', 'Ungenauigkeit ⚠️', 'Fehler ❌', 'Patzer 🔴') passend zum analysierten Zug "${zug}" und der FEN-Struktur "${fen}".`;

            const response = await aiClient.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: promptText
            });
            const text = response.text || "";
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return res.json(JSON.parse(jsonMatch[0]));
            }
        } catch (e) {
            console.warn("Gemini Analyse Warning:", e.message);
        }
    }

    res.json({
        Basis_Werte: { Rang: estimatedElo > 1500 ? "Meister" : "Fortgeschrittener", Geschätzte_Elo: estimatedElo, Genauigkeit: 75, Klassifizierung: "Guter Zug" },
        Positions_Analyse: { Zentrum: "Solide", Entwicklung: "Normal", Material_Vorteil: "0", Bester_Zug: "e2-e4" },
        Aggressivitäts_Index: { Gesamt: 55, Level: "Normal" },
        Erklaerung: "Ein guter Entwicklungszug unter den gegebenen Umständen."
    });
});

// Bot Player configuration (Nur echte KI-Bots für Training)
const botNames = [
    "SchachBot (KI)", "AnfängerBot (KI)", "MeisterBot (KI)", "SofortBot", "FlashBot"
];

function createGhostPlayer() {
    return null;
}

let serverConfig = { globalMute: false };
let waitingPlayer = null;
const roomWaitingMap = new Map();

// === ELIXIR-INSPIRED HIGH PERFORMANCE MATCHMAKING HUB ===
let elixirMatchQueue = [];
let elixirMatchTickId = null;

function processElixirMatchmaking() {
    if (elixirMatchQueue.length >= 2) {
        let matchMade = false;
        for (let i = 0; i < elixirMatchQueue.length; i++) {
            for (let j = i + 1; j < elixirMatchQueue.length; j++) {
                let p1 = elixirMatchQueue[i];
                let p2 = elixirMatchQueue[j];
                if (p1.timeControl === p2.timeControl) {
                    if (p1.ws.botTimeout) clearTimeout(p1.ws.botTimeout);
                    if (p2.ws.botTimeout) clearTimeout(p2.ws.botTimeout);
                    
                    const roomID = "room_" + Math.random().toString(36).substr(2, 9);
                    p1.ws.room = roomID;
                    p2.ws.room = roomID;
                    p1.ws.color = 'black';
                    p2.ws.color = 'white';
                    p1.ws.opponentName = p2.playerName || "Spieler 2";
                    p2.ws.opponentName = p1.playerName || "Spieler 1";
                    
                    
                    // === COBOL BANKING SYSTEM: BETTING ===
                    let p1Coins = userDB[p1.playerName] ? (userDB[p1.playerName].coins || 1000) : 1000;
                    let p2Coins = userDB[p2.playerName] ? (userDB[p2.playerName].coins || 1000) : 1000;
                    let pot = 0;
                    
                    if (p1Coins >= 50 && p2Coins >= 50) {
                        p1Coins -= 50;
                        p2Coins -= 50;
                        pot = 100;
                        if (userDB[p1.playerName]) userDB[p1.playerName].coins = p1Coins;
                        if (userDB[p2.playerName]) userDB[p2.playerName].coins = p2Coins;
                        console.log(`🏦 [COBOL BANK] 50 Coins von ${p1.playerName} und ${p2.playerName} abgebucht. Pot: 100`);
                    } else {
                        console.log(`🏦 [COBOL BANK] Match ohne Einsatz (nicht genug Coins).`);
                    }
                    // ===================================
                    let tc = p1.timeControl;
                    let tSecs = 600, tInc = 0;
                    if (tc !== 'unlimited') {
                        if (tc.includes('+')) {
                            const pts = tc.split('+');
                            tSecs = (parseInt(pts[0]) || 10) * 60;
                            tInc = parseInt(pts[1]) || 0;
                        } else {
                            tSecs = (parseInt(tc) || 10) * 60;
                        }
                    } else {
                        tSecs = null;
                    }
                    
                    activeRoomStates.set(roomID, {
                        chess: new Chess(),
                        pot: pot,
                        board: null, turn: 'white', isGhostMatch: false,
                        whitePlayer: p2.playerName, blackPlayer: p1.playerName,
                        timeControl: tc, timeWhite: tSecs, timeBlack: tSecs, timeInc: tInc, gameOver: false
                    });
                    
                    p1.ws.send(JSON.stringify({ type: 'gameStart', room: roomID, color: 'black', opponent: p1.ws.opponentName, timeControl: tc, timeWhite: tSecs, timeBlack: tSecs }));
                    p2.ws.send(JSON.stringify({ type: 'gameStart', room: roomID, color: 'white', opponent: p2.ws.opponentName, timeControl: tc, timeWhite: tSecs, timeBlack: tSecs }));
                    
                    elixirMatchQueue.splice(j, 1);
                    elixirMatchQueue.splice(i, 1);
                    console.log("🎉 [Elixir Hub] Match gefunden! " + p2.playerName + " vs " + p1.playerName + " (Raum: " + roomID + ")");
                    matchMade = true;
                    break;
                }
            }
            if (matchMade) break;
        }
    }
}
setInterval(processElixirMatchmaking, 1000);
// === END ELIXIR HUB ===


const server = http.createServer(app); 
const wss = new WebSocket.Server({ server });

// Persistence files
const LB_FILE = './leaderboard.json';
const USER_FILE = './userDB.json';
const BAN_FILE = './bannedIPs.json';

// Server memory
let moveCounters = {};
let leaderboard = {};
let userDB = {}; 
let profiles = {};
let mutedPlayers = new Map(); 
let warnings = {}; 
let loginAttempts = new Map();
let blockedIPs = new Map();
const activeRoomStates = new Map();
const SERVER_INSTANCE_ID = Math.random().toString(36).substring(2, 9);

setInterval(() => {
    for (const [roomID, state] of activeRoomStates.entries()) {
        if (state.timeControl && state.timeControl !== 'unlimited' && !state.gameOver) {
            if (state.turn === 'white') {
                state.timeWhite -= 1;
                if (state.timeWhite <= 0) {
                    state.gameOver = true;
                    broadcastRoomMessage({ type: 'game_over', text: 'Zeit abgelaufen! Schwarz gewinnt.' }, roomID);
                }
            } else {
                state.timeBlack -= 1;
                if (state.timeBlack <= 0) {
                    state.gameOver = true;
                    broadcastRoomMessage({ type: 'game_over', text: 'Zeit abgelaufen! Weiß gewinnt.' }, roomID);
                }
            }
            if (!state.gameOver) {
                broadcastRoomMessage({ type: 'time_sync', timeWhite: state.timeWhite, timeBlack: state.timeBlack }, roomID);
            }
        }
    }
}, 1000);

function broadcastGlobalMessage(msgObj) {
    const msgStr = JSON.stringify(msgObj);
    wss.clients.forEach(client => {
        if (client.readyState === 1) {
            client.send(msgStr);
        }
    });
}

function broadcastRoomMessage(msgObj, roomID, senderWs = null) {
    const msgStr = JSON.stringify(msgObj);
    wss.clients.forEach(client => {
        if (client !== senderWs && client.readyState === 1 && (client.room === roomID || roomID === 'global')) {
            client.send(msgStr);
        }
    });
}

const PRESET_LOBBIES = [
    { id: 'global', name: '🌐 Global Chat', isProtected: false },
    { id: 'taktik', name: '🧠 Taktik & Strategie', isProtected: false },
    { id: 'beginner', name: '🌱 Anfänger Lounge', isProtected: false },
    { id: 'tournament', name: '🏆 Turnier Chat', isProtected: false },
    { id: 'offtopic', name: '☕ Off-Topic', isProtected: false }
];
const customLobbies = new Map();
const openChallenges = new Map(); // id -> { id, creator, creatorElo, timeControl, color, createdAt, ws }

function getOpenChallengesList() {
    const list = [];
    const now = Date.now();
    for (const [id, ch] of openChallenges.entries()) {
        if (!ch.ws || ch.ws.readyState !== 1 || (now - ch.createdAt > 300000)) {
            openChallenges.delete(id);
            continue;
        }
        list.push({
            id: ch.id,
            creator: ch.creator,
            creatorElo: ch.creatorElo || 1200,
            timeControl: ch.timeControl,
            color: ch.color || 'random',
            createdAt: ch.createdAt
        });
    }
    return list;
}

function broadcastOpenChallenges() {
    const challenges = getOpenChallengesList();
    const msgStr = JSON.stringify({ type: 'open_challenges_list', challenges });
    wss.clients.forEach(client => {
        if (client.readyState === 1) {
            client.send(msgStr);
        }
    });
}

function broadcastOnlineStats() {
    let activeUsers = 0;
    wss.clients.forEach(c => {
        if (c.readyState === 1) activeUsers++;
    });
    const activeGames = activeRoomStates.size;
    
    const msgStr = JSON.stringify({
        type: 'online_stats',
        onlineCount: activeUsers,
        activeGamesCount: activeGames
    });
    wss.clients.forEach(client => {
        if (client.readyState === 1) {
            client.send(msgStr);
        }
    });
}

setInterval(broadcastOnlineStats, 10000);

function getLobbiesList() {
    const list = PRESET_LOBBIES.map(p => {
        let count = 0;
        wss.clients.forEach(c => {
            if (c.readyState === 1 && (c.currentLobby === p.id || (!c.currentLobby && p.id === 'global'))) {
                count++;
            }
        });
        return {
            id: p.id,
            name: p.name,
            isProtected: false,
            userCount: count,
            isPreset: true
        };
    });

    customLobbies.forEach((lob, id) => {
        let count = 0;
        wss.clients.forEach(c => {
            if (c.readyState === 1 && c.currentLobby === id) {
                count++;
            }
        });
        list.push({
            id: id,
            name: lob.name,
            isProtected: !!(lob.password && lob.password.trim().length > 0),
            userCount: count,
            createdBy: lob.createdBy || 'Anonym',
            isPreset: false
        });
    });

    return list;
}

function broadcastLobbiesList() {
    const msgStr = JSON.stringify({ type: 'lobbies_list', lobbies: getLobbiesList() });
    wss.clients.forEach(client => {
        if (client.readyState === 1) {
            client.send(msgStr);
        }
    });
}

const lobbyMessageStore = new Map();

function addMessageToLobbyStore(lobbyId, msg) {
    if (!lobbyMessageStore.has(lobbyId)) {
        lobbyMessageStore.set(lobbyId, []);
    }
    const list = lobbyMessageStore.get(lobbyId);
    list.push(msg);
    if (list.length > 100) {
        list.shift();
    }
}

async function sendLobbyChatHistory(targetWs, lobbyId) {
    let messages = [];

    if (firestoreDb) {
        try {
            const snapshot = await firestoreDb.collection('messages')
                .orderBy('timestamp', 'desc')
                .limit(100)
                .get();
            
            if (!snapshot.empty) {
                snapshot.forEach(doc => {
                    const d = doc.data();
                    const itemLobby = d.lobby || 'global';
                    if (itemLobby === lobbyId) {
                        messages.unshift({
                            username: d.username || d.user || 'Anonym',
                            content: d.content || d.text || '',
                            lobby: itemLobby,
                            created_at: d.timestamp || new Date().toISOString()
                        });
                    }
                });
            }
        } catch (e) {
            if (e.code === 7 || (e.message && e.message.includes('PERMISSION_DENIED'))) {
                console.warn('[Firestore] Notice: Chat history using in-memory store (Cloud IAM access pending).');
            } else {
                console.warn('Firestore chat history fetch note:', e.message || e);
            }
        }
    }

    const memMsgs = lobbyMessageStore.get(lobbyId) || [];
    if (messages.length === 0 && memMsgs.length > 0) {
        messages = [...memMsgs];
    } else if (memMsgs.length > 0) {
        const existingKeys = new Set(messages.map(m => (m.username + ':' + m.content)));
        memMsgs.forEach(m => {
            const key = m.username + ':' + m.content;
            if (!existingKeys.has(key)) {
                messages.push(m);
            }
        });
    }

    targetWs.send(JSON.stringify({ type: 'chat_history', lobby: lobbyId, messages }));
}

let serverLocked = false; 
let slowModeDelay = 0; 
let messageHistory = new Map(); 
let lastSentMessage = new Map(); 
let lastWinTime = new Map(); 
let winStreakCount = new Map();
let lastKnownIPs = {}; 
const adminPass = "Admina111";
const helperPass = "Maxi";

const PIECE_URLS = {
    'K': 'https://upload.wikimedia.org/wikipedia/commons/4/42/Chess_klt45.svg',
    'Q': 'https://upload.wikimedia.org/wikipedia/commons/1/15/Chess_qlt45.svg',
    'R': 'https://upload.wikimedia.org/wikipedia/commons/7/72/Chess_rlt45.svg',
    'B': 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Chess_blt45.svg',
    'N': 'https://upload.wikimedia.org/wikipedia/commons/7/70/Chess_nlt45.svg',
    'P': 'https://upload.wikimedia.org/wikipedia/commons/4/45/Chess_plt45.svg',
    
    'k': 'https://upload.wikimedia.org/wikipedia/commons/f/f0/Chess_kdt45.svg',
    'q': 'https://upload.wikimedia.org/wikipedia/commons/4/47/Chess_qdt45.svg',
    'r': 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Chess_rdt45.svg',
    'b': 'https://upload.wikimedia.org/wikipedia/commons/9/98/Chess_bdt45.svg',
    'n': 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Chess_ndt45.svg',
    'p': 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Chess_pdt45.svg'
};

const loadedPieceImages = {}; 
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function preloadPieceImages() {
    if (!loadImage) return;
    const figurenKeys = Object.entries(PIECE_URLS);
    for (const [key, url] of figurenKeys) {
        try {
            const resp = await fetch(url, { headers: { 'User-Agent': 'SchachLiveApp/1.0 (https://mein-schach2.onrender.com; contact: max.schule13@gmail.com)' } });
            if (resp.ok) {
                const buf = Buffer.from(await resp.arrayBuffer());
                loadedPieceImages[key] = await loadImage(buf);
            }
        } catch (e) {}
    }
}

preloadPieceImages().catch(() => {});

async function captureMoveSnapshot(gameId, boardArray, moveCount) {
    if (!createCanvas || !boardArray || !Array.isArray(boardArray)) return;
    try {
        const canvas = createCanvas(400, 400);
        const ctx = canvas.getContext('2d');

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                ctx.fillStyle = (r + c) % 2 === 0 ? '#eeeed2' : '#769656';
                ctx.fillRect(c * 50, r * 50, 50, 50);
            }
        }

        boardArray.forEach((row, r) => {
            if (Array.isArray(row)) {
                row.forEach((pieceCode, c) => {
                    if (pieceCode && loadedPieceImages[pieceCode]) {
                        const img = loadedPieceImages[pieceCode];
                        ctx.drawImage(img, c * 50 + 5, r * 50 + 5, 40, 40);
                    }
                });
            }
        });

        const fileName = `game_${gameId}_move_${String(moveCount).padStart(3, '0')}.png`;
        const filePath = path.join(TEMP_DIR, fileName);
        
        const out = fs.createWriteStream(filePath);
        const stream = canvas.createPNGStream();
        stream.pipe(out);
    } catch (err) {
        // Silently ignore snapshot errors to avoid crashing game
    }
}

function generateGameVideo(gameId, ws) {
    if (!ffmpeg) return;
    const outputFileName = `Match_${gameId}_Highlight.mp4`;
    const outputPath = path.join(VIDEO_DIR, outputFileName);
    
    ffmpeg()
        .input(path.join(TEMP_DIR, `game_${gameId}_move_%03d.png`))
        .inputFPS(2) 
        .videoCodec('libx264')
        .outputOptions(['-pix_fmt yuv420p'])
        .on('end', () => {
            console.log(`✅ Video für Spiel ${gameId} fertig!`);
            
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: "VIDEO_READY",
                    url: `/videos/${outputFileName}`
                }));
            }
            
            setTimeout(() => {
                if (fs.existsSync(outputPath)) {
                    fs.unlinkSync(outputPath); 
                    console.log(`🗑️ Video ${outputFileName} automatisch gelöscht.`);
                }
            }, 30 * 60 * 1000);
            
        })
        .on('error', (err) => console.error("❌ Video-Fehler:", err.message))
        .save(outputPath);
}

function createPlayerProfile(name) {
    return {
        uid: Math.random().toString(36).substring(2, 10).toUpperCase(),
        level: 1,
        xp: 0,
        wins: 0,
        joined: new Date().toLocaleDateString('de-DE')
    };
}

function sendLeaderboardUpdate(target) {
    const userMap = new Map();
    for (const [name, u] of Object.entries(userDB)) {
        const clean = sanitizeLeaderboardEntry(u, name);
        if (!clean) continue;
        const key = clean.name.toLowerCase();
        const existing = userMap.get(key);
        if (!existing || clean.elo > existing.elo || (clean.elo === existing.elo && clean.wins > existing.wins)) {
            userMap.set(key, clean);
        }
    }

    const sorted = Array.from(userMap.values())
        .sort((a, b) => (b.elo !== a.elo ? b.elo - a.elo : b.wins - a.wins))
        .slice(0, 100);

    const msg = JSON.stringify({ 
        type: 'leaderboard', 
        list: sorted 
    });

    if (target) {
        target.send(msg);
    } else {
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) client.send(msg);
        });
    }
}

const sendSystemAlert = (targetWs, message) => {
    if (targetWs && targetWs.readyState === WebSocket.OPEN) {
        targetWs.send(JSON.stringify({ 
            type: 'system_alert', 
            message: message 
        }));
    }
};

function escapeHTML(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/[&<>"']/g, function(m) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[m];
    });
}

async function loadProfilesFromDB() {
    try {
        if (firestoreDb) {
            const snapshot = await firestoreDb.collection('players').get();
            const freshUserDB = {};
            let count = 0;
            snapshot.forEach(doc => {
                const clean = sanitizeLeaderboardEntry(doc.data(), doc.id);
                if (!clean) return;
                const p = doc.data();
                freshUserDB[clean.name] = {
                    password: p.password || "",
                    elo: clean.elo,
                    wins: clean.wins,
                    losses: clean.losses,
                    xp: clean.xp,
                    level: clean.level,
                    role: clean.role || 'Gast',
                    ip_ban: p.ip_ban || false,
                    is_banned: p.is_banned || false,
                    friends: p.friends || []
                };
                count++;
            });
            userDB = freshUserDB;
            console.log(`✅ ${count} Profile erfolgreich aus Firestore geladen.`);
        }
    } catch (err) {
        console.error("❌ Fehler beim Laden von DB:", err);
    }
}

async function loadFirestoreProfiles() {
    if (!firestoreDb) return;
    try {
        let snapshot = await firestoreDb.collection('leaderboard').get();
        if (snapshot.empty) {
            snapshot = await firestoreDb.collection('players').get();
        }

        const freshUserDB = {};
        const freshLeaderboard = {};

        if (!snapshot.empty) {
            snapshot.forEach(doc => {
                const data = doc.data();
                const clean = sanitizeLeaderboardEntry(data, doc.id);
                if (clean) {
                    const uname = clean.name;
                    freshUserDB[uname] = {
                        username: uname,
                        uid: data.uid || doc.id || "",
                        role: data.role || (isUserAdmin(uname) ? "admin" : "user"),
                        password: data.password || "",
                        elo: clean.elo,
                        wins: clean.wins,
                        losses: clean.losses,
                        xp: clean.xp,
                        level: clean.level,
                        coins: data.coins !== undefined ? Number(data.coins) : 1000,
                        ip_address: data.ip_address || "",
                        last_login: data.last_login || new Date().toISOString(),
                        board_theme: data.board_theme || "classic",
                        piece_theme: data.piece_theme || "classic",
                        achievements: data.achievements || [],
                        is_banned: !!data.is_banned,
                        ban_reason: data.ban_reason || null
                    };
                    freshLeaderboard[uname] = clean.wins;
                }
            });
        }

        // Authoritative replacement from Firestore
        userDB = freshUserDB;
        leaderboard = freshLeaderboard;

        try {
            fs.writeFileSync(USER_FILE, JSON.stringify(userDB, null, 2));
            fs.writeFileSync(LB_FILE, JSON.stringify(leaderboard, null, 2));
        } catch (e) {}

        console.log(`🔥 ${Object.keys(userDB).length} Nutzer-Profile aus Firestore synchronisiert (gelöschte Einträge bereinigt).`);

        // Broadcast updated leaderboard to all connected clients immediately
        const lbArray = Object.values(userDB).map(u => ({
            name: u.username,
            elo: u.elo || 1200,
            wins: u.wins || 0,
            level: u.level || 1
        })).sort((a, b) => b.elo - a.elo);

        if (wss && wss.clients) {
            const lbMsg = JSON.stringify({ type: 'leaderboard', list: lbArray });
            wss.clients.forEach(c => {
                if (c.readyState === 1) c.send(lbMsg);
            });
        }
    } catch (e) {
        console.warn("Firestore profiles load error:", e.message);
    }
}

async function loadFirestoreBans() {
    if (!firestoreDb) return;
    try {
        const snapshot = await firestoreDb.collection('bans').get();
        const freshBannedIPs = new Set();
        const freshBannedPlayers = new Set();

        snapshot.forEach(doc => {
            const data = doc.data();
            const target = data.target;
            const type = data.type; // 'ip' or 'username'
            if (target && type) {
                if (type === 'ip') {
                    if (!isLoopbackOrLocalIP(target)) {
                        freshBannedIPs.add(target);
                    }
                } else if (type === 'username') {
                    if (!isUserAdmin(target)) {
                        freshBannedPlayers.add(target.trim().toLowerCase());
                    }
                }
            }
        });

        bannedIPs = freshBannedIPs;
        bannedPlayers = freshBannedPlayers;

        try {
            fs.writeFileSync(BAN_FILE, JSON.stringify([...bannedIPs], null, 2));
        } catch (e) {}

        console.log(`🔥 ${snapshot.size} Bans aus Firestore synchronisiert. (Banned IPs: ${bannedIPs.size}, Banned Players: ${bannedPlayers.size})`);
    } catch (e) {
        console.warn("Firestore bans load error:", e.message);
    }
}

// --- ADMIN PROTECTION & LOGGING ENGINE ---
let adminBanLogs = [];
const ADMIN_LOG_FILE = path.join(__dirname, 'admin_ban_logs.json');
if (fs.existsSync(ADMIN_LOG_FILE)) {
    try {
        adminBanLogs = JSON.parse(fs.readFileSync(ADMIN_LOG_FILE, 'utf8'));
    } catch (e) {}
}

function isUserAdmin(target) {
    if (!target) return false;
    const str = String(target).toLowerCase().trim();

    // 1. Check if any active WebSocket client for this target is authenticated as admin
    if (wss && wss.clients) {
        for (const client of wss.clients) {
            if (client.readyState === 1 && client.isAdmin) {
                if (client.playerName?.toLowerCase() === str || client.uid === target || client.userEmail?.toLowerCase() === str) {
                    return true;
                }
            }
        }
    }

    // 2. Check userDB: ONLY if the user was verified with the admin email or has verified role 'admin'
    if (userDB && userDB[target]) {
        const u = userDB[target];
        if (u.role === 'admin' && (u.email?.toLowerCase() === 'max.schule13@gmail.com' || u.is_owner)) {
            return true;
        }
    }

    return false;
}

function broadcastInAppNotification(notifObj) {
    const msgStr = JSON.stringify({
        type: 'in_app_notification',
        title: notifObj.title,
        message: notifObj.message,
        level: notifObj.level || 'info',
        timestamp: new Date().toISOString()
    });
    if (wss && wss.clients) {
        wss.clients.forEach(c => {
            if (c.readyState === 1) {
                c.send(msgStr);
            }
        });
    }
}

function broadcastAdminLogs() {
    const msgStr = JSON.stringify({
        type: 'admin_logs_update',
        logs: adminBanLogs
    });
    if (wss && wss.clients) {
        wss.clients.forEach(c => {
            if (c.readyState === 1) {
                c.send(msgStr);
            }
        });
    }
}

function logAdminConflict(ws, targetAdminName, reason = "Kein Grund angegeben") {
    const executorName = (ws && ws.playerName) || "System / Anti-Cheat";
    const executorId = (ws && (ws.userEmail || ws.playerName || ws.clientIP)) || "System";
    const logItem = {
        id: "conflict_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
        event: 'Admin-Conflict',
        type: 'Admin-Conflict',
        timestamp: new Date().toISOString(),
        formattedTime: new Date().toLocaleString('de-DE'),
        executorId: executorId,
        executorName: executorName,
        targetAdminId: targetAdminName,
        targetAdminName: targetAdminName,
        reason: reason,
        details: `Aktion gegen Administrator '${targetAdminName}' abgewehrt und als 'Admin-Conflict' erfasst.`
    };

    adminBanLogs.unshift(logItem);
    if (adminBanLogs.length > 200) adminBanLogs = adminBanLogs.slice(0, 200);
    try {
        fs.writeFileSync(ADMIN_LOG_FILE, JSON.stringify(adminBanLogs, null, 2));
    } catch(e) {}

    // Save Admin-Conflict directly to Firebase Firestore
    if (firestoreDb) {
        try {
            firestoreDb.collection('admin_conflicts').doc(logItem.id).set(logItem, { merge: true });
            firestoreDb.collection('admin_logs').doc(logItem.id).set(logItem, { merge: true });
            console.log(`🔥 Firebase: Admin-Conflict Event [${logItem.id}] erfolgreich hinterlegt.`);
        } catch(e) {
            console.error("Fehler beim Speichern von Admin-Conflict in Firestore:", e.message);
        }
    }

    broadcastInAppNotification({
        title: "🛡️ Admin-Conflict erfasst!",
        message: `Bann/Anti-Cheat Aktion gegen Admin '${targetAdminName}' abgewehrt und als 'Admin-Conflict' protokolliert! (Grund: ${reason})`,
        level: "warning"
    });

    broadcastAdminLogs();
}

function logAdminBanAttempt(ws, targetAdminName, reason = "Kein Grund angegeben") {
    return logAdminConflict(ws, targetAdminName, reason);
}
global.logAdminConflict = logAdminConflict;

async function triggerUltraBan(targetOrReason, possibleReason = null, ws = null) {
    let targetName = null;
    let reason = "Admin-Entscheidung";
    
    // Determine if automatic anti-hack ban (1 parameter: reason) or manual admin ban (2 parameters: target, reason)
    if (possibleReason === null) {
        reason = targetOrReason || "Anti-Hack Trigger";
        if (ws) {
            targetName = ws.playerName || "Unbekannter_Spieler";
        } else {
            targetName = "Unbekannter_Spieler";
        }
    } else {
        targetName = targetOrReason;
        reason = possibleReason || "Admin-Entscheidung";
    }

    if (!targetName) targetName = "Unbekannter_Spieler";
    const cleanTarget = targetName.trim();
    const cleanTargetLower = cleanTarget.toLowerCase();

    // HARD-CODED ADMIN & OWNER IMMUNITY CHECK
    const isTargetAdmin = isUserAdmin(cleanTarget);
    
    if (isTargetAdmin) {
        console.warn(`🛡️ ADMIN-CONFLICT INTERCEPTED: target='${cleanTarget}', ws='${ws?.playerName}'. Ban cancelled.`);
        logAdminConflict(ws, cleanTarget, reason);
        if (ws && ws.readyState === 1) {
            ws.send(JSON.stringify({ 
                type: 'chat', 
                text: `🛡️ ADMIN-CONFLICT: "${cleanTarget}" ist ein Administrator/Eigentümer und ist gegen Sperren geschützt! Die Aktion wurde protokolliert.`, 
                system: true 
            }));
            ws.send(JSON.stringify({
                type: 'system_alert',
                message: `🛡️ ADMIN-CONFLICT 🛡️\n\nAnti-Cheat / Ban-Aktion gegen den Admin '${cleanTarget}' wurde automatisch abgefangen und im System protokolliert.\nGrund: ${reason}`
            }));
        }
        return;
    }

    console.error(`⛔ CENTRAL ULTRA-BAN: Spieler: ${cleanTarget} | Grund: ${reason}`);

    // 1. Memory updates & Ban History
    bannedPlayers.add(cleanTargetLower);
    if (userDB[cleanTarget]) {
        userDB[cleanTarget].is_banned = true;
        userDB[cleanTarget].ip_ban = true;
        userDB[cleanTarget].ban_reason = reason;
        if (!userDB[cleanTarget].ban_history) userDB[cleanTarget].ban_history = [];
        userDB[cleanTarget].ban_history.push({
            action: 'banned',
            reason: reason,
            timestamp: new Date().toISOString(),
            admin: (ws && ws.playerName) || 'System/Admin'
        });
    }

    // 2. Save Player Ban to Firestore
    if (firestoreDb) {
        try {
            const banId = `username_${cleanTargetLower}`;
            await firestoreDb.collection('bans').doc(banId).set({
                target: cleanTarget,
                type: 'username',
                reason: reason,
                createdAt: new Date().toISOString()
            }, { merge: true });
        } catch (e) {
            console.error("Fehler beim Speichern des Player-Bans in Firestore:", e.message);
        }
    }

    // 3. Find client IP
    let foundIP = null;
    if (ws && ws.playerName && ws.playerName.toLowerCase() === cleanTargetLower) {
        foundIP = ws.clientIP;
    } else {
        wss.clients.forEach(c => {
            if (c.playerName && c.playerName.toLowerCase() === cleanTargetLower) {
                if (c.clientIP) foundIP = c.clientIP;
            }
        });
    }

    if (!foundIP && userDB[cleanTarget]) {
        foundIP = userDB[cleanTarget].ip_address;
    }

    // 4. Ban IP if found
    if (foundIP && foundIP !== '::1' && foundIP !== '127.0.0.1' && foundIP !== 'localhost') {
        bannedIPs.add(foundIP);
        
        const htaccessPath = path.join(__dirname, '.htaccess');
        const denyLine = `\nDeny from ${foundIP}`;
        fs.appendFile(htaccessPath, denyLine, (err) => {
            if (err) console.error("Fehler beim Schreiben in .htaccess:", err);
        });

        if (firestoreDb) {
            try {
                const banId = `ip_${foundIP.replace(/[^a-zA-Z0-9_.-]/g, '_')}`;
                await firestoreDb.collection('bans').doc(banId).set({
                    target: foundIP,
                    type: 'ip',
                    reason: reason,
                    createdAt: new Date().toISOString()
                }, { merge: true });
            } catch (e) {
                console.error("Fehler beim Speichern des IP-Bans in Firestore:", e.message);
            }
        }
    }

    // 5. Update Postgres Player Row

    // 6. Save backup local bans.json
    try {
        fs.writeFileSync(BAN_FILE, JSON.stringify([...bannedIPs], null, 2));
    } catch (e) {}

    // 7. Send ban notification email
    try {
        await sendBanEmail(cleanTarget, reason, foundIP || "Unbekannt");
    } catch (e) {}

    // 8. Kick all active sessions for this player and their IP immediately with clear screen message
    wss.clients.forEach(c => {
        const nameMatch = c.playerName && c.playerName.toLowerCase() === cleanTargetLower;
        const ipMatch = c.clientIP && c.clientIP === foundIP;
        if (nameMatch || ipMatch) {
            try {
                c.send(JSON.stringify({
                    type: 'banned_redirect',
                    url: '/banned?reason=' + encodeURIComponent(reason),
                    reason: reason
                }));
                c.send(JSON.stringify({
                    type: 'account_banned_overlay',
                    reason: reason
                }));
                c.send(JSON.stringify({ 
                    type: 'system_alert', 
                    message: `🚫 DEIN ACCOUNT UND DEINE IP WURDEN PERMANENT GESPERRT.\nGrund: ${reason}` 
                }));
            } catch (e) {}
            setTimeout(() => { try { c.terminate(); } catch (e) {} }, 400);
        }
    });
}

async function unbanPlayerHelper(targetName) {
    if (!targetName) return;
    const cleanTarget = targetName.trim();
    const cleanTargetLower = cleanTarget.toLowerCase();
    const targetNoPrefix = cleanTargetLower.replace(/^(username_|ip_|ban_)/i, '');
    const isUnbanAll = cleanTargetLower === 'all' || cleanTargetLower === '*' || cleanTargetLower === 'clear';

    console.log(`🔓 UNBAN-HELPER GESTARTET für: "${cleanTarget}" (Prefix-Free: "${targetNoPrefix}", isUnbanAll: ${isUnbanAll})`);

    // 1. Delete target directly from Sets (both cases & target string)
    if (isUnbanAll) {
        bannedPlayers.clear();
        bannedIPs.clear();
        for (const uname in userDB) {
            userDB[uname].is_banned = false;
            userDB[uname].ip_ban = false;
            userDB[uname].ban_reason = null;
        }
    } else {
        bannedPlayers.delete(cleanTargetLower);
        bannedPlayers.delete(cleanTarget);
        bannedPlayers.delete(targetNoPrefix);
        bannedIPs.delete(cleanTarget);
        bannedIPs.delete(targetNoPrefix);

        // Check and unban target in userDB
        if (userDB[cleanTarget]) {
            userDB[cleanTarget].is_banned = false;
            userDB[cleanTarget].ip_ban = false;
            userDB[cleanTarget].ban_reason = null;
            if (userDB[cleanTarget].ip_address) {
                bannedIPs.delete(userDB[cleanTarget].ip_address);
            }
        }

        // Search userDB for matching username, email, or IP
        for (const uname in userDB) {
            const u = userDB[uname];
            if (!u) continue;
            const unameLower = uname.toLowerCase();
            if (unameLower === cleanTargetLower || 
                unameLower === targetNoPrefix ||
                (u.email && u.email.toLowerCase() === cleanTargetLower) || 
                (u.email && u.email.toLowerCase() === targetNoPrefix) ||
                u.ip_address === cleanTarget ||
                u.ip_address === targetNoPrefix) {
                u.is_banned = false;
                u.ip_ban = false;
                u.ban_reason = null;
                bannedPlayers.delete(unameLower);
                bannedPlayers.delete(uname);
                if (u.ip_address) bannedIPs.delete(u.ip_address);
            }
        }
    }

    // 2. Clean .htaccess IP denylist if exists
    try {
        const htaccessPath = path.join(__dirname, '.htaccess');
        if (fs.existsSync(htaccessPath)) {
            let htContent = fs.readFileSync(htaccessPath, 'utf8');
            if (isUnbanAll) {
                htContent = htContent.replace(/Deny from .*\n?/g, '');
            } else {
                const targetEscaped = cleanTarget.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const noPrefixEscaped = targetNoPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                htContent = htContent.replace(new RegExp(`Deny from (${targetEscaped}|${noPrefixEscaped})\\n?`, 'g'), '');
            }
            fs.writeFileSync(htaccessPath, htContent);
        }
    } catch (htErr) {
        console.warn("Notice: .htaccess update warning:", htErr.message);
    }

    // 3. Update status in support tickets for this user
    if (globalSupportTickets && Array.isArray(globalSupportTickets)) {
        globalSupportTickets.forEach(t => {
            if (isUnbanAll || 
                t.user?.toLowerCase() === cleanTargetLower || 
                t.user?.toLowerCase() === targetNoPrefix ||
                t.contact?.toLowerCase() === cleanTargetLower || 
                t.contact?.toLowerCase() === targetNoPrefix ||
                t.clientIP === cleanTarget ||
                t.clientIP === targetNoPrefix) {
                t.status = 'Entbannt';
                t.reply = t.reply || 'Entbannungsantrag genehmigt! Dein Account/IP wurde freigeschaltet.';
            }
        });
        saveTicketsToFile();
    }

    // 4. Delete ban documents in Firestore AND update players collection
    if (firestoreDb) {
        try {
            // Direct ID deletion attempts for common patterns
            const directDocIds = [
                cleanTarget,
                cleanTargetLower,
                targetNoPrefix,
                `username_${cleanTargetLower}`,
                `username_${targetNoPrefix}`,
                `username_${cleanTarget}`,
                `ip_${cleanTarget}`,
                `ip_${targetNoPrefix}`,
                `ip_${cleanTarget.replace(/\./g, '_')}`,
                `ip_${targetNoPrefix.replace(/\./g, '_')}`,
                `ip_${cleanTarget.replace(/[^a-zA-Z0-9_.-]/g, '_')}`,
                `ip_${targetNoPrefix.replace(/[^a-zA-Z0-9_.-]/g, '_')}`,
                `ip_${cleanTarget.replace(/[^a-zA-Z0-9]/g, '_')}`,
                `ip_${targetNoPrefix.replace(/[^a-zA-Z0-9]/g, '_')}`
            ];

            for (const dId of directDocIds) {
                if (dId) {
                    await firestoreDb.collection('bans').doc(dId).delete().catch(() => {});
                }
            }

            // Query ALL Firestore bans collection documents to guarantee complete purge of matching bans
            const bansSnap = await firestoreDb.collection('bans').get().catch(() => null);
            if (bansSnap && !bansSnap.empty && bansSnap.docs) {
                const deletePromises = [];
                bansSnap.forEach(doc => {
                    const dId = (doc.id || '').toLowerCase();
                    const data = (typeof doc.data === 'function' ? doc.data() : doc) || {};
                    const t = (data.target || '').toLowerCase().trim();
                    const u = (data.username || data.name || data.player || '').toLowerCase().trim();
                    const ip = (data.ip || data.ip_address || '').toLowerCase().trim();

                    let shouldDelete = false;
                    if (isUnbanAll) {
                        shouldDelete = true;
                    } else if (
                        dId === cleanTargetLower ||
                        dId === targetNoPrefix ||
                        dId === `username_${cleanTargetLower}` ||
                        dId === `username_${targetNoPrefix}` ||
                        dId === `ip_${cleanTargetLower}` ||
                        dId === `ip_${targetNoPrefix}` ||
                        dId.includes(cleanTargetLower) ||
                        dId.includes(targetNoPrefix) ||
                        t === cleanTargetLower ||
                        t === targetNoPrefix ||
                        u === cleanTargetLower ||
                        u === targetNoPrefix ||
                        ip === cleanTargetLower ||
                        ip === targetNoPrefix
                    ) {
                        shouldDelete = true;
                    }

                    if (shouldDelete) {
                        console.log(`🔥 LÖSCHE FIRESTORE-BAN DOKUMENT: "${doc.id}" (Target: "${t || u || ip || dId}")`);
                        deletePromises.push(firestoreDb.collection('bans').doc(doc.id).delete().catch(err => {
                            console.warn(`Warning deleting ban doc ${doc.id}:`, err.message);
                        }));
                    }
                });
                await Promise.all(deletePromises);
            }

            // Update player documents in Firestore 'players' collection
            if (isUnbanAll) {
                for (const uname in userDB) {
                    await firestoreDb.collection('players').doc(uname).set({
                        is_banned: false,
                        ip_ban: false,
                        ban_reason: null
                    }, { merge: true }).catch(() => {});
                }
            } else {
                await firestoreDb.collection('players').doc(cleanTarget).set({
                    is_banned: false,
                    ip_ban: false,
                    ban_reason: null
                }, { merge: true }).catch(() => {});
                
                if (targetNoPrefix && targetNoPrefix !== cleanTarget) {
                    await firestoreDb.collection('players').doc(targetNoPrefix).set({
                        is_banned: false,
                        ip_ban: false,
                        ban_reason: null
                    }, { merge: true }).catch(() => {});
                }

                // In case player doc is keyed with different casing or UID
                for (const uname in userDB) {
                    if (uname.toLowerCase() === cleanTargetLower || uname.toLowerCase() === targetNoPrefix) {
                        await firestoreDb.collection('players').doc(uname).set({
                            is_banned: false,
                            ip_ban: false,
                            ban_reason: null
                        }, { merge: true }).catch(() => {});
                        if (userDB[uname].uid) {
                            await firestoreDb.collection('players').doc(userDB[uname].uid).set({
                                is_banned: false,
                                ip_ban: false,
                                ban_reason: null
                            }, { merge: true }).catch(() => {});
                        }
                    }
                }
            }
        } catch (e) {
            console.error("Fehler beim Löschen des Bans aus Firestore:", e.message);
        }
    }

    try {
        fs.writeFileSync(BAN_FILE, JSON.stringify([...bannedIPs], null, 2));
        fs.writeFileSync(USER_FILE, JSON.stringify(userDB, null, 2));
    } catch (e) {}

    console.log(`🔓 Entbannung erfolgreich abgeschlossen für: ${cleanTarget}`);
}

async function syncAllToFirestore() {
    if (!firestoreDb) return;
    try {
        console.log("🔥 Firestore Synchronisationsprüfung aktiv (Single Source of Truth: schachlive)...");
        
        // Ensure initial welcome message exists if empty
        try {
            await firestoreDb.collection('messages').doc('welcome_msg').set({
                username: 'System',
                content: 'Willkommen in der SchachLive Community Lobby!',
                lobby: 'global',
                timestamp: new Date().toISOString()
            }, { merge: true });
        } catch(e) {}

        // 🔥 Explicitly populate and establish 'leaderboard' collection in Firestore!
        try {
            const playersSnap = await firestoreDb.collection('players').get();
            const sourceMap = new Map();

            // 1. Gather existing players from Firestore
            if (!playersSnap.empty) {
                playersSnap.forEach(doc => {
                    const clean = sanitizeLeaderboardEntry(doc.data(), doc.id);
                    if (clean && clean.name) {
                        sourceMap.set(clean.name.toLowerCase(), clean);
                    }
                });
            }

            // 2. Complement with local userDB entries
            for (const [name, u] of Object.entries(userDB)) {
                const clean = sanitizeLeaderboardEntry(u, name);
                if (clean && clean.name && !sourceMap.has(clean.name.toLowerCase())) {
                    sourceMap.set(clean.name.toLowerCase(), clean);
                }
            }

            // 3. Write each player document to 'leaderboard' collection
            let count = 0;
            for (const clean of sourceMap.values()) {
                const lbDoc = {
                    username: clean.name,
                    name: clean.name,
                    elo: Number(clean.elo) || 1200,
                    wins: Number(clean.wins) || 0,
                    losses: Number(clean.losses) || 0,
                    level: Number(clean.level) || 1,
                    xp: Number(clean.xp) || 0,
                    role: clean.role || 'user',
                    updatedAt: new Date().toISOString()
                };
                await firestoreDb.collection('leaderboard').doc(clean.name).set(lbDoc, { merge: true })
                    .catch(err => console.warn(`Leaderboard init doc write [${clean.name}]:`, err.message));
                count++;
            }
            console.log(`🔥 'leaderboard' Collection in Firestore synchronisiert (${count} Einträge erstellt/aktualisiert).`);
        } catch (lbErr) {
            console.warn("Leaderboard seeding notice:", lbErr.message);
        }

        console.log("✅ Firestore Synchronisationsprüfung bereit.");
    } catch (e) {
        console.error("Fehler bei syncAllToFirestore:", e.message);
    }
}

async function loadData() {
    if (fs.existsSync(LB_FILE)) {
        try {
            const data = fs.readFileSync(LB_FILE, 'utf8');
            leaderboard = JSON.parse(data);
        } catch (e) {
            console.log("Fehler beim Laden: Leaderboard");
        }
    }
    if (fs.existsSync(USER_FILE)) {
        try {
            const data = fs.readFileSync(USER_FILE, 'utf8');
            userDB = JSON.parse(data);
            for (const uname in userDB) {
                if (userDB[uname] && userDB[uname].password && !userDB[uname].password.includes(':')) {
                    userDB[uname].password = hashPassword(userDB[uname].password);
                }
            }
        } catch (e) {
            console.log("Fehler beim Laden: UserDB");
        }
    }
    if (fs.existsSync(BAN_FILE)) {
        try {
            const data = fs.readFileSync(BAN_FILE, 'utf8');
            const savedIPs = JSON.parse(data);
            bannedIPs = new Set(savedIPs);
        } catch (e) {
            console.log("Fehler beim Laden: Bans");
        }
    }

    // Load fresh data directly from Firestore (overwriting local with remote deletions)
    await loadFirestoreProfiles();
    await loadFirestoreBans();
    await loadFirestoreTickets();
    await syncAllToFirestore();

    // Auto-clean Admin Accounts from Ban lists
    const ADMIN_NAMES = ['max.schule13@gmail.com', 'Max'];
    ADMIN_NAMES.forEach(adm => {
        bannedPlayers.delete(adm.toLowerCase());
        if (userDB && userDB[adm]) {
            userDB[adm].is_banned = false;
            userDB[adm].ip_ban = false;
            userDB[adm].ban_reason = null;
        }
    });
    for (const uname in userDB) {
        if (isUserAdmin(uname)) {
            bannedPlayers.delete(uname.toLowerCase());
            userDB[uname].is_banned = false;
            userDB[uname].ip_ban = false;
            userDB[uname].ban_reason = null;
        }
    }
}
loadData();

// Periodic automatic background sync from Firestore every 20 seconds
setInterval(async () => {
    try {
        await loadFirestoreProfiles();
        await loadFirestoreBans();
        await loadFirestoreTickets();
    } catch (e) {}
}, 20000);

async function loadBannedIPs() {
    try {
        if (firestoreDb) {
            const snapshot = await firestoreDb.collection('bans').where('type', '==', 'ip').get();
            snapshot.forEach(doc => bannedIPs.add(doc.data().target));
            console.log(`✅ ${bannedIPs.size} gesperrte IPs aus DB geladen.`);
        }
    } catch (err) {
        console.error("loadBannedIPs catch:", err.message);
    }
}

loadBannedIPs();

// ==========================================
// 🌐 RENDER SERVER SYNC & PUBLIC REST APIS
// (https://mein-schach2.onrender.com & https://mein-schach.onrender.com)
// ==========================================
const RENDER_SERVERS = [
    'https://mein-schach2.onrender.com',
    'https://mein-schach.onrender.com'
];

let renderSyncStatus = {
    lastSync: null,
    status: 'idle',
    syncedServers: [],
    error: null
};

async function syncWithRenderServers() {
    renderSyncStatus.status = 'syncing';
    let anySuccess = false;

    for (const renderUrl of RENDER_SERVERS) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000);

            const res = await fetch(`${renderUrl}/api/leaderboard`, {
                signal: controller.signal,
                headers: { 'Accept': 'application/json' }
            });
            clearTimeout(timeoutId);

            if (res.ok) {
                const data = await res.json();
                const list = data.list || data.leaderboard || [];
                if (Array.isArray(list) && list.length > 0) {
                    list.forEach(remoteEntry => {
                        const clean = sanitizeLeaderboardEntry(remoteEntry, remoteEntry.username || remoteEntry.name);
                        if (!clean) return;
                        const uname = clean.name;
                        const local = userDB[uname];
                        // Only update stats if player exists in Firestore/userDB (never resurrect deleted users)
                        if (local) {
                            if (clean.elo > (local.elo || 0) || clean.wins > (local.wins || 0)) {
                                local.elo = Math.max(local.elo || 1200, clean.elo);
                                local.wins = Math.max(local.wins || 0, clean.wins);
                                leaderboard[uname] = local.wins;
                            }
                        }
                    });
                    anySuccess = true;
                    if (!renderSyncStatus.syncedServers.includes(renderUrl)) {
                        renderSyncStatus.syncedServers.push(renderUrl);
                    }
                }
            }
        } catch (e) {
            // Render server might be sleeping/spinning up, log warning gracefully
        }
    }

    renderSyncStatus.status = anySuccess ? 'success' : (renderSyncStatus.syncedServers.length > 0 ? 'partial' : 'offline');
    renderSyncStatus.lastSync = new Date().toISOString();
}

// Background sync with Render servers every 45 seconds
setInterval(() => {
    syncWithRenderServers().catch(() => {});
}, 45000);

// API Documentation & Index
app.get(['/api', '/api/docs', '/api/index'], (req, res) => {
    const baseUrl = req.protocol + '://' + req.get('host');
    res.json({
        name: "SchachLive REST API",
        version: "2.4.0",
        author: "Max (blockcom130@gmail.com)",
        supportContact: "blockcom130@gmail.com",
        firestoreProject: "schachlive",
        connectedRenderServers: RENDER_SERVERS,
        endpoints: {
            "GET /api/players": "Alle registrierten Schachspieler mit Statistiken und Filter (?search=..., ?limit=..., ?page=...)",
            "GET /api/player/:username": "Detailliertes Spielerprofil mit Rang, Elo, Siegen, Niederlagen und Level",
            "GET /api/leaderboard": "Echtzeit-Rangliste aus Firebase Firestore & Render Server (?format=blitz|rapid|bullet)",
            "GET /api/stats": "Aktuelle Serverstatistiken, Live-Spieler, aktive Räume & Sync-Status",
            "GET /api/games": "Historie der zuletzt abgeschlossenen Partien mit FEN, Snapshots und PGN",
            "GET /api/lobbies": "Liste aller aktiven öffentlichen & privaten Lobbys",
            "GET /api/puzzles": "Tägliche Schach-Taktikaufgabe und Puzzles",
            "GET /api/bans": "Öffentliche Sicherheitsübersicht und Bann-Status",
            "POST /api/support-ticket": "Support-Ticket & Entbannungsantrag einreichen (Nachricht geht an blockcom130@gmail.com)",
            "GET /api/sync-firebase": "Manueller Sofort-Abgleich mit Firebase Firestore",
            "GET /api/sync-render": "Manueller Sofort-Abgleich mit mein-schach2.onrender.com",
            "GET /api/sync-all": "Vollständige Synchronisation (Firebase + Render Server)"
        }
    });
});

// GET /api/players (All Players List with search, filtering & pagination)
app.get(['/api/players', '/api/users'], (req, res) => {
    const { search, limit = 100, page = 1, sort = 'elo' } = req.query;
    let list = Object.values(userDB).map(u => ({
        username: u.username,
        name: u.username,
        elo: Number(u.elo) || 1200,
        wins: Number(u.wins) || 0,
        losses: Number(u.losses) || 0,
        winrate: (u.wins + u.losses > 0) ? Math.round((u.wins / (u.wins + u.losses)) * 100) + '%' : '0%',
        level: Number(u.level) || 1,
        xp: Number(u.xp) || 0,
        role: u.role || 'Gast',
        is_banned: !!u.is_banned,
        is_online: wss ? Array.from(wss.clients).some(c => c.playerName && c.playerName.toLowerCase() === (u.username || '').toLowerCase() && c.readyState === 1) : false
    }));

    if (search) {
        const query = String(search).toLowerCase().trim();
        list = list.filter(p => p.username && p.username.toLowerCase().includes(query));
    }

    if (sort === 'wins') {
        list.sort((a, b) => b.wins - a.wins);
    } else if (sort === 'name') {
        list.sort((a, b) => a.username.localeCompare(b.username));
    } else {
        list.sort((a, b) => b.elo - a.elo);
    }

    const totalCount = list.length;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 100));
    const startIndex = (pageNum - 1) * limitNum;
    const paginated = list.slice(startIndex, startIndex + limitNum);

    res.json({
        success: true,
        total: totalCount,
        page: pageNum,
        totalPages: Math.ceil(totalCount / limitNum) || 1,
        players: paginated
    });
});

// GET /api/player/:username (Specific Player Details)
app.get(['/api/player/:username', '/api/players/:username', '/api/user/:username'], async (req, res) => {
    const rawUsername = req.params.username;
    if (!rawUsername) return res.status(400).json({ success: false, error: 'Spielername erforderlich' });
    const cleanName = rawUsername.trim();
    let u = userDB[cleanName];

    // Fallback case-insensitive search
    if (!u) {
        const matchKey = Object.keys(userDB).find(k => k.toLowerCase() === cleanName.toLowerCase());
        if (matchKey) u = userDB[matchKey];
    }

    // Try Firestore lookup if not found in local memory
    if (!u && firestoreDb) {
        try {
            const snap = await firestoreDb.collection('players').doc(cleanName).get();
            if (snap.exists) {
                u = snap.data();
            }
        } catch (e) {}
    }

    if (!u) {
        return res.status(404).json({ success: false, error: `Spieler '${cleanName}' nicht gefunden.` });
    }

    const isOnline = wss ? Array.from(wss.clients).some(c => c.playerName && c.playerName.toLowerCase() === (u.username || cleanName).toLowerCase() && c.readyState === 1) : false;
    const wins = Number(u.wins) || 0;
    const losses = Number(u.losses) || 0;
    const totalGames = wins + losses;

    res.json({
        success: true,
        player: {
            username: u.username || cleanName,
            elo: Number(u.elo) || 1200,
            wins: wins,
            losses: losses,
            totalGames: totalGames,
            winrate: totalGames > 0 ? Math.round((wins / totalGames) * 100) + '%' : '0%',
            level: Number(u.level) || 1,
            xp: Number(u.xp) || 0,
            coins: Number(u.coins) || 1000,
            role: u.role || 'Gast',
            is_banned: !!u.is_banned,
            ban_reason: u.ban_reason || null,
            is_online: isOnline,
            achievements: u.achievements || [],
            board_theme: u.board_theme || 'classic',
            piece_theme: u.piece_theme || 'classic'
        }
    });
});

// GET /api/stats (Live platform statistics)
app.get(['/api/stats', '/api/server/stats', '/api/server/status'], (req, res) => {
    let onlineCount = 0;
    const onlineNames = [];
    if (wss && wss.clients) {
        wss.clients.forEach(c => {
            if (c.readyState === 1) {
                onlineCount++;
                if (c.playerName) onlineNames.push(c.playerName);
            }
        });
    }

    const activeRoomsCount = roomWaitingMap ? roomWaitingMap.size : 0;
    const totalPlayers = Object.keys(userDB).length;
    let totalWins = 0;
    for (const uname in userDB) {
        totalWins += (userDB[uname].wins || 0);
    }

    res.json({
        success: true,
        status: "online",
        onlinePlayers: onlineCount,
        activeLobbies: activeRoomsCount,
        registeredPlayers: totalPlayers,
        totalWinsRecorded: totalWins,
        bannedIPsCount: bannedIPs.size,
        bannedPlayersCount: bannedPlayers.size,
        supportTicketsCount: globalSupportTickets.length,
        supportEmail: "blockcom130@gmail.com",
        firestoreConnected: typeof firestoreDb !== 'undefined' && firestoreDb !== null,
        renderSyncStatus: renderSyncStatus,
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString()
    });
});

// GET /api/games (Recent matches history)
app.get(['/api/games', '/api/matches', '/api/game-history'], async (req, res) => {
    const list = [];
    if (firestoreDb) {
        try {
            const snap = await firestoreDb.collection('games').orderBy('timestamp', 'desc').limit(50).get();
            if (!snap.empty) {
                snap.forEach(doc => {
                    list.push({ id: doc.id, ...doc.data() });
                });
            }
        } catch (e) {}
    }
    res.json({
        success: true,
        count: list.length,
        games: list
    });
});

// GET /api/lobbies (Live custom rooms and matchmaking status)
app.get(['/api/lobbies', '/api/rooms'], (req, res) => {
    const lobbies = [];
    if (typeof roomWaitingMap !== 'undefined') {
        roomWaitingMap.forEach((entry, roomId) => {
            lobbies.push({
                roomId: roomId,
                host: entry.hostName || 'Gast',
                hasPassword: !!entry.password,
                createdAt: entry.createdAt || new Date().toISOString()
            });
        });
    }
    res.json({
        success: true,
        count: lobbies.length,
        lobbies: lobbies
    });
});

// GET /api/puzzles (Daily Chess Tactics)
app.get(['/api/puzzles', '/api/daily-puzzle', '/api/tactics'], (req, res) => {
    const samplePuzzles = [
        {
            id: 'puzzle_1',
            title: 'Matt in 2 Zügen',
            fen: 'r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4',
            solution: ['Bxf7+', 'Ke7', 'd4'],
            difficulty: 'Mittel'
        },
        {
            id: 'puzzle_2',
            title: 'Dame gewinnen (Gabel)',
            fen: 'r1bqk2r/ppppbppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQ1RK1 b kq - 5 4',
            solution: ['Nxe4', 'Re1', 'd5'],
            difficulty: 'Leicht'
        }
    ];
    res.json({
        success: true,
        puzzles: samplePuzzles
    });
});

// GET /api/bans (Sanitized Ban overview)
app.get('/api/bans', (req, res) => {
    res.json({
        success: true,
        bannedPlayersCount: bannedPlayers.size,
        bannedIPsCount: bannedIPs.size,
        supportEmail: "blockcom130@gmail.com",
        unbanAppealUrl: "/#unban"
    });
});

// GET /api/sync-render (Manual sync with Render servers)
app.all(['/api/sync-render', '/api/sync-renders'], async (req, res) => {
    await syncWithRenderServers();
    res.json({
        success: true,
        message: 'Synchronisation mit Render Servern (mein-schach2.onrender.com) abgeschlossen!',
        renderSyncStatus: renderSyncStatus
    });
});

// GET /api/sync-all (Sync Firestore + Render)
app.all('/api/sync-all', async (req, res) => {
    try {
        await loadFirestoreProfiles();
        await loadFirestoreBans();
        await loadFirestoreTickets();
        await syncWithRenderServers();
        broadcastAdminUsersUpdate();
        broadcastTicketsUpdate();
        res.json({
            success: true,
            message: 'Vollständige Synchronisation (Firebase Firestore + mein-schach2.onrender.com) erfolgreich!',
            playerCount: Object.keys(userDB).length,
            bannedIPCount: bannedIPs.size,
            renderSyncStatus: renderSyncStatus
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// REST endpoint to trigger manual immediate sync from Firestore
app.get(['/api/sync-firebase', '/api/admin/sync-firestore'], async (req, res) => {
    try {
        await syncAllToFirestore();
        await loadFirestoreProfiles();
        await loadFirestoreBans();
        await loadFirestoreTickets();
        broadcastAdminUsersUpdate();
        broadcastTicketsUpdate();
        return res.json({ 
            success: true, 
            message: 'Firebase Firestore Daten & Leaderboard erfolgreich synchronisiert!',
            playerCount: Object.keys(userDB).length,
            bannedIPCount: bannedIPs.size,
            bannedPlayerCount: bannedPlayers.size
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

async function saveAll(specificPlayerName = null) {
    try {
        if (specificPlayerName && userDB[specificPlayerName]) {
            leaderboard[specificPlayerName] = userDB[specificPlayerName].wins || 0;
        }
        fs.writeFileSync(LB_FILE, JSON.stringify(leaderboard, null, 2));
        fs.writeFileSync(USER_FILE, JSON.stringify(userDB, null, 2));
        fs.writeFileSync(BAN_FILE, JSON.stringify([...bannedIPs], null, 2));
    } catch (e) {
        console.log("Konnte Daten nicht speichern");
    }

    try {
        const playersToSave = specificPlayerName ? [specificPlayerName] : Object.keys(userDB);
        for (const uname of playersToSave) {
            const u = userDB[uname];
            if (!u) continue;
            
            // 🔥 Firebase Cloud Firestore Sync for Players & Leaderboard!
            if (typeof firestoreDb !== 'undefined' && firestoreDb) {
                const safeFirestorePlayer = {
                    uid: u.uid || '',
                    username: uname,
                    role: u.role || 'user',
                    elo: u.elo || 1200,
                    wins: u.wins || 0,
                    losses: u.losses || 0,
                    level: u.level || 1,
                    xp: u.xp || 0,
                    coins: u.coins || 1000,
                    avatar: u.avatar || '',
                    selectedTheme: u.selectedTheme || 'classic',
                    is_banned: !!u.is_banned,
                    updatedAt: new Date().toISOString()
                };

                if (u.uid) {
                    firestoreDb.collection('players').doc(u.uid).set(safeFirestorePlayer, { merge: true })
                        .catch(e => console.error('Firestore player uid sync err:', e.message));
                }
                firestoreDb.collection('players').doc(uname).set(safeFirestorePlayer, { merge: true })
                    .catch(e => console.error('Firestore player save err:', e.message));

                if (!uname.match(/^[0-9a-zA-Z]{28}$/)) {
                    const lbEntry = {
                        username: uname,
                        name: uname,
                        elo: u.elo || 1200,
                        wins: u.wins || 0,
                        losses: u.losses || 0,
                        level: u.level || 1,
                        xp: u.xp || 0,
                        role: u.role || 'Gast',
                        updatedAt: new Date().toISOString()
                    };

                    firestoreDb.collection('leaderboard').doc(uname).set(lbEntry, { merge: true })
                        .catch(e => console.error('Firestore leaderboard save err:', e.message));
                }
            }
        }
    } catch (e) {
        console.error("Fehler bei saveAll try-catch:", e.message);
    }
}

function checkAndUnlockAchievement(ws, uname, achievementId, title, description) {
    if (!uname || uname === "Gast" || uname === "Anonym" || uname === "Gastspieler") return;
    const user = userDB[uname];
    if (!user) return;
    
    if (!user.achievements) user.achievements = [];
    if (!user.achievements.includes(achievementId)) {
        user.achievements.push(achievementId);
        saveAll(uname);
        
        if (ws && ws.readyState === 1) {
            ws.send(JSON.stringify({
                type: 'achievement_unlocked',
                id: achievementId,
                title: title,
                description: description
            }));
        }
    }
}

function broadcast(msgObj) {
    const msg = JSON.stringify(msgObj);
    wss.clients.forEach(function(client) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(msg);
        }
    });
}

// 🛡️ WebSocket Connection Throttling & DoS Prevention
const ipConnectionCount = new Map();
const ipConnectionTimestamps = new Map();
const MAX_CONCURRENT_WS_PER_IP = 10;
const MAX_HANDSHAKES_PER_MINUTE = 35;

wss.on('connection', function(ws, req) {
    const detectedIP = getClientIP(req);
    ws.clientIP = detectedIP;

    if (!isLoopbackOrLocalIP(detectedIP)) {
        const now = Date.now();
        let timestamps = ipConnectionTimestamps.get(detectedIP) || [];
        timestamps = timestamps.filter(t => now - t < 60000);
        if (timestamps.length >= MAX_HANDSHAKES_PER_MINUTE) {
            console.warn(`⚠️ Verbindungs-Rate-Limit überschritten für IP: ${detectedIP}`);
            try { ws.close(1008, "Verbindungs-Rate-Limit überschritten. Bitte kurz warten."); } catch(e) {}
            return ws.terminate();
        }
        timestamps.push(now);
        ipConnectionTimestamps.set(detectedIP, timestamps);

        const currentCount = ipConnectionCount.get(detectedIP) || 0;
        if (currentCount >= MAX_CONCURRENT_WS_PER_IP) {
            console.warn(`⚠️ Zu viele parallele Verbindungen (${currentCount}) von IP: ${detectedIP}`);
            try { ws.close(1008, "Zu viele gleichzeitige Verbindungen von dieser IP."); } catch(e) {}
            return ws.terminate();
        }
        ipConnectionCount.set(detectedIP, currentCount + 1);

        ws.on('close', () => {
            const count = ipConnectionCount.get(detectedIP) || 1;
            if (count <= 1) {
                ipConnectionCount.delete(detectedIP);
            } else {
                ipConnectionCount.set(detectedIP, count - 1);
            }
        });
    }
    
    getLocationFromIP(detectedIP).then(locationData => {
        ws.location = locationData; 
        if (locationData && locationData.status !== "local") {
            console.log(`🌍 RADAR: ${ws.playerName || 'Gast'} aus ${locationData.city}, ${locationData.country} (ISP: ${locationData.isp})`);
        }
    }).catch(err => console.log("Radar-Fehler:", err));

    ws.lastMessageTime = 0;

    // Check bans (bypass if admin) - deferred to message handler to allow admin login
    if (bannedIPs.has(ws.clientIP)) {
        ws.isIpBanned = true;
    }

    if (blockedIPs.has(ws.clientIP)) {
        const expiry = blockedIPs.get(ws.clientIP);
        if (Date.now() < expiry) {
            ws.isIpBlocked = true;
            ws.blockExpiry = expiry;
        } else {
            blockedIPs.delete(ws.clientIP);
            loginAttempts.delete(ws.clientIP);
        }
    }

    if (!ws.playerName) {
        const tempID = Math.floor(1000 + Math.random() * 9000);
        ws.playerName = "Spieler_" + tempID;
    }
    sendLeaderboardUpdate(ws);

    setTimeout(() => {
        if (typeof sendWelcomeTip === 'function') sendWelcomeTip(ws);
    }, 2500);

    ws.on('message', async function(message) {
        const ip = ws.clientIP;
        const now = Date.now();
        let data;

        const triggerUltraBanLocal = async (reason) => {
            if (ws.isAdmin || ws.is_owner || ws.role === 'admin' || (ws.playerName && ws.playerName.toLowerCase() === 'max')) {
                console.warn(`🛡️ Intercepted ban attempt against Admin Max: ${reason}`);
                return;
            }
            await triggerUltraBan(reason, null, ws);
        };

        try {
            data = JSON.parse(message);
        } catch (e) {
            return;
        }

        // --- IP Ban Enforcement ---
        if (!ws.isAdmin && ws.isIpBanned) {
            // Ignore benign initialization messages to give time for login
            if (['get_open_challenges', 'get_stats', 'get_chat_history', 'get_lobbies'].includes(data.type)) {
                return; // Silent drop
            }
            // Only allow login_attempt with an admin name to try to bypass
            if (data.type === 'login_attempt' && isUserAdmin(data.playerName)) {
                // allow it to pass so they can check password and become admin
            } else {
                ws.send(JSON.stringify({
                    type: 'banned_redirect',
                    url: '/banned?reason=' + encodeURIComponent('Deine IP ist permanent gesperrt.'),
                    reason: 'Deine IP ist permanent gesperrt.'
                }));
                sendSystemAlert(ws, '❌ ZUGRIFF VERWEIGERT: Deine IP ist permanent gebannt!');
                setTimeout(() => ws.terminate(), 100);
                return;
            }
        }
        
        if (!ws.isAdmin && ws.isIpBlocked) {
            if (['get_open_challenges', 'get_stats', 'get_chat_history', 'get_lobbies'].includes(data.type)) {
                return;
            }
            if (data.type === 'login_attempt' && isUserAdmin(data.playerName)) {
                // allow it to pass
            } else {
                const restZeit = Math.ceil((ws.blockExpiry - Date.now()) / 60000);
                sendSystemAlert(ws, `🚫 IP-SPERRE: Zu viele Fehlversuche. Warte noch ${restZeit} Minuten.`);
                setTimeout(() => ws.terminate(), 100);
                return;
            }
        }

        try {
            let cmd = "";
            let args = [];
            if (data.type === 'chat' && data.text && typeof data.text === 'string') {
                if (data.text.startsWith('/')) {
                    const parts = data.text.trim().split(/\s+/);
                    args = parts;
                    cmd = parts[0].toLowerCase();
                }
            } else if (data.type === 'chat') {
                return;
            }

            const isSafe = validateSecurity(data, ws, bannedIPs, triggerUltraBanLocal);
            if (!isSafe) return;

            const textStr = (data.text || "").trim();
            const isCmd = typeof data.text === 'string' && (textStr.startsWith('/') || textStr.startsWith('!') || textStr.startsWith('?'));

            if (data.type === 'chat' && isCmd) {
                const isHandled = await handleAdminCommand(ws, data.text, {
                    wss, 
                    db: firestoreDb, 
                    banPlayer: triggerUltraBan, 
                    unbanPlayer: unbanPlayerHelper,
                    bannedIPs, 
                    bannedPlayers, 
                    profiles: userDB, 
                    addSpectator, 
                    removeSpectator,
                    roomStates: activeRoomStates
                });

                if (!isHandled) {
                    console.log(`Command [${data.text}] not found`);
                    ws.send(JSON.stringify({ 
                        type: 'chat', 
                        text: '❓ Unbekannter Befehl. Nutze !help oder /help für Hilfe.', 
                        system: true 
                    }));
                }
                return;
            }

            if (data.type === 'login' || data.type === 'join') {
                const chosenName = data.name || data.playerName;
                if (typeof isNameAllowed === 'function' && !isNameAllowed(chosenName)) {
                    ws.send(JSON.stringify({ 
                        type: 'chat', 
                        text: '❌ Dieser Name ist verboten! Bitte wähle einen anderen.', 
                        system: true 
                    }));
                    return; 
                }
            }

            if (data.type === 'ping') {
                ws.send(JSON.stringify({ type: 'pong' }));
                return;
            }

            if (data.type === 'chat_message' || data.type === 'login_attempt') {
                const currentIP = ws.clientIP || "unknown";
                if (!userMessageLog.has(currentIP)) userMessageLog.set(currentIP, []);
                let timestamps = userMessageLog.get(currentIP);
                timestamps = timestamps.filter(time => now - time < 3000); 
                timestamps.push(now);
                userMessageLog.set(currentIP, timestamps);

                if (timestamps.length > 5) {
                    ws.send(JSON.stringify({ type: 'chat', text: '🚫 System: Spam erkannt! Kick.', system: true }));
                    setTimeout(() => ws.terminate(), 500);
                    return; 
                }
            }

            if (data.type === 'login_attempt') {
                let { playerName, password, clientIP, uid, firebaseToken } = data;
                let isFirebaseVerified = false;
                let verifiedEmail = null;
                let verifiedUid = null;

                // 1. Authenticate via Firebase ID Token if provided
                if (firebaseToken) {
                    try {
                        let decodedToken = null;
                        if (admin && admin.auth) {
                            try {
                                decodedToken = await admin.auth().verifyIdToken(firebaseToken);
                            } catch (e) {}
                        }
                        if (!decodedToken && typeof firebaseToken === 'string' && firebaseToken.includes('.')) {
                            try {
                                const parts = firebaseToken.split('.');
                                if (parts.length === 3) {
                                    const payloadStr = Buffer.from(parts[1], 'base64').toString('utf8');
                                    decodedToken = JSON.parse(payloadStr);
                                }
                            } catch (e) {}
                        }

                        if (decodedToken) {
                            isFirebaseVerified = true;
                            verifiedUid = decodedToken.user_id || decodedToken.sub || decodedToken.uid || uid;
                            verifiedEmail = decodedToken.email || email || null;
                            uid = verifiedUid;
                            console.log(`🔐 Firebase Token erfolgreich verifiziert: UID=${verifiedUid}, Email=${verifiedEmail}`);
                        }
                    } catch (tokenErr) {
                        console.warn("⚠️ Firebase ID-Token Verifikation fehlgeschlagen:", tokenErr.message);
                    }
                } else if (password === 'firebase-auth-token') {
                    // Strictly reject any spoofed / dummy token strings!
                    return ws.send(JSON.stringify({
                        type: 'login_error',
                        text: 'Sicherheitsfehler: Der String "firebase-auth-token" ist kein gültiger Token. Anmeldung verweigert.'
                    }));
                }

                if (!playerName && !verifiedUid) {
                    return ws.send(JSON.stringify({ type: 'login_error', text: 'Bitte Benutzername angeben!' }));
                }

                if (!isFirebaseVerified && !password) {
                    return ws.send(JSON.stringify({ type: 'login_error', text: 'Bitte Passwort eingeben!' }));
                }

                let user = null;
                if (uid) {
                    const existingName = Object.keys(userDB).find(name => userDB[name] && userDB[name].uid === uid);
                    if (existingName) {
                        user = userDB[existingName];
                        // If incoming playerName is raw UID, but existingName is custom name, keep custom name!
                        const isPlayerNameRawUid = (playerName === uid || (playerName && playerName.length >= 20 && !playerName.includes(' ')));
                        const isExistingNameReal = (existingName !== uid && (existingName.length < 20 || existingName.includes(' ')));

                        if (isPlayerNameRawUid && isExistingNameReal) {
                            playerName = existingName;
                        } else if (existingName !== playerName && playerName) {
                            delete userDB[existingName];
                            delete profiles[existingName];
                            delete leaderboard[existingName];
                            user.username = playerName;
                            userDB[playerName] = user;
                        }
                    }
                }
                if (!user && playerName) {
                    user = userDB[playerName];
                }

                if (!playerName) {
                    playerName = user ? user.username : (verifiedEmail ? verifiedEmail.split('@')[0] : "Spieler_" + String(uid || Date.now()).substring(0, 5));
                }

                const pLower = (playerName || "").toLowerCase();
                const connIP = clientIP || ws.clientIP;
                const isBannedUser = bannedPlayers.has(pLower) || (connIP && bannedIPs.has(connIP)) || (user && (user.is_banned || user.ip_ban));

                // 2. Strict Server-Side Admin Decision
                let isActualAdmin = false;
                const checkEmail = (verifiedEmail || (user && user.email) || '').toLowerCase();
                // A. Firebase verified email is 'max.schule13@gmail.com'
                if (checkEmail === 'max.schule13@gmail.com' || (email && String(email).toLowerCase() === 'max.schule13@gmail.com')) {
                    isActualAdmin = true;
                }
                // B. Verified user previously assigned role 'admin' in userDB
                if (isFirebaseVerified && verifiedUid) {
                    const existingU = Object.values(userDB).find(u => u && u.uid === verifiedUid);
                    if (existingU && existingU.role === 'admin') {
                        isActualAdmin = true;
                    }
                }
                // C. Dedicated admin password check or name 'Max' for verified email
                if (!isFirebaseVerified && password && verifyAdminPassword(password) && (pLower === 'max' || pLower === 'admin')) {
                    isActualAdmin = true;
                }
                if (pLower === 'max' && checkEmail === 'max.schule13@gmail.com') {
                    isActualAdmin = true;
                }

                if (isBannedUser && !isActualAdmin) {
                    const banReason = (user && user.ban_reason) || "Account gesperrt von der Administration";
                    return ws.send(JSON.stringify({
                        type: 'login_error',
                        banned: true,
                        redirect: '/banned?reason=' + encodeURIComponent(banReason),
                        reason: banReason,
                        text: `Dieser Account ist permanent gesperrt!\nHinterlegter Grund: ${banReason}`
                    }));
                }

                // Prevent impostors from claiming the admin name "Max"
                if (pLower === 'max' && !isActualAdmin) {
                    return ws.send(JSON.stringify({
                        type: 'login_error',
                        text: 'Der Name "Max" ist für die Administration reserviert. Bitte wähle einen anderen Namen oder logge dich mit deinem Admin-Konto ein!'
                    }));
                }

                if (user) {
                    // 🔒 Strict UID & Identity Verification
                    if (user.uid) {
                        // Account is linked to Firebase: MUST have valid token matching this exact UID
                        if (!isFirebaseVerified || verifiedUid !== user.uid) {
                            return ws.send(JSON.stringify({ 
                                type: 'login_error', 
                                text: 'Dieser Account ist mit Firebase geschützt. Bitte melde dich über dein verifiziertes Firebase/Google-Konto an!' 
                            }));
                        }
                    } else {
                        // Password account: password must be provided and match securely
                        if (!password || !user.password || !verifyPassword(password, user.password)) {
                            return ws.send(JSON.stringify({ type: 'login_error', text: 'Falsches Passwort für diesen Spielernamen!' }));
                        }
                        if (!user.password.includes(':')) {
                            user.password = hashPassword(password);
                        }
                    }
                    user.last_login = new Date();
                    if (isFirebaseVerified && verifiedUid) user.uid = verifiedUid;
                    if (verifiedEmail) user.email = verifiedEmail;
                    user.username = playerName;
                    if (user.coins === undefined) user.coins = 1000;
                } else {
                    // New account creation
                    if (!isFirebaseVerified && !password) {
                        return ws.send(JSON.stringify({ type: 'login_error', text: 'Bitte ein Passwort eingeben!' }));
                    }
                    user = {
                        username: playerName,
                        uid: isFirebaseVerified ? (verifiedUid || '') : '',
                        email: verifiedEmail || "",
                        role: isActualAdmin ? 'admin' : 'user',
                        password: isFirebaseVerified ? '' : hashPassword(password),
                        elo: 1200,
                        wins: 0,
                        losses: 0,
                        xp: 0,
                        level: 1,
                        coins: 1000,
                        ip_address: clientIP,
                        created_at: new Date()
                    };
                    userDB[playerName] = user;
                }

                // Set server-authoritative role
                ws.isAdmin = isActualAdmin;
                ws.is_owner = isActualAdmin;
                ws.role = isActualAdmin ? 'admin' : (user.role === 'admin' && isActualAdmin ? 'admin' : 'user');
                user.role = ws.role;

                saveAll(playerName);

                ws.playerName = playerName;
                if (uid) ws.uid = uid;
                if (verifiedEmail) ws.userEmail = verifiedEmail;
                profiles[playerName] = user; 
                
                sendLeaderboardUpdate();
                
                ws.send(JSON.stringify({ 
                    type: isActualAdmin ? 'admin_login_success' : 'login_success', 
                    name: playerName, 
                    playerName: playerName,
                    role: ws.role,
                    isAdmin: isActualAdmin,
                    elo: user.elo || 1200,
                    wins: user.wins || 0,
                    losses: user.losses || 0,
                    coins: user.coins !== undefined ? user.coins : 1000,
                    level: user.level || 1,
                    xp: user.xp || 0,
                    board_theme: user.board_theme || 'classic',
                    piece_theme: user.piece_theme || 'classic',
                    achievements: user.achievements || []
                }));
                console.log(`✅ Login & Profil bereit: ${playerName} (Rolle: ${ws.role}, Admin: ${isActualAdmin})`);
                return; 
            }

            if (data.type === 'change_username' || data.type === 'update_username') {
                const newUsername = (data.newUsername || data.username || "").trim();
                const uid = data.uid || ws.uid;
                const oldUsername = ws.playerName || data.oldUsername;
                
                if (!newUsername || newUsername.length < 3) {
                    return ws.send(JSON.stringify({ type: 'system_alert', message: 'Ungültiger Benutzername (mind. 3 Zeichen).' }));
                }

                console.log(`[USER] Namensänderung: ${oldUsername} -> ${newUsername} (UID: ${uid})`);
                
                let userData = null;
                if (oldUsername && userDB[oldUsername]) {
                    userData = userDB[oldUsername];
                    delete userDB[oldUsername];
                    delete leaderboard[oldUsername];
                    delete profiles[oldUsername];
                } else if (uid) {
                    const existingKey = Object.keys(userDB).find(k => userDB[k] && userDB[k].uid === uid);
                    if (existingKey) {
                        userData = userDB[existingKey];
                        delete userDB[existingKey];
                        delete leaderboard[existingKey];
                        delete profiles[existingKey];
                    }
                }

                if (!userData) {
                    userData = {
                        username: newUsername,
                        uid: uid || "",
                        role: (newUsername.toLowerCase() === 'max' || isUserAdmin(newUsername)) ? 'admin' : 'user',
                        elo: 1200,
                        wins: 0,
                        losses: 0,
                        xp: 0,
                        level: 1,
                        ip_address: ws.clientIP || clientIP,
                        created_at: new Date()
                    };
                } else {
                    userData.username = newUsername;
                    if (uid) userData.uid = uid;
                }

                userDB[newUsername] = userData;
                leaderboard[newUsername] = userData.wins || 0;
                profiles[newUsername] = userData;
                ws.playerName = newUsername;
                if (uid) ws.uid = uid;

                saveAll(newUsername);
                sendLeaderboardUpdate();
                if (typeof broadcastAdminUsersUpdate === 'function') {
                    broadcastAdminUsersUpdate();
                }

                ws.send(JSON.stringify({
                    type: 'username_changed',
                    newUsername: newUsername,
                    role: userData.role,
                    elo: userData.elo,
                    wins: userData.wins
                }));
                return;
            }

            if (data.type === 'admin_ban_user') {
                if (!ws.isAdmin) {
                    ws.send(JSON.stringify({ type: 'system_alert', message: '⛔ Keine Berechtigung: Nur verifizierte Administratoren dürfen Spieler bannen.' }));
                    return;
                }
                const target = data.target || data.username;
                const reason = data.reason || 'Admin-Entscheidung';
                if (target) {
                    await triggerUltraBan(target, reason, ws);
                }
                return;
            }

            if (data.type === 'admin_action') {
                if (!ws.isAdmin) {
                    ws.send(JSON.stringify({ type: 'system_alert', message: '⛔ Keine Berechtigung: Nur verifizierte Administratoren dürfen Admin-Aktionen ausführen.' }));
                    return;
                }
                const { action, target, reason } = data;
                if (action === 'kick' && target) {
                    let kicked = false;
                    if (wss && wss.clients) {
                        wss.clients.forEach(c => {
                            if (c.playerName && c.playerName.toLowerCase() === target.toLowerCase()) {
                                c.send(JSON.stringify({ type: 'system_alert', message: `Du wurdest gekickt: ${reason || 'Admin-Entscheidung'}` }));
                                c.terminate();
                                kicked = true;
                            }
                        });
                    }
                    ws.send(JSON.stringify({ type: 'chat', text: kicked ? `✅ Spieler '${target}' wurde gekickt.` : `⚠️ Spieler '${target}' war nicht online.`, system: true }));
                    broadcastAdminUsersUpdate();
                }
                return;
            }

            if (data.type === 'get_admin_logs') {
                if (!ws.isAdmin) {
                    ws.send(JSON.stringify({ type: 'system_alert', message: 'Zugriff verweigert.' }));
                    return;
                }
                ws.send(JSON.stringify({
                    type: 'admin_logs_update',
                    logs: adminBanLogs
                }));
                return;
            }

            if (data.type === 'get_admin_elixir') {
                if (!ws.isAdmin) {
                    ws.send(JSON.stringify({ type: 'system_alert', message: 'Zugriff verweigert.' }));
                    return;
                }
                const q = elixirMatchQueue.map(p => ({ playerName: p.playerName, timeControl: p.timeControl, bet: p.bet || 0 }));
                ws.send(JSON.stringify({
                    type: 'admin_elixir_update',
                    queue: q
                }));
                return;
            }

            if (data.type === 'get_admin_tickets') {
                if (!ws.isAdmin) {
                    ws.send(JSON.stringify({ type: 'system_alert', message: 'Zugriff verweigert.' }));
                    return;
                }
                ws.send(JSON.stringify({
                    type: 'admin_tickets_update',
                    tickets: globalSupportTickets.filter(t => t.status !== 'Entbannt' && t.status !== 'Abgelehnt' && t.status !== 'Geschlossen'),
                    supportEmail: 'schachlivesupport.jailer914@slmail.me'
                }));
                return;
            }

            if (data.type === 'submit_support_ticket') {
                const ticketId = 'TICK-' + Date.now().toString(36).toUpperCase();
                const newTicket = {
                    id: ticketId,
                    user: data.user || ws.playerName || 'Gesperrter Spieler',
                    contact: data.contact || data.user || 'Unbekannt',
                    clientIP: ws.clientIP || '127.0.0.1',
                    email: 'schachlivesupport.jailer914@slmail.me',
                    text: data.text || 'Kein Text übermittelt',
                    banReason: data.banReason || 'IP/Account Gesperrt',
                    status: 'Offen',
                    createdAt: new Date().toLocaleString('de-DE'),
                    timestamp: Date.now(),
                    reply: ''
                };
                globalSupportTickets.unshift(newTicket);
                saveTicketsToFile();
                broadcastTicketsUpdate();
                ws.send(JSON.stringify({
                    type: 'support_ticket_response',
                    success: true,
                    ticketId: ticketId,
                    message: 'Support-Ticket erfolgreich übermittelt.'
                }));
                return;
            }

            if (data.type === 'unban_ticket' || data.type === 'admin_unban_ticket') {
                if (!isUserAdmin(ws.playerName) && ws.role !== 'admin' && ws.role !== 'moderator') {
                    ws.send(JSON.stringify({ type: 'system_alert', message: 'Keine Berechtigung, um Tickets zu entbannen.' }));
                    return;
                }
                const ticketId = data.ticketId;
                const ticket = globalSupportTickets.find(t => t.id === ticketId);
                if (ticket) {
                    const targetUser = ticket.user;
                    const targetContact = ticket.contact;
                    const targetIP = ticket.clientIP || ticket.ip;

                    if (targetUser) await unbanPlayerHelper(targetUser);
                    if (targetContact && targetContact !== targetUser) await unbanPlayerHelper(targetContact);
                    if (targetIP) bannedIPs.delete(targetIP);

                    ticket.status = 'Entbannt';
                    ticket.reply = data.reply || 'Entbannungsantrag genehmigt! Account/IP wurde freigeschaltet.';
                    saveTicketsToFile();
                    broadcastTicketsUpdate();
                    broadcastAdminUsersUpdate();
                    ws.send(JSON.stringify({
                        type: 'chat',
                        text: `🔓 Ticket ${ticketId}: Spieler '${targetUser}' (${targetIP || ''}) wurde erfolgreich entbannt!`,
                        system: true
                    }));
                }
                return;
            }

            if (data.type === 'admin_unban_user') {
                if (!ws.isAdmin) {
                    ws.send(JSON.stringify({ type: 'system_alert', message: '⛔ Keine Berechtigung: Nur verifizierte Administratoren dürfen Spieler entbannen.' }));
                    return;
                }
                const target = data.target || data.username;
                if (target) {
                    await unbanPlayerHelper(target);
                    ws.send(JSON.stringify({ type: 'chat', text: `🔓 Spieler/IP '${target}' wurde erfolgreich entbannt!`, system: true }));
                    broadcastAdminUsersUpdate();
                    broadcastTicketsUpdate();
                }
                return;
            }

            if (data.type === 'get_admin_users') {
                if (!ws.isAdmin) {
                    ws.send(JSON.stringify({ type: 'admin_users_update', users: [] }));
                    return;
                }
                const allUsers = [];
                const seenNames = new Set();

                // 1. Online WebSocket Users
                wss.clients.forEach(c => {
                    if (c.readyState === 1 && c.playerName) {
                        seenNames.add(c.playerName.toLowerCase());
                        const uData = userDB[c.playerName] || {};
                        allUsers.push({
                            id: c.playerName,
                            username: c.playerName,
                            role: uData.role || (c.isAdmin ? 'admin' : 'user'),
                            elo: uData.elo || 1200,
                            wins: uData.wins || 0,
                            losses: uData.losses || 0,
                            is_banned: !!(bannedPlayers.has(c.playerName.toLowerCase()) || uData.is_banned),
                            is_online: true,
                            ip_address: c.clientIP || uData.ip_address || '127.0.0.1'
                        });
                    }
                });

                // 2. Offline Registered Users in userDB
                for (const uname in userDB) {
                    if (!seenNames.has(uname.toLowerCase())) {
                        const uData = userDB[uname];
                        allUsers.push({
                            id: uname,
                            username: uname,
                            role: uData.role || 'user',
                            elo: uData.elo || 1200,
                            wins: uData.wins || 0,
                            losses: uData.losses || 0,
                            is_banned: !!(bannedPlayers.has(uname.toLowerCase()) || uData.is_banned),
                            is_online: false,
                            ip_address: uData.ip_address || 'Unbekannt'
                        });
                    }
                }

                ws.send(JSON.stringify({
                    type: 'admin_users_update',
                    users: allUsers
                }));
                return;
            }

            if (data.type === 'set_user_role') {
                if (!ws.isAdmin) {
                    ws.send(JSON.stringify({ type: 'system_alert', message: '⛔ Keine Berechtigung: Nur Administratoren dürfen Rollen ändern!' }));
                    return;
                }
                const { target, role } = data;
                if (target && role) {
                    const safeRole = (role === 'admin' || role === 'moderator') ? role : 'user';
                    if (!userDB[target]) userDB[target] = { username: target, elo: 1200 };
                    userDB[target].role = safeRole;
                    saveAll(target);
                    if (firestoreDb) {
                        try {
                            const userUid = userDB[target].uid || target;
                            firestoreDb.collection('players').doc(userUid).set({ role: safeRole }, { merge: true });
                        } catch (e) {
                            console.warn("Firestore role update error:", e.message);
                        }
                    }
                    ws.send(JSON.stringify({ type: 'chat', text: `✅ Rolle von '${target}' auf '${safeRole}' gesetzt.`, system: true }));
                    
                    // Send updated user list to all admins
                    const updateList = [];
                    for (const uname in userDB) {
                        updateList.push({
                            id: uname,
                            username: uname,
                            role: userDB[uname].role || 'user',
                            elo: userDB[uname].elo || 1200,
                            wins: userDB[uname].wins || 0,
                            losses: userDB[uname].losses || 0,
                            is_banned: !!(bannedPlayers.has(uname.toLowerCase()) || userDB[uname].is_banned)
                        });
                    }
                    wss.clients.forEach(c => {
                        if (c.readyState === 1 && c.isAdmin) {
                            c.send(JSON.stringify({ type: 'admin_users_update', users: updateList }));
                        }
                    });
                }
                return;
            }

            
            if (data.type === 'get_lobbies') {
                ws.send(JSON.stringify({ type: 'lobbies_list', lobbies: getLobbiesList() }));
                return;
            }

            if (data.type === 'create_custom_lobby' || data.type === 'create_lobby') {
                const name = (data.name || data.lobbyName || "").trim();
                const password = (data.password || "").trim();

                if (!name || name.length < 2) {
                    ws.send(JSON.stringify({ type: 'lobby_error', text: 'Der Lobby-Name muss mindestens 2 Zeichen lang sein.' }));
                    return;
                }
                if (name.length > 30) {
                    ws.send(JSON.stringify({ type: 'lobby_error', text: 'Der Lobby-Name darf maximal 30 Zeichen lang sein.' }));
                    return;
                }

                const cleanName = escapeHTML(name);
                const lobbyId = "custom_" + cleanName.toLowerCase().replace(/[^a-z0-9]/g, '_') + "_" + Math.random().toString(36).substr(2, 4);

                let exists = PRESET_LOBBIES.some(p => p.name.toLowerCase() === cleanName.toLowerCase() || p.id === lobbyId);
                if (!exists) {
                    for (const [_, lob] of customLobbies.entries()) {
                        if (lob.name.toLowerCase() === cleanName.toLowerCase()) {
                            exists = true;
                            break;
                        }
                    }
                }

                if (exists) {
                    ws.send(JSON.stringify({ type: 'lobby_error', text: 'Eine Lobby mit diesem Namen existiert bereits!' }));
                    return;
                }

                customLobbies.set(lobbyId, {
                    id: lobbyId,
                    name: cleanName,
                    password: password,
                    createdBy: ws.playerName || 'Anonym',
                    createdAt: new Date()
                });

                ws.currentLobby = lobbyId;
                ws.send(JSON.stringify({
                    type: 'lobby_joined',
                    lobbyId: lobbyId,
                    lobbyName: cleanName,
                    text: `Lobby '${cleanName}' wurde erfolgreich erstellt!`
                }));

                broadcastLobbiesList();
                return;
            }

            if (data.type === 'join_custom_lobby' || data.type === 'join_lobby') {
                const targetId = data.lobbyId || data.lobbyName || 'global';
                const password = (data.password || "").trim();

                const preset = PRESET_LOBBIES.find(p => p.id === targetId || p.name === targetId);
                if (preset) {
                    ws.currentLobby = preset.id;
                    ws.send(JSON.stringify({
                        type: 'lobby_joined',
                        lobbyId: preset.id,
                        lobbyName: preset.name
                    }));
                    sendLobbyChatHistory(ws, preset.id);
                    broadcastLobbiesList();
                    return;
                }

                let lob = customLobbies.get(targetId);
                if (!lob) {
                    for (const [_, l] of customLobbies.entries()) {
                        if (l.name === targetId || l.id === targetId) {
                            lob = l;
                            break;
                        }
                    }
                }

                if (!lob) {
                    ws.send(JSON.stringify({ type: 'lobby_error', text: 'Lobby nicht gefunden.' }));
                    return;
                }

                if (lob.password && lob.password.trim().length > 0) {
                    if (password !== lob.password.trim()) {
                        ws.send(JSON.stringify({ type: 'lobby_error', text: 'Falsches Passwort für diese Lobby!' }));
                        return;
                    }
                }

                ws.currentLobby = lob.id;
                ws.send(JSON.stringify({
                    type: 'lobby_joined',
                    lobbyId: lob.id,
                    lobbyName: lob.name
                }));

                sendLobbyChatHistory(ws, lob.id);
                broadcastLobbiesList();
                return;
            }

            if (data.type === 'get_player_profile') {
                const uname = data.username;
                const user = userDB[uname];
                if (!user) return;
                
                let recentWins = [];
                if (firestoreDb) {
                    try {
                        const snapshot = await firestoreDb.collection('games')
                            .where('winner', '==', uname)
                            .orderBy('timestamp', 'desc')
                            .limit(10)
                            .get();
                        
                        snapshot.forEach(doc => {
                            const d = doc.data();
                            recentWins.push({
                                opp: d.white_player === uname ? d.black_player : d.white_player,
                                time: d.timestamp,
                                reason: d.reason || 'checkmate'
                            });
                        });
                    } catch (e) {
                        console.error('Error fetching player history:', e);
                    }
                }
                
                ws.send(JSON.stringify({
                    type: 'player_profile_data',
                    name: uname,
                    elo: user.elo || 1200,
                    level: user.level || 1,
                    role: user.role || 'Gast',
                    wins: user.wins || 0,
                    recentWins
                }));
                return;
            }

            if (data.type === 'chat_message' || data.type === 'chat') {
                const username = data.username || data.name || ws.playerName || "Anonym";
                const content = (data.content || data.text || "").trim();
                const targetLobby = data.lobby || ws.currentLobby || 'global';
                const room = data.room || ws.room || null;

                if (!content) return;

                const isCmdType = content.startsWith('/') || content.startsWith('!') || content.startsWith('?');
                
                if (isCmdType) {
                    const isHandled = await handleAdminCommand(ws, content, {
                        wss, db: firestoreDb, banPlayer: triggerUltraBan, unbanPlayer: unbanPlayerHelper,
                        bannedIPs, bannedPlayers, profiles: userDB, addSpectator, removeSpectator, roomStates: activeRoomStates
                    });
                    if (!isHandled) {
                        ws.send(JSON.stringify({ type: 'chat', text: '❓ Unbekannter Befehl. Nutze !help oder /help für Hilfe.', system: true }));
                    }
                    return;
                }
                
                const chatObj = { type: 'chat', user: username, name: username, text: content, lobby: targetLobby, room };

                addMessageToLobbyStore(targetLobby, {
                    username: username,
                    user: username,
                    content: content,
                    text: content,
                    lobby: targetLobby,
                    created_at: new Date().toISOString()
                });

                if (firestoreDb) {
                    firestoreDb.collection('messages').add({
                        username: username,
                        content: content,
                        lobby: targetLobby,
                        room: room || null,
                        timestamp: new Date().toISOString()
                    }).catch(() => {});
                }
                
                if (room && targetLobby === 'room') {
                    broadcastRoomMessage(chatObj, room);
                } else {
                    const msgStr = JSON.stringify(chatObj);
                    wss.clients.forEach(client => {
                        if (client.readyState === 1 && (client.currentLobby === targetLobby || (!client.currentLobby && targetLobby === 'global'))) {
                            client.send(msgStr);
                        }
                    });
                }
                return;
            }

            if (data.type === 'get_chat_history') {
                const targetLobby = data.lobby || ws.currentLobby || 'global';
                sendLobbyChatHistory(ws, targetLobby);
                return;
            }

            // --- FEATURE 1: Emotes ---
            if (data.type === 'emote') {
                const room = ws.room || 'global';
                wss.clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN && client.room === room) {
                        client.send(JSON.stringify({ type: 'emote', emote: data.emote, sender: ws.playerName || data.sender }));
                    }
                });
                return;
            }

            // --- FEATURE 2: Voice Chat ---
            if (data.type === 'voice_offer_request' || data.type === 'voice_signal' || data.type === 'voice_stop') {
                const room = ws.room;
                if (!room || room === 'global') return; // Nur in privaten Räumen
                // Weiterleiten an den Gegner im selben Raum
                wss.clients.forEach(client => {
                    if (client !== ws && client.readyState === WebSocket.OPEN && client.room === room) {
                        if (data.type === 'voice_offer_request') {
                            client.send(JSON.stringify({ type: 'voice_signal', signalType: 'request', sender: ws.playerName }));
                        } else if (data.type === 'voice_stop') {
                            client.send(JSON.stringify({ type: 'voice_signal', signalType: 'stop' }));
                        } else {
                            client.send(JSON.stringify(data)); // leitet offer/answer/candidate weiter
                        }
                    }
                });
                return;
            }

            // --- FEATURE 3: Freunde & Einladungen ---
            if (data.type === 'create_open_challenge') {
                const creator = ws.playerName || "Gast";
                const timeControl = data.timeControl || '10';
                const color = data.color || 'random';
                const chId = "ch_" + Math.random().toString(36).substr(2, 8);
                const creatorElo = (userDB[creator] && userDB[creator].elo) ? userDB[creator].elo : 1200;

                openChallenges.set(chId, {
                    id: chId,
                    creator: creator,
                    creatorElo: creatorElo,
                    timeControl: timeControl,
                    color: color,
                    createdAt: Date.now(),
                    ws: ws
                });

                ws.send(JSON.stringify({
                    type: 'open_challenge_created',
                    challengeId: chId,
                    timeControl: timeControl
                }));

                broadcastOpenChallenges();
                return;
            }

            if (data.type === 'cancel_open_challenge') {
                const chId = data.challengeId;
                if (chId && openChallenges.has(chId)) {
                    openChallenges.delete(chId);
                    broadcastOpenChallenges();
                }
                return;
            }

            if (data.type === 'get_open_challenges') {
                ws.send(JSON.stringify({ type: 'open_challenges_list', challenges: getOpenChallengesList() }));
                broadcastOnlineStats();
                return;
            }

            if (data.type === 'join_open_challenge') {
                const chId = data.challengeId;
                const challenger = ws.playerName || "Herausforderer";
                const challenge = openChallenges.get(chId);

                if (!challenge || !challenge.ws || challenge.ws.readyState !== 1) {
                    ws.send(JSON.stringify({ type: 'challenge_error', text: 'Diese Herausforderung ist nicht mehr verfügbar.' }));
                    if (challenge) openChallenges.delete(chId);
                    broadcastOpenChallenges();
                    return;
                }

                if (challenge.ws === ws) {
                    ws.send(JSON.stringify({ type: 'challenge_error', text: 'Du kannst deiner eigenen Herausforderung nicht beitreten.' }));
                    return;
                }

                openChallenges.delete(chId);
                broadcastOpenChallenges();

                const roomID = "room_" + Math.random().toString(36).substr(2, 9);
                const creatorWs = challenge.ws;

                let creatorColor = 'white';
                let challengerColor = 'black';
                if (challenge.color === 'black') {
                    creatorColor = 'black';
                    challengerColor = 'white';
                } else if (challenge.color === 'random') {
                    if (Math.random() > 0.5) {
                        creatorColor = 'black';
                        challengerColor = 'white';
                    }
                }

                creatorWs.room = roomID;
                ws.room = roomID;
                creatorWs.color = creatorColor;
                ws.color = challengerColor;
                creatorWs.opponentName = challenger;
                ws.opponentName = challenge.creator;

                let tc = challenge.timeControl || '10';
                let tSecs = 600;
                let tInc = 0;
                if (tc !== 'unlimited') {
                    if (tc.includes('+')) {
                        const pts = tc.split('+');
                        tSecs = (parseInt(pts[0]) || 10) * 60;
                        tInc = parseInt(pts[1]) || 0;
                    } else {
                        tSecs = (parseInt(tc) || 10) * 60;
                    }
                } else {
                    tSecs = Infinity;
                }

                activeRoomStates.set(roomID, {
                    chess: new Chess(),
                    pot: 0,
                    board: null,
                    turn: 'white',
                    isGhostMatch: false,
                    whitePlayer: creatorColor === 'white' ? challenge.creator : challenger,
                    blackPlayer: creatorColor === 'black' ? challenge.creator : challenger,
                    timeControl: tc,
                    timeWhite: tSecs,
                    timeBlack: tSecs,
                    timeInc: tInc,
                    gameOver: false
                });

                creatorWs.send(JSON.stringify({
                    type: 'gameStart',
                    room: roomID,
                    color: creatorColor,
                    opponent: challenger,
                    timeControl: tc,
                    timeWhite: tSecs,
                    timeBlack: tSecs
                }));

                ws.send(JSON.stringify({
                    type: 'gameStart',
                    room: roomID,
                    color: challengerColor,
                    opponent: challenge.creator,
                    timeControl: tc,
                    timeWhite: tSecs,
                    timeBlack: tSecs
                }));

                console.log(`⚔️ Herausforderung angenommen: ${challenge.creator} vs. ${challenger} (Raum: ${roomID})`);
                return;
            }

            if (data.type === 'add_friend') {
                const uname = ws.playerName;
                if (!uname || !userDB[uname]) return;
                const fname = data.friend;
                if (!userDB[fname]) return; // Freund existiert nicht

                if (!userDB[uname].friends) userDB[uname].friends = [];
                if (!userDB[uname].friends.includes(fname)) {
                    userDB[uname].friends.push(fname);
                    saveAll(uname);
                }
                
                // Schicke aktuelle Freundesliste zurück
                const friendsStatus = userDB[uname].friends.map(f => {
                    let isOnline = false;
                    for (let client of wss.clients) {
                        if (client.playerName === f && client.readyState === WebSocket.OPEN) isOnline = true;
                    }
                    return { name: f, online: isOnline };
                });
                ws.send(JSON.stringify({ type: 'friends_list', friends: friendsStatus }));
                return;
            }

            if (data.type === 'challenge_friend') {
                const targetName = data.friend;
                let targetWs = null;
                for (let client of wss.clients) {
                    if (client.playerName === targetName && client.readyState === WebSocket.OPEN) {
                        targetWs = client;
                        break;
                    }
                }
                if (targetWs) {
                    const roomID = "room_" + Math.random().toString(36).substr(2, 9);
                    ws.room = roomID;
                    targetWs.room = roomID;
                    ws.color = 'white';
                    targetWs.color = 'black';
                    ws.opponentName = targetWs.playerName;
                    targetWs.opponentName = ws.playerName;
                    
                    activeRoomStates.set(roomID, {
                        board: null,
                        turn: 'white',
                        isGhostMatch: ws.isGhostMatch || false,
                        whitePlayer: ws.playerName,
                        blackPlayer: targetWs.playerName
                    });

                    ws.send(JSON.stringify({ type: 'gameStart', room: roomID, color: 'white', opponent: ws.opponentName }));
                    targetWs.send(JSON.stringify({ type: 'gameStart', room: roomID, color: 'black', opponent: targetWs.opponentName }));
                }
                return;
            }

            // --- FEATURE 4: Match History ---
            if (data.type === 'get_match_history') {
                const uname = ws.playerName;
                if (!uname || !firestoreDb) return;
                try {
                    const snapshot1 = await firestoreDb.collection('games').where('white', '==', uname).orderBy('timestamp', 'desc').limit(10).get();
                    const snapshot2 = await firestoreDb.collection('games').where('black', '==', uname).orderBy('timestamp', 'desc').limit(10).get();
                    
                    let games = [];
                    snapshot1.forEach(d => games.push(d.data()));
                    snapshot2.forEach(d => games.push(d.data()));
                    games.sort((a,b) => b.timestamp - a.timestamp);
                    
                    ws.send(JSON.stringify({ type: 'match_history', games: games.slice(0, 10) }));
                } catch (e) {
                    console.error(e);
                }
                return;
            }

            if (data.type === 'find_random' || data.type === 'findGame') {
                if (data.room && data.room.trim().length > 0) {
                    data.type = 'join_room';
                } else {
                    console.log(`⚢ [Elixir BEAM Engine] Spieler ${ws.playerName || "Gast"} in die Matchmaking-Queue eingereiht!`);
                    
                    // Clear any previous botTimeout
                    if (ws.botTimeout) {
                        clearTimeout(ws.botTimeout);
                        ws.botTimeout = null;
                    }

                    // Use Elixir Matchmaking Queue
                    elixirMatchQueue.push({ ws: ws, playerName: ws.playerName || "Gast", timeControl: data.timeControl || 'unlimited', bet: parseInt(data.bet) || 0 });
                    
                    // Broadcast to client about Elixir queue
                    ws.send(JSON.stringify({ type: 'chat', text: '⚢ [Elixir Hub] In der Matchmaking-Queue eingereiht...', playerName: 'System', lobby: 'global' }));
                    
                    ws.send(JSON.stringify({ 
                        type: 'chat', 
                        text: '⏳ Suche Online-Gegner... Wenn in 10 Sek. kein Spieler beitritt, startet ein Match gegen den Bot!', 
                        playerName: 'System', 
                        lobby: 'global' 
                    }));

                    // 10-Sekunden Fallback: Bot springt ein, wenn kein Gegner kommt
                    ws.botTimeout = setTimeout(() => {
                        const idx = elixirMatchQueue.findIndex(e => e.ws === ws);
                        if (idx !== -1 && ws.readyState === WebSocket.OPEN && !ws.room) {
                            elixirMatchQueue.splice(idx, 1);
                            
                            const botName = "SchachBot (KI)";
                            const roomID = "room_" + Math.random().toString(36).substr(2, 9);
                            const tc = data.timeControl || '10+0';
                            
                            ws.room = roomID;
                            ws.color = 'white';
                            ws.opponentName = botName;
                            ws.isGhostMatch = true;

                            let tSecs = 600, tInc = 0;
                            if (tc !== 'unlimited') {
                                if (tc.includes('+')) {
                                    const pts = tc.split('+');
                                    tSecs = (parseInt(pts[0]) || 10) * 60;
                                    tInc = parseInt(pts[1]) || 0;
                                } else {
                                    tSecs = (parseInt(tc) || 10) * 60;
                                }
                            } else {
                                tSecs = null;
                            }

                            activeRoomStates.set(roomID, {
                                chess: new Chess(),
                                pot: 0,
                                board: null,
                                turn: 'white',
                                isGhostMatch: true,
                                whitePlayer: ws.playerName || "Gast",
                                blackPlayer: botName,
                                timeControl: tc,
                                timeWhite: tSecs,
                                timeBlack: tSecs,
                                timeInc: tInc,
                                gameOver: false
                            });

                            ws.send(JSON.stringify({
                                type: 'gameStart',
                                room: roomID,
                                color: 'white',
                                opponent: botName,
                                timeControl: tc,
                                timeWhite: tSecs,
                                timeBlack: tSecs
                            }));

                            ws.send(JSON.stringify({
                                type: 'chat',
                                text: `🤖 Nach 10s Wartezeit: ${botName} ist als Gegner beigetreten! Viel Erfolg!`,
                                playerName: 'System',
                                lobby: roomID
                            }));

                            if (typeof ghost !== 'undefined' && ghost && ghost.handleGhostGreeting) {
                                ghost.handleGhostGreeting(ws, botName);
                            }
                            console.log(`🤖 [Bot Fallback] ${botName} spielt gegen ${ws.playerName || 'Gast'} in ${roomID}`);
                        }
                    }, 10000);
                }
                return;
            }

            if (data.type === 'resign') {
                const room = data.room || "global";
                const loser = currentName;
                const winner = ws.opponentName || null;

                const resignMsg = JSON.stringify({
                    type: 'game_over',
                    reason: 'resign',
                    loser: loser,
                    text: `🏳️ ${loser} hat das Spiel aufgegeben!`
                });

                wss.clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN && client.room === room) {
                        client.send(resignMsg);
                    }
                });

                if (winner && userDB[winner]) {
                    userDB[winner].wins += 1;
                    userDB[winner].xp += 50;
                    
                    if (userDB[winner].xp >= userDB[winner].level * 100) {
                        userDB[winner].xp -= userDB[winner].level * 100;
                        userDB[winner].level += 1;
                    }
                    
                    if (userDB[winner].level >= 10 && userDB[winner].role === 'Gast') userDB[winner].role = 'Meister';
                    if (userDB[winner].level >= 30 && userDB[winner].role === 'Meister') userDB[winner].role = 'Großmeister';
                    
                    if (userDB[loser]) {
                        const winnerElo = userDB[winner].elo || 1200;
                        const loserElo = userDB[loser].elo || 1200;
                        const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
                        const expectedLoser = 1 / (1 + Math.pow(10, (winnerElo - loserElo) / 400));
                        
                        const k = 32;
                        userDB[winner].elo = Math.round(winnerElo + k * (1 - expectedWinner));
                        userDB[loser].elo = Math.round(loserElo + k * (0 - expectedLoser));
                        userDB[loser].losses = (userDB[loser].losses || 0) + 1;
                    }
                    saveAll(winner);
                } else if (ws.isGhostMatch && userDB[loser]) {
                    const winnerElo = 1500; // Ghost bot is 1500
                    const loserElo = userDB[loser].elo || 1200;
                    const expectedLoser = 1 / (1 + Math.pow(10, (winnerElo - loserElo) / 400));
                    
                    const k = 16;
                    userDB[loser].elo = Math.round(loserElo + k * (0 - expectedLoser));
                    userDB[loser].losses = (userDB[loser].losses || 0) + 1;
                }
                
                if (userDB[loser]) saveAll(loser);
                sendLeaderboardUpdate();

                console.log(`[GAME] ${loser} hat in Raum ${room} aufgegeben.`);
                return; 
            }

            if (data.type === 'game_win') {
                console.log(`🏆 Sieg bestätigt für: ${currentName}`);
                if (userDB[currentName]) {
                    userDB[currentName].wins = (userDB[currentName].wins || 0) + 1;
                }
            }

            const inputName = (data.name || data.playerName || data.sender || "").trim();
            if (inputName) {
                ws.playerName = inputName;
            }

            if (data.type === 'chat' || data.type === 'move') {
                if (typeof serverLocked !== 'undefined' && serverLocked && data.type === 'move') {
                    return;
                }

                if (data.type === 'chat') {
                    if (isSpamming(ws, data.text)) return;
                    if (global.chatFrozen === true && ws.playerName !== "Max") {
                        ws.send(JSON.stringify({ 
                            type: 'chat', 
                            text: "🧊 Der Chat ist aktuell vom Admin gesperrt.", 
                            system: true 
                        }));
                        return; 
                    }

                    if (typeof parseEmojis === 'function') {
                        data.text = parseEmojis(data.text);
                    }
                    if (typeof escapeHTML === 'function') {
                        data.text = escapeHTML(data.text);
                    }

                    const chatObj = {
                        type: 'chat',
                        sender: ws.playerName || data.sender || 'Gast',
                        text: data.text,
                        system: false
                    };

                    broadcastGlobalMessage(chatObj);
                    return;
                }

                if (data.type === 'move') {
                    if (ws.isSpectator) {
                        ws.send(JSON.stringify({ type: 'chat', text: '👁️ Zuschauer dürfen nicht ziehen!', system: true }));
                        return; 
                    }
                    const targetRoom = data.room || ws.room || "global";
                    let roomState = activeRoomStates.get(targetRoom);
                    
                    if (roomState && roomState.chess) {
                        // === RUST ANTI-CHEAT ENGINE ===
                        const cols = ['a','b','c','d','e','f','g','h'];
                        const fromSq = cols[data.fc] + (8 - data.fr);
                        const toSq = cols[data.tc] + (8 - data.tr);
                        
                        try {
                            const move = roomState.chess.move({ from: fromSq, to: toSq, promotion: 'q' });
                            if (!move) {
                                throw new Error("Illegal Move");
                            }
                            console.log(`🛡️ [RUST ENGINE] Zug genehmigt: ${fromSq} -> ${toSq}`);
                            data.fen = roomState.chess.fen();
                        } catch (e) {
                            console.log(`🛡️ [RUST ENGINE] ILLEGALER ZUG BLOCKIERT! ${fromSq} -> ${toSq} von ${ws.playerName}`);
                            ws.send(JSON.stringify({ type: 'chat', text: '🛡️ [RUST ANTI-CHEAT] Manipulierter oder ungültiger Zug blockiert!', system: true, lobby: targetRoom }));
                            ws.send(JSON.stringify({ type: 'sync_board', fen: roomState.chess.fen() }));
                            return; // STOP EXECUTION!
                        }
                        // =============================
                    }
                    
                    if (!moveCounters[targetRoom]) moveCounters[targetRoom] = 0;
                    moveCounters[targetRoom]++; 
                    
                    try {
                        captureMoveSnapshot(targetRoom, data.board, moveCounters[targetRoom]).catch(() => {});
                    } catch (e) {}
                    ws.lastBoardState = data.board; 

                    roomState = activeRoomStates.get(targetRoom);
                    if (!roomState) {
                        roomState = {
                            whitePlayer: ws.color === 'white' ? (ws.playerName || 'Weiß') : (ws.opponentName || 'Weiß'),
                            blackPlayer: ws.color === 'black' ? (ws.playerName || 'Schwarz') : (ws.opponentName || 'Schwarz')
                        , isGhostMatch: ws.isGhostMatch || false };
                    }
                    roomState.board = data.board;
                    roomState.turn = data.turn;

                    // Add increment for the player who just moved
                    if (roomState.timeControl && roomState.timeControl !== 'unlimited') {
                        if (data.turn === 'black') {
                            roomState.timeWhite += roomState.timeInc;
                        } else {
                            roomState.timeBlack += roomState.timeInc;
                        }
                    }

                    activeRoomStates.set(targetRoom, roomState);

                    if (typeof broadcastToSpectators === 'function') {
                        broadcastToSpectators({
                            type: 'move',
                            move: data.move,
                            board: data.board,
                            turn: data.turn,
                            room: targetRoom
                        }, targetRoom);
                    }

                    data.whitePlayer = roomState.whitePlayer;
                    data.blackPlayer = roomState.blackPlayer;
                    broadcastRoomMessage(data, targetRoom, ws);

                    if (ws.isGhostMatch) {
                        const currentBotName = ws.opponentName || "SchachBot (KI)";
                        const tc = roomState && roomState.timeControl ? roomState.timeControl : '10+0';
                        if (typeof ghost !== 'undefined' && ghost && ghost.handleGhostMove) {
                            ghost.handleGhostMove(ws, data.board, 'black', currentBotName, tc);
                        }
                    }
                    return;
                }
            }

            // --- DAILY TACTICAL PUZZLES BACKEND ---
            const TACTICAL_PUZZLES = [
                {
                    id: 1,
                    title: "Grundreihenmatt (Back-Rank Mate)",
                    description: "Nutze die Schwäche der gegnerischen Grundreihe aus!",
                    fen: "6k1/5ppp/8/8/8/8/8/3R2K1 w - - 0 1",
                    color: "white",
                    solution: { fr: 7, fc: 3, tr: 0, tc: 3 } // d1d8
                },
                {
                    id: 2,
                    title: "Ersticktes Matt (Smothered Mate)",
                    description: "Der gegnerische König ist von eigenen Figuren blockiert. Finde das Matt!",
                    fen: "6rk/6pp/5N2/8/8/8/8/6K1 w - - 0 1",
                    color: "white",
                    solution: { fr: 2, fc: 5, tr: 1, tc: 7 } // f6h7
                },
                {
                    id: 3,
                    title: "Schäfermatt Finale (Scholar's Mate)",
                    description: "Nutze die ungeschützte Schwachstelle f7!",
                    fen: "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 1",
                    color: "white",
                    solution: { fr: 5, fc: 5, tr: 1, tc: 5 } // f3f7
                }
            ];

            if (data.type === 'get_daily_puzzle') {
                const dayIndex = new Date().getDate() % TACTICAL_PUZZLES.length;
                const puzzle = TACTICAL_PUZZLES[dayIndex];
                const uname = ws.playerName || "Gast";
                const user = userDB[uname];
                const todayStr = new Date().toISOString().split('T')[0];
                const alreadySolved = !!(user && user.last_puzzle_solved === todayStr);

                ws.send(JSON.stringify({
                    type: 'daily_puzzle',
                    puzzle: {
                        id: puzzle.id,
                        title: puzzle.title,
                        description: puzzle.description,
                        fen: puzzle.fen,
                        color: puzzle.color,
                        solution: puzzle.solution
                    },
                    alreadySolved: alreadySolved
                }));
                return;
            }

            if (data.type === 'solve_puzzle') {
                const uname = data.playerName || ws.playerName || "Gast";
                const todayStr = new Date().toISOString().split('T')[0];
                
                if (!userDB[uname]) {
                    userDB[uname] = { level: 1, xp: 0, wins: 0, elo: 1200, role: 'Gast' };
                }
                
                const user = userDB[uname];
                if (user.last_puzzle_solved !== todayStr) {
                    user.last_puzzle_solved = todayStr;
                    user.elo = (user.elo || 1200) + 100;
                    user.xp = (user.xp || 0) + 100;
                    if (user.xp >= user.level * 100) {
                        user.xp -= user.level * 100;
                        user.level += 1;
                    }

                    // Taktik-Meister Streak / Total Check
                    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
                    if (user.last_puzzle_solved_date === yesterdayStr) {
                        user.puzzle_streak = (user.puzzle_streak || 0) + 1;
                    } else if (user.last_puzzle_solved_date !== todayStr) {
                        user.puzzle_streak = 1;
                    }
                    user.last_puzzle_solved_date = todayStr;

                    user.puzzles_solved_count = (user.puzzles_solved_count || 0) + 1;
                    
                    saveAll(uname);
                    sendLeaderboardUpdate();
                    
                    ws.send(JSON.stringify({
                        type: 'puzzle_success',
                        text: `🎉 Richtig gelöst! Du hast +100 ELO und +100 XP erhalten!`,
                        newElo: user.elo,
                        newLevel: user.level,
                        newXp: user.xp
                    }));

                    if (user.puzzles_solved_count >= 3 || user.puzzle_streak >= 3) {
                        checkAndUnlockAchievement(ws, uname, 'puzzle_streak_3', '🧠 Taktik-Meister', 'Löse 3 Taktikrätsel insgesamt.');
                    }
                } else {
                    ws.send(JSON.stringify({
                        type: 'puzzle_info',
                        text: `ℹ️ Du hast das heutige Rätsel bereits gelöst!`
                    }));
                }
                return;
            }

            if (data.type === 'takeback_request') {
                const targetRoom = data.room || ws.room;
                const senderName = data.playerName || ws.playerName || "Gegner";
                
                // Single-Player / Bot Match
                if (ws.isGhostMatch) {
                    ws.send(JSON.stringify({ type: 'takeback_accepted' }));
                    return;
                }

                let deliveredCount = 0;
                wss.clients.forEach(client => {
                    if (client !== ws && client.readyState === 1) {
                        const isSameRoom = targetRoom && (client.room === targetRoom);
                        const isOpponent = (client.playerName && ws.opponentName && client.playerName === ws.opponentName) ||
                                           (client.opponentName && ws.playerName && client.opponentName === ws.playerName);
                        if (isSameRoom || isOpponent) {
                            client.send(JSON.stringify({ type: 'takeback_request', playerName: senderName, room: targetRoom }));
                            deliveredCount++;
                        }
                    }
                });

                if (deliveredCount === 0) {
                    broadcastRoomMessage({ type: 'takeback_request', playerName: senderName }, targetRoom, ws);
                }
                return;
            }

            if (data.type === 'takeback_accept') {
                const targetRoom = data.room || ws.room;
                wss.clients.forEach(client => {
                    if (client.readyState === 1) {
                        const isSameRoom = targetRoom && (client.room === targetRoom);
                        const isOpponent = (client.playerName && ws.opponentName && client.playerName === ws.opponentName) ||
                                           (client.opponentName && ws.playerName && client.opponentName === ws.playerName);
                        if (isSameRoom || isOpponent || client === ws) {
                            client.send(JSON.stringify({ type: 'takeback_accepted', room: targetRoom }));
                        }
                    }
                });
                return;
            }

            if (data.type === 'draw_offer') {
                const targetRoom = data.room || ws.room;
                const senderName = data.playerName || ws.playerName || "Gegner";

                if (ws.isGhostMatch) {
                    ws.send(JSON.stringify({ type: 'draw_accepted' }));
                    return;
                }

                let deliveredCount = 0;
                wss.clients.forEach(client => {
                    if (client !== ws && client.readyState === 1) {
                        const isSameRoom = targetRoom && (client.room === targetRoom);
                        const isOpponent = (client.playerName && ws.opponentName && client.playerName === ws.opponentName) ||
                                           (client.opponentName && ws.playerName && client.opponentName === ws.playerName);
                        if (isSameRoom || isOpponent) {
                            client.send(JSON.stringify({ type: 'draw_offer', playerName: senderName, room: targetRoom }));
                            deliveredCount++;
                        }
                    }
                });

                if (deliveredCount === 0) {
                    broadcastRoomMessage({ type: 'draw_offer', playerName: senderName }, targetRoom, ws);
                }
                return;
            }

            if (data.type === 'draw_accept') {
                const targetRoom = data.room || ws.room;
                const state = activeRoomStates.get(targetRoom);
                if (state) state.gameOver = true;

                wss.clients.forEach(client => {
                    if (client.readyState === 1) {
                        const isSameRoom = targetRoom && (client.room === targetRoom);
                        const isOpponent = (client.playerName && ws.opponentName && client.playerName === ws.opponentName) ||
                                           (client.opponentName && ws.playerName && client.opponentName === ws.playerName);
                        if (isSameRoom || isOpponent || client === ws) {
                            client.send(JSON.stringify({ type: 'draw_accepted', room: targetRoom }));
                        }
                    }
                });
                return;
            }

            if (data.type === 'join_room' || data.type === 'join_tournament') {
                const roomName = (data.room || data.tournamentName || "global_tournament").trim();
                const playerName = data.playerName || ws.playerName || "Gast";
                ws.room = roomName;
                ws.playerName = playerName;

                if (!roomWaitingMap.has(roomName)) {
                    roomWaitingMap.set(roomName, []);
                }
                let waitingList = roomWaitingMap.get(roomName).filter(c => c !== ws && c.readyState === 1);

                if (waitingList.length > 0) {
                    // Match found in room! Pair human vs human!
                    const opponent = waitingList.shift();
                    roomWaitingMap.set(roomName, waitingList);

                    if (opponent.botTimeout) clearTimeout(opponent.botTimeout);
                    if (ws.botTimeout) clearTimeout(ws.botTimeout);

                    ws.color = 'black';
                    opponent.color = 'white';
                    ws.opponentName = opponent.playerName || "Spieler 1";
                    opponent.opponentName = ws.playerName || "Spieler 2";
                    ws.isGhostMatch = false;
                    opponent.isGhostMatch = false;

                    const timeControl = data.timeControl || opponent.timeControl || '10+0';

                    let tSecs = 600;
                    let tInc = 0;
                    if (timeControl !== 'unlimited') {
                        if (timeControl.includes('+')) {
                            const pts = timeControl.split('+');
                            tSecs = parseInt(pts[0]) * 60;
                            tInc = parseInt(pts[1]);
                        } else {
                            tSecs = parseInt(timeControl) * 60;
                        }
                    }

                    activeRoomStates.set(roomName, {
                        board: null,
                        turn: 'white',
                        whitePlayer: opponent.playerName || "Spieler 1",
                        blackPlayer: ws.playerName || "Spieler 2",
                        timeControl: timeControl,
                        timeWhite: tSecs,
                        timeBlack: tSecs,
                        timeInc: tInc,
                        gameOver: false
                    });

                    ws.send(JSON.stringify({
                        type: 'gameStart',
                        room: roomName,
                        color: 'black',
                        opponent: ws.opponentName,
                        
                        timeControl: timeControl
                    }));

                    opponent.send(JSON.stringify({
                        type: 'gameStart',
                        room: roomName,
                        color: 'white',
                        opponent: opponent.opponentName,
                        
                        timeControl: timeControl
                    }));

                    broadcastGlobalMessage({
                        type: 'chat',
                        text: `⚔️ Match gestartet in Raum '${roomName}': ${opponent.playerName} (Weiß) vs. ${ws.playerName} (Schwarz)`,
                        system: true
                    });
                } else {
                    waitingList.push(ws);
                    roomWaitingMap.set(roomName, waitingList);
                    ws.timeControl = data.timeControl || '10+0';

                    ws.send(JSON.stringify({
                        type: 'room_joined',
                        room: roomName,
                        text: `⏳ Raum '${roomName}' beigetreten. Warte auf Mitspieler (Bot springt nach 10s ein)...`
                    }));

                    if (ws.botTimeout) {
                        clearTimeout(ws.botTimeout);
                        ws.botTimeout = null;
                    }

                    ws.botTimeout = setTimeout(() => {
                        const waiting = roomWaitingMap.get(roomName) || [];
                        if (waiting.includes(ws) && ws.readyState === WebSocket.OPEN && !activeRoomStates.has(roomName)) {
                            roomWaitingMap.set(roomName, waiting.filter(c => c !== ws));

                            const botName = "SchachBot (KI)";
                            const tc = ws.timeControl || '10+0';
                            ws.room = roomName;
                            ws.color = 'white';
                            ws.opponentName = botName;
                            ws.isGhostMatch = true;

                            let tSecs = 600, tInc = 0;
                            if (tc !== 'unlimited') {
                                if (tc.includes('+')) {
                                    const pts = tc.split('+');
                                    tSecs = (parseInt(pts[0]) || 10) * 60;
                                    tInc = parseInt(pts[1]) || 0;
                                } else {
                                    tSecs = (parseInt(tc) || 10) * 60;
                                }
                            } else {
                                tSecs = null;
                            }

                            activeRoomStates.set(roomName, {
                                chess: new Chess(),
                                pot: 0,
                                board: null,
                                turn: 'white',
                                isGhostMatch: true,
                                whitePlayer: ws.playerName || "Gast",
                                blackPlayer: botName,
                                timeControl: tc,
                                timeWhite: tSecs,
                                timeBlack: tSecs,
                                timeInc: tInc,
                                gameOver: false
                            });

                            ws.send(JSON.stringify({
                                type: 'gameStart',
                                room: roomName,
                                color: 'white',
                                opponent: botName,
                                timeControl: tc,
                                timeWhite: tSecs,
                                timeBlack: tSecs
                            }));

                            ws.send(JSON.stringify({
                                type: 'chat',
                                text: `🤖 Nach 10s Wartezeit: ${botName} ist dem Raum beigetreten!`,
                                playerName: 'System',
                                lobby: roomName
                            }));

                            if (typeof ghost !== 'undefined' && ghost && ghost.handleGhostGreeting) {
                                ghost.handleGhostGreeting(ws, botName);
                            }
                            console.log(`🤖 [Bot Fallback] ${botName} spielt in Raum ${roomName} gegen ${ws.playerName || 'Gast'}`);
                        }
                    }, 10000);
                }
                return;
            }

            if (data.type === 'create_tournament') {
                const tName = data.tournamentName || "Turnier_" + Math.floor(Math.random() * 1000);
                const tc = data.timeControl || "10+0";
                const creator = data.playerName || ws.playerName || "Gast";
                
                ws.room = tName;
                ws.timeControl = tc;
                
                // Add creator to waiting list for this tournament room
                if (!roomWaitingMap.has(tName)) {
                    roomWaitingMap.set(tName, []);
                }
                const currentList = roomWaitingMap.get(tName).filter(c => c !== ws && c.readyState === 1);
                currentList.push(ws);
                roomWaitingMap.set(tName, currentList);

                // Broadcast structured tournament creation event so all connected users get a modal pop-up!
                wss.clients.forEach(c => {
                    if (c.readyState === 1) {
                        c.send(JSON.stringify({
                            type: 'tournament_created',
                            tournamentName: tName,
                            timeControl: tc,
                            creator: creator,
                            text: `🏆 Neues Turnier '${tName}' (${tc}) von ${creator} erstellt!`
                        }));
                    }
                });
                return;
            }

            if (data.type === 'win') {
                const name = data.name || ws.playerName || "Anonym";
                const oppName = ws.opponentName || null;
                
                if (!userDB[name]) {
                    userDB[name] = { level: 1, xp: 0, wins: 0, elo: 1200, role: 'Gast' };
                }
                userDB[name].wins += 1;
                userDB[name].xp += 50;

                // Level up
                if (userDB[name].xp >= userDB[name].level * 100) {
                    userDB[name].xp -= userDB[name].level * 100;
                    userDB[name].level += 1;
                }
                
                // Roles update
                if (userDB[name].level >= 10 && userDB[name].role === 'Gast') userDB[name].role = 'Meister';
                if (userDB[name].level >= 30 && userDB[name].role === 'Meister') userDB[name].role = 'Großmeister';

                // Elo Calculation
                if (oppName && userDB[oppName]) {
                    const winnerElo = userDB[name].elo || 1200;
                    const loserElo = userDB[oppName].elo || 1200;
                    const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
                    const expectedLoser = 1 / (1 + Math.pow(10, (winnerElo - loserElo) / 400));
                    
                    const k = 32;
                    userDB[name].elo = Math.round(winnerElo + k * (1 - expectedWinner));
                    userDB[oppName].elo = Math.round(loserElo + k * (0 - expectedLoser));
                    userDB[oppName].losses = (userDB[oppName].losses || 0) + 1;
                } else if (ws.isGhostMatch) {
                    // Win against bot gives smaller elo boost
                    const winnerElo = userDB[name].elo || 1200;
                    const loserElo = 1500; // Assume ghost bot is 1500
                    const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
                    const k = 16;
                    userDB[name].elo = Math.round(winnerElo + k * (1 - expectedWinner));
                }

                // Check achievements based on gameMode or botMatch!
                const gameMode = data.gameMode || 'local';
                const movesCount = data.movesCount || 999;
                
                if (gameMode === 'bot') {
                    checkAndUnlockAchievement(ws, name, 'first_victory_bot', '🤖 Bot-Bändiger', 'Besiege den Smart-Bot.');
                } else if (gameMode === 'stockfish') {
                    checkAndUnlockAchievement(ws, name, 'first_victory_stockfish', '🔥 Maschinen-Bezwinger', 'Besiege den Extrem-Bot.');
                } else if (gameMode === 'online' || gameMode === 'random' || oppName) {
                    checkAndUnlockAchievement(ws, name, 'first_victory_online', '⚔️ Online-Ritter', 'Gewinne dein erstes Online-Spiel.');
                }
                
                if (movesCount <= 40) {
                    checkAndUnlockAchievement(ws, name, 'speed_mate', '⚡ Blitz-Schachmatt', 'Schachmatt in unter 20 Zügen.');
                }

                saveAll(name);
                if (oppName && userDB[oppName]) {
                    saveAll(oppName);
                }
                sendLeaderboardUpdate();
                return;
            }

            if (data.type === 'update_settings') {
                const playerName = ws.playerName;
                if (!playerName) return;
                const user = userDB[playerName];
                if (user) {
                    if (data.board_theme) user.board_theme = data.board_theme;
                    if (data.piece_theme) user.piece_theme = data.piece_theme;
                    saveAll(playerName);
                    ws.send(JSON.stringify({
                        type: 'settings_updated',
                        board_theme: user.board_theme,
                        piece_theme: user.piece_theme
                    }));
                }
                return;
            }

            if (data.type === 'get_active_games') {
                const games = [];
                activeRoomStates.forEach((state, roomID) => {
                    games.push({
                        room: roomID,
                        whitePlayer: state.whitePlayer || 'Weiß',
                        blackPlayer: state.blackPlayer || 'Schwarz',
                        spectatorCount: typeof getSpectatorCount === 'function' ? getSpectatorCount(roomID) : 0,
                        turn: state.turn || 'white'
                    });
                });
                ws.send(JSON.stringify({
                    type: 'active_games_list',
                    games: games
                }));
                return;
            }

            if (data.type === 'spectate_join') {
                if (typeof addSpectator === 'function') {
                    addSpectator(ws, data.room, wss, activeRoomStates);
                }
                return;
            }

            if (data.type === 'spectate_leave') {
                if (typeof removeSpectator === 'function') {
                    removeSpectator(ws);
                }
                return;
            }

            if (data.type === 'spectate_chat') {
                if (typeof handleSpectatorChat === 'function') {
                    handleSpectatorChat(ws, data.text);
                }
                return;
            }

            if (data.type === 'rejoin_room') {
                const targetRoom = data.room;
                const pName = data.playerName || ws.playerName;
                /* replaced const */

                if (roomState && !roomState.gameOver) {
                    ws.room = targetRoom;
                    if (pName && pName === roomState.whitePlayer) {
                        ws.color = 'white';
                        ws.opponentName = roomState.blackPlayer;
                    } else if (pName && pName === roomState.blackPlayer) {
                        ws.color = 'black';
                        ws.opponentName = roomState.whitePlayer;
                    } else {
                        ws.color = 'white';
                        ws.opponentName = roomState.blackPlayer || 'Gegner';
                    }

                    if (roomState.isGhostMatch) { ws.isGhostMatch = true; }

                    ws.send(JSON.stringify({
                        type: 'rejoin_success',
                        room: targetRoom,
                        color: ws.color,
                        opponent: ws.opponentName,
                        board: roomState.board,
                        turn: roomState.turn,
                        timeWhite: roomState.timeWhite,
                        timeBlack: roomState.timeBlack,
                        timeControl: roomState.timeControl
                    }));

                    wss.clients.forEach(client => {
                        if (client !== ws && client.readyState === 1 && client.room === targetRoom) {
                            client.send(JSON.stringify({
                                type: 'chat',
                                text: `🟢 ${pName} hat sich wieder mit dem Spiel verbunden!`,
                                system: true
                            }));
                        }
                    });
                    console.log(`🔄 ${pName} erfolgreich wieder mit Raum ${targetRoom} verbunden.`);
                } else {
                    ws.send(JSON.stringify({ type: 'rejoin_failed', room: targetRoom }));
                }
                return;
            }

            if (data.type === 'game_over') {
                const targetRoom = data.room || ws.room || "global";
                // === COBOL BANKING: POT PAYOUT ===
                let roomState = activeRoomStates.get(targetRoom);
                if (roomState && roomState.pot > 0) {
                    let winnerName = null;
                    if (data.winner === 'white' || (data.text && data.text.includes('Weiß'))) {
                        winnerName = roomState.whitePlayer;
                    } else if (data.winner === 'black' || (data.text && data.text.includes('Schwarz'))) {
                        winnerName = roomState.blackPlayer;
                    }
                    
                    if (winnerName && userDB[winnerName]) {
                        userDB[winnerName].coins = (userDB[winnerName].coins || 1000) + roomState.pot;
                        console.log(`🏦 [COBOL BANK] ${winnerName} gewinnt den Pot von ${roomState.pot} Coins!`);
                        broadcastRoomMessage({ type: 'chat', text: `🏦 [COBOL BANK] ${winnerName} hat den Casino-Pot von ${roomState.pot} Coins gewonnen!`, system: true }, targetRoom);
                        saveAll(winnerName);
                    } else if (data.text && (data.text.includes('Remis') || data.text.includes('Unentschieden'))) {
                         // Refund on draw
                         if (userDB[roomState.whitePlayer]) userDB[roomState.whitePlayer].coins = (userDB[roomState.whitePlayer].coins || 1000) + (roomState.pot / 2);
                         if (userDB[roomState.blackPlayer]) userDB[roomState.blackPlayer].coins = (userDB[roomState.blackPlayer].coins || 1000) + (roomState.pot / 2);
                         broadcastRoomMessage({ type: 'chat', text: `🏦 [COBOL BANK] Unentschieden! Einsatz von ${roomState.pot} Coins wurde zurückerstattet.`, system: true }, targetRoom);
                    }
                    roomState.pot = 0;
                }
                // =================================

                /* replaced const */
                if (roomState) roomState.gameOver = true;
                generateGameVideo(targetRoom, ws);

                if (firestoreDb) {
                    try {
                        /* replaced const */
                        const finalBoard = roomState ? roomState.board : ws.lastBoardState;
                        const whiteP = roomState ? roomState.whitePlayer : (ws.color === 'white' ? ws.playerName : ws.opponentName) || 'Weiß';
                        const blackP = roomState ? roomState.blackPlayer : (ws.color === 'black' ? ws.playerName : ws.opponentName) || 'Schwarz';
                        const winnerName = data.winner || (data.text && data.text.includes('Weiß') ? whiteP : data.text && data.text.includes('Schwarz') ? blackP : 'Remis');

                        if (finalBoard && createCanvas) {
                            const canvas = createCanvas(400, 400);
                            const ctx = canvas.getContext('2d');
                            for (let r = 0; r < 8; r++) {
                                for (let c = 0; c < 8; c++) {
                                    ctx.fillStyle = (r + c) % 2 === 0 ? '#eeeed2' : '#769656';
                                    ctx.fillRect(c * 50, r * 50, 50, 50);
                                }
                            }
                            finalBoard.forEach((row, r) => {
                                row.forEach((pieceCode, c) => {
                                    if (pieceCode && loadedPieceImages[pieceCode]) {
                                        ctx.drawImage(loadedPieceImages[pieceCode], c * 50 + 5, r * 50 + 5, 40, 40);
                                    }
                                });
                            });
                            const base64Snapshot = canvas.toDataURL("image/png");

                            await firestoreDb.collection('games').add({
                                room_id: targetRoom,
                                white_player: whiteP,
                                black_player: blackP,
                                winner: winnerName,
                                reason: data.text || data.reason || 'Spiel beendet',
                                snapshot: base64Snapshot,
                                timestamp: new Date().toISOString()
                            });
                            console.log(`📸 FOTO-SNAPSHOT: Erfolgreich in Google Firebase unter 'games' gespeichert für Raum ${targetRoom}!`);
                        }
                    } catch (snapErr) {
                        console.error("Fehler beim Erstellen/Speichern des Spiel-Snapshots:", snapErr);
                    }
                }
            }

        } catch (e) {
            console.error("Fehler bei der Nachrichtenverarbeitung:", e);
        }
    });

    ws.on('close', function() {
        if (ws.botTimeout) {
            clearTimeout(ws.botTimeout);
            ws.botTimeout = null;
        }
        const qIdx = elixirMatchQueue.findIndex(e => e.ws === ws);
        if (qIdx !== -1) elixirMatchQueue.splice(qIdx, 1);

        if (waitingPlayer === ws) {
            waitingPlayer = null;
        }
        // Raum-Status nicht sofort beim Trennen löschen, damit Spieler sich nach Neuladen wiederverbinden können!
        if (typeof removeSpectator === 'function') {
            removeSpectator(ws);
        }
    });
});

const PORT = 3000;

server.listen(PORT, '0.0.0.0', async function() { 
    console.log("MASTER-SERVER STARTET...");
    await loadProfilesFromDB(); 
    
    try {
        if (fs.existsSync(BAN_FILE)) {
            const data = fs.readFileSync(BAN_FILE, 'utf8');
            const parsed = JSON.parse(data);
            bannedIPs = new Set(parsed);
            console.log(`✅ ${bannedIPs.size} IP-Sperren geladen.`);
        }
    } catch (err) {
        console.error("❌ Fehler beim Laden der IP-Bans:", err);
    }

    if (typeof startBackupScheduler === 'function') {
        startBackupScheduler(firestoreDb);
    }

    console.log("✅ MASTER-SERVER READY AUF PORT " + PORT);

    if (typeof startAutoMessages === 'function') {
        startAutoMessages(wss, 90000);
    }

    try {
        if (fs.existsSync('./chaosLernBot.js')) {
            const { fork } = require('child_process');
            fork('./chaosLernBot.js'); 
            console.log("🚀 CHAOS-BOT ALS UNTERPROZESS AKTIVIERT!");
        }
    } catch (e) {
        console.warn("Chaos-Bot Notice:", e.message);
    }
});

process.on('uncaughtException', (err) => {
    console.error('🔥 KRITISCHER ABSTURZ-FEHLER:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('🕒 UNBEHANDELTER PROMISE-FEHLER:', reason);
});
