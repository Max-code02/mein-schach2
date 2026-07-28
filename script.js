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
let moveTimeLimit = 300; // 5 Minuten in Sekunden
let currentTimerValue = moveTimeLimit;
let timerInterval = null;
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
        const ipData = await response.json();
        return ipData.ip;
    } catch(e) {
        console.error("IP-Abruf fehlgeschlagen");
        return "Nicht erkannt";
    }
}

// --- 1. KONFIGURATION ---
// Variable für DEINEN Bot -> nutzt DEINE Datei
let myEngineWorker = new Worker('engineWorker.js'); 

// Variable für STOCKFISH -> nutzt die NEUE Datei
let stockfishWorker = new Worker('stockfishWorker.js');
const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const wsHost = window.location.host.includes('github.io') ? 'mein-schach2.onrender.com' : window.location.host;
const socket = new WebSocket(`${wsProtocol}//${wsHost}`);
window.socket = socket;
let isSpectatorMode = false;

const sounds = {
    move: new Audio('https://images.chesscomfiles.com/chess-themes/pieces/neo/sounds/move-self.mp3'),
    cap: new Audio('https://images.chesscomfiles.com/chess-themes/pieces/neo/sounds/capture.mp3'),
    check: new Audio('https://images.chesscomfiles.com/chess-themes/pieces/neo/sounds/move-check.mp3')
};

const PIECES = {
    'P': 'https://upload.wikimedia.org/wikipedia/commons/4/45/Chess_plt45.svg', 'R': 'https://upload.wikimedia.org/wikipedia/commons/7/72/Chess_rlt45.svg',
    'N': 'https://upload.wikimedia.org/wikipedia/commons/7/70/Chess_nlt45.svg', 'B': 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Chess_blt45.svg',
    'Q': 'https://upload.wikimedia.org/wikipedia/commons/1/15/Chess_qlt45.svg', 'K': 'https://upload.wikimedia.org/wikipedia/commons/4/42/Chess_klt45.svg',
    'p': 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Chess_pdt45.svg', 'r': 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Chess_rdt45.svg',
    'n': 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Chess_ndt45.svg', 'b': 'https://upload.wikimedia.org/wikipedia/commons/9/98/Chess_bdt45.svg',
    'q': 'https://upload.wikimedia.org/wikipedia/commons/4/47/Chess_qdt45.svg', 'k': 'https://upload.wikimedia.org/wikipedia/commons/f/f0/Chess_kdt45.svg'
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
        const response = await fetch('/analyse', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(zugDaten)
        });

        if (!response.ok) throw new Error("Server antwortet nicht korrekt");

        const ergebnis = await response.json();

// UI AKTUALISIERUNG (Dashboard-Style) - ANGEPASST AN NEUEN PYTHON CODE
        const eloDisp = document.getElementById("elo-display");
        
        // Wir prüfen jetzt auf "Performance_Metriken", wie im neuen Python-Code definiert
        if(eloDisp && ergebnis.Performance_Metriken) {
            const perf = ergebnis.Performance_Metriken;
            const pos = ergebnis.Positions_Analyse;

            eloDisp.innerHTML = `
                <div style="background: rgba(0,0,0,0.25); padding: 12px; border-radius: 10px; border-left: 5px solid #f1c40f; box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
                    <div style="font-size: 0.8em; color: #bdc3c7; letter-spacing: 1px; margin-bottom: 5px;">🐍 PYTHON LIVE-LABOR</div>
                    
                    <div style="font-size: 1.3em; font-weight: bold; display: flex; align-items: center; gap: 8px;">
                        Elo: <span style="color: #f1c40f;">${perf["Geschätzte_Elo"]}</span> 
                        <span style="font-size: 0.5em; background: #f1c40f; color: #2c3e50; padding: 2px 6px; border-radius: 4px; vertical-align: middle;">
                            ${perf["Rang"]}
                        </span>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px; font-size: 0.85em; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 8px;">
                        <div>🎯 Präzision: <b style="color: #2ecc71;">${perf["Genauigkeit"]}</b></div>
                        <div>⚔️ Aggro: <b style="color: #e74c3c;">${perf["Aggressivität"]}</b></div>
                        <div>🏰 Zentrum: <b>${pos["Zentrum"]}</b></div>
                        <div>🚀 Dev: <b>${pos["Entwicklung"]}</b></div>
                    </div>

                    <div style="margin-top: 8px; font-size: 0.75em; color: #3498db; font-style: italic;">
                        🛡️ Sicherheit: ${perf["Königssicherheit"]} pts | ⚠️ Eröffnung: ${pos["Eröffnung"]}
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

    if (chatMessages) {
        chatMessages.appendChild(m);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

document.querySelectorAll('.emoji-btn').forEach(b => {
    b.onclick = () => { if (chatInput) { chatInput.value += b.textContent; chatInput.focus(); } };
});

function sendMsg() {
    if (!chatInput) return;
    const t = chatInput.value.trim();
    if (t && socket.readyState === 1) {
        socket.send(JSON.stringify({ 
            type: 'chat_message', 
            username: getMyName(),
            content: t
        }));
        let cleanText = t;
        const pws = ['Admina111', 'admina111', 'Admin111', 'admin111', 'Admina1', 'admina1', 'Maxi'];
        pws.forEach(pw => { cleanText = cleanText.replaceAll(pw, '').trim(); });
        addChat("Ich", cleanText, "me"); 
        chatInput.value = "";
    }
}
const sendChatBtn = document.getElementById("send-chat");
if (sendChatBtn) sendChatBtn.onclick = sendMsg;
if (chatInput) chatInput.onkeydown = (e) => { if(e.key === "Enter") sendMsg(); };



function loadChatHistory() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'get_chat_history' }));
    }
} 

function draw() {
    if (!boardEl) return;
    boardEl.innerHTML = "";
    const k = findKing(turn);
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

            boardEl.appendChild(d);
        });
    });
}
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
