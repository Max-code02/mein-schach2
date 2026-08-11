const fs = require('fs');

let script2 = fs.readFileSync('script2.js', 'utf8');

script2 = script2.replace(/<div style="color: #f1c40f; font-weight: bold; font-size: 1\.1em;">\$\{p\.wins \|\| 0\} 🏆<\/div>/, 
`<div style="color: #f1c40f; font-weight: bold; font-size: 1.1em;">\${p.wins || 0} 🏆</div>
                                        <div style="color: #ccc; font-size: 0.7em;">Siege</div>`);

fs.writeFileSync('script2.js', script2);
