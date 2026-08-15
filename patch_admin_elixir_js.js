const fs = require('fs');
let code = fs.readFileSync('script.js', 'utf8');

const jsCode = `
window.requestAdminElixirRefresh = function() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'get_admin_elixir' }));
        document.getElementById('admin-elixir-container').innerHTML = '<div style="color: #aaa; text-align: center; font-style: italic; font-size: 0.85em; padding: 10px 0;">Lade Queue...</div>';
    }
};

const originalHandleMsg = "else if (data.type === 'admin_tickets_update') {";
const addHandler = `else if (data.type === 'admin_elixir_update') {
        const container = document.getElementById('admin-elixir-container');
        if (!container) return;
        if (!data.queue || data.queue.length === 0) {
            container.innerHTML = '<div style="color: #aaa; text-align: center; font-style: italic; font-size: 0.85em; padding: 10px 0;">Queue ist aktuell leer.</div>';
            return;
        }
        let html = '<div style="display: flex; flex-direction: column; gap: 6px; font-size: 0.85em;">';
        data.queue.forEach(p => {
            html += '<div style="background: rgba(10, 10, 15, 0.4); padding: 8px; border-radius: 4px; border-left: 3px solid #9b59b6; display: flex; justify-content: space-between;">';
            html += '<span>👤 <strong>' + p.playerName + '</strong></span>';
            html += '<span style="color: #d2b4de;">⏱️ ' + p.timeControl + '</span>';
            html += '</div>';
        });
        html += '</div>';
        container.innerHTML = html;
    }
    `;

code = code.replace(originalHandleMsg, addHandler + originalHandleMsg);
fs.writeFileSync('script.js', code);
console.log("Patched script.js with admin elixir JS!");
