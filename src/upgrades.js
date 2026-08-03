// upgrades.js
// Verwaltung von Upgrades, Magnet, Plasma, Tech-Tree
import { MAGNET, ARMOR, PHYSICS, OVERDRIVE, OVERDRIVE_CORE, RAPID_FIRE, COLLECTOR_PULSE, REPAIR_MODULE, DEFLECTOR_SHIELD, CHAIN_LIGHTNING, isTouchDevice } from './constants.js';
import { updatePlasmaUI, showTechTreeButton, showTechTreeModal } from './ui.js';

export let upgrades = {
    magnet: 0,
    laser: 0,
    speed: 0,
    armor: 0,
    repairModule: 0, // leveled XP upgrade — see applyUpgrade()
    deflectorShield: 0, // leveled XP upgrade — see applyUpgrade()
    collectorPulse: 0, // leveled XP upgrade — see applyUpgrade()
    chainLightning: 0, // leveled XP upgrade — see applyUpgrade()
    overdriveCore: 0, // leveled XP upgrade — see applyUpgrade()
    plasmaCount: 0 // plasmaCount als Eigenschaft von upgrades hinzufügen
};
export let magnetRadius = 0;
export let magnetStrength = 0;

export let techUpgrades = {
    autoShoot: false,
    drone: false, // Begleit-Drohne, kreist ums Schiff und feuert automatisch
    twinDrones: false, // zweite Begleit-Drohne, gegenüberliegend auf der Umlaufbahn

    homingMissile: false, // Lenkraketen-Upgrade
    piercing: false, // Laser durchdringen Gegner
    explosiveRounds: false, // Laser verursachen Flächenschaden beim Einschlag
    rapidFire: false, // dauerhaft kürzere Feuer-Cooldowns
    salvage: false, // erhöhte Plasma-Drop-Chance
    twinMissiles: false // zwei Lenkraketen pro Salve
};

// Mobile firing is always-on (see input.js: keys.shooting is forced true,
// there's no manual fire button), which makes the Auto-Fire tech redundant
// there. Treat it as already unlocked on touch devices so its prerequisite-
// gated children (Rapid-Fire/Homing/Piercing) don't sit behind paying for
// something mobile players already have — without silently doubling their
// fire rate, since techUpgrades.autoShoot itself stays false/unpurchased and
// autoShootLogic() (the independent auto-fire timer) never activates from this.
export function isAutoShootUnlocked() {
    return techUpgrades.autoShoot || isTouchDevice();
}

// Manche Tech-Upgrades setzen ein anderes voraus (Baum-Struktur im Tech-Tree-UI)
export const TECH_PREREQUISITES = {
    rapidFire: 'autoShoot',
    homingMissile: 'autoShoot',
    piercing: 'autoShoot',
    salvage: 'rapidFire',
    twinMissiles: 'homingMissile',
    explosiveRounds: 'piercing',
    twinDrones: 'drone'
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
    if (key === 'collectorPulse') {
        upgrades.collectorPulse++;
        triggerCollectorPulse();
    }
    if (key === 'repairModule') {
        upgrades.repairModule++;
        ship.repairModule = upgrades.repairModule;
    }
    if (key === 'deflectorShield') {
        upgrades.deflectorShield++;
        ship.shieldLevel = upgrades.deflectorShield;
        ship.shieldCharge = true; // (re)charged immediately on every purchase, like Armor Plating's full repair
    }
    if (key === 'chainLightning') {
        upgrades.chainLightning++;
    }
    if (key === 'overdriveCore') {
        upgrades.overdriveCore++;
    }
}

function repairModuleIntervalFor(level) {
    return Math.max(REPAIR_MODULE.MIN_INTERVAL_MS, REPAIR_MODULE.BASE_INTERVAL_MS - Math.max(0, level - 1) * REPAIR_MODULE.INTERVAL_STEP_MS);
}
function deflectorRechargeFor(level) {
    return Math.max(DEFLECTOR_SHIELD.MIN_RECHARGE_MS, DEFLECTOR_SHIELD.BASE_RECHARGE_MS - Math.max(0, level - 1) * DEFLECTOR_SHIELD.RECHARGE_STEP_MS);
}
function collectorPulseDurationFor(level) {
    return Math.min(COLLECTOR_PULSE.MAX_DURATION_MS, COLLECTOR_PULSE.BASE_DURATION_MS + Math.max(0, level - 1) * COLLECTOR_PULSE.DURATION_STEP_MS);
}
function chainLightningChanceFor(level) {
    return Math.min(CHAIN_LIGHTNING.MAX_CHANCE, level * CHAIN_LIGHTNING.CHANCE_PER_LEVEL);
}
function overdriveDurationFor(level) {
    return OVERDRIVE.DURATION_MS * (1 + OVERDRIVE_CORE.DURATION_MULT_PER_LEVEL * Math.min(level, OVERDRIVE_CORE.MAX_LEVEL));
}

// --- Stat-Vorschau für den Upgrade-Screen: "Label: von -> nach" -------------
// Nutzt exakt dieselben Formeln wie applyUpgrade()/laser.js/ship.js, damit die
// Vorschau nie von der tatsächlichen Wirkung abweicht. `null` für Upgrades
// ohne einfachen Zahlenwert. `capped: true` markiert einen erreichten
// Maximalwert (zeigt im UI ein "(MAX)"-Badge).
export function getUpgradeStatPreview(key, ship, currentUpgrades = upgrades) {
    if (key === 'magnet') {
        const radiusFor = (level) => Math.round(MAGNET.BASE_RADIUS + level * MAGNET.RADIUS_INCREASE);
        const fromStr = currentUpgrades.magnet === 0 ? 'Off' : radiusFor(currentUpgrades.magnet) + 'm';
        return { label: 'Range', from: fromStr, to: radiusFor(currentUpgrades.magnet + 1) + 'm' };
    }
    if (key === 'laser') {
        const baseDamage = (typeof window !== 'undefined' && window.BASE_LASER_DAMAGE) ? window.BASE_LASER_DAMAGE : 1;
        const damageFor = (level) => (baseDamage * Math.pow(1.10, level)).toFixed(2);
        return { label: 'Damage', from: damageFor(currentUpgrades.laser), to: damageFor(currentUpgrades.laser + 1) };
    }
    if (key === 'speed') {
        return { label: 'Max Speed', from: ship.maxSpeed.toFixed(1), to: (ship.maxSpeed + PHYSICS.SPEED_UPGRADE_INCREASE).toFixed(1) };
    }
    if (key === 'armor') {
        return { label: 'Shield', from: ship.maxHp, to: ship.maxHp + ARMOR.HP_PER_UPGRADE };
    }
    if (key === 'repairModule') {
        const level = currentUpgrades.repairModule;
        const next = level + 1;
        return {
            label: 'Regen Interval',
            from: level > 0 ? (repairModuleIntervalFor(level) / 1000).toFixed(1) : '—',
            to: (repairModuleIntervalFor(next) / 1000).toFixed(1),
            unit: 's',
            capped: repairModuleIntervalFor(next) <= REPAIR_MODULE.MIN_INTERVAL_MS
        };
    }
    if (key === 'deflectorShield') {
        const level = currentUpgrades.deflectorShield;
        const next = level + 1;
        return {
            label: 'Recharge',
            from: level > 0 ? (deflectorRechargeFor(level) / 1000).toFixed(1) : '—',
            to: (deflectorRechargeFor(next) / 1000).toFixed(1),
            unit: 's',
            capped: deflectorRechargeFor(next) <= DEFLECTOR_SHIELD.MIN_RECHARGE_MS
        };
    }
    if (key === 'collectorPulse') {
        const level = currentUpgrades.collectorPulse;
        const next = level + 1;
        return {
            label: 'Pull Duration',
            from: level > 0 ? (collectorPulseDurationFor(level) / 1000).toFixed(1) : '—',
            to: (collectorPulseDurationFor(next) / 1000).toFixed(1),
            unit: 's',
            capped: collectorPulseDurationFor(next) >= COLLECTOR_PULSE.MAX_DURATION_MS
        };
    }
    if (key === 'chainLightning') {
        const level = currentUpgrades.chainLightning;
        const next = level + 1;
        return {
            label: 'Arc Chance',
            from: Math.round(chainLightningChanceFor(level) * 100),
            to: Math.round(chainLightningChanceFor(next) * 100),
            unit: '%',
            capped: chainLightningChanceFor(next) >= CHAIN_LIGHTNING.MAX_CHANCE
        };
    }
    if (key === 'overdriveCore') {
        const level = currentUpgrades.overdriveCore;
        const next = level + 1;
        return {
            label: 'Overdrive Duration',
            from: (overdriveDurationFor(level) / 1000).toFixed(1),
            to: (overdriveDurationFor(next) / 1000).toFixed(1),
            unit: 's',
            capped: next >= OVERDRIVE_CORE.MAX_LEVEL
        };
    }
    return null;
}

// --- "Recommended" tag rules ------------------------------------------------
// 1. Survival first: if armor is at half HP or below, Armor Plating is recommended.
// 2. Otherwise, recommend whichever of the four stackable stats has fallen the
//    furthest behind (lowest purchase count), but only once it trails the
//    next-lowest by at least 2 — avoids flip-flopping between near-tied stats
//    on every single level-up.
// The specialized/utility upgrades (Repair Module, Deflector Shield, Collector
// Pulse, Chain Lightning, Overdrive Core) are never auto-recommended — they're
// situational build choices, not part of core stat balancing.
export function getRecommendedUpgradeKey(ship, currentUpgrades) {
    if (ship.maxHp > 1 && ship.hp / ship.maxHp <= 0.5) {
        return 'armor';
    }
    const stackable = ['magnet', 'laser', 'speed', 'armor'];
    const sorted = [...stackable].sort((a, b) => currentUpgrades[a] - currentUpgrades[b]);
    const [lowestKey, secondKey] = sorted;
    if (currentUpgrades[secondKey] - currentUpgrades[lowestKey] >= 2) {
        return lowestKey;
    }
    return null;
}

// --- Overdrive: temporärer Kampf-Buff. Standardmäßig ausgelöst durch die Wahl
// von "Laser Damage"; mit Overdrive Core zusätzlich bei JEDER Upgrade-Wahl,
// und mit länger werdender Dauer pro Overdrive-Core-Level. ---
export let overdriveUntil = 0;

export function getOverdriveDurationMs() {
    return overdriveDurationFor(upgrades.overdriveCore);
}

export function activateOverdrive() {
    overdriveUntil = performance.now() + getOverdriveDurationMs();
}

export function isOverdriveActive() {
    return performance.now() < overdriveUntil;
}

export function getFireRateMultiplier(currentTechUpgrades = techUpgrades) {
    let mult = isOverdriveActive() ? OVERDRIVE.FIRE_RATE_MULT : 1;
    if (currentTechUpgrades && currentTechUpgrades.rapidFire) mult *= RAPID_FIRE.COOLDOWN_MULT;
    return mult;
}

export function getDamageMultiplier() {
    return isOverdriveActive() ? OVERDRIVE.DAMAGE_MULT : 1;
}

// --- Collector Pulse: Sofort-Effekt (wiederholt wählbarer Shop-Eintrag), zieht
// alle XP-/Plasma-Orbs auf dem Feld zum Schiff, indem der bestehende
// Magnet-Zug kurz und überall (nicht nur in Reichweite) sehr stark angewendet
// wird. Jeder weitere Kauf verlängert die Zugdauer (siehe collectorPulseDurationFor). ---
export let collectorPulseUntil = 0;

export function triggerCollectorPulse() {
    collectorPulseUntil = performance.now() + collectorPulseDurationFor(upgrades.collectorPulse);
}

export function isCollectorPulseActive() {
    return performance.now() < collectorPulseUntil;
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
    const prereqMet = !prereq || (prereq === 'autoShoot' ? isAutoShootUnlocked() : techUpgrades[prereq]);
    if (!prereqMet) return; // Voraussetzung im Tech-Baum nicht erfüllt
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
