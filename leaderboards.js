// leaderboards.js - MONTHLY SEASONAL LEADERBOARDS & PROFILE BADGES SYSTEM

const ACHIEVEMENTS = [
    { id: "puzzles_10", name: "Taktik-Neuling", description: "Löse 10 Taktikaufgaben", icon: "🧩" },
    { id: "puzzles_100", name: "Rätsel-Meister", description: "Löse 100 Taktikaufgaben", icon: "🧠" },
    { id: "grandmaster_status", name: "Großmeister-Status", description: "Erreiche eine Elo-Zahl von 2000+", icon: "🔱" },
    { id: "win_streak_5", name: "Siegesserie", description: "Gewinne 5 Spiele hintereinander", icon: "🔥" },
    { id: "legend_status", name: "Schach-Legende", description: "Erreiche den Legenden-Rang (2300+ Elo)", icon: "⚡" },
    { id: "coin_tycoon", name: "Münz-Tycoon", description: "Besitze über 5.000 Vorhersage-Coins", icon: "💰" }
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
 * Generiert ein Rang-Badge basierend auf Elo
 */
function getBadgeForElo(elo = 1200) {
    if (elo >= 2300) return "⚡ Legende";
    if (elo >= 2000) return "🔱 Großmeister";
    if (elo >= 1800) return "👑 Meister";
    if (elo >= 1600) return "🏆 Diamant";
    if (elo >= 1400) return "💎 Platin";
    if (elo >= 1200) return "🥇 Gold";
    return "♟️ Anfänger";
}

/**
 * Holt die Rangliste für ein gewähltes Format aus der echten User-Datenbank
 */
function getFormatLeaderboard(format = 'blitz', userDB = {}) {
    let list = [];

    if (userDB && Object.keys(userDB).length > 0) {
        list = Object.entries(userDB)
            .map(([uname, u]) => ({
                username: uname,
                rating: u.elo || 1200,
                gamesPlayed: (u.wins || 0) + (u.losses || 0),
                wins: u.wins || 0,
                badge: getBadgeForElo(u.elo || 1200)
            }))
            .sort((a, b) => (b.rating !== a.rating ? b.rating - a.rating : b.wins - a.wins));
    }

    if (list.length === 0) {
        list = [
            { username: "Max_Schach", rating: 2350, gamesPlayed: 142, wins: 110, badge: "⚡ Legende" },
            { username: "Magnus_Bot", rating: 2280, gamesPlayed: 98, wins: 80, badge: "🔱 Großmeister" }
        ];
    }

    const rankedList = list.map((item, index) => ({
        rank: index + 1,
        ...item
    }));

    return {
        season: getCurrentSeasonName(),
        format: format.toUpperCase(),
        leaderboard: rankedList
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
