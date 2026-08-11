const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const bgHtml = `
    <!-- Extreme Animated Background -->
    <div class="bg-animations">
        <div class="glow-orb orb-1"></div>
        <div class="glow-orb orb-2"></div>
        <div class="glow-orb orb-3"></div>
        <div class="glow-orb orb-4"></div>
    </div>
    <div class="bg-grid"></div>
`;

if (!html.includes('class="bg-animations"')) {
    html = html.replace('<body>', '<body>' + bgHtml);
    fs.writeFileSync('index.html', html);
}
