// --- DYNAMISCHES BAN-OVERLAY & CHECK ---
function showBanOverlay(message) {
    localStorage.setItem('banned', 'true');
    localStorage.setItem('ban_message', message || 'Deine IP-Adresse oder dein Account wurden permanent gesperrt.');
    
    let overlay = document.getElementById('ban-fullscreen-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'ban-fullscreen-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.backgroundColor = 'rgba(10, 5, 5, 0.98)';
        overlay.style.color = '#ff3b30';
        overlay.style.display = 'flex';
        overlay.style.flexDirection = 'column';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.style.zIndex = '999999';
        overlay.style.fontFamily = 'system-ui, -apple-system, sans-serif';
        overlay.style.textAlign = 'center';
        overlay.style.padding = '2rem';
        overlay.style.boxSizing = 'border-box';
        
        const content = document.createElement('div');
        content.style.maxWidth = '600px';
        content.style.padding = '3rem';
        content.style.borderRadius = '16px';
        content.style.border = '2px solid #ff3b30';
        content.style.backgroundColor = '#1a0d0d';
        content.style.boxShadow = '0 0 30px rgba(255, 59, 48, 0.3)';
        content.style.animation = 'pulseGlow 2s infinite alternate';
        
        const title = document.createElement('h1');
        title.innerText = '⛔ ZUGRIFF GESPERRT';
        title.style.fontSize = '3rem';
        title.style.margin = '0 0 1.5rem 0';
        title.style.letterSpacing = '2px';
        title.style.fontWeight = '800';
        title.style.textShadow = '0 0 10px rgba(255, 59, 48, 0.5)';
        
        const desc = document.createElement('p');
        desc.id = 'ban-overlay-desc';
        desc.innerText = message || 'Deine IP-Adresse oder dein Account wurden permanent gesperrt.';
        desc.style.fontSize = '1.25rem';
        desc.style.lineHeight = '1.6';
        desc.style.color = '#f5f5f7';
        desc.style.margin = '0 0 2rem 0';
        
        const subtext = document.createElement('p');
        subtext.innerText = 'Diese Sperre ist permanent und kann nicht umgangen werden. Wende dich bei Fragen an den Administrator.';
        subtext.style.fontSize = '0.9rem';
        subtext.style.color = '#8e8e93';
        subtext.style.margin = '0';

        const checkBtn = document.createElement('button');
        checkBtn.innerText = 'Status prüfen / Aktualisieren';
        checkBtn.style.marginTop = '2rem';
        checkBtn.style.padding = '0.75rem 1.5rem';
        checkBtn.style.backgroundColor = 'transparent';
        checkBtn.style.border = '1px solid #ff3b30';
        checkBtn.style.color = '#ff3b30';
        checkBtn.style.borderRadius = '8px';
        checkBtn.style.cursor = 'pointer';
        checkBtn.style.fontWeight = 'bold';
        checkBtn.style.transition = 'all 0.3s';
        checkBtn.onmouseover = () => {
            checkBtn.style.backgroundColor = '#ff3b30';
            checkBtn.style.color = '#1a0d0d';
        };
        checkBtn.onmouseout = () => {
            checkBtn.style.backgroundColor = 'transparent';
            checkBtn.style.color = '#ff3b30';
        };
        checkBtn.onclick = () => {
            checkBtn.innerText = 'Prüfe...';
            checkBtn.disabled = true;
            
            const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
            const testSocket = new WebSocket(`${protocol}//${window.location.host}`);
            
            let wasDisconnected = false;
            testSocket.onclose = () => {
                wasDisconnected = true;
                checkBtn.innerText = 'Sperre aktiv!';
                setTimeout(() => {
                    checkBtn.innerText = 'Status prüfen / Aktualisieren';
                    checkBtn.disabled = false;
                }, 2000);
            };
            
            testSocket.onopen = () => {
                setTimeout(() => {
                    if (!wasDisconnected) {
                        localStorage.removeItem('banned');
                        localStorage.removeItem('ban_message');
                        window.location.reload();
                    }
                }, 1500);
            };
        };
        
        const style = document.createElement('style');
        style.innerHTML = `
            @keyframes pulseGlow {
                from { box-shadow: 0 0 20px rgba(255, 59, 48, 0.2); border-color: #d32f2f; }
                to { box-shadow: 0 0 40px rgba(255, 59, 48, 0.5); border-color: #ff3b30; }
            }
            body { overflow: hidden !important; }
        `;
        document.head.appendChild(style);
        
        content.appendChild(title);
        content.appendChild(desc);
        content.appendChild(subtext);
        content.appendChild(checkBtn);
        overlay.appendChild(content);
        document.body.appendChild(overlay);
    } else {
        const desc = document.getElementById('ban-overlay-desc');
        if (desc) desc.innerText = message;
    }
}

if (localStorage.getItem('banned') === 'true') {
    const savedMsg = localStorage.getItem('ban_message');
    window.addEventListener('DOMContentLoaded', () => {
        showBanOverlay(savedMsg);
    });
}

// --- GLOBALE VARIABLEN & SHIM (KÖNIG- & TEXTUR-DEFINITIONEN) ---
function findKing(turnColor) {
    if (typeof board === 'undefined' || !board || !Array.isArray(board)) return null;
    const color = turnColor || (typeof turn !== 'undefined' ? turn : "white");
    const target = color === "white" ? "K" : "k";
    for (let r = 0; r < 8; r++) {
        if (!board[r]) continue;
        for (let c = 0; c < 8; c++) {
            if (board[r][c] === target) return { r, c };
        }
    }
    return null;
}

const PIECES = {
    'P': 'https://upload.wikimedia.org/wikipedia/commons/4/45/Chess_plt45.svg', 'R': 'https://upload.wikimedia.org/wikipedia/commons/7/72/Chess_rlt45.svg',
    'N': 'https://upload.wikimedia.org/wikipedia/commons/7/70/Chess_nlt45.svg', 'B': 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Chess_blt45.svg',
    'Q': 'https://upload.wikimedia.org/wikipedia/commons/1/15/Chess_qlt45.svg', 'K': 'https://upload.wikimedia.org/wikipedia/commons/4/42/Chess_klt45.svg',
    'p': 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Chess_pdt45.svg', 'r': 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Chess_rdt45.svg',
    'n': 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Chess_ndt45.svg', 'b': 'https://upload.wikimedia.org/wikipedia/commons/9/98/Chess_bdt45.svg',
    'q': 'https://upload.wikimedia.org/wikipedia/commons/4/47/Chess_qdt45.svg', 'k': 'https://upload.wikimedia.org/wikipedia/commons/f/f0/Chess_kdt45.svg'
};

const PIECE_THEMES = {
    classic: PIECES,
    goldsilver: {
        'P': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/anarcandy/wP.svg',
        'R': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/anarcandy/wR.svg',
        'N': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/anarcandy/wN.svg',
        'B': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/anarcandy/wB.svg',
        'Q': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/anarcandy/wQ.svg',
        'K': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/anarcandy/wK.svg',
        'p': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/anarcandy/bP.svg',
        'r': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/anarcandy/bR.svg',
        'n': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/anarcandy/bN.svg',
        'b': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/anarcandy/bB.svg',
        'q': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/anarcandy/bQ.svg',
        'k': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/anarcandy/bK.svg'
    },
    neon: {
        'P': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/pirouetti/wP.svg',
        'R': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/pirouetti/wR.svg',
        'N': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/pirouetti/wN.svg',
        'B': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/pirouetti/wB.svg',
        'Q': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/pirouetti/wQ.svg',
        'K': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/pirouetti/wK.svg',
        'p': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/pirouetti/bP.svg',
        'r': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/pirouetti/bR.svg',
        'n': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/pirouetti/bN.svg',
        'b': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/pirouetti/bB.svg',
        'q': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/pirouetti/bQ.svg',
        'k': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/pirouetti/bK.svg'
    },
    vintage: {
        'P': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/caliente/wP.svg',
        'R': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/caliente/wR.svg',
        'N': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/caliente/wN.svg',
        'B': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/caliente/wB.svg',
        'Q': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/caliente/wQ.svg',
        'K': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/caliente/wK.svg',
        'p': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/caliente/bP.svg',
        'r': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/caliente/bR.svg',
        'n': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/caliente/bN.svg',
        'b': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/caliente/bB.svg',
        'q': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/caliente/bQ.svg',
        'k': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/caliente/bK.svg'
    }
};

const textures = PIECES;
const texture = PIECES;

if (typeof window !== 'undefined') {
    window.findKing = findKing;
    window.PIECES = PIECES;
    window.textures = textures;
    window.texture = texture;
}
if (typeof globalThis !== 'undefined') {
    globalThis.findKing = findKing;
    globalThis.PIECES = PIECES;
    globalThis.textures = textures;
    globalThis.texture = texture;
}
if (typeof self !== 'undefined') {
    self.findKing = findKing;
    self.PIECES = PIECES;
    self.textures = textures;
    self.texture = texture;
}

const boardEl = document.getElementById("chess-board");
const statusEl = document.getElementById("status-display");
const chatMessages = document.getElementById("chat-messages");
const chatInput = document.getElementById("chat-input");
// --- FARBWAHL LOGIK (Safe and persistent binding initialized in initCustomizationControls) ---
// Diese Funktion wird aufgerufen, wenn der Balken bei 100% ist
function onVideoReady(videoUrl, promptText) {
    const statusEl = document.getElementById("videoStatus"); // Das Textfeld unter dem Button
    const container = document.getElementById("videoResultContainer"); // Ein Container für das Ergebnis

    if (statusEl) {
        statusEl.innerHTML = "✅ Video fertig erstellt!";
    }

    if (container) {
        // Hier wird der Button erzeugt
        container.innerHTML = `
            <div class="video-success-box">
                <p>🎬 <strong>Dein Video:</strong> ${promptText}</p>
                <button onclick="playVideo('${videoUrl}')" class="play-btn">
                    ▶ JETZT ANSEHEN
                </button>
            </div>
        `;
    }
}

const gameModeSelect = document.getElementById("gameMode");
const nameInput = document.getElementById("playerName");
const passInput = document.getElementById("playerPass"); // Neu für Passwort
let illegalMoveCount = 0;
let opponentName = "Unbekannt"; // Diese Zeile neu einfügen
let onlineRoom = ""; // Hier wird sie erstellt
let myColor = "white"; // Hier wird sie erstellt
window.isTacticalPuzzleMode = false;
let lastMove = null;
let premove = null;

let whiteTime = 600;
let blackTime = 600;
let timerInterval = null;

function formatTime(secs) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (turn === 'white') {
            whiteTime--;
            if (whiteTime <= 0) { whiteTime = 0; handleTimeout('Weiß'); }
        } else {
            blackTime--;
            if (blackTime <= 0) { blackTime = 0; handleTimeout('Schwarz'); }
        }
        updateTimerUI();
    }, 1000);
}

function updateTimerUI() {
    const wtEl = document.getElementById('time-white');
    const btEl = document.getElementById('time-black');
    if (wtEl) wtEl.innerText = formatTime(whiteTime);
    if (btEl) btEl.innerText = formatTime(blackTime);

    const wClock = document.getElementById('clock-white');
    const bClock = document.getElementById('clock-black');

    if (wClock && bClock) {
        if (turn === 'white') {
            wClock.classList.add('active');
            bClock.classList.remove('active');
        } else {
            bClock.classList.add('active');
            wClock.classList.remove('active');
        }

        if (whiteTime < 60) wClock.classList.add('low-time');
        else wClock.classList.remove('low-time');
        
        if (blackTime < 60) bClock.classList.add('low-time');
        else bClock.classList.remove('low-time');
    }
}

function handleTimeout(color) {
    if (timerInterval) clearInterval(timerInterval);
    const winner = color === 'Weiß' ? 'Schwarz' : 'Weiß';
    showCheckmateModal(winner, `${color} hat keine Zeit mehr!`);
    
    const ws = window.socket || (typeof socket !== 'undefined' ? socket : null);
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'game_over', reason: 'timeout', text: `${color} hat keine Zeit mehr! ${winner} gewinnt.` }));
        if ((myColor === "white" && winner === "Weiß") || (myColor === "black" && winner === "Schwarz")) {
            const pName = getMyName();
            if (pName) {
                const moves = typeof moveHistoryLog !== 'undefined' ? moveHistoryLog.length : 0;
                const mode = gameModeSelect ? gameModeSelect.value : 'local';
                ws.send(JSON.stringify({ type: 'win', name: pName, movesCount: moves, gameMode: mode }));
            }
        }
    }
}

function showCheckmateModal(winnerName, reason = "Schachmatt!") {
    const modal = document.getElementById('checkmate-modal');
    const winnerText = document.getElementById('checkmate-winner-text');
    const title = document.querySelector('.checkmate-title');
    if (modal && winnerText && title) {
        title.innerText = reason;
        winnerText.innerText = `${winnerName} gewinnt das Spiel.`;
        modal.style.display = 'flex';
    }
}

let isGlobalLocked = false;
// FÜGE ES HIER EIN:
// 1. Einmalig beim Laden der Seite einen festen Zufallsnamen erstellen
const fixedRandomName = "Spieler_" + Math.floor(Math.random() * 10000);

function getMyName() { 
    // 1. Wenn eingeloggt, nimm den gespeicherten Namen aus dem localStorage
    const savedName = localStorage.getItem("playerName");
    if (savedName && savedName.trim() !== "") {
        return savedName.trim();
    }
    // 2. Ansonsten gib den festen Gastnamen für diese Session zurück
    return fixedRandomName; 
}

function getMyPass() { 
    return (passInput && passInput.value) || ""; 
}
let pingStart;

function startPingCheck() {
    setInterval(() => {
        // Prüfen, ob der WebSocket (socket) existiert und offen ist
        if (window.socket && window.socket.readyState === WebSocket.OPEN) {
            pingStart = performance.now(); 
            window.socket.send(JSON.stringify({ type: 'ping' }));
        } else {
            const statusEl = document.getElementById('server-status');
            if (statusEl) {
                statusEl.innerText = "Offline";
                statusEl.style.color = "red";
            }
        }
    }, 5000); // Alle 5 Sekunden prüfen
}

// Starte die Prüfung
startPingCheck();
// NEU: Wir nutzen let und warten auf die index.html
async function getIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        if (!response.ok) return "Nicht erkannt";
        const ipData = await response.json();
        return ipData.ip || "Nicht erkannt";
    } catch(e) {
        return "Nicht erkannt";
    }
}

// --- 1. KONFIGURATION ---
// Variable für DEINEN Bot -> nutzt DEINE Datei
let myEngineWorker = new Worker('engineWorker.js'); 

// Variable für STOCKFISH -> nutzt die NEUE Datei mit Cache-Buster, um alte fehlerhafte Versionen zu umgehen
let stockfishWorker = new Worker('stockfishWorker.js?v=10.0.2');
stockfishWorker.postMessage('uci');
stockfishWorker.postMessage('setoption name Skill Level value 20');
stockfishWorker.postMessage('setoption name Hash value 32');
stockfishWorker.postMessage('isready');
const RENDER_SERVER = 'mein-schach2.onrender.com';
const isGitHubPages = typeof window !== 'undefined' && window.location.hostname.includes('github.io');

const wsProtocol = (typeof window !== 'undefined' && (window.location.protocol === 'https:' || isGitHubPages)) ? 'wss:' : 'ws:';
const wsHost = isGitHubPages ? RENDER_SERVER : (typeof window !== 'undefined' ? window.location.host : RENDER_SERVER);
const apiBase = isGitHubPages ? `https://${RENDER_SERVER}` : '';

const socket = new WebSocket(`${wsProtocol}//${wsHost}`);
window.socket = socket;
window.apiBase = apiBase;
let isSpectatorMode = false;

const sounds = {
    move: new Audio('https://images.chesscomfiles.com/chess-themes/pieces/neo/sounds/move-self.mp3'),
    cap: new Audio('https://images.chesscomfiles.com/chess-themes/pieces/neo/sounds/capture.mp3'),
    check: new Audio('https://images.chesscomfiles.com/chess-themes/pieces/neo/sounds/move-check.mp3')
};

let board, turn = "white", selected = null, history = [];
let moveHistoryLog = [];

// --- SPEZIALZUG VARIABLEN ---
let hasMoved = {
    whiteK: false, whiteR1: false, whiteR8: false,
    blackK: false, blackR1: false, blackR8: false
};
let enPassantTarget = null; 

// --- REMIS-VARIABLEN ---
let halfMoveClock = 0; // Für die 50-Züge-Regel
let positionHistory = {}; // Für die 3-fache Wiederholung

// --- SCHACH REGELN & HILFSFUNKTIONEN ---
function isOwn(p, turnColor) {
    if (!p) return false;
    return turnColor === "white" ? p === p.toUpperCase() : p === p.toLowerCase();
}
window.isOwn = isOwn;

function isPathClear(fr, fc, tr, tc) {
    const dr = Math.sign(tr - fr);
    const dc = Math.sign(tc - fc);
    let r = fr + dr;
    let c = fc + dc;
    while (r !== tr || c !== tc) {
        if (board[r][c] !== "") return false;
        r += dr;
        c += dc;
    }
    return true;
}

function isAttacked(tr, tc, attackerColor) {
    if (!board) return false;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const p = board[r][c];
            if (p && isOwn(p, attackerColor)) {
                const dr = tr - r;
                const dc = tc - c;
                const ar = Math.abs(dr);
                const ac = Math.abs(dc);
                const type = p.toLowerCase();
                let canAttack = false;
                if (type === 'p') {
                    const dir = p === 'P' ? -1 : 1;
                    if (ac === 1 && dr === dir) canAttack = true;
                } else if (type === 'r') {
                    if ((r === tr || c === tc) && isPathClear(r, c, tr, tc)) canAttack = true;
                } else if (type === 'b') {
                    if (ar === ac && isPathClear(r, c, tr, tc)) canAttack = true;
                } else if (type === 'q') {
                    if ((r === tr || c === tc || ar === ac) && isPathClear(r, c, tr, tc)) canAttack = true;
                } else if (type === 'n') {
                    if ((ar === 2 && ac === 1) || (ar === 1 && ac === 2)) canAttack = true;
                } else if (type === 'k') {
                    if (ar <= 1 && ac <= 1) canAttack = true;
                }
                if (canAttack) return true;
            }
        }
    }
    return false;
}

function canMoveLogic(fr, fc, tr, tc) {
    if (!board) return false;
    const p = board[fr][fc];
    const t = board[tr][tc];
    if (t && isOwn(t, turn)) return false;
    const dr = tr - fr;
    const dc = tc - fc;
    const ar = Math.abs(dr);
    const ac = Math.abs(dc);
    const type = p.toLowerCase();
    
    if (type === 'p') {
        const dir = p === 'P' ? -1 : 1;
        if (dc === 0 && dr === dir && !t) return true;
        if (dc === 0 && dr === 2 * dir && !t && board[fr + dir][fc] === "" && (p === 'P' ? fr === 6 : fr === 1)) return true;
        if (ac === 1 && dr === dir && t) return true;
        if (ac === 1 && dr === dir && !t && enPassantTarget && enPassantTarget.r === tr && enPassantTarget.c === tc) return true;
        return false;
    }
    if (type === 'r') return (fr === tr || fc === tc) && isPathClear(fr, fc, tr, tc);
    if (type === 'b') return ar === ac && isPathClear(fr, fc, tr, tc);
    if (type === 'q') return (fr === tr || fc === tc || ar === ac) && isPathClear(fr, fc, tr, tc);
    if (type === 'n') return (ar === 2 && ac === 1) || (ar === 1 && ac === 2);
    if (type === 'k') {
        if (ar <= 1 && ac <= 1) return true;
        if (dr === 0 && ac === 2) {
            const opponentColor = turn === "white" ? "black" : "white";
            if (isAttacked(fr, fc, opponentColor)) return false;
            if (tc === 6) {
                if (board[fr][5] === "" && board[fr][6] === "" &&
                    !isAttacked(fr, 5, opponentColor) &&
                    !isAttacked(fr, 6, opponentColor)) {
                    return turn === "white" ? (!hasMoved.whiteK && !hasMoved.whiteR8) : (!hasMoved.blackK && !hasMoved.blackR8);
                }
            }
            if (tc === 2) {
                if (board[fr][1] === "" && board[fr][2] === "" && board[fr][3] === "" &&
                    !isAttacked(fr, 3, opponentColor) &&
                    !isAttacked(fr, 2, opponentColor)) {
                    return turn === "white" ? (!hasMoved.whiteK && !hasMoved.whiteR1) : (!hasMoved.blackK && !hasMoved.blackR1);
                }
            }
        }
        return false;
    }
    return false;
}

function isCheckmate(color) {
    const k = typeof findKing === 'function' ? findKing(color) : (window.findKing ? window.findKing(color) : null);
    if (!k || !isAttacked(k.r, k.c, color === "white" ? "black" : "white")) return false;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (board[r][c] && isOwn(board[r][c], color)) {
                for (let tr = 0; tr < 8; tr++) {
                    for (let tc = 0; tc < 8; tc++) {
                        if (canMoveLogic(r, c, tr, tc) && isSafeMove(r, c, tr, tc)) {
                            return false;
                        }
                    }
                }
            }
        }
    }
    return true;
}

function isSafeMove(fr, fc, tr, tc) {
    if (!board) return false;
    const backupPiece = board[tr][tc];
    const piece = board[fr][fc];
    board[tr][tc] = piece;
    board[fr][fc] = "";
    
    const k = typeof findKing === 'function' ? findKing(turn) : (window.findKing ? window.findKing(turn) : null);
    const opponent = turn === "white" ? "black" : "white";
    const safe = k ? !isAttacked(k.r, k.c, opponent) : true;
    
    board[fr][fc] = piece;
    board[tr][tc] = backupPiece;
    return safe;
}

let isAnimating = false;

function doMove(fr, fc, tr, tc, broadcast = true) {
    if (!board || fr === undefined || fc === undefined || tr === undefined || tc === undefined) return;
    const piece = board[fr][fc];
    if (!piece) return;
    
    // 1. Visuelle Animation auf dem aktuellen DOM starten
    const currentBoardEl = document.getElementById("chess-board") || boardEl;
    let animationDuration = 0;
    
    if (currentBoardEl && currentBoardEl.children.length >= 64) {
        // Squares are indexed by r * 8 + c
        const startSq = currentBoardEl.children[fr * 8 + fc];
        const destSq = currentBoardEl.children[tr * 8 + tc];
        const img = startSq ? startSq.querySelector("img") : null;
        
        if (img && destSq) {
            isAnimating = true;
            animationDuration = 280; // Dauer der Animation in ms
            
            const startRect = startSq.getBoundingClientRect();
            const destRect = destSq.getBoundingClientRect();
            const dx = destRect.left - startRect.left;
            const dy = destRect.top - startRect.top;
            
            // Geschlagene Figur im Zielfeld ausblenden und schrumpfen
            const destImg = destSq.querySelector("img");
            if (destImg) {
                destImg.style.transition = "all 200ms ease-out";
                destImg.style.transform = "scale(0)";
                destImg.style.opacity = "0";
            }
            
            // En-Passant geschlagenen Bauern ausblenden
            if (piece.toLowerCase() === 'p' && enPassantTarget && tr === enPassantTarget.r && tc === enPassantTarget.c) {
                const epSq = currentBoardEl.children[fr * 8 + tc];
                const epImg = epSq ? epSq.querySelector("img") : null;
                if (epImg) {
                    epImg.style.transition = "all 200ms ease-out";
                    epImg.style.transform = "scale(0)";
                    epImg.style.opacity = "0";
                }
            }
            
            // Rochade Turm Animation
            if (piece.toLowerCase() === 'k' && Math.abs(tc - fc) === 2) {
                if (tc === 6) { // Königseite
                    const rookSq = currentBoardEl.children[fr * 8 + 7];
                    const targetRookSq = currentBoardEl.children[fr * 8 + 5];
                    const rImg = rookSq ? rookSq.querySelector("img") : null;
                    if (rImg && targetRookSq) {
                        const rStartRect = rookSq.getBoundingClientRect();
                        const rDestRect = targetRookSq.getBoundingClientRect();
                        const rDx = rDestRect.left - rStartRect.left;
                        rImg.style.transition = "transform 280ms cubic-bezier(0.25, 1, 0.5, 1)";
                        rImg.style.transform = `translate(${rDx}px, 0px)`;
                    }
                } else if (tc === 2) { // Damenseite
                    const rookSq = currentBoardEl.children[fr * 8 + 0];
                    const targetRookSq = currentBoardEl.children[fr * 8 + 3];
                    const rImg = rookSq ? rookSq.querySelector("img") : null;
                    if (rImg && targetRookSq) {
                        const rStartRect = rookSq.getBoundingClientRect();
                        const rDestRect = targetRookSq.getBoundingClientRect();
                        const rDx = rDestRect.left - rStartRect.left;
                        rImg.style.transition = "transform 280ms cubic-bezier(0.25, 1, 0.5, 1)";
                        rImg.style.transform = `translate(${rDx}px, 0px)`;
                    }
                }
            }
            
            // Figur gleiten lassen
            img.style.zIndex = "150";
            img.style.transition = "transform 280ms cubic-bezier(0.25, 1, 0.5, 1)";
            img.style.transform = `translate(${dx}px, ${dy}px)`;
        }
    }
    
    // 2. Zustand nach Abschluss der Animation aktualisieren
    setTimeout(() => {
        isAnimating = false;
        const isCapture = board[tr][tc] !== "";
        
        history.push({
            board: board.map(r => [...r]),
            turn,
            hasMoved: { ...hasMoved },
            enPassantTarget,
            halfMoveClock
        });

        if (piece.toLowerCase() === 'p' && enPassantTarget && tr === enPassantTarget.r && tc === enPassantTarget.c) {
            board[fr][tc] = "";
        }

        if (piece.toLowerCase() === 'p' && Math.abs(tr - fr) === 2) {
            enPassantTarget = { r: (fr + tr) / 2, c: fc };
        } else {
            enPassantTarget = null;
        }

        if (piece.toLowerCase() === 'k' && Math.abs(tc - fc) === 2) {
            if (tc === 6) {
                board[fr][5] = board[fr][7];
                board[fr][7] = "";
            } else if (tc === 2) {
                board[fr][3] = board[fr][0];
                board[fr][0] = "";
            }
        }

        if (fr === 7 && fc === 4) hasMoved.whiteK = true;
        if (fr === 7 && fc === 0) hasMoved.whiteR1 = true;
        if (fr === 7 && fc === 7) hasMoved.whiteR8 = true;
        if (fr === 0 && fc === 4) hasMoved.blackK = true;
        if (fr === 0 && fc === 0) hasMoved.blackR1 = true;
        if (fr === 0 && fc === 7) hasMoved.blackR8 = true;

        board[tr][tc] = piece;
        board[fr][fc] = "";
        lastMove = { fr, fc, tr, tc };

        // --- DAILY TACTICAL PUZZLE CHECKER ---
        if (window.isTacticalPuzzleMode && window.activePuzzle) {
            const ap = window.activePuzzle;
            if (fr === ap.solution.fr && fc === ap.solution.fc && tr === ap.solution.tr && tc === ap.solution.tc) {
                document.getElementById("puzzle-status").innerText = "🎉 RICHTIG! Berechne Belohnung...";
                document.getElementById("puzzle-status").style.color = "#2ecc71";
                if (typeof triggerGoldDustCelebration === 'function') {
                    triggerGoldDustCelebration();
                }
                if (socket && socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({ type: 'solve_puzzle', playerName: getMyName() }));
                }
                window.activePuzzle = null;
            } else {
                document.getElementById("puzzle-status").innerText = "❌ Falscher Zug! Versuche es noch einmal.";
                document.getElementById("puzzle-status").style.color = "#e74c3c";
                setTimeout(() => {
                    if (typeof loadFEN === 'function') {
                        loadFEN(ap.fen);
                    }
                }, 800);
                draw();
                return;
            }
        }

        try {
            if (isCapture && sounds && sounds.cap) sounds.cap.play().catch(()=>{});
            else if (sounds && sounds.move) sounds.move.play().catch(()=>{});
        } catch(e) {}

        sendeAnAnalyse(fr, fc, tr, tc, piece, isCapture);
        addMoveToSidebar(fr, fc, tr, tc, piece, isCapture);

        turn = turn === "white" ? "black" : "white";

        if (statusEl) statusEl.textContent = (turn === "white" ? "Weiß" : "Schwarz") + " am Zug";
        
        updateTimerUI();

        if (broadcast && socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                type: 'move',
                room: onlineRoom,
                fr, fc, tr, tc,
                piece,
                turn,
                fen: typeof boardToFEN === 'function' ? boardToFEN() : ""
            }));
        }

        draw();

        const k = typeof findKing === 'function' ? findKing(turn) : (window.findKing ? window.findKing(turn) : null);
        if (k && isAttacked(k.r, k.c, turn === "white" ? "black" : "white")) {
            try { if (sounds && sounds.check) sounds.check.play().catch(()=>{}); } catch(e) {}
            if (statusEl) statusEl.textContent = (turn === "white" ? "Weiß" : "Schwarz") + " steht im SCHACH!";
        }
        
        if (isCheckmate(turn)) {
            if (timerInterval) clearInterval(timerInterval);
            const winner = turn === "white" ? "Schwarz" : "Weiß";
            showCheckmateModal(winner, "Schachmatt!");
            if (typeof triggerGoldDustCelebration === 'function') {
                triggerGoldDustCelebration();
            }
            if (broadcast && socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ type: 'game_over', reason: 'checkmate', text: `Schachmatt! ${winner} gewinnt.` }));
                if ((myColor === "white" && winner === "Weiß") || (myColor === "black" && winner === "Schwarz")) {
                    const pName = getMyName();
                    if (pName) {
                        const moves = typeof moveHistoryLog !== 'undefined' ? moveHistoryLog.length : 0;
                        const mode = gameModeSelect ? gameModeSelect.value : 'local';
                        socket.send(JSON.stringify({ type: 'win', name: pName, movesCount: moves, gameMode: mode }));
                    }
                }
            }
        }

        if (gameModeSelect) {
            if (gameModeSelect.value === "bot" && turn === "black") {
                myEngineWorker.postMessage({ board, turn, fen: boardToFEN() });
            } else if (gameModeSelect.value === "stockfish" && turn === "black") {
                const fen = typeof boardToFEN === 'function' ? boardToFEN() : "";
                if (fen) {
                    stockfishWorker.postMessage(`position fen ${fen}`);
                    stockfishWorker.postMessage("go depth 15");
                }
            }
        }

        if (premove && turn === myColor) {
            const pm = premove;
            premove = null;
            if (board[pm.fr][pm.fc] && isOwn(board[pm.fr][pm.fc], turn) && canMoveLogic(pm.fr, pm.fc, pm.tr, pm.tc) && isSafeMove(pm.fr, pm.fc, pm.tr, pm.tc)) {
                setTimeout(() => doMove(pm.fr, pm.fc, pm.tr, pm.tc), 200);
            }
        }
    }, animationDuration);
}

function resetGame() {
    window.isTacticalPuzzleMode = false;
    const resetPuzzleBtn = document.getElementById("resetPuzzleBtn");
    if (resetPuzzleBtn) resetPuzzleBtn.style.display = "none";
    const puzzleStatus = document.getElementById("puzzle-status");
    if (puzzleStatus) puzzleStatus.innerText = "";
    board = [
        ['r','n','b','q','k','b','n','r'],
        ['p','p','p','p','p','p','p','p'],
        ['','','','','','','',''],
        ['','','','','','','',''],
        ['','','','','','','',''],
        ['','','','','','','',''],
        ['P','P','P','P','P','P','P','P'],
        ['R','N','B','Q','K','B','N','R']
    ];
    turn = "white";
    selected = null;
    history = [];
    hasMoved = {
        whiteK: false, whiteR1: false, whiteR8: false,
        blackK: false, blackR1: false, blackR8: false
    };
    enPassantTarget = null;
    halfMoveClock = 0;
    positionHistory = {};
    lastMove = null;
    premove = null;
    
    whiteTime = 600;
    blackTime = 600;
    updateTimerUI();
    startTimer();

    moveHistoryLog = [];
    const listEl = document.getElementById('move-history-list');
    if (listEl) listEl.innerHTML = '';

    if (typeof statusEl !== 'undefined' && statusEl) statusEl.textContent = "Weiß am Zug";
    if (typeof draw === "function") draw();
}
window.resetGame = resetGame;

function makeMove(fromSquare, toSquare) {
    if (!fromSquare || !toSquare || fromSquare.length < 2 || toSquare.length < 2) return;
    const fc = fromSquare.charCodeAt(0) - 97;
    const fr = 8 - parseInt(fromSquare[1]);
    const tc = toSquare.charCodeAt(0) - 97;
    const tr = 8 - parseInt(toSquare[1]);
    if (typeof doMove === 'function') {
        doMove(fr, fc, tr, tc);
    }
}
window.makeMove = makeMove;

// --- NEU: FEN-GENERATOR ---
function boardToFEN() {
    let fen = "";
    for (let r = 0; r < 8; r++) {
        let empty = 0;
        for (let c = 0; c < 8; c++) {
            let p = board[r][c];
            if (p === "") {
                empty++;
            } else {
                if (empty > 0) { fen += empty; empty = 0; }
                fen += p;
            }
        }
        if (empty > 0) fen += empty;
        if (r < 7) fen += "/";
    }
    fen += ` ${turn === "white" ? "w" : "b"} `;
    let castling = "";
    if (!hasMoved.whiteK) {
        if (!hasMoved.whiteR8) castling += "K";
        if (!hasMoved.whiteR1) castling += "Q";
    }
    if (!hasMoved.blackK) {
        if (!hasMoved.blackR8) castling += "k";
        if (!hasMoved.blackR1) castling += "q";
    }
    fen += (castling || "-") + " - 0 1";
    return fen;
}

// --- 🐍 PYTHON ANALYSE SCHNITTSTELLE (Optimiert für Ultra-Stats) ---
async function sendeAnAnalyse(fr, fc, tr, tc, figur, istSchlag) {
    // Umwandlung in Schach-Notation (z.B. e2, e4)
    const von = String.fromCharCode(97 + fc) + (8 - fr);
    const nach = String.fromCharCode(97 + tc) + (8 - tr);
    
    const zugDaten = {
        spieler: getMyName(),
        von: von,
        nach: nach,
        figur: figur,
        wert: 100, 
        ist_schlagzug: istSchlag
    };

    try {
        // Ruf an deinen lokalen Express-Server
        const response = await fetch(`${apiBase}/analyse`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(zugDaten)
        });

        if (!response.ok) throw new Error("Server antwortet nicht korrekt");

        const ergebnis = await response.json();

        // UI AKTUALISIERUNG (Dashboard-Style) - ANGEPASST AN NEUEN PYTHON CODE
        const eloDisp = document.getElementById("elo-display");
        
        const perf = ergebnis.Basis_Werte || ergebnis.Performance_Metriken || {};
        const pos = ergebnis.Positions_Analyse || {};
        const aggro = ergebnis.Aggressivitäts_Index || {};

        if (eloDisp) {
            const eloVal = perf["Geschätzte_Elo"] || perf["Elo"] || 1200;
            const rangVal = perf["Rang"] || "Spieler";
            const accuracyVal = perf["Genauigkeit"] || 75;
            const classVal = perf["Klassifizierung"] || "Guter Zug";
            const zentrumVal = pos["Zentrum"] || "Solide";
            const devVal = pos["Entwicklung"] || "Normal";
            const materialVal = pos["Material_Vorteil"] || "0";
            const bestMoveVal = pos["Bester_Zug"] || "-";
            const aggroVal = aggro["Gesamt"] || 50;
            const aggroLevel = aggro["Level"] || "Normal";
            const explanation = ergebnis.Erklaerung || "Ein solider Zug im Partie-Verlauf.";

            eloDisp.innerHTML = `
                <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 12px; border-left: 5px solid #2ecc71; box-shadow: 0 4px 20px rgba(0,0,0,0.4); font-family: sans-serif;">
                    <div style="font-size: 0.8em; color: #95a5a6; letter-spacing: 1.5px; font-weight: bold; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between;">
                        <span>🐍 KI-ANALYSE (PYTHON-LABOR)</span>
                        <span style="background: #2196f3; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.8em;">ONLINE</span>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
                        <div>
                            <div style="font-size: 0.8em; color: #bdc3c7;">Geschätzte Elo:</div>
                            <div style="font-size: 1.4em; font-weight: bold; color: #f1c40f;">${eloVal} <span style="font-size: 0.6em; color: #fff; background: #e67e22; padding: 1px 4px; border-radius: 3px; font-weight: normal; margin-left: 3px;">${rangVal}</span></div>
                        </div>
                        <div>
                            <div style="font-size: 0.8em; color: #bdc3c7;">Genauigkeit:</div>
                            <div style="font-size: 1.4em; font-weight: bold; color: #2ecc71;">${accuracyVal}%</div>
                        </div>
                    </div>

                    <div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px; margin-bottom: 12px; border-left: 3px solid #e74c3c;">
                        <div style="font-size: 0.85em; font-weight: bold; color: #fff; display: flex; justify-content: space-between;">
                            <span>Letzter Zug: <span style="color: #3498db;">${von}-${nach}</span></span>
                            <span style="color: #f1c40f;">${classVal}</span>
                        </div>
                        <div style="font-size: 0.85em; color: #ecf0f1; margin-top: 4px; line-height: 1.4;">${explanation}</div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.85em; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px;">
                        <div>💥 Aggro: <b style="color: #e74c3c;">${aggroVal}% (${aggroLevel})</b></div>
                        <div>🏰 Zentrum: <b style="color: #f1c40f;">${zentrumVal}</b></div>
                        <div>🚀 Entwicklung: <b style="color: #3498db;">${devVal}</b></div>
                        <div>⚖️ Material: <b style="color: #2ecc71;">${materialVal}</b></div>
                        <div style="grid-column: span 2; border-top: 1px dashed rgba(255,255,255,0.05); padding-top: 5px; margin-top: 5px;">
                            💡 Empfohlener Zug: <b style="color: #2ecc71; font-family: monospace; font-size: 1.1em;">${bestMoveVal}</b>
                        </div>
                    </div>
                </div>
            `;
        }
        
        console.log("🐍 Labor-Update erfolgreich:", ergebnis);

    } catch (e) {
        console.error("Python-API Fehler:", e);
        const eloDisp = document.getElementById("elo-display");
        if(eloDisp) eloDisp.innerHTML = `<div style="color: #e67e22; font-size: 0.8em;">🐍 Labor berechnet... (Server-Wakeup)</div>`;
    }
}

function getAlgebraicNotation(fr, fc, tr, tc, piece, isCapture) {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
    
    let pChar = '';
    const type = piece.toLowerCase();
    if (type === 'k') pChar = 'K';
    else if (type === 'q') pChar = 'D'; // Dame (D)
    else if (type === 'r') pChar = 'T'; // Turm (T)
    else if (type === 'b') pChar = 'L'; // Läufer (L)
    else if (type === 'n') pChar = 'S'; // Springer (S)
    
    const toSquare = files[tc] + ranks[tr];
    
    if (type === 'p') {
        if (isCapture) {
            const fromFile = files[fc];
            return fromFile + 'x' + toSquare;
        } else {
            return toSquare;
        }
    } else {
        // Check for castling
        if (type === 'k' && Math.abs(tc - fc) === 2) {
            if (tc === 6) return "O-O";
            if (tc === 2) return "O-O-O";
        }
        return pChar + (isCapture ? 'x' : '') + toSquare;
    }
}

function addMoveToSidebar(fr, fc, tr, tc, piece, isCapture) {
    const notation = getAlgebraicNotation(fr, fc, tr, tc, piece, isCapture);
    moveHistoryLog.push(notation);
    
    const listEl = document.getElementById('move-history-list');
    if (listEl) {
        listEl.innerHTML = '';
        let rowHtml = '';
        for (let i = 0; i < moveHistoryLog.length; i += 2) {
            const moveNum = Math.floor(i / 2) + 1;
            const whiteMove = moveHistoryLog[i];
            const blackMove = moveHistoryLog[i + 1] || '';
            rowHtml += `
                <div style="display: flex; justify-content: space-between; padding: 4px 8px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <span style="color: #7f8fa6; width: 30px;">${moveNum}.</span>
                    <span style="color: #f1c40f; flex-grow: 1; font-weight: bold; text-align: left;">${whiteMove}</span>
                    <span style="color: #ecf0f1; flex-grow: 1; text-align: left;">${blackMove}</span>
                </div>
            `;
        }
        listEl.innerHTML = rowHtml;
        listEl.scrollTop = listEl.scrollHeight;
    }
}
// --- 2. CHAT & SYSTEM ---
function addChat(sender, text, type) {
    const m = document.createElement("div");
    m.className = type === "system" ? "msg system-msg" : `msg ${type === 'me' ? 'my-msg' : 'other-msg'}`;

    if (type === "system") {
        m.textContent = "⚙️ " + text;
    } else {
        const strong = document.createElement("strong");
        strong.textContent = sender + ": ";
        m.appendChild(strong);

        const span = document.createElement("span");
        span.textContent = text;
        m.appendChild(span);
    }

    const container = document.getElementById("chat-messages") || chatMessages;
    if (container) {
        container.appendChild(m);
        container.scrollTop = container.scrollHeight;
    }
}
window.addChat = addChat;

document.querySelectorAll('.emoji-btn').forEach(b => {
    b.onclick = () => {
        const inp = document.getElementById("chat-input") || chatInput;
        if (inp) { inp.value += b.textContent; inp.focus(); }
    };
});

function sendMsg() {
    const inp = document.getElementById("chat-input") || chatInput;
    if (!inp) return;
    const t = inp.value.trim();
    if (t && socket && socket.readyState === WebSocket.OPEN) {
        if (typeof isSpectatorMode !== 'undefined' && isSpectatorMode) {
            socket.send(JSON.stringify({
                type: 'spectate_chat',
                room: onlineRoom,
                username: getMyName(),
                text: t
            }));
        } else {
            socket.send(JSON.stringify({ 
                type: 'chat_message', 
                username: getMyName(),
                content: t,
                text: t
            }));
        }
        inp.value = "";
    }
}
window.sendMsg = sendMsg;

window.addEventListener('DOMContentLoaded', () => {
    const sendChatBtn = document.getElementById("send-chat");
    if (sendChatBtn) sendChatBtn.onclick = sendMsg;
    const inp = document.getElementById("chat-input");
    if (inp) inp.onkeydown = (e) => { 
        if(e.key === "Enter") {
            e.preventDefault();
            e.stopPropagation();
            sendMsg(); 
        }
    };

    const connectMPBtn = document.getElementById("connectMP");
    if (connectMPBtn) {
        connectMPBtn.onclick = () => {
            const roomInput = document.getElementById("roomID");
            const roomId = roomInput ? roomInput.value.trim() : "";
            if (roomId) {
                onlineRoom = roomId;
                if (socket && socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({
                        type: 'find_random',
                        room: roomId,
                        playerName: getMyName()
                    }));
                }
                addChat("System", "Raum '" + roomId + "' beigetreten.", "system");
            } else {
                alert("Bitte eine Raum-ID eingeben.");
            }
        };
    }

    if (gameModeSelect) {
        gameModeSelect.onchange = () => {
            window.isTacticalPuzzleMode = false;
            const resetPuzzleBtn = document.getElementById("resetPuzzleBtn");
            if (resetPuzzleBtn) resetPuzzleBtn.style.display = "none";
            const puzzleStatus = document.getElementById("puzzle-status");
            if (puzzleStatus) puzzleStatus.innerText = "";
            const mode = gameModeSelect.value;
            if (mode === "random") {
                if (socket && socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({ type: 'find_random', playerName: getMyName() }));
                    addChat("System", "Suche nach einem zufälligen Gegner...", "system");
                } else {
                    addChat("System", "Nicht mit dem Server verbunden.", "system");
                }
            } else if (mode === "online") {
                const roomInput = document.getElementById("roomID");
                if (roomInput && roomInput.value.trim()) {
                    onlineRoom = roomInput.value.trim();
                }
            } else {
                resetGame();
            }
        };
    }
});

function loadChatHistory() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'get_chat_history' }));
    }
} 

socket.onmessage = (e) => {
    try {
        const data = JSON.parse(e.data);
        if (data.type === 'pong') {
            const pingEl = document.getElementById('ping-display');
            if (pingEl && typeof pingStart !== 'undefined') {
                const ms = Math.round(performance.now() - pingStart);
                pingEl.innerText = `${ms} ms`;
            }
            const statusEl = document.getElementById('server-status');
            if (statusEl) {
                statusEl.innerText = "Online";
                statusEl.style.color = "#00ff00";
            }
            return;
        }
        if (data.type === 'gameStart') {
            if (data.room) onlineRoom = data.room;
            if (data.color) myColor = data.color;
            if (data.opponent) opponentName = data.opponent;
            if (gameModeSelect) gameModeSelect.value = "online";
            resetGame();
            const statusEl = document.getElementById('status-display');
            if (statusEl) {
                statusEl.textContent = "Online gegen " + (opponentName || "Gegner") + " (" + (myColor === "white" ? "Weiß" : "Schwarz") + ")";
            }
            addChat("System", "🎮 Spiel gestartet gegen " + (opponentName || "Gegner") + "! Du bist " + (myColor === "white" ? "Weiß" : "Schwarz") + ".", "system");
            return;
        }
        if (data.type === 'game_over') {
            const statusEl = document.getElementById('status-display');
            if (statusEl && data.text) statusEl.textContent = data.text;
            addChat("System", data.text || "Spiel beendet.", "system");
            showCheckmateModal("Gegner", data.text || "Spiel beendet!");
            if (timerInterval) clearInterval(timerInterval);
            return;
        }
        if (data.type === 'chat') {
            if (data.system) {
                addChat("System", data.text, "system");
            } else {
                const u = data.user || data.sender || data.name || data.playerName || "Anonym";
                const isMe = u === getMyName();
                addChat(u, data.text, isMe ? "me" : "other");
            }
            return;
        }
        if (data.type === 'emote') {
            if (data.sender !== getMyName() && window.showEmoteOnBoard) {
                window.showEmoteOnBoard(data.emote, false);
            }
            return;
        }
        if (data.type === 'voice_signal') {
            if (window.handleVoiceSignal) window.handleVoiceSignal(data);
            return;
        }
        if (data.type === 'friends_list') {
            if (window.updateFriendsList) window.updateFriendsList(data.friends);
            return;
        }
        if (data.type === 'match_history') {
            if (window.updateMatchHistory) window.updateMatchHistory(data.games);
            return;
        }
        
        if (data.type === 'chat_history') {
            if (Array.isArray(data.messages)) {
                data.messages.forEach(msg => {
                    if (msg.system) {
                        addChat("System", msg.text, "system");
                    } else {
                        const u = msg.username || msg.user || msg.sender || msg.name || "Anonym";
                        const isMe = u === getMyName();
                        addChat(u, msg.content || msg.text || "", isMe ? "me" : "other");
                    }
                });
            }
            return;
        }
        if (data.type === 'system_alert') {
            addChat("SYSTEM ALERT", data.message, "system");
            if (typeof showBanOverlay === 'function') {
                showBanOverlay(data.message);
            } else {
                alert(data.message);
            }
            return;
        }
        if (data.type === 'login_success') {
            const statusBox = document.getElementById('save-status');
            if (statusBox) statusBox.innerHTML = "<span style='color: #00ff00;'>✅ Angemeldet als " + data.name + "</span>";
            if (data.name) {
                const pInput = document.getElementById('playerName');
                if (pInput) pInput.value = data.name;
                localStorage.setItem("playerName", data.name);
                const tempPw = localStorage.getItem('tempPasswordHash');
                if (tempPw) {
                    localStorage.setItem('playerPasswordHash', tempPw);
                    localStorage.removeItem('tempPasswordHash');
                }
                
                // Profile display update
                const profileName = document.getElementById('profile-name');
                const profileStats = document.getElementById('profile-stats');
                if (profileName) profileName.innerText = data.name;
                if (profileStats) profileStats.innerText = `Elo: ${data.elo || 1200} | Siege: ${data.wins || 0}`;
                
                const authBtn = document.getElementById('openAuthBtn');
                if (authBtn) {
                    authBtn.style.display = 'none';
                }
                
                const modal = document.getElementById('auth-modal');
                if (modal) {
                    modal.style.display = 'none';
                }
            }
            return;
        }
        if (data.type === 'daily_puzzle') {
            const p = data.puzzle;
            window.activePuzzle = p;
            
            document.getElementById("puzzle-title").innerText = p.title;
            document.getElementById("puzzle-desc").innerText = p.description + " (Deine Farbe: " + (p.color === "white" ? "Weiß" : "Schwarz") + ")";
            
            const statusEl = document.getElementById("puzzle-status");
            if (data.alreadySolved) {
                statusEl.innerText = "✅ Heute bereits gelöst!";
                statusEl.style.color = "#2ecc71";
                document.getElementById("loadPuzzleBtn").innerText = "Geklärt (Heute gelöst)";
                document.getElementById("loadPuzzleBtn").disabled = true;
                document.getElementById("loadPuzzleBtn").style.opacity = "0.6";
            } else {
                statusEl.innerText = "Bereit zum Lösen!";
                statusEl.style.color = "#f1c40f";
                document.getElementById("loadPuzzleBtn").innerText = "Rätsel starten";
                document.getElementById("loadPuzzleBtn").disabled = false;
                document.getElementById("loadPuzzleBtn").style.opacity = "1";
            }
            return;
        }
        
        if (data.type === 'puzzle_success') {
            const statusEl = document.getElementById("puzzle-status");
            statusEl.innerText = data.text;
            statusEl.style.color = "#2ecc71";
            alert(data.text);
            
            // Re-fetch puzzle state to update solved indicator
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ type: 'get_daily_puzzle' }));
            }
            return;
        }

        if (data.type === 'puzzle_info') {
            const statusEl = document.getElementById("puzzle-status");
            statusEl.innerText = data.text;
            statusEl.style.color = "#f1c40f";
            alert(data.text);
            return;
        }

        if (data.type === 'login_error') {
            const statusBox = document.getElementById('save-status');
            if (statusBox) statusBox.innerHTML = "<span style='color: #ff4444;'>❌ " + (data.text || "Login fehlgeschlagen") + "</span>";
            if (data.text && (data.text.includes('gesperrt') || data.text.includes('gebannt') || data.text.includes('Sperre'))) {
                if (typeof showBanOverlay === 'function') {
                    showBanOverlay(data.text);
                }
            }
            return;
        }
        if (data.type === 'move') {
            if (data.fr !== undefined && data.fc !== undefined && data.tr !== undefined && data.tc !== undefined) {
                doMove(data.fr, data.fc, data.tr, data.tc, false);
            }
            return;
        }
        if (data.type === 'leaderboard') {
            const listEl = document.getElementById('leaderboard-list');
            if (listEl && Array.isArray(data.list)) {
                listEl.innerHTML = data.list.map((item, idx) => `<div>${idx + 1}. ${item.username || item.name} - ${item.elo || 1200} ELO</div>`).join('');
            }
            return;
        }
        if (data.type === 'active_games_list') {
            const listEl = document.getElementById('spectator-games-list');
            if (listEl) {
                if (!data.games || data.games.length === 0) {
                    listEl.innerHTML = `<div style="color: #aaa; font-style: italic; text-align: center; font-size: 0.85em; padding: 10px 0;">Keine laufenden Online-Spiele.</div>`;
                } else {
                    listEl.innerHTML = data.games.map(g => `
                        <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 8px; display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 0.85em;">
                            <div style="display: flex; flex-direction: column; gap: 2px;">
                                <span style="font-weight: bold; color: #f1c40f;">Raum ${g.room}</span>
                                <span style="color: #ccc;">⚪ ${g.whitePlayer} vs ⚫ ${g.blackPlayer}</span>
                            </div>
                            <button onclick="joinSpectate('${g.room}')" style="background: #3498db; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 0.85em;">👁️ Zuschauen</button>
                        </div>
                    `).join('');
                }
            }
            return;
        }

        if (data.type === 'spectator_join_success') {
            isSpectatorMode = true;
            onlineRoom = data.room;
            
            const banner = document.getElementById('spectating-banner');
            const text = document.getElementById('spectating-text');
            if (banner && text) {
                banner.style.display = 'flex';
                text.innerText = `👁️ Zuschauer-Modus: Raum ${data.room} (${data.whitePlayer} vs ${data.blackPlayer})`;
            }
            
            if (data.board) {
                board = data.board;
                if (data.turn) turn = data.turn;
                draw();
            }
            
            addChat("System", `👁️ Du schaust jetzt Raum ${data.room} zu. Chatnachrichten im Zuschauer-Chat stören die Spieler nicht!`, "system");
            return;
        }

        if (data.type === 'spectator_board_update') {
            if (data.board) board = data.board;
            if (data.turn) turn = data.turn;
            if (data.lastMove) {
                lastMove = data.lastMove;
            }
            draw();
            return;
        }

        if (data.type === 'spectator_chat') {
            const u = data.user || "Zuschauer";
            addChat("👁️ " + u, data.text, "spectator");
            return;
        }

        if (data.type === 'spectator_count') {
            const countEl = document.getElementById('spectator-count-display');
            if (countEl) {
                countEl.innerText = `👁️ Zuschauer: ${data.count}`;
                countEl.style.display = data.count > 0 ? 'inline-block' : 'none';
            }
            return;
        }
        if (data.type === 'video_ready') {
            if (typeof onVideoReady === 'function') onVideoReady(data.url, data.prompt);
            addVideoToFeed({ url: data.url, prompt: data.prompt, playerName: data.playerName });
            return;
        }
    } catch(err) {
        console.error("Fehler beim Verarbeiten der Server-Nachricht:", err);
    }
};

socket.onopen = () => {
    loadChatHistory();
    
    // Auto-Login, falls bereits eingeloggt
    const savedName = localStorage.getItem('playerName');
    const savedUid = localStorage.getItem('firebaseUid');
    const savedHash = localStorage.getItem('playerPasswordHash');
    
    if (savedName && savedUid) {
        console.log("Automatischer Firebase-Login für " + savedName);
        socket.send(JSON.stringify({
            type: 'login_attempt',
            playerName: savedName,
            uid: savedUid,
            password: 'firebase-auth-token'
        }));
    } else if (savedName && savedHash) {
        console.log("Automatischer Hintergrund-Login für " + savedName);
        socket.send(JSON.stringify({
            type: 'login_attempt',
            playerName: savedName,
            password: savedHash
        }));
    }
    
    if (window.initFeatures) window.initFeatures(socket, savedName);
};

function draw() {
    const currentBoardEl = document.getElementById("chess-board") || boardEl;
    if (!currentBoardEl) return;
    currentBoardEl.innerHTML = "";
    const k = typeof findKing === 'function' ? findKing(turn) : (window.findKing ? window.findKing(turn) : null);
    const inCheck = k ? isAttacked(k.r, k.c, turn === "white" ? "black" : "white") : false;

    let possibleMoves = [];
    if (selected && board[selected.r] && board[selected.r][selected.c]) {
        const originalTurn = turn;
        const selectedPiece = board[selected.r][selected.c];
        const selectedPieceColor = isOwn(selectedPiece, "white") ? "white" : "black";
        turn = selectedPieceColor; // Temporarily evaluate using piece owner color
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (canMoveLogic(selected.r, selected.c, r, c) && isSafeMove(selected.r, selected.c, r, c)) {
                    possibleMoves.push({r, c});
                }
            }
        }
        turn = originalTurn; // Restore original turn
    }

    board.forEach((row, r) => {
        row.forEach((p, c) => {
            const d = document.createElement("div");
            d.className = `square ${(r + c) % 2 ? "black-sq" : "white-sq"}`;
            d.style.position = "relative";
            
            // Add Rank labels (8-1) on the left-most column
            if (c === 0) {
                const rankLabel = document.createElement("span");
                rankLabel.className = "board-label";
                rankLabel.innerText = 8 - r;
                rankLabel.style.position = "absolute";
                rankLabel.style.top = "2px";
                rankLabel.style.left = "4px";
                rankLabel.style.fontSize = "10px";
                rankLabel.style.fontWeight = "bold";
                rankLabel.style.pointerEvents = "none";
                rankLabel.style.color = (r + c) % 2 ? "#f0d9b5" : "#b58863";
                d.appendChild(rankLabel);
            }

            // Add File labels (a-h) on the bottom-most row
            if (r === 7) {
                const fileLabel = document.createElement("span");
                fileLabel.className = "board-label";
                fileLabel.innerText = String.fromCharCode(97 + c);
                fileLabel.style.position = "absolute";
                fileLabel.style.bottom = "2px";
                fileLabel.style.right = "4px";
                fileLabel.style.fontSize = "10px";
                fileLabel.style.fontWeight = "bold";
                fileLabel.style.pointerEvents = "none";
                fileLabel.style.color = (r + c) % 2 ? "#f0d9b5" : "#b58863";
                d.appendChild(fileLabel);
            }
            
            if (typeof lastMove !== 'undefined' && lastMove && 
                ((r === lastMove.fr && c === lastMove.fc) || (r === lastMove.tr && c === lastMove.tc))) {
                d.classList.add("last-move");
            }

            if (typeof premove !== 'undefined' && premove && 
                ((r === premove.fr && c === premove.fc) || (r === premove.tr && c === premove.tc))) {
                d.classList.add("premove");
            }

            if(selected && selected.r === r && selected.c === c) d.classList.add("selected");
            if(inCheck && p && p.toLowerCase() === 'k' && isOwn(p, turn)) d.classList.add("in-check");

            if (possibleMoves.some(m => m.r === r && m.c === c)) {
                const dot = document.createElement("div");
                dot.className = "move-dot";
                // Wenn sich eine Figur auf dem Feld befindet, handelt es sich um einen Schlagzug!
                if (p) {
                    dot.classList.add("capture-dot");
                }
                d.appendChild(dot);
            }

            if(p) {
                const img = document.createElement("img"); 
                const currentPieceTheme = localStorage.getItem('piece_theme') || 'classic';
                const themePieces = (typeof PIECE_THEMES !== 'undefined' && PIECE_THEMES[currentPieceTheme]) ? PIECE_THEMES[currentPieceTheme] : PIECES;
                img.src = themePieces[p] || PIECES[p];
                img.style.width = "85%"; 
                d.appendChild(img);
            }

            d.onclick = () => handleSquareClick(r, c);

            d.oncontextmenu = (e) => {
                e.preventDefault();
                if (typeof premove !== 'undefined') {
                    premove = null;
                    draw();
                }
            };

            currentBoardEl.appendChild(d);
        });
    });

    // Letzten Zug als dezenten Leuchtpfad zeichnen (SVG Overlay)
    if (typeof lastMove !== 'undefined' && lastMove) {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("class", "board-overlay-svg");
        svg.style.position = "absolute";
        svg.style.top = "0";
        svg.style.left = "0";
        svg.style.width = "100%";
        svg.style.height = "100%";
        svg.style.pointerEvents = "none";
        svg.style.zIndex = "10"; // Über dem Feld-Hintergrund, aber unter den Figuren
        
        const x1 = (lastMove.fc + 0.5) * 12.5;
        const y1 = (lastMove.fr + 0.5) * 12.5;
        const x2 = (lastMove.tc + 0.5) * 12.5;
        const y2 = (lastMove.tr + 0.5) * 12.5;
        
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", `M ${x1}% ${y1}% L ${x2}% ${y2}%`);
        path.setAttribute("stroke", "rgba(241, 196, 15, 0.45)"); // Goldener Lichtpfad
        path.setAttribute("stroke-width", "3");
        path.setAttribute("stroke-linecap", "round");
        path.setAttribute("fill", "none");
        
        path.style.strokeDasharray = "8, 6";
        path.style.animation = "dash 30s linear infinite";
        path.setAttribute("filter", "drop-shadow(0px 0px 4px rgba(241, 196, 15, 0.8))");
        
        svg.appendChild(path);
        currentBoardEl.appendChild(svg);
    }
}
window.draw = draw;
window.resetGame = resetGame;
window.doMove = doMove;
window.canMoveLogic = canMoveLogic;
window.isSafeMove = isSafeMove;
window.isAttacked = isAttacked;
function startGeneration() {
    const myName = getMyName();
    const promptInput = document.getElementById('videoPrompt');
    const statusEl = document.getElementById('videoStatus');

    if (!promptInput) return;
    const promptText = promptInput.value.trim();
    if (promptText === "") {
        alert("Bitte beschreibe zuerst, was im Video passieren soll!");
        return;
    }

    if (statusEl) statusEl.innerHTML = "⏳ <b>KI arbeitet...</b> Bitte warten (ca. 5 Sek.)";
    
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'generate_video',
            prompt: promptText,
            playerName: myName
        }));
    } else {
        if (statusEl) statusEl.innerHTML = "<span style='color:red;'>❌ Fehler: Server nicht verbunden!</span>";
    }
}
function handleSquareClick(r, c) {
    if (isSpectatorMode || isAnimating) return;
    const isLocal = gameModeSelect && gameModeSelect.value === "local";
    if (!isLocal && turn !== myColor) {
        if (selected) {
            if (selected.r !== r || selected.c !== c) {
                premove = { fr: selected.r, fc: selected.c, tr: r, tc: c };
                selected = null;
                console.log("🐍 Premove gesetzt:", premove);
            } else {
                selected = null;
            }
        } else if (board[r][c] && isOwn(board[r][c], myColor)) {
            selected = { r, c };
        }
        draw(); 
        return;
    }

    if(selected) {
        if(canMoveLogic(selected.r, selected.c, r, c) && isSafeMove(selected.r, selected.c, r, c)) {
            let piece = board[selected.r][selected.c];
            
            if (piece.toLowerCase() === 'p' && (r === 0 || r === 7)) {
                let choice = prompt("Bauernumwandlung! Wähle: Q (Dame), R (Turm), B (Läufer), N (Springer)", "Q") || "Q";
                choice = choice.toUpperCase();
                if (!['Q','R','B','N'].includes(choice)) choice = 'Q';
                board[selected.r][selected.c] = (piece === 'P') ? choice : choice.toLowerCase();
            }
            
            doMove(selected.r, selected.c, r, c);
            selected = null;
        } else {
            selected = (board[r][c] && isOwn(board[r][c], turn)) ? {r, c} : null;
        }
    } else if(board[r][c] && isOwn(board[r][c], turn)) {
        selected = {r, c};
    }
    draw();
}

const undoBtn = document.getElementById("undoBtn");
if (undoBtn) {
    undoBtn.onclick = () => { 
        if (history.length > 0) {
            const lastState = history.pop();
            board = lastState.board;
            turn = lastState.turn;
            hasMoved = lastState.hasMoved || hasMoved;
            enPassantTarget = lastState.enPassantTarget || null;
            halfMoveClock = lastState.halfMoveClock || 0;
            if (statusEl) statusEl.textContent = (turn === "white" ? "Weiß" : "Schwarz") + " am Zug (Rückgängig)";
            draw();
        }
    };
}

const resetBtn = document.getElementById("resetBtn");
if (resetBtn) resetBtn.onclick = resetGame;

const resignBtn = document.getElementById("resignBtn");
if (resignBtn) {
    resignBtn.onclick = () => {
        if (confirm("Möchtest du wirklich aufgeben?")) {
            if (socket.readyState === 1 && onlineRoom) {
                socket.send(JSON.stringify({ 
                    type: 'resign', 
                    room: onlineRoom, 
                    sender: getMyName() 
                }));
            }
            addChat("System", "Du hast das Spiel aufgegeben.", "system");
            resetGame();
        }
    };
}

myEngineWorker.onmessage = (e) => {
    if(e.data && turn === "black" && gameModeSelect && gameModeSelect.value === "bot") {
        const { fr, fc, tr, tc } = e.data;
        setTimeout(() => {
            if (board[fr][fc]) {
                const p = board[fr][fc];
                if (p.toLowerCase() === 'p' && (tr === 0 || tr === 7)) {
                    board[fr][fc] = p === 'P' ? 'Q' : 'q';
                }
            }
            doMove(fr, fc, tr, tc, false);
        }, 600);
    }
};

stockfishWorker.onmessage = (e) => {
    const line = e.data;
    if (typeof line === 'string' && line.includes("bestmove")) {
        const match = line.match(/bestmove\s([a-h][1-8])([a-h][1-8])(q|r|b|n)?/);
        if (match && turn === "black" && gameModeSelect && gameModeSelect.value === "stockfish") {
            const cols = "abcdefgh";
            const fr = 8 - parseInt(match[1][1]);
            const fc = cols.indexOf(match[1][0]);
            const tr = 8 - parseInt(match[2][1]);
            const tc = cols.indexOf(match[2][0]);
            const prom = match[3];
            setTimeout(() => {
                if (prom && board[fr][fc]) {
                    board[fr][fc] = board[fr][fc] === 'P' ? prom.toUpperCase() : prom.toLowerCase();
                }
                doMove(fr, fc, tr, tc, false);
            }, 600);
        }
    }
};

function getSecureSalat(text) {
    if (!text) return "";
    return CryptoJS.SHA256(text).toString();
}

function addVideoToFeed(video) {
    const feed = document.getElementById('videoFeed');
    if (!feed) {
        console.error("Fehler: Element 'videoFeed' fehlt im HTML!");
        return;
    }

    const entry = document.createElement('div');
    entry.className = 'video-entry animate-pop-in';
    entry.innerHTML = `
        <div class="video-info">
            <strong>🎬 ${video.playerName || 'Künstliche Intelligenz'}</strong><br>
            <small>${video.prompt}</small>
        </div>
        <button onclick="playVideo('${video.url}')" class="view-video-btn">
            ▶ Video ansehen
        </button>
    `;
    feed.prepend(entry);
}

const emoteMenuBtn = document.getElementById("emote-menu-btn");
const emotePopup = document.getElementById("emote-popup");

if (emoteMenuBtn && emotePopup) {
    emoteMenuBtn.onclick = (e) => {
        e.stopPropagation();
        const isVisible = emotePopup.style.display === "block";
        emotePopup.style.display = isVisible ? "none" : "block";
    };

    document.addEventListener("click", () => {
        emotePopup.style.display = "none";
    });

    document.querySelectorAll(".emote-btn").forEach(btn => {
        btn.onclick = function() {
            const message = this.getAttribute("data-msg");

            let myName = "Gegner";
            try {
                if (typeof getMyName === "function") {
                    const dynamicName = getMyName();
                    if (dynamicName && dynamicName !== "undefined") {
                        myName = dynamicName;
                    }
                }
            } catch (err) {
                console.warn("Namens-Ermittlung fehlgeschlagen, nutze Fallback.");
            }

            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    type: 'chat',
                    text: message,
                    name: myName,
                    playerName: myName,
                    sender: myName
                }));

                const chatMessages = document.getElementById("chat-messages");
                if (chatMessages) {
                    const msgDiv = document.createElement("div");
                    
                    msgDiv.style.padding = "5px 8px";
                    msgDiv.style.margin = "4px 0";
                    msgDiv.style.borderRadius = "5px";
                    msgDiv.style.backgroundColor = "rgba(40, 167, 69, 0.15)";
                    msgDiv.style.borderLeft = "3px solid #28a745";
                    
                    msgDiv.innerHTML = `<strong style="color: #28a745;">${myName}:</strong> <span style="color: white;">${message}</span>`;
                    
                    chatMessages.appendChild(msgDiv);
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }
                
                emotePopup.style.display = "none";
            }
        };
    });
}
resetGame();

// --- NEW: FEN PARSER / LOADER ---
function loadFEN(fen) {
    if (!fen) return;
    const parts = fen.split(" ");
    const boardPart = parts[0];
    const rows = boardPart.split("/");
    
    board = [];
    for (let r = 0; r < 8; r++) {
        const row = [];
        const fenRow = rows[r];
        if (!fenRow) continue;
        for (let i = 0; i < fenRow.length; i++) {
            const char = fenRow[i];
            if (/\d/.test(char)) {
                const num = parseInt(char);
                for (let j = 0; j < num; j++) {
                    row.push("");
                }
            } else {
                row.push(char);
            }
        }
        board.push(row);
    }
    
    turn = (parts[1] === "b") ? "black" : "white";
    selected = null;
    history = [];
    lastMove = null;
    premove = null;
    
    if (typeof draw === "function") draw();
}
window.loadFEN = loadFEN;

// --- INITIALIZE PUZZLE ---
function initPuzzleControls() {
    const loadPuzzleBtn = document.getElementById("loadPuzzleBtn");
    const resetPuzzleBtn = document.getElementById("resetPuzzleBtn");
    
    if (loadPuzzleBtn) {
        loadPuzzleBtn.addEventListener("click", () => {
            if (socket && socket.readyState === WebSocket.OPEN) {
                // Request the daily puzzle
                socket.send(JSON.stringify({ type: 'get_daily_puzzle' }));
                
                // Show status feedback
                document.getElementById("puzzle-status").innerText = "Lade Position...";
                document.getElementById("puzzle-status").style.color = "#bdc3c7";
                
                // Activate puzzle load delay
                setTimeout(() => {
                    if (window.activePuzzle) {
                        window.isTacticalPuzzleMode = true;
                        loadFEN(window.activePuzzle.fen);
                        myColor = window.activePuzzle.color;
                        
                        document.getElementById("puzzle-status").innerText = "Rätsel aktiv! Mache deinen Zug.";
                        document.getElementById("puzzle-status").style.color = "#f1c40f";
                        
                        if (resetPuzzleBtn) resetPuzzleBtn.style.display = "block";
                    }
                }, 600);
            } else {
                alert("Verbindung zum Server wird benötigt, um das Tägliche Rätsel zu laden.");
            }
        });
    }
    
    if (resetPuzzleBtn) {
        resetPuzzleBtn.addEventListener("click", () => {
            if (window.activePuzzle) {
                loadFEN(window.activePuzzle.fen);
                document.getElementById("puzzle-status").innerText = "Position zurückgesetzt.";
                document.getElementById("puzzle-status").style.color = "#f1c40f";
            }
        });
    }
}

// --- FULLSCREEN CONTROLS ---
function initFullscreenControls() {
    const fullscreenBtn = document.getElementById("fullscreenBtn");
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener("click", () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen()
                    .then(() => {
                        fullscreenBtn.innerText = "📺 Fenster";
                    })
                    .catch(err => {
                        console.error(`Fehler beim Aktivieren des Vollbildmodus: ${err.message}`);
                    });
            } else {
                document.exitFullscreen()
                    .then(() => {
                        fullscreenBtn.innerText = "📺 Vollbild";
                    });
            }
        });
    }
}

// Fetch puzzle status on startup
setTimeout(() => {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'get_daily_puzzle' }));
    }
}, 1000);

// --- CUSTOMIZATION & PIECE CUSTOM COLOR LOGIK ---
function initCustomizationControls() {
    const boardThemeSelect = document.getElementById("boardThemeSelect");
    const pieceThemeSelect = document.getElementById("pieceThemeSelect");
    const cpWhite = document.getElementById("colorWhite");
    const cpBlack = document.getElementById("colorBlack");
    const cpMoveDot = document.getElementById("colorMoveDot");
    
    // Read from localStorage on boot
    const savedBoardTheme = localStorage.getItem("board_theme") || "classic";
    const savedPieceTheme = localStorage.getItem("piece_theme") || "classic";
    const savedColorWhite = localStorage.getItem("color_white") || "#f0d9b5";
    const savedColorBlack = localStorage.getItem("color_black") || "#b58863";
    const savedColorMoveDot = localStorage.getItem("color_move_dot") || "#f1c40f";
    
    // Load and apply custom colors on boot
    if (cpWhite) cpWhite.value = savedColorWhite;
    if (cpBlack) cpBlack.value = savedColorBlack;
    if (cpMoveDot) cpMoveDot.value = savedColorMoveDot;
    document.documentElement.style.setProperty('--board-white', savedColorWhite);
    document.documentElement.style.setProperty('--board-black', savedColorBlack);
    document.documentElement.style.setProperty('--move-dot-color', savedColorMoveDot);
    
    if (cpMoveDot) {
        cpMoveDot.addEventListener("input", () => {
            const moveDotVal = cpMoveDot.value;
            localStorage.setItem("color_move_dot", moveDotVal);
            document.documentElement.style.setProperty('--move-dot-color', moveDotVal);
        });
    }

    // Bind event listeners for the custom color pickers safely
    if (cpWhite && cpBlack) {
        [cpWhite, cpBlack].forEach(cp => {
            cp.addEventListener("input", () => {
                const whiteVal = cpWhite.value;
                const blackVal = cpBlack.value;
                
                // Save custom colors to localStorage
                localStorage.setItem("color_white", whiteVal);
                localStorage.setItem("color_black", blackVal);
                
                // Apply the changes instantly to the document stylesheet variables
                document.documentElement.style.setProperty('--board-white', whiteVal);
                document.documentElement.style.setProperty('--board-black', blackVal);
                
                // Automatically switch the theme selection to "classic" so custom colors become visible
                if (boardThemeSelect && boardThemeSelect.value !== "classic") {
                    boardThemeSelect.value = "classic";
                    localStorage.setItem("board_theme", "classic");
                    applyThemes("classic", pieceThemeSelect ? pieceThemeSelect.value : "classic");
                }
            });
        });
    }
    
    if (boardThemeSelect) {
        boardThemeSelect.value = savedBoardTheme;
        boardThemeSelect.addEventListener("change", () => {
            const theme = boardThemeSelect.value;
            localStorage.setItem("board_theme", theme);
            applyThemes(theme, pieceThemeSelect ? pieceThemeSelect.value : "classic");
            
            // Sync settings to server
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    type: 'update_settings',
                    board_theme: theme,
                    piece_theme: pieceThemeSelect ? pieceThemeSelect.value : "classic"
                }));
            }
        });
    }
    
    if (pieceThemeSelect) {
        pieceThemeSelect.value = savedPieceTheme;
        pieceThemeSelect.addEventListener("change", () => {
            const theme = pieceThemeSelect.value;
            localStorage.setItem("piece_theme", theme);
            applyThemes(boardThemeSelect ? boardThemeSelect.value : "classic", theme);
            
            // Sync settings to server
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    type: 'update_settings',
                    board_theme: boardThemeSelect ? boardThemeSelect.value : "classic",
                    piece_theme: theme
                }));
            }
        });
    }
    
    // Apply initial themes
    applyThemes(savedBoardTheme, savedPieceTheme);
}

function applyThemes(boardTheme, pieceTheme) {
    const boardEl = document.getElementById("chess-board");
    if (!boardEl) return;
    
    boardEl.classList.remove('theme-wood', 'theme-neon', 'theme-marble', 'theme-slate');
    if (boardTheme && boardTheme !== 'classic') {
        boardEl.classList.add(`theme-${boardTheme}`);
    }
    
    if (typeof draw === 'function') draw();
}
window.applyThemes = applyThemes;

// --- SPECTATOR CONTROLS ---
isSpectatorMode = false;
window.isSpectatorMode = isSpectatorMode;

function initSpectatorControls() {
    const refreshGamesBtn = document.getElementById("refreshGamesBtn");
    const leaveSpectateBtn = document.getElementById("leaveSpectateBtn");
    
    if (refreshGamesBtn) {
        refreshGamesBtn.addEventListener("click", () => {
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ type: 'get_active_games' }));
            }
        });
        
        // Auto-refresh every 15 seconds
        setInterval(() => {
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ type: 'get_active_games' }));
            }
        }, 15000);
    }
    
    if (leaveSpectateBtn) {
        leaveSpectateBtn.addEventListener("click", leaveSpectate);
    }
}

function joinSpectate(room) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'spectate_join',
            room: room
        }));
    }
}
window.joinSpectate = joinSpectate;

function leaveSpectate() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'spectate_leave' }));
    }
    isSpectatorMode = false;
    window.isSpectatorMode = false;
    
    const banner = document.getElementById('spectating-banner');
    if (banner) banner.style.display = 'none';
    
    addChat("System", "👁️ Zuschauer-Modus beendet.", "system");
    resetGame();
}
window.leaveSpectate = leaveSpectate;

// Initialize all controls on DOM load
window.addEventListener('DOMContentLoaded', () => {
    initPuzzleControls();
    initFullscreenControls();
    initCustomizationControls();
    initSpectatorControls();
    
    // Pull active games list on load
    setTimeout(() => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'get_active_games' }));
        }
    }, 1500);
});

// Pure Canvas particle physics engine for Gold Dust explosion / celebration
function triggerGoldDustCelebration() {
    let canvas = document.getElementById("celebration-canvas");
    if (!canvas) {
        canvas = document.createElement("canvas");
        canvas.id = "celebration-canvas";
        canvas.style.position = "fixed";
        canvas.style.top = "0";
        canvas.style.left = "0";
        canvas.style.width = "100vw";
        canvas.style.height = "100vh";
        canvas.style.pointerEvents = "none";
        canvas.style.zIndex = "999999";
        document.body.appendChild(canvas);
    }
    
    const ctx = canvas.getContext("2d");
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;
    
    const resizeHandler = () => {
        if (canvas) {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }
    };
    window.addEventListener("resize", resizeHandler);
    
    const particles = [];
    const sourceX1 = width * 0.15;
    const sourceX2 = width * 0.85;
    const sourceY = height * 0.85;
    
    // Left Fountain
    for (let i = 0; i < 90; i++) {
        particles.push({
            x: sourceX1,
            y: sourceY,
            vx: (Math.random() * 9 + 3), 
            vy: -(Math.random() * 16 + 12),
            radius: Math.random() * 4 + 2,
            color: `hsla(${Math.random() * 12 + 42}, 100%, ${Math.random() * 20 + 50}%, ${Math.random() * 0.7 + 0.3})`,
            gravity: 0.32,
            drag: 0.975,
            opacity: 1,
            spin: Math.random() * 360,
            spinSpeed: Math.random() * 12 - 6
        });
    }
    
    // Right Fountain
    for (let i = 0; i < 90; i++) {
        particles.push({
            x: sourceX2,
            y: sourceY,
            vx: -(Math.random() * 9 + 3), 
            vy: -(Math.random() * 16 + 12),
            radius: Math.random() * 4 + 2,
            color: `hsla(${Math.random() * 12 + 42}, 100%, ${Math.random() * 20 + 50}%, ${Math.random() * 0.7 + 0.3})`,
            gravity: 0.32,
            drag: 0.975,
            opacity: 1,
            spin: Math.random() * 360,
            spinSpeed: Math.random() * 12 - 6
        });
    }
    
    // Center sparkly explosions
    for (let i = 0; i < 70; i++) {
        particles.push({
            x: width / 2 + (Math.random() * 160 - 80),
            y: height * 0.4 + (Math.random() * 160 - 80),
            vx: (Math.random() * 6 - 3),
            vy: (Math.random() * 6 - 8),
            radius: Math.random() * 3 + 1,
            color: `#fff`,
            gravity: 0.12,
            drag: 0.96,
            opacity: 1,
            spin: Math.random() * 360,
            spinSpeed: Math.random() * 16 - 8
        });
    }
    
    function update() {
        ctx.clearRect(0, 0, width, height);
        let active = false;
        
        particles.forEach(p => {
            if (p.opacity > 0) {
                active = true;
                p.vy += p.gravity;
                p.vx *= p.drag;
                p.vy *= p.drag;
                p.x += p.vx;
                p.y += p.vy;
                p.spin += p.spinSpeed;
                p.opacity -= 0.007; 
                
                if (p.opacity < 0) p.opacity = 0;
                
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.spin * Math.PI / 180);
                ctx.fillStyle = p.color;
                ctx.shadowBlur = Math.random() * 8 + 4;
                ctx.shadowColor = "rgba(212, 175, 55, 0.75)";
                
                // Draw sparkly diamond
                ctx.beginPath();
                ctx.moveTo(0, -p.radius);
                ctx.lineTo(p.radius, 0);
                ctx.lineTo(0, p.radius);
                ctx.lineTo(-p.radius, 0);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }
        });
        
        if (active) {
            requestAnimationFrame(update);
        } else {
            window.removeEventListener("resize", resizeHandler);
            if (canvas.parentNode) {
                canvas.parentNode.removeChild(canvas);
            }
        }
    }
    
    update();
}
window.triggerGoldDustCelebration = triggerGoldDustCelebration;

function downloadReplay() {
    if (!moveHistoryLog || moveHistoryLog.length === 0) {
        alert("Keine Züge zum Herunterladen vorhanden!");
        return;
    }
    
    let pName = "Gast";
    if (typeof getMyName === 'function') {
        pName = getMyName();
    }
    
    let oppName = "Gegner";
    if (typeof opponentName !== 'undefined' && opponentName) {
        oppName = opponentName;
    }
    
    const whiteName = (typeof myColor !== 'undefined' && myColor === "white") ? pName : oppName;
    const blackName = (typeof myColor !== 'undefined' && myColor === "black") ? pName : oppName;
    
    // Result determination
    let result = "*";
    const modalTextEl = document.getElementById('checkmate-winner-text');
    if (modalTextEl) {
        const modalText = modalTextEl.innerText || "";
        if (modalText.includes("Weiß gewinnt")) {
            result = "1-0";
        } else if (modalText.includes("Schwarz gewinnt")) {
            result = "0-1";
        } else if (modalText.includes("Unentschieden") || modalText.includes("Remis")) {
            result = "1/2-1/2";
        }
    }
    
    const today = new Date();
    const dateStr = today.getFullYear() + "." + String(today.getMonth() + 1).padStart(2, '0') + "." + String(today.getDate()).padStart(2, '0');
    
    let pgn = `[Event "Online Match"]\n`;
    pgn += `[Site "Schach Live App"]\n`;
    pgn += `[Date "${dateStr}"]\n`;
    pgn += `[Round "1"]\n`;
    pgn += `[White "${whiteName}"]\n`;
    pgn += `[Black "${blackName}"]\n`;
    pgn += `[Result "${result}"]\n\n`;
    
    let movePairs = [];
    for (let i = 0; i < moveHistoryLog.length; i += 2) {
        const moveNum = Math.floor(i / 2) + 1;
        const whiteMove = moveHistoryLog[i];
        const blackMove = moveHistoryLog[i + 1] || "";
        movePairs.push(`${moveNum}. ${whiteMove} ${blackMove}`.trim());
    }
    pgn += movePairs.join(" ") + ` ${result}`;
    
    try {
        const blob = new Blob([pgn], { type: "application/x-chess-pgn;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Schach_Replay_${whiteName}_vs_${blackName}.pgn`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch(e) {
        console.error("Fehler beim Herunterladen des Replays:", e);
        alert("Es gab einen Fehler beim Herunterladen des Replays.");
    }
}
window.downloadReplay = downloadReplay;
