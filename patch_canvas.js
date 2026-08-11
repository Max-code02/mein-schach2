const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// replace canvas with nothing
html = html.replace(/<canvas id="glCanvas"[^>]*><\/canvas>/, '');
// replace the fragment shader
html = html.replace(/<script id="fragmentShader" type="x-shader\/x-fragment">[\s\S]*?<\/script>/, '');
// replace the WebGL script
html = html.replace(/<script>\s*\(\s*function\(\)\s*\{\s*const canvas = document\.getElementById\('glCanvas'\);[\s\S]*?\}\s*\)\(\);\s*<\/script>/, '');

fs.writeFileSync('index.html', html);
