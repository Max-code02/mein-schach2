const fs = require('fs');
let code = fs.readFileSync('script.js', 'utf8');

code = code.replace(/document\.getElementById\("server-status"\)\.innerHTML = "🟢 Verbunden";/g, 'document.getElementById("server-status").innerHTML = "⚢ Verbunden mit Elixir";');
code = code.replace(/document\.getElementById\('server-status'\)\.innerText = "🟢 Verbunden";/g, 'document.getElementById(\'server-status\').innerText = "⚢ Verbunden mit Elixir";');

// Update Random opponent string
code = code.replace(/"Suche nach einem zufälligen Gegner..."/g, '"⚢ Elixir Hub sucht nach einem Gegner..."');
code = code.replace(/"Suche nach einem zufälligen Gegner..."/g, '"⚢ Elixir Hub sucht nach einem Gegner..."');

fs.writeFileSync('script.js', code);
console.log("Patched script.js!");
