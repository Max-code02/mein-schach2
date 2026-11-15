// pgnEngine.js - FEN & PGN IMPORT, EXPORT AND PARSER ENGINE FOR CHESSLIVE

(function() {
    const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

    function escapePgnTagValue(val) {
        return String(val || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/[\r\n]+/g, ' ');
    }

    function boardToFEN(board, turn = 'white', castling = 'KQkq', enPassant = '-', halfMoves = 0, fullMoves = 1) {
        if (!board || !Array.isArray(board) || board.length !== 8) return STARTING_FEN;

        const fenRows = [];
        for (let r = 0; r < 8; r++) {
            let emptyCount = 0;
            let rowStr = "";
            for (let c = 0; c < 8; c++) {
                const piece = board[r] && board[r][c];
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
        return `${fenRows.join('/')} ${activeColor} ${castling || '-'} ${enPassant || '-'} ${halfMoves} ${fullMoves}`;
    }

    function parseFEN(fenString) {
        if (!fenString || typeof fenString !== 'string') return null;

        const parts = fenString.trim().split(/\s+/);
        const piecePlacement = parts[0];
        if (!piecePlacement) return null;

        const activeRaw = (parts[1] || 'w').toLowerCase();
        if (activeRaw !== 'w' && activeRaw !== 'b') return null;
        const turn = activeRaw === 'b' ? 'black' : 'white';
        const castling = parts[2] || '-';
        const enPassant = parts[3] || '-';
        const halfMoves = Math.max(0, parseInt(parts[4] || '0', 10) || 0);
        const fullMoves = Math.max(1, parseInt(parts[5] || '1', 10) || 1);

        const rows = piecePlacement.split('/');
        if (rows.length !== 8) return null;

        const validPieces = new Set(['p', 'n', 'b', 'r', 'q', 'k', 'P', 'N', 'B', 'R', 'Q', 'K']);
        const board = [];
        for (let r = 0; r < 8; r++) {
            const row = [];
            for (let i = 0; i < rows[r].length; i++) {
                const char = rows[r][i];
                if (/^[1-8]$/.test(char)) {
                    const emptySpots = parseInt(char, 10);
                    if (row.length + emptySpots > 8) return null;
                    for (let k = 0; k < emptySpots; k++) row.push("");
                } else if (validPieces.has(char)) {
                    if (row.length + 1 > 8) return null;
                    row.push(char);
                } else {
                    return null;
                }
            }
            if (row.length !== 8) return null;
            board.push(row);
        }

        return { board, turn, castling, enPassant, halfMoves, fullMoves };
    }

    function exportToPGN(metadata = {}) {
        const event = escapePgnTagValue(metadata.event || "Schach Live Match");
        const site = escapePgnTagValue(metadata.site || "Schach Live");
        const date = escapePgnTagValue(metadata.date || new Date().toISOString().slice(0, 10).replace(/-/g, '.'));
        const round = escapePgnTagValue(metadata.round || "1");
        const white = escapePgnTagValue(metadata.white || "Weiß");
        const black = escapePgnTagValue(metadata.black || "Schwarz");
        const result = escapePgnTagValue(metadata.result || "*");
        const eco = escapePgnTagValue(metadata.eco || "A00");
        const opening = escapePgnTagValue(metadata.opening || "");
        const fen = metadata.fen ? escapePgnTagValue(metadata.fen) : "";
        const variant = metadata.variant ? escapePgnTagValue(metadata.variant) : "";
        const moveHistory = Array.isArray(metadata.moveHistory) ? metadata.moveHistory : [];

        let pgn = `[Event "${event}"]\n`;
        pgn += `[Site "${site}"]\n`;
        pgn += `[Date "${date}"]\n`;
        pgn += `[Round "${round}"]\n`;
        pgn += `[White "${white}"]\n`;
        pgn += `[Black "${black}"]\n`;
        pgn += `[Result "${result}"]\n`;
        pgn += `[ECO "${eco}"]\n`;
        if (opening) pgn += `[Opening "${opening}"]\n`;
        if (variant && variant !== 'standard') pgn += `[Variant "${variant}"]\n`;
        if (fen && fen !== STARTING_FEN) {
            pgn += `[SetUp "1"]\n`;
            pgn += `[FEN "${fen}"]\n`;
        }
        pgn += `\n`;

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

    function stripNestedVariations(text) {
        let out = '';
        let depth = 0;
        let inBrace = false;
        for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            if (ch === '{') {
                inBrace = true;
                continue;
            }
            if (ch === '}') {
                inBrace = false;
                out += ' ';
                continue;
            }
            if (inBrace) continue;
            if (ch === '(') {
                depth++;
                continue;
            }
            if (ch === ')') {
                if (depth > 0) depth--;
                out += ' ';
                continue;
            }
            if (depth === 0) out += ch;
        }
        return out;
    }

    function parsePGN(pgnString) {
        if (!pgnString || typeof pgnString !== 'string') return null;

        const headers = {};
        const headerRegex = /\[([A-Za-z0-9_]+)\s+"((?:\\.|[^"\\])*)"\]/g;
        let match;
        while ((match = headerRegex.exec(pgnString)) !== null) {
            headers[match[1]] = match[2].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        }

        // Tag-Paare und Zeilenkommentare entfernen
        let movesText = pgnString
            .replace(/\[[A-Za-z0-9_]+\s+"(?:\\.|[^"\\])*"\]/g, ' ')
            .replace(/;[^\r\n]*/g, ' ');

        movesText = stripNestedVariations(movesText);

        const cleanMovesText = movesText
            .replace(/\$\d+/g, ' ')
            .replace(/\d+\.+/g, ' ')
            .replace(/\.\.\./g, ' ')
            .trim();

        const rawMoves = cleanMovesText
            .split(/\s+/)
            .map(m => m.replace(/[!?]+$/g, ''))
            .filter(m => m && !['1-0', '0-1', '1/2-1/2', '*'].includes(m));

        return {
            headers,
            moves: rawMoves,
            fen: headers["FEN"] || null,
            result: headers["Result"] || "*"
        };
    }

    const api = {
        STARTING_FEN,
        boardToFEN,
        parseFEN,
        exportToPGN,
        parsePGN
    };

    if (typeof window !== 'undefined') {
        window.PGNEngine = api;
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
})();
