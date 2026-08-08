// openingTrainer.js - INTERACTIVE OPENING REPERTOIRE TRAINER & THEORY ENGINE

const OPENING_REPERTOIRES = {
    "sicilian_main": {
        id: "sicilian_main",
        name: "Sizilianische Verteidigung: Najdorf-Variante",
        side: "black",
        description: "Die schärfste und dynamischste Antwort auf 1. e4.",
        moves: ["e2e4", "c7c5", "g1f3", "d7d6", "d2d4", "c7c2d4", "f3d4", "g8f6", "b1c3", "a7a6"],
        annotations: {
            1: "Der Markenstein der Sizilianischen Verteidigung.",
            3: "Bereitet das Zentrum vor.",
            5: "Öffnet die d-Linie für aktives Figurenspiel.",
            7: "Greift direkt den e4-Bauern an.",
            9: "Der Najdorf-Zug a6 kontrolliert die Schlüsselfelder b5 und d5."
        }
    },
    "ruy_lopez": {
        id: "ruy_lopez",
        name: "Spanische Partie (Ruy Lopez)",
        side: "white",
        description: "Der zeitlose Klassiker für strategischen Druck im Zentrum.",
        moves: ["e2e4", "e7e5", "g1f3", "b8c6", "f1b5", "a7a6", "b5a4", "g8f6", "e1g1"],
        annotations: {
            0: "Klassische Zentrumsbesetzung.",
            2: "Entwickelt den Springer mit Druck auf e5.",
            4: "Die spanische Fesselung übt Druck auf c6 aus.",
            6: "Die Morphy-Verteidigung befragt den Läufer.",
            8: "Königsrochade bringt den König in Sicherheit."
        }
    },
    "queens_gambit": {
        id: "queens_gambit",
        name: "Damen-Gambit (Abgelehnt)",
        side: "white",
        description: "Solide Raumkontrolle und langfristiger Positionsvorteil.",
        moves: ["d2d4", "d7d5", "c2c4", "e7e6", "b1c3", "g8f6", "c1bg5", "f8e7"],
        annotations: {
            0: "Kontrolliert das Zentrum dauerhaft.",
            2: "Das Bauernopfer zwingt Schwarz zu Zugeständnissen.",
            4: "Erhöht den Druck auf d5.",
            6: "Fesselt den gegnerischen f6-Springer."
        }
    },
    "french_defense": {
        id: "french_defense",
        name: "Französische Verteidigung",
        side: "black",
        description: "Eine geschlossene Festung mit Gegenangriff im Zentrum.",
        moves: ["e2e4", "e7e6", "d2d4", "d7d5", "b1c3", "g8f6", "c1g5", "f8e7"],
        annotations: {
            1: "Bereitet den Vorstoß d5 vor.",
            3: "Fordert das weiße Zentrum heraus."
        }
    }
};

/**
 * Liefert alle verfügbaren Eröffnungstrainings
 */
function getAvailableRepertoires() {
    return Object.values(OPENING_REPERTOIRES);
}

/**
 * Überprüft einen Trainingszug gegen den ausgewählten Theoriepfad
 * @param {string} repertoireId - ID des Eröffnungsschemas
 * @param {number} moveIndex - Index des aktuellen Zugs
 * @param {string} userMoveUCI - Der vom Spieler gewählte Zug (z.B. "c7c5")
 */
function validateTrainerMove(repertoireId, moveIndex, userMoveUCI) {
    const rep = OPENING_REPERTOIRES[repertoireId];
    if (!rep) return { valid: false, message: "Eröffnungsschema nicht gefunden!" };

    if (moveIndex >= rep.moves.length) {
        return { valid: true, isCompleted: true, message: "🎓 Repertoire-Linie erfolgreich absolviert!" };
    }

    const expectedMove = rep.moves[moveIndex];
    if (userMoveUCI === expectedMove) {
        const isLast = moveIndex === rep.moves.length - 1;
        const annotation = rep.annotations[moveIndex] || "Guter Hauptzug!";
        return {
            valid: true,
            isCompleted: isLast,
            message: isLast ? "🎉 Linie perfekt abgeschlossen!" : `✅ Korrekt! ${annotation}`,
            nextTheoreticalMove: isLast ? null : rep.moves[moveIndex + 1]
        };
    } else {
        return {
            valid: false,
            isCompleted: false,
            expectedMove: expectedMove,
            message: `⚠️ Abweichung von der Theorie! Der Hauptzug laut Buch ist: ${expectedMove}`
        };
    }
}

module.exports = {
    OPENING_REPERTOIRES,
    getAvailableRepertoires,
    validateTrainerMove
};
