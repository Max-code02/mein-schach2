// openingBook.js - OPENING BOOK & THEORY ENGINE FOR CHESSLIVE

/**
 * Standard Chess Openings Encyclopedia (ECO)
 */
const OPENINGS_DATABASE = [
    {
        name: "Sizilianische Verteidigung (Sicilian Defense)",
        eco: "B20",
        moves: ["e2e4", "c7c5"],
        description: "Die schärfste und populärste Antwort von Schwarz auf 1. e4."
    },
    {
        name: "Spanische Partie (Ruy Lopez)",
        eco: "C60",
        moves: ["e2e4", "e7e5", "g1f3", "b8c6", "f1b5"],
        description: "Klassische und tiefgründige Eröffnung, benannt nach Ruy López de Segura."
    },
    {
        name: "Italienische Partie (Italian Game)",
        eco: "C50",
        moves: ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4"],
        description: "Sehr beliebter und dynamischer Entwicklungsplan im Zentrum."
    },
    {
        name: "Damen-Gambit (Queen's Gambit)",
        eco: "D06",
        moves: ["d2d4", "d7d5", "c2c4"],
        description: "Klassisches Angebot eines Bauern zur Erlangung der Zentrumsherrschaft."
    },
    {
        name: "Französische Verteidigung (French Defense)",
        eco: "C00",
        moves: ["e2e4", "e7e6", "d2d4", "d7d5"],
        description: "Solide Verteidigung mit einer geschlossenen Bauernkette."
    },
    {
        name: "Caro-Kann Verteidigung",
        eco: "B10",
        moves: ["e2e4", "c7c6", "d2d4", "d7d5"],
        description: "Extrem solide Bauernstruktur und gute Entwicklungschancen für Schwarz."
    },
    {
        name: "Königsindische Verteidigung (King's Indian Defense)",
        eco: "E60",
        moves: ["d2d4", "g8f6", "c2c4", "g7g6", "b1c3", "f8g7"],
        description: "Hypermoderne Verteidigung mit Fokus auf einen starken Königsangriff."
    },
    {
        name: "Skandinavische Verteidigung (Scandinavian Defense)",
        eco: "B01",
        moves: ["e2e4", "d7d5"],
        description: "Direkter Angriff auf den e4-Bauern in Zug 1."
    }
];

/**
 * Konvertiert Move-Objekte (fr,fc,tr,tc) in UCI-Notation (z.B. "e2e4")
 */
function moveToString(m) {
    if (!m) return "";
    if (typeof m === 'string') return m;
    const cols = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const fromSquare = cols[m.fc] + (8 - m.fr);
    const toSquare = cols[m.tc] + (8 - m.tr);
    return fromSquare + toSquare;
}

/**
 * Identifiziert die aktuelle Eröffnung anhand der bisherigen Zugliste
 * @param {Array} historyMoves - Array von Zügen (Objekte oder UCI Strings)
 */
function identifyOpening(historyMoves = []) {
    if (!historyMoves || historyMoves.length === 0) return null;

    const uciHistory = historyMoves.map(m => moveToString(m));

    let bestMatch = null;
    let maxMatchLen = 0;

    for (const opening of OPENINGS_DATABASE) {
        let isMatch = true;
        for (let i = 0; i < opening.moves.length; i++) {
            if (i >= uciHistory.length || uciHistory[i] !== opening.moves[i]) {
                isMatch = false;
                break;
            }
        }
        if (isMatch && opening.moves.length > maxMatchLen) {
            bestMatch = opening;
            maxMatchLen = opening.moves.length;
        }
    }

    return bestMatch;
}

/**
 * Liefert einen Buchzug für die Bots (Blitz-Eröffnungszüge)
 */
function getBookMove(historyMoves = []) {
    const uciHistory = historyMoves.map(m => moveToString(m));
    const currentLen = uciHistory.length;

    const matchingOpenings = OPENINGS_DATABASE.filter(opening => {
        if (opening.moves.length <= currentLen) return false;
        for (let i = 0; i < currentLen; i++) {
            if (opening.moves[i] !== uciHistory[i]) return false;
        }
        return true;
    });

    if (matchingOpenings.length === 0) return null;

    // Zufälliger Buchzug aus allen passenden Eröffnungen
    const chosenOpening = matchingOpenings[Math.floor(Math.random() * matchingOpenings.length)];
    return chosenOpening.moves[currentLen];
}

module.exports = {
    OPENINGS_DATABASE,
    identifyOpening,
    getBookMove,
    moveToString
};
