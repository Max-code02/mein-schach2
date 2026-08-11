const fs = require('fs');

// Fix style.css
let css = fs.readFileSync('style.css', 'utf8');

css = css.replace(/\.glass-panel\s*\{[\s\S]*?\}/, `.glass-panel {
    background: rgba(10, 10, 15, 0.15);
    backdrop-filter: blur(4px) saturate(110%);
    -webkit-backdrop-filter: blur(4px) saturate(110%);
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

css = css.replace(/\.top-header\s*\{[\s\S]*?\}/, `.top-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(10, 10, 15, 0.15);
    backdrop-filter: blur(6px) saturate(110%);
    -webkit-backdrop-filter: blur(6px) saturate(110%);
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    padding: 10px 25px;
    width: 100%;
    box-sizing: border-box;
    position: sticky;
    top: 0;
    z-index: 1000;
    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.3);
}`);

css = css.replace(/#chat-container\s*\{[\s\S]*?\}/, `#chat-container {
    height: 380px;
    background: rgba(10, 10, 15, 0.15);
    backdrop-filter: blur(4px) saturate(110%);
    -webkit-backdrop-filter: blur(4px) saturate(110%);
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-top: 1px solid rgba(255, 255, 255, 0.3);
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.4);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
}`);

css = css.replace(/\.glass-panel:hover\s*\{[\s\S]*?\}/g, `.glass-panel:hover {
    background: rgba(20, 20, 30, 0.25);
    border-color: rgba(255, 255, 255, 0.3);
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.6);
}`);

fs.writeFileSync('style.css', css);

// Fix index.html
let html = fs.readFileSync('index.html', 'utf8');
html = html.replace(/\.modal-box\s*\{[\s\S]*?\}/, `.modal-box {
    background: rgba(10, 10, 15, 0.2);
    backdrop-filter: blur(6px) saturate(110%);
    -webkit-backdrop-filter: blur(6px) saturate(110%);
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

html = html.replace(/background:\s*rgba\(20,\s*20,\s*30,\s*0\.6\);\s*backdrop-filter:\s*blur\(20px\)/g, "background: rgba(10, 10, 15, 0.2); backdrop-filter: blur(6px)");

fs.writeFileSync('index.html', html);
