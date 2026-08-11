const fs = require('fs');
let script = fs.readFileSync('script.js', 'utf8');

script = script.replace(/function loadChatHistory\(\) \{\n    if \(socket && socket\.readyState === WebSocket\.OPEN\) \{\n        socket\.send\(JSON\.stringify\(\{ type: 'get_chat_history' \}\)\);\n    \}\n\}\n\}/,
`function loadChatHistory() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'get_chat_history' }));
    }
}`);

fs.writeFileSync('script.js', script);
