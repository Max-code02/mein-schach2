const fs = require('fs');
let code = fs.readFileSync('script.js', 'utf8');

const resetGameRegex = /function resetGame\(\) \{([\s\S]*?)history = \[\];/;
code = code.replace(resetGameRegex, (match, p1) => {
    return 'function resetGame() {\n' +
    '    const gameModeSelect = document.getElementById("gameMode");\n' +
    '    if (gameModeSelect && (gameModeSelect.value === "random" || gameModeSelect.value === "online" || gameModeSelect.value === "bot")) {\n' +
    '        gameModeSelect.value = "local";\n' +
    '        const timeCtrl = document.getElementById("time-control-container");\n' +
    '        if (timeCtrl) timeCtrl.style.display = "block";\n' +
    '        const botDiff = document.getElementById("bot-difficulty-container");\n' +
    '        if (botDiff) botDiff.style.display = "none";\n' +
    '    }\n' + p1 + 'history = [];';
});

const gameStartRegex = /if \(data\.type === 'gameStart'\) \{([\s\S]*?)addChat\("System", "🎮 Spiel gestartet /;
code = code.replace(gameStartRegex, (match, p1) => {
    return "if (data.type === 'gameStart') {" + p1 + 
           "            if (typeof window.switchSidebarTab === 'function') {\n" +
           "                const chatBtn = document.querySelectorAll('.sidebar-tab-btn')[2];\n" +
           "                if (chatBtn) window.switchSidebarTab('tab-chat', chatBtn);\n" +
           "            }\n" +
           "            addChat(\"System\", \"🎮 Spiel gestartet ";
});

fs.writeFileSync('script.js', code);
