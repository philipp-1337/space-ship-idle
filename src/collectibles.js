// collectibles.js
// Verwaltung von XP- und Plasma-Handling (Sammeln, Magnet, UI)
import { upgrades, magnetRadius, magnetStrength, plasmaCount, savePlasmaCount } from './upgrades.js';
import { COLORS } from './constants.js';
import { updatePlasmaUI } from './ui.js';

export function handleXpCollection(ship, xpPoints, effectsSystem, ctx, experienceObj, levelUpCallback) {
    xpPoints.forEach((xp, xIdx) => {
        // Magnetwirkung
        if (upgrades.magnet > 0 && !xp.collected) {
            const dx = ship.x - xp.x;
            const dy = ship.y - xp.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < magnetRadius) {
                xp.x += dx * magnetStrength;
                xp.y += dy * magnetStrength;
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
            experienceObj.experience++;
            experienceObj.xpCollected++;
            xpPoints.splice(xIdx, 1);
            if (experienceObj.experience >= experienceObj.maxXP) {
                levelUpCallback();
            }
        }
    });
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
            if (dist < magnetRadius) {
                plasma.x += dx * magnetStrength;
                plasma.y += dy * magnetStrength;
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
