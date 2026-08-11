const fs = require('fs');
let code = fs.readFileSync('script.js', 'utf8');

code = code.replace(/function resetGame\(\) \{/, 'function resetGame() {\n    if (typeof window.switchSidebarTab === "function") {\n        const gameBtn = document.querySelectorAll(".sidebar-tab-btn")[0];\n        if (gameBtn) window.switchSidebarTab("tab-game", gameBtn);\n    }');

fs.writeFileSync('script.js', code);
