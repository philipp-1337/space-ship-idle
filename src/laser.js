class Laser {
    constructor(x, y, angle, upgradeLevel = 0) {
        this.x = x;
        this.y = y;
        this.width = 10;
        this.height = 2;
        // Startgeschwindigkeit niedriger, Upgrade-Skalierung langsam
        this.speed = 6 + upgradeLevel * 1.2;
        this.angle = angle;
        this.isActive = true;
        this.upgradeLevel = upgradeLevel;
    }

    update() {
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        if (this.x < 0 || this.x > window.innerWidth || this.y < 0 || this.y > window.innerHeight) {
            this.isActive = false;
        }
    }

    draw(ctx) {
        if (this.isActive) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);
            // Farbe erst ab Upgrade 3 cyan
            ctx.fillStyle = this.upgradeLevel >= 3 ? 'cyan' : 'red';
            ctx.fillRect(0, -this.height/2, this.width, this.height);
            ctx.restore();
        }
    }

    checkCollision(enemy) {
        // Simple circle collision
        const dx = this.x - enemy.x;
        const dy = this.y - enemy.y;
        return this.isActive && enemy.alive && Math.sqrt(dx*dx + dy*dy) < (enemy.size / 2);
    }
}

export default Laser;