const ENEMY_TYPES = [
    {
        name: 'triangle',
        minLevel: 1,
        shape: 'triangle',
        baseHp: 1,
        baseSpeed: 0.7,
        color: 'darkred',
    },
    {
        name: 'square',
        minLevel: 5,
        shape: 'square',
        baseHp: 3,
        baseSpeed: 0.6,
        color: 'darkblue',
    },
    {
        name: 'pentagon',
        minLevel: 10,
        shape: 'pentagon',
        baseHp: 7,
        baseSpeed: 0.5,
        color: 'darkgreen',
    },
    {
        name: 'shooter',
        minLevel: 18,
        shape: 'circle',
        baseHp: 10,
        baseSpeed: 0.45,
        color: 'purple',
        canShoot: true
    }
];

class Enemy {
    constructor(x, y, level = 1) {
        // Typ nach Level bestimmen
        const availableTypes = ENEMY_TYPES.filter(t => level >= t.minLevel);
        const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];
        this.type = type;
        this.x = x;
        this.y = y;
        this.size = 30;
        // HP skaliert mit Spielerlevel: 10% kompoundierte Steigerung pro Spielerlevel über 1
        // level ist hier das aktuelle Spielerlevel
        this.hp = Math.max(1, Math.round(type.baseHp * Math.pow(1.10, level - 1)));
        this.maxHp = this.hp;
        this.color = type.color;
        this.alive = true;
        this.exploding = false;
        this.explosionFrame = 0;
        this.maxExplosionFrames = 14;
        this.particles = [];
        this.canShoot = !!type.canShoot;
        this.shootCooldown = 0;
        // Speed-Skalierung bleibt wie zuvor oder kann angepasst werden
        this.speed = type.baseSpeed * (1 + Math.floor((level-1)/10) * 0.01);

        // Für Hit-Flash
        this.isHit = false;
        this.hitTimer = 0;
        this.hitDuration = 6; // Dauer des Flashes in Frames
    }

    update(shipX, shipY) {
        if (this.exploding) {
            this.explosionFrame++;
            // Partikel animieren
            this.particles.forEach(p => {
                p.x += Math.cos(p.angle) * p.speed;
                p.y += Math.sin(p.angle) * p.speed;
                p.life--;
            });
            this.particles = this.particles.filter(p => p.life > 0);
            if (this.explosionFrame === 1) {
                // Partikel erzeugen (nur beim Start der Explosion)
                for (let i = 0; i < 16; i++) {
                    this.particles.push({
                        x: 0,
                        y: 0,
                        angle: Math.random() * Math.PI * 2,
                        speed: 1.5 + Math.random() * 2.5,
                        color: i % 2 === 0 ? 'orange' : 'yellow',
                        size: 2 + Math.random() * 2,
                        life: 10 + Math.random() * 10
                    });
                }
                // --- Neue Funken/Partikel für Explosionseffekt ---
                for (let i = 0; i < 22; i++) {
                    this.particles.push({
                        x: 0,
                        y: 0,
                        angle: Math.random() * Math.PI * 2,
                        speed: 2.2 + Math.random() * 2.8,
                        color: ['#fff200','#ff9800','#ff3c00','#ffeedd','#ffd700'][Math.floor(Math.random()*5)],
                        size: 1.5 + Math.random() * 2.5,
                        life: 14 + Math.random() * 16
                    });
                }
            }
            if (this.explosionFrame > this.maxExplosionFrames && this.particles.length === 0) {
                this.alive = false;
            }
            return;
        }

        if (this.hitTimer > 0) {
            this.hitTimer--;
            if (this.hitTimer === 0) {
                this.isHit = false;
            }
        }
        if (this.alive) {
            // Bewegung
            const angle = Math.atan2(shipY - this.y, shipX - this.x);
            const dx = Math.cos(angle) * this.speed;
            const dy = Math.sin(angle) * this.speed;
            this.x += dx * 0.5;
            this.y += dy * 0.5;
            // Shooter-Logik
            if (this.canShoot && this.shootCooldown <= 0) {
                // TODO: Implementiere Schusslogik (z.B. alle 2.5s schießen)
                this.shootCooldown = 150 + Math.random()*60;
                if (typeof window !== 'undefined' && window.spawnEnemyLaser) {
                    window.spawnEnemyLaser(this.x, this.y, angle);
                }
            }
            if (this.canShoot && this.shootCooldown > 0) {
                this.shootCooldown--;
            }
        }
    }

    draw(ctx) {
        if (this.exploding) {
            ctx.save();
            ctx.globalAlpha = 1 - this.explosionFrame / this.maxExplosionFrames;
            ctx.translate(this.x, this.y);
            // Feuer-Effekt: kleiner, mit Farbverlauf
            const r = this.size/2 + this.explosionFrame * 1.1;
            let grad = ctx.createRadialGradient(0,0,0, 0,0,r);
            grad.addColorStop(0, 'yellow');
            grad.addColorStop(0.4, 'orange');
            grad.addColorStop(1, 'rgba(80,0,0,0)');
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI*2);
            ctx.fillStyle = grad;
            ctx.fill();
            // Partikel
            this.particles.forEach(p => {
                ctx.save();
                ctx.globalAlpha = Math.max(0, p.life/20);
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
                ctx.fill();
                ctx.restore();
            });
            ctx.restore();
            return;
        }
        if (this.alive) {
            ctx.save();
            ctx.translate(this.x, this.y);

            if (this.isHit && this.hitTimer > 0) {
                ctx.fillStyle = 'white'; // Flash-Farbe
            } else {
                ctx.fillStyle = this.color;
            }

            // Verschiedene Formen je nach Typ
            if (this.type.shape === 'triangle') {
                ctx.beginPath();
                ctx.moveTo(0, -this.size / 2);
                ctx.lineTo(-this.size / 2, this.size / 2);
                ctx.lineTo(this.size / 2, this.size / 2);
                ctx.closePath();
                ctx.fill();
            } else if (this.type.shape === 'square') {
                ctx.fillRect(-this.size/2, -this.size/2, this.size, this.size);
            } else if (this.type.shape === 'pentagon') {
                ctx.beginPath();
                for (let i = 0; i < 5; i++) {
                    const angle = -Math.PI/2 + i * 2*Math.PI/5;
                    ctx.lineTo(Math.cos(angle)*this.size/2, Math.sin(angle)*this.size/2);
                }
                ctx.closePath();
                ctx.fill();
            } else if (this.type.shape === 'circle') {
                ctx.beginPath();
                ctx.arc(0, 0, this.size/2, 0, Math.PI*2);
                ctx.fill();
            }
            // HP-Balken
            if (this.maxHp > 1) {
                ctx.fillStyle = 'black'; // HP-Balken Hintergrundfarbe explizit setzen
                ctx.fillRect(-this.size/2, -this.size/2-8, this.size, 5);
                ctx.fillStyle = 'lime'; // HP-Balken Füllfarbe explizit setzen
                ctx.fillRect(-this.size/2, -this.size/2-8, this.size * (this.hp/this.maxHp), 5);
            }
            ctx.restore();
        }
        // --- DEBUG: Hitboxen anzeigen ---
        // Laser-Hitbox (groß, orange)
        ctx.save();
        ctx.globalAlpha = 0.4;
        ctx.strokeStyle = 'orange';
        const laserHitbox = this.size * 0.7;
        ctx.beginPath();
        ctx.arc(this.x, this.y, laserHitbox, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        // Kollisions-Hitbox (klein, rot)
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = 'red';
        const collisionHitbox = this.size * 0.38;
        ctx.beginPath();
        ctx.arc(this.x, this.y, collisionHitbox, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    checkCollision(ship) {
        // Kleine Hitbox für Kollision mit Schiff
        const dx = this.x - ship.x;
        const dy = this.y - ship.y;
        const enemyCollisionHitbox = this.size * 0.38;
        const shipCollisionHitbox = ship.width * 0.28;
        return Math.sqrt(dx*dx + dy*dy) < enemyCollisionHitbox + shipCollisionHitbox;
    }

    checkLaserHit(laser) {
        // Große Hitbox für Lasertreffer
        const dx = this.x - laser.x;
        const dy = this.y - laser.y;
        const enemyLaserHitbox = this.size * 0.7;
        const hit = Math.sqrt(dx*dx + dy*dy) < enemyLaserHitbox;
        if (this.alive && hit) {
            if (!this.isHit) { // Verhindere, dass mehrere Laser im selben Frame den Flash neu auslösen
                this.hp -= laser.damage; // Schaden des Lasers verwenden
                this.hp = Math.max(0, this.hp); // Verhindere negative HP
                if (this.hp <= 0) {
                    this.destroy();
                } else {
                    this.isHit = true;
                    this.hitTimer = this.hitDuration;
                }
            }
            return true; // Treffer registriert
        }
        return false;
    }

    destroy() {
        if (!this.exploding) {
            this.exploding = true;
            this.explosionFrame = 0;
        }
    }
}

export default Enemy;