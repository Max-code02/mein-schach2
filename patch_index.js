const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');

const targetStr = `            <button class="checkmate-btn" onclick="document.getElementById('checkmate-modal').style.display='none'; resetGame();">Neue Partie starten</button>
            <button class="checkmate-btn" style="background: #3498db; margin-top: 10px;" onclick="downloadReplay();">📥 Replay (PGN) herunterladen</button>`;

const replaceStr = `            <button class="checkmate-btn" onclick="document.getElementById('checkmate-modal').style.display='none'; resetGame();">Neue Partie starten</button>
            <button class="checkmate-btn" style="background: #3498db; margin-top: 10px;" onclick="downloadReplay();">📥 Replay (PGN) herunterladen</button>
            <button class="checkmate-btn" style="background: #9b59b6; margin-top: 10px;" onclick="shareGameForAnalysis();">🔍 Spiel-Analyse (Lichess)</button>`;

code = code.replace(targetStr, replaceStr);
fs.writeFileSync('index.html', code);
