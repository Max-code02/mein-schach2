// openingBook.js - EXPANDED ECO OPENING BOOK & THEORY ENGINE FOR CHESSLIVE

(function() {
    const OPENINGS_DATABASE = [
        // 1. e4 e5 Systems
        { eco: "C20", name: "Königsspiel (King's Pawn Game)", moves: ["e2e4", "e7e5"] },
        { eco: "C23", name: "Läufer-Eröffnung (Bishop's Opening)", moves: ["e2e4", "e7e5", "f1c4"] },
        { eco: "C25", name: "Wiener Partie (Vienna Game)", moves: ["e2e4", "e7e5", "b1c3"] },
        { eco: "C30", name: "Königsgambit (King's Gambit)", moves: ["e2e4", "e7e5", "f2f4"] },
        { eco: "C41", name: "Philidor-Verteidigung", moves: ["e2e4", "e7e5", "g1f3", "d7d6"] },
        { eco: "C42", name: "Russische Verteidigung (Petrov's Defense)", moves: ["e2e4", "e7e5", "g1f3", "g8f6"] },
        { eco: "C44", name: "Schottische Partie (Scotch Game)", moves: ["e2e4", "e7e5", "g1f3", "b8c6", "d2d4"] },
        { eco: "C45", name: "Schottische Partie: Hauptvariante", moves: ["e2e4", "e7e5", "g1f3", "b8c6", "d2d4", "e5d4", "f3d4"] },
        { eco: "C47", name: "Vierspringerspiel (Four Knights Game)", moves: ["e2e4", "e7e5", "g1f3", "b8c6", "b1c3", "g8f6"] },
        { eco: "C50", name: "Italienische Partie (Italian Game)", moves: ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4"] },
        { eco: "C53", name: "Italienisch: Giuoco Piano", moves: ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "f8c5"] },
        { eco: "C54", name: "Italienisch: Giuoco Pianissimo", moves: ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "f8c5", "c2c3", "g8f6", "d2d3"] },
        { eco: "C55", name: "Zweispringerspiel im Nachzuge", moves: ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "g8f6"] },
        { eco: "C57", name: "Preußisch: Fried-Liver Angriff", moves: ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "g8f6", "f3g5"] },
        { eco: "C60", name: "Spanische Partie (Ruy Lopez)", moves: ["e2e4", "e7e5", "g1f3", "b8c6", "f1b5"] },
        { eco: "C65", name: "Spanisch: Berliner Verteidigung", moves: ["e2e4", "e7e5", "g1f3", "b8c6", "f1b5", "g8f6"] },
        { eco: "C70", name: "Spanisch: Morphy-Verteidigung", moves: ["e2e4", "e7e5", "g1f3", "b8c6", "f1b5", "a7a6"] },
        { eco: "C78", name: "Spanisch: Geschlossene Morphy-Verteidigung", moves: ["e2e4", "e7e5", "g1f3", "b8c6", "f1b5", "a7a6", "b5a4", "g8f6"] },
        { eco: "C88", name: "Spanisch: Anti-Marshall / Geschlossen", moves: ["e2e4", "e7e5", "g1f3", "b8c6", "f1b5", "a7a6", "b5a4", "g8f6", "e1g1", "f8e7"] },

        // Semi-Open Games (1. e4 ...)
        { eco: "B00", name: "Königsbauer-Eröffnung", moves: ["e2e4"] },
        { eco: "B01", name: "Skandinavische Verteidigung", moves: ["e2e4", "d7d5"] },
        { eco: "B01", name: "Skandinavisch: Abtauschvariante", moves: ["e2e4", "d7d5", "e4d5", "d8d5"] },
        { eco: "B02", name: "Aljechin-Verteidigung", moves: ["e2e4", "g8f6"] },
        { eco: "B06", name: "Moderne Verteidigung", moves: ["e2e4", "g7g6"] },
        { eco: "B07", name: "Pirc-Ufimzew-Verteidigung", moves: ["e2e4", "d7d6", "d2d4", "g8f6"] },
        { eco: "B10", name: "Caro-Kann-Verteidigung", moves: ["e2e4", "c7c6"] },
        { eco: "B12", name: "Caro-Kann: Hauptvariante", moves: ["e2e4", "c7c6", "d2d4", "d7d5"] },
        { eco: "B12", name: "Caro-Kann: Vorstoßvariante", moves: ["e2e4", "c7c6", "d2d4", "d7d5", "e4e5"] },
        { eco: "B13", name: "Caro-Kann: Abtauschvariante", moves: ["e2e4", "c7c6", "d2d4", "d7d5", "e4d5", "c6d5"] },
        { eco: "B18", name: "Caro-Kann: Klassisch", moves: ["e2e4", "c7c6", "d2d4", "d7d5", "b1c3", "d5e4", "c3e4", "c8f5"] },
        { eco: "B20", name: "Sizilianische Verteidigung", moves: ["e2e4", "c7c5"] },
        { eco: "B22", name: "Sizilianisch: Alapin-Variante", moves: ["e2e4", "c7c5", "c2c3"] },
        { eco: "B23", name: "Sizilianisch: Geschlossene Variante", moves: ["e2e4", "c7c5", "b1c3"] },
        { eco: "B30", name: "Sizilianisch: Rossolimo / Alt-Sizilianisch", moves: ["e2e4", "c7c5", "g1f3", "b8c6"] },
        { eco: "B33", name: "Sizilianisch: Sweschnikow-Variante", moves: ["e2e4", "c7c5", "g1f3", "b8c6", "d2d4", "c5d4", "f3d4", "g8f6", "b1c3", "e7e5"] },
        { eco: "B40", name: "Sizilianisch: Paulsen / Kan-Struktur", moves: ["e2e4", "c7c5", "g1f3", "e7e6"] },
        { eco: "B50", name: "Offenes Sizilianisch", moves: ["e2e4", "c7c5", "g1f3", "d7d6", "d2d4", "c5d4", "f3d4"] },
        { eco: "B70", name: "Sizilianisch: Drachenvariante", moves: ["e2e4", "c7c5", "g1f3", "d7d6", "d2d4", "c5d4", "f3d4", "g8f6", "b1c3", "g7g6"] },
        { eco: "B90", name: "Sizilianisch: Najdorf-Variante", moves: ["e2e4", "c7c5", "g1f3", "d7d6", "d2d4", "c5d4", "f3d4", "g8f6", "b1c3", "a7a6"] },
        { eco: "C00", name: "Französische Verteidigung", moves: ["e2e4", "e7e6"] },
        { eco: "C02", name: "Französisch: Vorstoßvariante", moves: ["e2e4", "e7e6", "d2d4", "d7d5", "e4e5"] },
        { eco: "C10", name: "Französisch: Rubinstein / Paulsen", moves: ["e2e4", "e7e6", "d2d4", "d7d5", "b1c3"] },
        { eco: "C15", name: "Französisch: Winawer-Variante", moves: ["e2e4", "e7e6", "d2d4", "d7d5", "b1c3", "f8b4"] },

        // Closed & Indian Games (1. d4 ...)
        { eco: "D00", name: "Damenbauer-Eröffnung", moves: ["d2d4"] },
        { eco: "D00", name: "Jobava London System", moves: ["d2d4", "d7d5", "b1c3", "g8f6", "c1f4"] },
        { eco: "D02", name: "Londoner System (London System)", moves: ["d2d4", "d7d5", "g1f3", "g8f6", "c1f4"] },
        { eco: "D06", name: "Damengambit (Queen's Gambit)", moves: ["d2d4", "d7d5", "c2c4"] },
        { eco: "D10", name: "Slawische Verteidigung", moves: ["d2d4", "d7d5", "c2c4", "c7c6"] },
        { eco: "D20", name: "Angenommenes Damengambit (QGA)", moves: ["d2d4", "d7d5", "c2c4", "d5c4"] },
        { eco: "D30", name: "Abgelehntes Damengambit (QGD)", moves: ["d2d4", "d7d5", "c2c4", "e7e6"] },
        { eco: "D37", name: "Damengambit: Klassisches System", moves: ["d2d4", "d7d5", "c2c4", "e7e6", "b1c3", "g8f6", "c1g5"] },
        { eco: "A45", name: "Indische Verteidigung", moves: ["d2d4", "g8f6"] },
        { eco: "A45", name: "Trompowsky-Angriff", moves: ["d2d4", "g8f6", "c1g5"] },
        { eco: "A57", name: "Benko-Gambit / Wolga-Gambit", moves: ["d2d4", "g8f6", "c2c4", "c7c5", "d4d5", "b7b5"] },
        { eco: "A60", name: "Moderne Benoni-Verteidigung", moves: ["d2d4", "g8f6", "c2c4", "c7c5", "d4d5", "e7e6"] },
        { eco: "A80", name: "Holländische Verteidigung (Dutch)", moves: ["d2d4", "f7f5"] },
        { eco: "E00", name: "Katalanische Eröffnung (Catalan)", moves: ["d2d4", "g8f6", "c2c4", "e7e6", "g2g3"] },
        { eco: "E20", name: "Nimzo-Indische Verteidigung", moves: ["d2d4", "g8f6", "c2c4", "e7e6", "b1c3", "f8b4"] },
        { eco: "E60", name: "Königsindische Verteidigung (KID)", moves: ["d2d4", "g8f6", "c2c4", "g7g6"] },
        { eco: "E70", name: "Königsindisch: Klassisch", moves: ["d2d4", "g8f6", "c2c4", "g7g6", "b1c3", "f8g7", "e2e4"] },
        { eco: "D80", name: "Grünfeld-Indische Verteidigung", moves: ["d2d4", "g8f6", "c2c4", "g7g6", "b1c3", "d7d5"] },

        // Flank Openings
        { eco: "A10", name: "Englische Eröffnung (English Opening)", moves: ["c2c4"] },
        { eco: "A20", name: "Englisch: Sizilianisch im Anzug", moves: ["c2c4", "e7e5"] },
        { eco: "A04", name: "Réti-Eröffnung", moves: ["g1f3"] },
        { eco: "A06", name: "Réti: Klassisch", moves: ["g1f3", "d7d5", "c2c4"] },
        { eco: "A02", name: "Bird-Eröffnung", moves: ["f2f4"] },
        { eco: "A00", name: "Nimzowitsch-Larsen-Angriff", moves: ["b2b3"] }
    ];

    function moveToString(m) {
        if (!m) return "";
        if (typeof m === 'string') return m.slice(0, 4);
        const cols = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        const fromSquare = cols[m.fc] + (8 - m.fr);
        const toSquare = cols[m.tc] + (8 - m.tr);
        return fromSquare + toSquare;
    }

    function identifyOpening(historyMoves = []) {
        if (!historyMoves || historyMoves.length === 0) return null;

        const uciHistory = historyMoves.map(m => moveToString(m));
        let bestMatch = null;
        let maxMatchLen = 0;

        for (const opening of OPENINGS_DATABASE) {
            if (opening.moves.length > uciHistory.length) continue;
            let isMatch = true;
            for (let i = 0; i < opening.moves.length; i++) {
                if (uciHistory[i] !== opening.moves[i]) {
                    isMatch = false;
                    break;
                }
            }
            if (isMatch && opening.moves.length >= maxMatchLen) {
                bestMatch = opening;
                maxMatchLen = opening.moves.length;
            }
        }

        return bestMatch;
    }

    function getBookContinuations(historyMoves = []) {
        const uciHistory = (historyMoves || []).map(m => moveToString(m));
        const currentLen = uciHistory.length;
        const map = new Map();

        for (const opening of OPENINGS_DATABASE) {
            if (opening.moves.length <= currentLen) continue;
            let matchesPrefix = true;
            for (let i = 0; i < currentLen; i++) {
                if (opening.moves[i] !== uciHistory[i]) {
                    matchesPrefix = false;
                    break;
                }
            }
            if (!matchesPrefix) continue;
            const nextMove = opening.moves[currentLen];
            if (!map.has(nextMove)) {
                map.set(nextMove, {
                    uci: nextMove,
                    eco: opening.eco,
                    name: opening.name,
                    count: 1
                });
            } else {
                map.get(nextMove).count += 1;
            }
        }

        return Array.from(map.values()).sort((a, b) => b.count - a.count);
    }

    function getBookMove(historyMoves = []) {
        const continuations = getBookContinuations(historyMoves);
        if (continuations.length === 0) return null;
        const chosen = continuations[Math.floor(Math.random() * continuations.length)];
        return chosen.uci;
    }

    const api = {
        OPENINGS_DATABASE,
        identifyOpening,
        getBookMove,
        getBookContinuations,
        moveToString
    };

    if (typeof window !== 'undefined') {
        window.OpeningBook = api;
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
})();
