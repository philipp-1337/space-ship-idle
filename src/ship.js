import Laser from './laser.js';
import { upgrades } from './upgrades.js'; // Importiere das upgrades Objekt
import { makePixelSprite, drawPixelSprite } from './pixelArt.js';

// Pixel-art Schiffsgrafik im Space-Shuttle-Stil: schlanker weißer Rumpf,
// schwarze Nasenkappe, weit hinten sitzende Delta-Flügel und ein Seitenleitwerk.
const SHIP_X_MIN = -22, SHIP_X_MAX = 20, SHIP_Y_MIN = -19, SHIP_Y_MAX = 19;
const SHIP_DISPLAY_W = SHIP_X_MAX - SHIP_X_MIN;
const SHIP_DISPLAY_H = SHIP_Y_MAX - SHIP_Y_MIN;
const SHIP_SPRITE_W = 18, SHIP_SPRITE_H = 16;

const shipSprite = makePixelSprite(
    SHIP_SPRITE_W, SHIP_SPRITE_H,
    ['#2b2d31', '#d7dbe0', '#f2f3f5', '#8b8f97', '#1f3a52', '#8fe0ff'],
    '#0d0e10',
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

        // Triebwerksgehäuse (Heck, symmetrisch für den Triebwerksstrahl)
        [-1, 1].forEach(side => {
            path([
                [-19, side * 2.6], [-15, side * 2.6], [-15, side * 4.4], [-19, side * 4.4],
            ], '#2b2d31');
        });

        // Delta-Flügel (weit hinten am Rumpf, stark gepfeilt)
        [-1, 1].forEach(side => {
            path([
                [4, side * 4.2], [-11, side * 17], [-15, side * 4.6],
            ], '#d7dbe0');
        });

        // Seitenleitwerk (Heckflosse)
        path([
            [-15, -2.2], [-21, 0], [-15, 2.2],
        ], '#2b2d31');

        // Rumpf
        path([
            [16, -3.8], [-15, -4.2], [-15, 4.2], [16, 3.8],
        ], '#d7dbe0');

        // Rumpf-Highlight (oben)
        path([
            [16, -3.8], [-15, -4.2], [-15, -2], [15, -2],
        ], '#f2f3f5');

        // Rumpf-Schatten (unten, Hitzekachel-Andeutung)
        path([
            [15, 2], [-15, 2], [-15, 4.2], [16, 3.8],
        ], '#8b8f97');

        // Schwarze Nasenkappe
        path([
            [19, 0], [16, -3.5], [16, 3.5],
        ], '#2b2d31');

        // Cockpitfenster
        ctx.fillStyle = '#1f3a52';
        ctx.beginPath();
        ctx.ellipse(mx(12), my(0), 1.6, 1.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#8fe0ff';
        ctx.beginPath();
        ctx.arc(mx(12.6), my(-0.6), 0.6, 0, Math.PI * 2);
        ctx.fill();
    }
);

class Ship {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 40; // Vergrößert für ein imposanteres Schiff
        this.height = 28; // Vergrößert für ein imposanteres Schiff
        this.angle = 0;
        this.speed = 5;
        // Explosion
        this.isExploding = false;
        this.explosionFrame = 0;
        this.maxExplosionFrames = 24;
        this.particles = [];
        this.thrustState = 'none'; // 'none', 'forward', 'backward'
    }

    update() {
        if (this.isExploding) {
            this.explosionFrame++;
            // Partikel animieren
            this.particles.forEach(p => {
                p.x += Math.cos(p.angle) * p.speed;
                p.y += Math.sin(p.angle) * p.speed;
                p.life--;
            });
            this.particles = this.particles.filter(p => p.life > 0);
        }
    }

    explode() {
        if (this.isExploding) return;
        this.isExploding = true;
        this.explosionFrame = 0;
        this.particles = [];
        for (let i = 0; i < 22; i++) {
            this.particles.push({
                x: 0,
                y: 0,
                angle: Math.random() * Math.PI * 2,
                speed: 2 + Math.random() * 2.5,
                color: i % 2 === 0 ? 'orange' : 'yellow',
                size: 2 + Math.random() * 2,
                life: 14 + Math.random() * 12
            });
        }
    }

    draw(ctx) {
        if (this.isExploding) {
            ctx.save();
            // Glow nur in den ersten 60% der Explosion anzeigen
            const glowCutoff = Math.floor(this.maxExplosionFrames * 0.6);
            if (this.explosionFrame < glowCutoff) {
                ctx.globalAlpha = 1 - this.explosionFrame / glowCutoff;
                ctx.translate(this.x, this.y);
                // Explosionseffekt (Feuerball)
                const r = this.width/2 + this.explosionFrame * 1.2;
                let grad = ctx.createRadialGradient(0,0,0, 0,0,r);
                grad.addColorStop(0, 'yellow');
                grad.addColorStop(0.4, 'orange');
                grad.addColorStop(1, 'rgba(80,0,0,0)');
                ctx.beginPath();
                ctx.arc(0, 0, r, 0, Math.PI*2);
                ctx.fillStyle = grad;
                ctx.fill();
                ctx.globalAlpha = 1;
            } else {
                ctx.translate(this.x, this.y);
            }
            // Partikel
            this.particles.forEach(p => {
                ctx.save();
                ctx.globalAlpha = Math.max(0, p.life/20);
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
                ctx.fill();
                ctx.restore();
            });
            ctx.restore();
            return;
        }
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Triebwerke (Positionsberechnung für den Triebwerksstrahl, Gehäuse ist Teil des Sprites)
        const nacelleLength = 4;      // Länge des Triebwerkgehäuses im Sprite
        const nacelleThickness = 1.8; // Dicke des Gehäuses im Sprite
        const nacelleOffsetY = 3.5;   // Y-Abstand von der Schiffsmitte im Sprite
        const nacelleStartX = -19;    // Beginnt am Heck des Rumpfes im Sprite

        // Pixel-Art Rumpf, Flügel und Triebwerksgehäuse
        drawPixelSprite(ctx, shipSprite, SHIP_DISPLAY_W, SHIP_DISPLAY_H);

        // Triebwerksstrahl/-glühen basierend auf thrustState
        if (this.thrustState === 'forward') {
            ctx.save();
            ctx.shadowBlur = 18;
            ctx.shadowColor = 'orangered';
            ctx.fillStyle = 'orangered';
            const glowDepth = nacelleLength * 0.8; // Etwas längerer Strahl
            const glowThickness = nacelleThickness * 0.85; // Etwas dickerer Strahl
            // Oberer Strahl
            ctx.fillRect(nacelleStartX + nacelleLength, -nacelleOffsetY - glowThickness / 2, glowDepth, glowThickness);
            // Unterer Strahl
            ctx.fillRect(nacelleStartX + nacelleLength, nacelleOffsetY - glowThickness / 2, glowDepth, glowThickness);
            ctx.restore();
        } else if (this.thrustState === 'backward') {
            ctx.save();
            ctx.shadowBlur = 14;
            ctx.shadowColor = 'lightblue';
            ctx.fillStyle = 'lightblue'; // Andere Farbe für Rückwärtsschub
            const glowDepth = nacelleLength * 0.5; // Kürzerer Strahl
            const glowThickness = nacelleThickness * 0.7; // Etwas schmalerer Strahl
            // Oberer Strahl (Rückwärts)
            ctx.fillRect(nacelleStartX + nacelleLength, -nacelleOffsetY - glowThickness / 2, glowDepth, glowThickness);
            // Unterer Strahl (Rückwärts)
            ctx.fillRect(nacelleStartX + nacelleLength, nacelleOffsetY - glowThickness / 2, glowDepth, glowThickness);
            ctx.restore();
        }

        ctx.restore();
    }

    moveTo(x, y) {
        this.x = x;
        this.y = y;
    }

    shoot() {
        // Laser spawns at tip of ship
        const tipX = this.x + Math.cos(this.angle) * this.width/2;
        const tipY = this.y + Math.sin(this.angle) * this.width/2;
        // Laser-Upgrade: Doppellaser ab Level 2
        if (upgrades.laser >= 2) { // Verwende das importierte upgrades Objekt
            // Zwei Laser leicht versetzt
            const offset = 7;
            return [
                new Laser(
                    this.x + Math.cos(this.angle) * this.width/2 - Math.sin(this.angle) * offset,
                    this.y + Math.sin(this.angle) * this.width/2 + Math.cos(this.angle) * offset,
                    this.angle,
                    upgrades.laser // Verwende das importierte upgrades Objekt
                ),
                new Laser(
                    this.x + Math.cos(this.angle) * this.width/2 + Math.sin(this.angle) * offset,
                    this.y + Math.sin(this.angle) * this.width/2 - Math.cos(this.angle) * offset,
                    this.angle,
                    upgrades.laser // Verwende das importierte upgrades Objekt
                )
            ];
        }
        return [new Laser(tipX, tipY, this.angle, upgrades.laser)]; // Verwende das importierte upgrades Objekt
    }

    getCollisionRadius() {
        return this.width * 0.28;
    }
    getXpRadius() {
        return this.width * 0.5;
    }
}

export { Ship };