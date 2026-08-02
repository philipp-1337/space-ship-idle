// Plasmazellen-Objekt für Idle-Game-Mechanik
import { makePixelSprite, drawPixelSprite } from './pixelArt.js';

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

class PlasmaCell {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 8;
        this.collected = false;
    }

    draw(ctx) {
        if (!this.collected) {
            ctx.save();
            // Radius bewusst klein gehalten — shadowBlur ist pro Aufruf teuer
            // (besonders in Chrome), und Plasmazellen können sich ansammeln.
            ctx.shadowBlur = 7;
            ctx.shadowColor = 'cyan';
            ctx.translate(this.x, this.y);
            drawPixelSprite(ctx, plasmaSprite, this.radius * 2, this.radius * 2);
            ctx.restore();
        }
    }

    collect() {
        this.collected = true;
    }
}

export default PlasmaCell;
