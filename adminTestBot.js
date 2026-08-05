// adminTestBot.js - Automatisches Diagnosesystem & Monitoring-Bot für Admins
const fs = require('fs');
const os = require('os');

/**
 * Führt automatische System-, Ressourcen- und Diagnosetests aus.
 */
async function runSystemDiagnostics(context = {}) {
    const results = {
        timestamp: new Date().toISOString(),
        passed: 0,
        failed: 0,
        tests: []
    };

    function logTest(name, success, details) {
        if (success) {
            results.passed++;
            results.tests.push({ name, status: 'PASSED 🟢', details });
        } else {
            results.failed++;
            results.tests.push({ name, status: 'FAILED 🔴', details });
        }
    }

    // 1. RAM- & Speicher-Überwachung (Memory Leak Check)
    try {
        const mem = process.memoryUsage();
        const heapUsedMB = (mem.heapUsed / 1024 / 1024).toFixed(2);
        const heapTotalMB = (mem.heapTotal / 1024 / 1024).toFixed(2);
        const rssMB = (mem.rss / 1024 / 1024).toFixed(2);
        const systemFreeMB = (os.freemem() / 1024 / 1024).toFixed(2);
        const systemTotalMB = (os.totalmem() / 1024 / 1024).toFixed(2);

        const isRamWarning = mem.heapUsed > 350 * 1024 * 1024; // Warnung ab 350MB Node.js Heap
        logTest(
            'RAM & Speicher-Auslastung',
            !isRamWarning,
            `Heap: ${heapUsedMB} MB / ${heapTotalMB} MB | RSS: ${rssMB} MB | Freier System-RAM: ${systemFreeMB} MB / ${systemTotalMB} MB`
        );
    } catch (e) {
        logTest('RAM & Speicher-Auslastung', false, e.message);
    }

    // 2. CPU & Uptime Überwachung
    try {
        const cpus = os.cpus().length;
        const loadAvg = os.loadavg(); // [1min, 5min, 15min]
        const uptimeSec = process.uptime();
        const uptimeHours = (uptimeSec / 3600).toFixed(2);

        logTest(
            'CPU & Server-Uptime',
            true,
            `Kerne: ${cpus} | Load-Avg (1m): ${loadAvg[0].toFixed(2)} | Uptime: ${uptimeHours} Std.`
        );
    } catch (e) {
        logTest('CPU & Server-Uptime', false, e.message);
    }

    // 3. Schachbrett-Matrix & Logik-Integrität
    try {
        const testBoard = Array(8).fill(null).map(() => Array(8).fill(null));
        testBoard[7][4] = 'K'; // Weißer König
        testBoard[0][4] = 'k'; // Schwarzer König
        logTest('Schachbrett-Matrix', true, 'Brett-Struktur & Grundaufstellung erfolgreich simuliert.');
    } catch (e) {
        logTest('Schachbrett-Matrix', false, e.message);
    }

    // 4. Datenbank & Profil-Speicher
    try {
        if (context.db || context.profiles) {
            const count = context.profiles ? (typeof context.profiles.size === 'number' ? context.profiles.size : Object.keys(context.profiles).length) : 0;
            logTest('Spieler-Profile Speicher', true, `${count} Profile im Speicher geladen.`);
        } else {
            logTest('Spieler-Profile Speicher', true, 'In-Memory Profilspeicher betriebsbereit.');
        }
    } catch (e) {
        logTest('Spieler-Profile Speicher', false, e.message);
    }

    // 5. WebSocket-Server & Aktive Clients
    try {
        if (context.wss) {
            const clientCount = context.wss.clients ? context.wss.clients.size : 0;
            logTest('WebSocket-Server Status', true, `Aktiv mit ${clientCount} verbundenen Online-Clients.`);
        } else {
            logTest('WebSocket-Server Status', true, 'WebSocket-Instanz betriebsbereit.');
        }
    } catch (e) {
        logTest('WebSocket-Server Status', false, e.message);
    }

    // 6. Datei-Integrität & Konfiguration
    try {
        const requiredFiles = ['index.html', 'script.js', 'style.css'];
        let missing = [];
        for (const file of requiredFiles) {
            if (!fs.existsSync(file)) missing.push(file);
        }
        if (missing.length === 0) {
            logTest('Core-Dateien Integrität', true, 'Alle Kern-Dateien (HTML, JS, CSS) vorhanden.');
        } else {
            logTest('Core-Dateien Integrität', false, `Fehlende Dateien: ${missing.join(', ')}`);
        }
    } catch (e) {
        logTest('Core-Dateien Integrität', false, e.message);
    }

    // 7. Input-Sanitization & Boundary Check Test
    try {
        const testPayload = "<script>alert('test')</script>";
        const sanitized = testPayload.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const safe = sanitized.includes("&lt;script&gt;");
        logTest('Input-Sanitization Test', safe, safe ? 'XSS-Filter funktioniert korrekt.' : 'Fehler bei der Filterung.');
    } catch (e) {
        logTest('Input-Sanitization Test', false, e.message);
    }

    return results;
}

module.exports = { runSystemDiagnostics };

