// Plasmazellen-Objekt für Idle-Game-Mechanik
import { makePixelSprite } from './pixelArt.js';

const PLASMA_SPRITE_RES = 9;
const plasmaSprite = makePixelSprite(
    PLASMA_SPRITE_RES, PLASMA_SPRITE_RES,
    ['#0a8a8a', '#22e6e6', '#c8ffff'],
    '#04302f',
    (ctx) => {
        const c = PLASMA_SPRITE_RES / 2;
        ctx.fillStyle = '#0a8a8a';
        ctx.beginPath();
        ctx.arc(c, c, c - 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#22e6e6';
        ctx.beginPath();
        ctx.arc(c - 0.5, c - 0.5, c - 1.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#c8ffff';
        ctx.beginPath();
        ctx.arc(c - 1.6, c - 1.6, 1.1, 0, Math.PI * 2);
        ctx.fill();
    }
);

const plasmaGlowCanvas = document.createElement('canvas');
plasmaGlowCanvas.width = 30;
plasmaGlowCanvas.height = 30;
const plasmaGlowCtx = plasmaGlowCanvas.getContext('2d');
plasmaGlowCtx.shadowBlur = 7;
plasmaGlowCtx.shadowColor = 'cyan';
plasmaGlowCtx.imageSmoothingEnabled = false;
plasmaGlowCtx.drawImage(plasmaSprite, 7, 7, 16, 16);

class PlasmaCell {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 8;
        this.collected = false;
    }

    draw(ctx) {
        if (!this.collected) {
            const previousSmoothing = ctx.imageSmoothingEnabled;
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(plasmaGlowCanvas, this.x - 15, this.y - 15, 30, 30);
            ctx.imageSmoothingEnabled = previousSmoothing;
        }
    }

    collect() {
        this.collected = true;
    }
}

export default PlasmaCell;
