import { Ship } from './ship.js';
import Enemy from './enemy.js';
import Laser from './laser.js';
import XP from './xp.js';
import { updateExperienceBar, displayLevel, initializeUI, displayGameOverScreen, displayShopModal, displayPauseButton, removePauseButton, displayPauseMenu, removePauseMenu } from './ui.js';

initializeUI();

const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
document.body.appendChild(canvas);
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const ship = new Ship(canvas.width / 2, canvas.height / 2);
const enemies = [];
const lasers = [];
const xpPoints = [];
const enemyLasers = [];
let experience = 0;
let level = 1;
let maxXP = 5;
let isGameOver = false;
let isShopOpen = false; // Flag to pause game logic when shop is open
let isPaused = false;
let kills = 0;
let xpCollected = 0;
let enemySpawnIntervalId;

const BASE_LASER_DAMAGE = 1; // Basis-Schaden für Laser auf Level 0
window.BASE_LASER_DAMAGE = BASE_LASER_DAMAGE; // Global verfügbar machen

// --- SMOOTH SHIP MOVEMENT MIT BESCHLEUNIGUNG & DRIFT ---
const keys = { up: false, down: false, left: false, right: false, shooting: false };
// Für mobile absolute Steuerung:
let joystickMove = null;

// --- Welt-Offset für unendliche Map ---
let worldOffsetX = 0;
let worldOffsetY = 0;
// Randbereich (z.B. 20% vom Canvas)
const marginX = canvas.width * 0.2;
const marginY = canvas.height * 0.2;

window.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
        // Nur schießen, wenn nicht schon gehalten (Auto-Feuer verhindern)
        if (!keys.shooting) {
            lasers.push(ship.shoot());
            keys.shooting = true;
        }
    }
    if (["ArrowUp","w"].includes(event.key)) keys.up = true;
    if (["ArrowDown","s"].includes(event.key)) keys.down = true;
    if (["ArrowLeft","a"].includes(event.key)) keys.left = true;
    if (["ArrowRight","d"].includes(event.key)) keys.right = true;
});
window.addEventListener('keyup', (event) => {
    if (event.code === 'Space') keys.shooting = false;
    if (["ArrowUp","w"].includes(event.key)) keys.up = false;
    if (["ArrowDown","s"].includes(event.key)) keys.down = false;
    if (["ArrowLeft","a"].includes(event.key)) keys.left = false;
    if (["ArrowRight","d"].includes(event.key)) keys.right = false;
});
canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
        keys.shooting = true;
    }
});
canvas.addEventListener('mouseup', (e) => {
    if (e.button === 0) {
        keys.shooting = false;
    }
});

// Ship-Physik-Parameter
ship.vx = 0;
ship.vy = 0;
ship.acceleration = 0.15;
ship.maxSpeed = 4;
ship.friction = 0.90;
// ship.maxSpeed wird nur durch applyUpgrade('speed') erhöht, nicht automatisch!

function updateShipMovement() {
    if (ship.isExploding) return; // Während Explosion keine Steuerung

    // --- Mobile absolute Steuerung (Joystick) ---
    if (joystickMove && (typeof joystickMove.x === 'number') && (typeof joystickMove.y === 'number')) {
        // Normiere Vektor
        let dx = joystickMove.x, dy = joystickMove.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > 0) {
            // Reduzierter Geschwindigkeitsfaktor für mobile Steuerung
            const speed = Math.min(dist * 0.01, ship.maxSpeed);
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
            starLayers.forEach(layer => { layer.stars.forEach(star => { star.x += offsetX; star.y += offsetY; }); });
            enemies.forEach(e => { e.x += offsetX; e.y += offsetY; });
            xpPoints.forEach(xp => { xp.x += offsetX; xp.y += offsetY; });
            lasers.forEach(l => { if (l && typeof l.x === 'number') { l.x += offsetX; l.y += offsetY; } });
            enemyLasers.forEach(l => { l.x += offsetX; l.y += offsetY; });
            xpParticles.forEach(p => { p.x += offsetX; p.y += offsetY; });
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
    if (keys.left) ship.angle -= 0.07;
    if (keys.right) ship.angle += 0.07;

    // Beschleunigung
    let ax = 0, ay = 0;
    if (keys.up) {
        ax += Math.cos(ship.angle) * ship.acceleration;
        ay += Math.sin(ship.angle) * ship.acceleration;
    }
    if (keys.down) {
        ax -= Math.cos(ship.angle) * ship.acceleration * 0.7;
        ay -= Math.sin(ship.angle) * ship.acceleration * 0.7;
    }
    ship.vx += ax;
    ship.vy += ay;
    // Max Speed
    const speed = Math.sqrt(ship.vx*ship.vx + ship.vy*ship.vy);
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
        // Alle Weltobjekte verschieben
        starLayers.forEach(layer => {
            layer.stars.forEach(star => {
                star.x += offsetX;
                star.y += offsetY;
            });
        });
        enemies.forEach(e => { e.x += offsetX; e.y += offsetY; });
        xpPoints.forEach(xp => { xp.x += offsetX; xp.y += offsetY; });
        lasers.forEach(l => { if (l && typeof l.x === 'number') { l.x += offsetX; l.y += offsetY; } });
        enemyLasers.forEach(l => { l.x += offsetX; l.y += offsetY; });
        xpParticles.forEach(p => { p.x += offsetX; p.y += offsetY; });
    }
    ship.x = nextX;
    ship.y = nextY;
}

let upgrades = {
    magnet: 0, // Magnet-Level
    laser: 0,  // Laser-Level
    speed: 0   // Speed-Level
};
let magnetRadius = 0;
let magnetStrength = 0;

// upgrades global machen, damit ship.js darauf zugreifen kann
window.upgrades = upgrades;

function applyUpgrade(key) {
    if (key === 'magnet') {
        upgrades.magnet++;
        magnetRadius = 30 + upgrades.magnet * 10;
        magnetStrength = 0.03 + upgrades.magnet * 0.01;
    }
    if (key === 'laser') {
        upgrades.laser++;
    }
    if (key === 'speed') {
        upgrades.speed++;
        ship.maxSpeed += 1.2;
    }
}

// --- STERNENHINTERGRUND (PARALLAX) ---
const starLayers = [
    { count: 60, speed: 0.15, size: 1.2, color: 'rgba(255,255,255,0.7)', stars: [] },
    { count: 40, speed: 0.08, size: 1.7, color: 'rgba(180,220,255,0.5)', stars: [] },
    { count: 20, speed: 0.04, size: 2.2, color: 'rgba(255,255,200,0.3)', stars: [] }
];

function initStars() {
    starLayers.forEach(layer => {
        layer.stars = [];
        for (let i = 0; i < layer.count; i++) {
            layer.stars.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height
            });
        }
    });
}
initStars();

let lastShipX = ship.x;
let lastShipY = ship.y;

function drawStars() {
    starLayers.forEach(layer => {
        ctx.save();
        ctx.fillStyle = layer.color;
        layer.stars.forEach(star => {
            ctx.beginPath();
            ctx.arc(star.x, star.y, layer.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();
    });
}

function updateStars() {
    const dx = ship.x - lastShipX;
    const dy = ship.y - lastShipY;
    starLayers.forEach(layer => {
        layer.stars.forEach(star => {
            star.x -= dx * layer.speed;
            star.y -= dy * layer.speed;
            // Wrap around
            if (star.x < 0) star.x += canvas.width;
            if (star.x > canvas.width) star.x -= canvas.width;
            if (star.y < 0) star.y += canvas.height;
            if (star.y > canvas.height) star.y -= canvas.height;
        });
    });
    lastShipX = ship.x;
    lastShipY = ship.y;
}

// --- SCREEN SHAKE ---
let shakeTime = 0;
let shakeIntensity = 0;
function triggerScreenShake(intensity = 8, duration = 18) {
    shakeTime = duration;
    shakeIntensity = intensity;
}

// --- PAUSE BUTTON & ESC HANDLING ---
displayPauseButton(() => pauseGame());
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (!isPaused) pauseGame();
        else resumeGame();
    }
});

function pauseGame() {
    if (isPaused || isGameOver || isShopOpen) return;
    isPaused = true;
    removePauseButton();
    displayPauseMenu({
        level,
        experience,
        maxXP,
        kills,
        xpCollected
    }, resumeGame, restartGame);
}

function resumeGame() {
    if (!isPaused) return;
    isPaused = false;
    removePauseMenu();
    displayPauseButton(() => pauseGame());
    requestAnimationFrame(gameLoop);
}

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
function gameLoop() {
    if (isGameOver) { // If game over, stop the loop.
        return;
    }
    if (isPaused) {
        return;
    }
    if (isShopOpen) { // If shop is open, effectively pause game logic and rendering
        requestAnimationFrame(gameLoop); // but keep the animation loop ticking to resume smoothly
        return;
    }

    // --- Screen Shake Offset anwenden ---
    if (shakeTime > 0) {
        const dx = (Math.random() - 0.5) * shakeIntensity;
        const dy = (Math.random() - 0.5) * shakeIntensity;
        ctx.save();
        ctx.translate(dx, dy);
        shakeTime--;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // --- Hintergrundsterne ---
    updateStars();
    drawStars();
    // --- XP-Partikel ---
    updateAndDrawXpParticles(ctx);
    if (!ship.isExploding) {
        updateShipMovement();
    }
    ship.update();
    ship.draw(ctx);
    // Magnet-Sphäre zeichnen
    if (upgrades.magnet > 0 && !ship.isExploding) {
        ctx.save();
        ctx.globalAlpha = 0.18 + 0.07 * upgrades.magnet;
        ctx.beginPath();
        ctx.arc(ship.x, ship.y, magnetRadius, 0, Math.PI*2);
        ctx.fillStyle = 'deepskyblue';
        ctx.fill();
        ctx.restore();
    }
    // Dauerfeuer, wenn Space gehalten wird
    if (keys.shooting && !ship.isExploding && (!gameLoop.lastShot || performance.now() - gameLoop.lastShot > 180)) {
        const shots = ship.shoot();
        if (Array.isArray(shots)) {
            shots.forEach(l => lasers.push(l));
        } else {
            lasers.push(shots);
        }
        gameLoop.lastShot = performance.now();
    }
    lasers.forEach((laser, lIdx) => {
        if (Array.isArray(laser)) {
            // Falls versehentlich ein Array im lasers-Array gelandet ist (Bugfix)
            laser.forEach(l => {
                ctx.save();
                ctx.shadowBlur = 16;
                ctx.shadowColor = l.upgradeLevel >= 3 ? 'cyan' : 'red';
                l.update();
                l.draw(ctx);
                ctx.restore();
            });
            lasers.splice(lIdx, 1);            return;
        }
        ctx.save();
        ctx.shadowBlur = 16;
        ctx.shadowColor = laser.upgradeLevel >= 3 ? 'cyan' : 'red';
        laser.update();
        laser.draw(ctx);
        ctx.restore();
        if (!laser.isActive) {
            lasers.splice(lIdx, 1);
        }
    });

    enemies.forEach((enemy, eIdx) => {
        enemy.update(ship.x, ship.y);
        enemy.draw(ctx);
        if (!ship.isExploding && enemy.checkCollision(ship)) {
            ship.explode();
            triggerScreenShake(12, 24);
            setTimeout(() => endGame(), 1000); // 1 Sekunde Explosion zeigen
        }
        // Laser collision
        lasers.forEach((laser, lIdx) => {
            if (enemy.checkLaserHit(laser)) {
                enemy.destroy();
                lasers.splice(lIdx, 1);
                xpPoints.push(new XP(enemy.x, enemy.y));
                kills++; // Gegner besiegt erhöhen
            }
        });
        if (!enemy.alive) {
            enemies.splice(eIdx, 1);
        }
    });

    xpPoints.forEach((xp, xIdx) => {
        // Magnetwirkung
        if (upgrades.magnet > 0 && !xp.collected) {
            const dx = ship.x - xp.x;
            const dy = ship.y - xp.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < magnetRadius) {
                xp.x += dx * magnetStrength;
                xp.y += dy * magnetStrength;
            }
        }
        ctx.save();
        ctx.shadowBlur = 18;
        ctx.shadowColor = 'deepskyblue';
        xp.draw(ctx);
        ctx.restore();
        // XP-Einsammelradius
        const dx = ship.x - xp.x;
        const dy = ship.y - xp.y;
        if (Math.sqrt(dx*dx + dy*dy) < ship.getXpRadius() + xp.radius && !xp.collected) {
            spawnXpParticles(xp.x, xp.y, 'deepskyblue');
            xp.collect();
            experience++;
            xpCollected++; // Gesammelte XP erhöhen
            xpPoints.splice(xIdx, 1);
            if (experience >= maxXP) {
                levelUp();
            }
        }
    });

    // Enemy-Laser zeichnen
    enemyLasers.forEach((l, idx) => {
        l.x += Math.cos(l.angle) * l.speed;
        l.y += Math.sin(l.angle) * l.speed;
        l.life--;
        ctx.save();
        ctx.translate(l.x, l.y);
        ctx.rotate(l.angle);
        ctx.fillStyle = 'magenta'; // Oder ein bedrohliches Rot/Violett
        const laserWidth = 10;
        const laserHeight = 4;
        ctx.fillRect(0, -laserHeight / 2, laserWidth, laserHeight);
        // Optional: Kleiner Leuchteffekt
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = 'pink';
        ctx.fillRect(0, -laserHeight / 1.5, laserWidth, laserHeight * 1.5);
        ctx.restore();

        if (l.life <= 0 || l.x < 0 || l.x > canvas.width || l.y < 0 || l.y > canvas.height) {
            enemyLasers.splice(idx, 1);
        } else if (!ship.isExploding) {
            // Kollision mit dem Schiff
            const dx = l.x - ship.x;
            const dy = l.y - ship.y;
            if (Math.sqrt(dx * dx + dy * dy) < ship.getCollisionRadius() + laserWidth / 2) { // Einfache Kreis-Kollision
                ship.explode();
                triggerScreenShake(8, 15); // Shake bei Treffer durch Gegnerlaser
                setTimeout(() => endGame(), 1000);
                enemyLasers.splice(idx, 1); // Laser entfernen
            }
        }
    });

    updateExperienceBar(experience, maxXP);
    displayLevel(level);
    requestAnimationFrame(gameLoop);
}

function endGame() {
    if (isGameOver) return;
    isGameOver = true;
    clearInterval(enemySpawnIntervalId);
    // alert('Game Over! You were hit by an enemy.'); // Ersetzt
    // document.location.reload(); // Verlagerung zum Neustart-Button
    displayGameOverScreen(level);
}

function levelUp() {
    level++;
    experience = 0;
    maxXP += 5;
    isShopOpen = true; // Signal that the shop is open, pausing game logic in gameLoop
    displayShopModal((upgradeKey) => {
        applyUpgrade(upgradeKey);
        isShopOpen = false; // Signal that the shop is closed, gameLoop will resume logic on its next tick.
        // The gameLoop's own requestAnimationFrame call will handle continuing the loop.
    });
}

// enemySpawnIntervalId wird nur einmal gesetzt, nicht bei Level-Up
// ship.acceleration, ship.friction, enemySpawnIntervalId, enemy speed werden NICHT verändert
// Nur ship.maxSpeed wird durch Speed-Upgrade erhöht

window.spawnEnemyLaser = function(x, y, angle) {
    enemyLasers.push({
        x,
        y,
        angle,
        speed: 5,
        life: 80
    });
};

function spawnEnemy() {
    // Spawn at random edge
    let x, y;
    const edge = Math.floor(Math.random()*4);
    if (edge === 0) { x = 0; y = Math.random()*canvas.height; }
    if (edge === 1) { x = canvas.width; y = Math.random()*canvas.height; }
    if (edge === 2) { x = Math.random()*canvas.width; y = 0; }
    if (edge === 3) { x = Math.random()*canvas.width; y = canvas.height; }
    enemies.push(new Enemy(x, y, level));
}

enemySpawnIntervalId = setInterval(spawnEnemy, 2000);

// --- XP-PARTIKEL-EFFEKT ---
let xpParticles = [];
function spawnXpParticles(x, y, color = 'deepskyblue') {
    for (let i = 0; i < 12; i++) {
        xpParticles.push({
            x,
            y,
            angle: Math.random() * Math.PI * 2,
            speed: 1.2 + Math.random() * 1.8,
            life: 18 + Math.random() * 10,
            maxLife: 18 + Math.random() * 10,
            color,
            size: 1.5 + Math.random() * 1.5
        });
    }
}

function updateAndDrawXpParticles(ctx) {
    for (let i = xpParticles.length - 1; i >= 0; i--) {
        const p = xpParticles[i];
        p.x += Math.cos(p.angle) * p.speed;
        p.y += Math.sin(p.angle) * p.speed;
        p.speed *= 0.93;
        p.life--;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        if (p.life <= 0) xpParticles.splice(i, 1);
    }
}

// --- Touch-Steuerung für Mobile ---
function createTouchControls() {
    // Container für Buttons
    const touchContainer = document.createElement('div');
    touchContainer.id = 'touch-controls';
    touchContainer.style.position = 'fixed';
    touchContainer.style.left = '0';
    touchContainer.style.bottom = '0';
    touchContainer.style.width = '100vw';
    touchContainer.style.height = '40vh';
    touchContainer.style.zIndex = '5000';
    touchContainer.style.pointerEvents = 'none';

    // --- Virtueller Joystick (links unten) ---
    const joystickSize = 180;
    const joystickBase = document.createElement('div');
    joystickBase.style.position = 'absolute';
    joystickBase.style.left = '36px';
    joystickBase.style.bottom = '36px';
    joystickBase.style.width = joystickSize + 'px';
    joystickBase.style.height = joystickSize + 'px';
    joystickBase.style.background = 'rgba(60,60,60,0.18)';
    joystickBase.style.borderRadius = '50%';
    joystickBase.style.pointerEvents = 'auto';
    joystickBase.style.touchAction = 'none';
    joystickBase.style.border = '2px solid #444';
    joystickBase.style.boxSizing = 'border-box';

    const joystickStick = document.createElement('div');
    joystickStick.style.position = 'absolute';
    joystickStick.style.left = (joystickSize/2 - 38) + 'px';
    joystickStick.style.top = (joystickSize/2 - 38) + 'px';
    joystickStick.style.width = '76px';
    joystickStick.style.height = '76px';
    joystickStick.style.background = 'rgba(200,200,200,0.85)';
    joystickStick.style.borderRadius = '50%';
    joystickStick.style.border = '2px solid #888';
    joystickStick.style.boxSizing = 'border-box';
    joystickStick.style.transition = 'left 0.08s, top 0.08s';
    joystickBase.appendChild(joystickStick);
    touchContainer.appendChild(joystickBase);

    let joystickTouchId = null;
    let baseRect = null;
    let stickCenter = { x: joystickSize/2, y: joystickSize/2 };
    let lastDir = { up: false, down: false, left: false, right: false };

    function setKeysFromVector(dx, dy) {
        // Deadzone
        const deadzone = 18;
        let up = false, down = false, left = false, right = false;
        // Für mobile absolute Steuerung:
        if (Math.abs(dx) > deadzone || Math.abs(dy) > deadzone) {
            joystickMove = { x: dx, y: dy };
        } else {
            joystickMove = { x: 0, y: 0 };
        }
        // keys.* werden für Tastatur weiterhin gesetzt, aber auf Mobile zählt nur joystickMove
        keys.up = up;
        keys.down = down;
        keys.left = left;
        keys.right = right;
        lastDir = { up, down, left, right };
    }
    function resetJoystick() {
        joystickStick.style.left = (joystickSize/2 - 38) + 'px';
        joystickStick.style.top = (joystickSize/2 - 38) + 'px';
        joystickMove = { x: 0, y: 0 };
        setKeysFromVector(0, 0);
    }

    joystickBase.addEventListener('touchstart', function(e) {
        if (joystickTouchId !== null) return;
        const touch = e.changedTouches[0];
        joystickTouchId = touch.identifier;
        baseRect = joystickBase.getBoundingClientRect();
        const x = touch.clientX - baseRect.left;
        const y = touch.clientY - baseRect.top;
        moveStick(x, y);
        e.preventDefault();
    }, { passive: false });
    joystickBase.addEventListener('touchmove', function(e) {
        if (joystickTouchId === null) return;
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            if (touch.identifier === joystickTouchId) {
                const x = touch.clientX - baseRect.left;
                const y = touch.clientY - baseRect.top;
                moveStick(x, y);
                e.preventDefault();
                break;
            }
        }
    }, { passive: false });
    joystickBase.addEventListener('touchend', function(e) {
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            if (touch.identifier === joystickTouchId) {
                joystickTouchId = null;
                resetJoystick();
                e.preventDefault();
                break;
            }
        }
    }, { passive: false });
    joystickBase.addEventListener('touchcancel', function(e) {
        joystickTouchId = null;
        resetJoystick();
    });

    function moveStick(x, y) {
        // Begrenze Stick auf Kreisradius
        const dx = x - joystickSize/2;
        const dy = y - joystickSize/2;
        const maxDist = joystickSize/2 - 38;
        let dist = Math.sqrt(dx*dx + dy*dy);
        let nx = dx, ny = dy;
        if (dist > maxDist) {
            nx = dx * maxDist / dist;
            ny = dy * maxDist / dist;
            dist = maxDist;
        }
        joystickStick.style.left = (joystickSize/2 - 38 + nx) + 'px';
        joystickStick.style.top = (joystickSize/2 - 38 + ny) + 'px';
        setKeysFromVector(nx, ny);
    }

    // --- Schuss-Button (rechts) ---
    const shootBtn = document.createElement('button');
    shootBtn.innerText = '⦿';
    shootBtn.style.position = 'absolute';
    shootBtn.style.right = '64px';
    shootBtn.style.bottom = '96px';
    shootBtn.style.width = '140px';
    shootBtn.style.height = '140px';
    shootBtn.style.fontSize = '76px';
    shootBtn.style.borderRadius = '50%';
    shootBtn.style.border = 'none';
    shootBtn.style.background = '#e74c3c';
    shootBtn.style.color = 'white';
    shootBtn.style.pointerEvents = 'auto';
    shootBtn.ontouchstart = (e) => { e.preventDefault(); keys.shooting = true; };
    shootBtn.ontouchend = (e) => { e.preventDefault(); keys.shooting = false; };
    touchContainer.appendChild(shootBtn);

    document.body.appendChild(touchContainer);
}

// Canvas-Größe für Mobile vergrößern
function resizeCanvasForMobile() {
    // Immer 2x so groß wie der Viewport, unabhängig von der Größe
    canvas.width = window.innerWidth * 2;
    canvas.height = window.innerHeight * 2;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
}

if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
    window.addEventListener('DOMContentLoaded', () => {
        resizeCanvasForMobile();
        createTouchControls();
        // Skaliere das gesamte Canvas für größere Darstellung
        ctx.setTransform(2, 0, 0, 2, 0, 0);
        gameLoop();
    });
} else {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gameLoop();
}