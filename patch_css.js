const fs = require('fs');
let css = fs.readFileSync('style.css', 'utf8');

// Modify body background
css = css.replace(/body\s*\{[\s\S]*?\}/, (match) => {
    return match.replace(/background:.*?;/, 'background: transparent;');
});

const newCss = `
/* --- EXTREME ANIMATED BACKGROUND --- */
.bg-animations {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: -2;
    overflow: hidden;
    background: #0f0c29;
    background: linear-gradient(135deg, #050505, #1a1025, #0a1128, #050505);
    background-size: 400% 400%;
    animation: gradientShift 15s ease infinite;
}

.bg-grid {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: -1;
    background-image: 
        linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
    background-size: 50px 50px;
    pointer-events: none;
    perspective: 1000px;
    transform: scale(1.1);
    animation: gridPulse 8s infinite alternate;
}

.glow-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(90px);
    opacity: 0.6;
    animation: floatOrb 20s infinite ease-in-out alternate;
    pointer-events: none;
}

.orb-1 {
    width: 450px;
    height: 450px;
    background: #8e44ad;
    top: -10%;
    left: -10%;
    animation-delay: 0s;
}

.orb-2 {
    width: 550px;
    height: 550px;
    background: #2980b9;
    bottom: -20%;
    right: -10%;
    animation-delay: -5s;
    animation-duration: 25s;
}

.orb-3 {
    width: 350px;
    height: 350px;
    background: #e74c3c;
    top: 50%;
    left: 40%;
    animation-delay: -10s;
    animation-duration: 18s;
}

.orb-4 {
    width: 300px;
    height: 300px;
    background: #27ae60;
    top: 20%;
    right: 20%;
    animation-delay: -2s;
    animation-duration: 22s;
}

@keyframes gradientShift {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
}

@keyframes floatOrb {
    0% { transform: translate(0, 0) scale(1); }
    33% { transform: translate(120px, -120px) scale(1.15); }
    66% { transform: translate(-80px, 150px) scale(0.85); }
    100% { transform: translate(0, 0) scale(1); }
}

@keyframes gridPulse {
    0% { opacity: 0.5; }
    100% { opacity: 1; }
}
`;

fs.writeFileSync('style.css', css + '\n' + newCss);
