import { makePixelSprite } from './pixelArt.js';

const dataPalette = ['#554400', '#ffd23f', '#ffffff'];
const dataSprite = makePixelSprite(
    14, 14,
    dataPalette,
    '#ffffff',
    (ctx) => {
        // Data Drive / Chip shape (rectangular)
        ctx.fillStyle = '#ffd23f';
        ctx.fillRect(3, 4, 8, 6);
        
        // Chip pins / details
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(4, 3, 1, 1);
        ctx.fillRect(6, 3, 1, 1);
        ctx.fillRect(8, 3, 1, 1);
        
        ctx.fillRect(4, 10, 1, 1);
        ctx.fillRect(6, 10, 1, 1);
        ctx.fillRect(8, 10, 1, 1);
        
        // Circuit lines on chip
        ctx.fillStyle = '#554400';
        ctx.fillRect(4, 6, 6, 2);
    }
);

const dataGlowCanvas = document.createElement('canvas');
dataGlowCanvas.width = 36;
dataGlowCanvas.height = 36;
const dataGlowCtx = dataGlowCanvas.getContext('2d');
dataGlowCtx.shadowColor = '#ffd23f';
dataGlowCtx.shadowBlur = 8;
dataGlowCtx.imageSmoothingEnabled = false;
dataGlowCtx.drawImage(dataSprite, 10, 10, 16, 16);

class DataDrop {
    constructor(x, y, amount) {
        this.x = x;
        this.y = y;
        this.amount = amount;
        this.radius = 10;
        this.collected = false;
        this.creationTime = performance.now();
    }

    draw(ctx) {
        if (this.collected) return;
        
        const floatOffset = Math.sin((performance.now() - this.creationTime) / 250) * 2.5;
        const pulse = 0.9 + 0.15 * Math.sin(performance.now() / 120);
        const drawSize = dataGlowCanvas.width * pulse;
        const previousSmoothing = ctx.imageSmoothingEnabled;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(dataGlowCanvas, this.x - drawSize / 2, this.y + floatOffset - drawSize / 2, drawSize, drawSize);
        ctx.imageSmoothingEnabled = previousSmoothing;
    }
}

export default DataDrop;
