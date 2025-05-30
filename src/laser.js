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

        // Schaden berechnen basierend auf Basisschaden und Upgrade-Level
        // Annahme: window.BASE_LASER_DAMAGE ist in main.js gesetzt
        const baseDamage = (typeof window !== 'undefined' && window.BASE_LASER_DAMAGE) ? window.BASE_LASER_DAMAGE : 1;
        // Stärkere kompoundierte Steigerung: 10% pro Level (oder z.B. 15% additiv: baseDamage * (1 + 0.15 * this.upgradeLevel))
        this.damage = baseDamage * Math.pow(1.10, this.upgradeLevel);
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