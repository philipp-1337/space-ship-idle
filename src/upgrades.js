// upgrades.js
// Verwaltung von Upgrades, Magnet, Plasma, Tech-Tree
import { MAGNET } from './constants.js';
import { updatePlasmaUI, showTechTreeButton, hideTechTreeButton, showTechTreeModal } from './ui.js';

export let upgrades = {
    magnet: 0,
    laser: 0,
    speed: 0
};
export let magnetRadius = 0;
export let magnetStrength = 0;

export let plasmaCount = 0;
export let techUpgrades = {
    autoShoot: false,
    autoAim: false
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
    }
}

export function loadTechUpgrades() {
    const val = localStorage.getItem('techUpgrades');
    techUpgrades = val ? JSON.parse(val) : { autoShoot: false, autoAim: false };
}
export function saveTechUpgrades() {
    localStorage.setItem('techUpgrades', JSON.stringify(techUpgrades));
}

export function loadPlasmaCount() {
    const val = localStorage.getItem('plasmaCount');
    plasmaCount = val ? parseInt(val, 10) : 0;
}
export function savePlasmaCount() {
    localStorage.setItem('plasmaCount', plasmaCount);
}

export function handleTechUpgrade(key, cost) {
    if (plasmaCount >= cost && !techUpgrades[key]) {
        plasmaCount -= cost;
        techUpgrades[key] = true;
        savePlasmaCount();
        saveTechUpgrades();
        updatePlasmaUI(plasmaCount);
        // Modal neu anzeigen, um Status zu aktualisieren
        const modal = document.getElementById('tech-tree-modal');
        if (modal) modal.remove();
        showTechTreeModal(techUpgrades, handleTechUpgrade);
    }
}

export function setupPlasmaUI() {
    window.updatePlasmaUI = function (count) {
        updatePlasmaUI(count);
        if (count > 0) {
            showTechTreeButton(() => {
                showTechTreeModal(techUpgrades, handleTechUpgrade);
            });
        } else {
            hideTechTreeButton();
        }
    };
}
