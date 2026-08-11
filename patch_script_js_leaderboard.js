const fs = require('fs');

let script = fs.readFileSync('script.js', 'utf8');

script = script.replace(/if \(data\.type === 'leaderboard'\) \{[\s\S]*?return;\s*\}/m, 
`if (data.type === 'leaderboard') {
            const listEl = document.getElementById('leaderboard-list');
            if (listEl && Array.isArray(data.list)) {
                // script2.js has a nicer rendering, so let's let script2.js handle it if it exists.
                // If not, we do a nice fallback:
                if (typeof window.script2Loaded === 'undefined') {
                    listEl.innerHTML = data.list.map((p, i) => {
                        let badge = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
                        let color = i === 0 ? '#f1c40f' : i === 1 ? '#bdc3c7' : i === 2 ? '#cd7f32' : 'rgba(255,255,255,0.7)';
                        let bg = i === 0 ? 'linear-gradient(135deg, rgba(241,196,15,0.2) 0%, rgba(0,0,0,0) 100%)' : 'rgba(255,255,255,0.03)';
                        return \`
                        <div style="background: \${bg}; padding: 12px; border-radius: 10px; margin-bottom: 8px; border: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: space-between; transition: 0.2s;" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <div style="width: 24px; text-align: center; font-weight: bold; color: \${color}; font-size: 1.1em;">
                                    \${badge || \`#\${i + 1}\`}
                                </div>
                                <div style="display: flex; flex-direction: column;">
                                    <strong style="color: white; font-size: 1.05em; text-shadow: 0 1px 3px rgba(0,0,0,0.5);">\${p.name}</strong>
                                    <span style="color: #95a5a6; font-size: 0.8em;">Lvl \${p.level || 1} • Elo: \${p.elo || 1200}</span>
                                </div>
                            </div>
                            <div style="text-align: right;">
                                <div style="color: #f1c40f; font-weight: bold; font-size: 1.1em;">\${p.wins || 0} 🏆</div>
                                <div style="color: #ccc; font-size: 0.7em;">Siege</div>
                            </div>
                        </div>\`;
                    }).join('');
                }
            }
            return;
        }`);

fs.writeFileSync('script.js', script);
