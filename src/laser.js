import { makePixelSprite, drawPixelSprite } from './pixelArt.js';
import { getDamageMultiplier } from './upgrades.js';
import { GAME_CONFIG } from './constants.js';

// Kleine, gestreckte Pixel-Art-Bolzen mit heißem Kern, in drei Farbstufen je
// nach Laser-Upgrade-Level (spiegelt den bestehenden COLORS.LASER_UPGRADED-Cutoff
// bei Level 3 wider, plus eine neue "Plasma"-Stufe ab Level 6).
const BOLT_W = 16, BOLT_H = 6;

function buildBoltSprite(outerColor, midColor, coreColor, outlineColor) {
    return makePixelSprite(BOLT_W, BOLT_H, [outerColor, midColor, coreColor], outlineColor, (ctx) => {
        ctx.fillStyle = outerColor;
        ctx.beginPath();
        ctx.moveTo(0, BOLT_H * 0.5);
        ctx.lineTo(BOLT_W * 0.18, 0);
        ctx.lineTo(BOLT_W * 0.85, 0);
        ctx.lineTo(BOLT_W, BOLT_H * 0.5);
        ctx.lineTo(BOLT_W * 0.85, BOLT_H);
        ctx.lineTo(BOLT_W * 0.18, BOLT_H);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = midColor;
        ctx.fillRect(BOLT_W * 0.18, BOLT_H * 0.2, BOLT_W * 0.7, BOLT_H * 0.6);

        ctx.fillStyle = coreColor;
        ctx.fillRect(BOLT_W * 0.28, BOLT_H * 0.38, BOLT_W * 0.58, BOLT_H * 0.24);
    });
}

const BOLT_TIERS = [
    { minLevel: 0, sprite: buildBoltSprite('#c62828', '#ff6a3d', '#fff3c4', '#3a0a0a'), glow: 'red' },
    { minLevel: 3, sprite: buildBoltSprite('#0aa3c2', '#4fe0ff', '#eafcff', '#052b33'), glow: 'cyan' },
    { minLevel: 6, sprite: buildBoltSprite('#c99a1a', '#ffd23f', '#fff9e0', '#3a2a00'), glow: '#ffd23f' }
];

function tierFor(upgradeLevel) {
    let tier = BOLT_TIERS[0];
    for (const t of BOLT_TIERS) {
        if (upgradeLevel >= t.minLevel) tier = t;
    }
    return tier;
}

class Laser {
    constructor(x, y, angle, upgradeLevel = 0, options = {}) {
        this.x = x;
        this.y = y;
        // Bolzen wächst leicht mit dem Upgrade-Level, um die wachsende Feuerkraft sichtbar zu machen
        this.width = 12 + Math.min(upgradeLevel, 8);
        this.height = 5;
        // Startgeschwindigkeit niedriger, Upgrade-Skalierung langsam
        this.speed = Math.min(6 + upgradeLevel * 1.2, GAME_CONFIG.MAX_LASER_PROJECTILE_SPEED);
        this.angle = angle;
        this.isActive = true;
        this.upgradeLevel = upgradeLevel;
        this.pierceRemaining = options.pierce || 0;
        // Merkt sich bereits getroffene Gegner: ein Laser überlappt oft mehrere Frames
        // lang denselben Gegner, bevor er dessen Trefferradius physisch verlässt.
        this.hitEnemies = new Set();
        this.tier = tierFor(upgradeLevel);

        // Schaden berechnen basierend auf Basisschaden, Upgrade-Level und aktivem Overdrive-Buff
        // Annahme: window.BASE_LASER_DAMAGE ist in main.js gesetzt
        const baseDamage = (typeof window !== 'undefined' && window.BASE_LASER_DAMAGE) ? window.BASE_LASER_DAMAGE : 1;
        // Reduzierte kompoundierte Steigerung: z.B. 5% pro Level
        this.damage = baseDamage * Math.pow(1.10, this.upgradeLevel) * getDamageMultiplier();
    }

    update(canvasWidth, canvasHeight, dt = 1) {
        this.prevX = this.x;
        this.prevY = this.y;
        this.x += Math.cos(this.angle) * this.speed * dt;
        this.y += Math.sin(this.angle) * this.speed * dt;
        if (this.x < 0 || this.x > canvasWidth || this.y < 0 || this.y > canvasHeight) {
            this.isActive = false;
        }
    }

    draw(ctx) {
        if (this.isActive) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);

            // Kurzer, verblassender Bewegungsschweif hinter dem Bolzen.
            // Gradient wird EINMAL pro Tier gecacht statt pro Laser und Frame neu
            // erzeugt — createLinearGradient() ist eine der teureren Canvas-Ops,
            // und mit Auto-Fire/Rapid-Fire/Overdrive können viele Laser gleichzeitig
            // unterwegs sein. Referenzlänge ist fix (24px); bei den paar Pixeln
            // Unterschied durch die Upgrade-abhängige Bolzenlänge fällt das nicht auf.
            const tailLen = this.width * 1.6;
            if (!this.tier.trailGradient) {
                const grad = ctx.createLinearGradient(-24, 0, 0, 0);
                grad.addColorStop(0, 'rgba(255,255,255,0)');
                grad.addColorStop(1, this.tier.glow);
                this.tier.trailGradient = grad;
            }
            ctx.globalAlpha = 0.35;
            ctx.fillStyle = this.tier.trailGradient;
            ctx.fillRect(-tailLen, -this.height / 2, tailLen, this.height);
            ctx.globalAlpha = 1;

            drawPixelSprite(ctx, this.tier.sprite, this.width, this.height);
            ctx.restore();
        }
    }

    checkCollision(enemy) {
        // Simple circle collision
        const dx = this.x - enemy.x;
        const dy = this.y - enemy.y;
        return this.isActive && enemy.alive && Math.sqrt(dx*dx + dy*dy) < (enemy.size / 2);
    }
}

export default Laser;
