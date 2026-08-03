// collectibles.js
// Verwaltung von XP- und Plasma-Handling (Sammeln, Magnet, UI)
import { upgrades, savePlasmaCount, magnetRadius, magnetStrength, isCollectorPulseActive, triggerCollectorPulse } from './upgrades.js';
import { COLORS, COLLECTOR_PULSE } from './constants.js';
import { updateExperienceBar } from './ui.js';
import { AudioManager } from './audio/AudioManager.js';

export function handleXpCollection(ship, xpPoints, effectsSystem, ctx, experienceObj, levelUpCallback, dt = 1) {
    // ACHTUNG: Niemals xpPoints während des forEach direkt verändern!
    // Stattdessen: Indizes merken und nach der Schleife entfernen
    const toRemove = [];
    const pulseActive = isCollectorPulseActive();
    
    // Performance Guard: Wenn zu viele XP-Orbs existieren, werden die ältesten 
    // automatisch angezogen (wirkt wie ein partieller Collector Pulse).
    const OVERFLOW_LIMIT = 120;
    const excessCount = Math.max(0, xpPoints.length - OVERFLOW_LIMIT);

    xpPoints.forEach((xp, xIdx) => {
        // Magnetwirkung — der Collector-Pulse nutzt denselben Zug, nur ohne
        // Reichweitenbegrenzung und mit fester Stärke, egal ob Magnet gekauft wurde.
        const forcePull = xIdx < excessCount;
        const effectivePulse = pulseActive || forcePull;
        
        if ((upgrades.magnet > 0 || effectivePulse) && !xp.collected) {
            const dx = ship.x - xp.x;
            const dy = ship.y - xp.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (effectivePulse || dist < magnetRadius) {
                const strength = 1 - Math.pow(1 - (effectivePulse ? COLLECTOR_PULSE.STRENGTH : magnetStrength), dt);
                xp.x += dx * strength;
                xp.y += dy * strength;
            }
        }
        // xp.draw() bringt seinen eigenen (pulsierenden) Glow schon mit —
        // kein zusätzliches drawWithGlow nötig (war ein doppelter shadowBlur
        // pro Orb und Frame).
        xp.draw(ctx);
        // XP-Einsammelradius
        const dx = ship.x - xp.x;
        const dy = ship.y - xp.y;
        if (Math.sqrt(dx * dx + dy * dy) < ship.getXpRadius() + xp.radius && !xp.collected) {
            effectsSystem.spawnXpParticles(xp.x, xp.y, COLORS.XP_COLOR);
            xp.collect();
            AudioManager.play('RES_COLLECT_XP');
            // Modifiziere die .value Eigenschaften der übergebenen Referenzobjekte
            let xpGained = xp.value;
            if (xp.isBossOrb) {
                // Ein Boss-Orb füllt die Leiste immer exakt auf.
                xpGained = Math.max(1, experienceObj.maxXPRef.value - experienceObj.experienceRef.value);
            }
            experienceObj.experienceRef.value += xpGained;
            experienceObj.xpCollectedRef.value += xpGained;
            updateExperienceBar(experienceObj.experienceRef.value, experienceObj.maxXPRef.value);
            toRemove.push(xIdx);
            if (experienceObj.experienceRef.value >= experienceObj.maxXPRef.value) {
                levelUpCallback();
            }
        }
    });
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
