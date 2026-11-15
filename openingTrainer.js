// openingTrainer.js - INTERACTIVE OPENING REPERTOIRE TRAINER & THEORY ENGINE

(function() {
    const OPENING_REPERTOIRES = {
        "sicilian_main": {
            id: "sicilian_main",
            name: "Sizilianische Verteidigung: Najdorf-Variante",
            side: "black",
            description: "Die schärfste und dynamischste Antwort auf 1. e4.",
            moves: ["e2e4", "c7c5", "g1f3", "d7d6", "d2d4", "c5d4", "f3d4", "g8f6", "b1c3", "a7a6"],
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
        "italian_piano": {
            id: "italian_piano",
            name: "Italienische Partie (Giuoco Piano)",
            side: "white",
            description: "Schnelle Entwicklung gegen f7 und Zentrumskontrolle.",
            moves: ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "f8c5", "c2c3", "g8f6", "d2d3"],
            annotations: {
                0: "Öffnet Wege für Dame und Läufer.",
                2: "Greift sofort e5 an.",
                4: "Der Italienische Läufer zielt auf das schwache Feld f7.",
                6: "Bereitet den zentralen Bauernvorstoß d4 vor.",
                8: "Solides Giuoco Pianissimo für langfristiges Spiel."
            }
        },
        "queens_gambit": {
            id: "queens_gambit",
            name: "Damen-Gambit (Abgelehnt)",
            side: "white",
            description: "Solide Raumkontrolle und langfristiger Positionsvorteil.",
            moves: ["d2d4", "d7d5", "c2c4", "e7e6", "b1c3", "g8f6", "c1g5", "f8e7"],
            annotations: {
                0: "Kontrolliert das Zentrum dauerhaft.",
                2: "Das Bauernopfer zwingt Schwarz zu Zugeständnissen.",
                4: "Erhöht den Druck auf d5.",
                6: "Fesselt den gegnerischen f6-Springer."
            }
        },
        "london_system": {
            id: "london_system",
            name: "Londoner System",
            side: "white",
            description: "Universelles, solides System mit klarem Entwicklungsplan.",
            moves: ["d2d4", "d7d5", "g1f3", "g8f6", "c1f4", "e7e6", "e2e3", "f8d6", "f4g3"],
            annotations: {
                0: "Sichert das Zentrum auf d4.",
                2: "Harmonische Springerentwicklung.",
                4: "Der charakteristische Londoner Läuferzug.",
                6: "Stützt d4 mit der starken Bauernpyramide.",
                8: "Erhält die Kontrolle über die wichtige Diagonale h2-b8."
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
                3: "Fordert das weiße Zentrum heraus.",
                5: "Entwickelt aktiv gegen e4.",
                7: "Löst die unangenehme Fesselung am Königsflügel."
            }
        }
    };

    function getAvailableRepertoires() {
        return Object.values(OPENING_REPERTOIRES);
    }

    function getRepertoire(repertoireId) {
        return OPENING_REPERTOIRES[repertoireId] || null;
    }

    function formatUciMove(uci) {
        if (!uci || uci.length < 4) return uci || '';
        return `${uci.slice(0, 2)} → ${uci.slice(2, 4)}`;
    }

    function validateTrainerMove(repertoireId, moveIndex, userMoveUCI) {
        const rep = OPENING_REPERTOIRES[repertoireId];
        if (!rep) return { valid: false, message: "Eröffnungsschema nicht gefunden!" };

        if (moveIndex >= rep.moves.length) {
            return { valid: true, isCompleted: true, message: "🎓 Repertoire-Linie erfolgreich absolviert!" };
        }

        const expectedMove = rep.moves[moveIndex];
        const normalizedUser = String(userMoveUCI || '').slice(0, 4).toLowerCase();
        if (normalizedUser === expectedMove) {
            const isLast = moveIndex === rep.moves.length - 1;
            const annotation = rep.annotations[moveIndex] || "Guter Hauptzug!";
            return {
                valid: true,
                isCompleted: isLast,
                message: isLast ? "🎉 Linie perfekt abgeschlossen!" : `✅ Korrekt! ${annotation}`,
                nextTheoreticalMove: isLast ? null : rep.moves[moveIndex + 1]
            };
        }

        return {
            valid: false,
            isCompleted: false,
            expectedMove,
            message: `⚠️ Abweichung von der Theorie! Empfohlen: ${formatUciMove(expectedMove)}`
        };
    }

    const api = {
        OPENING_REPERTOIRES,
        getAvailableRepertoires,
        getRepertoire,
        formatUciMove,
        validateTrainerMove
    };

    if (typeof window !== 'undefined') {
        window.OpeningTrainer = api;
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
})();
