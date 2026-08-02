import { drawPixelSprite, makePixelSprite, makeFlashSprite } from './pixelArt.js';
import { COLORS } from './constants.js';

// Ein einfaches Sprite für das Tractor Pulse Item (z.B. ein violettes oder goldenes Symbol)
const tractorPalette = ['#000000', '#9c27b0', '#e1bee7', '#ffffff'];
const tractorSprite = makePixelSprite(
    12, 12,
    tractorPalette,
    '#ffffff',
    (ctx) => {
        // Ein kleiner Stern oder Magnet-Symbol
        ctx.fillStyle = '#9c27b0';
        ctx.fillRect(4, 0, 4, 12);
        ctx.fillRect(0, 4, 12, 4);
        ctx.fillStyle = '#e1bee7';
        ctx.fillRect(5, 1, 2, 10);
        ctx.fillRect(1, 5, 10, 2);
    }
);

class TractorItem {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 8;
        this.collected = false;
        this.creationTime = performance.now();
    }

    draw(ctx) {
        if (this.collected) return;
        
        ctx.save();
        const floatOffset = Math.sin((performance.now() - this.creationTime) / 200) * 2;
        ctx.translate(this.x, this.y + floatOffset);
        
        // Glow effect
        ctx.shadowColor = '#9c27b0';
        ctx.shadowBlur = 10 + Math.sin(performance.now() / 150) * 5;
        
        drawPixelSprite(ctx, tractorSprite, this.radius * 2, this.radius * 2);
        ctx.restore();
    }
}

export default TractorItem;
