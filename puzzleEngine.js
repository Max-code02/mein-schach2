// puzzleEngine.js - DAILY TACTIC PUZZLES & PUZZLE-ELO SYSTEM

// Curated Database of Tactical Puzzles
const PUZZLE_DATABASE = [
    {
        id: "p001",
        title: "Klassisches Grundlinien-Matt",
        category: "Matt in 2",
        difficulty: 1100,
        fen: "6k1/5ppp/8/8/8/8/4QPPP/6K1 w - - 0 1",
        solution: ["e2e8"],
        description: "Nutze die Schwäche der gegnerischen Grundreihe aus!",
        hint: "Deine Dame kann auf die 8. Reihe eindringen."
    },
    {
        id: "p002",
        title: "Ersticktes Matt (Smothered Mate)",
        category: "Matt in 2",
        difficulty: 1450,
        fen: "6rk/5Npp/8/8/8/8/8/6K1 w - - 0 1",
        solution: ["f7h6", "g8h8", "f7g7"], // Sample knight tactic
        description: "Der gegnerische König ist von den eigenen Figuren eingesperrt.",
        hint: "Ein Springerschach führt zum direkten Matt!"
    },
    {
        id: "p003",
        title: "Doppelangriff mit Springer-Gabel",
        category: "Gabel & Doppelangriff",
        difficulty: 1250,
        fen: "r1bqk2r/pppp1ppp/2n2n2/4p3/1b2P3/2N2N2/PPPP1PPP/R1BQKB1R w KQkq - 0 1",
        solution: ["c3d5"],
        description: "Greife gleichzeitig den gegnerischen Läufer und e5-Bauern an.",
        hint: "Zentralisiere deinen Springer mit Tempo."
    },
    {
        id: "p004",
        title: "Damen-Opfer zum Erstickten Matt",
        category: "Kombination",
        difficulty: 1650,
        fen: "6rk/5p1p/8/8/8/8/1Q3PPP/6K1 w - - 0 1",
        solution: ["b2g7"],
        description: "Opfere deine stärkste Figur für das unausweichliche Matt.",
        hint: "Schaue auf das Feld g7!"
    },
    {
        id: "p005",
        title: "Turm-Spieß auf der 7. Reihe",
        category: "Spieß",
        difficulty: 1300,
        fen: "2r3k1/5ppp/8/8/8/8/1R3PPP/6K1 w - - 0 1",
        solution: ["b2b8"],
        description: "Der gegnerische Turm steht ungedeckt auf der Grundreihe.",
        hint: "Greife den Turm direkt auf der b-Linie an."
    },
    {
        id: "p006",
        title: "Abzugsschach mit Läufergewinn",
        category: "Abzugsschach",
        difficulty: 1500,
        fen: "r1b1k2r/pppp1ppp/8/4P3/2B1n3/8/PPP2PPP/R1BQK2R w KQkq - 0 1",
        solution: ["c4f7"],
        description: "Nutze ein Abzugsschach, um Material zu gewinnen.",
        hint: "Opfere den Läufer auf f7, um den König herauszulocken."
    }
];

/**
 * Holt das heutige Tagesrätsel basierend auf dem Datum
 */
function getDailyPuzzle() {
    const todayStr = new Date().toISOString().slice(0, 10);
    let hash = 0;
    for (let i = 0; i < todayStr.length; i++) {
        hash = (hash << 5) - hash + todayStr.charCodeAt(i);
        hash |= 0;
    }
    const index = Math.abs(hash) % PUZZLE_DATABASE.length;
    const puzzle = PUZZLE_DATABASE[index];
    return { ...puzzle, date: todayStr };
}

/**
 * Berechnet neue Puzzle-Elo-Zahlen nach einem Versuch
 * @param {number} userElo - Derzeitige Puzzle-Elo des Spielers
 * @param {number} puzzleDifficulty - Schwierigkeit des Rätsels
 * @param {boolean} isCorrect - Ob das Rätsel gelöst wurde
 * @param {number} timeSeconds - Benötigte Zeit in Sekunden
 */
function calculatePuzzleElo(userElo = 1200, puzzleDifficulty = 1200, isCorrect = true, timeSeconds = 30) {
    const K = 32;
    const expectedScore = 1 / (1 + Math.pow(10, (puzzleDifficulty - userElo) / 400));
    const actualScore = isCorrect ? 1 : 0;

    // Zeit-Bonus: Schnelles Lösen gibt bis zu 25% Extra-Punkte
    let timeMultiplier = 1.0;
    if (isCorrect && timeSeconds < 15) {
        timeMultiplier = 1.25;
    } else if (isCorrect && timeSeconds < 30) {
        timeMultiplier = 1.1;
    }

    const baseChange = K * (actualScore - expectedScore);
    const delta = Math.round(baseChange * timeMultiplier);
    const newElo = Math.max(100, userElo + delta);

    return {
        oldElo: userElo,
        newElo: newElo,
        delta: delta,
        isCorrect: isCorrect
    };
}

/**
 * Überprüft einen eingegebenen Lösungszug
 */
function checkPuzzleMove(puzzleId, moveSequence = []) {
    const puzzle = PUZZLE_DATABASE.find(p => p.id === puzzleId);
    if (!puzzle) return { valid: false, message: "Rätsel nicht gefunden!" };

    const targetMove = puzzle.solution[moveSequence.length - 1];
    const lastUserMove = moveSequence[moveSequence.length - 1];

    if (lastUserMove === targetMove) {
        const isCompleted = moveSequence.length === puzzle.solution.length;
        return {
            valid: true,
            isCompleted: isCompleted,
            message: isCompleted ? "🎉 Hervorragend! Rätsel erfolgreich gelöst!" : "✅ Richtig! Weiter so!"
        };
    } else {
        return {
            valid: false,
            isCompleted: false,
            message: "❌ Das war nicht der beste Zug. Versuche es nochmal!"
        };
    }
}

module.exports = {
    PUZZLE_DATABASE,
    getDailyPuzzle,
    calculatePuzzleElo,
    checkPuzzleMove
};
