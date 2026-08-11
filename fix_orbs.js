const fs = require('fs');
let css = fs.readFileSync('style.css', 'utf8');

css = css.replace(/\.bg-grid\s*\{[\s\S]*?\}/, `.bg-grid {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: -1;
    background-image: 
        linear-gradient(rgba(255, 255, 255, 0.07) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.07) 1px, transparent 1px);
    background-size: 40px 40px;
    pointer-events: none;
    perspective: 1000px;
    transform: scale(1.1);
    animation: gridPulse 8s infinite alternate;
}`);

css = css.replace(/\.glow-orb\s*\{[\s\S]*?\}/, `.glow-orb {
    position: absolute;
    border-radius: 50%;
    opacity: 0.9;
    animation: floatOrb 20s infinite ease-in-out alternate;
    pointer-events: none;
    mix-blend-mode: screen;
}`);

css = css.replace(/\.orb-1\s*\{[\s\S]*?\}/, `.orb-1 {
    width: 60vw;
    height: 60vw;
    min-width: 400px;
    min-height: 400px;
    background: radial-gradient(circle, rgba(142,68,173,0.8) 0%, transparent 70%);
    top: -10%;
    left: -10%;
    animation-delay: 0s;
}`);

css = css.replace(/\.orb-2\s*\{[\s\S]*?\}/, `.orb-2 {
    width: 70vw;
    height: 70vw;
    min-width: 500px;
    min-height: 500px;
    background: radial-gradient(circle, rgba(41,128,185,0.7) 0%, transparent 70%);
    bottom: -20%;
    right: -10%;
    animation-delay: -5s;
    animation-duration: 25s;
}`);

css = css.replace(/\.orb-3\s*\{[\s\S]*?\}/, `.orb-3 {
    width: 50vw;
    height: 50vw;
    min-width: 350px;
    min-height: 350px;
    background: radial-gradient(circle, rgba(231,76,60,0.6) 0%, transparent 70%);
    top: 40%;
    left: 30%;
    animation-delay: -10s;
    animation-duration: 18s;
}`);

css = css.replace(/\.orb-4\s*\{[\s\S]*?\}/, `.orb-4 {
    width: 55vw;
    height: 55vw;
    min-width: 350px;
    min-height: 350px;
    background: radial-gradient(circle, rgba(39,174,96,0.5) 0%, transparent 70%);
    top: 20%;
    right: 10%;
    animation-delay: -2s;
    animation-duration: 22s;
}`);

fs.writeFileSync('style.css', css);
