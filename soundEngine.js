// soundEngine.js - CHESS.COM-CALIBRATED WEB AUDIO SYNTHESIZER
// Generates crisp, zero-latency chess audio without external file failures.

(function(root) {
    let audioCtx = null;
    let soundEnabled = true;
    let masterVolume = 0.75;
    let soundPack = 'classic';

    if (typeof localStorage !== 'undefined') {
        try {
            const savedEnabled = localStorage.getItem('sound_enabled');
            if (savedEnabled !== null) soundEnabled = savedEnabled !== 'false';
            const savedVol = parseFloat(localStorage.getItem('sound_volume'));
            if (!isNaN(savedVol)) masterVolume = Math.max(0, Math.min(1, savedVol));
            const savedPack = localStorage.getItem('sound_pack');
            if (savedPack) soundPack = savedPack;
        } catch (e) {}
    }

    function getAudioContext() {
        if (typeof window === 'undefined') return null;
        if (!audioCtx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) {
                audioCtx = new AudioContextClass();
            }
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume().catch(() => {});
        }
        return audioCtx;
    }

    function isSoundEnabled() {
        return soundEnabled;
    }

    function getSoundPack() {
        return soundPack;
    }

    function getMasterVolume() {
        return masterVolume;
    }

    function setSoundEnabled(enabled, volume = masterVolume) {
        soundEnabled = !!enabled;
        if (volume !== undefined && volume !== null) {
            masterVolume = Math.max(0, Math.min(1, Number(volume)));
        }
        if (typeof localStorage !== 'undefined') {
            try {
                localStorage.setItem('sound_enabled', soundEnabled ? 'true' : 'false');
                localStorage.setItem('sound_volume', String(masterVolume));
            } catch (e) {}
        }
    }

    function setSoundPack(pack) {
        soundPack = pack || 'classic';
        if (typeof localStorage !== 'undefined') {
            try { localStorage.setItem('sound_pack', soundPack); } catch (e) {}
        }
    }

    function playNoiseBurst(ctx, duration, filterFreq, qVal, gainAmount, delay = 0) {
        const sampleRate = ctx.sampleRate;
        const length = Math.max(1, Math.floor(sampleRate * duration));
        const buffer = ctx.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < length; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (length * 0.28));
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(filterFreq, ctx.currentTime + delay);
        filter.Q.setValueAtTime(qVal, ctx.currentTime + delay);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(Math.max(0.001, gainAmount * masterVolume), ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        source.start(ctx.currentTime + delay);
    }

    function playTone(ctx, type, startFreq, endFreq, duration, gainAmount, delay = 0) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const t = ctx.currentTime + delay;

        osc.type = type;
        osc.frequency.setValueAtTime(startFreq, t);
        if (endFreq && endFreq !== startFreq) {
            osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t + duration);
        }

        gain.gain.setValueAtTime(Math.max(0.001, gainAmount * masterVolume), t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + duration + 0.01);
    }

    function playMoveSound() {
        if (!soundEnabled) return;
        const ctx = getAudioContext();
        if (!ctx) return;

        try {
            if (soundPack === 'arcade') {
                playTone(ctx, 'square', 440, 280, 0.055, 0.14);
            } else if (soundPack === 'orchestra') {
                playNoiseBurst(ctx, 0.05, 680, 1.8, 0.36);
                playTone(ctx, 'sine', 293.66, 220, 0.08, 0.22);
            } else {
                playNoiseBurst(ctx, 0.045, 900, 1.5, 0.48);
                playTone(ctx, 'triangle', 240, 115, 0.055, 0.28);
            }
        } catch (e) {}
    }

    function playCaptureSound() {
        if (!soundEnabled) return;
        const ctx = getAudioContext();
        if (!ctx) return;

        try {
            if (soundPack === 'arcade') {
                playTone(ctx, 'sawtooth', 580, 140, 0.10, 0.20);
            } else if (soundPack === 'orchestra') {
                playNoiseBurst(ctx, 0.07, 1100, 1.2, 0.55);
                playTone(ctx, 'triangle', 392, 130, 0.12, 0.35);
            } else {
                playNoiseBurst(ctx, 0.065, 1450, 1.1, 0.65);
                playTone(ctx, 'triangle', 320, 88, 0.09, 0.42);
            }
        } catch (e) {}
    }

    function playCastleSound() {
        if (!soundEnabled) return;
        const ctx = getAudioContext();
        if (!ctx) return;

        try {
            if (soundPack === 'arcade') {
                playTone(ctx, 'square', 330, 440, 0.06, 0.14, 0);
                playTone(ctx, 'square', 440, 587, 0.07, 0.14, 0.07);
            } else if (soundPack === 'orchestra') {
                playTone(ctx, 'triangle', 261.63, 261.63, 0.09, 0.22, 0);
                playTone(ctx, 'triangle', 329.63, 329.63, 0.11, 0.24, 0.08);
            } else {
                playNoiseBurst(ctx, 0.04, 860, 1.6, 0.42, 0);
                playTone(ctx, 'triangle', 220, 110, 0.05, 0.24, 0);
                playNoiseBurst(ctx, 0.045, 960, 1.5, 0.46, 0.085);
                playTone(ctx, 'triangle', 250, 120, 0.055, 0.26, 0.085);
            }
        } catch (e) {}
    }

    function playCheckSound() {
        if (!soundEnabled) return;
        const ctx = getAudioContext();
        if (!ctx) return;

        try {
            if (soundPack === 'arcade') {
                playTone(ctx, 'square', 880, 660, 0.09, 0.18, 0);
                playTone(ctx, 'square', 988, 740, 0.10, 0.18, 0.07);
            } else if (soundPack === 'orchestra') {
                playTone(ctx, 'triangle', 587.33, 440, 0.20, 0.26, 0);
                playTone(ctx, 'sine', 880, 659.25, 0.20, 0.18, 0.02);
            } else {
                playNoiseBurst(ctx, 0.04, 1200, 1.4, 0.3, 0);
                playTone(ctx, 'sine', 620, 440, 0.18, 0.24, 0);
                playTone(ctx, 'triangle', 930, 660, 0.15, 0.16, 0.02);
            }
        } catch (e) {}
    }

    function playPromoteSound() {
        if (!soundEnabled) return;
        const ctx = getAudioContext();
        if (!ctx) return;

        try {
            if (soundPack === 'arcade') {
                playTone(ctx, 'square', 523, 784, 0.07, 0.15, 0);
                playTone(ctx, 'square', 784, 1046, 0.11, 0.16, 0.06);
            } else if (soundPack === 'orchestra') {
                playTone(ctx, 'sine', 440, 659.25, 0.14, 0.22, 0);
                playTone(ctx, 'triangle', 659.25, 880, 0.20, 0.22, 0.07);
            } else {
                playTone(ctx, 'triangle', 440, 587, 0.09, 0.22, 0);
                playTone(ctx, 'triangle', 659, 880, 0.14, 0.22, 0.06);
            }
        } catch (e) {}
    }

    function playMateSound() {
        if (!soundEnabled) return;
        const ctx = getAudioContext();
        if (!ctx) return;

        const notes = [523.25, 659.25, 783.99, 1046.50];
        const oscType = soundPack === 'arcade' ? 'square' : (soundPack === 'orchestra' ? 'sine' : 'triangle');
        const amp = soundPack === 'arcade' ? 0.15 : 0.24;
        notes.forEach((freq, idx) => {
            try {
                playTone(ctx, oscType, freq, freq, 0.28, amp, idx * 0.085);
            } catch (e) {}
        });
    }

    function playDrawSound() {
        if (!soundEnabled) return;
        const ctx = getAudioContext();
        if (!ctx) return;

        const oscType = soundPack === 'arcade' ? 'square' : 'sine';
        const amp = soundPack === 'arcade' ? 0.13 : 0.18;
        try {
            playTone(ctx, oscType, 440, 440, 0.14, amp, 0);
            playTone(ctx, oscType, 440, 392, 0.20, amp, 0.13);
        } catch (e) {}
    }

    function playPremoveSound() {
        if (!soundEnabled) return;
        const ctx = getAudioContext();
        if (!ctx) return;

        const oscType = soundPack === 'arcade' ? 'square' : 'sine';
        try {
            playTone(ctx, oscType, 780, 920, 0.04, 0.10, 0);
        } catch (e) {}
    }

    function playIllegalSound() {
        if (!soundEnabled) return;
        const ctx = getAudioContext();
        if (!ctx) return;

        try {
            playTone(ctx, 'sawtooth', 160, 120, 0.09, 0.12, 0);
        } catch (e) {}
    }

    function playClockTickSound() {
        if (!soundEnabled) return;
        const ctx = getAudioContext();
        if (!ctx) return;

        const oscType = soundPack === 'arcade' ? 'square' : 'sine';
        try {
            playTone(ctx, oscType, 1050, 880, 0.035, 0.10, 0);
        } catch (e) {}
    }

    const api = {
        isSoundEnabled,
        getSoundPack,
        getMasterVolume,
        setSoundEnabled,
        setSoundPack,
        playMoveSound,
        playCaptureSound,
        playCastleSound,
        playCheckSound,
        playPromoteSound,
        playMateSound,
        playDrawSound,
        playPremoveSound,
        playIllegalSound,
        playClockTickSound
    };

    if (typeof window !== 'undefined') {
        window.SoundEngine = api;
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
