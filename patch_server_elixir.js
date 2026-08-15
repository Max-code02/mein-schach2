const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const targetString = "if (data.type === 'get_admin_tickets') {";

const addHandler = `if (data.type === 'get_admin_elixir') {
                const q = elixirMatchQueue.map(p => ({ playerName: p.playerName, timeControl: p.timeControl }));
                ws.send(JSON.stringify({
                    type: 'admin_elixir_update',
                    queue: q
                }));
                return;
            }

            `;

code = code.replace(targetString, addHandler + targetString);
fs.writeFileSync('server.js', code);
console.log("Patched server.js with get_admin_elixir!");
