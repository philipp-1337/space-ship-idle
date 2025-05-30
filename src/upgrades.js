// upgrades.js
// Verwaltung von Upgrades, Magnet, Plasma, Tech-Tree
import { MAGNET } from './constants.js';
import { updatePlasmaUI, showTechTreeButton, showTechTreeModal } from './ui.js';

export let upgrades = {
    magnet: 0,
    laser: 0,
    speed: 0,
    plasmaCount: 0 // plasmaCount als Eigenschaft von upgrades hinzufügen
};
export let magnetRadius = 0;
export let magnetStrength = 0;

export let techUpgrades = {
    autoShoot: false,
    autoAim: false,
    eliteHint: false // Konsistenz mit ui.js Modal
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
