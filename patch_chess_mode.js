const fs = require('fs');

// Add button to index.html
let html = fs.readFileSync('index.html', 'utf8');
html = html.replace(/<button id="navThemeToggle"/, '<button id="navFocusToggle" onclick="toggleChessMode()" class="glass-btn nav-btn" style="color:#e74c3c;">🎯 Fokus</button>\n            <button id="navThemeToggle"');
fs.writeFileSync('index.html', html);

// Add logic to script.js
let script = fs.readFileSync('script.js', 'utf8');
script += `
window.isChessMode = false;
window.toggleChessMode = function() {
    window.isChessMode = !window.isChessMode;
    const btn = document.getElementById('navFocusToggle');
    if (window.isChessMode) {
        document.body.classList.add('chess-mode');
        if (btn) btn.style.background = 'rgba(231, 76, 60, 0.4)';
    } else {
        document.body.classList.remove('chess-mode');
        if (btn) btn.style.background = '';
    }
};

// Automaticaly enable when match starts (optional but good idea)
const originalDoMove = window.doMove;
// we don't necessarily override doMove, we just provide the toggle so users can use it.
`;
fs.writeFileSync('script.js', script);

// Add CSS to style.css
let css = fs.readFileSync('style.css', 'utf8');
css += `
/* Chess Mode (Focus) */
body.chess-mode .glow-orb {
    opacity: 0.1 !important;
    animation-play-state: paused !important;
    transform: scale(0.5) !important;
    transition: all 1.5s ease-in-out;
}
`;
fs.writeFileSync('style.css', css);

