// Haupt-Game-Loop und zugehörige Logik ausgelagert aus main.js
import { PROGRESSION } from './constants.js';
import { magnetRadius } from './upgrades.js';
import HomingMissile from './homingMissile.js';

export function createGameLoop(context) {
    const {
        ship, enemies, enemyLasers, lasers, xpPoints, plasmaCells,
        effectsSystem, inputManager, upgrades, GAME_CONFIG, EFFECTS, PHYSICS, // magnetRadius hier entfernt
        ctx, canvas, XP, PlasmaCell, handleXpCollection, handlePlasmaCollection,
        displayLevel, updateExperienceBar, displayGameOverScreen, displayShopModal, showWaveHint, // displayAutoAimButton entfernt
        applyUpgrade, showTechTreeButton, showTechTreeModal, techUpgrades,
        isPausedRef, isGameOverRef, isShopOpenRef, killsRef, xpCollectedRef, levelRef, experienceRef, maxXPRef,
        startEnemySpawning, autoShootTimerRef
    } = context;

    let homingMissiles = [];
    let lastMissileTime = 0;
    const { spawnEnemyWave } = context; // spawnEnemyWave aus dem Kontext holen

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
        displayLevel(levelRef.value, true); // Level-Anzeige mit Pop-Effekt
        isShopOpenRef.value = true;
        displayShopModal((upgradeKey) => {
            applyUpgrade(upgradeKey, ship, PHYSICS);
            isShopOpenRef.value = false;

            // Prüfen, ob eine Gegnerwelle ausgelöst werden soll, NACHDEM der Shop geschlossen wurde
            if (levelRef.value > 1 && levelRef.value % GAME_CONFIG.ENEMY_WAVE_INTERVAL === 0) {
                spawnEnemyWave(canvas, levelRef.value);
                if (typeof showWaveHint === 'function') {
                    showWaveHint();
                }
            }
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

    function autoHomingMissileLogic() {
        if (techUpgrades.homingMissile && !ship.isExploding && !isPausedRef.value && !isGameOverRef.value && !isShopOpenRef.value && enemies.length > 0) {
            const now = performance.now();
            if (!lastMissileTime || now - lastMissileTime > 2500) { // Erhöhter Cooldown für weniger Raketen
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
                    l.update(canvas.width, canvas.height);
                    effectsSystem.drawLaserWithGlow(l, l.upgradeLevel);
                });
                lasers.splice(lIdx, 1);
                return;
            }
            laser.update(canvas.width, canvas.height);
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
                    // enemy.destroy() wird jetzt korrekt innerhalb von enemy.checkLaserHit() aufgerufen,
                    // wenn die Lebenspunkte des Gegners tatsächlich <= 0 sind.
                    // Laser wird verbraucht
                    lasers.splice(lIdx, 1); 

                    // Nur XP und Kill geben, wenn HP <= 0 und XP noch nicht vergeben wurde
                    if (enemy.hp <= 0 && !enemy.alreadyAwardedXP) {
                        xpPoints.push(new XP(enemy.x, enemy.y));
                        if (Math.random() < GAME_CONFIG.PLASMA_DROP_CHANCE) {
                            let px = enemy.x;
                            let py = enemy.y;
                            const centerX = canvas.width / 2;
                            const centerY = canvas.height / 2;
                            const dxPlasma = centerX - enemy.x;
                            const dyPlasma = centerY - enemy.y;
                            const distPlasma = Math.sqrt(dxPlasma * dxPlasma + dyPlasma * dyPlasma);
                            if (distPlasma > 0) {
                                px += dxPlasma / distPlasma * 40;
                                py += dyPlasma / distPlasma * 40;
                            }
                            px = Math.max(24, Math.min(canvas.width - 24, px));
                            py = Math.max(24, Math.min(canvas.height - 24, py));
                            plasmaCells.push(new PlasmaCell(px, py));
                        }
                        killsRef.value++;
                        enemy.alreadyAwardedXP = true; // XP für diesen Gegner wurde vergeben
                    }
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

            m.update(enemies); // Update kümmert sich auch um die Explosionsanimation

            if (m.shouldBeRemoved()) {
                homingMissiles.splice(i, 1);
            } else {
                m.draw(ctx); // Zeichnet entweder die Rakete oder ihre Explosion

                // Detonationslogik, nur wenn noch nicht explodiert (logisch)
                if (!m.exploded) {
                    let detonateThisFrame = false;
                    if (m.target && m.target.alive) {
                        const dx = m.x - m.target.x;
                        const dy = m.y - m.target.y;
                        if (Math.sqrt(dx*dx + dy*dy) < m.radius + m.target.size/2) {
                            detonateThisFrame = true;
                        }
                    }
                    if (m.life <= 0) { // Eigene Lebenszeit abgelaufen
                        detonateThisFrame = true;
                    }

                    if (detonateThisFrame) {
                        m.detonate(enemies, effectsSystem, {
                            xpPoints,
                            XP,
                            killsRef,
                            GAME_CONFIG,
                            plasmaCells,
                            PlasmaCell,
                            canvas // für Plasmakoordinaten
                        });
                    }
                }
            }
        }
        if (shakeActive) {
            effectsSystem.restoreScreenShake();
        }
        updateExperienceBar(experienceRef.value, maxXPRef.value);
        displayLevel(levelRef.value);
        autoShootLogic();
        autoHomingMissileLogic();
        requestAnimationFrame(gameLoop);
    }
    return gameLoop;
}
