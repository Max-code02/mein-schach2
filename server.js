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
try { getLocationFromIP = require('./geoTracker.js').getLocationFromIP || getLocationFromIP; } catch (e) {}

let parseEmojis = (t) => t;
try { parseEmojis = require('./emojis').parseEmojis || parseEmojis; } catch (e) {}

let isNameAllowed = () => true;
try { isNameAllowed = require('./badnames').isNameAllowed || isNameAllowed; } catch (e) {}

let addSpectator = () => {}, removeSpectator = () => {}, broadcastToSpectators = () => {};
try {
    const spec = require('./spectator');
    addSpectator = spec.addSpectator || addSpectator;
    removeSpectator = spec.removeSpectator || removeSpectator;
    broadcastToSpectators = spec.broadcastToSpectators || broadcastToSpectators;
} catch (e) {}

let startAutoMessages = () => {};
try { startAutoMessages = require('./autoMessages').startAutoMessages || startAutoMessages; } catch (e) {}

let handleAdminCommand = async () => false;
try { handleAdminCommand = require('./adminSystem').handleAdminCommand || handleAdminCommand; } catch (e) {}

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
const { db } = require('./src/db/index.js');
const schema = require('./src/db/schema.js');
const { eq, asc } = require('drizzle-orm');
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
    if (ip && !bannedIPs.has(ip)) {
        bannedIPs.add(ip);
        console.log(`🚫 IP ${ip} wurde zur internen Sperrliste hinzugefügt.`);
        
        const htaccessPath = path.join(__dirname, '.htaccess');
        const denyLine = `\nDeny from ${ip}`;

        fs.appendFile(htaccessPath, denyLine, (err) => {
            if (err) console.error("Fehler beim Schreiben in .htaccess:", err);
            else console.log(`🚫 IP ${ip} wurde permanent in .htaccess gesperrt!`);
        });

        if (db) {
            db.insert(schema.ipBan).values({ ip_address: ip, reason: reason }).then(() => {
                console.log(`🚫 IP ${ip} permanent in DB gespeichert.`);
            }).catch(err => console.error(err.message));
        }
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

// Security Middleware
app.use((req, res, next) => {
    const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    if (bannedIPs.has(clientIP)) {
        return res.status(403).send("<h1>403 Forbidden</h1>Deine IP wurde vom Antihack-System gesperrt.");
    }

    if (req.headers['x-forwarded-proto'] !== 'https' && process.env.NODE_ENV === 'production') {
        return res.redirect(`https://${req.hostname}${req.url}`);
    }

    next();
});

// Serve Static Frontend Files & Root Route (1. Root-Route / & 2. Statische Dateien)
app.use(express.static(__dirname, { maxAge: '30d' }));
if (fs.existsSync(path.join(__dirname, 'public'))) {
    app.use(express.static(path.join(__dirname, 'public'), { maxAge: '30d' }));
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
app.post('/api/login', (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
        return res.status(400).json({ success: false, error: "Name und Passwort erforderlich!" });
    }
    const user = userDB[username];
    if (user && user.password && user.password !== password) {
        return res.status(401).json({ success: false, error: "Falsches Passwort!" });
    }
    if (!userDB[username]) {
        userDB[username] = { username, password, elo: 1200, wins: 0, level: 1, xp: 0 };
        saveAll();
    }
    res.json({ success: true, name: username, elo: userDB[username].elo || 1200, wins: userDB[username].wins || 0 });
});

app.post('/api/register', (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
        return res.status(400).json({ success: false, error: "Name und Passwort erforderlich!" });
    }
    if (userDB[username] && userDB[username].password && userDB[username].password !== password) {
        return res.status(400).json({ success: false, error: "Name bereits vergeben!" });
    }
    userDB[username] = { username, password, elo: 1200, wins: 0, level: 1, xp: 0 };
    saveAll();
    res.json({ success: true, name: username });
});

app.get('/api/leaderboard', (req, res) => {
    const sorted = Object.entries(userDB)
        .map(([name, u]) => ({ name, wins: u.wins || 0, elo: u.elo || 1200 }))
        .sort((a, b) => b.wins - a.wins)
        .slice(0, 10);
    res.json({ success: true, list: sorted });
});

app.post('/analyse', (req, res) => {
    const data = req.body || {};
    const spieler = data.spieler || "Unbekannt";
    const wins = userDB[spieler] ? userDB[spieler].wins || 0 : 0;
    const estimatedElo = 1200 + wins * 25;
    res.json({
        Basis_Werte: { Rang: estimatedElo > 1500 ? "Expert" : "Spieler", Geschätzte_Elo: estimatedElo },
        Positions_Analyse: { Zentrum: "Gut", Entwicklung: "Solide", Material_Vorteil: "0" },
        Aggressivitäts_Index: { Gesamt: 55 }
    });
});

// Ghost Player configuration
const ghostNames = ["ChessMaster99", "Lukas_Pro", "QueenGambit", "DarkKnight", "Susi_Sunshine", "CheckMate", "KingOfKings", "Master_88"];
const ghostSentences = ["Hallo!", "Viel Glück!", "Gutes Spiel!", "Lust auf eine Revanche?", "Puh, das war knapp!", "Respekt!", "Moin moin", "Schach!", "Gleich hab ich dich!"];

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
            text: `${randomName}: ${ghostSentences[Math.floor(Math.random() * ghostSentences.length)]}`, 
            playerName: randomName 
        });
    }, Math.random() * 5000 + 3000);

    return ghostBot;
}

let serverConfig = { globalMute: false };
let waitingPlayer = null;

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

// Supabase Realtime Message Broker for cross-server & cross-client messaging
let realTimeChannel = null;

function broadcastGlobalMessage(msgObj, publishToRealtime = true) {
    const msgStr = JSON.stringify(msgObj);
    wss.clients.forEach(client => {
        if (client.readyState === 1) {
            client.send(msgStr);
        }
    });

    if (publishToRealtime && realTimeChannel) {
        realTimeChannel.send({
            type: 'broadcast',
            event: 'message',
            payload: { ...msgObj, _origin: SERVER_INSTANCE_ID }
        }).catch(() => {});
    }
}

function broadcastRoomMessage(msgObj, roomID, publishToRealtime = true, senderWs = null) {
    const msgStr = JSON.stringify(msgObj);
    wss.clients.forEach(client => {
        if (client !== senderWs && client.readyState === 1 && (client.room === roomID || roomID === 'global')) {
            client.send(msgStr);
        }
    });
    
    // Spectators get the message separately via broadcastToSpectators logic
    
    if (publishToRealtime && realTimeChannel) {
        realTimeChannel.send({
            type: 'broadcast',
            event: 'message',
            payload: { ...msgObj, _origin: SERVER_INSTANCE_ID, _targetRoom: roomID, _ignoreSelf: !!senderWs }
        }).catch(() => {});
    }
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
    const sorted = Object.entries(leaderboard)
        .sort((a, b) => {
            const winsA = typeof a[1] === 'object' ? a[1].wins : a[1];
            const winsB = typeof b[1] === 'object' ? b[1].wins : b[1];
            return winsB - winsA;
        })
        .slice(0, 10);

    const msg = JSON.stringify({ 
        type: 'leaderboard', 
        list: sorted.map(e => {
            const data = typeof e[1] === 'object' ? e[1] : { 
                wins: e[1], 
                level: 1, 
                xp: 0, 
                joined: new Date().toLocaleDateString('de-DE') 
            };
            return { 
                name: e[0], 
                wins: data.wins, 
                level: data.level, 
                xp: data.xp,
                joined: data.joined 
            };
        }) 
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
        const schema = require('./src/db/schema.js');
        const data = await db.select().from(schema.players);
        data.forEach(p => {
            userDB[p.username] = {
                password: p.password || "",
                wins: p.wins || 0,
                xp: p.xp || 0,
                level: p.level || 1,
                ip_ban: p.ip_ban || false,
                is_banned: p.is_banned || false
            };
        });
        console.log(`✅ ${data.length} Profile erfolgreich aus DB geladen.`);
    } catch (err) {
        console.error("❌ Fehler beim Laden von DB:", err);
    }
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
}
loadData();

async function loadBannedIPs() {
    try {
        const schema = require('./src/db/schema.js');
        const data = await db.select().from(schema.ipBan);
        if (data) {
            data.forEach(row => bannedIPs.add(row.ip_address));
            console.log(`✅ ${bannedIPs.size} gesperrte IPs aus DB geladen.`);
        }
    } catch (err) {
        console.error("loadBannedIPs catch:", err.message);
    }
}

loadBannedIPs();

function saveAll() {
    try {
        fs.writeFileSync(LB_FILE, JSON.stringify(leaderboard, null, 2));
        fs.writeFileSync(USER_FILE, JSON.stringify(userDB, null, 2));
        fs.writeFileSync(BAN_FILE, JSON.stringify([...bannedIPs], null, 2));
    } catch (e) {
        console.log("Konnte Daten nicht speichern");
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

        const triggerUltraBan = async (reason) => {
            if (ip === '::1' || ip === '127.0.0.1' || ip === 'localhost') {
                console.log(`🛡️ Schutz: Server-IP (${ip}) wird nicht gebannt. Grund: ${reason}`);
                return; 
            }

            const currentName = ((typeof data !== 'undefined' && data.playerName) ? data.playerName : ws.playerName || "Unbekannt").trim();
            console.error(`⛔ ULTRA-BAN: ${ip} | User: ${currentName} | Grund: ${reason}`);

            bannedIPs.add(ip);
            try {
                fs.writeFileSync(BAN_FILE, JSON.stringify([...bannedIPs], null, 2));
            } catch (e) {
                console.error("Fehler beim Speichern der bans.json");
            }

            try {
                await db.update(schema.players)
                    .set({ 
                        ip_ban: true, 
                        is_banned: true,  
                    })
                    .where(eq(schema.players.username, currentName));
                console.log(`☁️ DB: Account ${currentName} und IP erfolgreich als gebannt markiert.`);
            } catch (err) {
                console.error("❌ Fehler beim DB-Update:", err.message);
            }

            try {
                await sendBanEmail(currentName, reason, ip);
            } catch (e) {}

            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'system_alert', message: "🚫 DEIN ACCOUNT UND DEINE IP WURDEN PERMANENT GESPERRT." }));
                setTimeout(() => { ws.terminate(); }, 500);
            }
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

            const isSafe = validateSecurity(data, ws, bannedIPs, triggerUltraBan);
            if (!isSafe) return;

            const currentName = (ws.playerName || "").trim();
            const ADMIN_NAMES = ['Max', '222'];

            if (data.type !== 'login_attempt' && data.type !== 'login' && data.type !== 'join') { 
                if (data.playerName === 'Max' && ws.playerName !== 'Max') {
                    console.log(`⚠️ Identitäts-Check abgelehnt für: ${ws.playerName}`);
                    return triggerUltraBan("Admin-Identitätsklau Versuch");
                }
            }

            const ADMIN_PASSWORDS_LIST = ['Admina111', 'admina111', 'Admin111', 'admin111', 'Admina1', 'admina1', 'Maxi', '222'];
            const textStr = (data.text || "").trim();
            const containsAdminPw = typeof data.text === 'string' && ADMIN_PASSWORDS_LIST.some(pw => data.text.includes(pw));
            const isCmd = typeof data.text === 'string' && (textStr.startsWith('/') || textStr.startsWith('!') || textStr.startsWith('?'));

            if (data.type === 'chat' && (isCmd || containsAdminPw)) {
                const isHandled = await handleAdminCommand(ws, data.text, {
                    wss, 
                    db: db, 
                    banPlayer: triggerUltraBan, 
                    bannedIPs, 
                    bannedPlayers, 
                    profiles: userDB, 
                    addSpectator, 
                    removeSpectator,
                    roomStates: activeRoomStates
                });

                if (!isHandled) {
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
                const { playerName, password, clientIP } = data;
                if (!playerName || !password) {
                    return ws.send(JSON.stringify({ type: 'login_error', text: 'Bitte Name & Passwort eingeben!' }));
                }

                if (bannedIPs.has(clientIP)) {
                    return ws.send(JSON.stringify({ type: 'login_error', text: 'Deine IP ist gesperrt!' }));
                }

                let user = userDB[playerName];
                if (user) {
                    if (user.password && user.password !== password) {
                        return ws.send(JSON.stringify({ type: 'login_error', text: 'Falsches Passwort für diesen Namen!' }));
                    }
                    user.last_login = new Date();
                    user.password = password;
                } else {
                    user = {
                        username: playerName,
                        password: password,
                        elo: 1200,
                        wins: 0,
                        xp: 0,
                        level: 1,
                        ip_address: clientIP,
                        created_at: new Date()
                    };
                    userDB[playerName] = user;
                }

                saveAll();

                // Background sync attempt to DB (non-blocking)
                try {
                    db.insert(schema.players).values({ 
                        username: playerName, 
                        password: password, 
                        ip_address: clientIP,
                        last_login: new Date()
                    }).onConflictDoUpdate({
                        target: schema.players.username,
                        set: {
                            password: password,
                            ip_address: clientIP,
                            last_login: new Date()
                        }
                    }).catch(() => {});
                } catch (e) {}

                ws.playerName = playerName; 
                profiles[playerName] = user; 
                
                ws.send(JSON.stringify({ 
                    type: 'login_success', 
                    name: playerName, 
                    elo: user.elo || 1200,
                    wins: user.wins || 0
                }));
                console.log(`✅ Login & Profil bereit: ${playerName}`);
                return; 
            }

            if (data.type === 'chat_message') {
                const { username, content } = data;
                const containsPw = ADMIN_PASSWORDS_LIST.some(pw => content.includes(pw));
                const isCmdType = content.startsWith('/') || content.startsWith('!') || content.startsWith('?');
                
                if (containsPw || isCmdType) {
                    const isHandled = await handleAdminCommand(ws, content, {
                        wss, 
                        db: db, 
                        banPlayer: triggerUltraBan, 
                        bannedIPs, 
                        bannedPlayers, 
                        profiles: userDB, 
                        addSpectator, 
                        removeSpectator,
                        roomStates: activeRoomStates
                    });
                    if (!isHandled) {
                        ws.send(JSON.stringify({ 
                            type: 'chat', 
                            text: '❓ Unbekannter Befehl. Nutze !help oder /help für Hilfe.', 
                            system: true 
                        }));
                    }
                    return;
                }

                await db.insert(schema.messages).values({ username, content: content });
                broadcastGlobalMessage({ type: 'chat', user: username, text: content });
                return;
            }

            if (data.type === 'get_chat_history') {
                const messages = await db.select().from(schema.messages).orderBy(asc(schema.messages.created_at)).limit(30);
                ws.send(JSON.stringify({ type: 'chat_history', messages: messages || [] }));
                return;
            }

            if (data.type === 'find_random' || data.type === 'findGame') {
                if (waitingPlayer && waitingPlayer !== ws && waitingPlayer.readyState === 1) {
                    if (waitingPlayer.botTimeout) {
                        clearTimeout(waitingPlayer.botTimeout);
                        console.log("🛑 Bot-Timer gestoppt - Menschlicher Gegner gefunden!");
                    }

                    const roomID = "room_" + Math.random().toString(36).substr(2, 9);
                    ws.room = roomID;
                    waitingPlayer.room = roomID;
                    
                    activeRoomStates.set(roomID, {
                        board: null,
                        turn: 'white',
                        whitePlayer: waitingPlayer.playerName || "Spieler 1",
                        blackPlayer: ws.playerName || "Spieler 2"
                    });

                    ws.send(JSON.stringify({ 
                        type: 'gameStart', 
                        room: roomID, 
                        color: 'black', 
                        opponent: waitingPlayer.playerName || "Spieler 1" 
                    }));
                    waitingPlayer.send(JSON.stringify({ 
                        type: 'gameStart', 
                        room: roomID, 
                        color: 'white', 
                        opponent: ws.playerName || "Spieler 2" 
                    }));
                    
                    waitingPlayer = null; 
                } else {
                    waitingPlayer = ws;
                    console.log(`⏳ ${ws.playerName || "Gast"} sucht ein Spiel...`);

                    ws.botTimeout = setTimeout(() => {
                        if (waitingPlayer === ws) {
                            const roomID = "bot_room_" + Date.now();
                            const botName = ghostNames[Math.floor(Math.random() * ghostNames.length)];

                            ws.room = roomID;
                            ws.isBotMatch = true;
                            ws.opponentName = botName; 
                            waitingPlayer = null; 

                            ws.send(JSON.stringify({ 
                                type: 'gameStart', 
                                opponent: botName, 
                                isBotMatch: true, 
                                room: roomID, 
                                color: 'white' 
                            }));

                            console.log(`🤖 Bot-Match erstellt: ${botName} vs. ${ws.playerName}`);

                            setTimeout(() => {
                                if (ws.readyState === 1) {
                                    ws.send(JSON.stringify({ 
                                        type: 'chat', 
                                        text: "Gutes spiel", 
                                        sender: botName, 
                                        system: false 
                                    }));
                                }
                            }, 1000);
                        }
                    }, 5000); 
                }
                return;
            }

            if (data.type === 'resign') {
                const room = data.room || "global";
                const loser = currentName;

                const resignMsg = JSON.stringify({
                    type: 'game_over',
                    reason: 'resign',
                    loser: loser,
                    text: `🏳️ ${loser} hat das Spiel aufgegeben!`
                });

                wss.clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(resignMsg);
                    }
                });

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

                    const roomState = {
                        board: data.board,
                        turn: data.turn,
                        whitePlayer: ws.color === 'white' ? (ws.playerName || 'Weiß') : (ws.opponentName || 'Weiß'),
                        blackPlayer: ws.color === 'black' ? (ws.playerName || 'Schwarz') : (ws.opponentName || 'Schwarz')
                    };
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
                    broadcastRoomMessage(data, targetRoom, true, ws);

                    if (ws.isBotMatch) {
                        const currentBotName = ws.opponentName || "Grandmaster_Ghost";
                        setTimeout(() => {
                            if (typeof ghost !== 'undefined' && ghost && ghost.handleGhostMove) {
                                ghost.handleGhostMove(ws, data.board, 'black', currentBotName);
                            }
                        }, 700);
                    }
                    return;
                }
            }

            if (data.type === 'win') {
                const name = data.name || ws.playerName || "Anonym";
                if (!userDB[name]) {
                    userDB[name] = { level: 1, xp: 0, wins: 0 };
                }
                userDB[name].wins += 1;
                userDB[name].xp += 50;
                saveAll();
                sendLeaderboardUpdate();
            }

            if (data.type === 'game_over') {
                const targetRoom = data.room || ws.room || "global";
                generateGameVideo(targetRoom, ws);
            }

        } catch (e) {
            console.error("Fehler bei der Nachrichtenverarbeitung:", e);
        }
    });

    ws.on('close', function() {
        if (waitingPlayer === ws) {
            waitingPlayer = null;
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
        startBackupScheduler(db);
    }
    if (typeof startAutoMessages === 'function') {
        startAutoMessages(wss); 
        console.log("🤖 Info-Bot (AutoMessages) wurde gestartet.");
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
