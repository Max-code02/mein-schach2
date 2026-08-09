const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const oldNamesRegex = /const ghostNames = \[.*?\];/;
const newNames = `const ghostNames = ["luca_99", "SchachMatt123", "JulianB", "Felix_M", "Anna_Chess", "alex88", "MariusK", "PawnStar", "max_gamer", "ChessPro_01", "Lena_22"];`;
code = code.replace(oldNamesRegex, newNames);

const oldSentencesRegex = /const ghostSentences = \[.*?\];/;
const newSentences = `const ghostSentences = ["hi", "moin", "gl hf", "hi :)", "viel glück", "hallo"];`;
code = code.replace(oldSentencesRegex, newSentences);

fs.writeFileSync('server.js', code);
