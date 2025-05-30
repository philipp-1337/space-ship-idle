// Haupt-Game-Loop und zugehörige Logik ausgelagert aus main.js

export function createGameLoop(context) {
    const {
        ship, enemies, enemyLasers, lasers, xpPoints, plasmaCells,
        effectsSystem, inputManager, upgrades, magnetRadius, GAME_CONFIG, EFFECTS,
        ctx, canvas, XP, PlasmaCell, handleXpCollection, handlePlasmaCollection,
        displayLevel, updateExperienceBar, displayGameOverScreen, displayShopModal,
        applyUpgrade, showTechTreeButton, showTechTreeModal, techUpgrades,
        isPausedRef, isGameOverRef, isShopOpenRef, killsRef, xpCollectedRef, levelRef, experienceRef, maxXPRef,
        startEnemySpawning, autoShootTimerRef
    } = context;

    function endGame() {
        if (isGameOverRef.value) return;
        isGameOverRef.value = true;
        clearInterval(context.enemySpawnIntervalId);
        displayGameOverScreen(levelRef.value);
    }

    function levelUp() {
        levelRef.value++;
        experienceRef.value = 0;
        maxXPRef.value += 5;
        isShopOpenRef.value = true;
        displayShopModal((upgradeKey) => {
            applyUpgrade(upgradeKey);
            isShopOpenRef.value = false;
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
        if (techUpgrades.autoAim && !ship.isExploding && !isPausedRef.value && !isGameOverRef.value && !isShopOpenRef.value && enemies.length > 0) {
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
        effectsSystem.drawMagnetField(ship.x, ship.y, magnetRadius, upgrades.magnet);
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
        handleXpCollection(ship, xpPoints, effectsSystem, ctx, { experience: experienceRef.value, xpCollected: xpCollectedRef.value, maxXP: maxXPRef.value }, () => levelUp());
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
        if (shakeActive) {
            effectsSystem.restoreScreenShake();
        }
        updateExperienceBar(experienceRef.value, maxXPRef.value);
        displayLevel(levelRef.value);
        autoAimLogic();
        autoShootLogic();
        requestAnimationFrame(gameLoop);
    }
    return gameLoop;
}
