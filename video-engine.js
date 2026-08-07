// video-engine.js - AUTOMATED CHESS REPLAY VIDEO GENERATOR
const fs = require('fs');
const path = require('path');

let ffmpeg = null;
let canvasLib = null;

try { ffmpeg = require('fluent-ffmpeg'); } catch (e) { console.warn("ffmpeg optional package not loaded:", e.message); }
try { canvasLib = require('canvas'); } catch (e) { console.warn("canvas optional package not loaded:", e.message); }

/**
 * Erstellt ein Video/Replay aus einer Schachpartie mit ffmpeg
 * @param {Array<string>} moveImages - Pfade zu den Bildern der Züge oder FEN-Strings
 * @param {string} outputName - Name der MP4-Datei
 * @param {Object} options - Titel, Spieler, Musik
 */
async function createChessVideo(moveImages = [], outputName = "chess_match", options = {}) {
    return new Promise((resolve, reject) => {
        if (!moveImages || moveImages.length === 0) {
            console.log("ℹ️ Keine Zug-Bilder für Video-Erstellung vorhanden.");
            return resolve(null);
        }

        const videosDir = path.join(__dirname, 'videos');
        if (!fs.existsSync(videosDir)) {
            fs.mkdirSync(videosDir, { recursive: true });
        }

        const videoPath = path.join(videosDir, `${outputName}.mp4`);
        const audioPath = path.join(__dirname, 'assets', 'chess_music.mp3');

        // Prüfen, ob ffmpeg verfügbar ist
        if (!ffmpeg) {
            console.warn("⚠️ fluent-ffmpeg nicht verfügbar. Video kann nicht gerendert werden.");
            return resolve(null);
        }

        // Gültige Bildpfade filtern
        const validImages = moveImages.filter(img => typeof img === 'string' && fs.existsSync(img));
        if (validImages.length === 0) {
            console.warn("⚠️ Keine existierenden Bilddateien im Array gefunden.");
            return resolve(null);
        }

        try {
            const command = ffmpeg();

            validImages.forEach((img) => {
                command.input(img).loop(1);
            });

            const hasAudio = fs.existsSync(audioPath);
            if (hasAudio) {
                command.addInput(audioPath).audioCodec('aac');
            }

            command
                .fps(2)
                .videoCodec('libx264')
                .format('mp4')
                .outputOptions([
                    '-pix_fmt yuv420p',
                    '-shortest'
                ])
                .on('start', (cmd) => {
                    console.log(`🎬 Video-Rendering gestartet [${outputName}.mp4]`);
                })
                .on('error', (err) => {
                    console.error('❌ Fehler beim Video-Schnitt:', err.message);
                    resolve(null);
                })
                .on('end', () => {
                    console.log(`✅ Video erfolgreich gerendert: ${videoPath}`);
                    resolve(videoPath);
                })
                .save(videoPath);

        } catch (err) {
            console.error("❌ Schwerwiegender Fehler bei Video-Rendering:", err.message);
            resolve(null);
        }
    });
}

/**
 * Erstellt ein Vorschaubild/Banner für die Partie
 */
async function generateMatchThumbnail(whitePlayer, blackPlayer, resultText, outputPath) {
    if (!canvasLib) return null;
    try {
        const { createCanvas } = canvasLib;
        const width = 800;
        const height = 450;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // Hintergründe mit Farbverlauf
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, '#1e293b');
        gradient.addColorStop(1, '#0f172a');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // Titel & Spieler
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SchachLive Replay', width / 2, 80);

        ctx.font = '28px sans-serif';
        ctx.fillStyle = '#38bdf8';
        ctx.fillText(`⚔️ ${whitePlayer || 'Weiß'} vs ${blackPlayer || 'Schwarz'}`, width / 2, 180);

        ctx.font = '22px sans-serif';
        ctx.fillStyle = '#f59e0b';
        ctx.fillText(`Ergebnis: ${resultText || 'Partie beendet'}`, width / 2, 260);

        // Speicher-Buffer
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(outputPath, buffer);
        return outputPath;
    } catch (e) {
        console.warn("Thumbnail Erstellung fehlgeschlagen:", e.message);
        return null;
    }
}

module.exports = { createChessVideo, generateMatchThumbnail };
