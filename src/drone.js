// Begleit-Drohne (Tech-Tree-Waffe): kreist ums Schiff und feuert automatisch
// eigene Laser auf den nächsten Gegner in Reichweite.
import { makePixelSprite, drawPixelSprite } from './pixelArt.js';
import { DRONE } from './constants.js';
import Laser from './laser.js';

// Kompakter Pfeilrumpf statt reiner Kreisscheibe, zeigt lokal in +x-Richtung
// (wird beim Zeichnen auf die Flugrichtung entlang der Umlaufbahn rotiert).
const DRONE_SPRITE_RES = 12;
const DRONE_RANGE = 6; // lokale Koordinaten laufen von -DRONE_RANGE..DRONE_RANGE
const dMx = x => (x + DRONE_RANGE) / (2 * DRONE_RANGE) * DRONE_SPRITE_RES;
const dMy = y => (y + DRONE_RANGE) / (2 * DRONE_RANGE) * DRONE_SPRITE_RES;
const dPath = (ctx, pts, color) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    pts.forEach(([x, y], i) => {
        const px = dMx(x), py = dMy(y);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fill();
};

const droneSprite = makePixelSprite(DRONE_SPRITE_RES, DRONE_SPRITE_RES,
    ['#052b33', '#0aa3c2', '#7fe8ff', '#eafcff'], '#021a1f',
    (ctx) => {
        // Rumpf
        dPath(ctx, [[5, 0], [-1, -3.2], [-3.5, -1.6], [-3.5, 1.6], [-1, 3.2]], '#0aa3c2');
        // Heckflossen
        dPath(ctx, [[-1, -3.2], [-4.6, -3.4], [-3.5, -1.6]], '#052b33');
        dPath(ctx, [[-1, 3.2], [-4.6, 3.4], [-3.5, 1.6]], '#052b33');
        // Cockpit-Linse
        ctx.fillStyle = '#7fe8ff';
        ctx.beginPath();
        ctx.arc(dMx(1.6), dMy(0), Math.max(0.8, DRONE_SPRITE_RES / (2 * DRONE_RANGE) * 1.3), 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#eafcff';
        ctx.beginPath();
        ctx.arc(dMx(2), dMy(0), Math.max(0.4, DRONE_SPRITE_RES / (2 * DRONE_RANGE) * 0.5), 0, Math.PI * 2);
        ctx.fill();
    }
);

const MUZZLE_FLASH_FRAMES = 6;
const TRAIL_LIFE_FRAMES = 12;

export default class Drone {
    // initialAngle erlaubt es, mehrere Drohnen versetzt zu starten (z.B. eine
    // zweite Drohne exakt gegenüber der ersten), statt beide zufällig zu setzen.
    constructor(initialAngle = Math.random() * Math.PI * 2) {
        this.orbitAngle = initialAngle;
        this.x = 0;
        this.y = 0;
        this.lastShotAt = 0;
        this.muzzleFlash = 0;
        this.trailParticles = [];
    }

    update(ship, dt = 1) {
        this.orbitAngle += DRONE.ORBIT_SPEED * dt;
        this.x = ship.x + Math.cos(this.orbitAngle) * DRONE.ORBIT_RADIUS;
        this.y = ship.y + Math.sin(this.orbitAngle) * DRONE.ORBIT_RADIUS;

        // Kurze verblassende Spur entlang der Flugbahn
        this.trailParticles.push({ x: this.x, y: this.y, life: TRAIL_LIFE_FRAMES, maxLife: TRAIL_LIFE_FRAMES });
        this.trailParticles.forEach(p => { p.life -= dt; });
        this.trailParticles = this.trailParticles.filter(p => p.life > 0);

        if (this.muzzleFlash > 0) this.muzzleFlash -= dt;
    }

    // Sucht das nächste Ziel in Reichweite und gibt bei Treffer-Cooldown einen
    // neuen Laser zurück (Aufrufer fügt ihn dem lasers-Array hinzu), sonst null.
    tryShoot(enemyGrid, upgradeLevel) {
        const now = performance.now();
        if (now - this.lastShotAt < DRONE.FIRE_COOLDOWN_MS) return null;

        let closest = null, minDist = DRONE.FIRE_RANGE;
        const candidates = enemyGrid.queryRadius(this.x, this.y, DRONE.FIRE_RANGE);
        for (const e of candidates) {
            if (!e.alive || e.exploding) continue;
            const dx = e.x - this.x, dy = e.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < minDist) {
                minDist = dist;
                closest = e;
            }
        }
        if (!closest) return null;

        this.lastShotAt = now;
        this.muzzleFlash = MUZZLE_FLASH_FRAMES;
        const angle = Math.atan2(closest.y - this.y, closest.x - this.x);
        return new Laser(this.x, this.y, angle, upgradeLevel, {});
    }

    draw(ctx) {
        // Trail zuerst zeichnen, damit die Drohne selbst darüber liegt
        this.trailParticles.forEach(p => {
            ctx.save();
            ctx.globalAlpha = 0.35 * (p.life / p.maxLife);
            ctx.fillStyle = '#0aa3c2';
            ctx.beginPath();
            ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });

        ctx.save();
        ctx.translate(this.x, this.y);
        // Rotiert auf die Bewegungsrichtung entlang der Kreisbahn (Tangente)
        ctx.rotate(this.orbitAngle + Math.PI / 2);
        drawPixelSprite(ctx, droneSprite, DRONE.SIZE, DRONE.SIZE);
        ctx.restore();

        if (this.muzzleFlash > 0) {
            ctx.save();
            ctx.globalAlpha = this.muzzleFlash / MUZZLE_FLASH_FRAMES;
            ctx.fillStyle = '#eafcff';
            ctx.beginPath();
            ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
}
