// Plasmazellen-Objekt für Idle-Game-Mechanik
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
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = 'aqua';
            ctx.shadowBlur = 16;
            ctx.shadowColor = 'cyan';
            ctx.fill();
            ctx.restore();
        }
    }

    collect() {
        this.collected = true;
    }
}

export default PlasmaCell;
