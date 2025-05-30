// homingMissile.js
// Modul für Lenkraketen

export default class HomingMissile {
    constructor(x, y, target, options = {}) {
        this.x = x;
        this.y = y;
        this.radius = options.radius || 7;
        this.speed = options.speed || 2.2;
        this.angle = options.angle || 0;
        this.target = target;
        this.turnSpeed = options.turnSpeed || 0.045; // wie stark die Rakete sich pro Frame drehen kann
        this.life = options.life || 220;
        this.exploded = false;
        this.explosionRadius = options.explosionRadius || 60;
        this.damage = options.damage || 6;
        this.color = options.color || 'orange';
        this.trail = [];
        this.trailMax = 12;
        this.orbitPhase = Math.random() * Math.PI * 2;
        this.orbitRadius = options.orbitRadius || 48 + Math.random()*16;
    }

    update(enemies) {
        if (this.exploded) return;
        if (!this.target || !this.target.alive) {
            // Suche neuen Ziel-Gegner
            let closest = null, minDist = Infinity;
            for (const e of enemies) {
                if (e.alive) {
                    const dx = e.x - this.x;
                    const dy = e.y - this.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    if (dist < minDist) {
                        minDist = dist;
                        closest = e;
                    }
                }
            }
            this.target = closest;
            if (!this.target) return;
        }
        // Kreisbahn um Ziel
        this.orbitPhase += 0.13;
        const tx = this.target.x + Math.cos(this.orbitPhase) * this.orbitRadius;
        const ty = this.target.y + Math.sin(this.orbitPhase) * this.orbitRadius;
        const desiredAngle = Math.atan2(ty - this.y, tx - this.x);
        let da = desiredAngle - this.angle;
        while (da > Math.PI) da -= 2 * Math.PI;
        while (da < -Math.PI) da += 2 * Math.PI;
        this.angle += Math.max(-this.turnSpeed, Math.min(this.turnSpeed, da));
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        this.life--;
        // Trail
        this.trail.push({x: this.x, y: this.y});
        if (this.trail.length > this.trailMax) this.trail.shift();
    }

    draw(ctx) {
        if (this.exploded) return;
        ctx.save();
        ctx.globalAlpha = 0.95;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(this.radius, 0);
        ctx.lineTo(-this.radius, -this.radius*0.6);
        ctx.lineTo(-this.radius*0.7, 0);
        ctx.lineTo(-this.radius, this.radius*0.6);
        ctx.closePath();
        ctx.fill();
        // Trail
        ctx.globalAlpha = 0.4;
        ctx.strokeStyle = 'yellow';
        ctx.beginPath();
        for (let i = 0; i < this.trail.length; i++) {
            const p = this.trail[i];
            if (i === 0) ctx.moveTo(p.x-this.x, p.y-this.y);
            else ctx.lineTo(p.x-this.x, p.y-this.y);
        }
        ctx.stroke();
        ctx.restore();
    }

    explode(ctx, enemies) {
        this.exploded = true;
        // Zeichne Explosion (optional, kann im GameLoop gemacht werden)
        if (ctx) {
            ctx.save();
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.explosionRadius, 0, Math.PI*2);
            ctx.fillStyle = 'rgba(255,180,0,0.3)';
            ctx.fill();
            ctx.restore();
        }
        // Schaden an Gegnern im Radius
        for (const e of enemies) {
            if (e.alive) {
                const dx = e.x - this.x;
                const dy = e.y - this.y;
                if (Math.sqrt(dx*dx + dy*dy) < this.explosionRadius + (e.size/2)) {
                    e.hp -= this.damage;
                    if (e.hp <= 0) e.destroy();
                }
            }
        }
    }
}
