import { Ship } from './ship.js';
import { enemies, enemyLasers, spawnEnemyLaser, spawnEnemy, startEnemySpawning, stopEnemySpawning, spawnEnemyWave, spawnBoss } from './enemyManager.js';
import Laser from './laser.js';
import XP from './xp.js';
import PlasmaCell from './plasma.js';
import TractorItem from './tractorItem.js';
import { updateExperienceBar, displayLevel, initializeUI, displayGameOverScreen, displayShopModal, displayPauseButton, removePauseButton, displayPauseMenu, removePauseMenu, updatePlasmaUI, showTechTreeButton, showTechTreeModal, showWaveHint, showOverdriveHint, showBossHint, displayStartScreen, displaySettingsButton, showSettingsMenu, showUpdateToast, showMobileMovementUpdateNotice } from './ui.js';
import { InputManager } from './input.js';
import { EffectsSystem } from './effects.js';
import { GAME_CONFIG, PHYSICS, MAGNET, PROGRESSION, ENEMY_LASER, EFFECTS, STARS, TOUCH_CONTROLS, COLORS, MOBILE } from './constants.js';
import { applyUpgrade, upgrades, techUpgrades, loadTechUpgrades, saveTechUpgrades, loadPlasmaCount, savePlasmaCount, handleTechUpgrade, setupPlasmaUI } from './upgrades.js'; // plasmaCount entfernt
import { handleXpCollection, handlePlasmaCollection, handleTractorCollection } from './collectibles.js';
import { createGameLoop } from './gameLoop.js';
import { saveRunState, loadRunState, isAutosaveSuppressed } from './runState.js';
import { registerSW } from 'virtual:pwa-register';
import { AudioManager } from './audio/AudioManager.js';

AudioManager.init();
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
    const rightManeuver = inputManager.getRightManeuver ? inputManager.getRightManeuver() : { x: 0, y: 0 };
    const strafeValue = rightManeuver.x;
    const maneuverThrust = rightManeuver.y;

    // --- Mobile absolute Steuerung (Joystick) ---
    if ((joystickMove && (typeof joystickMove.x === 'number') && (typeof joystickMove.y === 'number')) || strafeValue || maneuverThrust) {
        // Normiere Vektor
        let dx = joystickMove ? joystickMove.x : 0, dy = joystickMove ? joystickMove.y : 0;
        const dist = Math.sqrt(dx * dx + dy * dy);
        let turnDiff = 0;
        if (dist > 0) {
            const nx = dx / dist, ny = dy / dist;
            // The left stick only selects the ship's facing. Thrust comes from
            // the right maneuver stick, so reverse flight remains available
            // without the two controls fighting each other.
            const targetAngle = Math.atan2(ny, nx);
            let diff = targetAngle - ship.angle;
            // Normalisiere den Winkel auf -PI bis PI, damit es nicht "außenrum" dreht
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            const turnInput = Math.pow(Math.min(1, dist), PHYSICS.MOBILE_JOYSTICK_RESPONSE_CURVE);
            const turnStep = PHYSICS.MOBILE_JOYSTICK_TURN_SPEED * turnInput * dt;
            ship.angle += Math.max(-turnStep, Math.min(turnStep, diff));
            turnDiff = diff;

        } else if (!maneuverThrust && !strafeValue) {
            ship.thrustState = 'none';
        }

        // Right maneuver stick: vertical thrust and horizontal strafing are
        // both relative to the current facing, independent of the left stick.
        if (maneuverThrust) {
            const thrustAccel = maneuverThrust * ship.acceleration * (maneuverThrust < 0 ? PHYSICS.BACKWARD_THRUST_FACTOR : 1) * dt;
            ship.vx += Math.cos(ship.angle) * thrustAccel;
            ship.vy += Math.sin(ship.angle) * thrustAccel;
            ship.thrustState = maneuverThrust > 0 ? 'forward' : 'backward';
        }

        // Horizontal right-stick input: purely lateral movement relative to the
        // AKTUELLEN Blickrichtung, unabhängig davon, wohin der linke Stick das
        // Schiff gerade dreht — exakt dasselbe Prinzip wie Q/E am Desktop.
        if (strafeValue) {
            const strafeAccel = strafeValue * ship.acceleration * PHYSICS.STRAFE_THRUST_FACTOR * dt;
            ship.vx += Math.cos(ship.angle + Math.PI / 2) * strafeAccel;
            ship.vy += Math.sin(ship.angle + Math.PI / 2) * strafeAccel;
            if (!maneuverThrust) ship.thrustState = 'forward';
        }

        // Sprite-Bank-State fürs Schiffsbild: Strafen (Roll) hat Vorrang vor der
        // Auto-Ausrichtung (Turn), sonst würde der Turn-Frame beim Diagonalfahren
        // fast dauerhaft zeigen. Kleine Auto-Face-Korrekturen unterhalb der
        // Deadband bleiben "none", damit der Turn-Frame nur bei echten
        // Richtungswechseln aufblitzt.
        const TURN_BANK_DEADBAND = 0.35; // rad
        if (Math.abs(strafeValue) > 0.15) {
            ship.bankState = strafeValue > 0 ? 'rollRight' : 'rollLeft';
        } else if (Math.abs(turnDiff) > TURN_BANK_DEADBAND) {
            ship.bankState = turnDiff > 0 ? 'turnRight' : 'turnLeft';
        } else {
            ship.bankState = 'none';
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
    } else if (keys.strafeLeft || keys.strafeRight) {
        ship.thrustState = 'forward'; // Triebwerke glühen auch beim reinen Strafen
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

    // Sprite-Bank-State: Strafen (Roll) hat Vorrang vor Drehen (Turn), falls
    // beide Tasten gleichzeitig gehalten werden — dieselbe Priorität wie im
    // Mobile-Joystick-Pfad oben.
    if (keys.strafeLeft) ship.bankState = 'rollLeft';
    else if (keys.strafeRight) ship.bankState = 'rollRight';
    else if (keys.left) ship.bankState = 'turnLeft';
    else if (keys.right) ship.bankState = 'turnRight';
    else ship.bankState = 'none';

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
    // Strafen (Q/E) — rein seitliche Beschleunigung relativ zur aktuellen
    // Blickrichtung, unabhängig von Drehung (A/D) und Vorwärts-/Rückwärtsschub
    // (W/S), damit das Schiff seitlich fahren kann, während es weiter geradeaus
    // schießt.
    if (keys.strafeRight) {
        ax += Math.cos(ship.angle + Math.PI / 2) * ship.acceleration * PHYSICS.STRAFE_THRUST_FACTOR;
        ay += Math.sin(ship.angle + Math.PI / 2) * ship.acceleration * PHYSICS.STRAFE_THRUST_FACTOR;
    }
    if (keys.strafeLeft) {
        ax += Math.cos(ship.angle - Math.PI / 2) * ship.acceleration * PHYSICS.STRAFE_THRUST_FACTOR;
        ay += Math.sin(ship.angle - Math.PI / 2) * ship.acceleration * PHYSICS.STRAFE_THRUST_FACTOR;
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
    saveRun();
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
let easyArmorGranted = false; // guards the one-time Easy-mode armor bonus against repeated toggling

function grantEasyModeArmorBonus() {
    if (easyArmorGranted) return;
    applyUpgrade('armor', ship, PHYSICS);
    applyUpgrade('armor', ship, PHYSICS);
    ship.hp = ship.maxHp;
    easyArmorGranted = true;
}

// --- Spielstand-Persistenz: Reload soll den laufenden Flug nicht kosten ---
// (nur der Tod tut das, siehe endGame()/clearRunState() in gameLoop.js).
function saveRun() {
    // Während der Explosionsanimation (ship.hp <= 0, isGameOverRef noch false für
    // ~1s) NICHT speichern — sonst würde ein Reload in diesem Fenster den Tod
    // rückgängig machen, statt ihn nur nicht vorzeitig zu erzwingen.
    if (isGameOverRef.value || ship.isExploding || ship.hp <= 0 || isAutosaveSuppressed()) return;
    saveRunState({
        level: levelRef.value,
        experience: experienceRef.value,
        maxXP: maxXPRef.value,
        kills: killsRef.value,
        xpCollected: xpCollectedRef.value,
        upgrades: {
            magnet: upgrades.magnet,
            laser: upgrades.laser,
            speed: upgrades.speed,
            armor: upgrades.armor,
            repairModule: upgrades.repairModule,
            deflectorShield: upgrades.deflectorShield,
            collectorPulse: upgrades.collectorPulse,
            chainLightning: upgrades.chainLightning,
            overdriveCore: upgrades.overdriveCore,
            xpBoost: upgrades.xpBoost
        },
        hp: ship.hp,
        easyMode: easyModeRef.value
    });
}

function restoreRunState() {
    const saved = loadRunState();
    if (!saved) return false;

    levelRef.value = saved.level || 1;
    experienceRef.value = saved.experience || 0;
    maxXPRef.value = saved.maxXP || maxXPRef.value;
    killsRef.value = saved.kills || 0;
    xpCollectedRef.value = saved.xpCollected || 0;
    easyModeRef.value = !!saved.easyMode;
    // Ein etwaiger Easy-Mode-Rüstungsbonus steckt schon in saved.upgrades.armor —
    // nicht beim Wiederherstellen ein zweites Mal vergeben.
    easyArmorGranted = true;

    const savedUpgrades = saved.upgrades || {};
    ['magnet', 'laser', 'speed', 'armor', 'repairModule', 'deflectorShield', 'chainLightning', 'overdriveCore', 'xpBoost'].forEach((key) => {
        const count = savedUpgrades[key] || 0;
        for (let i = 0; i < count; i++) applyUpgrade(key, ship, PHYSICS);
    });
    // Collector Pulse ist ein Sofort-Effekt-Upgrade — Level direkt setzen statt
    // applyUpgrade() N-mal aufzurufen, sonst würde der Pull-Effekt beim
    // Wiederherstellen unnötig N-mal ausgelöst.
    upgrades.collectorPulse = savedUpgrades.collectorPulse || 0;
    if (typeof saved.hp === 'number') {
        ship.hp = Math.min(ship.maxHp, Math.max(1, saved.hp));
    }
    syncRefsToVars();
    return true;
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
    displayLevel, updateExperienceBar, displayGameOverScreen, displayShopModal,
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

// Laufenden Flug wiederherstellen, falls vorhanden (Reload während des Spiels) —
// muss VOR applySettings()/gameLoop-Start passieren, damit Ship-Stats und Refs
// stehen, bevor die erste Frame gezeichnet wird.
restoreRunState();

// Bridge für gameLoop.js: dort werden Level-Up und Upgrade-Kauf ausgelöst,
// beides gute Speicherpunkte (gleiches Muster wie window.syncRefsToVars).
window.saveRunState = saveRun;

setInterval(saveRun, 8000);
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveRun();
});
window.addEventListener('beforeunload', saveRun);

// --- NEU: Callback für TechTree-Änderungen ---
window.onTechTreeChanged = function() {
    startEnemySpawning(canvas, levelRef, { value: techUpgrades }, isPausedRef, isShopOpenRef, isGameOverRef, easyModeRef);
};

function applySettings(mode, controlsVisible, mobileAdvancedControls = false) {
    easyModeRef.value = mode === 'easy';
    if (easyModeRef.value) grantEasyModeArmorBonus();
    if (typeof inputManager.setControlsVisible === 'function') inputManager.setControlsVisible(controlsVisible);
    if (typeof inputManager.setMobileAdvancedControls === 'function') inputManager.setMobileAdvancedControls(mobileAdvancedControls);

    gameLoop();
    startEnemySpawning(canvas, levelRef, { value: techUpgrades }, isPausedRef, isShopOpenRef, isGameOverRef, easyModeRef);

    // Settings: Schwierigkeit und (mobil) Sichtbarkeit der Touch-Steuerung jederzeit änderbar
    displaySettingsButton(() => {
        showSettingsMenu({
            easyMode: easyModeRef.value,
            controlsVisible: inputManager.controlsVisible !== false,
            mobileAdvancedControls: inputManager.mobileAdvancedControls === true,
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
            },
            onToggleAdvancedControls: (enabled) => {
                if (typeof inputManager.setMobileAdvancedControls === 'function') inputManager.setMobileAdvancedControls(enabled);
                const settings = JSON.parse(localStorage.getItem('spaceShipIdleSettings') || '{}');
                settings.mobileAdvancedControls = enabled;
                localStorage.setItem('spaceShipIdleSettings', JSON.stringify(settings));
            },
        });
    });
}

const savedSettings = JSON.parse(localStorage.getItem('spaceShipIdleSettings'));
if (savedSettings && savedSettings.mode) {
    applySettings(savedSettings.mode, savedSettings.controlsVisible !== false, savedSettings.mobileAdvancedControls === true);
    showMobileMovementUpdateNotice();
} else {
    displayStartScreen((mode) => {
        localStorage.setItem('spaceShipIdleSettings', JSON.stringify({ mode, controlsVisible: true, mobileAdvancedControls: false }));
        applySettings(mode, true);
    });
    showMobileMovementUpdateNotice();
}
// --- GAME LOOP ENDE ---

// Nach jedem Shop-Upgrade und Level-Up synchronisieren
window.addEventListener('focus', syncRefsToVars);

// --- PWA Update Registrierung ---
// Der Browser prüft eine registrierte sw.js standardmäßig nur bei Navigation
// auf Änderungen. Da das Spiel oft stundenlang ohne Reload in einem Tab läuft,
// muss der Update-Check hier aktiv per Intervall angestoßen werden, sonst
// feuert onNeedRefresh nie.
const SW_UPDATE_CHECK_INTERVAL_MS = 60 * 1000;
const updateSW = registerSW({
  onRegisteredSW(swUrl, registration) {
    if (!registration) return;
    setInterval(() => {
      registration.update();
    }, SW_UPDATE_CHECK_INTERVAL_MS);
  },
  onNeedRefresh() {
    showUpdateToast(() => {
      updateSW(true);
    }, isShopOpenRef, isPausedRef);
  },
  onOfflineReady() {
    console.log('App is ready for offline use.');
  }
});
