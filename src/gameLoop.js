// Haupt-Game-Loop und zugehörige Logik ausgelagert aus main.js
import { PROGRESSION } from './constants.js';
import { magnetRadius } from './upgrades.js';
import HomingMissile from './homingMissile.js';

export function createGameLoop(context) {
    const {
        ship, enemies, enemyLasers, lasers, xpPoints, plasmaCells,
        effectsSystem, inputManager, upgrades, GAME_CONFIG, EFFECTS, PHYSICS, // magnetRadius hier entfernt
        ctx, canvas, XP, PlasmaCell, handleXpCollection, handlePlasmaCollection,
        displayLevel, updateExperienceBar, displayGameOverScreen, displayShopModal,
        applyUpgrade, showTechTreeButton, showTechTreeModal, techUpgrades,
        isPausedRef, isGameOverRef, isShopOpenRef, killsRef, xpCollectedRef, levelRef, experienceRef, maxXPRef,
        startEnemySpawning, autoShootTimerRef
    } = context;

    let homingMissiles = [];
    let lastMissileTime = 0;

    function endGame() {
        if (isGameOverRef.value) return;
        isGameOverRef.value = true;
        clearInterval(context.enemySpawnIntervalId);
        displayGameOverScreen(levelRef.value);
    }

    function levelUp() {
        levelRef.value++;
        experienceRef.value = 0;
        maxXPRef.value += PROGRESSION.XP_INCREASE_PER_LEVEL;
        isShopOpenRef.value = true;
        displayShopModal((upgradeKey) => {
            applyUpgrade(upgradeKey, ship, PHYSICS);
            isShopOpenRef.value = false;
            // Fix: Reset shooting flag when shop closes
            if (inputManager && inputManager.keys) {
                inputManager.keys.shooting = false;
            }
            // GameLoop nach Shop schließen fortsetzen
            requestAnimationFrame(gameLoop);
        });
    }

    function autoShootLogic() {
        if (techUpgrades.autoShoot && !ship.isExploding && !isPausedRef.value && !isGameOverRef.value && !isShopOpenRef.value) {
            if (!autoShootTimerRef.value || performance.now() - autoShootTimerRef.value > GAME_CONFIG.AUTO_SHOOT_COOLDOWN) {
                const shots = ship.shoot();
                if (Array.isArray(shots)) {
                    shots.forEach(l => lasers.push(l));
                } else {
                    lasers.push(shots);
                }
                autoShootTimerRef.value = performance.now();
            }
        }
    }

    function autoAimLogic() {
        if (techUpgrades.autoAim && !ship.isExploding && !isPausedRef.value && !isGameOverRef.value && !isShopOpenRef.value && enemies.length > 0 && !inputManager.isMoving()) {
            let closest = null;
            let minDist = Infinity;
            enemies.forEach(e => {
                if (e.alive) {
                    const dx = e.x - ship.x;
                    const dy = e.y - ship.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < minDist) {
                        minDist = dist;
                        closest = e;
                    }
                }
            });
            if (closest) {
                const targetAngle = Math.atan2(closest.y - ship.y, closest.x - ship.x);
                let da = targetAngle - ship.angle;
                while (da > Math.PI) da -= 2 * Math.PI;
                while (da < -Math.PI) da += 2 * Math.PI;
                ship.angle += da * 0.18;
            }
        }
    }

    function autoHomingMissileLogic() {
        if (techUpgrades.homingMissile && !ship.isExploding && !isPausedRef.value && !isGameOverRef.value && !isShopOpenRef.value && enemies.length > 0) {
            const now = performance.now();
            if (!lastMissileTime || now - lastMissileTime > 1200) { // Viel langsamer als Laser
                // Ziel suchen
                let closest = null, minDist = Infinity;
                for (const e of enemies) {
                    if (e.alive) {
                        const dx = e.x - ship.x;
                        const dy = e.y - ship.y;
                        const dist = Math.sqrt(dx*dx + dy*dy);
                        if (dist < minDist) {
                            minDist = dist;
                            closest = e;
                        }
                    }
                }
                if (closest) {
                    homingMissiles.push(new HomingMissile(
                        ship.x + Math.cos(ship.angle)*28,
                        ship.y + Math.sin(ship.angle)*28,
                        closest,
                        { speed: 2.2, explosionRadius: 60, damage: 6 }
                    ));
                    lastMissileTime = now;
                }
            }
        }
    }

    function gameLoop() {
        if (isGameOverRef.value || isPausedRef.value) return;
        if (isShopOpenRef.value) {
            requestAnimationFrame(gameLoop);
            return;
        }
        const shakeActive = effectsSystem.applyScreenShake();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        effectsSystem.updateStars(ship.x, ship.y);
        effectsSystem.drawStars();
        effectsSystem.updateAndDrawXpParticles();
        if (!ship.isExploding) {
            context.updateShipMovement();
        }
        ship.update();
        ship.draw(ctx);
        effectsSystem.drawMagnetField(ship.x, ship.y, magnetRadius, upgrades.magnet); // Korrigiert: magnetRadius direkt verwenden
        if (inputManager.isShooting() && !ship.isExploding && (!gameLoop.lastShot || performance.now() - gameLoop.lastShot > GAME_CONFIG.LASER_SHOOT_COOLDOWN)) {
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
                laser.forEach(l => {
                    l.update();
                    effectsSystem.drawLaserWithGlow(l, l.upgradeLevel);
                });
                lasers.splice(lIdx, 1);
                return;
            }
            laser.update();
            effectsSystem.drawLaserWithGlow(laser, laser.upgradeLevel);
            if (!laser.isActive) {
                lasers.splice(lIdx, 1);
            }
        });
        enemies.forEach((enemy, eIdx) => {
            enemy.update(ship.x, ship.y);
            enemy.draw(ctx);
            if (!ship.isExploding && enemy.checkCollision(ship)) {
                ship.explode();
                effectsSystem.triggerScreenShake(EFFECTS.SCREEN_SHAKE_HIT_INTENSITY, EFFECTS.SCREEN_SHAKE_HIT_DURATION);
                setTimeout(() => endGame(), 1000);
            }
            lasers.forEach((laser, lIdx) => {
                if (enemy.checkLaserHit(laser)) {
                    enemy.destroy();
                    lasers.splice(lIdx, 1);
                    xpPoints.push(new XP(enemy.x, enemy.y));
                    if (Math.random() < GAME_CONFIG.PLASMA_DROP_CHANCE) {
                        let px = enemy.x;
                        let py = enemy.y;
                        const centerX = canvas.width / 2;
                        const centerY = canvas.height / 2;
                        const dx = centerX - enemy.x;
                        const dy = centerY - enemy.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist > 0) {
                            px += dx / dist * 40;
                            py += dy / dist * 40;
                        }
                        px = Math.max(24, Math.min(canvas.width - 24, px));
                        py = Math.max(24, Math.min(canvas.height - 24, py));
                        plasmaCells.push(new PlasmaCell(px, py));
                    }
                    killsRef.value++;
                }
            });
            if (!enemy.alive) {
                enemies.splice(eIdx, 1);
            }
        });
        // XP und Plasma nach den Gegnern zeichnen, damit sie darüber liegen
        handleXpCollection(
            ship, xpPoints, effectsSystem, ctx,
            { experienceRef, xpCollectedRef, maxXPRef },
            () => {
                levelUp();
                if (typeof window !== 'undefined' && window.syncRefsToVars) window.syncRefsToVars();
            }
        );
        if (typeof window !== 'undefined' && window.syncRefsToVars) window.syncRefsToVars();
        handlePlasmaCollection(ship, plasmaCells, effectsSystem, ctx);
        enemyLasers.forEach((l, idx) => {
            l.x += Math.cos(l.angle) * l.speed;
            l.y += Math.sin(l.angle) * l.speed;
            l.life--;
            effectsSystem.drawEnemyLaser({
                x: l.x,
                y: l.y,
                angle: l.angle,
                width: 10,
                height: 4,
                color: 'magenta',
                glowColor: 'pink'
            });
            if (l.life <= 0 || l.x < 0 || l.x > canvas.width || l.y < 0 || l.y > canvas.height) {
                enemyLasers.splice(idx, 1);
            } else if (!ship.isExploding) {
                const dx = l.x - ship.x;
                const dy = l.y - ship.y;
                if (Math.sqrt(dx * dx + dy * dy) < ship.getCollisionRadius() + 5) {
                    ship.explode();
                    effectsSystem.triggerScreenShake(EFFECTS.SCREEN_SHAKE_LASER_INTENSITY, EFFECTS.SCREEN_SHAKE_LASER_DURATION);
                    setTimeout(() => endGame(), 1000);
                    enemyLasers.splice(idx, 1);
                }
            }
        });
        // Update & Draw Homing Missiles
        for (let i = homingMissiles.length-1; i >= 0; i--) {
            const m = homingMissiles[i];
            if (!m.exploded) {
                m.update(enemies);
                m.draw(ctx);
                // Explodiere bei Kontakt mit Ziel oder nach Ablauf
                if (m.target && m.target.alive) {
                    const dx = m.x - m.target.x;
                    const dy = m.y - m.target.y;
                    if (Math.sqrt(dx*dx + dy*dy) < m.radius + m.target.size/2) {
                        m.explode(ctx, enemies);
                    }
                }
                if (m.life <= 0) {
                    m.explode(ctx, enemies);
                }
            } else {
                // Nach Explosion entfernen
                homingMissiles.splice(i, 1);
            }
        }
        if (shakeActive) {
            effectsSystem.restoreScreenShake();
        }
        updateExperienceBar(experienceRef.value, maxXPRef.value);
        displayLevel(levelRef.value);
        autoAimLogic();
        autoShootLogic();
        autoHomingMissileLogic();
        requestAnimationFrame(gameLoop);
    }
    return gameLoop;
}
