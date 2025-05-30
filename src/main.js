import { Ship } from './ship.js';
import { enemies, enemyLasers, spawnEnemyLaser, spawnEnemy, startEnemySpawning, stopEnemySpawning, spawnEnemyWave } from './enemyManager.js';
import Laser from './laser.js';
import XP from './xp.js';
import PlasmaCell from './plasma.js';
import { updateExperienceBar, displayLevel, initializeUI, displayGameOverScreen, displayShopModal, displayPauseButton, removePauseButton, displayPauseMenu, removePauseMenu, updatePlasmaUI, showTechTreeButton, showTechTreeModal, showWaveHint } from './ui.js';
import { InputManager } from './input.js';
import { EffectsSystem } from './effects.js';
import { GAME_CONFIG, PHYSICS, MAGNET, PROGRESSION, ENEMY_LASER, EFFECTS, STARS, TOUCH_CONTROLS, COLORS, MOBILE } from './constants.js';
import { applyUpgrade, upgrades, techUpgrades, loadTechUpgrades, saveTechUpgrades, loadPlasmaCount, savePlasmaCount, handleTechUpgrade, setupPlasmaUI } from './upgrades.js'; // plasmaCount entfernt
import { handleXpCollection, handlePlasmaCollection } from './collectibles.js';
import { createGameLoop } from './gameLoop.js';

initializeUI();

const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
document.body.appendChild(canvas);
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const ship = new Ship(canvas.width / 2, canvas.height / 2);
const lasers = [];
const xpPoints = [];
const plasmaCells = [];
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

const inputManager = new InputManager();

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
function updateShipMovement() {
    if (ship.isExploding) return;

    const keys = inputManager.getKeys();
    const joystickMove = inputManager.getJoystickMove();

    // --- Mobile absolute Steuerung (Joystick) ---
    if (joystickMove && (typeof joystickMove.x === 'number') && (typeof joystickMove.y === 'number')) {
        // Normiere Vektor
        let dx = joystickMove.x, dy = joystickMove.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
            // Reduzierter Geschwindigkeitsfaktor für mobile Steuerung
            const speed = Math.min(dist * PHYSICS.MOBILE_JOYSTICK_SENSITIVITY, ship.maxSpeed);
            const nx = dx / dist, ny = dy / dist;
            ship.vx += nx * speed;
            ship.vy += ny * speed;
            // Optional: Schiff in Bewegungsrichtung drehen
            ship.angle = Math.atan2(ny, nx);
        }
        // Friction/Drift
        ship.vx *= ship.friction;
        ship.vy *= ship.friction;
        // Welt-Offset wie gehabt
        let nextX = ship.x + ship.vx;
        let nextY = ship.y + ship.vy;
        let offsetX = 0, offsetY = 0;
        if (nextX < marginX) { offsetX = marginX - nextX; nextX = marginX; }
        if (nextX > canvas.width - marginX) { offsetX = (canvas.width - marginX) - nextX; nextX = canvas.width - marginX; }
        if (nextY < marginY) { offsetY = marginY - nextY; nextY = marginY; }
        if (nextY > canvas.height - marginY) { offsetY = (canvas.height - marginY) - nextY; nextY = canvas.height - marginY; }
        if (offsetX !== 0 || offsetY !== 0) {
            worldOffsetX += -offsetX;
            worldOffsetY += -offsetY;
            effectsSystem.moveStars(offsetX, offsetY); // Korrekt über EffectsSystem
            enemies.forEach(e => { e.x += offsetX; e.y += offsetY; });
            xpPoints.forEach(xp => { xp.x += offsetX; xp.y += offsetY; });
            lasers.forEach(l => { if (l && typeof l.x === 'number') { l.x += offsetX; l.y += offsetY; } });
            enemyLasers.forEach(l => { l.x += offsetX; l.y += offsetY; });
            plasmaCells.forEach(p => { p.x += offsetX; p.y += offsetY; });
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

    // Drehen
    if (keys.left) ship.angle -= PHYSICS.SHIP_ROTATION_SPEED;
    if (keys.right) ship.angle += PHYSICS.SHIP_ROTATION_SPEED;

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
    ship.vx += ax;
    ship.vy += ay;
    // Max Speed
    const speed = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
    if (speed > ship.maxSpeed) {
        ship.vx *= ship.maxSpeed / speed;
        ship.vy *= ship.maxSpeed / speed;
    }
    // Friction/Drift
    ship.vx *= ship.friction;
    ship.vy *= ship.friction;

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
    if (nextX > canvas.width - marginX) {
        offsetX = (canvas.width - marginX) - nextX;
        nextX = canvas.width - marginX;
    }
    // Oben
    if (nextY < marginY) {
        offsetY = marginY - nextY;
        nextY = marginY;
    }
    // Unten
    if (nextY > canvas.height - marginY) {
        offsetY = (canvas.height - marginY) - nextY;
        nextY = canvas.height - marginY;
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
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    effectsSystem.resize(canvas.width, canvas.height);
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
    ship, enemies, enemyLasers, lasers, xpPoints, plasmaCells,
    effectsSystem, inputManager, upgrades, GAME_CONFIG, EFFECTS, // magnetRadius hier entfernt
    PHYSICS, ctx, canvas, XP, PlasmaCell, handleXpCollection, handlePlasmaCollection, spawnEnemyWave, showWaveHint,
    displayLevel, updateExperienceBar, displayGameOverScreen, displayShopModal,
    applyUpgrade, showTechTreeButton, showTechTreeModal, techUpgrades,
    isPausedRef, isGameOverRef, isShopOpenRef, killsRef, xpCollectedRef, levelRef, experienceRef, maxXPRef,
    startEnemySpawning, autoShootTimerRef,
    updateShipMovement
});
// --- GAME LOOP START ---
inputManager.resizeCanvasForMobile();

// Margin für Weltverschiebung NACH Canvas-Skalierung berechnen
marginX = canvas.width * PHYSICS.MARGIN_FACTOR;
marginY = canvas.height * PHYSICS.MARGIN_FACTOR;
gameLoop();
// --- GAME LOOP ENDE ---
loadTechUpgrades();
loadPlasmaCount();
setupPlasmaUI();
window.updatePlasmaUI(upgrades.plasmaCount);

// Initialisiere Gegner-Spawning
startEnemySpawning(canvas, { value: level }, { value: techUpgrades });
// --- NEU: Callback für TechTree-Änderungen ---
window.onTechTreeChanged = function() {
    startEnemySpawning(canvas, { value: level }, { value: techUpgrades });
};

// Nach jedem Shop-Upgrade und Level-Up synchronisieren
window.addEventListener('focus', syncRefsToVars);