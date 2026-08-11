const fs = require('fs');
let css = fs.readFileSync('style.css', 'utf8');

const glassCSS = `
/* --- EXTENDED GLASS COMPONENTS (Inputs, Selects, Buttons) --- */
input[type="text"], input[type="password"], input[type="email"], select, textarea, .glass-input {
    background: rgba(10, 10, 15, 0.2) !important;
    backdrop-filter: blur(4px) saturate(110%);
    -webkit-backdrop-filter: blur(4px) saturate(110%);
    border: 1px solid rgba(255, 255, 255, 0.15) !important;
    border-top: 1px solid rgba(255, 255, 255, 0.3) !important;
    border-left: 1px solid rgba(255, 255, 255, 0.2) !important;
    border-radius: 8px;
    padding: 10px;
    color: white !important;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

input:focus, select:focus, textarea:focus {
    outline: none;
    background: rgba(20, 20, 30, 0.3) !important;
    border-color: rgba(255, 255, 255, 0.4) !important;
    box-shadow: 0 0 15px rgba(255, 255, 255, 0.1), inset 0 0 10px rgba(255,255,255,0.05);
}

.glass-btn, button {
    background: rgba(255, 255, 255, 0.05) !important;
    backdrop-filter: blur(4px) saturate(110%);
    -webkit-backdrop-filter: blur(4px) saturate(110%);
    border: 1px solid rgba(255, 255, 255, 0.15) !important;
    border-top: 1px solid rgba(255, 255, 255, 0.3) !important;
    border-left: 1px solid rgba(255, 255, 255, 0.2) !important;
    border-radius: 8px;
    color: white !important;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    font-weight: bold;
    text-shadow: 0 1px 2px rgba(0,0,0,0.5);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    margin: 2px;
}

.glass-btn:hover, button:hover {
    background: rgba(255, 255, 255, 0.15) !important;
    border-color: rgba(255, 255, 255, 0.3) !important;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
    transform: translateY(-2px);
}

.glass-btn:active, button:active {
    transform: translateY(1px);
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}

/* Colored Glass Modifiers */
.glass-btn.primary { background: rgba(52, 152, 219, 0.2) !important; border-color: rgba(52, 152, 219, 0.4) !important; border-top-color: rgba(52, 152, 219, 0.6) !important; }
.glass-btn.primary:hover { background: rgba(52, 152, 219, 0.4) !important; box-shadow: 0 4px 15px rgba(52, 152, 219, 0.4); }

.glass-btn.success { background: rgba(46, 204, 113, 0.2) !important; border-color: rgba(46, 204, 113, 0.4) !important; border-top-color: rgba(46, 204, 113, 0.6) !important; }
.glass-btn.success:hover { background: rgba(46, 204, 113, 0.4) !important; box-shadow: 0 4px 15px rgba(46, 204, 113, 0.4); }

.glass-btn.danger { background: rgba(231, 76, 60, 0.2) !important; border-color: rgba(231, 76, 60, 0.4) !important; border-top-color: rgba(231, 76, 60, 0.6) !important; }
.glass-btn.danger:hover { background: rgba(231, 76, 60, 0.4) !important; box-shadow: 0 4px 15px rgba(231, 76, 60, 0.4); }

.glass-btn.warning { background: rgba(241, 196, 15, 0.2) !important; border-color: rgba(241, 196, 15, 0.4) !important; border-top-color: rgba(241, 196, 15, 0.6) !important; }
.glass-btn.warning:hover { background: rgba(241, 196, 15, 0.4) !important; box-shadow: 0 4px 15px rgba(241, 196, 15, 0.4); }

.glass-btn.purple { background: rgba(142, 68, 173, 0.2) !important; border-color: rgba(142, 68, 173, 0.4) !important; border-top-color: rgba(142, 68, 173, 0.6) !important; }
.glass-btn.purple:hover { background: rgba(142, 68, 173, 0.4) !important; box-shadow: 0 4px 15px rgba(142, 68, 173, 0.4); }

/* Make chat bubbles glass too */
.chat-msg {
    background: rgba(255, 255, 255, 0.05) !important;
    backdrop-filter: blur(4px);
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    border-radius: 8px !important;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
}

.chat-msg.system {
    background: rgba(241, 196, 15, 0.15) !important;
    border-color: rgba(241, 196, 15, 0.3) !important;
}

.chat-msg.me {
    background: rgba(52, 152, 219, 0.2) !important;
    border-color: rgba(52, 152, 219, 0.4) !important;
}

/* Sidebar Tab buttons */
.sidebar-tab-btn {
    background: rgba(255, 255, 255, 0.05) !important;
    border-bottom: 2px solid transparent !important;
    border-radius: 8px 8px 0 0 !important;
}
.sidebar-tab-btn.active {
    background: rgba(255, 255, 255, 0.15) !important;
    border-bottom: 2px solid #3498db !important;
    box-shadow: inset 0 -2px 10px rgba(52, 152, 219, 0.2);
}
`;

fs.writeFileSync('style.css', css + '\n' + glassCSS);
