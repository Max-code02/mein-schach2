const { db } = require('./src/db/index.js');
const schema = require('./src/db/schema.js');

async function clearBans() {
    try {
        await db.delete(schema.ipBan);
        console.log("Deleted all ip_bans");

        await db.update(schema.players).set({ is_banned: false, ip_ban: false });
        console.log("Unbanned all players");

        const fs = require('fs');
        if (fs.existsSync('bans.json')) {
            fs.writeFileSync('bans.json', '[]');
        }
    } catch (e) {
        console.error(e);
    }
}
clearBans();
