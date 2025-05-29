import { Ship } from './ship.js';
import Enemy from './enemy.js';
import Laser from './laser.js';
import XP from './xp.js';
import { updateExperienceBar, displayLevel, initializeUI, displayGameOverScreen, displayShopModal } from './ui.js';

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
let enemySpawnIntervalId;

const BASE_LASER_DAMAGE = 1; // Basis-Schaden für Laser auf Level 0
window.BASE_LASER_DAMAGE = BASE_LASER_DAMAGE; // Global verfügbar machen

// --- SMOOTH SHIP MOVEMENT MIT BESCHLEUNIGUNG & DRIFT ---
const keys = { up: false, down: false, left: false, right: false, shooting: false };

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

// Passe main.js an, damit ship.shoot() ein Array zurückgibt (für Doppellaser)
function gameLoop() {
    if (isGameOver) { // If game over, stop the loop.
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
gameLoop();