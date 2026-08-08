// pgnEngine.js - FEN & PGN IMPORT, EXPORT AND PARSER ENGINE FOR CHESSLIVE

/**
 * Standard FEN für die Startaufstellung
 */
const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

/**
 * Konvertiert ein 8x8 Board Array in eine gültige FEN-Zeichenkette
 */
function boardToFEN(board, turn = 'white', castling = 'KQkq', enPassant = '-', halfMoves = 0, fullMoves = 1) {
    if (!board || !Array.isArray(board)) return STARTING_FEN;

    let fenRows = [];
    for (let r = 0; r < 8; r++) {
        let emptyCount = 0;
        let rowStr = "";
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (!piece) {
                emptyCount++;
            } else {
                if (emptyCount > 0) {
                    rowStr += emptyCount;
                    emptyCount = 0;
                }
                rowStr += piece;
            }
        }
        if (emptyCount > 0) rowStr += emptyCount;
        fenRows.push(rowStr);
    }

    const activeColor = (turn === 'white' || turn === 'w') ? 'w' : 'b';
    return `${fenRows.join('/')} ${activeColor} ${castling} ${enPassant} ${halfMoves} ${fullMoves}`;
}

/**
 * Konvertiert eine FEN-Zeichenkette in ein 8x8 Board Array
 */
function parseFEN(fenString) {
    if (!fenString || typeof fenString !== 'string') return null;

    const parts = fenString.trim().split(/\s+/);
    const piecePlacement = parts[0];
    const turn = (parts[1] === 'b') ? 'black' : 'white';
    const castling = parts[2] || '-';
    const enPassant = parts[3] || '-';

    const rows = piecePlacement.split('/');
    if (rows.length !== 8) return null;

    const board = [];
    for (let r = 0; r < 8; r++) {
        const row = [];
        for (let i = 0; i < rows[r].length; i++) {
            const char = rows[r][i];
            if (!isNaN(char)) {
                const emptySpots = parseInt(char, 10);
                for (let k = 0; k < emptySpots; k++) row.push(null);
            } else {
                row.push(char);
            }
        }
        if (row.length !== 8) return null;
        board.push(row);
    }

    return {
        board: board,
        turn: turn,
        castling: castling,
        enPassant: enPassant
    };
}

/**
 * Generiert eine standardisierte PGN-Datei aus Partiedaten
 */
function exportToPGN(metadata = {}) {
    const event = metadata.event || "ChessLive Tournament Match";
    const site = metadata.site || "ChessLive Online Platform";
    const date = metadata.date || new Date().toISOString().slice(0, 10).replace(/-/g, '.');
    const round = metadata.round || "1";
    const white = metadata.white || "Spieler 1";
    const black = metadata.black || "Spieler 2";
    const result = metadata.result || "*";
    const eco = metadata.eco || "A00";
    const moveHistory = metadata.moveHistory || [];

    let pgn = `[Event "${event}"]\n`;
    pgn += `[Site "${site}"]\n`;
    pgn += `[Date "${date}"]\n`;
    pgn += `[Round "${round}"]\n`;
    pgn += `[White "${white}"]\n`;
    pgn += `[Black "${black}"]\n`;
    pgn += `[Result "${result}"]\n`;
    pgn += `[ECO "${eco}"]\n\n`;

    let moveText = "";
    for (let i = 0; i < moveHistory.length; i++) {
        if (i % 2 === 0) {
            const moveNum = Math.floor(i / 2) + 1;
            moveText += `${moveNum}. `;
        }
        moveText += `${moveHistory[i]} `;
    }
    moveText += result;

    return pgn + moveText;
}

/**
 * Liest einfache PGN-Strings ein und extrahiert Metadaten sowie Züge
 */
function parsePGN(pgnString) {
    if (!pgnString || typeof pgnString !== 'string') return null;

    const headers = {};
    const headerRegex = /\[(\w+)\s+"([^"]+)"\]/g;
    let match;

    while ((match = headerRegex.exec(pgnString)) !== null) {
        headers[match[1]] = match[2];
    }

    // Move List ohne Header entfernen
    const movesText = pgnString.replace(/\[.*?\]/g, '').trim();
    const cleanMovesText = movesText.replace(/\{.*?\}/g, '').replace(/\d+\.+/g, '').trim();
    const rawMoves = cleanMovesText.split(/\s+/).filter(m => m && !['1-0', '0-1', '1/2-1/2', '*'].includes(m));

    return {
        headers: headers,
        moves: rawMoves,
        result: headers["Result"] || "*"
    };
}

module.exports = {
    STARTING_FEN,
    boardToFEN,
    parseFEN,
    exportToPGN,
    parsePGN
};
