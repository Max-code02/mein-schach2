// leaderboards.js - MONTHLY SEASONAL LEADERBOARDS & PROFILE BADGES SYSTEM

const ACHIEVEMENTS = [
    { id: "puzzles_10", name: "Taktik-Neuling", description: "Löse 10 Taktikaufgaben", icon: "🧩" },
    { id: "puzzles_100", name: "Rätsel-Meister", description: "Löse 100 Taktikaufgaben", icon: "🧠" },
    { id: "grandmaster_status", name: "Großmeister-Status", description: "Erreiche eine Elo-Zahl von 2000+", icon: "🔱" },
    { id: "win_streak_5", name: "Siegesserie", description: "Gewinne 5 Spiele hintereinander", icon: "🔥" },
    { id: "legend_status", name: "Schach-Legende", description: "Erreiche den Legenden-Rang (2300+ Elo)", icon: "⚡" },
    { id: "coin_tycoon", name: "Münz-Tycoon", description: "Besitze über 5.000 Vorhersage-Coins", icon: "💰" }
];

// Simulierte/Lokale Saisondaten
const mockSeasonalLeaderboard = [
    { rank: 1, username: "Max_Schach", rating: 2350, gamesPlayed: 142, badge: "⚡ Legende" },
    { rank: 2, username: "Magnus_Bot", rating: 2280, gamesPlayed: 98, badge: "🔱 Großmeister" },
    { rank: 3, username: "ChessMaster99", rating: 2010, gamesPlayed: 215, badge: "👑 Meister" },
    { rank: 4, username: "TaktikFuchs", rating: 1850, gamesPlayed: 76, badge: "🏆 Diamant" },
    { rank: 5, username: "SpeedyKnight", rating: 1720, gamesPlayed: 110, badge: "💎 Platin" }
];

/**
 * Holt die aktuelle Saisonbezeichnung (z.B. "Saison August 2026")
 */
function getCurrentSeasonName() {
    const date = new Date();
    const months = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
    return `Saison ${months[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * Holt die Rangliste für ein gewähltes Format (blitz, rapid, bullet, puzzles)
 */
function getFormatLeaderboard(format = 'blitz') {
    return {
        season: getCurrentSeasonName(),
        format: format.toUpperCase(),
        leaderboard: mockSeasonalLeaderboard
    };
}

/**
 * Prüft und schaltet Erfolgsabzeichen für das Spielerprofil frei
 * @param {object} userStats - Benutzerstatistiken (Elo, Puzzles, Streak, Coins)
 */
function checkUserAchievements(userStats = {}) {
    const unlocked = [];

    const elo = userStats.blitz || userStats.elo || 1200;
    const puzzles = userStats.puzzlesSolved || 0;
    const streak = userStats.winStreak || 0;
    const coins = userStats.coins || 1000;

    if (puzzles >= 10) unlocked.push(ACHIEVEMENTS[0]);
    if (puzzles >= 100) unlocked.push(ACHIEVEMENTS[1]);
    if (elo >= 2000) unlocked.push(ACHIEVEMENTS[2]);
    if (streak >= 5) unlocked.push(ACHIEVEMENTS[3]);
    if (elo >= 2300) unlocked.push(ACHIEVEMENTS[4]);
    if (coins >= 5000) unlocked.push(ACHIEVEMENTS[5]);

    return {
        unlocked: unlocked,
        totalAvailable: ACHIEVEMENTS.length
    };
}

module.exports = {
    ACHIEVEMENTS,
    getCurrentSeasonName,
    getFormatLeaderboard,
    checkUserAchievements
};
