const fs = require('fs');
let css = fs.readFileSync('style.css', 'utf8');

// 1. Fix default board square colors to be glass
css = css.replace(/--board-white:\s*#f0d9b5;/, '--board-white: rgba(255, 255, 255, 0.15);');
css = css.replace(/--board-black:\s*#b58863;/, '--board-black: rgba(0, 0, 0, 0.25);');

// 2. Reduce blur on glass panels down to 2px, and lower opacity
css = css.replace(/backdrop-filter:\s*blur\([46]px\)\s*saturate\(110%\);/g, 'backdrop-filter: blur(2px) saturate(110%);');
css = css.replace(/-webkit-backdrop-filter:\s*blur\([46]px\)\s*saturate\(110%\);/g, '-webkit-backdrop-filter: blur(2px) saturate(110%);');
css = css.replace(/background:\s*rgba\(10,\s*10,\s*15,\s*0\.15\);/g, 'background: rgba(10, 10, 15, 0.05);');

// 3. Make chat-container more transparent
css = css.replace(/#chat-container \{\s*(?:[^{}]*|\{[^{}]*\})*\}/g, match => {
    return match.replace(/background:\s*rgba\(10,\s*10,\s*15,\s*0\.15\);/, 'background: rgba(10, 10, 15, 0.05);');
});

// 4. Update the board wrapper to have less blur too
css = css.replace(/#chess-board \{[\s\S]*?\}/, match => {
    let newMatch = match.replace(/blur\(8px\)/g, 'blur(2px)');
    newMatch = newMatch.replace(/rgba\(10, 10, 15, 0\.3\)/g, 'rgba(10, 10, 15, 0.05)');
    return newMatch;
});

// 5. Update inputs and buttons to have very subtle glass
css = css.replace(/background:\s*rgba\(10,\s*10,\s*15,\s*0\.2\)\s*!important;/g, 'background: rgba(10, 10, 15, 0.05) !important;');
css = css.replace(/background:\s*rgba\(255,\s*255,\s*255,\s*0\.05\)\s*!important;/g, 'background: rgba(255, 255, 255, 0.02) !important;');
css = css.replace(/box-shadow:\s*0\s*8px\s*32px\s*0\s*rgba\(0,\s*0,\s*0,\s*0\.4\);/g, 'box-shadow: 0 4px 15px 0 rgba(0, 0, 0, 0.2);');

fs.writeFileSync('style.css', css);

// Fix index.html modal background blur
let html = fs.readFileSync('index.html', 'utf8');
html = html.replace(/blur\([468]px\)/g, 'blur(2px)');
html = html.replace(/rgba\(10, 10, 15, 0\.15\)/g, 'rgba(10, 10, 15, 0.05)');
html = html.replace(/rgba\(10, 10, 15, 0\.2\)/g, 'rgba(10, 10, 15, 0.05)');
fs.writeFileSync('index.html', html);

