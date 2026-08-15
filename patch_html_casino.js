const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const targetStr = '<div id="profile-coins" style="font-size: 1.1em; color: #2ecc71; font-weight: bold; background: rgba(46,204,113,0.1); padding: 4px 12px; border-radius: 20px; border: 1px solid rgba(46,204,113,0.3); margin-top: 5px;" title="COBOL Bank Coins">🏦 Coins: 1000</div>';

const htmlInsert = `
                        <div id="casino-panel" style="margin-top: 15px; display: flex; flex-direction: column; gap: 10px; background: rgba(230, 126, 34, 0.05); border: 1px solid rgba(230, 126, 34, 0.3); padding: 15px; border-radius: 10px;">
                            <span style="font-size: 1.1em; color: #e67e22; font-weight: bold; text-align: center;">🎰 COBOL Casino & Wetten</span>
                            <div style="font-size: 0.85em; color: #ccc; text-align: center; margin-bottom: 5px;">
                                Setze Coins für das nächste "Zufälliger Gegner" Spiel! Winner takes all.
                            </div>
                            
                            <div style="display: flex; justify-content: center; gap: 5px; flex-wrap: wrap;">
                                <button class="glass-btn casino-bet-btn active-bet" onclick="setCasinoBet(0)" style="padding: 5px 10px; border: 1px solid #7f8c8d; background: rgba(127,140,141,0.2); border-radius: 6px; cursor: pointer; color: white;">0</button>
                                <button class="glass-btn casino-bet-btn" onclick="setCasinoBet(50)" style="padding: 5px 10px; border: 1px solid #e67e22; background: rgba(230, 126, 34, 0.2); border-radius: 6px; cursor: pointer; color: white;">50</button>
                                <button class="glass-btn casino-bet-btn" onclick="setCasinoBet(100)" style="padding: 5px 10px; border: 1px solid #e67e22; background: rgba(230, 126, 34, 0.2); border-radius: 6px; cursor: pointer; color: white;">100</button>
                                <button class="glass-btn casino-bet-btn" onclick="setCasinoBet(250)" style="padding: 5px 10px; border: 1px solid #e67e22; background: rgba(230, 126, 34, 0.2); border-radius: 6px; cursor: pointer; color: white;">250</button>
                                <button class="glass-btn casino-bet-btn" onclick="setCasinoBet(500)" style="padding: 5px 10px; border: 1px solid #e67e22; background: rgba(230, 126, 34, 0.2); border-radius: 6px; cursor: pointer; color: white;">500</button>
                                <button class="glass-btn casino-bet-btn" onclick="setCasinoBet(1000)" style="padding: 5px 10px; border: 1px solid #e74c3c; background: rgba(231, 76, 60, 0.2); border-radius: 6px; cursor: pointer; color: white;">1000 💎</button>
                            </div>
                            
                            <div style="text-align: center; font-size: 0.9em; margin-top: 5px;">
                                Aktueller Einsatz: <strong id="current-bet-display" style="color: #e67e22;">0 Coins</strong>
                            </div>
                            
                            <style>
                                .active-bet {
                                    box-shadow: 0 0 10px #e67e22;
                                    transform: scale(1.05);
                                }
                            </style>
                        </div>
`;

html = html.replace(targetStr, targetStr + "\n" + htmlInsert);
fs.writeFileSync('index.html', html);
console.log("Patched index.html for Casino UI");
