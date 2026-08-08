// evalEngine.js - REAL-TIME POSITION EVALUATION & POST-GAME ACCURACY ENGINE

const PIECE_VALUES = {
    'p': 1.0,  'n': 3.05, 'b': 3.33, 'r': 5.63, 'q': 9.5, 'k': 200.0,
    'P': -1.0, 'N': -3.05, 'B': -3.33, 'R': -5.63, 'Q': -9.5, 'K': -200.0
};

// Positionstabellen für Zentrumskontrolle und Figurenentwicklung
const PAWN_PST = [
    0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,
    0.5,  0.5,  0.5,  0.5,  0.5,  0.5,  0.5,  0.5,
    0.1,  0.1,  0.2,  0.3,  0.3,  0.2,  0.1,  0.1,
    0.05, 0.05, 0.1,  0.25, 0.25, 0.1,  0.05, 0.05,
    0.0,  0.0,  0.0,  0.2,  0.2,  0.0,  0.0,  0.0,
    0.05,-0.05,-0.1,  0.0,  0.0, -0.1, -0.05, 0.05,
    0.05, 0.1,  0.1, -0.2, -0.2,  0.1,  0.1,  0.05,
    0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0
];

/**
 * Bewertet eine Schachstellung in Bauern-Einheiten (Pawns)
 * Positive Werte = Vorteile für Weiß | Negative Werte = Vorteile für Schwarz
 */
function evaluatePosition(board) {
    if (!board || !Array.isArray(board)) return 0.0;

    let evalScore = 0.0;

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (!piece) continue;

            const isWhite = piece === piece.toUpperCase();
            const pieceVal = PIECE_VALUES[piece] || 0.0;
            evalScore += pieceVal;

            // Zentrumsbonus
            if (r >= 2 && r <= 5 && c >= 2 && c <= 5) {
                evalScore += isWhite ? 0.15 : -0.15;
            }

            // Bauern-Positionsbonus
            if (piece.toLowerCase() === 'p') {
                const idx = r * 8 + c;
                const pstBonus = PAWN_PST[idx] || 0.0;
                evalScore += isWhite ? pstBonus : -pstBonus;
            }
        }
    }

    return Math.round(evalScore * 100) / 100;
}

/**
 * Konvertiert eine Evaluierung (-10.0 bis +10.0) in Gewinngeschwindigkeit in % (0 - 100%)
 */
function getWinPercentage(evalScore) {
    // Sigmoid Transformation für sanfte Prozentbalken
    const winProb = 1 / (1 + Math.pow(10, -evalScore / 4));
    return Math.round(winProb * 100);
}

/**
 * Klassifiziert einen Zug basierend auf der Evaluierungsänderung
 */
function classifyMove(evalBefore, evalAfter, isWhiteTurn) {
    const delta = isWhiteTurn ? (evalAfter - evalBefore) : (evalBefore - evalAfter);

    if (delta >= 1.5 && Math.abs(evalBefore) <= 1.0) {
        return { type: "brilliant", label: "Brillant!! 🌟", color: "#a855f7" };
    } else if (delta >= 0.5) {
        return { type: "great", label: "Großartig! 🎯", color: "#3b82f6" };
    } else if (delta >= -0.2) {
        return { type: "best", label: "Bester Zug ✓", color: "#22c55e" };
    } else if (delta >= -0.7) {
        return { type: "inaccuracy", label: "Ungenauigkeit?!", color: "#eab308" };
    } else if (delta >= -1.8) {
        return { type: "mistake", label: "Fehler ?", color: "#f97316" };
    } else {
        return { type: "blunder", label: "Patzer ?? 💥", color: "#ef4444" };
    }
}

/**
 * Berechnet die Gesamtgenauigkeit (Accuracy %) für beide Spieler nach der Partie
 */
function calculateMatchAccuracy(evalHistory = []) {
    if (!evalHistory || evalHistory.length === 0) {
        return { whiteAccuracy: 85, blackAccuracy: 85 };
    }

    let whiteDeltas = [];
    let blackDeltas = [];

    for (let i = 1; i < evalHistory.length; i++) {
        const prev = evalHistory[i - 1];
        const curr = evalHistory[i];
        const isWhite = i % 2 === 1;

        const delta = isWhite ? (curr - prev) : (prev - curr);
        const loss = Math.max(0, -delta);

        if (isWhite) whiteDeltas.push(loss);
        else blackDeltas.push(loss);
    }

    const avgLossWhite = whiteDeltas.length ? (whiteDeltas.reduce((a, b) => a + b, 0) / whiteDeltas.length) : 0;
    const avgLossBlack = blackDeltas.length ? (blackDeltas.reduce((a, b) => a + b, 0) / blackDeltas.length) : 0;

    const whiteAccuracy = Math.max(10, Math.round(100 - (avgLossWhite * 25)));
    const blackAccuracy = Math.max(10, Math.round(100 - (avgLossBlack * 25)));

    return { whiteAccuracy, blackAccuracy };
}

module.exports = {
    evaluatePosition,
    getWinPercentage,
    classifyMove,
    calculateMatchAccuracy
};
