const { db } = require('./src/db/index.ts');
console.log(db ? "DB loaded" : "DB failed");
