// filepath: /Users/philippkanter/Developer/space-ship-idle/src/xp.js
import { makePixelSprite } from './pixelArt.js';

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

// shadowBlur is expensive when it is evaluated once per orb and frame. Build
// the few visual variants once and draw them as regular bitmaps instead.
const orbRenderCache = new Map();
const ORB_GLOW_MARGIN = 7;

function getOrbRenderSprite(radius, isBossOrb, isDense) {
    const key = `${radius}:${isBossOrb ? 'boss' : (isDense ? 'dense' : 'normal')}`;
    let cached = orbRenderCache.get(key);
    if (cached) return cached;

    const size = Math.ceil((radius + ORB_GLOW_MARGIN) * 2);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const renderCtx = canvas.getContext('2d');
    renderCtx.shadowBlur = ORB_GLOW_MARGIN;
    renderCtx.shadowColor = isBossOrb ? '#ffd23f' : (isDense ? '#ff6600' : '#ffd23f');
    renderCtx.imageSmoothingEnabled = false;
    const sprite = isBossOrb ? xpSprite : (isDense ? denseXpSprite : xpSprite);
    renderCtx.drawImage(sprite, (size - radius * 2) / 2, (size - radius * 2) / 2, radius * 2, radius * 2);
    cached = { canvas, size };
    orbRenderCache.set(key, cached);
    return cached;
}

class XP {
    constructor(x, y, value = 1, isBossOrb = false) {
        this.x = x;
        this.y = y;
        this.value = value;
        this.isBossOrb = isBossOrb;
        this.radius = isBossOrb ? 12 : (value > 15 ? 12 : (value > 1 ? 8 : 7));
        this.collected = false;
    }

    draw(ctx, pulse = 0.85 + 0.15 * Math.sin(Date.now() / 300)) {
        if (!this.collected) {
            // Keep the pulse, but scale a pre-rendered glow bitmap instead of
            // invoking shadowBlur for every orb on every frame.
            const renderSprite = getOrbRenderSprite(this.radius, this.isBossOrb, this.value > 1);
            const drawSize = renderSprite.size * pulse;
            const halfDrawSize = drawSize / 2;
            // Orbs can remain just outside the viewport after camera movement;
            // they still participate in magnet/collection logic, but need no
            // raster work until they can actually be seen.
            if (this.x + halfDrawSize < 0 || this.x - halfDrawSize > ctx.canvas.width ||
                this.y + halfDrawSize < 0 || this.y - halfDrawSize > ctx.canvas.height) return;
            ctx.drawImage(renderSprite.canvas, this.x - halfDrawSize, this.y - halfDrawSize, drawSize, drawSize);
        }
    }

    collect() {
        this.collected = true;
    }
}

export default XP;
