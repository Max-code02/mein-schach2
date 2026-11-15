// stats-ui.js - Externalized leaderboard & diagnostics controller for stats.html (Strict Nonce CSP)

(function() {
    'use strict';

    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    async function loadStats() {
        const tbody = document.getElementById('leaderboard-body');
        if (!tbody) return;
        const apiBaseUrl = window.location.hostname.includes('github.io') ? 'https://mein-schach2.onrender.com' : '';
        try {
            const res = await fetch(`${apiBaseUrl}/api/leaderboard`);
            const data = await res.json();
            if (data.success && data.list && data.list.length > 0) {
                tbody.innerHTML = data.list.map((p, i) => {
                    const badge = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
                    const color = i === 0 ? '#f1c40f' : i === 1 ? '#bdc3c7' : i === 2 ? '#cd7f32' : 'rgba(255,255,255,0.7)';
                    const bg = i === 0 ? 'linear-gradient(90deg, rgba(241,196,15,0.15) 0%, rgba(0,0,0,0) 100%)' : 'rgba(255,255,255,0.02)';
                    const safeName = escapeHtml(p.name || 'Spieler');
                    const safeLevel = Number(p.level) || 1;
                    const safeElo = Number(p.elo) || 1200;
                    const safeWins = Number(p.wins) || 0;

                    return `
                    <tr style="background: ${bg}; transition: 0.2s;">
                        <td style="font-size: 1.5em; font-weight: bold; color: ${color}; text-align: center;">${badge || `#${i + 1}`}</td>
                        <td>
                            <div style="font-weight: bold; color: white; font-size: 1.1em;">${safeName}</div>
                            <div style="color: #95a5a6; font-size: 0.8em;">Lvl ${safeLevel} • Elo: ${safeElo}</div>
                        </td>
                        <td style="font-size: 1.2em; font-weight: bold; color: #f1c40f;">${safeWins} 🏆</td>
                    </tr>`;
                }).join('');
                return;
            }
            tbody.innerHTML = "<tr><td colspan='3' style='text-align: center;'>Keine Spielerdaten vorhanden.</td></tr>";
        } catch (e) {
            tbody.innerHTML = "<tr><td colspan='3' style='text-align: center;'>Keine Spielerdaten vorhanden.</td></tr>";
        }
    }

    function initStatsPage() {
        setInterval(() => {
            const tasks = ['Analyse-Kanal stabil', 'Mutex-Sperre geprüft', 'Concurrency optimal'];
            const randomTask = tasks[Math.floor(Math.random() * tasks.length)];
            const el = document.getElementById('go-status');
            if (el) el.innerText = randomTask;
        }, 4000);
        loadStats();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initStatsPage);
    } else {
        initStatsPage();
    }
})();
