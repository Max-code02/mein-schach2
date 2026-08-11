const fs = require('fs');
let script = fs.readFileSync('script.js', 'utf8');

const str = `window.downloadReplay = downloadReplay;
    }
    
    const joinBtn = document.getElementById('join-custom-lobby-btn');
    if (joinBtn) {
        joinBtn.addEventListener('click', () => {
            const lobbyName = prompt("Gib den Namen der privaten Lobby ein:");
            if (!lobbyName) return;
            const password = prompt("Gib das Passwort für '" + lobbyName + "' ein (oder lass es leer, wenn es keins gibt):");
            
            socket.send(JSON.stringify({ type: 'join_custom_lobby', lobbyName, password }));
        });
    }
});`;

script = script.replace(str, 'window.downloadReplay = downloadReplay;');

fs.writeFileSync('script.js', script);
