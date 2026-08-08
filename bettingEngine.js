// bettingEngine.js - SPECTATOR PREDICTIONS & VIRTUAL COIN SYSTEM FOR GRANDMASTER MATCHES

const userWallets = new Map(); // Store user coin balances
const activeBets = new Map();  // matchId -> Array of bets

/**
 * Holt den Münzstand eines Nutzers (Standard: 1000 Start-Coins)
 */
function getUserCoins(username) {
    if (!username) return 0;
    if (!userWallets.has(username)) {
        userWallets.set(username, 1000);
    }
    return userWallets.get(username);
}

/**
 * Berechnet Wettquoten basierend auf den Elos von Weiß und Schwarz
 */
function calculateOdds(whiteElo = 1200, blackElo = 1200) {
    const expectedWhite = 1 / (1 + Math.pow(10, (blackElo - whiteElo) / 400));
    const expectedBlack = 1 - expectedWhite;

    // Quotenberechnung mit Hausvorteil-Marge
    const whiteOdds = Math.max(1.1, Math.round((1 / expectedWhite) * 0.95 * 100) / 100);
    const blackOdds = Math.max(1.1, Math.round((1 / expectedBlack) * 0.95 * 100) / 100);
    const drawOdds = 3.50; // Festpreis für Unentschieden

    return { whiteOdds, blackOdds, drawOdds };
}

/**
 * Platziert eine Vorhersage-Wette für Zuschauer
 */
function placeBet(username, matchId, prediction, amount) {
    const currentCoins = getUserCoins(username);
    if (amount <= 0 || currentCoins < amount) {
        return { success: false, message: "⚠️ Nicht genügend Coins verfügbar!" };
    }

    userWallets.set(username, currentCoins - amount);

    if (!activeBets.has(matchId)) {
        activeBets.set(matchId, []);
    }

    const betsList = activeBets.get(matchId);
    betsList.push({
        username: username,
        prediction: prediction, // 'white', 'black', oder 'draw'
        amount: amount,
        timestamp: Date.now()
    });

    return {
        success: true,
        remainingCoins: userWallets.get(username),
        message: `🎯 Wette von ${amount} Coins auf '${prediction}' platziert!`
    };
}

/**
 * Zieht die Gewinne aus den Vorhersage-Wetten nach Spielende ab
 */
function resolveMatchBets(matchId, resultOutcome, whiteElo = 1200, blackElo = 1200) {
    const bets = activeBets.get(matchId);
    if (!bets || bets.length === 0) return { totalPayout: 0, winners: [] };

    const odds = calculateOdds(whiteElo, blackElo);
    const winningOdds = resultOutcome === 'white' ? odds.whiteOdds : (resultOutcome === 'black' ? odds.blackOdds : odds.drawOdds);

    const winners = [];
    let totalPayout = 0;

    for (const bet of bets) {
        if (bet.prediction === resultOutcome) {
            const winAmount = Math.round(bet.amount * winningOdds);
            const userCurrent = getUserCoins(bet.username);
            userWallets.set(bet.username, userCurrent + winAmount);

            winners.push({
                username: bet.username,
                betAmount: bet.amount,
                wonCoins: winAmount
            });
            totalPayout += winAmount;
        }
    }

    activeBets.delete(matchId); // Wetten bereinigen
    return { totalPayout, winners };
}

/**
 * Top-Münzen Rangliste der treffsichersten Zuschauer
 */
function getCoinLeaderboard() {
    const list = Array.from(userWallets.entries()).map(([username, coins]) => ({
        username,
        coins
    }));
    return list.sort((a, b) => b.coins - a.coins).slice(0, 10);
}

module.exports = {
    getUserCoins,
    calculateOdds,
    placeBet,
    resolveMatchBets,
    getCoinLeaderboard
};
