console.log("HELLO");
require('dotenv').config();
const axios = require('axios');
const path = require('path');
const express = require('express');
const cors = require('cors');
const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');
let bannedIPs = new Set();
let bannedPlayers = new Set();
const ADMIN_PASSWORDS_LIST = ['Admina111', 'admina111', 'Admin111', 'admin111', 'Admina1', 'admina1', 'Maxi', '222'];

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
try { startAutoMessages = require('./autoMessages').startAutoMessages || startAutoMessages; } catch (e) {}

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

let firestoreDb = null;
try {
    const configPath = path.join(__dirname, 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
        const fbConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (fbConfig.projectId) {
            if (!admin.apps || !admin.apps.length) {
                admin.initializeApp({
                    projectId: fbConfig.projectId
                });
            }
            const { getFirestore } = require('firebase-admin/firestore');
            const targetDbId = fbConfig.databaseId || fbConfig.firestoreDatabaseId;
            if (targetDbId && targetDbId !== '(default)') {
                firestoreDb = getFirestore(admin.app(), targetDbId);
            } else {
                firestoreDb = getFirestore();
            }
            global.firestoreDb = firestoreDb;
            console.log("🔥 Google Firestore (Firebase) verknüpft für SchachLive!");
        }
    }
} catch (err) {
    console.warn("Firestore Init Warning:", err.message);
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
                { name: "Spieler", value: playerName, inline: true },
                { name: "Grund", value: reason, inline: true },
                { name: "IP-Adresse", value: `\`${ip}\``, inline: false }
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

// Emergency Unban & Security Middleware
app.use((req, res, next) => {
    const rawIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const clientIP = String(rawIP).split(',')[0].replace(/^::ffff:/, '').trim();

    // Check emergency unban triggers (Query param ?unban=..., ?admin=..., or URL /unban-self)
    const reqPass = req.query.unban || req.query.admin || req.query.pass || req.headers['x-admin-key'];
    const isAdminPass = reqPass && ADMIN_PASSWORDS_LIST.some(p => p.toLowerCase() === String(reqPass).toLowerCase().trim());
    const isLocalOrDev = isLoopbackOrLocalIP(clientIP) || isLoopbackOrLocalIP(rawIP);

    if (isAdminPass || (isLocalOrDev && (req.path === '/unban-self' || req.path === '/api/unban-self'))) {
        bannedIPs.delete(clientIP);
        bannedIPs.delete(rawIP);
        bannedIPs.clear(); // Emergency unban for admin
        bannedPlayers.clear();
        console.log(`🔓 Notfall-Entsperrung ausgeführt für IP: ${clientIP}`);

        if (req.path === '/unban-self' || req.path === '/api/unban-self') {
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
                        <h1>✅ Admin/Entwickler erfolgreich entsperrt!</h1>
                        <p>Deine IP (<strong>${clientIP}</strong>) und alle aktiven Sperren wurden zurückgesetzt.</p>
                        <a href="/" class="btn">🎮 Zurück zur Schach-Anwendung</a>
                    </div>
                </body>
                </html>
            `);
        }
    }

    // Never block loopback, localhost, or internal container/proxy IPs
    if (isLoopbackOrLocalIP(clientIP) || isLoopbackOrLocalIP(rawIP)) {
        return next();
    }

    if (bannedIPs.has(clientIP) || bannedIPs.has(rawIP)) {
        return res.status(403).send(`
            <!DOCTYPE html>
            <html lang="de">
            <head>
                <meta charset="UTF-8">
                <title>403 Zugriff verweigert</title>
                <style>
                    body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; text-align: center; padding: 60px 20px; }
                    .card { background: #1e293b; max-width: 520px; margin: 0 auto; padding: 40px; border-radius: 20px; border: 1px solid #ef4444; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
                    h1 { color: #f87171; margin-top: 0; font-size: 28px; }
                    p { font-size: 16px; color: #cbd5e1; line-height: 1.6; }
                </style>
            </head>
            <body>
                <div class="card">
                    <h1>⛔ IP-Adresse gesperrt</h1>
                    <p>Deine IP-Adresse (<strong>${clientIP}</strong>) wurde vom Anti-Hack-System gesperrt.</p>
                    <p style="font-size: 13px; color: #94a3b8; margin-top: 20px;">Support: Wende dich an den Administrator oder nutze den Admin-Bypass-Schlüssel.</p>
                </div>
            </body>
            </html>
        `);
    }

    if (req.headers['x-forwarded-proto'] !== 'https' && process.env.NODE_ENV === 'production') {
        return res.redirect(`https://${req.hostname}${req.url}`);
    }

    next();
});

// Serve Static Frontend Files & Root Route (1. Root-Route / & 2. Statische Dateien)
app.use(express.static(__dirname, { maxAge: 0 }));
if (fs.existsSync(path.join(__dirname, 'public'))) {
    app.use(express.static(path.join(__dirname, 'public'), { maxAge: 0 }));
}

app.get('/', (req, res) => {
    if (fs.existsSync(path.join(__dirname, 'index.html'))) {
        res.sendFile(path.join(__dirname, 'index.html'));
    } else if (fs.existsSync(path.join(__dirname, 'public', 'index.html'))) {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    } else {
        res.send("Schach-Ultra-Server: MAXIMALE VOLLVERSION - ALLER CODE ENTHALTEN");
    }
});

// REST Endpoints for Auth and Analysis
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
        return res.status(400).json({ success: false, error: "Name und Passwort erforderlich!" });
    }

    let user = userDB[username];

    if (!user) {
        try {
            if (data && data.length > 0) {
                user = data[0];
                userDB[username] = user;
            }
        } catch (e) {}
    }

    // Try fetching from Firestore if missing locally (fallback)
    if (!user && firestoreDb) {
        try {
            const doc = await firestoreDb.collection('players').doc(username).get();
            if (doc.exists) {
                user = doc.data();
                userDB[username] = user;
            }
        } catch (e) {}
    }

    const clientIP = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;
    const uLower = username.trim().toLowerCase();

    // Ban check (unless admin)
    if (!isUserAdmin(username) && (bannedPlayers.has(uLower) || bannedIPs.has(clientIP) || (user && (user.is_banned || user.ip_ban)))) {
        const banReason = (user && user.ban_reason) || "Account gesperrt von der Administration";
        return res.status(403).json({
            success: false,
            banned: true,
            error: "Account gesperrt",
            reason: banReason,
            message: `Account gesperrt! Grund: ${banReason}`
        });
    }

    if (user && user.password && user.password !== password) {
        return res.status(401).json({ success: false, error: "Falsches Passwort!" });
    }

    if (!userDB[username]) {
        userDB[username] = { username, password, elo: 1200, wins: 0, level: 1, xp: 0, role: 'Gast' };
    } else {
        userDB[username].password = password;
        userDB[username].last_login = new Date().toISOString();
    }

    saveAll(username);
    res.json({ success: true, name: username, elo: userDB[username].elo || 1200, wins: userDB[username].wins || 0, level: userDB[username].level || 1, xp: userDB[username].xp || 0, role: userDB[username].role || 'Gast' });
});

app.post('/api/register', async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
        return res.status(400).json({ success: false, error: "Name und Passwort erforderlich!" });
    }
    
    try {
                if (data && data.length > 0 && data[0].password && data[0].password !== password) {
            return res.status(400).json({ success: false, error: "Name bereits vergeben!" });
        }
    } catch (e) {}

    if (firestoreDb) {
        try {
            const doc = await firestoreDb.collection('players').doc(username).get();
            if (doc.exists && doc.data().password && doc.data().password !== password) {
                return res.status(400).json({ success: false, error: "Name bereits vergeben!" });
            }
        } catch (e) {}
    }

    if (userDB[username] && userDB[username].password && userDB[username].password !== password) {
        return res.status(400).json({ success: false, error: "Name bereits vergeben!" });
    }

    userDB[username] = { username, password, elo: 1200, wins: 0, level: 1, xp: 0, role: 'Gast', created_at: new Date().toISOString() };
    saveAll(username);
    res.json({ success: true, name: username });
});

app.get('/api/leaderboard', async (req, res) => {
    try {
        if (typeof firestoreDb !== 'undefined' && firestoreDb) {
            let snapshot = await firestoreDb.collection('leaderboard').get();
            if (snapshot.empty) {
                snapshot = await firestoreDb.collection('players').get();
            }
            if (!snapshot.empty) {
                const list = [];
                snapshot.forEach(doc => {
                    const data = doc.data();
                    const uname = doc.id || data.username || data.name;
                    if (uname && uname !== 'global') {
                        list.push({
                            name: uname,
                            wins: data.wins || 0,
                            elo: data.elo || 1200,
                            level: data.level || 1,
                            xp: data.xp || 0,
                            role: data.role || 'Gast'
                        });
                    }
                });
                list.sort((a, b) => (b.elo !== a.elo ? b.elo - a.elo : b.wins - a.wins));
                if (list.length > 0) {
                    return res.json({ success: true, list: list.slice(0, 100) });
                }
            }
        }
    } catch (err) {
        console.error("Firestore Leaderboard Fetch Error:", err.message);
    }

    const sorted = Object.entries(userDB)
        .map(([name, u]) => ({ 
            name, 
            wins: u.wins || 0, 
            elo: u.elo || 1200,
            level: u.level || 1,
            xp: u.xp || 0,
            role: u.role || 'Gast'
        }))
        .sort((a, b) => (b.elo !== a.elo ? b.elo - a.elo : b.wins - a.wins))
        .slice(0, 100);

    res.json({ success: true, list: sorted });
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
        tickets: globalSupportTickets,
        supportEmail: 'schachlivesupport.jailer914@slmail.me'
    });
    if (wss && wss.clients) {
        wss.clients.forEach(c => {
            if (c.readyState === 1 && (isUserAdmin(c.playerName) || c.role === 'admin' || c.role === 'moderator')) {
                c.send(msgStr);
            }
        });
    }
}

app.post('/api/support-ticket', (req, res) => {
    const { user, contact, text, banReason } = req.body || {};
    if (!text) {
        return res.status(400).json({ success: false, message: 'Nachricht ist erforderlich.' });
    }
    const detectedIP = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || '';
    const ticketId = 'TICK-' + Date.now().toString(36).toUpperCase();
    const newTicket = {
        id: ticketId,
        user: user || contact || 'Gesperrter Spieler',
        contact: contact || user || 'Unbekannt',
        clientIP: detectedIP,
        email: 'schachlivesupport.jailer914@slmail.me',
        text: text,
        banReason: banReason || 'Admin-Gesperrt',
        status: 'Offen',
        createdAt: new Date().toLocaleString('de-DE'),
        timestamp: Date.now(),
        reply: ''
    };
    globalSupportTickets.unshift(newTicket);
    saveTicketsToFile();
    saveTicketToFirestore(newTicket);
    broadcastTicketsUpdate();
    console.log(`📩 Support-Ticket [${ticketId}] von ${user || contact} (IP: ${detectedIP}) erfasst.`);
    res.json({
        success: true,
        ticketId: ticketId,
        supportEmail: 'schachlivesupport.jailer914@slmail.me',
        message: 'Support-Ticket erfolgreich übermittelt.'
    });
});

app.get('/api/admin/tickets', (req, res) => {
    res.json({ success: true, tickets: globalSupportTickets, supportEmail: 'schachlivesupport.jailer914@slmail.me' });
});

app.post('/api/admin/unban-ticket', async (req, res) => {
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

// Ghost Player configuration
const ghostNames = [
    "luca_99", "SchachMatt123", "JulianB", "Felix_M", "Anna_Chess", "alex88", "MariusK", "PawnStar", "max_gamer", "Lena_22", 
    "simon_p", "david_91", "kevin_pro", "sarah_k", "tim_123", "jan_schach", "peter_pan", "lara_croft", "michael_m", "tobias_k", 
    "stephan_b", "chris_99", "julia_s", "lisa_m", "marcel_x", "dennis_d", "philipp_r", "johannes_h", "matthias_w", "christian_g",
    "BulletKing", "blitz_god", "rapid_master", "slow_thinker", "aggressor_99", "defend_pro", "tactics_fan", "endgame_boss"
];
const ghostSentences = ["hi", "moin", "gl hf", "hi :)", "viel glück", "hallo"];

function createGhostPlayer() {
    const randomName = ghostNames[Math.floor(Math.random() * ghostNames.length)];
    
    const ghostBot = {
        playerName: randomName,
        isBot: true,
        readyState: 1,
        send: (data) => {},
        terminate: () => {},
        on: () => {}
    };

    setTimeout(() => {
        broadcast({ 
            type: 'chat', 
            text: ghostSentences[Math.floor(Math.random() * ghostSentences.length)], 
            playerName: randomName 
        });
    }, Math.random() * 5000 + 3000);

    return ghostBot;
}

let serverConfig = { globalMute: false };
let waitingPlayer = null;
const roomWaitingMap = new Map();

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
    console.log("⏳ Lade Schachfiguren von Wikimedia (mit Sicherheits-Pausen)...");
    
    let geladeneAnzahl = 0;
    const figurenKeys = Object.entries(PIECE_URLS);

    for (const [key, url] of figurenKeys) {
        try {
            loadedPieceImages[key] = await loadImage(url);
            geladeneAnzahl++;
            console.log(`✅ Geladen (${geladeneAnzahl}/12): Figur ${key}`);
            await sleep(600); 
        } catch (err) {
            console.error(`❌ Fehler beim Laden von Figur ${key}:`, err.message);
            if (err.message && err.message.includes('429')) {
                console.log(`🔄 Warteschlange voll (429). Versuche ${key} in 3 Sek. erneut...`);
                await sleep(3000);
                try {
                    loadedPieceImages[key] = await loadImage(url);
                    geladeneAnzahl++;
                    console.log(`✅ Im zweiten Versuch geladen: ${key}`);
                } catch (retryErr) {
                    console.error(`❌ Finaler Abbruch für Figur ${key}`);
                }
            }
        }
    }

    if (geladeneAnzahl === 12) {
        console.log("🏁 PERFEKT: Alle 12 Figuren sind im Speicher!");
    } else {
        console.warn(`⚠️ ACHTUNG: Nur ${geladeneAnzahl} von 12 Figuren geladen.`);
    }
}

preloadPieceImages();

async function captureMoveSnapshot(gameId, boardArray, moveCount) {
    if (!createCanvas) return;
    const canvas = createCanvas(400, 400);
    const ctx = canvas.getContext('2d');

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            ctx.fillStyle = (r + c) % 2 === 0 ? '#eeeed2' : '#769656';
            ctx.fillRect(c * 50, r * 50, 50, 50);
        }
    }

    boardArray.forEach((row, r) => {
        row.forEach((pieceCode, c) => {
            if (pieceCode && loadedPieceImages[pieceCode]) {
                const img = loadedPieceImages[pieceCode];
                ctx.drawImage(img, c * 50 + 5, r * 50 + 5, 40, 40);
            }
        });
    });

    const fileName = `game_${gameId}_move_${String(moveCount).padStart(3, '0')}.png`;
    const filePath = path.join(TEMP_DIR, fileName);
    
    const out = fs.createWriteStream(filePath);
    const stream = canvas.createPNGStream();
    stream.pipe(out);
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
    const sorted = Object.entries(userDB)
        .map(([name, u]) => ({
            name: name,
            wins: u.wins || 0,
            elo: u.elo || 1200,
            level: u.level || 1,
            xp: u.xp || 0,
            role: u.role || 'user'
        }))
        .sort((a, b) => b.wins - a.wins)
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
            let count = 0;
            snapshot.forEach(doc => {
                const p = doc.data();
                userDB[doc.id] = {
                    password: p.password || "",
                    elo: p.elo || 1200,
                    wins: p.wins || 0,
                    losses: p.losses || 0,
                    xp: p.xp || 0,
                    level: p.level || 1,
                    role: p.role || 'Gast',
                    ip_ban: p.ip_ban || false,
                    is_banned: p.is_banned || false,
                    friends: p.friends || []
                };
                count++;
            });
            console.log(`✅ ${count} Profile erfolgreich aus Firestore geladen.`);
        }
    } catch (err) {
        console.error("❌ Fehler beim Laden von DB:", err);
    }
}

async function loadFirestoreProfiles() {
    if (!firestoreDb) return;
    try {
        const snapshot = await firestoreDb.collection('players').get();
        snapshot.forEach(doc => {
            const data = doc.data();
            const uname = doc.id || data.username;
            if (uname) {
                userDB[uname] = {
                    username: uname,
                    uid: data.uid || "",
                    role: data.role || "user",
                    password: data.password || "",
                    elo: data.elo || 1200,
                    wins: data.wins || 0,
                    losses: data.losses || 0,
                    xp: data.xp || 0,
                    level: data.level || 1,
                    ip_address: data.ip_address || "",
                    last_login: data.last_login || new Date().toISOString(),
                    board_theme: data.board_theme || "classic",
                    piece_theme: data.piece_theme || "classic",
                    achievements: data.achievements || [],
                    last_puzzle_solved: data.last_puzzle_solved || "",
                    last_puzzle_solved_date: data.last_puzzle_solved_date || "",
                    puzzle_streak: data.puzzle_streak || 0
                };
                leaderboard[uname] = data.wins || 0;
            }
        });
        console.log(`🔥 ${snapshot.size} Nutzer-Profile aus Firestore synchronisiert.`);

        // Also fetch leaderboard collection from Firestore
        const lbSnapshot = await firestoreDb.collection('leaderboard').get();
        lbSnapshot.forEach(doc => {
            const data = doc.data();
            const uname = doc.id || data.username || data.name;
            if (uname && uname !== 'global') {
                if (!userDB[uname]) {
                    userDB[uname] = {
                        username: uname,
                        elo: data.elo || 1200,
                        wins: data.wins || 0,
                        losses: data.losses || 0,
                        level: data.level || 1,
                        xp: data.xp || 0,
                        role: data.role || "user"
                    };
                }
                leaderboard[uname] = data.wins || userDB[uname].wins || 0;
            }
        });

        // Ensure every userDB entry is synced to Firestore leaderboard collection
        for (const uname in userDB) {
            const u = userDB[uname];
            firestoreDb.collection('leaderboard').doc(uname).set({
                username: uname,
                name: uname,
                elo: u.elo || 1200,
                wins: u.wins || 0,
                losses: u.losses || 0,
                level: u.level || 1,
                xp: u.xp || 0,
                role: u.role || 'Gast',
                updatedAt: new Date().toISOString()
            }, { merge: true }).catch(() => {});
        }
    } catch (e) {
        console.warn("Firestore profiles load error:", e.message);
    }
}

async function loadFirestoreBans() {
    if (!firestoreDb) return;
    try {
        const snapshot = await firestoreDb.collection('bans').get();
        snapshot.forEach(doc => {
            const data = doc.data();
            const target = data.target;
            const type = data.type; // 'ip' or 'username'
            if (target && type) {
                if (type === 'ip') {
                    if (!isLoopbackOrLocalIP(target)) {
                        bannedIPs.add(target);
                    }
                } else if (type === 'username') {
                    if (!isUserAdmin(target)) {
                        bannedPlayers.add(target.trim().toLowerCase());
                    }
                }
            }
        });
        console.log(`🔥 ${snapshot.size} Bans aus Firestore geladen. (Banned IPs: ${bannedIPs.size}, Banned Players: ${bannedPlayers.size})`);
    } catch (e) {
        console.warn("Firestore bans load error:", e.message);
    }
}

async function sendBanEmail(playerName, reason, ip) {
    console.log(`✉️ E-Mail Benachrichtigung: Spieler ${playerName} (${ip}) wurde gesperrt. Grund: ${reason}`);
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
    const ADMIN_LIST = ['max', '222', 'admin', 'max.schule13@gmail.com', 'owner', 'eigentümer'];
    if (ADMIN_LIST.includes(str)) return true;

    if (userDB) {
        if (userDB[target] && (userDB[target].role === 'admin' || userDB[target].is_owner || userDB[target].role === 'moderator')) {
            return true;
        }
        for (const k in userDB) {
            const u = userDB[k];
            if (u && (u.username?.toLowerCase() === str || u.email?.toLowerCase() === str || u.uid === target)) {
                if (u.role === 'admin' || u.is_owner) return true;
            }
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
            c.send(JSON.stringify({
                type: 'account_banned_overlay',
                reason: reason
            }));
            c.send(JSON.stringify({ 
                type: 'system_alert', 
                message: `🚫 DEIN ACCOUNT UND DEINE IP WURDEN PERMANENT GESPERRT.\nGrund: ${reason}` 
            }));
            setTimeout(() => { c.terminate(); }, 400);
        }
    });
}

async function unbanPlayerHelper(targetName) {
    if (!targetName) return;
    const cleanTarget = targetName.trim();
    const cleanTargetLower = cleanTarget.toLowerCase();

    // 1. Delete target directly from Sets
    bannedPlayers.delete(cleanTargetLower);
    bannedIPs.delete(cleanTarget);

    // 2. Check and unban target in userDB
    if (userDB[cleanTarget]) {
        userDB[cleanTarget].is_banned = false;
        userDB[cleanTarget].ip_ban = false;
        if (userDB[cleanTarget].ip_address) {
            bannedIPs.delete(userDB[cleanTarget].ip_address);
        }
    }

    // 3. Search userDB for matching username, email, or IP
    for (const uname in userDB) {
        const u = userDB[uname];
        if (!u) continue;
        if (uname.toLowerCase() === cleanTargetLower || 
            (u.email && u.email.toLowerCase() === cleanTargetLower) || 
            u.ip_address === cleanTarget) {
            u.is_banned = false;
            u.ip_ban = false;
            bannedPlayers.delete(uname.toLowerCase());
            if (u.ip_address) bannedIPs.delete(u.ip_address);
        }
    }

    // 4. Update status in support tickets for this user
    globalSupportTickets.forEach(t => {
        if (t.user?.toLowerCase() === cleanTargetLower || t.contact?.toLowerCase() === cleanTargetLower || t.clientIP === cleanTarget) {
            t.status = 'Entbannt';
            t.reply = t.reply || 'Entbannungsantrag genehmigt!';
        }
    });
    saveTicketsToFile();

    // 5. Delete ban documents in Firestore
    if (firestoreDb) {
        try {
            const banIdUser = `username_${cleanTargetLower}`;
            await firestoreDb.collection('bans').doc(banIdUser).delete();
            
            const banIdIP = `ip_${cleanTarget.replace(/[^a-zA-Z0-9_.-]/g, '_')}`;
            await firestoreDb.collection('bans').doc(banIdIP).delete();
        } catch (e) {
            console.error("Fehler beim Löschen des Bans aus Firestore:", e.message);
        }
    }

    try {
        fs.writeFileSync(BAN_FILE, JSON.stringify([...bannedIPs], null, 2));
        fs.writeFileSync(USER_FILE, JSON.stringify(userDB, null, 2));
    } catch (e) {}

    console.log(`🔓 Entbannung ausgeführt für: ${cleanTarget}`);
}

function loadData() {
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
    loadFirestoreProfiles();
    loadFirestoreBans();
    loadFirestoreTickets();

    // Auto-clean Admin Accounts from Ban lists
    const ADMIN_NAMES = ['max', '222', 'admin', 'max.schule13@gmail.com', 'owner', 'eigentümer'];
    ADMIN_NAMES.forEach(adm => {
        bannedPlayers.delete(adm);
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
                firestoreDb.collection('players').doc(uname).set(u, { merge: true })
                    .catch(e => console.error('Firestore player save err:', e.message));

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

wss.on('connection', function(ws, req) {
    const detectedIP = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;
    ws.clientIP = detectedIP;
    
    getLocationFromIP(detectedIP).then(locationData => {
        ws.location = locationData; 
        if (locationData && locationData.status !== "local") {
            console.log(`🌍 RADAR: ${ws.playerName || 'Gast'} aus ${locationData.city}, ${locationData.country} (ISP: ${locationData.isp})`);
        }
    }).catch(err => console.log("Radar-Fehler:", err));

    ws.lastMessageTime = 0;

    if (bannedIPs.has(ws.clientIP)) {
        sendSystemAlert(ws, '❌ ZUGRIFF VERWEIGERT: Deine IP ist permanent gebannt!');
        setTimeout(() => ws.terminate(), 1000);
        return;
    }

    if (blockedIPs.has(ws.clientIP)) {
        const expiry = blockedIPs.get(ws.clientIP);
        if (Date.now() < expiry) {
            const restZeit = Math.ceil((expiry - Date.now()) / 60000);
            sendSystemAlert(ws, `🚫 IP-SPERRE: Zu viele Fehlversuche. Warte noch ${restZeit} Minuten.`);
            setTimeout(() => ws.terminate(), 1000);
            return;
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

    ws.on('message', async function(message) {
        const ip = ws.clientIP;
        const now = Date.now();
        let data;

        const triggerUltraBanLocal = async (reason) => {
            await triggerUltraBan(reason, null, ws);
        };

        try {
            data = JSON.parse(message);
        } catch (e) {
            return;
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

            const currentName = (ws.playerName || "").trim();
            const ADMIN_NAMES = ['Max', '222'];

            if (data.type !== 'login_attempt' && data.type !== 'login' && data.type !== 'join') { 
                if (data.playerName === 'Max' && ws.playerName !== 'Max') {
                    console.log(`⚠️ Identitäts-Check abgelehnt für: ${ws.playerName}`);
                    return triggerUltraBanLocal("Admin-Identitätsklau Versuch");
                }
            }

            const textStr = (data.text || "").trim();
            const containsAdminPw = typeof data.text === 'string' && ADMIN_PASSWORDS_LIST.some(pw => data.text.includes(pw));
            const isCmd = typeof data.text === 'string' && (textStr.startsWith('/') || textStr.startsWith('!') || textStr.startsWith('?'));

            if (data.type === 'chat' && (isCmd || containsAdminPw)) {
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
                // CRITICAL SECURITY RULE: Commands and messages containing admin passwords MUST NEVER be broadcast!
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
                const { playerName, password, clientIP, uid } = data;
                if (!playerName || !password) {
                    return ws.send(JSON.stringify({ type: 'login_error', text: 'Bitte Name & Passwort eingeben!' }));
                }

                let user = null;
                if (uid) {
                    const existingName = Object.keys(userDB).find(name => userDB[name].uid === uid);
                    if (existingName) {
                        user = userDB[existingName];
                        if (existingName !== playerName) {
                            delete userDB[existingName];
                            delete profiles[existingName];
                            user.username = playerName;
                            userDB[playerName] = user;
                        }
                    }
                }
                if (!user) {
                    user = userDB[playerName];
                }

                const pLower = playerName.toLowerCase();
                const connIP = clientIP || ws.clientIP;
                const isBannedUser = bannedPlayers.has(pLower) || (connIP && bannedIPs.has(connIP)) || (user && (user.is_banned || user.ip_ban));

                if (isBannedUser && !isUserAdmin(playerName)) {
                    const banReason = (user && user.ban_reason) || "Account gesperrt von der Administration";
                    return ws.send(JSON.stringify({
                        type: 'login_error',
                        banned: true,
                        reason: banReason,
                        text: `Dieser Account ist permanent gesperrt!\nHinterlegter Grund: ${banReason}`
                    }));
                }

                if (user) {
                    if (password !== 'firebase-auth-token' && user.password && user.password !== password) {
                        return ws.send(JSON.stringify({ type: 'login_error', text: 'Falsches Passwort für diesen Namen!' }));
                    }
                    user.last_login = new Date();
                    if (password !== 'firebase-auth-token') user.password = password;
                    if (uid) user.uid = uid;
                } else {
                    user = {
                        username: playerName,
                        uid: uid || "",
                        role: 'user',
                        password: password === 'firebase-auth-token' ? '' : password,
                        elo: 1200,
                        wins: 0,
                        xp: 0,
                        level: 1,
                        ip_address: clientIP,
                        created_at: new Date()
                    };
                    userDB[playerName] = user;
                }

                if (playerName.toLowerCase() === 'max' || (data.email && data.email.toLowerCase() === 'max.schule13@gmail.com')) {
                    user.role = 'admin';
                }

                saveAll(playerName);

                ws.playerName = playerName;
                if (data.email) ws.userEmail = data.email;
                profiles[playerName] = user; 
                
                sendLeaderboardUpdate();
                
                ws.send(JSON.stringify({ 
                    type: 'login_success', 
                    name: playerName, 
                    role: user.role || 'user',
                    elo: user.elo || 1200,
                    wins: user.wins || 0,
                    losses: user.losses || 0,
                    level: user.level || 1,
                    xp: user.xp || 0,
                    board_theme: user.board_theme || 'classic',
                    piece_theme: user.piece_theme || 'classic',
                    achievements: user.achievements || []
                }));
                console.log(`✅ Login & Profil bereit: ${playerName}`);
                return; 
            }

            if (data.type === 'admin_ban_user') {
                if (!isUserAdmin(ws.playerName) && ws.role !== 'admin' && ws.role !== 'moderator') {
                    ws.send(JSON.stringify({ type: 'system_alert', message: 'Keine Berechtigung, um Spieler zu bannen.' }));
                    return;
                }
                const target = data.target || data.username;
                const reason = data.reason || 'Admin-Entscheidung';
                if (target) {
                    await triggerUltraBan(target, reason, ws);
                }
                return;
            }

            if (data.type === 'get_admin_logs') {
                ws.send(JSON.stringify({
                    type: 'admin_logs_update',
                    logs: adminBanLogs
                }));
                return;
            }

            if (data.type === 'get_admin_tickets') {
                ws.send(JSON.stringify({
                    type: 'admin_tickets_update',
                    tickets: globalSupportTickets,
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
                if (!isUserAdmin(ws.playerName) && ws.role !== 'admin' && ws.role !== 'moderator') {
                    ws.send(JSON.stringify({ type: 'system_alert', message: 'Keine Berechtigung, um Spieler zu entbannen.' }));
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
                const allUsers = [];
                const seenNames = new Set();

                // 1. Online WebSocket Users
                wss.clients.forEach(c => {
                    if (c.playerName) {
                        seenNames.add(c.playerName.toLowerCase());
                        const uData = userDB[c.playerName] || {};
                        allUsers.push({
                            id: c.playerName,
                            username: c.playerName,
                            role: uData.role || (isUserAdmin(c.playerName) ? 'admin' : 'user'),
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
                            role: uData.role || (isUserAdmin(uname) ? 'admin' : 'user'),
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
                const { target, role } = data;
                if (target && role) {
                    if (!userDB[target]) userDB[target] = { username: target, elo: 1200 };
                    userDB[target].role = role;
                    saveAll(target);
                    ws.send(JSON.stringify({ type: 'chat', text: `✅ Rolle von '${target}' auf '${role}' gesetzt.`, system: true }));
                    
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
                        if (c.readyState === 1 && (isUserAdmin(c.playerName) || c.role === 'admin')) {
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

                const containsPw = ADMIN_PASSWORDS_LIST.some(pw => content.includes(pw));
                const isCmdType = content.startsWith('/') || content.startsWith('!') || content.startsWith('?');
                
                if (containsPw || isCmdType) {
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
                if (waitingPlayer && waitingPlayer !== ws && waitingPlayer.readyState === 1 && waitingPlayer.timeControl === data.timeControl) {
                    if (waitingPlayer.botTimeout) {
                        clearTimeout(waitingPlayer.botTimeout);
                        console.log("🛑 Timer gestoppt - Menschlicher Gegner gefunden!");
                    }

                    const roomID = "room_" + Math.random().toString(36).substr(2, 9);
                    ws.room = roomID;
                    waitingPlayer.room = roomID;
                    ws.color = 'black';
                    waitingPlayer.color = 'white';
                    ws.opponentName = waitingPlayer.playerName || "Spieler 1";
                    waitingPlayer.opponentName = ws.playerName || "Spieler 2";
                    
                    let tc = data.timeControl || 'unlimited';
                    let tSecs = 0;
                    let tInc = 0;
                    if (tc !== 'unlimited') {
                        if (tc.includes('+')) {
                            const pts = tc.split('+');
                            tSecs = parseInt(pts[0]) * 60;
                            tInc = parseInt(pts[1]);
                        } else {
                            tSecs = parseInt(tc) * 60;
                        }
                    }

                    activeRoomStates.set(roomID, {
                        board: null,
                        turn: 'white',
                        isGhostMatch: ws.isGhostMatch || false,
                        whitePlayer: waitingPlayer.playerName || "Spieler 1",
                        blackPlayer: ws.playerName || "Spieler 2",
                        timeControl: tc,
                        timeWhite: tSecs,
                        timeBlack: tSecs,
                        timeInc: tInc,
                        gameOver: false
                    });

                    ws.send(JSON.stringify({ 
                        type: 'gameStart', 
                        room: roomID, 
                        color: 'black', 
                        opponent: ws.opponentName
                    }));
                    waitingPlayer.send(JSON.stringify({ 
                        type: 'gameStart', 
                        room: roomID, 
                        color: 'white', 
                        opponent: waitingPlayer.opponentName
                    }));
                    
                    waitingPlayer = null; 
                } else {
                    waitingPlayer = ws;
                    waitingPlayer.timeControl = data.timeControl || 'unlimited';
                    console.log(`⏳ ${ws.playerName || "Gast"} sucht ein Spiel... (Time: ${waitingPlayer.timeControl})`);

                    ws.botTimeout = setTimeout(() => {
                        if (waitingPlayer === ws) {
                            const roomID = "room_" + Date.now();
                            const botName = ghostNames[Math.floor(Math.random() * ghostNames.length)];
                            if (!userDB[botName]) {
                                userDB[botName] = { 
                                    level: 1 + Math.floor(Math.random() * 5), 
                                    xp: Math.floor(Math.random() * 100), 
                                    wins: Math.floor(Math.random() * 20), 
                                    losses: Math.floor(Math.random() * 20), 
                                    elo: 1000 + Math.floor(Math.random() * 500), 
                                    role: 'user' 
                                };
                            }

                            ws.room = roomID;
                            ws.isGhostMatch = true;
                            ws.opponentName = botName; 
                            waitingPlayer = null; 

                            ws.send(JSON.stringify({ 
                                type: 'gameStart', 
                                opponent: botName, 
                                 
                                room: roomID, 
                                color: 'white' 
                            }));

                            console.log(`🎮 Match erstellt: ${botName} vs. ${ws.playerName}`);

                            if (typeof ghost !== 'undefined' && ghost && ghost.handleGhostGreeting) {
                                ghost.handleGhostGreeting(ws, botName);
                            }
                        }
                    }, 5000); 
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
                    if (!moveCounters[targetRoom]) moveCounters[targetRoom] = 0;
                    moveCounters[targetRoom]++; 
                    
                    captureMoveSnapshot(targetRoom, data.board, moveCounters[targetRoom]);
                    ws.lastBoardState = data.board; 

                    let roomState = activeRoomStates.get(targetRoom);
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
                        const currentBotName = ws.opponentName || "luca_99";
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
                        text: `⏳ Raum '${roomName}' beigetreten. Warte auf menschliche(n) Mitspieler...`
                    }));

                    // In tournament/custom rooms, bot fallback is ONLY executed if explicitly enabled!
                    if (data.allowBotFallback === true) {
                        ws.botTimeout = setTimeout(() => {
                            let currList = roomWaitingMap.get(roomName) || [];
                            if (currList.includes(ws)) {
                                currList = currList.filter(c => c !== ws);
                                roomWaitingMap.set(roomName, currList);

                                const botName = ghostNames[Math.floor(Math.random() * ghostNames.length)];
                            if (!userDB[botName]) {
                                userDB[botName] = { 
                                    level: 1 + Math.floor(Math.random() * 5), 
                                    xp: Math.floor(Math.random() * 100), 
                                    wins: Math.floor(Math.random() * 20), 
                                    losses: Math.floor(Math.random() * 20), 
                                    elo: 1000 + Math.floor(Math.random() * 500), 
                                    role: 'user' 
                                };
                            }
                                ws.isGhostMatch = true;
                                ws.opponentName = botName;

                                ws.send(JSON.stringify({
                                    type: 'gameStart',
                                    opponent: botName,
                                    
                                    room: roomName,
                                    color: 'white'
                                }));
                                if (typeof ghost !== 'undefined' && ghost && ghost.handleGhostGreeting) {
                                    ghost.handleGhostGreeting(ws, botName);
                                }
                            }
                        }, 15000);
                    }
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
                const roomState = activeRoomStates.get(targetRoom);

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
                const roomState = activeRoomStates.get(targetRoom);
                if (roomState) roomState.gameOver = true;
                generateGameVideo(targetRoom, ws);

                if (firestoreDb) {
                    try {
                        const roomState = activeRoomStates.get(targetRoom);
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
    if (typeof startAutoMessages === 'function') {
        startAutoMessages(wss); 
        console.log("🤖 Info-Bot (AutoMessages) wurde gestartet.");
    }
    if (typeof startAutoTestBot === 'function') {
        startAutoTestBot({ wss, db: firestoreDb, profiles: userDB }, 5);
    }

    console.log("✅ MASTER-SERVER READY AUF PORT " + PORT);

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
