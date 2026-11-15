/* ===== PROCHESS GRANDMASTER ENGINE V6 (ITERATIVE DEEPENING + QUIESCENCE + LIVE EVAL WORKER) ===== */

const VALUE = {
    'p': 100, 'n': 320, 'b': 335, 'r': 500, 'q': 900, 'k': 20000,
    'P': 100, 'N': 320, 'B': 335, 'R': 500, 'Q': 900, 'K': 20000
};

const OPENING_BOOK = {
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR": ["e2e4", "d2d4", "c2c4", "g1f3"],
    "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR": ["e7e5", "c7c5", "c7c6", "e7e6"],
    "rnbqkbnr/pppppppp/8/8/3P4/8/PPPP1PPP/RNBQKBNR": ["d7d5", "g8f6", "e7e6"],
    "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR": ["g1f3", "b1c3", "f1c4"],
    "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R": ["b8c6", "g8f6"],
    "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R": ["f1b5", "f1c4", "d2d4"],
    "rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR": ["g1f3", "b1c3", "c2c3"],
    "rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR": ["c2c4", "g1f3", "c1f4"],
    "rnbqkbnr/pppppp1p/8/8/3P4/8/PPP1PPPP/RNBQKBNR": ["c2c4", "g1f3"],
    "rnbqkb1r/pppppppp/5n2/8/3P4/8/PPP1PPPP/RNBQKBNR": ["c2c4", "g1f3", "c1f4"],
    "rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR": ["d2d4", "b1c3"],
    "rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR": ["d2d4", "d2d3"]
};

const PST = {
    'P': [
        [ 0,  0,  0,  0,  0,  0,  0,  0],
        [50, 50, 50, 50, 50, 50, 50, 50],
        [10, 10, 20, 30, 30, 20, 10, 10],
        [ 5,  5, 10, 27, 27, 10,  5,  5],
        [ 0,  0,  0, 25, 25,  0,  0,  0],
        [ 5, -5,-10,  0,  0,-10, -5,  5],
        [ 5, 10, 10,-22,-22, 10, 10,  5],
        [ 0,  0,  0,  0,  0,  0,  0,  0]
    ],
    'N': [
        [-50,-40,-30,-30,-30,-30,-40,-50],
        [-40,-20,  0,  5,  5,  0,-20,-40],
        [-30,  5, 10, 15, 15, 10,  5,-30],
        [-30,  0, 15, 22, 22, 15,  0,-30],
        [-30,  5, 15, 22, 22, 15,  5,-30],
        [-30,  0, 12, 16, 16, 12,  0,-30],
        [-40,-20,  0,  5,  5,  0,-20,-40],
        [-50,-40,-30,-30,-30,-30,-40,-50]
    ],
    'B': [
        [-20,-10,-10,-10,-10,-10,-10,-20],
        [-10,  0,  0,  0,  0,  0,  0,-10],
        [-10,  0,  8, 12, 12,  8,  0,-10],
        [-10,  8,  8, 12, 12,  8,  8,-10],
        [-10,  0, 12, 12, 12, 12,  0,-10],
        [-10, 10, 10, 10, 10, 10, 10,-10],
        [-10,  5,  0,  0,  0,  0,  5,-10],
        [-20,-10,-10,-10,-10,-10,-10,-20]
    ],
    'R': [
        [ 0,  0,  0,  0,  0,  0,  0,  0],
        [ 5, 12, 12, 12, 12, 12, 12,  5],
        [-5,  0,  0,  0,  0,  0,  0, -5],
        [-5,  0,  0,  0,  0,  0,  0, -5],
        [-5,  0,  0,  0,  0,  0,  0, -5],
        [-5,  0,  0,  0,  0,  0,  0, -5],
        [-5,  0,  0,  0,  0,  0,  0, -5],
        [ 0,  0,  0,  6,  6,  0,  0,  0]
    ],
    'Q': [
        [-20,-10,-10, -5, -5,-10,-10,-20],
        [-10,  0,  0,  0,  0,  0,  0,-10],
        [-10,  0,  5,  5,  5,  5,  0,-10],
        [ -5,  0,  5,  5,  5,  5,  0, -5],
        [  0,  0,  5,  5,  5,  5,  0, -5],
        [-10,  5,  5,  5,  5,  5,  0,-10],
        [-10,  0,  5,  0,  0,  0,  0,-10],
        [-20,-10,-10, -5, -5,-10,-10,-20]
    ],
    'K': [
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-20,-30,-30,-40,-40,-30,-30,-20],
        [-10,-20,-20,-20,-20,-20,-20,-10],
        [ 20, 20,  0,  0,  0,  0, 20, 20],
        [ 20, 32, 12,  0,  0, 10, 32, 20]
    ],
    'K_EG': [
        [-50,-40,-30,-20,-20,-30,-40,-50],
        [-30,-20,-10,  0,  0,-10,-20,-30],
        [-30,-10, 20, 30, 30, 20,-10,-30],
        [-30,-10, 30, 40, 40, 30,-10,-30],
        [-30,-10, 30, 40, 40, 30,-10,-30],
        [-30,-10, 20, 30, 30, 20,-10,-30],
        [-30,-30,  0,  0,  0,  0,-30,-30],
        [-50,-30,-30,-30,-30,-30,-30,-50]
    ]
};

const TT_EXACT = 0;
const TT_LOWER = 1;
const TT_UPPER = 2;
const transpositionTable = new Map();
const killerMoves = [];
const COLS = "abcdefgh";

function cloneBoard(board) {
    return board.map(r => [...r]);
}

function isOwn(p, turn) {
    if (!p) return false;
    return turn === "white" ? p === p.toUpperCase() : p === p.toLowerCase();
}

function isPathClear(board, fr, fc, tr, tc) {
    const dr = Math.sign(tr - fr);
    const dc = Math.sign(tc - fc);
    let r = fr + dr;
    let c = fc + dc;
    while (r !== tr || c !== tc) {
        if (board[r][c] !== "") return false;
        r += dr;
        c += dc;
    }
    return true;
}

function canMoveSimple(board, fr, fc, tr, tc, turn) {
    const p = board[fr][fc];
    if (!p) return false;
    const t = board[tr][tc];
    if (t && isOwn(t, turn)) return false;
    const dr = tr - fr;
    const dc = tc - fc;
    const ar = Math.abs(dr);
    const ac = Math.abs(dc);
    const type = p.toLowerCase();
    if (type === 'p') {
        const dir = p === 'P' ? -1 : 1;
        if (dc === 0 && dr === dir && !t) return true;
        if (dc === 0 && dr === 2 * dir && !t && board[fr + dir][fc] === "" && (p === 'P' ? fr === 6 : fr === 1)) return true;
        if (ac === 1 && dr === dir && t) return true;
        return false;
    }
    if (type === 'r') return (fr === tr || fc === tc) && isPathClear(board, fr, fc, tr, tc);
    if (type === 'b') return ar === ac && isPathClear(board, fr, fc, tr, tc);
    if (type === 'q') return (fr === tr || fc === tc || ar === ac) && isPathClear(board, fr, fc, tr, tc);
    if (type === 'n') return (ar === 2 && ac === 1) || (ar === 1 && ac === 2);
    if (type === 'k') return ar <= 1 && ac <= 1;
    return false;
}

function isAttacked(tr, tc, attackerColor, b) {
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const p = b[r][c];
            if (p && isOwn(p, attackerColor)) {
                const dr = tr - r;
                const dc = tc - c;
                const ar = Math.abs(dr);
                const ac = Math.abs(dc);
                const type = p.toLowerCase();
                if (type === 'p') {
                    const dir = p === 'P' ? -1 : 1;
                    if (ac === 1 && dr === dir) return true;
                } else if (type === 'n') {
                    if ((ar === 2 && ac === 1) || (ar === 1 && ac === 2)) return true;
                } else if (type === 'k') {
                    if (ar <= 1 && ac <= 1) return true;
                } else if (type === 'r') {
                    if ((r === tr || c === tc) && isPathClear(b, r, c, tr, tc)) return true;
                } else if (type === 'b') {
                    if (ar === ac && isPathClear(b, r, c, tr, tc)) return true;
                } else if (type === 'q') {
                    if ((r === tr || c === tc || ar === ac) && isPathClear(b, r, c, tr, tc)) return true;
                }
            }
        }
    }
    return false;
}

function findKingInBoard(board, turn) {
    const targetKing = turn === "white" ? "K" : "k";
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (board[r][c] === targetKing) return { r, c };
        }
    }
    return null;
}

function isSafeMove(fr, fc, tr, tc, board, turn, enPassantTarget = null) {
    const backupPiece = board[tr][tc];
    const piece = board[fr][fc];
    let epBackup = "";
    const isEp = piece && piece.toLowerCase() === 'p' && enPassantTarget && tr === enPassantTarget.r && tc === enPassantTarget.c && !backupPiece;

    if (isEp) {
        epBackup = board[fr][tc];
        board[fr][tc] = "";
    }
    board[tr][tc] = piece;
    board[fr][fc] = "";

    const kingPos = findKingInBoard(board, turn);
    const opponent = turn === "white" ? "black" : "white";
    const safe = !(kingPos && isAttacked(kingPos.r, kingPos.c, opponent, board));

    board[fr][fc] = piece;
    board[tr][tc] = backupPiece;
    if (isEp) {
        board[fr][tc] = epBackup;
    }
    return safe;
}

function evaluate(board) {
    let score = 0;
    let whiteBishops = 0;
    let blackBishops = 0;
    let nonPawnMaterial = 0;
    const whitePawnsByCol = new Array(8).fill(0);
    const blackPawnsByCol = new Array(8).fill(0);

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const p = board[r][c];
            if (!p) continue;
            const lower = p.toLowerCase();
            if (lower !== 'p' && lower !== 'k') {
                nonPawnMaterial += VALUE[lower] || 0;
            }
            if (p === 'P') whitePawnsByCol[c]++;
            if (p === 'p') blackPawnsByCol[c]++;
            if (p === 'B') whiteBishops++;
            if (p === 'b') blackBishops++;
        }
    }

    // Phase: 0 = pure endgame, 1 = opening/middlegame
    const phase = Math.min(1, nonPawnMaterial / 6200);

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const p = board[r][c];
            if (!p) continue;
            const type = p.toUpperCase();
            const isWhite = p === type;
            const pr = isWhite ? r : 7 - r;

            let val = VALUE[p] || 0;
            if (type === 'K') {
                const mg = PST.K[pr][c];
                const eg = PST.K_EG[pr][c];
                val += Math.round(mg * phase + eg * (1 - phase));
            } else if (PST[type]) {
                val += PST[type][pr][c];
            }

            // Bonus für Freibauern & offene Linien für Türme
            if (type === 'P') {
                const ownCol = isWhite ? whitePawnsByCol[c] : blackPawnsByCol[c];
                if (ownCol > 1) val -= 12; // Doppelbauer
                let isPassed = true;
                const oppPawns = isWhite ? blackPawnsByCol : whitePawnsByCol;
                for (let adj = Math.max(0, c - 1); adj <= Math.min(7, c + 1); adj++) {
                    if (oppPawns[adj] > 0) {
                        for (let rr = isWhite ? r - 1 : r + 1; isWhite ? rr >= 0 : rr <= 7; rr += (isWhite ? -1 : 1)) {
                            const blocker = board[rr][adj];
                            if (blocker === (isWhite ? 'p' : 'P')) {
                                isPassed = false;
                                break;
                            }
                        }
                    }
                    if (!isPassed) break;
                }
                if (isPassed) {
                    const rankAdvance = isWhite ? (7 - r) : r;
                    val += 15 + rankAdvance * 8;
                }
            } else if (type === 'R') {
                const ownCol = isWhite ? whitePawnsByCol[c] : blackPawnsByCol[c];
                const oppCol = isWhite ? blackPawnsByCol[c] : whitePawnsByCol[c];
                if (ownCol === 0 && oppCol === 0) val += 22; // Offene Linie
                else if (ownCol === 0) val += 10; // Halboffene Linie
            }

            score += (isWhite ? 1 : -1) * val;
        }
    }

    if (whiteBishops >= 2) score += 35;
    if (blackBishops >= 2) score -= 35;
    return score;
}

function generateMoves(board, turn, castlingRights = 'KQkq', enPassantTarget = null) {
    const moves = [];
    const opp = turn === "white" ? "black" : "white";

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (!piece || !isOwn(piece, turn)) continue;

            for (let tr = 0; tr < 8; tr++) {
                for (let tc = 0; tc < 8; tc++) {
                    const isEp = piece.toLowerCase() === 'p' && enPassantTarget &&
                        tr === enPassantTarget.r && tc === enPassantTarget.c &&
                        Math.abs(tc - c) === 1 && tr - r === (piece === 'P' ? -1 : 1) && !board[tr][tc];
                    if ((canMoveSimple(board, r, c, tr, tc, turn) || isEp) && isSafeMove(r, c, tr, tc, board, turn, enPassantTarget)) {
                        const target = board[tr][tc];
                        const isCapture = Boolean(target) || isEp;
                        const isPromo = piece.toLowerCase() === 'p' && (tr === 0 || tr === 7);
                        let prio = 0;
                        if (target) {
                            prio = 10000 + 10 * VALUE[target.toLowerCase()] - VALUE[piece.toLowerCase()];
                        } else if (isEp) {
                            prio = 10900;
                        }
                        if (isPromo) {
                            prio += 9000;
                        }
                        moves.push({
                            fr: r, fc: c, tr, tc,
                            priority: prio,
                            isEp,
                            isCapture,
                            promotion: isPromo ? 'q' : undefined
                        });
                    }
                }
            }

            // Rochade
            if (piece.toLowerCase() === 'k' && c === 4 && ((turn === 'white' && r === 7) || (turn === 'black' && r === 0))) {
                const rights = typeof castlingRights === 'string' ? castlingRights : 'KQkq';
                const kShort = turn === 'white' ? rights.includes('K') : rights.includes('k');
                const kLong = turn === 'white' ? rights.includes('Q') : rights.includes('q');
                const rookChar = turn === 'white' ? 'R' : 'r';

                if (kShort && board[r][7] === rookChar && board[r][5] === "" && board[r][6] === "" &&
                    !isAttacked(r, 4, opp, board) && !isAttacked(r, 5, opp, board) && !isAttacked(r, 6, opp, board)) {
                    moves.push({ fr: r, fc: 4, tr: r, tc: 6, priority: 600, isCastle: true, isCapture: false });
                }
                if (kLong && board[r][0] === rookChar && board[r][1] === "" && board[r][2] === "" && board[r][3] === "" &&
                    !isAttacked(r, 4, opp, board) && !isAttacked(r, 3, opp, board) && !isAttacked(r, 2, opp, board)) {
                    moves.push({ fr: r, fc: 4, tr: r, tc: 2, priority: 550, isCastle: true, isCapture: false });
                }
            }
        }
    }
    return moves.sort((a, b) => b.priority - a.priority);
}

function makeMove(board, m) {
    const b2 = cloneBoard(board);
    const piece = b2[m.fr][m.fc];
    if (m.isEp) {
        b2[m.fr][m.tc] = "";
    }
    if (piece && piece.toLowerCase() === 'k' && Math.abs(m.tc - m.fc) === 2) {
        if (m.tc === 6) {
            b2[m.fr][5] = b2[m.fr][7];
            b2[m.fr][7] = "";
        } else if (m.tc === 2) {
            b2[m.fr][3] = b2[m.fr][0];
            b2[m.fr][0] = "";
        }
    }
    b2[m.tr][m.tc] = piece;
    b2[m.fr][m.fc] = "";
    if (b2[m.tr][m.tc] === 'P' && m.tr === 0) {
        b2[m.tr][m.tc] = (m.promotion || 'q').toUpperCase();
    }
    if (b2[m.tr][m.tc] === 'p' && m.tr === 7) {
        b2[m.tr][m.tc] = (m.promotion || 'q').toLowerCase();
    }
    return b2;
}

function computeNextState(board, m, castlingRights) {
    let nextCastling = typeof castlingRights === 'string' ? castlingRights : 'KQkq';
    const piece = board[m.fr][m.fc];
    const captured = board[m.tr][m.tc];

    if (nextCastling) {
        if (piece === 'K') nextCastling = nextCastling.replace(/[KQ]/g, '');
        else if (piece === 'k') nextCastling = nextCastling.replace(/[kq]/g, '');
        else if (piece === 'R') {
            if (m.fr === 7 && m.fc === 7) nextCastling = nextCastling.replace('K', '');
            if (m.fr === 7 && m.fc === 0) nextCastling = nextCastling.replace('Q', '');
        } else if (piece === 'r') {
            if (m.fr === 0 && m.fc === 7) nextCastling = nextCastling.replace('k', '');
            if (m.fr === 0 && m.fc === 0) nextCastling = nextCastling.replace('q', '');
        }
        if (captured === 'R') {
            if (m.tr === 7 && m.tc === 7) nextCastling = nextCastling.replace('K', '');
            if (m.tr === 7 && m.tc === 0) nextCastling = nextCastling.replace('Q', '');
        } else if (captured === 'r') {
            if (m.tr === 0 && m.tc === 7) nextCastling = nextCastling.replace('k', '');
            if (m.tr === 0 && m.tc === 0) nextCastling = nextCastling.replace('q', '');
        }
    }

    let nextEp = null;
    if (piece && piece.toLowerCase() === 'p' && Math.abs(m.tr - m.fr) === 2) {
        nextEp = { r: (m.fr + m.tr) / 2, c: m.fc };
    }

    return { nextCastling, nextEp };
}

function moveKey(m) {
    return `${m.fr}${m.fc}${m.tr}${m.tc}${m.promotion || ''}`;
}

function moveToUci(m) {
    if (!m) return null;
    return COLS[m.fc] + (8 - m.fr) + COLS[m.tc] + (8 - m.tr) + (m.promotion || '');
}

function orderMoves(moves, ttBestKey, ply) {
    if (!ttBestKey && (!killerMoves[ply] || killerMoves[ply].length === 0)) return moves;
    const killers = killerMoves[ply] || [];
    return moves.sort((a, b) => {
        const ka = moveKey(a);
        const kb = moveKey(b);
        if (ka === ttBestKey) return -1;
        if (kb === ttBestKey) return 1;
        const aKiller = killers.includes(ka) ? 5000 : 0;
        const bKiller = killers.includes(kb) ? 5000 : 0;
        return (b.priority + bKiller) - (a.priority + aKiller);
    });
}

function quiescence(board, alpha, beta, maximizing, turn, castlingRights, enPassantTarget, qDepth = 0, deadline = 0) {
    if (deadline && Date.now() > deadline) return evaluate(board);
    const standPat = evaluate(board);
    if (qDepth >= 4) return standPat;

    if (maximizing) {
        if (standPat >= beta) return beta;
        if (alpha < standPat) alpha = standPat;
    } else {
        if (standPat <= alpha) return alpha;
        if (beta > standPat) beta = standPat;
    }

    const moves = generateMoves(board, turn, castlingRights, enPassantTarget).filter(m => m.isCapture || m.promotion);
    const nextTurn = turn === "white" ? "black" : "white";
    for (const m of moves) {
        const b2 = makeMove(board, m);
        const { nextCastling, nextEp } = computeNextState(board, m, castlingRights);
        const score = quiescence(b2, alpha, beta, !maximizing, nextTurn, nextCastling, nextEp, qDepth + 1, deadline);
        if (maximizing) {
            if (score > alpha) alpha = score;
            if (alpha >= beta) break;
        } else {
            if (score < beta) beta = score;
            if (beta <= alpha) break;
        }
    }
    return maximizing ? alpha : beta;
}

function alphaBeta(board, depth, alpha, beta, maximizing, turn, castlingRights = '', enPassantTarget = null, ply = 0, deadline = 0) {
    if (deadline && Date.now() > deadline) {
        return evaluate(board);
    }

    const origAlpha = alpha;
    const origBeta = beta;
    const epKey = enPassantTarget ? `${enPassantTarget.r}${enPassantTarget.c}` : '-';
    const boardKey = board.flat().join('') + '_' + turn + '_' + castlingRights + '_' + epKey;
    const cached = transpositionTable.get(boardKey);
    let ttBestKey = null;

    if (cached) {
        ttBestKey = cached.bestKey;
        if (cached.depth >= depth) {
            if (cached.flag === TT_EXACT) return cached.score;
            if (cached.flag === TT_LOWER && cached.score > alpha) alpha = cached.score;
            else if (cached.flag === TT_UPPER && cached.score < beta) beta = cached.score;
            if (alpha >= beta) return cached.score;
        }
    }

    if (depth <= 0) {
        return quiescence(board, alpha, beta, maximizing, turn, castlingRights, enPassantTarget, 0, deadline);
    }

    const moves = orderMoves(generateMoves(board, turn, castlingRights, enPassantTarget), ttBestKey, ply);
    if (moves.length === 0) {
        const kingPos = findKingInBoard(board, turn);
        const opp = turn === "white" ? "black" : "white";
        const inCheck = kingPos ? isAttacked(kingPos.r, kingPos.c, opp, board) : false;
        if (!inCheck) return 0; // Patt
        return maximizing ? (-900000 + ply * 100) : (900000 - ply * 100);
    }

    let bestMoveKey = moveKey(moves[0]);
    let evalRes;
    const nextTurn = turn === "white" ? "black" : "white";

    if (maximizing) {
        let maxEval = -Infinity;
        for (const m of moves) {
            const { nextCastling, nextEp } = computeNextState(board, m, castlingRights);
            const ev = alphaBeta(makeMove(board, m), depth - 1, alpha, beta, false, nextTurn, nextCastling, nextEp, ply + 1, deadline);
            if (ev > maxEval) {
                maxEval = ev;
                bestMoveKey = moveKey(m);
            }
            if (ev > alpha) alpha = ev;
            if (beta <= alpha) {
                if (!m.isCapture) {
                    killerMoves[ply] = killerMoves[ply] || [];
                    if (!killerMoves[ply].includes(bestMoveKey)) {
                        killerMoves[ply].unshift(bestMoveKey);
                        if (killerMoves[ply].length > 2) killerMoves[ply].pop();
                    }
                }
                break;
            }
            if (deadline && Date.now() > deadline) break;
        }
        evalRes = maxEval;
    } else {
        let minEval = Infinity;
        for (const m of moves) {
            const { nextCastling, nextEp } = computeNextState(board, m, castlingRights);
            const ev = alphaBeta(makeMove(board, m), depth - 1, alpha, beta, true, nextTurn, nextCastling, nextEp, ply + 1, deadline);
            if (ev < minEval) {
                minEval = ev;
                bestMoveKey = moveKey(m);
            }
            if (ev < beta) beta = ev;
            if (beta <= alpha) {
                if (!m.isCapture) {
                    killerMoves[ply] = killerMoves[ply] || [];
                    if (!killerMoves[ply].includes(bestMoveKey)) {
                        killerMoves[ply].unshift(bestMoveKey);
                        if (killerMoves[ply].length > 2) killerMoves[ply].pop();
                    }
                }
                break;
            }
            if (deadline && Date.now() > deadline) break;
        }
        evalRes = minEval;
    }

    if (transpositionTable.size < 50000 && (!deadline || Date.now() <= deadline)) {
        let flag = TT_EXACT;
        if (evalRes <= origAlpha) flag = TT_UPPER;
        else if (evalRes >= origBeta) flag = TT_LOWER;
        transpositionTable.set(boardKey, { score: evalRes, depth, flag, bestKey: bestMoveKey });
    }
    return evalRes;
}

function searchBestMove(board, turn, castlingRights, enPassantTarget, maxDepth, timeBudgetMs) {
    const moves = generateMoves(board, turn, castlingRights, enPassantTarget);
    if (!moves || moves.length === 0) {
        return { bestMove: null, bestScore: 0, movesCount: 0 };
    }

    transpositionTable.clear();
    killerMoves.length = 0;

    const deadline = Date.now() + timeBudgetMs;
    const isMax = turn === "white";
    const nextTurn = isMax ? "black" : "white";

    let bestMove = moves[0];
    let bestScore = evaluate(board);

    for (let depth = 1; depth <= maxDepth; depth++) {
        let currentBestMove = bestMove;
        let currentBestScore = isMax ? -Infinity : Infinity;
        let completedDepth = true;

        // Vorherigen besten Zug nach vorne sortieren
        const ordered = orderMoves([...moves], moveKey(bestMove), 0);

        for (const m of ordered) {
            const { nextCastling, nextEp } = computeNextState(board, m, castlingRights);
            const score = alphaBeta(
                makeMove(board, m),
                depth - 1,
                -Infinity,
                Infinity,
                !isMax,
                nextTurn,
                nextCastling,
                nextEp,
                1,
                deadline
            );
            if (isMax ? score > currentBestScore : score < currentBestScore) {
                currentBestScore = score;
                currentBestMove = m;
            }
            if (Date.now() > deadline) {
                completedDepth = false;
                break;
            }
        }

        if (completedDepth || depth === 1) {
            bestMove = currentBestMove;
            bestScore = currentBestScore;
        }
        if (Date.now() > deadline || Math.abs(bestScore) > 850000) break;
    }

    return { bestMove, bestScore, movesCount: moves.length };
}

onmessage = function(e) {
    if (!e || !e.data) return;
    const { action, board, turn, fen, difficulty, castling, enPassantTarget, evalId } = e.data;
    if (!board || !turn) return;

    const castlingStr = typeof castling === 'string' ? castling : 'KQkq';
    const epTarget = enPassantTarget || null;

    // Live Position Evaluation Mode (used by Eval Bar + Accuracy Tracking + Best-Move Hint)
    if (action === 'eval') {
        const result = searchBestMove(board, turn, castlingStr, epTarget, 3, 280);
        if (result.movesCount === 0) {
            const kPos = findKingInBoard(board, turn);
            const opp = turn === 'white' ? 'black' : 'white';
            const inCheck = kPos ? isAttacked(kPos.r, kPos.c, opp, board) : false;
            postMessage({
                type: 'eval_result',
                evalId,
                cp: 0,
                mate: inCheck ? (turn === 'white' ? -1 : 1) : null,
                stalemate: !inCheck,
                bestMove: null
            });
            return;
        }

        let mate = null;
        if (Math.abs(result.bestScore) > 800000) {
            const plyToMate = Math.max(1, Math.round((900000 - Math.abs(result.bestScore)) / 100));
            const movesToMate = Math.ceil(plyToMate / 2);
            mate = result.bestScore > 0 ? movesToMate : -movesToMate;
        }

        const bm = result.bestMove ? { ...result.bestMove, uci: moveToUci(result.bestMove) } : null;
        postMessage({
            type: 'eval_result',
            evalId,
            cp: Math.round(result.bestScore) / 100,
            mate,
            bestMove: bm
        });
        return;
    }

    // Bot Move Search Mode
    const cleanFen = fen ? fen.split(' ')[0] : null;
    if (cleanFen && OPENING_BOOK[cleanFen] && difficulty !== '1') {
        const bookMoves = OPENING_BOOK[cleanFen];
        const move = bookMoves[Math.floor(Math.random() * bookMoves.length)];
        postMessage({
            fr: 8 - parseInt(move[1], 10),
            fc: COLS.indexOf(move[0]),
            tr: 8 - parseInt(move[3], 10),
            tc: COLS.indexOf(move[2]),
            uci: move
        });
        return;
    }

    const moves = generateMoves(board, turn, castlingStr, epTarget);
    if (!moves || moves.length === 0) {
        postMessage(null);
        return;
    }

    // Slight variety on Easy mode
    if (difficulty === '1' && moves.length > 1 && Math.random() < 0.35) {
        const pool = moves.slice(0, Math.min(4, moves.length));
        const picked = pool[Math.floor(Math.random() * pool.length)];
        postMessage({ ...picked, uci: moveToUci(picked) });
        return;
    }

    let searchDepth = 3;
    let timeBudgetMs = 650;
    if (difficulty === 'instant') {
        searchDepth = 1;
        timeBudgetMs = 150;
    } else if (difficulty === '1') {
        searchDepth = 1;
        timeBudgetMs = 250;
    } else if (difficulty === '3') {
        searchDepth = 3;
        timeBudgetMs = 750;
    } else if (difficulty === '5' || difficulty === '10') {
        searchDepth = 4;
        timeBudgetMs = 1400;
    }

    const res = searchBestMove(board, turn, castlingStr, epTarget, searchDepth, timeBudgetMs);
    if (!res.bestMove) {
        postMessage(null);
        return;
    }

    postMessage({
        ...res.bestMove,
        score: res.bestScore,
        uci: moveToUci(res.bestMove)
    });
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generateMoves,
        makeMove,
        computeNextState,
        isSafeMove,
        canMoveSimple,
        isOwn,
        cloneBoard,
        evaluate,
        searchBestMove,
        VALUE,
        PST
    };
}
