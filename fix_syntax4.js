const fs = require('fs');
let script = fs.readFileSync('script.js', 'utf8');

// just cut from "window.downloadReplay = downloadReplay;" to "window.isChessMode = false;"
const idx1 = script.indexOf("window.downloadReplay = downloadReplay;");
const idx2 = script.indexOf("window.isChessMode = false;");

if (idx1 !== -1 && idx2 !== -1) {
    script = script.substring(0, idx1 + "window.downloadReplay = downloadReplay;".length) + "\n" + script.substring(idx2);
}

fs.writeFileSync('script.js', script);
