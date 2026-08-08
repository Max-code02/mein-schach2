// eloSystem.js - MULTI-FORMAT ELO RATING & LEAGUE RANKS ENGINE

// Definition der Schach-Ligen und Ränge
const LEAGUE_RANKS = [
    { name: "Legende ⚡", minElo: 2300, color: "#eab308", icon: "⚡" },
    { name: "Großmeister 🔱", minElo: 2000, color: "#ef4444", icon: "🔱" },
    { name: "Meister 👑", minElo: 1800, color: "#a855f7", icon: "👑" },
    { name: "Diamant 🏆", minElo: 1600, color: "#3b82f6", icon: "🏆" },
    { name: "Platin 💎", minElo: 1400, color: "#06b6d4", icon: "💎" },
    { name: "Gold 🥇", minElo: 1200, color: "#eab308", icon: "🥇" },
    { name: "Silber 🥈", minElo: 1000, color: "#94a3b8", icon: "🥈" },
    { name: "Bronze 🥉", minElo: 0, color: "#b45309", icon: "🥉" }
];

/**
 * Ermittelt Liga-Rang und Badge basierend auf Elo
 */
function getLeagueRank(elo = 1200) {
    for (const rank of LEAGUE_RANKS) {
        if (elo >= rank.minElo) {
            return rank;
        }
    }
    return LEAGUE_RANKS[LEAGUE_RANKS.length - 1];
}

/**
 * Berechnet die Elo-Änderung nach einer Partie
 * @param {number} playerElo - Aktuelle Elo von Spieler A
 * @param {number} opponentElo - Aktuelle Elo von Gegner B
 * @param {number} score - Ergebnis: 1 = Sieg, 0.5 = Remis, 0 = Niederlage
 * @param {number} gamesPlayed - Anzahl bisher gespielter Partien (K-Faktor Anpassung)
 */
function calculateEloChange(playerElo = 1200, opponentElo = 1200, score = 1, gamesPlayed = 20) {
    // Höherer K-Faktor für Platzierungsspiele
    let K = 32;
    if (gamesPlayed < 10) K = 48; // Einstufungsphase
    else if (playerElo > 2000) K = 16; // Hohes Elo -> Stabilere Punkte

    // Erwarteter Score (Glicko / Standard-Elo)
    const expectedScore = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
    const delta = Math.round(K * (score - expectedScore));
    const newElo = Math.max(100, playerElo + delta);

    return {
        oldElo: playerElo,
        newElo: newElo,
        delta: delta,
        expectedScore: Math.round(expectedScore * 100) / 100
    };
}

/**
 * Berechnet Elo-Updates für verschiedene Modi (Bullet, Blitz, Rapid)
 */
function updateFormatElo(userStats, format = 'blitz', opponentElo = 1200, result = 'win') {
    if (!userStats) userStats = { bullet: 1200, blitz: 1200, rapid: 1200, puzzle: 1200, gamesPlayed: 0 };

    const scoreMap = { 'win': 1, 'draw': 0.5, 'loss': 0 };
    const score = scoreMap[result] ?? 0.5;

    const currentElo = userStats[format] || 1200;
    const games = userStats.gamesPlayed || 0;

    const change = calculateEloChange(currentElo, opponentElo, score, games);
    userStats[format] = change.newElo;
    userStats.gamesPlayed = games + 1;

    const currentRank = getLeagueRank(change.newElo);

    return {
        format: format,
        result: result,
        oldElo: change.oldElo,
        newElo: change.newElo,
        delta: change.delta,
        rank: currentRank
    };
}

module.exports = {
    LEAGUE_RANKS,
    getLeagueRank,
    calculateEloChange,
    updateFormatElo
};
