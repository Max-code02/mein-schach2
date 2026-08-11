const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// Replace semi-transparent black backgrounds with glass panels
html = html.replace(/background:\s*rgba\(0,0,0,0\.[2-9]\);/g, 'background: rgba(10, 10, 15, 0.15); backdrop-filter: blur(4px) saturate(110%); -webkit-backdrop-filter: blur(4px) saturate(110%); border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: 0 4px 15px rgba(0,0,0,0.2);');

// Fix leaderboard highlighting to not clash
html = html.replace(/background:\s*#222/g, 'background: transparent');

// Make the daily streak pill look like glass
html = html.replace(/background:\s*rgba\(231,\s*76,\s*60,\s*0\.2\)/g, 'background: rgba(231, 76, 60, 0.15); backdrop-filter: blur(4px)');

fs.writeFileSync('index.html', html);
