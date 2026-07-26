const ffmpeg = require('fluent-ffmpeg');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

/**
 * Erstellt ein Video aus einer Schachpartie
 * @param {Array} moveImages - Pfade zu den Bildern der Züge
 * @param {string} outputName - Name der fertigen MP4-Datei
 */
async function createChessVideo(moveImages, outputName) {
    return new Promise((resolve, reject) => {
        const videoPath = path.join(__dirname, 'videos', `${outputName}.mp4`);
        const audioPath = path.join(__dirname, 'assets', 'chess_music.mp3');

        if (!fs.existsSync(path.join(__dirname, 'videos'))) {
            fs.mkdirSync(path.join(__dirname, 'videos'));
        }

        const command = ffmpeg();

        moveImages.forEach((img) => {
            command.input(img).loop(1);
        });

        command
            .fps(2)
            .addInput(audioPath)
            .audioCodec('aac')
            .videoCodec('libx264')
            .format('mp4')
            .outputOptions([
                '-pix_fmt yuv420p',
                '-shortest'
            ])
            .on('start', (cmd) => {
                console.log('🎬 Video-Rendering gestartet: ' + cmd);
            })
            .on('error', (err) => {
                console.error('❌ Fehler beim Video-Schnitt:', err);
                reject(err);
            })
            .on('end', () => {
                console.log('✅ Video fertig erstellt: ' + videoPath);
                resolve(videoPath);
            })
            .save(videoPath);
    });
}

module.exports = { createChessVideo };
