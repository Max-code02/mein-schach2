// evalEngine.js - REAL-TIME POSITION EVALUATION, MATERIAL & ACCURACY ENGINE

(function() {
    const PIECE_VALUES = {
        'p': -1.0, 'n': -3.05, 'b': -3.33, 'r': -5.63, 'q': -9.5, 'k': -200.0,
        'P': 1.0,  'N': 3.05,  'B': 3.33,  'R': 5.63,  'Q': 9.5,  'K': 200.0
    };

    const MATERIAL_POINTS = { p: 1, n: 3, b: 3, r: 5, q: 9 };

    const PAWN_PST = [
        0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00,
        0.50, 0.50, 0.50, 0.50, 0.50, 0.50, 0.50, 0.50,
        0.10, 0.10, 0.20, 0.30, 0.30, 0.20, 0.10, 0.10,
        0.05, 0.05, 0.10, 0.25, 0.25, 0.10, 0.05, 0.05,
        0.00, 0.00, 0.00, 0.22, 0.22, 0.00, 0.00, 0.00,
        0.05,-0.05,-0.10, 0.00, 0.00,-0.10,-0.05, 0.05,
        0.05, 0.10, 0.10,-0.22,-0.22, 0.10, 0.10, 0.05,
        0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00
    ];

    const KNIGHT_PST = [
        -0.50,-0.40,-0.30,-0.30,-0.30,-0.30,-0.40,-0.50,
        -0.40,-0.20, 0.00, 0.00, 0.00, 0.00,-0.20,-0.40,
        -0.30, 0.00, 0.10, 0.15, 0.15, 0.10, 0.00,-0.30,
        -0.30, 0.05, 0.15, 0.20, 0.20, 0.15, 0.05,-0.30,
        -0.30, 0.00, 0.15, 0.20, 0.20, 0.15, 0.00,-0.30,
        -0.30, 0.05, 0.10, 0.15, 0.15, 0.10, 0.05,-0.30,
        -0.40,-0.20, 0.00, 0.05, 0.05, 0.00,-0.20,-0.40,
        -0.50,-0.40,-0.30,-0.30,-0.30,-0.30,-0.40,-0.50
    ];

    const BISHOP_PST = [
        -0.20,-0.10,-0.10,-0.10,-0.10,-0.10,-0.10,-0.20,
        -0.10, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00,-0.10,
        -0.10, 0.00, 0.05, 0.10, 0.10, 0.05, 0.00,-0.10,
        -0.10, 0.05, 0.05, 0.10, 0.10, 0.05, 0.05,-0.10,
        -0.10, 0.00, 0.10, 0.10, 0.10, 0.10, 0.00,-0.10,
        -0.10, 0.10, 0.10, 0.10, 0.10, 0.10, 0.10,-0.10,
        -0.10, 0.05, 0.00, 0.00, 0.00, 0.00, 0.05,-0.10,
        -0.20,-0.10,-0.10,-0.10,-0.10,-0.10,-0.10,-0.20
    ];

    const ROOK_PST = [
         0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00,
         0.08, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.08,
        -0.05, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00,-0.05,
        -0.05, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00,-0.05,
        -0.05, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00,-0.05,
        -0.05, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00,-0.05,
        -0.05, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00,-0.05,
         0.00, 0.00, 0.04, 0.08, 0.08, 0.04, 0.00, 0.00
    ];

    const QUEEN_PST = [
        -0.20,-0.10,-0.10,-0.05,-0.05,-0.10,-0.10,-0.20,
        -0.10, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00,-0.10,
        -0.10, 0.00, 0.05, 0.05, 0.05, 0.05, 0.00,-0.10,
        -0.05, 0.00, 0.05, 0.05, 0.05, 0.05, 0.00,-0.05,
         0.00, 0.00, 0.05, 0.05, 0.05, 0.05, 0.00,-0.05,
        -0.10, 0.05, 0.05, 0.05, 0.05, 0.05, 0.00,-0.10,
        -0.10, 0.00, 0.05, 0.00, 0.00, 0.00, 0.00,-0.10,
        -0.20,-0.10,-0.10,-0.05,-0.05,-0.10,-0.10,-0.20
    ];

    const KING_MG_PST = [
        -0.30,-0.40,-0.40,-0.50,-0.50,-0.40,-0.40,-0.30,
        -0.30,-0.40,-0.40,-0.50,-0.50,-0.40,-0.40,-0.30,
        -0.30,-0.40,-0.40,-0.50,-0.50,-0.40,-0.40,-0.30,
        -0.30,-0.40,-0.40,-0.50,-0.50,-0.40,-0.40,-0.30,
        -0.20,-0.30,-0.30,-0.40,-0.40,-0.30,-0.30,-0.20,
        -0.10,-0.20,-0.20,-0.20,-0.20,-0.20,-0.20,-0.10,
         0.20, 0.20, 0.00, 0.00, 0.00, 0.00, 0.20, 0.20,
         0.20, 0.32, 0.12, 0.00, 0.00, 0.10, 0.32, 0.20
    ];

    const KING_EG_PST = [
        -0.50,-0.40,-0.30,-0.20,-0.20,-0.30,-0.40,-0.50,
        -0.30,-0.20,-0.10, 0.00, 0.00,-0.10,-0.20,-0.30,
        -0.30,-0.10, 0.20, 0.30, 0.30, 0.20,-0.10,-0.30,
        -0.30,-0.10, 0.30, 0.40, 0.40, 0.30,-0.10,-0.30,
        -0.30,-0.10, 0.30, 0.40, 0.40, 0.30,-0.10,-0.30,
        -0.30,-0.10, 0.20, 0.30, 0.30, 0.20,-0.10,-0.30,
        -0.30,-0.30, 0.00, 0.00, 0.00, 0.00,-0.30,-0.30,
        -0.50,-0.30,-0.30,-0.30,-0.30,-0.30,-0.30,-0.50
    ];

    function evaluatePosition(board) {
        if (!board || !Array.isArray(board)) return 0.0;
        let evalScore = 0.0;
        let whiteBishops = 0;
        let blackBishops = 0;
        let nonPawnMaterial = 0;
        const whitePawnsByCol = new Array(8).fill(0);
        const blackPawnsByCol = new Array(8).fill(0);

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = board[r][c];
                if (!p) continue;
                const t = p.toLowerCase();
                if (t !== 'p' && t !== 'k') nonPawnMaterial += MATERIAL_POINTS[t] || 0;
                if (p === 'P') whitePawnsByCol[c]++;
                if (p === 'p') blackPawnsByCol[c]++;
            }
        }

        const phase = Math.min(1, nonPawnMaterial / 62);

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = board[r][c];
                if (!piece) continue;

                const isWhite = piece === piece.toUpperCase();
                const sign = isWhite ? 1 : -1;
                const type = piece.toLowerCase();
                evalScore += PIECE_VALUES[piece] || 0.0;

                const pstIdx = (isWhite ? r : 7 - r) * 8 + c;
                if (type === 'p') {
                    evalScore += sign * (PAWN_PST[pstIdx] || 0);
                    const ownCol = isWhite ? whitePawnsByCol[c] : blackPawnsByCol[c];
                    if (ownCol > 1) evalScore -= sign * 0.12;
                    let isPassed = true;
                    for (let adj = Math.max(0, c - 1); adj <= Math.min(7, c + 1); adj++) {
                        for (let rr = isWhite ? r - 1 : r + 1; isWhite ? rr >= 0 : rr <= 7; rr += (isWhite ? -1 : 1)) {
                            if (board[rr][adj] === (isWhite ? 'p' : 'P')) {
                                isPassed = false;
                                break;
                            }
                        }
                        if (!isPassed) break;
                    }
                    if (isPassed) {
                        const rankAdvance = isWhite ? (7 - r) : r;
                        evalScore += sign * (0.15 + rankAdvance * 0.08);
                    }
                } else if (type === 'n') {
                    evalScore += sign * (KNIGHT_PST[pstIdx] || 0);
                } else if (type === 'b') {
                    evalScore += sign * (BISHOP_PST[pstIdx] || 0);
                    if (isWhite) whiteBishops++;
                    else blackBishops++;
                } else if (type === 'r') {
                    evalScore += sign * (ROOK_PST[pstIdx] || 0);
                    const ownCol = isWhite ? whitePawnsByCol[c] : blackPawnsByCol[c];
                    const oppCol = isWhite ? blackPawnsByCol[c] : whitePawnsByCol[c];
                    if (ownCol === 0 && oppCol === 0) evalScore += sign * 0.22;
                    else if (ownCol === 0) evalScore += sign * 0.10;
                } else if (type === 'q') {
                    evalScore += sign * (QUEEN_PST[pstIdx] || 0);
                } else if (type === 'k') {
                    const mg = KING_MG_PST[pstIdx] || 0;
                    const eg = KING_EG_PST[pstIdx] || 0;
                    evalScore += sign * (mg * phase + eg * (1 - phase));
                }
            }
        }

        if (whiteBishops >= 2) evalScore += 0.35;
        if (blackBishops >= 2) evalScore -= 0.35;

        return Math.round(evalScore * 100) / 100;
    }

    function getCapturedAndMaterial(board) {
        const startCounts = {
            white: { q: 1, r: 2, b: 2, n: 2, p: 8 },
            black: { q: 1, r: 2, b: 2, n: 2, p: 8 }
        };
        const currentCounts = {
            white: { q: 0, r: 0, b: 0, n: 0, p: 0 },
            black: { q: 0, r: 0, b: 0, n: 0, p: 0 }
        };

        if (Array.isArray(board)) {
            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    const p = board[r][c];
                    if (!p) continue;
                    const t = p.toLowerCase();
                    if (t === 'k') continue;
                    const side = (p === p.toUpperCase()) ? 'white' : 'black';
                    if (currentCounts[side][t] !== undefined) currentCounts[side][t]++;
                }
            }
        }

        const order = ['q', 'r', 'b', 'n', 'p'];
        const capturedByWhite = [];
        const capturedByBlack = [];
        let whiteScore = 0;
        let blackScore = 0;

        order.forEach(t => {
            whiteScore += currentCounts.white[t] * MATERIAL_POINTS[t];
            blackScore += currentCounts.black[t] * MATERIAL_POINTS[t];

            const missingBlack = Math.max(0, startCounts.black[t] - currentCounts.black[t]);
            for (let i = 0; i < missingBlack; i++) capturedByWhite.push(t);

            const missingWhite = Math.max(0, startCounts.white[t] - currentCounts.white[t]);
            for (let i = 0; i < missingWhite; i++) capturedByBlack.push(t.toUpperCase());
        });

        const diff = whiteScore - blackScore;
        return {
            capturedByWhite,
            capturedByBlack,
            whiteLead: diff > 0 ? diff : 0,
            blackLead: diff < 0 ? -diff : 0
        };
    }

    function getWinPercentage(evalScore, mateIn = null) {
        if (mateIn !== null && mateIn !== undefined) {
            return mateIn > 0 ? 99 : 1;
        }
        const clamped = Math.max(-15, Math.min(15, Number(evalScore) || 0));
        const winProb = 1 / (1 + Math.pow(10, -clamped / 4));
        return Math.max(2, Math.min(98, Math.round(winProb * 100)));
    }

    function classifyMove(evalBefore, evalAfter, isWhiteTurn) {
        const delta = isWhiteTurn ? (evalAfter - evalBefore) : (evalBefore - evalAfter);

        if (delta >= 1.5 && Math.abs(evalBefore) <= 1.2) {
            return { type: "brilliant", glyph: "!!", label: "Brillant", color: "#1baca6" };
        } else if (delta >= 0.45) {
            return { type: "great", glyph: "!", label: "Stark", color: "#5c8bb0" };
        } else if (delta >= -0.25) {
            return { type: "best", glyph: "✓", label: "Bester", color: "#81b64c" };
        } else if (delta >= -0.75) {
            return { type: "inaccuracy", glyph: "?!", label: "Ungenau", color: "#f0c15c" };
        } else if (delta >= -1.8) {
            return { type: "mistake", glyph: "?", label: "Fehler", color: "#e58f2a" };
        } else {
            return { type: "blunder", glyph: "??", label: "Patzer", color: "#ca3431" };
        }
    }

    // CAPS-ähnliche Genauigkeit basierend auf Gewinnwahrscheinlichkeitsverlust pro Zug
    function moveAccuracyFromWinLoss(winPctBefore, winPctAfter) {
        const loss = Math.max(0, winPctBefore - winPctAfter);
        const acc = 103.1668 * Math.exp(-0.04354 * loss) - 3.1669;
        return Math.max(5, Math.min(100, acc));
    }

    function calculateMatchAccuracy(evalHistory = []) {
        if (!evalHistory || evalHistory.length < 2) {
            return { whiteAccuracy: 95, blackAccuracy: 95 };
        }

        const whiteAccs = [];
        const blackAccs = [];

        for (let i = 1; i < evalHistory.length; i++) {
            const prev = Number(evalHistory[i - 1]) || 0;
            const curr = Number(evalHistory[i]) || 0;
            const isWhite = i % 2 === 1;

            const winPrevWhite = getWinPercentage(prev);
            const winCurrWhite = getWinPercentage(curr);

            if (isWhite) {
                whiteAccs.push(moveAccuracyFromWinLoss(winPrevWhite, winCurrWhite));
            } else {
                const winPrevBlack = 100 - winPrevWhite;
                const winCurrBlack = 100 - winCurrWhite;
                blackAccs.push(moveAccuracyFromWinLoss(winPrevBlack, winCurrBlack));
            }
        }

        const avgW = whiteAccs.length ? whiteAccs.reduce((a, b) => a + b, 0) / whiteAccs.length : 95;
        const avgB = blackAccs.length ? blackAccs.reduce((a, b) => a + b, 0) / blackAccs.length : 95;

        return {
            whiteAccuracy: Math.max(10, Math.min(99, Math.round(avgW))),
            blackAccuracy: Math.max(10, Math.min(99, Math.round(avgB)))
        };
    }

    const api = {
        evaluatePosition,
        getCapturedAndMaterial,
        getWinPercentage,
        classifyMove,
        calculateMatchAccuracy
    };

    if (typeof window !== 'undefined') {
        window.EvalEngine = api;
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
})();
