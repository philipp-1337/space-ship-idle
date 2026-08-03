// Zentraler Audio-Service (Singleton). Keine andere Datei importiert Howler
// direkt — alles läuft über AudioManager.play(). Siehe docs/AUDIO_IMPLEMENTATION.md.
import { Howl } from 'howler';
import { SOUNDS } from './audioConfig.js';

const STORAGE_KEY = 'spaceShipIdle_sfxEnabled';
// Throttling pro Sound-Key: verhindert, dass z.B. SHIP_LASER im Lategame bei
// hoher Feuerrate dutzende Male pro Sekunde neu getriggert wird (Clipping/Lärm).
const THROTTLE_MS = 50;

class AudioService {
    constructor() {
        this.sounds = {};
        this.sfxEnabled = true;
        this.lastPlayed = {};
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        this.initialized = true;

        for (const [key, path] of Object.entries(SOUNDS)) {
            this.sounds[key] = new Howl({ src: [path], volume: 0.5 });
        }

        const saved = localStorage.getItem(STORAGE_KEY);
        this.sfxEnabled = saved === null ? true : saved === 'true';
    }

    play(soundKey) {
        const sound = this.sounds[soundKey];
        if (!this.sfxEnabled || !sound) return;

        const now = performance.now();
        if (this.lastPlayed[soundKey] && now - this.lastPlayed[soundKey] < THROTTLE_MS) return;
        this.lastPlayed[soundKey] = now;
        sound.play();
    }

    setSfxEnabled(enabled) {
        this.sfxEnabled = !!enabled;
        localStorage.setItem(STORAGE_KEY, String(this.sfxEnabled));
    }

    isSfxEnabled() {
        return this.sfxEnabled;
    }
}

export const AudioManager = new AudioService();
