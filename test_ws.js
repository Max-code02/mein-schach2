const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:3000');
ws.on('open', () => {
    ws.send(JSON.stringify({ type: 'chat', text: '/help Admina111' }));
    setTimeout(() => process.exit(0), 1000);
});
ws.on('message', (msg) => {
    console.log("RECEIVED:", msg.toString());
});
