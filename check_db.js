const { db } = require('./src/db/index.js');
const schema = require('./src/db/schema.js');

async function check() {
    console.log(await db.select().from(schema.ipBan));
    console.log(await db.select().from(schema.players));
}
check();
