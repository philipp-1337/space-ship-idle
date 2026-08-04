import { makePixelSprite } from './pixelArt.js';

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

const tractorGlowCanvas = document.createElement('canvas');
tractorGlowCanvas.width = 36;
tractorGlowCanvas.height = 36;
const tractorGlowCtx = tractorGlowCanvas.getContext('2d');
tractorGlowCtx.shadowColor = '#c62828';
tractorGlowCtx.shadowBlur = 10;
tractorGlowCtx.imageSmoothingEnabled = false;
tractorGlowCtx.drawImage(tractorSprite, 10, 10, 16, 16);

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
        
        const floatOffset = Math.sin((performance.now() - this.creationTime) / 200) * 2;
        const pulse = 0.9 + 0.1 * Math.sin(performance.now() / 150);
        const drawSize = tractorGlowCanvas.width * pulse;
        const previousSmoothing = ctx.imageSmoothingEnabled;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(tractorGlowCanvas, this.x - drawSize / 2, this.y + floatOffset - drawSize / 2, drawSize, drawSize);
        ctx.imageSmoothingEnabled = previousSmoothing;
    }
}

export default TractorItem;
