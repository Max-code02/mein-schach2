const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// 1. Change title
html = html.replace('<title>Schach Live | Profi-Schach</title>', '<title>Schach Live | ⚢ Elixir Edition</title>');

// 2. Add Elixir badge near the brand title
const titleStr = '<span class="brand-title">Schach Live</span>';
const titleReplacement = '<span class="brand-title" style="display:flex; align-items:center; gap:8px;">Schach Live <span style="font-size: 0.4em; background: #9b59b6; color: white; padding: 3px 8px; border-radius: 12px; border: 1px solid #8e44ad; box-shadow: 0 0 10px rgba(155, 89, 182, 0.5);">⚢ Powered by Elixir</span></span>';
html = html.replace(titleStr, titleReplacement);

// 3. Update connection status if possible
const statusStr = 'id="server-status" style="color: #2ecc71; font-weight: bold; text-shadow: 0 0 5px rgba(46,204,113,0.5);"';
const statusReplacement = 'id="server-status" style="color: #9b59b6; font-weight: bold; text-shadow: 0 0 8px rgba(155,89,182,0.8);"';
html = html.replace(statusStr, statusReplacement);

fs.writeFileSync('index.html', html);
console.log("Patched index.html with Elixir everywhere!");
