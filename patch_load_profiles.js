const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const target = `                    level: Number(data.level) || 1,
                    ip_address: data.ip_address || "",`;
const replacement = `                    level: Number(data.level) || 1,
                    coins: data.coins !== undefined ? Number(data.coins) : 1000,
                    ip_address: data.ip_address || "",`;

code = code.replace(target, replacement);
fs.writeFileSync('server.js', code);
console.log("Patched loadFirestoreProfiles for coins");
