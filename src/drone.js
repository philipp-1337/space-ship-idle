// Begleit-Drohne (Tech-Tree-Waffe): kreist ums Schiff und feuert automatisch
// eigene Laser auf den nächsten Gegner in Reichweite.
import { makePixelSprite, drawPixelSprite } from './pixelArt.js';
import { DRONE } from './constants.js';
import Laser from './laser.js';

const DRONE_SPRITE_RES = 10;
const droneSprite = makePixelSprite(DRONE_SPRITE_RES, DRONE_SPRITE_RES,
    ['#052b33', '#0aa3c2', '#7fe8ff'], '#021a1f',
    (ctx) => {
        const c = DRONE_SPRITE_RES / 2;
        ctx.fillStyle = '#052b33';
        ctx.beginPath();
        ctx.arc(c, c, c - 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0aa3c2';
        ctx.beginPath();
        ctx.arc(c, c, c - 1.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#7fe8ff';
        ctx.beginPath();
        ctx.arc(c, c, Math.max(0.8, c - 3.2), 0, Math.PI * 2);
        ctx.fill();
    }
);

export default class Drone {
    constructor() {
        this.orbitAngle = Math.random() * Math.PI * 2;
        this.x = 0;
        this.y = 0;
        this.lastShotAt = 0;
    }

    update(ship, dt = 1) {
        this.orbitAngle += DRONE.ORBIT_SPEED * dt;
        this.x = ship.x + Math.cos(this.orbitAngle) * DRONE.ORBIT_RADIUS;
        this.y = ship.y + Math.sin(this.orbitAngle) * DRONE.ORBIT_RADIUS;
    }

    // Sucht das nächste Ziel in Reichweite und gibt bei Treffer-Cooldown einen
    // neuen Laser zurück (Aufrufer fügt ihn dem lasers-Array hinzu), sonst null.
    tryShoot(enemies, upgradeLevel) {
        const now = performance.now();
        if (now - this.lastShotAt < DRONE.FIRE_COOLDOWN_MS) return null;

        let closest = null, minDist = DRONE.FIRE_RANGE;
        for (const e of enemies) {
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
        const angle = Math.atan2(closest.y - this.y, closest.x - this.x);
        return new Laser(this.x, this.y, angle, upgradeLevel, {});
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        drawPixelSprite(ctx, droneSprite, DRONE.SIZE, DRONE.SIZE);
        ctx.restore();
    }
}
