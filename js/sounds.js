// --- ELKENSTEIN V2 - LAYERED AUDIO SYSTEM ---
// Web Audio API synthesis - no external files needed

let audioCtx = null;

function ensureAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
}

function createNoiseBuffer(duration = 0.1) {
    const ctx = ensureAudio();
    const len = ctx.sampleRate * duration;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
}

function playNoise(volume = 0.3, duration = 0.05, filterFreq = 3000, filterQ = 1, delay = 0) {
    const ctx = ensureAudio();
    const src = ctx.createBufferSource();
    src.buffer = createNoiseBuffer(duration + 0.05);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass'; filter.frequency.value = filterFreq; filter.Q.value = filterQ;
    const gain = ctx.createGain();
    const t = ctx.currentTime + delay;
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    src.start(t); src.stop(t + duration + 0.05);
}

function playOsc(type, freq, freqEnd, volume, duration, delay = 0) {
    const ctx = ensureAudio();
    const osc = ctx.createOscillator();
    osc.type = type;
    const t = ctx.currentTime + delay;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), t + duration);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(t); osc.stop(t + duration + 0.01);
}

// --- REVERB SYSTEM ---
let reverbNode = null;
let reverbLevel = 0.3;

function createReverbBuffer(duration) {
    const ctx = ensureAudio();
    const len = ctx.sampleRate * duration;
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
        const data = buf.getChannelData(ch);
        for (let i = 0; i < len; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.3));
        }
    }
    return buf;
}

export function setReverb(roomSize) {
    // roomSize: 'small' (0.3s), 'medium' (0.8s), 'large' (1.5s)
    const ctx = ensureAudio();
    const durations = { small: 0.3, medium: 0.8, large: 1.5 };
    const dur = durations[roomSize] || 0.8;
    if (reverbNode) { try { reverbNode.disconnect(); } catch(e) {} }
    reverbNode = ctx.createConvolver();
    reverbNode.buffer = createReverbBuffer(dur);
    const wet = ctx.createGain();
    wet.gain.value = reverbLevel;
    reverbNode.connect(wet);
    wet.connect(ctx.destination);
}

// --- POSITIONAL AUDIO ---
export function playPositionalSound(name, listenerPos, listenerDir, sourcePos) {
    try { ensureAudio(); } catch(e) { return; }
    const ctx = ensureAudio();
    const dx = sourcePos.x - listenerPos.x;
    const dz = sourcePos.z - listenerPos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist > 20) return; // Too far
    const volume = Math.max(0.02, 1 - dist / 20);
    // Calculate stereo pan
    const angle = Math.atan2(dx, dz);
    const fwdAngle = Math.atan2(listenerDir.x, listenerDir.z);
    const relAngle = angle - fwdAngle;
    const pan = Math.sin(relAngle);

    const panner = ctx.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, pan));
    const gain = ctx.createGain();
    gain.gain.value = volume * 0.5;

    // Create a simple sound based on name
    if (name === 'enemyFootstep') {
        const src = ctx.createBufferSource();
        src.buffer = createNoiseBuffer(0.06);
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass'; filter.frequency.value = 400; filter.Q.value = 2;
        src.connect(filter); filter.connect(gain); gain.connect(panner); panner.connect(ctx.destination);
        src.start(); src.stop(ctx.currentTime + 0.08);
    }
}

export function playSound(name) {
    try { ensureAudio(); } catch(e) { return; }

    switch(name) {
        // --- WEAPONS ---
        case 'shoot':
            playNoise(0.4, 0.06, 3000, 2);
            playOsc('sawtooth', 180, 40, 0.3, 0.12);
            playOsc('sine', 60, 30, 0.15, 0.2, 0.02);
            break;

        case 'machinegun':
            playNoise(0.5, 0.04, 4000, 3);
            playOsc('square', 220, 60, 0.25, 0.08);
            playOsc('sawtooth', 120, 40, 0.2, 0.1, 0.01);
            break;

        case 'shotgun':
            playNoise(0.7, 0.12, 2000, 1);
            playOsc('sawtooth', 100, 20, 0.4, 0.2);
            playOsc('square', 60, 15, 0.3, 0.25, 0.02);
            playNoise(0.3, 0.08, 800, 0.5, 0.05);
            break;

        // --- ENEMY ---
        case 'enemyAlert':
            playOsc('square', 300, 600, 0.15, 0.15);
            playOsc('sawtooth', 200, 400, 0.1, 0.2, 0.05);
            break;

        case 'enemyFootstep':
            playNoise(0.08, 0.06, 400, 2);
            playOsc('sine', 80, 40, 0.05, 0.08);
            break;

        case 'enemyHurt':
            playOsc('sawtooth', 400, 100, 0.2, 0.15);
            playNoise(0.15, 0.08, 2000, 3);
            break;

        case 'enemyDie':
            playOsc('sawtooth', 500, 50, 0.3, 0.4);
            playOsc('square', 300, 30, 0.2, 0.5, 0.1);
            playNoise(0.2, 0.15, 1500, 2, 0.05);
            break;

        // --- PLAYER ---
        case 'playerFootstep':
            playNoise(0.06, 0.05, 600, 3);
            playOsc('sine', 100, 60, 0.04, 0.06);
            break;

        case 'footstepMetal':
            playNoise(0.08, 0.03, 3000, 5);
            playOsc('sine', 400, 200, 0.04, 0.04);
            break;

        case 'footstepStone':
            playNoise(0.07, 0.06, 800, 2);
            playOsc('sine', 60, 40, 0.05, 0.08);
            break;

        case 'playerHurt':
            playOsc('sine', 300, 100, 0.25, 0.2);
            playOsc('sawtooth', 200, 80, 0.15, 0.25, 0.05);
            playNoise(0.1, 0.1, 1000, 2, 0.02);
            break;

        // --- ENVIRONMENT ---
        case 'door':
            playOsc('sine', 120, 80, 0.15, 0.3);
            playNoise(0.08, 0.2, 300, 1, 0.05);
            break;

        case 'pickup':
            playOsc('sine', 600, 1200, 0.2, 0.12);
            playOsc('sine', 800, 1600, 0.15, 0.1, 0.08);
            break;

        case 'weaponPickup':
            playOsc('sine', 400, 800, 0.2, 0.1);
            playOsc('sine', 600, 1200, 0.18, 0.1, 0.1);
            playOsc('sine', 800, 1600, 0.15, 0.1, 0.2);
            break;

        case 'levelComplete':
            playOsc('sine', 523, 523, 0.2, 0.2);
            playOsc('sine', 659, 659, 0.2, 0.2, 0.2);
            playOsc('sine', 784, 784, 0.2, 0.2, 0.4);
            playOsc('sine', 1047, 1047, 0.25, 0.4, 0.6);
            break;

        case 'gameOver':
            playOsc('sawtooth', 400, 100, 0.25, 0.5);
            playOsc('square', 300, 50, 0.2, 0.6, 0.2);
            playOsc('sine', 200, 30, 0.3, 0.8, 0.4);
            break;

        case 'victory':
            var vVar = Math.random();
            var pitchMod = 1 + (Math.random() - 0.5) * 0.1;
            if (vVar < 0.33) {
                // Triumphant major fanfare
                playOsc('sine', 523*pitchMod, 523*pitchMod, 0.2, 0.15);
                playOsc('sine', 659*pitchMod, 659*pitchMod, 0.2, 0.15, 0.15);
                playOsc('sine', 784*pitchMod, 784*pitchMod, 0.2, 0.15, 0.3);
                playOsc('sine', 1047*pitchMod, 1047*pitchMod, 0.25, 0.4, 0.45);
                playOsc('sine', 1568*pitchMod, 1568*pitchMod, 0.3, 0.5, 0.7);
            } else if (vVar < 0.66) {
                // Quick brass fanfare
                playOsc('sawtooth', 440*pitchMod, 440*pitchMod, 0.15, 0.1);
                playOsc('sawtooth', 554*pitchMod, 554*pitchMod, 0.15, 0.1, 0.1);
                playOsc('sawtooth', 659*pitchMod, 659*pitchMod, 0.15, 0.1, 0.2);
                playOsc('sawtooth', 880*pitchMod, 880*pitchMod, 0.2, 0.3, 0.3);
                playOsc('sine', 1760*pitchMod, 1760*pitchMod, 0.15, 0.4, 0.5);
            } else {
                // Grand orchestral
                playOsc('sine', 392*pitchMod, 392*pitchMod, 0.2, 0.2);
                playOsc('sine', 494*pitchMod, 494*pitchMod, 0.2, 0.2, 0.2);
                playOsc('sine', 587*pitchMod, 587*pitchMod, 0.2, 0.2, 0.4);
                playOsc('sine', 784*pitchMod, 784*pitchMod, 0.25, 0.3, 0.6);
                playOsc('sawtooth', 392*pitchMod, 392*pitchMod, 0.1, 0.8, 0.1);
                playOsc('sine', 1568*pitchMod, 1568*pitchMod, 0.3, 0.5, 0.8);
            }
            break;

        case 'debateStun':
            playOsc('square', 200, 100, 0.1, 0.3);
            playOsc('sine', 150, 80, 0.08, 0.4, 0.1);
            playNoise(0.05, 0.2, 500, 1, 0.15);
            break;

        // --- HIT MARKER ---
        case 'hitMarker':
            playOsc('sine', 1200, 800, 0.12, 0.05);
            playOsc('sine', 1600, 1000, 0.08, 0.04, 0.02);
            break;

        // --- HEARTBEAT (low health) ---
        case 'heartbeat':
            playOsc('sine', 40, 35, 0.2, 0.12);
            playOsc('sine', 42, 36, 0.15, 0.1, 0.15);
            break;

        // --- RELOAD / EMPTY CLICK ---
        case 'reload':
            playNoise(0.15, 0.03, 5000, 5);
            playOsc('square', 800, 200, 0.08, 0.08, 0.05);
            playNoise(0.1, 0.04, 3000, 3, 0.12);
            break;

        case 'emptyClick':
            playNoise(0.2, 0.02, 6000, 8);
            playOsc('square', 1000, 500, 0.06, 0.03);
            break;

        // --- DAMAGE DIRECTION (subtle whoosh from a direction) ---
        case 'damageHit':
            playOsc('sawtooth', 200, 50, 0.15, 0.1);
            playNoise(0.12, 0.08, 800, 2, 0.02);
            break;

        // --- SHELL CASING ---
        case 'shellCasing':
            playNoise(0.06, 0.015, 8000, 6, 0.1 + Math.random() * 0.1);
            playOsc('sine', 3000 + Math.random() * 2000, 1000, 0.03, 0.02, 0.12 + Math.random() * 0.05);
            break;

        // --- SATIRICAL ENEMY GRUNT ---
        case 'enemyGrunt':
            var pitch = 200 + Math.random() * 200;
            playOsc('sawtooth', pitch, pitch * 0.4, 0.15, 0.2);
            playOsc('square', pitch * 0.7, pitch * 0.3, 0.08, 0.15, 0.05);
            break;

        // --- MELEE HIT ---
        case 'meleeHit':
            playNoise(0.3, 0.06, 1500, 2);
            playOsc('sawtooth', 150, 50, 0.2, 0.1);
            playOsc('sine', 80, 30, 0.1, 0.15, 0.03);
            break;

        // --- EXPLOSION ---
        case 'explosion':
            playNoise(0.6, 0.2, 800, 1);
            playOsc('sawtooth', 80, 15, 0.4, 0.4);
            playOsc('sine', 40, 10, 0.3, 0.5, 0.05);
            playNoise(0.3, 0.15, 400, 0.5, 0.1);
            break;

        case 'binClatter':
            playNoise(0.15, 0.2, 1000, 2);
            playOsc('square', 100, 50, 0.1, 0.15);
            playOsc('sawtooth', 150, 80, 0.05, 0.1);
            break;

        case 'alarm':
            playOsc('square', 800, 400, 0.2, 0.15);
            playOsc('square', 400, 800, 0.2, 0.15, 0.15);
            playOsc('square', 800, 400, 0.15, 0.15, 0.3);
            playNoise(0.1, 0.1, 2000, 3, 0.05);
            break;

        case 'damage':
            playOsc('sawtooth', 250, 80, 0.2, 0.15);
            playNoise(0.15, 0.1, 1200, 2, 0.02);
            playOsc('sine', 100, 40, 0.12, 0.2, 0.05);
            break;
    }
}

// --- AMBIENT MUSIC (layered system) ---
let musicOscillators = [];
let musicGain = null;
let musicPlaying = false;
let musicIntervals = [];

function playMusicNote(freq, type, vol, dur, delay = 0) {
    const ctx = ensureAudio();
    const osc = ctx.createOscillator();
    osc.type = type;
    const t = ctx.currentTime + delay;
    osc.frequency.setValueAtTime(freq, t);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.05);
    g.gain.setValueAtTime(vol, t + dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g); g.connect(musicGain);
    osc.start(t); osc.stop(t + dur + 0.01);
    musicOscillators.push(osc);
}

export function startMusic(mode = 'exploration') {
    if (musicPlaying) stopMusic();
    const ctx = ensureAudio();
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.07;
    musicGain.connect(ctx.destination);
    musicPlaying = true;

    // Chord progressions (root frequencies)
    const progressions = {
        exploration: [
            [65.41, 82.41, 98.00],  // Cm (C E G)
            [73.42, 87.31, 110.0],  // Dm (D F A)
            [55.00, 65.41, 82.41],  // Am (A C E)
            [61.74, 73.42, 92.50]   // Bb (Bb D F)
        ],
        combat: [
            [55.00, 65.41, 82.41],  // Am
            [49.00, 61.74, 73.42],  // G
            [58.27, 73.42, 87.31],  // Bbm
            [55.00, 69.30, 82.41]   // A (major for tension)
        ],
        boss: [
            [49.00, 58.27, 73.42],  // Gm
            [46.25, 55.00, 65.41],  // F#dim
            [55.00, 65.41, 82.41],  // Am
            [51.91, 61.74, 77.78]   // Ab
        ]
    };

    const chords = progressions[mode] || progressions.exploration;
    let chordIdx = 0;
    let beatInChord = 0;
    const beatsPerChord = mode === 'combat' ? 4 : mode === 'boss' ? 6 : 8;
    const bpm = mode === 'combat' ? 140 : mode === 'boss' ? 100 : 80;
    const beatMs = 60000 / bpm;

    function playBeat() {
        if (!musicPlaying) return;
        const chord = chords[chordIdx % chords.length];
        const root = chord[0];

        // Bass: play root on beat 0, octave up on beat 2
        if (beatInChord === 0) {
            playMusicNote(root, 'sine', 0.06, beatMs * 2 / 1000);
            playMusicNote(root, 'triangle', 0.03, beatMs * 2 / 1000);
        } else if (beatInChord === 2 && mode !== 'exploration') {
            playMusicNote(root * 2, 'sine', 0.04, beatMs / 1000);
        }

        // Pad: soft chord tones on every other beat
        if (beatInChord % 2 === 0) {
            chord.forEach((f, i) => {
                playMusicNote(f * 2, 'sine', 0.015, beatMs * 2 / 1000, i * 0.02);
            });
        }

        // Melody: sparse, moody single notes
        if (mode === 'combat') {
            // Aggressive eighth-note pulse
            if (beatInChord % 1 === 0) {
                var mFreq = chord[beatInChord % chord.length] * 4;
                if (Math.random() > 0.4) playMusicNote(mFreq, 'sawtooth', 0.02, beatMs * 0.8 / 1000);
            }
        } else if (mode === 'boss') {
            // Ominous descending pattern
            if (beatInChord < 3) {
                var bFreq = root * (4 - beatInChord * 0.5);
                playMusicNote(bFreq, 'square', 0.015, beatMs * 1.5 / 1000, 0.05);
            }
        } else {
            // Exploration: sparse melodic hits
            if (beatInChord === 0 || beatInChord === 3 || beatInChord === 5) {
                var eFreq = chord[Math.floor(Math.random() * chord.length)] * 4;
                playMusicNote(eFreq, 'sine', 0.025, beatMs * 1.5 / 1000);
            }
        }

        // Percussion: noise hits
        if (mode === 'combat') {
            if (beatInChord % 2 === 0) playNoise(0.06, 0.03, 100, 1);
            if (beatInChord % 2 === 1) playNoise(0.03, 0.015, 6000, 8);
        } else if (mode === 'boss') {
            if (beatInChord === 0) playNoise(0.08, 0.05, 80, 1);
            if (beatInChord === 3) playNoise(0.04, 0.02, 4000, 5);
        }

        beatInChord++;
        if (beatInChord >= beatsPerChord) { beatInChord = 0; chordIdx++; }
    }

    playBeat();
    var iv = setInterval(() => {
        if (!musicPlaying) { clearInterval(iv); return; }
        playBeat();
    }, beatMs);
    musicIntervals.push(iv);
}

export function stopMusic() {
    musicPlaying = false;
    musicOscillators.forEach(o => { try { o.stop(); } catch(e) {} });
    musicOscillators = [];
    musicIntervals.forEach(iv => clearInterval(iv));
    musicIntervals = [];
}

// --- AMBIENT SYSTEM ---
let ambientInterval = null;
let ambientPlaying = false;

export function startAmbient() {
    if (ambientPlaying) stopAmbient();
    ambientPlaying = true;

    function playAmbientSound() {
        if (!ambientPlaying) return;
        const ctx = ensureAudio();
        const r = Math.random();
        if (r < 0.3) {
            // Distant radio propaganda: garbled speech-like tones
            const baseFreq = 300 + Math.random() * 200;
            for (let i = 0; i < 5; i++) {
                playOsc('square', baseFreq + Math.random() * 100, baseFreq - 50, 0.015, 0.08 + Math.random() * 0.06, i * 0.1);
            }
            playNoise(0.02, 0.5, 2000, 3);
        } else if (r < 0.6) {
            // Echo of voices in corridors
            playOsc('sine', 180 + Math.random() * 80, 120, 0.02, 0.4);
            playOsc('sine', 200 + Math.random() * 60, 140, 0.015, 0.3, 0.2);
            playNoise(0.01, 0.3, 600, 1, 0.1);
        } else if (r < 0.8) {
            // Distant humming/electrical buzz
            playOsc('sawtooth', 50 + Math.random() * 10, 48, 0.02, 0.6);
            playOsc('sine', 100, 98, 0.01, 0.5, 0.1);
        } else {
            // Distant metallic clang
            playOsc('sine', 800 + Math.random() * 400, 200, 0.02, 0.15);
            playNoise(0.015, 0.04, 4000, 5, 0.02);
        }
    }

    ambientInterval = setInterval(() => {
        if (!ambientPlaying) { clearInterval(ambientInterval); return; }
        if (Math.random() > 0.4) playAmbientSound();
    }, 3000 + Math.random() * 4000);
}

export function stopAmbient() {
    ambientPlaying = false;
    if (ambientInterval) { clearInterval(ambientInterval); ambientInterval = null; }
}

export function initAudio() {
    // Called on first user interaction to unlock audio
    ensureAudio();
}
