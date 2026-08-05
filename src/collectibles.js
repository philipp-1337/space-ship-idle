// collectibles.js
// Verwaltung von XP- und Plasma-Handling (Sammeln, Magnet, UI)
import { upgrades, savePlasmaCount, magnetRadius, magnetStrength, isCollectorPulseActive, triggerCollectorPulse, getXpMultiplier } from './upgrades.js';
import { COLORS, COLLECTOR_PULSE, EFFECTS } from './constants.js';
import { updateExperienceBar } from './ui.js';
import { AudioManager } from './audio/AudioManager.js';

export function handleXpCollection(ship, xpPoints, effectsSystem, ctx, experienceObj, levelUpCallback, dt = 1) {
    // ACHTUNG: Niemals xpPoints während des forEach direkt verändern!
    // Stattdessen: Indizes merken und nach der Schleife entfernen
    const toRemove = [];
    const pulseActive = isCollectorPulseActive();
    
    // Performance Guard: Merge overflow XP into nearby orbs. The spatial
    // buckets avoid the old repeated full-array nearest-neighbour scan, and
    // pop() keeps the cleanup O(1) per removed orb.
    // 200 visible orbs are safe on the measured render path. Keep the merge
    // only as a late safety net for pathological enemy-wave bursts.
    const OVERFLOW_LIMIT = EFFECTS.XP_ORB_MAX_ACTIVE;
    const OVERFLOW_CELL_SIZE = 64;
    if (xpPoints.length > OVERFLOW_LIMIT) {
        const overflowCount = xpPoints.length - OVERFLOW_LIMIT;
        // Normal bursts are drained over several frames to avoid a single
        // collection spike. A very large pathological burst is compacted in
        // one pass instead, so thousands of orbs are never rendered for long.
        const mergeBudget = overflowCount > 100 ? overflowCount : Math.min(overflowCount, 24);
        const overflowBuckets = new Map();
        const removed = new Set();
        const cellKey = (x, y) => `${Math.floor(x / OVERFLOW_CELL_SIZE)},${Math.floor(y / OVERFLOW_CELL_SIZE)}`;
        for (const orb of xpPoints) {
            const key = cellKey(orb.x, orb.y);
            const bucket = overflowBuckets.get(key);
            if (bucket) bucket.push(orb);
            else overflowBuckets.set(key, [orb]);
        }

        let mergesThisFrame = 0;
        while (xpPoints.length > OVERFLOW_LIMIT && mergesThisFrame < mergeBudget) {
            // Boss orbs must remain distinct because collecting one has
            // special level-up semantics. Compact regular orbs first.
            let sourceIndex = xpPoints.length - 1;
            while (sourceIndex >= 0 && xpPoints[sourceIndex].isBossOrb) sourceIndex--;
            if (sourceIndex < 0) break;
            const source = xpPoints[sourceIndex];
            const sourceCellX = Math.floor(source.x / OVERFLOW_CELL_SIZE);
            const sourceCellY = Math.floor(source.y / OVERFLOW_CELL_SIZE);
            let closest = null;
            let minD2 = Infinity;

            // Prefer a nearby visual cluster. A fallback scan handles sparse
            // scenes and guarantees that XP is never discarded.
            for (let ox = -1; ox <= 1; ox++) {
                for (let oy = -1; oy <= 1; oy++) {
                    const bucket = overflowBuckets.get(`${sourceCellX + ox},${sourceCellY + oy}`);
                    if (!bucket) continue;
                    for (const candidate of bucket) {
                        if (candidate === source || removed.has(candidate)) continue;
                        const dx = source.x - candidate.x;
                        const dy = source.y - candidate.y;
                        const d2 = dx * dx + dy * dy;
                        if (d2 < minD2) {
                            minD2 = d2;
                            closest = candidate;
                        }
                    }
                }
            }
            if (!closest) {
                for (const candidate of xpPoints) {
                    if (candidate === source || removed.has(candidate)) continue;
                    closest = candidate;
                    break;
                }
            }

            // This can only happen if the limit is invalid, but retaining the
            // source is safer than silently losing its XP value.
            if (!closest) break;

            closest.value += source.value;
            const val = closest.value;
            closest.radius = closest.isBossOrb ? 12 : (val > 15 ? 12 : (val > 1 ? 8 : 7));
            removed.add(source);
            if (sourceIndex !== xpPoints.length - 1) {
                xpPoints[sourceIndex] = xpPoints[xpPoints.length - 1];
            }
            xpPoints.pop();
            mergesThisFrame++;
        }
    }

    const magnetRadius2 = magnetRadius * magnetRadius;
    const orbPulse = 0.85 + 0.15 * Math.sin(Date.now() / 300);
    let xpBarDirty = false;
    const previousSmoothing = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;
    xpPoints.forEach((xp, xIdx) => {
        // Magnetwirkung — der Collector-Pulse nutzt denselben Zug, nur ohne
        // Reichweitenbegrenzung und mit fester Stärke, egal ob Magnet gekauft wurde.
        if ((upgrades.magnet > 0 || pulseActive) && !xp.collected) {
            const dx = ship.x - xp.x;
            const dy = ship.y - xp.y;
            const dist2 = dx * dx + dy * dy;
            if (pulseActive || dist2 < magnetRadius2) {
                const strength = 1 - Math.pow(1 - (pulseActive ? COLLECTOR_PULSE.STRENGTH : magnetStrength), dt);
                xp.x += dx * strength;
                xp.y += dy * strength;
            }
        }
        // xp.draw() bringt seinen eigenen (pulsierenden) Glow schon mit —
        // kein zusätzliches drawWithGlow nötig (war ein doppelter shadowBlur
        // pro Orb und Frame).
        xp.draw(ctx, orbPulse);
        // XP-Einsammelradius
        const dx = ship.x - xp.x;
        const dy = ship.y - xp.y;
        const collectRadius = ship.getXpRadius() + xp.radius;
        if (dx * dx + dy * dy < collectRadius * collectRadius && !xp.collected) {
            effectsSystem.spawnXpParticles(xp.x, xp.y, COLORS.XP_COLOR);
            xp.collect();
            AudioManager.play('RES_COLLECT_XP');
            // Modifiziere die .value Eigenschaften der übergebenen Referenzobjekte
            let xpGained = xp.value;
            if (xp.isBossOrb) {
                // Ein Boss-Orb füllt die Leiste immer exakt auf.
                xpGained = Math.max(1, experienceObj.maxXPRef.value - experienceObj.experienceRef.value);
            } else {
                xpGained *= getXpMultiplier(experienceObj.levelRef ? experienceObj.levelRef.value : 1);
            }
            experienceObj.experienceRef.value += xpGained;
            experienceObj.xpCollectedRef.value += xpGained;
            xpBarDirty = true;
            toRemove.push(xIdx);
            if (experienceObj.experienceRef.value >= experienceObj.maxXPRef.value) {
                levelUpCallback();
            }
        }
    });
    ctx.imageSmoothingEnabled = previousSmoothing;
    if (xpBarDirty) {
        updateExperienceBar(experienceObj.experienceRef.value, experienceObj.maxXPRef.value);
    }
    // Nach der Schleife entfernen, damit kein Crash durch Array-Modifikation während Iteration
    for (let i = toRemove.length - 1; i >= 0; i--) {
        xpPoints.splice(toRemove[i], 1);
    }
}

export function handleTractorCollection(ship, tractorItems, effectsSystem, ctx) {
    const toRemove = [];
    tractorItems.forEach((item, idx) => {
        item.draw(ctx);
        const dx = ship.x - item.x;
        const dy = ship.y - item.y;
        if (Math.sqrt(dx * dx + dy * dy) < ship.getXpRadius() + item.radius && !item.collected) {
            effectsSystem.spawnXpParticles(item.x, item.y, '#9c27b0');
            item.collected = true;
            triggerCollectorPulse();
            AudioManager.play('RES_COLLECT_TRACTOR');
            toRemove.push(idx);
        }
    });
    for (let i = toRemove.length - 1; i >= 0; i--) {
        tractorItems.splice(toRemove[i], 1);
    }
}

export function handlePlasmaCollection(ship, plasmaCells, effectsSystem, ctx, dt = 1) {
    const pulseActive = isCollectorPulseActive();
    plasmaCells.forEach((plasma, pIdx) => {
        // plasma.draw() bringt seinen eigenen shadowBlur-Glow mit; das hier
        // war vorher ein kompletter Doppel-Zeichnen-Bug (zwei volle Draws +
        // vier shadowBlur-Aufrufe pro Plasmazelle und Frame).
        plasma.draw(ctx);
        // Magnetwirkung (optional, wie bei XP) — Collector-Pulse siehe handleXpCollection
        if ((upgrades.magnet > 0 || pulseActive) && !plasma.collected) {
            const dx = ship.x - plasma.x;
            const dy = ship.y - plasma.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (pulseActive || dist < magnetRadius) {
                const strength = 1 - Math.pow(1 - (pulseActive ? COLLECTOR_PULSE.STRENGTH : magnetStrength), dt);
                plasma.x += dx * strength;
                plasma.y += dy * strength;
            }
        }
        // Einsammelradius
        const dx = ship.x - plasma.x;
        const dy = ship.y - plasma.y;
        if (Math.sqrt(dx * dx + dy * dy) < ship.getXpRadius() + plasma.radius && !plasma.collected) {
            plasma.collect();
            AudioManager.play('RES_COLLECT_PLASMA');
            // plasmaCount ist importiert (wird als let in upgrades.js exportiert)
            // Aber: Wert erhöhen und speichern
            // upgrades.js exportiert plasmaCount als let, daher: import * as upgrades, dann upgrades.plasmaCount++
            // Hier: upgrades.plasmaCount++
            upgrades.plasmaCount++;
            savePlasmaCount();
            plasmaCells.splice(pIdx, 1);
            if (typeof window.updatePlasmaUI === 'function') window.updatePlasmaUI(upgrades.plasmaCount);
        }
    });
}
