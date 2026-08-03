// filepath: /Users/philippkanter/Developer/space-ship-idle/src/xp.js
import { makePixelSprite, drawPixelSprite } from './pixelArt.js';

const XP_SPRITE_RES = 8;
export const xpSprite = makePixelSprite(
    XP_SPRITE_RES, XP_SPRITE_RES,
    ['#c9960c', '#ffd700', '#fff59d'],
    '#5c4400',
    (ctx) => {
        const c = XP_SPRITE_RES / 2;
        ctx.fillStyle = '#c9960c';
        ctx.beginPath();
        ctx.arc(c, c, c - 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(c - 0.4, c - 0.4, c - 1.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff59d';
        ctx.beginPath();
        ctx.arc(c - 1.4, c - 1.4, 1, 0, Math.PI * 2);
        ctx.fill();
    }
);

export const denseXpSprite = makePixelSprite(
    XP_SPRITE_RES, XP_SPRITE_RES,
    ['#990099', '#ff00ff', '#ff99ff'],
    '#330033',
    (ctx) => {
        const c = XP_SPRITE_RES / 2;
        ctx.fillStyle = '#990099';
        ctx.beginPath();
        ctx.arc(c, c, c - 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ff00ff';
        ctx.beginPath();
        ctx.arc(c - 0.4, c - 0.4, c - 1.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ff99ff';
        ctx.beginPath();
        ctx.arc(c - 1.4, c - 1.4, 1, 0, Math.PI * 2);
        ctx.fill();
    }
);

class XP {
    constructor(x, y, value = 1) {
        this.x = x;
        this.y = y;
        this.value = value;
        this.radius = value > 15 ? 12 : (value > 1 ? 8 : 7);
        this.collected = false;
    }

    draw(ctx) {
        if (!this.collected) {
            ctx.save();
            // Sanftes Pulsieren des Glows, damit die Sphäre etwas lebendiger wirkt.
            // Radius bewusst klein (war 18): XP-Orbs können sich zu Dutzenden
            // ansammeln, und shadowBlur ist pro Aufruf teuer, besonders in Chrome.
            const pulse = 0.85 + 0.15 * Math.sin(Date.now() / 300);
            ctx.shadowBlur = 7 * pulse;
            ctx.shadowColor = this.value > 1 ? '#ff00ff' : '#ffd23f';
            ctx.translate(this.x, this.y);
            drawPixelSprite(ctx, this.value > 1 ? denseXpSprite : xpSprite, this.radius * 2 * pulse, this.radius * 2 * pulse);
            ctx.restore();
        }
    }

    collect() {
        this.collected = true;
    }
}

export default XP;