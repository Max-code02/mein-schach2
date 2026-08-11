const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

const lobbyControls = `
                <div id="lobby-controls" style="display: flex; gap: 5px; margin-bottom: 10px; align-items: center; padding: 10px 15px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <select id="chat-lobby-select" class="glass-input" style="flex: 1; padding: 8px;">
                        <option value="global" style="color: black;">🌐 Global Chat</option>
                        <option value="room" style="color: black;">🎮 Spiel-Raum</option>
                    </select>
                    <button id="join-custom-lobby-btn" class="glass-btn primary" style="padding: 8px 12px; margin: 0;" title="Privaten Chatraum beitreten">🔒 Join</button>
                </div>
`;

html = html.replace(/<div id="chat-container">/, `<div id="chat-container">\n${lobbyControls}`);

fs.writeFileSync('index.html', html);
