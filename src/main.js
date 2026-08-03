import { Ship } from './ship.js';
import { enemies, enemyLasers, spawnEnemyLaser, spawnEnemy, startEnemySpawning, stopEnemySpawning, spawnEnemyWave, spawnBoss } from './enemyManager.js';
import Laser from './laser.js';
import XP from './xp.js';
import PlasmaCell from './plasma.js';
import TractorItem from './tractorItem.js';
import { updateExperienceBar, displayLevel, updateHullUI, initializeUI, displayGameOverScreen, displayShopModal, displayPauseButton, removePauseButton, displayPauseMenu, removePauseMenu, updatePlasmaUI, showTechTreeButton, showTechTreeModal, showWaveHint, showOverdriveHint, showBossHint, displayStartScreen, displaySettingsButton, showSettingsMenu } from './ui.js';
import { InputManager } from './input.js';
import { EffectsSystem } from './effects.js';
import { GAME_CONFIG, PHYSICS, MAGNET, PROGRESSION, ENEMY_LASER, EFFECTS, STARS, TOUCH_CONTROLS, COLORS, MOBILE } from './constants.js';
import { applyUpgrade, upgrades, techUpgrades, loadTechUpgrades, saveTechUpgrades, loadPlasmaCount, savePlasmaCount, handleTechUpgrade, setupPlasmaUI } from './upgrades.js'; // plasmaCount entfernt
import { handleXpCollection, handlePlasmaCollection, handleTractorCollection } from './collectibles.js';
import { createGameLoop } from './gameLoop.js';

initializeUI();

const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
document.body.appendChild(canvas);
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const inputManager = new InputManager();

window.logicalWidth = window.innerWidth;
window.logicalHeight = window.innerHeight;

function applyDesktopResolutionCap() {
    if (inputManager.isMobile) return;
    const MAX_AREA = 1920 * 1080;
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (w * h > MAX_AREA) {
        const scale = Math.sqrt(MAX_AREA / (w * h));
        canvas.width = Math.floor(w * scale);
        canvas.height = Math.floor(h * scale);
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        canvas.style.display = 'block';
        window.logicalWidth = canvas.width;
        window.logicalHeight = canvas.height;
    } else {
        canvas.width = w;
        canvas.height = h;
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        canvas.style.display = 'block';
        window.logicalWidth = w;
        window.logicalHeight = h;
    }
}

if (inputManager.isMobile) {
    window.logicalWidth = window.innerWidth / MOBILE.GAME_ZOOM;
    window.logicalHeight = window.innerHeight / MOBILE.GAME_ZOOM;
} else {
    applyDesktopResolutionCap();
}

const ship = new Ship(window.logicalWidth / 2, window.logicalHeight / 2);
const lasers = [];
const xpPoints = [];
const plasmaCells = [];
const tractorItems = [];
let experience = 0;
let level = 1;
let maxXP = 5;
let isGameOver = false;
let isShopOpen = false; // Flag to pause game logic when shop is open
let isPaused = false;
let kills = 0;
let xpCollected = 0;
let enemySpawnIntervalId;

window.BASE_LASER_DAMAGE = GAME_CONFIG.BASE_LASER_DAMAGE;

// Ship-Physik-Parameter
// ship.angle wird in updateShipMovement oder autoAimLogic gesetzt
ship.vx = 0;
ship.vy = 0;
ship.acceleration = PHYSICS.SHIP_ACCELERATION;
ship.maxSpeed = PHYSICS.SHIP_MAX_SPEED;
ship.friction = PHYSICS.SHIP_FRICTION;
// ship.maxSpeed wird nur durch applyUpgrade('speed') erhöht, nicht automatisch!

let marginX, marginY; // Deklarieren für spätere Zuweisung
let worldOffsetX = 0; // Für Sternen-Parallax und Weltverschiebung
let worldOffsetY = 0;
function updateShipMovement(dt = 1) {
    if (ship.isExploding) return;

    const keys = inputManager.getKeys();
    const joystickMove = inputManager.getJoystickMove();

    // --- Mobile absolute Steuerung (Joystick) ---
    if (joystickMove && (typeof joystickMove.x === 'number') && (typeof joystickMove.y === 'number')) {
        // Normiere Vektor
        let dx = joystickMove.x, dy = joystickMove.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
            // Accelerate based on joystick distance
            const maxDist = TOUCH_CONTROLS.JOYSTICK_SIZE / 2 - TOUCH_CONTROLS.JOYSTICK_STICK_SIZE / 2;
            const normalizedDist = Math.min(dist / maxDist, 1);
            const accel = normalizedDist * ship.acceleration * dt;
            const nx = dx / dist, ny = dy / dist;
            ship.vx += nx * accel;
            ship.vy += ny * accel;
            // Schiff geschmeidig in Bewegungsrichtung drehen (Lerp)
            const targetAngle = Math.atan2(ny, nx);
            let diff = targetAngle - ship.angle;
            // Normalisiere den Winkel auf -PI bis PI, damit es nicht "außenrum" dreht
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            ship.angle += diff * (1 - Math.pow(1 - PHYSICS.MOBILE_JOYSTICK_SENSITIVITY, dt));

            ship.thrustState = 'forward';
        } else {
            ship.thrustState = 'none';
        }

        // Max Speed
        const speed = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
        if (speed > ship.maxSpeed) {
            ship.vx *= ship.maxSpeed / speed;
            ship.vy *= ship.maxSpeed / speed;
        }

        // Friction/Drift
        ship.vx *= Math.pow(ship.friction, dt);
        ship.vy *= Math.pow(ship.friction, dt);

        // Welt-Offset wie gehabt
        let nextX = ship.x + ship.vx;
        let nextY = ship.y + ship.vy;
        let offsetX = 0, offsetY = 0;
        if (nextX < marginX) { offsetX = marginX - nextX; nextX = marginX; }
        if (nextX > window.logicalWidth - marginX) { offsetX = (window.logicalWidth - marginX) - nextX; nextX = window.logicalWidth - marginX; }
        if (nextY < marginY) { offsetY = marginY - nextY; nextY = marginY; }
        if (nextY > window.logicalHeight - marginY) { offsetY = (window.logicalHeight - marginY) - nextY; nextY = window.logicalHeight - marginY; }
        if (offsetX !== 0 || offsetY !== 0) {
            worldOffsetX += -offsetX;
            worldOffsetY += -offsetY;
            effectsSystem.moveStars(offsetX, offsetY); // Korrekt über EffectsSystem
            enemies.forEach(e => { e.x += offsetX; e.y += offsetY; });
            xpPoints.forEach(xp => { xp.x += offsetX; xp.y += offsetY; });
            lasers.forEach(l => { if (l && typeof l.x === 'number') { l.x += offsetX; l.y += offsetY; } });
            enemyLasers.forEach(l => { l.x += offsetX; l.y += offsetY; });
            plasmaCells.forEach(p => { p.x += offsetX; p.y += offsetY; });
            tractorItems.forEach(t => { t.x += offsetX; t.y += offsetY; });
            effectsSystem.moveXpParticles(offsetX, offsetY); // Korrekt über EffectsSystem
        }
        ship.x = nextX;
        ship.y = nextY;
        return;
    }

    // Schubzustand für Animation setzen
    if (keys.up) {
        ship.thrustState = 'forward';
    } else if (keys.down) {
        ship.thrustState = 'backward';
    } else {
        ship.thrustState = 'none';
    }

    // Drehen — Geschwindigkeit rampt beim Halten hoch, damit ein kurzer Tap
    // eine kleine, präzise Richtungsänderung ergibt statt eines abrupten Sprungs.
    if (keys.left || keys.right) {
        ship.turnRamp = Math.min(1, (ship.turnRamp || 0) + PHYSICS.SHIP_ROTATION_RAMP_STEP * dt);
    } else {
        ship.turnRamp = 0;
    }
    const turnSpeed = PHYSICS.SHIP_ROTATION_SPEED * (PHYSICS.SHIP_ROTATION_MIN_FACTOR + (1 - PHYSICS.SHIP_ROTATION_MIN_FACTOR) * ship.turnRamp) * dt;
    if (keys.left) ship.angle -= turnSpeed;
    if (keys.right) ship.angle += turnSpeed;

    // Beschleunigung
    let ax = 0, ay = 0;
    if (keys.up) {
        ax += Math.cos(ship.angle) * ship.acceleration;
        ay += Math.sin(ship.angle) * ship.acceleration;
    }
    if (keys.down) {
        ax -= Math.cos(ship.angle) * ship.acceleration * PHYSICS.BACKWARD_THRUST_FACTOR;
        ay -= Math.sin(ship.angle) * ship.acceleration * PHYSICS.BACKWARD_THRUST_FACTOR;
    }
    ship.vx += ax * dt;
    ship.vy += ay * dt;
    // Max Speed
    const speed = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
    if (speed > ship.maxSpeed) {
        ship.vx *= ship.maxSpeed / speed;
        ship.vy *= ship.maxSpeed / speed;
    }
    // Friction/Drift
    ship.vx *= Math.pow(ship.friction, dt);
    ship.vy *= Math.pow(ship.friction, dt);

    // --- NEU: Welt verschieben, wenn Schiff Randbereich erreicht ---
    let nextX = ship.x + ship.vx;
    let nextY = ship.y + ship.vy;
    let offsetX = 0, offsetY = 0;
    // Links
    if (nextX < marginX) {
        offsetX = marginX - nextX;
        nextX = marginX;
    }
    // Rechts
    if (nextX > window.logicalWidth - marginX) {
        offsetX = (window.logicalWidth - marginX) - nextX;
        nextX = window.logicalWidth - marginX;
    }
    // Oben
    if (nextY < marginY) {
        offsetY = marginY - nextY;
        nextY = marginY;
    }
    // Unten
    if (nextY > window.logicalHeight - marginY) {
        offsetY = (window.logicalHeight - marginY) - nextY;
        nextY = window.logicalHeight - marginY;
    }
    // Wenn Offset != 0, verschiebe Welt
    if (offsetX !== 0 || offsetY !== 0) {
        worldOffsetX += -offsetX;
        worldOffsetY += -offsetY;
        
        // Alle Weltobjekte verschieben - GEÄNDERT:
        effectsSystem.moveStars(offsetX, offsetY);
        effectsSystem.moveXpParticles(offsetX, offsetY);
        enemies.forEach(e => { e.x += offsetX; e.y += offsetY; });
        xpPoints.forEach(xp => { xp.x += offsetX; xp.y += offsetY; });
        lasers.forEach(l => { if (l && typeof l.x === 'number') { l.x += offsetX; l.y += offsetY; } });
        enemyLasers.forEach(l => { l.x += offsetX; l.y += offsetY; });
        plasmaCells.forEach(p => { p.x += offsetX; p.y += offsetY; });
        tractorItems.forEach(t => { t.x += offsetX; t.y += offsetY; });
    }
    ship.x = nextX;
    ship.y = nextY;
}

// --- STERNENHINTERGRUND (PARALLAX) ---

const effectsSystem = new EffectsSystem(canvas);
// --- PAUSE BUTTON & ESC HANDLING ---
displayPauseButton(() => pauseGame());
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (!isPaused && !isGameOver && !isShopOpen) {
            pauseGame();
        } else if (isPaused && !isGameOver && !isShopOpen) {
            resumeGame();
        }
    }
});

function pauseGame() {
    if (isPaused || isGameOver || isShopOpen) return;
    isPaused = true; // Lokaler Status für das Pausenmenü-UI
    isPausedRef.value = true; // Damit der gameLoop pausiert
    removePauseButton();
    displayPauseMenu({
        level,
        experience,
        maxXP,
        kills,
        xpCollected
    }, resumeGame, restartGame);
    // Der gameLoop wird anhalten, da isPausedRef.value jetzt true ist.
}

function resumeGame() {
    // Wenn das Haupt-Pausensystem (ESC/Button) aktiv war, dessen UI behandeln
    if (isPaused) {
        isPaused = false; // Haupt-Pausenstatus zurücksetzen
        removePauseMenu();
        displayPauseButton(() => pauseGame());
    }

    // Sicherstellen, dass die steuernde Referenz des gameLoops auf false gesetzt ist
    isPausedRef.value = false;

    // Den gameLoop neu starten.
    // Dies ist essentiell, falls die Schleife angehalten hatte, weil isPausedRef.value true war.
    requestAnimationFrame(gameLoop);
}

// Mache resumeGame global verfügbar, damit das Tech-Tree-Modal es aufrufen kann
window.resumeGame = resumeGame;

window.addEventListener('resize', () => {
    window.logicalWidth = window.innerWidth;
    window.logicalHeight = window.innerHeight;
    if (inputManager.isMobile) {
        inputManager.resizeCanvasForMobile();
        window.logicalWidth = window.innerWidth / MOBILE.GAME_ZOOM;
        window.logicalHeight = window.innerHeight / MOBILE.GAME_ZOOM;
    } else {
        applyDesktopResolutionCap();
    }
    effectsSystem.resize(window.logicalWidth, window.logicalHeight);
    
    // Margin für Weltverschiebung neu berechnen, da sich das logische Fenster geändert hat
    marginX = window.logicalWidth * PHYSICS.MARGIN_FACTOR;
    marginY = window.logicalHeight * PHYSICS.MARGIN_FACTOR;
});

function restartGame() {
    document.location.reload();
}

// --- Statistiken tracken ---
// (Korrekt: Nur im jeweiligen Kontext erhöhen, nicht global im Code!)
// Entferne die fehlerhaften globalen Zeilen:
// xp.collect();
// experience++;
// xpCollected++;
// enemy.destroy();
// kills++;
// ...

// Passe main.js an, damit ship.shoot() ein Array zurückgibt (für Doppellaser)

// Referenzen für primitive Werte, damit sie im GameLoop veränderbar bleiben
const isPausedRef = { value: isPaused };
window.isPausedRef = isPausedRef;
const isGameOverRef = { value: isGameOver };
const isShopOpenRef = { value: isShopOpen };
const killsRef = { value: kills };
const xpCollectedRef = { value: xpCollected };
const levelRef = { value: level };
const experienceRef = { value: experience };
const maxXPRef = { value: maxXP };
let autoShootTimerRef = { value: 0 };
const easyModeRef = { value: false }; // set at the Pre-Flight Check, changeable later via Settings
let easyArmorGranted = false; // guards the one-time Easy-mode hull bonus against repeated toggling

function grantEasyModeArmorBonus() {
    if (easyArmorGranted) return;
    applyUpgrade('armor', ship, PHYSICS);
    applyUpgrade('armor', ship, PHYSICS);
    ship.hp = ship.maxHp;
    easyArmorGranted = true;
}

// Synchronisiere die Werte mit den Refs im GameLoop
function syncRefsToVars() {
    isPaused = isPausedRef.value;
    isGameOver = isGameOverRef.value;
    isShopOpen = isShopOpenRef.value;
    kills = killsRef.value;
    xpCollected = xpCollectedRef.value;
    level = levelRef.value;
    experience = experienceRef.value;
    maxXP = maxXPRef.value;
}

// Patch: Synchronisiere nach jedem Level-Up die Werte zurück in die Hauptvariablen
window.syncRefsToVars = syncRefsToVars;

const gameLoop = createGameLoop({
    ship, enemies, enemyLasers, lasers, xpPoints, plasmaCells, tractorItems,
    effectsSystem, inputManager, upgrades, GAME_CONFIG, EFFECTS, // magnetRadius hier entfernt
    PHYSICS, MOBILE, ctx, canvas, XP, PlasmaCell, TractorItem, handleXpCollection, handlePlasmaCollection, handleTractorCollection, spawnEnemyWave, spawnBoss, showWaveHint, showOverdriveHint, showBossHint,
    displayLevel, updateExperienceBar, updateHullUI, displayGameOverScreen, displayShopModal,
    applyUpgrade, showTechTreeButton, showTechTreeModal, techUpgrades,
    isPausedRef, isGameOverRef, isShopOpenRef, killsRef, xpCollectedRef, levelRef, experienceRef, maxXPRef,
    startEnemySpawning, autoShootTimerRef, easyModeRef,
    updateShipMovement
});
// --- GAME LOOP START ---
inputManager.resizeCanvasForMobile();

// Margin für Weltverschiebung NACH Canvas-Skalierung berechnen
marginX = window.logicalWidth * PHYSICS.MARGIN_FACTOR;
marginY = window.logicalHeight * PHYSICS.MARGIN_FACTOR;
loadTechUpgrades();
loadPlasmaCount();
setupPlasmaUI();
window.updatePlasmaUI(upgrades.plasmaCount);
window.getPlasmaCount = () => upgrades.plasmaCount;

// --- NEU: Callback für TechTree-Änderungen ---
window.onTechTreeChanged = function() {
    startEnemySpawning(canvas, levelRef, { value: techUpgrades }, isPausedRef, isShopOpenRef, isGameOverRef, easyModeRef);
};

function applySettings(mode, controlsVisible) {
    easyModeRef.value = mode === 'easy';
    if (easyModeRef.value) grantEasyModeArmorBonus();
    if (typeof inputManager.setControlsVisible === 'function') inputManager.setControlsVisible(controlsVisible);

    gameLoop();
    startEnemySpawning(canvas, levelRef, { value: techUpgrades }, isPausedRef, isShopOpenRef, isGameOverRef, easyModeRef);

    // Settings: Schwierigkeit und (mobil) Sichtbarkeit der Touch-Steuerung jederzeit änderbar
    displaySettingsButton(() => {
        showSettingsMenu({
            easyMode: easyModeRef.value,
            controlsVisible: inputManager.controlsVisible !== false,
            isMobile: inputManager.isMobile,
            onDifficultyChange: (nextMode) => {
                easyModeRef.value = nextMode === 'easy';
                if (easyModeRef.value) grantEasyModeArmorBonus();
                const settings = JSON.parse(localStorage.getItem('spaceShipIdleSettings') || '{}');
                settings.mode = nextMode;
                localStorage.setItem('spaceShipIdleSettings', JSON.stringify(settings));
            },
            onToggleControls: (visible) => {
                if (typeof inputManager.setControlsVisible === 'function') inputManager.setControlsVisible(visible);
                const settings = JSON.parse(localStorage.getItem('spaceShipIdleSettings') || '{}');
                settings.controlsVisible = visible;
                localStorage.setItem('spaceShipIdleSettings', JSON.stringify(settings));
            }
        });
    });
}

const savedSettings = JSON.parse(localStorage.getItem('spaceShipIdleSettings'));
if (savedSettings && savedSettings.mode) {
    applySettings(savedSettings.mode, savedSettings.controlsVisible !== false);
} else {
    displayStartScreen((mode) => {
        localStorage.setItem('spaceShipIdleSettings', JSON.stringify({ mode, controlsVisible: true }));
        applySettings(mode, true);
    });
}
// --- GAME LOOP ENDE ---

// Nach jedem Shop-Upgrade und Level-Up synchronisieren
window.addEventListener('focus', syncRefsToVars);