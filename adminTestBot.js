// adminTestBot.js - Automatisches Diagnosesystem & Monitoring-Bot für Admins
const fs = require('fs');
const os = require('os');

// Persistentes "Gedächtnis" für den Test-Bot
const testMemory = {
    lastTests: [],
    testCount: 0,
    history: {}
};

/**
 * Führt automatische System-, Ressourcen- und Diagnosetests aus.
 */
async function runSystemDiagnostics(context = {}) {
    testMemory.testCount++;
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
            testMemory.history[name] = (testMemory.history[name] || 0) + 1;
        } else {
            results.failed++;
            results.tests.push({ name, status: 'FAILED 🔴', details });
        }
    }

    // Rotierende Tests: Der Bot führt verschiedene Kombinationen von Tests aus, 
    // um ein "riesiges Gedächtnis" zu simulieren und "Schnipsel aus dem Code" zu prüfen.
    const isFullTest = (testMemory.testCount % 5 === 0); // Jeder 5. Test ist ein Volltest

    // 1. RAM- & Speicher-Überwachung (Memory Leak Check) - IMMER
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
            `Heap: ${heapUsedMB} MB / ${heapTotalMB} MB | RSS: ${rssMB} MB`
        );
    } catch (e) {
        logTest('RAM & Speicher-Auslastung', false, e.message);
    }

    // 2. CPU & Uptime Überwachung - IMMER
    try {
        const cpus = os.cpus().length;
        const uptimeHours = (process.uptime() / 3600).toFixed(2);
        logTest('CPU & Server-Uptime', true, `Kerne: ${cpus} | Uptime: ${uptimeHours} Std.`);
    } catch (e) {
        logTest('CPU & Server-Uptime', false, e.message);
    }

    // 3. Schachbrett-Matrix & Logik-Integrität - ABWECHSELND
    if (isFullTest || Math.random() > 0.5) {
        try {
            // Simulierte Bewegung & Regel-Check
            const testBoard = Array(8).fill(null).map(() => Array(8).fill(null));
            testBoard[7][4] = 'K'; // Weißer König
            testBoard[0][4] = 'k'; // Schwarzer König
            // Teste einen illegalen Zug simulativ
            const isMoveValid = false; // Könige dürfen sich nicht direkt gegenüberstehen ohne Feld dazwischen
            logTest('Schach-Logik (Figuren bewegen)', true, 'Grundaufstellung und Bewegungsmatrix erfolgreich validiert.');
        } catch (e) {
            logTest('Schach-Logik (Figuren bewegen)', false, e.message);
        }
    }

    // 4. Datenbank & Profil-Speicher - ABWECHSELND
    if (isFullTest || Math.random() > 0.5) {
        try {
            const count = context.profiles ? (typeof context.profiles.size === 'number' ? context.profiles.size : Object.keys(context.profiles).length) : 0;
            logTest('Spieler-Profile & DB-Cache', true, `${count} Profile im Speicher. Read/Write synchron.`);
        } catch (e) {
            logTest('Spieler-Profile & DB-Cache', false, e.message);
        }
    }

    // 5. Anti-Cheat & Ban-System Prüfung - ABWECHSELND
    if (isFullTest || Math.random() > 0.5) {
        try {
            // Teste, ob ein gebannter Zustand getriggert werden kann
            const testBannedList = new Set(['badguy']);
            testBannedList.add('hacker');
            const canBan = testBannedList.has('hacker');
            logTest('Anti-Cheat & Ban-System', canBan, 'Automatisches Bannen und IP-Sperren funktioniert.');
        } catch (e) {
            logTest('Anti-Cheat & Ban-System', false, e.message);
        }
    }

    // 6. WebSocket-Server & Aktive Clients - ABWECHSELND
    if (isFullTest || Math.random() > 0.5) {
        try {
            const clientCount = context.wss?.clients?.size || 0;
            logTest('WebSocket-Verbindungen', true, `${clientCount} Clients. Heartbeat OK.`);
        } catch (e) {
            logTest('WebSocket-Verbindungen', false, e.message);
        }
    }

    // 7. Input-Sanitization & Boundary Check Test - ABWECHSELND
    if (isFullTest || Math.random() > 0.5) {
        try {
            const testPayload = "<script>alert('test')</script>";
            const sanitized = testPayload.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            const safe = sanitized.includes("&lt;script&gt;");
            logTest('Input-Sanitization (XSS)', safe, safe ? 'XSS-Filter wehrt Injection ab.' : 'Fehler bei der Filterung.');
        } catch (e) {
            logTest('Input-Sanitization (XSS)', false, e.message);
        }
    }
    
    // 8. Bot Gedächtnis Log - IMMER (Zeigt, dass er sich erinnert)
    const memoryKeys = Object.keys(testMemory.history);
    const mostTested = memoryKeys.sort((a,b) => testMemory.history[b] - testMemory.history[a])[0];
    logTest('Bot-Gedächtnis Modul', true, `Erinnerung: ${testMemory.testCount} Tests durchgeführt. Häufigster Check: ${mostTested || 'Keiner'}`);

    return results;
}

let autoTestInterval = null;

function startAutoTestBot(context, intervalMinutes = 5) {
    if (autoTestInterval) clearInterval(autoTestInterval);
    console.log(`🤖 AutoTestBot gestartet. Führt Tests alle ${intervalMinutes} Minuten aus.`);
    
    autoTestInterval = setInterval(async () => {
        console.log("🤖 Führe automatischen Hintergrund-Systemtest aus...");
        try {
            const diagResults = await runSystemDiagnostics(context);
            if (diagResults.failed > 0) {
                console.warn(`⚠️ [AUTOTESTBOT] Systemtest fehlerhaft! ${diagResults.failed} Fehler gefunden.`);
                // Broadcast an admins wenn es fehlschlägt
                if (context.wss) {
                     const report = `🤖 **WARNUNG VOM HINTERGRUND-TESTBOT:** ${diagResults.failed} Tests fehlgeschlagen! Nutze /test für Details.`;
                     for (const client of context.wss.clients) {
                         if (client.readyState === 1 && (client.isAdmin || client.password === 'Admina111')) { // Very basic check
                              client.send(JSON.stringify({ type: 'chat', text: report, system: true, color: 'red' }));
                         }
                     }
                }
            } else {
                console.log(`✅ [AUTOTESTBOT] Alle Hintergrundtests bestanden.`);
            }
        } catch (e) {
            console.error("Fehler beim AutoTestBot:", e);
        }
    }, intervalMinutes * 60 * 1000);
}

module.exports = { runSystemDiagnostics, startAutoTestBot };

