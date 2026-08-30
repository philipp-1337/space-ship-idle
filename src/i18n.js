// Lightweight, file-based localization.
//
// `en` is the source of truth and mirrors the copy that used to be hardcoded in
// the UI; `de` is the German translation. Established feature names ("Tech Tree",
// "Flight Protocols", "Overdrive", "Plasma", "Flight Data", "Salvage", enemy and
// tech-node names) are kept as English proper nouns in both dictionaries — only
// the surrounding prose, buttons, labels and status lines are translated.
//
// The active language is persisted inside the existing `spaceShipIdleSettings`
// object under `language`. On first launch (no stored choice) it is guessed from
// the browser via `navigator.language`. Switching languages triggers a reload
// (see showSettingsMenu) because a few HUD elements cache their captions.

import en from './i18n/en.js';
import de from './i18n/de.js';

const DICTIONARIES = { en, de };
export const SUPPORTED_LANGUAGES = ['en', 'de'];
export const DEFAULT_LANGUAGE = 'en';

const SETTINGS_KEY = 'spaceShipIdleSettings';

function readStoredLanguage() {
    try {
        const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
        if (settings && SUPPORTED_LANGUAGES.includes(settings.language)) return settings.language;
    } catch (error) {
        // Corrupt or unavailable storage — fall through to browser detection.
    }
    return null;
}

function detectBrowserLanguage() {
    const candidates = [
        ...(Array.isArray(navigator.languages) ? navigator.languages : []),
        navigator.language
    ];
    for (const tag of candidates) {
        if (typeof tag === 'string' && tag.toLowerCase().startsWith('de')) return 'de';
    }
    return DEFAULT_LANGUAGE;
}

let currentLanguage = readStoredLanguage() || detectBrowserLanguage();

export function getLanguage() {
    return currentLanguage;
}

export function setLanguage(language) {
    if (!SUPPORTED_LANGUAGES.includes(language)) return;
    currentLanguage = language;
    try {
        const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
        settings.language = language;
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
        // Persisting the choice is best-effort; the in-memory value still applies.
    }
}

function resolve(dictionary, key) {
    return key.split('.').reduce((node, part) => (node == null ? undefined : node[part]), dictionary);
}

function interpolate(template, params) {
    if (!params) return template;
    return template.replace(/\{(\w+)\}/g, (match, name) => (
        Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match
    ));
}

// Translate a dotted key path (e.g. `settings.language`,
// `shop.upgrades.laser.desc`). Falls back to English, then to the key itself.
export function t(key, params) {
    let value = resolve(DICTIONARIES[currentLanguage], key);
    if (typeof value !== 'string') value = resolve(DICTIONARIES.en, key);
    if (typeof value !== 'string') {
        if (import.meta.env && import.meta.env.DEV) console.warn(`[i18n] missing key: ${key}`);
        return key;
    }
    return interpolate(value, params);
}
