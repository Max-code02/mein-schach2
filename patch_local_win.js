const fs = require('fs');
let script = fs.readFileSync('script.js', 'utf8');

script = script.replace(/if \(\(myColor === "white" && winner === "Weiß"\) \|\| \(myColor === "black" && winner === "Schwarz"\)\) \{/g,
`if ((myColor === "white" && winner === "Weiß") || (myColor === "black" && winner === "Schwarz") || (typeof gameModeSelect !== 'undefined' && gameModeSelect && gameModeSelect.value === 'local')) {`);

fs.writeFileSync('script.js', script);
