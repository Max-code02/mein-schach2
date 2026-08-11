const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// We want to transform the hardcoded colored buttons into glass-colored classes.
// 27ae60 -> success, 2ecc71 -> success, 28a745 -> success
// 3498db -> primary, 2980b9 -> primary
// e74c3c -> danger, c0392b -> danger
// e67e22 -> warning, f39c12 -> warning, f1c40f -> warning
// 8e44ad -> purple, 9b59b6 -> purple
// 34495e -> generic/dark
// 222, 1a1a1a, etc. -> generic

const colorMap = [
    { regex: /background:\s*#(27ae60|2ecc71|28a745)/gi, class: 'glass-btn success' },
    { regex: /background:\s*#(3498db|2980b9)/gi, class: 'glass-btn primary' },
    { regex: /background:\s*#(e74c3c|c0392b|ff6b6b)/gi, class: 'glass-btn danger' },
    { regex: /background:\s*#(e67e22|f39c12|f1c40f)/gi, class: 'glass-btn warning' },
    { regex: /background:\s*#(8e44ad|9b59b6)/gi, class: 'glass-btn purple' },
    { regex: /background:\s*#(34495e|2c3e50|1a1a1a|222222|222|000|111)/gi, class: 'glass-btn' }
];

// First, for elements that have a button tag
html = html.replace(/<button([^>]*)>/gi, (match, attrs) => {
    let newAttrs = attrs;
    let addedClass = '';
    
    // Check if it has an inline background color
    for (let cm of colorMap) {
        if (cm.regex.test(newAttrs)) {
            addedClass = cm.class;
            // Remove the hardcoded background and border
            newAttrs = newAttrs.replace(cm.regex, '/*bg-removed*/');
            newAttrs = newAttrs.replace(/border:\s*none;?/gi, '');
            newAttrs = newAttrs.replace(/border:\s*1px solid [^;]+;?/gi, '');
            break;
        }
    }
    
    // Add glass-btn if not already there
    if (!addedClass) addedClass = 'glass-btn';
    
    if (newAttrs.includes('class="')) {
        newAttrs = newAttrs.replace(/class="/, `class="${addedClass} `);
    } else {
        newAttrs += ` class="${addedClass}"`;
    }
    
    return `<button${newAttrs}>`;
});

fs.writeFileSync('index.html', html);
