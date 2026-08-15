const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const targetSection = `<!-- Support Tickets Admin Section -->`;
const elixirSection = `
                    <!-- Elixir Matchmaking Queue Admin Section -->
                    <div id="admin-elixir-section" style="margin-top: 15px; border-top: 1px solid rgba(255,255,255,0.15); padding-top: 12px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <span style="font-weight: bold; font-size: 0.9em; color: #9b59b6; display: flex; align-items: center; gap: 6px;">
                                <span>⚢</span> <span>Elixir Queue Live</span>
                            </span>
                            <button onclick="requestAdminElixirRefresh()" class="glass-btn success" style="padding: 3px 8px; font-size: 0.75em; cursor: pointer; background: rgba(155, 89, 182, 0.25); border: 1px solid #9b59b6; color: #d2b4de;">🔄 Aktualisieren</button>
                        </div>
                        <div id="admin-elixir-container" style="background: rgba(155, 89, 182, 0.05); border: 1px solid rgba(155, 89, 182, 0.2); padding: 10px; border-radius: 8px; max-height: 250px; overflow-y: auto;">
                            <div style="color: #aaa; text-align: center; font-style: italic; font-size: 0.85em; padding: 10px 0;">Klicke auf 'Aktualisieren', um Elixir Queue anzuzeigen...</div>
                        </div>
                    </div>
`;

html = html.replace(targetSection, elixirSection + '\n' + targetSection);
fs.writeFileSync('index.html', html);
console.log("Added Elixir panel to index.html");
