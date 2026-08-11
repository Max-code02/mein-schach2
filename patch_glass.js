const fs = require('fs');
let css = fs.readFileSync('style.css', 'utf8');

// Replace .glass-panel
css = css.replace(/\.glass-panel\s*\{[\s\S]*?\}/, `.glass-panel {
    background: rgba(20, 20, 30, 0.4);
    backdrop-filter: blur(16px) saturate(120%);
    -webkit-backdrop-filter: blur(16px) saturate(120%);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-top: 1px solid rgba(255, 255, 255, 0.3);
    border-left: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 16px;
    padding: 16px;
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.4);
    position: relative;
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    color: #fff;
}`);

// Replace .top-header
css = css.replace(/\.top-header\s*\{[\s\S]*?\}/, `.top-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(10, 10, 20, 0.4);
    backdrop-filter: blur(24px) saturate(150%);
    -webkit-backdrop-filter: blur(24px) saturate(150%);
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    padding: 10px 25px;
    width: 100%;
    box-sizing: border-box;
    position: sticky;
    top: 0;
    z-index: 1000;
    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.3);
}`);

// Replace #chat-container
css = css.replace(/#chat-container\s*\{[\s\S]*?\}/, `#chat-container {
    height: 380px;
    background: rgba(20, 20, 30, 0.4);
    backdrop-filter: blur(16px) saturate(120%);
    -webkit-backdrop-filter: blur(16px) saturate(120%);
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-top: 1px solid rgba(255, 255, 255, 0.3);
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.4);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
}`);

// Inject extreme glass hover
css += `
.glass-panel:hover {
    background: rgba(30, 30, 45, 0.5);
    border-color: rgba(255, 255, 255, 0.3);
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.6);
}
`;

fs.writeFileSync('style.css', css);

// Now index.html modals
let html = fs.readFileSync('index.html', 'utf8');
html = html.replace(/\.modal-box\s*\{[\s\S]*?\}/, `.modal-box {
    background: rgba(20, 20, 30, 0.6);
    backdrop-filter: blur(20px) saturate(150%);
    -webkit-backdrop-filter: blur(20px) saturate(150%);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-top: 1px solid rgba(255, 255, 255, 0.4);
    border-left: 1px solid rgba(255, 255, 255, 0.3);
    padding: 30px;
    border-radius: 20px;
    width: 90%;
    max-width: 400px;
    text-align: center;
    box-shadow: 0 8px 32px 0 rgba(0,0,0,0.5);
    color: white;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    position: relative;
}`);

// Also fix hardcoded inline styles in features modal that might override glass
html = html.replace(/background:\s*#1a1a1a;/g, "background: rgba(20, 20, 30, 0.6); backdrop-filter: blur(20px) saturate(150%); -webkit-backdrop-filter: blur(20px) saturate(150%); border: 1px solid rgba(255,255,255,0.2);");
html = html.replace(/background:\s*rgba\(0,\s*0,\s*0,\s*0\.85\);/g, "background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(8px);");

fs.writeFileSync('index.html', html);
