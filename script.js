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
// --- FARBWAHL LOGIK ---
const cpWhite = document.getElementById("colorWhite");
const cpBlack = document.getElementById("colorBlack");

if (cpWhite && cpBlack) {
    [cpWhite, cpBlack].forEach(cp => {
        cp.oninput = () => {
            document.documentElement.style.setProperty('--board-white', cpWhite.value);
            document.documentElement.style.setProperty('--board-black', cpBlack.value);
        };
    });
}
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
    // 2. Wenn ein Name im Feld steht, nimm den
    if (nameInput && nameInput.value.trim() !== "") {
        return nameInput.value.trim();
    }
    // 3. Wenn NICHTS im Feld steht, nimm IMMER den festen Namen von oben
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

// Variable für STOCKFISH -> nutzt die NEUE Datei
let stockfishWorker = new Worker('stockfishWorker.js');
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

function doMove(fr, fc, tr, tc, broadcast = true) {
    if (!board || fr === undefined || fc === undefined || tr === undefined || tc === undefined) return;
    const piece = board[fr][fc];
    if (!piece) return;
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

    try {
        if (isCapture && sounds && sounds.cap) sounds.cap.play().catch(()=>{});
        else if (sounds && sounds.move) sounds.move.play().catch(()=>{});
    } catch(e) {}

    sendeAnAnalyse(fr, fc, tr, tc, piece, isCapture);

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
        if (broadcast && socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'game_over', reason: 'checkmate', text: `Schachmatt! ${winner} gewinnt.` }));
        }
    }

    if (gameModeSelect) {
        if (gameModeSelect.value === "bot" && turn === "black") {
            myEngineWorker.postMessage({ board, turn, fen: boardToFEN() });
        } else if (gameModeSelect.value === "stockfish" && turn === "black") {
            stockfishWorker.postMessage({ board, turn, fen: boardToFEN() });
        }
    }

    if (premove && turn === myColor) {
        const pm = premove;
        premove = null;
        if (board[pm.fr][pm.fc] && isOwn(board[pm.fr][pm.fc], turn) && canMoveLogic(pm.fr, pm.fc, pm.tr, pm.tc) && isSafeMove(pm.fr, pm.fc, pm.tr, pm.tc)) {
            setTimeout(() => doMove(pm.fr, pm.fc, pm.tr, pm.tc), 200);
        }
    }
}

function resetGame() {
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
        
        const perf = ergebnis.Performance_Metriken || ergebnis.Basis_Werte || {};
        const pos = ergebnis.Positions_Analyse || {};
        const aggro = ergebnis.Aggressivitäts_Index || {};

        if (eloDisp) {
            const eloVal = perf["Geschätzte_Elo"] || perf["Elo"] || 1200;
            const rangVal = perf["Rang"] || "Spieler";
            const zentrumVal = pos["Zentrum"] || "Gut";
            const devVal = pos["Entwicklung"] || "Solide";
            const aggroVal = aggro["Gesamt"] || "Normal";

            eloDisp.innerHTML = `
                <div style="background: rgba(0,0,0,0.25); padding: 12px; border-radius: 10px; border-left: 5px solid #f1c40f; box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
                    <div style="font-size: 0.8em; color: #bdc3c7; letter-spacing: 1px; margin-bottom: 5px;">🤖 GOOGLE GEMINI / PYTHON KI</div>
                    
                    <div style="font-size: 1.3em; font-weight: bold; display: flex; align-items: center; gap: 8px;">
                        Elo: <span style="color: #f1c40f;">${eloVal}</span> 
                        <span style="font-size: 0.5em; background: #f1c40f; color: #2c3e50; padding: 2px 6px; border-radius: 4px; vertical-align: middle;">
                            ${rangVal}
                        </span>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px; font-size: 0.85em; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 8px;">
                        <div>⚔️ Aggro: <b style="color: #e74c3c;">${aggroVal}</b></div>
                        <div>🏰 Zentrum: <b>${zentrumVal}</b></div>
                        <div>🚀 Dev: <b>${devVal}</b></div>
                        <div>📊 Material: <b>${pos["Material_Vorteil"] || "0"}</b></div>
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
        socket.send(JSON.stringify({ 
            type: 'chat_message', 
            username: getMyName(),
            content: t,
            text: t
        }));
        socket.send(JSON.stringify({ 
            type: 'chat', 
            user: getMyName(),
            playerName: getMyName(),
            text: t,
            content: t
        }));
        let cleanText = t;
        const pws = ['Admina111', 'admina111', 'Admin111', 'admin111', 'Admina1', 'admina1', 'Maxi'];
        pws.forEach(pw => { cleanText = cleanText.replaceAll(pw, '').trim(); });
        addChat("Ich", cleanText, "me"); 
        inp.value = "";
    }
}
window.sendMsg = sendMsg;

window.addEventListener('DOMContentLoaded', () => {
    const sendChatBtn = document.getElementById("send-chat");
    if (sendChatBtn) sendChatBtn.onclick = sendMsg;
    const inp = document.getElementById("chat-input");
    if (inp) inp.onkeydown = (e) => { if(e.key === "Enter") sendMsg(); };

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
            alert(data.message);
            return;
        }
        if (data.type === 'login_success') {
            const statusBox = document.getElementById('save-status');
            if (statusBox) statusBox.innerHTML = "<span style='color: #00ff00;'>✅ Angemeldet als " + data.name + "</span>";
            if (data.name) {
                const pInput = document.getElementById('playerName');
                if (pInput) pInput.value = data.name;
                localStorage.setItem("playerName", data.name);
            }
            return;
        }
        if (data.type === 'login_error') {
            const statusBox = document.getElementById('save-status');
            if (statusBox) statusBox.innerHTML = "<span style='color: #ff4444;'>❌ " + (data.text || "Login fehlgeschlagen") + "</span>";
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
};

function draw() {
    const currentBoardEl = document.getElementById("chess-board") || boardEl;
    if (!currentBoardEl) return;
    currentBoardEl.innerHTML = "";
    const k = typeof findKing === 'function' ? findKing(turn) : (window.findKing ? window.findKing(turn) : null);
    const inCheck = k ? isAttacked(k.r, k.c, turn === "white" ? "black" : "white") : false;

    let possibleMoves = [];
    if (selected) {
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (canMoveLogic(selected.r, selected.c, r, c) && isSafeMove(selected.r, selected.c, r, c)) {
                    possibleMoves.push({r, c});
                }
            }
        }
    }

    board.forEach((row, r) => {
        row.forEach((p, c) => {
            const d = document.createElement("div");
            d.className = `square ${(r + c) % 2 ? "black-sq" : "white-sq"}`;
            
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
                d.appendChild(dot);
            }

            if(p) {
                const img = document.createElement("img"); 
                img.src = PIECES[p];
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
    if (isSpectatorMode) return;
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
        setTimeout(() => doMove(e.data.fr, e.data.fc, e.data.tr, e.data.tc, false), 600);
    }
};

stockfishWorker.onmessage = (e) => {
    const move = e.data;
    if(move && turn === "black" && gameModeSelect && gameModeSelect.value === "stockfish") {
        if (move.fr !== undefined && move.fc !== undefined) {
            setTimeout(() => {
                doMove(move.fr, move.fc, move.tr, move.tc, false);
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
