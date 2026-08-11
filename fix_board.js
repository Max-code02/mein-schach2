const fs = require('fs');
let css = fs.readFileSync('style.css', 'utf8');

css = css.replace(/#chess-board\s*\{[\s\S]*?\}/, `#chess-board { 
    display: grid; grid-template-columns: repeat(8, 65px); grid-template-rows: repeat(8, 65px); 
    border: 10px solid rgba(255, 255, 255, 0.15); border-radius: 8px;
    background: rgba(10, 10, 15, 0.3);
    backdrop-filter: blur(8px) saturate(120%);
    -webkit-backdrop-filter: blur(8px) saturate(120%);
    box-shadow: 0 20px 60px rgba(0,0,0,0.6), 0 0 30px rgba(255, 255, 255, 0.1), inset 0 0 20px rgba(0,0,0,0.5);
    transition: transform 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}`);

fs.writeFileSync('style.css', css);
