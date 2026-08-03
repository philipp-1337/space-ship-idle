import Laser from './laser.js';
import { upgrades, techUpgrades } from './upgrades.js';
import { makePixelSprite, makeFlashSprite, drawPixelSprite } from './pixelArt.js';
import { ARMOR, SHIELD_REGEN } from './constants.js';

const SHIP_X_MIN = -22, SHIP_X_MAX = 22, SHIP_Y_MIN = -19, SHIP_Y_MAX = 19;
const SHIP_DISPLAY_W = SHIP_X_MAX - SHIP_X_MIN;
const SHIP_DISPLAY_H = SHIP_Y_MAX - SHIP_Y_MIN;
const SHIP_SPRITE_W = 18, SHIP_SPRITE_H = 16;

// Erweiterte Palette mit Akzentfarbe (Rot) und Mid-Tone Grau
const palette = ['#2b2d31', '#d7dbe0', '#c0c5ce', '#f2f3f5', '#8b8f97', '#1f3a52', '#8fe0ff', '#e23d28'];
const outlineColor = '#15181e'; // Etwas weicheres, bläuliches Dunkelgrau statt hartem Schwarz

const shipSprite = makePixelSprite(
    SHIP_SPRITE_W, SHIP_SPRITE_H,
    palette,
    outlineColor,
    (ctx) => {
        const mx = x => (x - SHIP_X_MIN) / (SHIP_X_MAX - SHIP_X_MIN) * SHIP_SPRITE_W;
        const my = y => (y - SHIP_Y_MIN) / (SHIP_Y_MAX - SHIP_Y_MIN) * SHIP_SPRITE_H;
        const path = (pts, color) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            pts.forEach(([x, y], i) => {
                const px = mx(x), py = my(y);
                if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            });
            ctx.closePath();
            ctx.fill();
        };

        // Triebwerksgehäuse
        [-1, 1].forEach(side => {
            path([[-19, side * 2.6], [-15, side * 2.6], [-15, side * 4.4], [-19, side * 4.4]], '#2b2d31');
        });

        // Delta-Flügel
        [-1, 1].forEach(side => {
            path([[4, side * 4.2], [-11, side * 17], [-15, side * 4.6]], '#d7dbe0');
            // Flügelspitzen (Akzent)
            path([[-7, side * 12], [-11, side * 17], [-12, side * 12]], '#e23d28');
        });

        // Seitenleitwerk
        path([[-15, -2.2], [-21, 0], [-15, 2.2]], '#2b2d31');

        // Rumpf Grundform
        path([[16, -3.8], [-15, -4.2], [-15, 4.2], [16, 3.8]], '#d7dbe0');

        // Mid-Tone für runderen Look
        path([[16, 0], [-15, 0], [-15, 2.5], [15, 2.5]], '#c0c5ce');

        // Rumpf-Highlight (oben)
        path([[16, -3.8], [-15, -4.2], [-15, -1.5], [15, -1.5]], '#f2f3f5');

        // Rumpf-Schatten (Hitzekacheln)
        path([[15, 2.5], [-15, 2.5], [-15, 4.2], [16, 3.8]], '#8b8f97');

        // Racing-Stripe (Akzent)
        path([[10, -0.5], [-12, -0.5], [-12, 0.5], [10, 0.5]], '#e23d28');

        // Nasenkappe (Spitzer)
        path([[22, 0], [16, -3.2], [16, 3.2]], '#2b2d31');

        // Cockpitfenster (Pixel-perfect Polygone statt Vektor-Kreise)
        path([[10, -1.5], [13, -1.5], [14, 0], [13, 1.5], [10, 1.5]], '#1f3a52');
        // Lichtreflexion im Cockpit
        path([[11, -1], [13, -1], [13, 0], [11, 0]], '#8fe0ff');
    }
);

const shipHitSprite = makeFlashSprite(shipSprite, '#ffffff');

class Ship {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 28;
        this.angle = 0;
        this.speed = 5;

        this.isExploding = false;
        this.explosionFrame = 0;
        this.maxExplosionFrames = 24;
        this.particles = [];

        this.thrustState = 'none';
        this.thrustParticles = [];

        this.maxHp = ARMOR.BASE_HP;
        this.hp = this.maxHp;
        this.invulnerableUntil = 0;
        this.hitFlashUntil = 0;
    }

    // Wendet Schaden an, respektiert Unverwundbarkeitsfenster nach dem letzten Treffer.
    // Rückgabe: 'blocked' (Unverwundbarkeit aktiv, nichts passiert), 'hit' (Treffer registriert,
    // Rumpf hält noch) oder 'dead' (Rumpf auf 0 HP, Aufrufer soll explode() auslösen).
    damage(amount) {
        const now = performance.now();
        if (now < this.invulnerableUntil || this.isExploding) return 'blocked';
        this.hp = Math.max(0, this.hp - amount);
        this.invulnerableUntil = now + ARMOR.INVULNERABLE_MS;
        this.hitFlashUntil = now + 150;
        return this.hp <= 0 ? 'dead' : 'hit';
    }

    isInvulnerable() {
        return performance.now() < this.invulnerableUntil;
    }

    update(dt = 1) {
        if (this.isExploding) {
            this.explosionFrame += dt;
            this.particles.forEach(p => {
                p.x += Math.cos(p.angle) * p.speed * dt;
                p.y += Math.sin(p.angle) * p.speed * dt;
                p.life -= dt;
            });
            this.particles = this.particles.filter(p => p.life > 0);
        }

        if (!this.isExploding && techUpgrades.shieldRegen) {
            if (this.hp < this.maxHp) {
                const now = performance.now();
                if (!this.nextRegenAt) this.nextRegenAt = now + SHIELD_REGEN.INTERVAL_MS;
                if (now >= this.nextRegenAt) {
                    this.hp = Math.min(this.maxHp, this.hp + 1);
                    this.nextRegenAt = now + SHIELD_REGEN.INTERVAL_MS;
                }
            } else {
                this.nextRegenAt = null; // full HP: restart the interval fresh next time it's needed
            }
        }

        // Triebwerkspartikel (Weltkoordinaten) generieren
        if (this.thrustState !== 'none' && !this.isExploding) {
            const isFwd = this.thrustState === 'forward';
            const color = isFwd ? (Math.random() > 0.5 ? '#ff5722' : '#ffc107') : '#03a9f4';
            const speedMult = isFwd ? 1.5 : 0.8;

            // Vorwärtsschub kommt aus dem Heck (hinten), Rückwärtsschub (Bugdüsen)
            // kommt aus dem Bug (vorne) — beides muss mit thrustState kippen,
            // nicht nur die Farbe.
            const dirSign = isFwd ? -1 : 1;

            for(let i=0; i<2; i++) {
                let localX, localY;
                if (isFwd) {
                    localX = -this.width * 0.45;
                    localY = (Math.random() - 0.5) * this.height * 0.3;
                } else {
                    localX = -this.width * 0.1;
                    const side = i === 0 ? 1 : -1;
                    localY = side * this.height * 0.5 + (Math.random() - 0.5) * this.height * 0.2;
                }

                const worldX = this.x + Math.cos(this.angle) * localX - Math.sin(this.angle) * localY;
                const worldY = this.y + Math.sin(this.angle) * localX + Math.cos(this.angle) * localY;

                const thrustAngle = this.angle + (Math.random() - 0.5) * 0.4;

                this.thrustParticles.push({
                    x: worldX,
                    y: worldY,
                    vx: dirSign * Math.cos(thrustAngle) * (2 + Math.random() * 3) * speedMult,
                    vy: dirSign * Math.sin(thrustAngle) * (2 + Math.random() * 3) * speedMult,
                    life: 10 + Math.random() * 10,
                    maxLife: 20,
                    color: color,
                    size: 2 + Math.random() * 2
                });
            }
        }

        this.thrustParticles.forEach(p => {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
        });
        this.thrustParticles = this.thrustParticles.filter(p => p.life > 0);
    }

    explode() {
        if (this.isExploding) return;
        this.isExploding = true;
        this.explosionFrame = 0;
        this.particles = [];
        for (let i = 0; i < 30; i++) {
            this.particles.push({
                x: 0,
                y: 0,
                angle: Math.random() * Math.PI * 2,
                speed: 2 + Math.random() * 3.5,
                color: Math.random() > 0.5 ? '#ff5722' : '#ffc107',
                size: 2 + Math.random() * 3,
                life: 14 + Math.random() * 15
            });
        }
    }

    // Hull-Integritätsring direkt ums Schiff — ergänzt (nicht ersetzt) das
    // Hull-Dial im HUD, das den exakten Zahlenwert behält. Ein Segment pro
    // Hull-Punkt, solange die Werte klein bleiben; ab MAX_SEGMENTS (z.B. bei
    // vielen Armor-Plating-Käufen) auf einen durchgehenden Füllbogen
    // umgeschaltet, damit die Segmente nicht zu winzig/überladen werden.
    // Erscheint erst ab dem ersten Armor-Plating-Kauf (wie der Magnetring erst
    // ab Magnet-Level 1) — bei der Basis-Hull von 1 wäre er nur ein fast
    // geschlossener Kreis ohne echte Segment-Information.
    drawIntegrityRing(ctx) {
        if (this.maxHp <= ARMOR.BASE_HP) return;
        const MAX_SEGMENTS = 12;
        const ratio = Math.max(0, Math.min(1, this.hp / this.maxHp));
        const radius = this.width * 0.62;
        const color = ratio > 0.5 ? '#39ff6a' : (ratio > 0.25 ? '#ffb000' : '#ff3b30');
        const emptyColor = 'rgba(120,255,170,0.15)';
        const critical = ratio > 0 && ratio <= 0.25;
        const pulse = critical ? 0.6 + 0.4 * Math.sin(Date.now() / 220) : 1;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.lineWidth = 2.5;

        if (this.maxHp <= MAX_SEGMENTS) {
            const segments = this.maxHp;
            const gap = 0.1; // rad Lücke zwischen Segmenten
            const segAngle = (Math.PI * 2) / segments;
            for (let i = 0; i < segments; i++) {
                const start = -Math.PI / 2 + i * segAngle + gap / 2;
                const end = start + segAngle - gap;
                const filled = i < this.hp;
                ctx.globalAlpha = filled ? (critical ? pulse : 0.9) : 1;
                ctx.strokeStyle = filled ? color : emptyColor;
                ctx.beginPath();
                ctx.arc(0, 0, radius, start, end);
                ctx.stroke();
            }
        } else {
            ctx.globalAlpha = 1;
            ctx.strokeStyle = emptyColor;
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.stroke();

            ctx.globalAlpha = critical ? pulse : 0.9;
            ctx.strokeStyle = color;
            ctx.beginPath();
            ctx.arc(0, 0, radius, -Math.PI / 2, -Math.PI / 2 + ratio * Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();
    }

    draw(ctx) {
        // Triebwerkspartikel unrotiert im Hintergrund zeichnen
        if (!this.isExploding) {
            this.thrustParticles.forEach(p => {
                ctx.save();
                ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
                ctx.fillStyle = p.color;
                ctx.fillRect(Math.floor(p.x), Math.floor(p.y), Math.floor(p.size), Math.floor(p.size));
                ctx.restore();
            });
        }

        if (this.isExploding) {
            ctx.save();
            ctx.translate(this.x, this.y);
            
            const glowCutoff = Math.floor(this.maxExplosionFrames * 0.5);
            if (this.explosionFrame < glowCutoff) {
                const alpha = 1 - this.explosionFrame / glowCutoff;
                ctx.fillStyle = `rgba(255, 150, 0, ${alpha})`;
                const r = this.width * 0.5 + this.explosionFrame * 1.5;
                ctx.fillRect(-r/2, -r/2, r, r);
                ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                ctx.fillRect(-r/4, -r/4, r/2, r/2);
            }
            
            this.particles.forEach(p => {
                ctx.save();
                ctx.globalAlpha = Math.max(0, p.life / 30);
                ctx.fillStyle = p.color;
                ctx.fillRect(Math.floor(p.x), Math.floor(p.y), Math.floor(p.size), Math.floor(p.size));
                ctx.restore();
            });
            
            ctx.restore();
            return;
        }

        this.drawIntegrityRing(ctx);

        const now = performance.now();
        const invulnerable = now < this.invulnerableUntil;
        // Während der Unverwundbarkeit blinkt das Schiff (jede 100ms sichtbar/unsichtbar).
        if (invulnerable && Math.floor(now / 100) % 2 === 0) {
            return;
        }

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        const sprite = now < this.hitFlashUntil ? shipHitSprite : shipSprite;
        drawPixelSprite(ctx, sprite, SHIP_DISPLAY_W, SHIP_DISPLAY_H);

        ctx.restore();
    }

    moveTo(x, y) {
        this.x = x;
        this.y = y;
    }

    shoot() {
        const tipX = this.x + Math.cos(this.angle) * this.width/2;
        const tipY = this.y + Math.sin(this.angle) * this.width/2;
        const pierce = techUpgrades.piercing ? 2 : 0;
        if (upgrades.laser >= 2) {
            const offset = 7;
            return [
                new Laser(
                    this.x + Math.cos(this.angle) * this.width/2 - Math.sin(this.angle) * offset,
                    this.y + Math.sin(this.angle) * this.width/2 + Math.cos(this.angle) * offset,
                    this.angle,
                    upgrades.laser,
                    { pierce }
                ),
                new Laser(
                    this.x + Math.cos(this.angle) * this.width/2 + Math.sin(this.angle) * offset,
                    this.y + Math.sin(this.angle) * this.width/2 - Math.cos(this.angle) * offset,
                    this.angle,
                    upgrades.laser,
                    { pierce }
                )
            ];
        }
        return [new Laser(tipX, tipY, this.angle, upgrades.laser, { pierce })];
    }

    getCollisionRadius() {
        return this.width * 0.28;
    }
    getXpRadius() {
        return this.width * 0.5;
    }
}

export { Ship };