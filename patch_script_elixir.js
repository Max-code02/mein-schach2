const fs = require('fs');
let code = fs.readFileSync('script.js', 'utf8');

const jsCode = `
window.requestAdminElixirRefresh = function() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'get_admin_elixir' }));
        document.getElementById('admin-elixir-container').innerHTML = '<div style="color: #aaa; text-align: center; font-style: italic; font-size: 0.85em; padding: 10px 0;">Lade Queue...</div>';
    }
};
`;

const originalHandleMsg = "else if (data.type === 'admin_tickets_update') {";
const addHandler = "else if (data.type === 'admin_elixir_update') {\n" +
"        const container = document.getElementById('admin-elixir-container');\n" +
"        if (!container) return;\n" +
"        if (!data.queue || data.queue.length === 0) {\n" +
"            container.innerHTML = '<div style=\"color: #aaa; text-align: center; font-style: italic; font-size: 0.85em; padding: 10px 0;\">Queue ist aktuell leer.</div>';\n" +
"            return;\n" +
"        }\n" +
"        let html = '<div style=\"display: flex; flex-direction: column; gap: 6px; font-size: 0.85em;\">';\n" +
"        data.queue.forEach(p => {\n" +
"            html += '<div style=\"background: rgba(10, 10, 15, 0.4); padding: 8px; border-radius: 4px; border-left: 3px solid #9b59b6; display: flex; justify-content: space-between;\">';\n" +
"            html += '<span>👤 <strong>' + p.playerName + '</strong></span>';\n" +
"            html += '<span style=\"color: #d2b4de;\">⏱️ ' + p.timeControl + '</span>';\n" +
"            html += '</div>';\n" +
"        });\n" +
"        html += '</div>';\n" +
"        container.innerHTML = html;\n" +
"    }\n    ";

code = code.replace(originalHandleMsg, addHandler + originalHandleMsg);
code += "\n" + jsCode;
fs.writeFileSync('script.js', code);
console.log("Patched script.js with admin elixir JS!");
