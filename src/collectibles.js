// collectibles.js
// Verwaltung von XP- und Plasma-Handling (Sammeln, Magnet, UI)
import { upgrades, savePlasmaCount, magnetRadius, magnetStrength } from './upgrades.js';
import { COLORS } from './constants.js';
import { updateExperienceBar } from './ui.js';

export function handleXpCollection(ship, xpPoints, effectsSystem, ctx, experienceObj, levelUpCallback) {
    // ACHTUNG: Niemals xpPoints während des forEach direkt verändern!
    // Stattdessen: Indizes merken und nach der Schleife entfernen
    const toRemove = [];
    xpPoints.forEach((xp, xIdx) => {
        // Magnetwirkung
        if (upgrades.magnet > 0 && !xp.collected) {
            const dx = ship.x - xp.x;
            const dy = ship.y - xp.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < magnetRadius) { // Korrigiert: magnetRadius direkt verwenden
                xp.x += dx * magnetStrength; // Korrigiert: magnetStrength direkt verwenden
                xp.y += dy * magnetStrength; // Verwende upgrades.magnetStrength
            }
        }
        // Mit Glow-Effekt zeichnen
        effectsSystem.drawWithGlow(() => xp.draw(ctx), COLORS.XP_COLOR, 18);
        // XP-Einsammelradius
        const dx = ship.x - xp.x;
        const dy = ship.y - xp.y;
        if (Math.sqrt(dx * dx + dy * dy) < ship.getXpRadius() + xp.radius && !xp.collected) {
            effectsSystem.spawnXpParticles(xp.x, xp.y, COLORS.XP_COLOR);
            xp.collect();
            // Modifiziere die .value Eigenschaften der übergebenen Referenzobjekte
            experienceObj.experienceRef.value++;
            experienceObj.xpCollectedRef.value++;
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

export function handlePlasmaCollection(ship, plasmaCells, effectsSystem, ctx) {
    plasmaCells.forEach((plasma, pIdx) => {
        effectsSystem.drawWithGlow(() => plasma.draw(ctx), 'aqua', 20);
        ctx.save();
        ctx.shadowBlur = 20;
        ctx.shadowColor = 'aqua';
        plasma.draw(ctx);
        ctx.restore();
        // Magnetwirkung (optional, wie bei XP)
        if (upgrades.magnet > 0 && !plasma.collected) {
            const dx = ship.x - plasma.x;
            const dy = ship.y - plasma.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < magnetRadius) { // Korrigiert: magnetRadius direkt verwenden
                plasma.x += dx * magnetStrength; // Korrigiert: magnetStrength direkt verwenden
                plasma.y += dy * magnetStrength; // Verwende upgrades.magnetStrength
            }
        }
        // Einsammelradius
        const dx = ship.x - plasma.x;
        const dy = ship.y - plasma.y;
        if (Math.sqrt(dx * dx + dy * dy) < ship.getXpRadius() + plasma.radius && !plasma.collected) {
            plasma.collect();
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
