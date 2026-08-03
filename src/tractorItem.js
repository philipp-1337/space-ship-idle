import { drawPixelSprite, makePixelSprite, makeFlashSprite } from './pixelArt.js';
import { COLORS } from './constants.js';

// Ein einfaches Sprite für das Tractor Pulse Item (Magnet-Symbol)
const tractorPalette = ['#3a0a0a', '#c62828', '#ff6a3d', '#ffffff'];
const tractorSprite = makePixelSprite(
    12, 12,
    tractorPalette,
    '#ffffff',
    (ctx) => {
        // Magnet-U-Form
        ctx.fillStyle = '#c62828';
        ctx.fillRect(2, 2, 3, 7); // Linker Zinken
        ctx.fillRect(7, 2, 3, 7); // Rechter Zinken
        ctx.fillRect(2, 6, 8, 3); // Verbindung unten
        
        // Highlights für Plastizität
        ctx.fillStyle = '#ff6a3d';
        ctx.fillRect(3, 2, 1, 4);
        ctx.fillRect(8, 2, 1, 4);
        ctx.fillRect(3, 7, 6, 1);
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
        
        // Glow effect (dunkelrot)
        ctx.shadowColor = '#c62828';
        ctx.shadowBlur = 10 + Math.sin(performance.now() / 150) * 5;
        
        drawPixelSprite(ctx, tractorSprite, this.radius * 2, this.radius * 2);
        ctx.restore();
    }
}

export default TractorItem;
