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
    ['#cc5200', '#ff6600', '#ff9933'],
    '#4d1f00',
    (ctx) => {
        const c = XP_SPRITE_RES / 2;
        ctx.fillStyle = '#cc5200';
        ctx.beginPath();
        ctx.arc(c, c, c - 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ff6600';
        ctx.beginPath();
        ctx.arc(c - 0.4, c - 0.4, c - 1.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ff9933';
        ctx.beginPath();
        ctx.arc(c - 1.4, c - 1.4, 1, 0, Math.PI * 2);
        ctx.fill();
    }
);

class XP {
    constructor(x, y, value = 1, isBossOrb = false) {
        this.x = x;
        this.y = y;
        this.value = value;
        this.isBossOrb = isBossOrb;
        this.radius = isBossOrb ? 12 : (value > 15 ? 12 : (value > 1 ? 8 : 7));
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
            ctx.shadowColor = this.isBossOrb ? '#ffd23f' : (this.value > 1 ? '#ff6600' : '#ffd23f');
            ctx.translate(this.x, this.y);
            const spriteToUse = this.isBossOrb ? xpSprite : (this.value > 1 ? denseXpSprite : xpSprite);
            drawPixelSprite(ctx, spriteToUse, this.radius * 2 * pulse, this.radius * 2 * pulse);
            ctx.restore();
        }
    }

    collect() {
        this.collected = true;
    }
}

export default XP;