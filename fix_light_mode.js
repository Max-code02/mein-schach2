const fs = require('fs');
let css = fs.readFileSync('style.css', 'utf8');

const lightModeFix = `
/* Light Mode Glass overrides */
body.light-mode input[type="text"], body.light-mode input[type="password"], body.light-mode input[type="email"], body.light-mode select, body.light-mode textarea, body.light-mode .glass-input {
    background: rgba(255, 255, 255, 0.6) !important;
    border-color: rgba(0, 0, 0, 0.15) !important;
    color: #333 !important;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
}

body.light-mode input:focus, body.light-mode select:focus, body.light-mode textarea:focus {
    background: rgba(255, 255, 255, 0.9) !important;
    border-color: rgba(52, 152, 219, 0.5) !important;
}

body.light-mode .glass-btn, body.light-mode button {
    background: rgba(255, 255, 255, 0.7) !important;
    border-color: rgba(0, 0, 0, 0.1) !important;
    color: #333 !important;
    text-shadow: none;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

body.light-mode .glass-btn:hover, body.light-mode button:hover {
    background: rgba(255, 255, 255, 0.95) !important;
    border-color: rgba(0, 0, 0, 0.2) !important;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

/* Light mode specific colored glass buttons */
body.light-mode .glass-btn.primary { background: rgba(52, 152, 219, 0.2) !important; color: #2980b9 !important; border-color: rgba(52, 152, 219, 0.4) !important; }
body.light-mode .glass-btn.primary:hover { background: rgba(52, 152, 219, 0.3) !important; }

body.light-mode .glass-btn.success { background: rgba(46, 204, 113, 0.2) !important; color: #27ae60 !important; border-color: rgba(46, 204, 113, 0.4) !important; }
body.light-mode .glass-btn.success:hover { background: rgba(46, 204, 113, 0.3) !important; }

body.light-mode .glass-btn.danger { background: rgba(231, 76, 60, 0.2) !important; color: #c0392b !important; border-color: rgba(231, 76, 60, 0.4) !important; }
body.light-mode .glass-btn.danger:hover { background: rgba(231, 76, 60, 0.3) !important; }

body.light-mode .glass-btn.warning { background: rgba(241, 196, 15, 0.2) !important; color: #b9770e !important; border-color: rgba(241, 196, 15, 0.4) !important; }
body.light-mode .glass-btn.warning:hover { background: rgba(241, 196, 15, 0.3) !important; }

body.light-mode .glass-btn.purple { background: rgba(142, 68, 173, 0.2) !important; color: #8e44ad !important; border-color: rgba(142, 68, 173, 0.4) !important; }
body.light-mode .glass-btn.purple:hover { background: rgba(142, 68, 173, 0.3) !important; }

body.light-mode .chat-msg {
    background: rgba(0, 0, 0, 0.03) !important;
    border-color: rgba(0, 0, 0, 0.05) !important;
}
body.light-mode .chat-msg.me {
    background: rgba(52, 152, 219, 0.1) !important;
}
body.light-mode .chat-msg.system {
    background: rgba(241, 196, 15, 0.15) !important;
}

body.light-mode .sidebar-tab-btn {
    background: rgba(0, 0, 0, 0.05) !important;
    color: #333 !important;
}
body.light-mode .sidebar-tab-btn.active {
    background: rgba(255, 255, 255, 0.9) !important;
    color: #3498db !important;
}
`;

fs.writeFileSync('style.css', css + '\n' + lightModeFix);
