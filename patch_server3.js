const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

code = code.replace(/db: db,/g, 'db: firestoreDb,');
code = code.replace(/startBackupScheduler\(db\);/g, 'startBackupScheduler(firestoreDb);');

fs.writeFileSync('server.js', code);
