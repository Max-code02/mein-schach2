const fs = require('fs');
let code = fs.readFileSync('script.js', 'utf8');

const targetStr = `function downloadReplay() {`;

const insertStr = `window.shareGameForAnalysis = function() {
    if (!moveHistoryLog || moveHistoryLog.length === 0) {
        alert("Keine Züge zum Analysieren vorhanden!");
        return;
    }
    
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
    
    let pgn = \`[Event "Online Match"]\\n\`;
    pgn += \`[Site "Schach Live App"]\\n\`;
    pgn += \`[Date "\${dateStr}"]\\n\`;
    pgn += \`[Round "1"]\\n\`;
    pgn += \`[White "Player 1"]\\n\`;
    pgn += \`[Black "Player 2"]\\n\`;
    pgn += \`[Result "\${result}"]\\n\\n\`;
    
    let movePairs = [];
    for (let i = 0; i < moveHistoryLog.length; i += 2) {
        const moveNum = Math.floor(i / 2) + 1;
        const whiteMove = moveHistoryLog[i];
        const blackMove = moveHistoryLog[i + 1] || "";
        movePairs.push(\`\${moveNum}. \${whiteMove} \${blackMove}\`.trim());
    }
    
    pgn += movePairs.join(" ") + (result !== "*" ? " " + result : "");
    
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = 'https://lichess.org/api/import';
    form.target = '_blank';
    
    const pgnInput = document.createElement('input');
    pgnInput.type = 'hidden';
    pgnInput.name = 'pgn';
    pgnInput.value = pgn;
    form.appendChild(pgnInput);
    
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
}

function downloadReplay() {`;

code = code.replace(targetStr, insertStr);
fs.writeFileSync('script.js', code);
