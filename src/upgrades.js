// upgrades.js
// Verwaltung von Upgrades, Magnet, Plasma, Tech-Tree
import { MAGNET, ARMOR, OVERDRIVE } from './constants.js';
import { updatePlasmaUI, showTechTreeButton, showTechTreeModal } from './ui.js';

export let upgrades = {
    magnet: 0,
    laser: 0,
    speed: 0,
    armor: 0,
    plasmaCount: 0 // plasmaCount als Eigenschaft von upgrades hinzufügen
};
export let magnetRadius = 0;
export let magnetStrength = 0;

export let techUpgrades = {
    autoShoot: false,
    eliteHint: false,
    homingMissile: false, // Lenkraketen-Upgrade
    piercing: false // Laser durchdringen Gegner
};

// Manche Tech-Upgrades setzen ein anderes voraus (Baum-Struktur im Tech-Tree-UI)
export const TECH_PREREQUISITES = {
    homingMissile: 'autoShoot'
};

export function applyUpgrade(key, ship, PHYSICS) {
    if (key === 'magnet') {
        upgrades.magnet++;
        magnetRadius = MAGNET.BASE_RADIUS + upgrades.magnet * MAGNET.RADIUS_INCREASE;
        magnetStrength = MAGNET.BASE_STRENGTH + upgrades.magnet * MAGNET.STRENGTH_INCREASE;
    }
    if (key === 'laser') {
        upgrades.laser++;
    }
    if (key === 'speed') {
        upgrades.speed++;
        ship.maxSpeed += PHYSICS.SPEED_UPGRADE_INCREASE;
        ship.acceleration += PHYSICS.ACCELERATION_UPGRADE_INCREASE; // Erhöhe auch die Beschleunigung
    }
    if (key === 'armor') {
        upgrades.armor++;
        ship.maxHp += ARMOR.HP_PER_UPGRADE;
        ship.hp = ship.maxHp; // Upgrade repariert den Rumpf vollständig
    }
}

// --- Overdrive: temporärer Kampf-Buff, ausgelöst durch Level-Aufstieg (XP) ---
export let overdriveUntil = 0;

export function activateOverdrive() {
    overdriveUntil = performance.now() + OVERDRIVE.DURATION_MS;
}

export function isOverdriveActive() {
    return performance.now() < overdriveUntil;
}

export function getFireRateMultiplier() {
    return isOverdriveActive() ? OVERDRIVE.FIRE_RATE_MULT : 1;
}

export function getDamageMultiplier() {
    return isOverdriveActive() ? OVERDRIVE.DAMAGE_MULT : 1;
}

export function loadTechUpgrades() {
    const storedUpgradesString = localStorage.getItem('techUpgrades');
    if (storedUpgradesString) {
        try {
            const loadedFromStorage = JSON.parse(storedUpgradesString);
            // Mutiere die Eigenschaften des bestehenden techUpgrades-Objekts,
            // anstatt die Variable neu zuzuweisen.
            Object.assign(techUpgrades, loadedFromStorage);
        } catch (e) {
            console.error("Fehler beim Parsen der techUpgrades aus localStorage. Es werden die initialen Standardwerte verwendet.", e);
            // techUpgrades behält seine initial definierten Standardwerte, falls das Parsen fehlschlägt.
        }
    }
    // Wenn storedUpgradesString null ist, hat techUpgrades bereits seine initialen Standardwerte aus der Deklaration.
}
export function saveTechUpgrades() {
    localStorage.setItem('techUpgrades', JSON.stringify(techUpgrades));
}

export function loadPlasmaCount() {
    const val = localStorage.getItem('plasmaCount');
    // plasmaCount als Eigenschaft von upgrades speichern, damit überall upgrades.plasmaCount funktioniert
    upgrades.plasmaCount = val ? parseInt(val, 10) : 0;
}
export function savePlasmaCount() {
    localStorage.setItem('plasmaCount', upgrades.plasmaCount);
}
export function handleTechUpgrade(key, cost) {
    const prereq = TECH_PREREQUISITES[key];
    if (prereq && !techUpgrades[prereq]) return; // Voraussetzung im Tech-Baum nicht erfüllt
    if (upgrades.plasmaCount >= cost && !techUpgrades[key]) {
        upgrades.plasmaCount -= cost;
        techUpgrades[key] = true;
        savePlasmaCount();
        saveTechUpgrades();
        updatePlasmaUI(upgrades.plasmaCount);
        // Modal neu anzeigen, um Status zu aktualisieren
        const modal = document.getElementById('tech-tree-modal');
        if (modal) modal.remove();
        showTechTreeModal(techUpgrades, handleTechUpgrade);
        // --- NEU: Callback für TechTree-Änderungen ---
        if (typeof window !== 'undefined' && typeof window.onTechTreeChanged === 'function') {
            window.onTechTreeChanged();
        }
    }
}

export function setupPlasmaUI() {
    window.updatePlasmaUI = function (count) {
        updatePlasmaUI(count);
        // Tech-Tree-Button immer anzeigen
        showTechTreeButton(() => {
            showTechTreeModal(techUpgrades, handleTechUpgrade);
        });
    };
}
