// Haupt-Game-Loop und zugehörige Logik ausgelagert aus main.js
import { PROGRESSION, EXPLOSIVE_ROUNDS, SALVAGE_DRIVE, CHAIN_LIGHTNING } from './constants.js';
import { magnetRadius, activateOverdrive, getFireRateMultiplier, getOverdriveDurationMs } from './upgrades.js';
import HomingMissile from './homingMissile.js';
import Drone from './drone.js';
import SpatialGrid from './spatialGrid.js';
import { clearRunState, suppressAutosave } from './runState.js';
import { AudioManager } from './audio/AudioManager.js';
import { spawnBossRewardWave, spawnSplitEnemies } from './enemyManager.js';
import Laser from './laser.js';

// Zellgröße etwas über dem größten Gegner-Hitradius (Elite-Größe 44 * 0.7 ≈ 31),
// damit eine Umkreis-Abfrage typischerweise nur eine Handvoll Zellen berührt.
const ENEMY_GRID_CELL_SIZE = 60;
// Deckt den größten Laser-Trefferradius ab (this.size * 0.7, Elite-Größe 44 -> ~31).
const LASER_HIT_QUERY_RADIUS = 35;

export function createGameLoop(context) {
    const {
        ship, enemies, enemyLasers, lasers, xpPoints, plasmaCells, tractorItems,
        effectsSystem, inputManager, upgrades, GAME_CONFIG, EFFECTS, PHYSICS, MOBILE,
        ctx, canvas, XP, PlasmaCell, TractorItem, handleXpCollection, handlePlasmaCollection, handleTractorCollection, spawnEnemyWave, spawnBoss,
        displayLevel, updateExperienceBar, displayGameOverScreen, displayShopModal, showWaveHint, showOverdriveHint, showBossHint,
        applyUpgrade, showTechTreeButton, showTechTreeModal, techUpgrades,
        isPausedRef, isGameOverRef, isShopOpenRef, killsRef, xpCollectedRef, levelRef, experienceRef, maxXPRef,
        startEnemySpawning, autoShootTimerRef, easyModeRef
    } = context;

    let homingMissiles = [];
    let lastMissileTime = 0;
    let drones = []; // lazy erzeugt/erweitert, sobald techUpgrades.drone/twinDrones freigeschaltet werden
    let chainFlashes = []; // kurzlebige Blitz-Linien fürs Chain-Lightning-Upgrade
    let explosiveVisuals = []; // kurzlebige Explosions-Kreise für Explosive Rounds
    let sweepRay = { active: false, angle: 0, startAngle: 0, timer: 0, duration: 1500 };
    // Wiederverwendetes Grid statt Neuallokation pro Frame — nur clear() pro Durchlauf.
    const enemyGrid = new SpatialGrid(ENEMY_GRID_CELL_SIZE);

    let frameCount = 0;
    let lastFpsTime = performance.now();
    let currentFps = 60;
    let lastMagnetDropTime = 0;
    let gameplayStartedAt = null;
    let lowFpsSince = null;
    const LOW_FPS_THRESHOLD = 30;
    const LOW_FPS_SUSTAINED_MS = 3000;
    const MIN_XP_ORBS_FOR_PERFORMANCE_MAGNET = 20;

    // requestAnimationFrame feuert mit der Bildwiederholrate des Displays (60Hz
    // Desktop, aber oft 90/120Hz auf Handys). Bewegung/Timer wurden vorher pro
    // Frame um einen festen Betrag erhöht statt pro vergangener Echtzeit, wodurch
    // das Spiel auf High-Refresh-Displays spürbar schneller lief. dt normalisiert
    // auf eine 60fps-Basis (dt=1 bei 60fps), damit alle bestehenden Konstanten
    // (Geschwindigkeiten, Cooldown-"Frames" etc.) unverändert weiter passen.
    let lastTimestamp = null;
    const MAX_FRAME_MS = 50; // deckelt den Delta-Sprung nach Pause/Tab-Wechsel

    function computeDeltaFactor(timestamp) {
        const now = typeof timestamp === 'number' ? timestamp : performance.now();
        let dt = 1;
        if (lastTimestamp !== null) {
            const deltaMs = Math.min(now - lastTimestamp, MAX_FRAME_MS);
            dt = deltaMs / (1000 / 60);
        }
        lastTimestamp = now;
        return dt;
    }

    // Gemeinsame Belohnungslogik für einen getöteten Gegner — genutzt vom
    // direkten Lasertreffer UND vom Explosive-Rounds-Flächenschaden, damit
    // beide Pfade konsistent XP/Plasma/Kill vergeben.
    function awardKillIfNeeded(enemy) {
        if (enemy.hp <= 0 && !enemy.alreadyAwardedXP) {
            // Spawn boss XP or regular XP
            if (enemy.isElite) {
                // A Boss orb always guarantees a level up upon collection.
                xpPoints.push(new XP(enemy.x, enemy.y, 0, true));
                
                // Insta Death Ray Sweep + Popcorn Wave Reward
                spawnBossRewardWave(canvas, enemy.x, enemy.y, easyModeRef ? easyModeRef.value : false);
                
                sweepRay.active = true;
                sweepRay.timer = 0;
                sweepRay.startAngle = ship.angle;
                sweepRay.angle = ship.angle;
                
                effectsSystem.triggerScreenShake(20, 30);
                AudioManager.play('SHIP_LASER');
            } else {
                xpPoints.push(new XP(enemy.x, enemy.y, enemy.xpValue));
                // Split mechanics for regular enemies
                if (!enemy.isElite) {
                    spawnSplitEnemies(enemy, easyModeRef ? easyModeRef.value : false);
                }
            }
            
            // Elite-Gegner droppen garantiert Plasma; Salvage Drive verdoppelt die normale Chance
            const dropChance = GAME_CONFIG.PLASMA_DROP_CHANCE * (techUpgrades.salvage ? SALVAGE_DRIVE.DROP_CHANCE_MULT : 1);
            if (enemy.isElite || Math.random() < dropChance) {
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
            
            // Random drop chance for Tractor Pulse Item (e.g. 1%)
            if (Math.random() < 0.01) {
                tractorItems.push(new TractorItem(enemy.x, enemy.y));
            }
            
            killsRef.value++;
            enemy.alreadyAwardedXP = true; // XP für diesen Gegner wurde vergeben
        }
    }

    function endGame() {
        if (isGameOverRef.value) return;
        isGameOverRef.value = true;
        clearInterval(context.enemySpawnIntervalId);
        clearRunState(); // Tod löscht den Spielstand — nur Plasma/Tech-Tree bleiben (siehe upgrades.js)
        AudioManager.play('GAME_OVER');
        displayGameOverScreen(levelRef.value);
    }

    function levelUp() {
        levelRef.value++;
        experienceRef.value = 0;
        maxXPRef.value += PROGRESSION.XP_INCREASE_PER_LEVEL;
        AudioManager.play('LEVEL_UP');
        displayLevel(levelRef.value, true); // Level-Anzeige mit Pop-Effekt
        isShopOpenRef.value = true;
        displayShopModal(ship, upgrades, (upgradeKey) => {
            applyUpgrade(upgradeKey, ship, PHYSICS);
            if (typeof window !== 'undefined' && window.saveRunState) window.saveRunState();
            // Overdrive: temporärer Feuerrate-/Schadens-Buff, an die Wahl von
            // "Laser Damage" gekoppelt (sonst feuert es zu oft und verliert seinen
            // Ausnahme-Charakter) — außer das Overdrive-Core-Upgrade ist aktiv,
            // das genau diese Einschränkung aufhebt und JEDE Wahl triggert.
            if (upgradeKey === 'laser' || upgrades.overdriveCore > 0) {
                activateOverdrive();
                if (typeof showOverdriveHint === 'function') {
                    showOverdriveHint(getOverdriveDurationMs());
                }
            }
            isShopOpenRef.value = false;

            // Prüfen, ob eine Gegnerwelle ausgelöst werden soll, NACHDEM der Shop geschlossen wurde
            if (levelRef.value > 1 && levelRef.value % GAME_CONFIG.ENEMY_WAVE_INTERVAL === 0) {
                spawnEnemyWave(canvas, levelRef.value, easyModeRef ? easyModeRef.value : false);
                if (typeof showWaveHint === 'function') {
                    showWaveHint();
                }
            }
            // Boss: genau ein stärkerer Gegner pro ELITE_ENEMY_INTERVAL-Level, ausgelöst
            // einmalig beim Level-Aufstieg (statt vorher wiederholt bei jedem
            // Enemy-Spawn-Tick, solange das Level ein Vielfaches von 10 war).
            if (levelRef.value % GAME_CONFIG.ELITE_ENEMY_INTERVAL === 0) {
                spawnBoss(canvas, levelRef.value, easyModeRef ? easyModeRef.value : false);
                if (typeof showBossHint === 'function') {
                    showBossHint();
                }
            }
            // Reset shooting flag when shop closes (prevents an instant shot from
            // a stale keydown/mousedown carried into the resumed frame) — except
            // on mobile, where keys.shooting is the permanent auto-fire flag with
            // no button to press again, so clearing it here silently killed fire
            // for the rest of the run after the very first shop visit.
            if (inputManager && inputManager.keys) {
                inputManager.keys.shooting = inputManager.isMobile;
            }
            // GameLoop nach Shop schließen fortsetzen
            requestAnimationFrame(gameLoop);
        });
    }

    function autoShootLogic() {
        if (techUpgrades.autoShoot && !ship.isExploding && !isPausedRef.value && !isGameOverRef.value && !isShopOpenRef.value) {
            if (!autoShootTimerRef.value || performance.now() - autoShootTimerRef.value > GAME_CONFIG.AUTO_SHOOT_COOLDOWN * getFireRateMultiplier(techUpgrades)) {
                const shots = ship.shoot();
                if (Array.isArray(shots)) {
                    shots.forEach(l => lasers.push(l));
                } else {
                    lasers.push(shots);
                }
                AudioManager.play('SHIP_LASER');
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
                const candidates = enemyGrid.queryRadius(ship.x, ship.y, 1000);
                for (const e of candidates) {
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
                    // Twin Missiles: eine zweite Rakete pro Salve, leicht versetzt gestartet
                    if (techUpgrades.twinMissiles) {
                        homingMissiles.push(new HomingMissile(
                            ship.x - Math.sin(ship.angle)*14 + Math.cos(ship.angle)*20,
                            ship.y + Math.cos(ship.angle)*14 + Math.sin(ship.angle)*20,
                            closest,
                            { speed: 2.2, explosionRadius: 60, damage: 6 }
                        ));
                    }
                    AudioManager.play('SHIP_MISSILE');
                    lastMissileTime = now;
                }
            }
        }
    }

    function gameLoop(timestamp) {
        const dt = computeDeltaFactor(timestamp);
        if (isGameOverRef.value) return;
        if (isPausedRef.value) {
            frameCount = 0;
            lastFpsTime = performance.now();
            lowFpsSince = null;
            return;
        }
        if (isShopOpenRef.value) {
            // Modal time must not count as low-FPS gameplay time. Otherwise
            // resuming after a level-up can produce a false performance drop.
            frameCount = 0;
            lastFpsTime = performance.now();
            lowFpsSince = null;
            requestAnimationFrame(gameLoop);
            return;
        }

        const now = performance.now();
        if (gameplayStartedAt === null) gameplayStartedAt = now;
        frameCount++;
        if (now - lastFpsTime >= 1000) {
            currentFps = Math.round((frameCount * 1000) / (now - lastFpsTime));
            frameCount = 0;
            lastFpsTime = now;
            
            if (typeof window !== 'undefined' && !inputManager.isMobile) {
                let fpsEl = document.getElementById('fps-display');
                if (!fpsEl) {
                    fpsEl = document.createElement('div');
                    fpsEl.id = 'fps-display';
                    fpsEl.style.position = 'fixed';
                    fpsEl.style.bottom = '10px';
                    fpsEl.style.left = '10px';
                    fpsEl.style.fontFamily = "'IBM Plex Mono', 'SF Mono', 'Consolas', monospace";
                    fpsEl.style.fontSize = '10px';
                    fpsEl.style.color = 'rgba(120,255,170,0.5)';
                    fpsEl.style.zIndex = '9999';
                    fpsEl.style.pointerEvents = 'none';
                    document.body.appendChild(fpsEl);
                }
                fpsEl.innerText = `FPS: ${currentFps}`;
            }

            if (currentFps < LOW_FPS_THRESHOLD) {
                if (lowFpsSince === null) lowFpsSince = now;
            } else {
                lowFpsSince = null;
            }
        }

        const shakeActive = effectsSystem.applyScreenShake(dt);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (inputManager.isMobile) {
            ctx.save();
            ctx.scale(MOBILE.GAME_ZOOM, MOBILE.GAME_ZOOM);
        }
        effectsSystem.updateStars(ship.x, ship.y);
        effectsSystem.drawStars();
        effectsSystem.updateAndDrawXpParticles(dt);
        if (!ship.isExploding) {
            context.updateShipMovement(dt);
        }
        ship.update(dt);
        ship.draw(ctx);

        // Begleit-Drohne(n) (Tech-Tree-Waffe): kreisen ums Schiff und feuern
        // eigenständig auf den nächsten Gegner in Reichweite. Die zweite
        // Drohne (Twin Drones) startet exakt gegenüber der ersten.
        if (techUpgrades.drone) {
            const desiredDrones = techUpgrades.twinDrones ? 2 : 1;
            while (drones.length < desiredDrones) {
                const initialAngle = drones.length === 0 ? undefined : drones[0].orbitAngle + Math.PI;
                drones.push(new Drone(initialAngle));
            }
            drones.forEach(d => {
                d.update(ship, dt);
                d.draw(ctx);
                const droneShot = d.tryShoot(enemyGrid, upgrades.laser);
                if (droneShot) {
                    lasers.push(droneShot);
                    AudioManager.play('DRONE_LASER');
                }
            });
        }

        effectsSystem.drawMagnetField(ship.x, ship.y, magnetRadius, upgrades.magnet); // Korrigiert: magnetRadius direkt verwenden
        if (inputManager.isShooting() && !ship.isExploding && (!gameLoop.lastShot || performance.now() - gameLoop.lastShot > GAME_CONFIG.LASER_SHOOT_COOLDOWN * getFireRateMultiplier(techUpgrades))) {
            const shots = ship.shoot();
            if (Array.isArray(shots)) {
                shots.forEach(l => lasers.push(l));
            } else {
                lasers.push(shots);
            }
            AudioManager.play('SHIP_LASER');
            gameLoop.lastShot = performance.now();
        }
        // Rückwärts-Schleife statt forEach+splice: forEach hält einen internen
        // Zähler, der beim Splicen NICHT zurückspringt, wodurch das auf den
        // entfernten Index nachrückende Element in diesem Frame übersprungen
        // würde (Update/Draw fehlt für ein Frame). Rückwärts iterieren ist der
        // Standard-sichere Weg, während der Iteration zu entfernen.
        for (let lIdx = lasers.length - 1; lIdx >= 0; lIdx--) {
            const laser = lasers[lIdx];
            laser.update(canvas.width, canvas.height, dt);
            effectsSystem.drawLaserWithGlow(laser, laser.upgradeLevel);
            if (!laser.isActive) {
                lasers.splice(lIdx, 1);
            }
        }

        // Gegner updaten/zeichnen und gleichzeitig das räumliche Grid für die
        // Laser-Kollisionsabfrage befüllen. Explodierende Gegner sind nicht
        // treffbar (checkCollision/checkLaserHit geben für sie false zurück),
        // werden also gar nicht erst eingefügt.
        enemyGrid.clear();
        for (let eIdx = enemies.length - 1; eIdx >= 0; eIdx--) {
            const enemy = enemies[eIdx];
            enemy.update(ship.x, ship.y, dt);
            enemy.draw(ctx);
            if (!ship.isExploding && enemy.checkCollision(ship)) {
                const result = ship.damage(enemy.isElite ? 2 : 1);
                if (result === 'dead') {
                    suppressAutosave();
                    clearRunState(); // sofort, nicht erst nach dem 1s-Explosions-Delay in endGame()
                    ship.explode();
                    effectsSystem.triggerScreenShake(EFFECTS.SCREEN_SHAKE_HIT_INTENSITY, EFFECTS.SCREEN_SHAKE_HIT_DURATION);
                    setTimeout(() => endGame(), 1000);
                } else if (result === 'hit') {
                    effectsSystem.triggerScreenShake(EFFECTS.SCREEN_SHAKE_HIT_INTENSITY * 0.5, EFFECTS.SCREEN_SHAKE_HIT_DURATION * 0.5);
                }
            }
            if (!enemy.alive) {
                enemies.splice(eIdx, 1);
                continue;
            }
            if (!enemy.exploding) {
                enemyGrid.insert(enemy);
            }
        }

        // Laser-Gegner-Kollision: statt jeden Laser gegen JEDEN Gegner zu prüfen
        // (O(Gegner × Laser) pro Frame — bei Wellen von 10+ Gegnern und mehreren
        // gleichzeitig fliegenden Lasern der Haupttreiber der Framerate-Einbrüche),
        // liefert das Grid nur die Gegner aus Zellen nahe dem Laser zurück.
        for (let lIdx = lasers.length - 1; lIdx >= 0; lIdx--) {
            const laser = lasers[lIdx];
            const candidates = enemyGrid.queryRadius(laser.x, laser.y, LASER_HIT_QUERY_RADIUS);
            let laserConsumed = false;
            for (const enemy of candidates) {
                // Ein Laser überlappt oft mehrere Frames lang denselben Gegner, bevor er
                // dessen Trefferradius physisch verlässt — ohne diese Sperre würde ein
                // durchdringender Laser beide Pierce-Ladungen an EINEN Gegner verlieren,
                // statt zwei verschiedene zu treffen.
                if (laser.hitEnemies.has(enemy)) continue;
                if (enemy.checkLaserHit(laser)) {
                    laser.hitEnemies.add(enemy);
                    // enemy.destroy() wird jetzt korrekt innerhalb von enemy.checkLaserHit() aufgerufen,
                    // wenn die Lebenspunkte des Gegners tatsächlich <= 0 sind.
                    // Laser wird nur verbraucht, wenn keine Durchdringung (Piercing) mehr übrig ist
                    if (laser.pierceRemaining > 0) {
                        laser.pierceRemaining--;
                    } else {
                        lasers.splice(lIdx, 1);
                        laserConsumed = true;
                    }

                    awardKillIfNeeded(enemy);

                    // Explosive Rounds: Flächenschaden an nahen Gegnern beim Einschlag.
                    if (techUpgrades.explosiveRounds) {
                        explosiveVisuals.push({ x: enemy.x, y: enemy.y, life: 10, maxLife: 10, radius: EXPLOSIVE_ROUNDS.SPLASH_RADIUS });
                        const splashDamage = laser.damage * EXPLOSIVE_ROUNDS.SPLASH_DAMAGE_MULT;
                        const nearby = enemyGrid.queryRadius(enemy.x, enemy.y, EXPLOSIVE_ROUNDS.SPLASH_RADIUS);
                        for (const other of nearby) {
                            if (other === enemy || !other.alive || other.exploding) continue;
                            const sdx = other.x - enemy.x, sdy = other.y - enemy.y;
                            if (Math.sqrt(sdx*sdx + sdy*sdy) < EXPLOSIVE_ROUNDS.SPLASH_RADIUS) {
                                other.hp = Math.max(0, other.hp - splashDamage);
                                if (other.hp <= 0) {
                                    other.destroy();
                                } else if (!other.isHit) {
                                    other.isHit = true;
                                    other.hitTimer = other.hitDuration;
                                }
                                awardKillIfNeeded(other);
                            }
                        }
                    }

                    // Chain Lightning (XP-Upgrade): Chance, dass der Treffer auf einen
                    // zweiten nahen Gegner überspringt (reduzierter Schaden). Nutzt das
                    // Grid statt aller Gegner, aus demselben Performance-Grund wie oben.
                    if (upgrades.chainLightning > 0) {
                        const arcChance = Math.min(CHAIN_LIGHTNING.MAX_CHANCE, upgrades.chainLightning * CHAIN_LIGHTNING.CHANCE_PER_LEVEL);
                        if (Math.random() < arcChance) {
                            const nearby = enemyGrid.queryRadius(enemy.x, enemy.y, CHAIN_LIGHTNING.RANGE);
                            let arcTarget = null, minDist = Infinity;
                            for (const other of nearby) {
                                if (other === enemy || !other.alive || other.exploding) continue;
                                const adx = other.x - enemy.x, ady = other.y - enemy.y;
                                const dist = Math.sqrt(adx * adx + ady * ady);
                                if (dist < minDist) { minDist = dist; arcTarget = other; }
                            }
                            if (arcTarget) {
                                const arcDamage = laser.damage * CHAIN_LIGHTNING.DAMAGE_MULT;
                                arcTarget.hp = Math.max(0, arcTarget.hp - arcDamage);
                                if (arcTarget.hp <= 0) {
                                    arcTarget.destroy();
                                } else if (!arcTarget.isHit) {
                                    arcTarget.isHit = true;
                                    arcTarget.hitTimer = arcTarget.hitDuration;
                                }
                                awardKillIfNeeded(arcTarget);
                                chainFlashes.push({ x1: enemy.x, y1: enemy.y, x2: arcTarget.x, y2: arcTarget.y, life: CHAIN_LIGHTNING.FLASH_LIFE });
                            }
                        }
                    }
                    if (laserConsumed) break;
                }
            }
        }

        // Chain-Lightning-Blitze zeichnen und ausblenden lassen.
        for (let i = chainFlashes.length - 1; i >= 0; i--) {
            const flash = chainFlashes[i];
            flash.life -= dt;
            if (flash.life <= 0) {
                chainFlashes.splice(i, 1);
                continue;
            }
            ctx.save();
            ctx.globalAlpha = Math.max(0, flash.life / CHAIN_LIGHTNING.FLASH_LIFE);
            ctx.strokeStyle = '#7fe8ff';
            ctx.shadowBlur = 6;
            ctx.shadowColor = '#7fe8ff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(flash.x1, flash.y1);
            ctx.lineTo(flash.x2, flash.y2);
            ctx.stroke();
            ctx.restore();
        }

        // Explosive Rounds Visuals zeichnen
        for (let i = explosiveVisuals.length - 1; i >= 0; i--) {
            const exp = explosiveVisuals[i];
            exp.life -= dt;
            if (exp.life <= 0) {
                explosiveVisuals.splice(i, 1);
                continue;
            }
            ctx.save();
            const progress = 1 - (exp.life / exp.maxLife);
            ctx.globalAlpha = Math.max(0, exp.life / exp.maxLife) * 0.5;
            ctx.fillStyle = '#ff9800';
            ctx.beginPath();
            ctx.arc(exp.x, exp.y, exp.radius * progress, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // XP und Plasma nach den Gegnern zeichnen, damit sie darüber liegen
        handleXpCollection(
            ship, xpPoints, effectsSystem, ctx,
            { experienceRef, xpCollectedRef, maxXPRef },
            () => {
                levelUp();
                if (typeof window !== 'undefined' && window.syncRefsToVars) window.syncRefsToVars();
            },
            dt
        );
        if (typeof window !== 'undefined' && window.syncRefsToVars) window.syncRefsToVars();
        handlePlasmaCollection(ship, plasmaCells, effectsSystem, ctx, dt);
        handleTractorCollection(ship, tractorItems, effectsSystem, ctx);

        // A performance magnet is a recovery tool for an overloaded XP field,
        // not a generic low-FPS reward. Decide only after XP collection and
        // level-up handling, so a newly opened shop can never get one in the
        // same frame. Require sustained pressure and avoid stacking pickups.
        const performanceMagnetReady = lowFpsSince !== null
            && now - lowFpsSince >= LOW_FPS_SUSTAINED_MS
            && now - gameplayStartedAt >= 60000
            && now - lastMagnetDropTime >= 60000
            && xpPoints.length >= MIN_XP_ORBS_FOR_PERFORMANCE_MAGNET
            && tractorItems.length === 0
            && !isShopOpenRef.value
            && !isGameOverRef.value;
        if (performanceMagnetReady) {
            tractorItems.push(new TractorItem(ship.x, ship.y - 40));
            lastMagnetDropTime = now;
            lowFpsSince = null;
        }

        for (let idx = enemyLasers.length - 1; idx >= 0; idx--) {
            const l = enemyLasers[idx];
            l.x += Math.cos(l.angle) * l.speed * dt;
            l.y += Math.sin(l.angle) * l.speed * dt;
            l.life -= dt;
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
                    const result = ship.damage(1);
                    if (result === 'dead') {
                        suppressAutosave();
                        clearRunState();
                        ship.explode();
                        effectsSystem.triggerScreenShake(EFFECTS.SCREEN_SHAKE_LASER_INTENSITY, EFFECTS.SCREEN_SHAKE_LASER_DURATION);
                        setTimeout(() => endGame(), 1000);
                    } else if (result === 'hit') {
                        effectsSystem.triggerScreenShake(EFFECTS.SCREEN_SHAKE_LASER_INTENSITY * 0.5, EFFECTS.SCREEN_SHAKE_LASER_DURATION * 0.5);
                    }
                    enemyLasers.splice(idx, 1);
                }
            }
        }
        // Update & Draw Homing Missiles
        for (let i = homingMissiles.length-1; i >= 0; i--) {
            const m = homingMissiles[i];

            m.update(enemyGrid, dt); // Update kümmert sich auch um die Explosionsanimation

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
                        m.detonate(enemyGrid, effectsSystem, {
                            xpPoints,
                            XP,
                            killsRef,
                            GAME_CONFIG,
                            plasmaCells,
                            PlasmaCell,
                            canvas, // für Plasmakoordinaten
                            techUpgrades // für Salvage Drive
                        });
                    }
                }
            }
        }
        
        if (sweepRay.active) {
            sweepRay.timer += dt * (1000/60);
            if (sweepRay.timer >= sweepRay.duration) {
                sweepRay.active = false;
            } else {
                const progress = sweepRay.timer / sweepRay.duration;
                // 1.5 rotations over the duration
                sweepRay.angle = sweepRay.startAngle + progress * Math.PI * 2 * 1.5;
                
                const beamLength = 2000;
                const endX = ship.x + Math.cos(sweepRay.angle) * beamLength;
                const endY = ship.y + Math.sin(sweepRay.angle) * beamLength;
                
                ctx.save();
                ctx.strokeStyle = '#a832a8';
                ctx.lineWidth = 60;
                ctx.shadowColor = '#d942d9';
                ctx.shadowBlur = 40;
                ctx.beginPath();
                ctx.moveTo(ship.x, ship.y);
                ctx.lineTo(endX, endY);
                ctx.stroke();
                
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 20;
                ctx.shadowBlur = 10;
                ctx.stroke();
                ctx.restore();
                
                const A = ship.x, B = ship.y;
                const C = endX, D = endY;
                const dx = C - A, dy = D - B;
                const l2 = dx * dx + dy * dy;
                
                for (let eIdx = enemies.length - 1; eIdx >= 0; eIdx--) {
                    const enemy = enemies[eIdx];
                    if (!enemy.alive || enemy.exploding) continue;
                    
                    let t = Math.max(0, Math.min(1, ((enemy.x - A) * dx + (enemy.y - B) * dy) / l2));
                    const projX = A + t * dx;
                    const projY = B + t * dy;
                    const distSq = (enemy.x - projX) * (enemy.x - projX) + (enemy.y - projY) * (enemy.y - projY);
                    
                    if (distSq < (enemy.size + 40) * (enemy.size + 40)) {
                        enemy.hp = 0;
                        enemy.destroy();
                        awardKillIfNeeded(enemy);
                    }
                }
            }
        }

        if (inputManager.isMobile) {
            ctx.restore();
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
