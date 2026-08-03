// runState.js
// Persistiert den laufenden Flug (Level, XP, Kills, Ship-Upgrades, Hülle) über
// Browser-Reloads hinweg, damit ein (versehentlicher) Reload nicht den Fortschritt
// kostet. Der Tod löscht diesen Spielstand explizit wieder — nur Plasma und
// Tech-Tree-Upgrades überleben den Tod (siehe upgrades.js, komplett separat
// persistiert und nie von hier aus angefasst).
const RUN_STATE_KEY = 'spaceShipIdleRun';
const RUN_STATE_VERSION = 1;

export function saveRunState(state) {
    try {
        localStorage.setItem(RUN_STATE_KEY, JSON.stringify({ version: RUN_STATE_VERSION, ...state }));
    } catch (e) {
        console.error('Konnte Spielstand nicht speichern.', e);
    }
}

export function loadRunState() {
    try {
        const raw = localStorage.getItem(RUN_STATE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (parsed.version !== RUN_STATE_VERSION) return null;
        return parsed;
    } catch (e) {
        console.error('Konnte Spielstand nicht laden.', e);
        return null;
    }
}

export function clearRunState() {
    localStorage.removeItem(RUN_STATE_KEY);
}

// Ein absichtlicher Restart ruft clearRunState() unmittelbar vor einem
// document.location.reload() auf — dessen beforeunload-Event löst aber genau
// den Autosave aus, der den gerade gelöschten Stand sofort wieder zurückschreiben
// würde. Diese Sperre unterdrückt saveRunState()-Aufrufe für den Rest des
// aktuellen Seitenlebens, sobald ein Restart eingeleitet wurde.
let autosaveSuppressed = false;

export function suppressAutosave() {
    autosaveSuppressed = true;
}

export function isAutosaveSuppressed() {
    return autosaveSuppressed;
}
