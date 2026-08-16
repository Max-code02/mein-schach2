const fs = require('fs');
let code = fs.readFileSync('script.js', 'utf8');

const regexLogic = `
function parsePerlRegex(text) {
    let safeText = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    // Strict chess move regex
    const moveRegex = /(^|\\s)(O-O(?:-O)?|[KQRBN][a-h]?[1-8]?x?[a-h][1-8][+#]?|[a-h]x[a-h][1-8](?:=[QRBN])?[+#]?|[a-h][1-8](?:=[QRBN])?[+#]?)(?=\\s|$|[!?,.])/g;
    
    safeText = safeText.replace(moveRegex, (match, space, move) => {
        let piece = "♟";
        if (move.includes("O-O")) piece = "🏰";
        else if (move.startsWith("K")) piece = "♔";
        else if (move.startsWith("Q")) piece = "♕";
        else if (move.startsWith("R")) piece = "♖";
        else if (move.startsWith("B")) piece = "♗";
        else if (move.startsWith("N")) piece = "♘";
        
        return space + \`<span class="perl-regex-move" style="background: rgba(142, 68, 173, 0.2); border: 1px dashed #8e44ad; border-radius: 4px; padding: 2px 5px; color: #d2b4de; font-family: monospace; font-weight: bold; font-size: 0.9em; box-shadow: 0 0 5px rgba(142, 68, 173, 0.5);" title="Perl RegEx-Interceptor">👁️ \${piece} \${move}</span>\`;
    });
    return safeText;
}
`;

// Replace span.textContent = text; with span.innerHTML = parsePerlRegex(text);
// Need to do this specifically inside addChat

const target = `const span = document.createElement("span");
        span.textContent = text;
        m.appendChild(span);`;

const newCode = `const span = document.createElement("span");
        span.innerHTML = parsePerlRegex(text);
        m.appendChild(span);`;

code = code.replace(target, newCode);
code = regexLogic + "\n" + code;
fs.writeFileSync('script.js', code);
console.log("Patched!");
