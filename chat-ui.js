// chat-ui.js - Externalized UI & WebGL background controller for chat.html (Strict Nonce CSP)

(function() {
    'use strict';

    function acceptAGB() {
        try { localStorage.setItem('agbAkzeptiert', 'true'); } catch (e) {}
        const popup = document.getElementById('agb-popup');
        if (popup) popup.style.display = 'none';
    }
    window.acceptAGB = acceptAGB;

    function initChatPageUI() {
        const popup = document.getElementById('agb-popup');
        const agbBtn = document.getElementById('acceptAgbBtn');
        if (agbBtn) {
            agbBtn.addEventListener('click', acceptAGB);
        }

        try {
            if (!localStorage.getItem('agbAkzeptiert') && popup) {
                popup.style.display = 'flex';
            }
            const savedName = localStorage.getItem('playerName');
            if (savedName) {
                const pill = document.getElementById('headerPlayerPill');
                if (pill) pill.textContent = '👤 ' + savedName;
            }
        } catch (e) {}
    }

    function initWebGLBackground() {
        const canvas = document.getElementById('glCanvas');
        if (!canvas) return;
        const gl = canvas.getContext('webgl');
        if (!gl) return;

        const fragmentShaderSrc = [
            'precision highp float;',
            'uniform float time;',
            'uniform vec2 resolution;',
            'float wave(vec2 p, float t) {',
            '    return sin(p.x * 5.0 + t) + sin((p.y + t) * 0.5);',
            '}',
            'void main() {',
            '    vec2 uv = gl_FragCoord.xy / resolution.xy;',
            '    vec2 p = -1.0 + 2.0 * uv;',
            '    p.x *= resolution.x / resolution.y;',
            '    float t = time * 0.2;',
            '    float v = wave(p, t);',
            '    vec3 color = vec3(0.02, 0.05, 0.15) + 0.05 * sin(v + vec3(0.0, 2.0, 4.0));',
            '    gl_FragColor = vec4(color, 1.0);',
            '}'
        ].join('\n');

        const vs = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vs, 'attribute vec4 p; void main(){gl_Position=p;}');
        gl.compileShader(vs);

        const fs = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fs, fragmentShaderSrc);
        gl.compileShader(fs);

        const prog = gl.createProgram();
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        gl.linkProgram(prog);
        gl.useProgram(prog);

        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

        const pLoc = gl.getAttribLocation(prog, 'p');
        gl.enableVertexAttribArray(pLoc);
        gl.vertexAttribPointer(pLoc, 2, gl.FLOAT, false, 0, 0);

        const tLoc = gl.getUniformLocation(prog, 'time');
        const rLoc = gl.getUniformLocation(prog, 'resolution');

        function render(now) {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.uniform1f(tLoc, now * 0.001);
            gl.uniform2f(rLoc, canvas.width, canvas.height);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
            requestAnimationFrame(render);
        }
        requestAnimationFrame(render);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initChatPageUI();
            initWebGLBackground();
        });
    } else {
        initChatPageUI();
        initWebGLBackground();
    }
})();
