// Turns normal (anti-aliased) canvas vector drawings into crisp retro pixel-art
// sprites: draw shapes at a small internal resolution, then snap colors to a
// fixed palette and alpha to hard on/off, and add a 1px outline. The result is
// cached and scaled up with nearest-neighbor at render time for a blocky look.

const ALPHA_THRESHOLD = 128;

function hexToRgb(hex) {
    const n = parseInt(hex.replace('#', ''), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function nearestColor(r, g, b, paletteRgb) {
    let best = paletteRgb[0], bestDist = Infinity;
    for (const p of paletteRgb) {
        const dr = r - p.r, dg = g - p.g, db = b - p.b;
        const dist = dr * dr + dg * dg + db * db;
        if (dist < bestDist) { bestDist = dist; best = p; }
    }
    return best;
}

function makePixelSprite(width, height, palette, outlineColor, drawFn) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    drawFn(ctx, width, height);

    const paletteRgb = palette.map(hexToRgb);
    const img = ctx.getImageData(0, 0, width, height);
    const data = img.data;
    const mask = new Uint8Array(width * height);

    for (let i = 0; i < width * height; i++) {
        const a = data[i * 4 + 3];
        if (a < ALPHA_THRESHOLD) {
            data[i * 4 + 3] = 0;
        } else {
            const c = nearestColor(data[i * 4], data[i * 4 + 1], data[i * 4 + 2], paletteRgb);
            data[i * 4] = c.r; data[i * 4 + 1] = c.g; data[i * 4 + 2] = c.b; data[i * 4 + 3] = 255;
            mask[i] = 1;
        }
    }

    if (outlineColor) {
        const oc = hexToRgb(outlineColor);
        const outlineIdx = [];
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = y * width + x;
                if (mask[i]) continue;
                const hasNeighbor =
                    (x > 0 && mask[i - 1]) ||
                    (x < width - 1 && mask[i + 1]) ||
                    (y > 0 && mask[i - width]) ||
                    (y < height - 1 && mask[i + width]);
                if (hasNeighbor) outlineIdx.push(i);
            }
        }
        outlineIdx.forEach(i => {
            data[i * 4] = oc.r; data[i * 4 + 1] = oc.g; data[i * 4 + 2] = oc.b; data[i * 4 + 3] = 255;
        });
    }

    ctx.putImageData(img, 0, 0);
    return canvas;
}

function makeFlashSprite(sprite, color) {
    const canvas = document.createElement('canvas');
    canvas.width = sprite.width;
    canvas.height = sprite.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(sprite, 0, 0);
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return canvas;
}

// Draws a pre-rendered pixel sprite centered on the current canvas origin,
// scaled to w×h with nearest-neighbor (no smoothing) for crisp pixels.
function drawPixelSprite(ctx, sprite, w, h) {
    const prevSmoothing = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sprite, -w / 2, -h / 2, w, h);
    ctx.imageSmoothingEnabled = prevSmoothing;
}

export { makePixelSprite, makeFlashSprite, drawPixelSprite };
