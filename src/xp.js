// filepath: /Users/philippkanter/Developer/space-ship-idle/src/xp.js
class XP {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 7;
        this.collected = false;
    }

    draw(ctx) {
        if (!this.collected) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = 'yellow';
            ctx.fill();
            ctx.restore();
        }
    }

    collect() {
        this.collected = true;
    }
}

export default XP;