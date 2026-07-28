const { isSpamming } = require('./antispam.js');
const ws = { send: (msg) => console.log(msg), readyState: 1 };
isSpamming(ws, " /help Admina111");
isSpamming(ws, "!help");
