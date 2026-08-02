import { makePixelSprite, drawPixelSprite } from './pixelArt.js';

const EXPLOSION_ANIMATION_DURATION = 30; 
const EXPLOSION_PARTICLE_COUNT = 35;
const EXPLOSION_SHOCKWAVE_MAX_RADIUS_FACTOR = 1.3; 

// Erweiterte Palette mit Highlight-Grau ('#cdd2da') für mehr Plastizität
const M_X_MIN = -18, M_X_MAX = 18, M_Y_MIN = -12, M_Y_MAX = 12;
const MISSILE_SPRITE_W = 14, MISSILE_SPRITE_H = 10;
const MISSILE_DISPLAY_W = M_X_MAX - M_X_MIN;
const MISSILE_DISPLAY_H = M_Y_MAX - M_Y_MIN;

const missileSprite = makePixelSprite(
    MISSILE_SPRITE_W, MISSILE_SPRITE_H,
    ['#8c1c1c', '#7c8896', '#cdd2da', '#4d5560', '#ff8a3d', '#ffc38a'], 
    '#15181e', // Kühlere, dunkle Outline (wie beim Schiff)
    (ctx) => {
        const mx = x => (x - M_X_MIN) / (M_X_MAX - M_X_MIN) * MISSILE_SPRITE_W;
        const my = y => (y - M_Y_MIN) / (M_Y_MAX - M_Y_MIN) * MISSILE_SPRITE_H;
        const path = (pts, color) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            pts.forEach(([x, y], i) => {
                const px = mx(x), py = my(y);
                if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            });
            ctx.closePath();
            ctx.fill();
        };

        const radius = 7;
        const M_LENGTH = radius * 3.2;
        const M_WIDTH = radius * 1.5;
        const BACK = -M_LENGTH * 0.35;
        const MID = M_LENGTH * 0.3;
        const TIP = M_LENGTH * 0.75;
        const W_BASE = M_WIDTH * 0.65;
        const W_MID = M_WIDTH * 0.25;

        // Heckflossen (Fins)
        const FIN_BACK = BACK - M_LENGTH * 0.15;
        const FIN_WIDE = W_BASE * 1.8;
        const FIN_FRONT = BACK + M_LENGTH * 0.25;

        // Obere Flosse
        path([
            [BACK, -W_BASE * 0.7],
            [FIN_BACK, -FIN_WIDE],
            [FIN_FRONT, -W_BASE * 0.8],
        ], '#8c1c1c');

        // Untere Flosse
        path([
            [BACK, W_BASE * 0.7],
            [FIN_BACK, FIN_WIDE],
            [FIN_FRONT, W_BASE * 0.8],
        ], '#8c1c1c');

        // Rumpf Grundfarbe (konisch)
        path([
            [BACK, -W_BASE],
            [MID, -W_MID],
            [MID, W_MID],
            [BACK, W_BASE],
        ], '#7c8896');
        
        // Rumpf Highlight (Oben) für 3D Look
        path([
            [BACK, -W_BASE],
            [MID, -W_MID],
            [MID, 0],
            [BACK, 0],
        ], '#cdd2da');

        // Rumpf-Schatten (unten)
        path([
            [BACK, W_BASE * 0.4],
            [MID, W_MID * 0.4],
            [MID, W_MID],
            [BACK, W_BASE],
        ], '#4d5560');

        // Nasenspitze (kegelförmig)
        path([
            [MID, -W_MID],
            [TIP, 0],
            [MID, W_MID],
        ], '#ff8a3d');

        // Nasenspitze Highlight
        path([
            [MID, -W_MID],
            [TIP, 0],
            [MID, 0],
        ], '#ffc38a');

    }
);

export default class HomingMissile {
    constructor(x, y, target, options = {}) {
        this.x = x;
        this.y = y;
        this.radius = options.radius || 4; // Reduziert von 7, damit die Rakete im Verhältnis zum Schiff kleiner ist
        this.speed = options.speed || 2.2;
        this.angle = options.angle || 0;
        this.target = target;
        this.turnSpeed = options.turnSpeed || 0.045; 
        this.life = options.life || 240; 
        this.exploded = false; 
        this.explosionRadius = options.explosionRadius || 60;
        this.damage = options.damage || 6;
        this.color = options.color || 'orange';
        
        // Trail wurde zu einem Partikelsystem umgebaut
        this.trailParticles = []; 
        this.orbitPhase = Math.random() * Math.PI * 2;
        this.orbitRadius = options.orbitRadius || 50 + Math.random()*20;

        this.isExploding = false; 
        this.explosionFrame = 0;
        this.maxExplosionFrames = EXPLOSION_ANIMATION_DURATION;
        this.explosionParticles = [];

        this.lostTargetGracePeriod = 0; 
        this.MAX_LOST_TARGET_GRACE_FRAMES = options.maxLostTargetGraceFrames || 90; 
    }

    update(enemies) {
        if (this.isExploding) {
            this.explosionFrame++;
            this.updateExplosionParticles();
            return;
        }
        if (this.exploded) return; 

        if (!this.target || !this.target.alive) {
            this.target = null; 

            let closestNewTarget = null;
            let minDist = Infinity;
            for (const e of enemies) {
                if (e.alive) {
                    const dx = e.x - this.x;
                    const dy = e.y - this.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    if (dist < minDist) {
                        minDist = dist;
                        closestNewTarget = e;
                    }
                }
            }

            if (closestNewTarget) {
                this.target = closestNewTarget;
                this.lostTargetGracePeriod = 0; 
                this.orbitPhase = Math.atan2(this.target.y - this.y, this.target.x - this.x);
            } else {
                this.lostTargetGracePeriod++;
                this.x += Math.cos(this.angle) * this.speed; 
                this.y += Math.sin(this.angle) * this.speed;

                if (this.lostTargetGracePeriod > this.MAX_LOST_TARGET_GRACE_FRAMES) {
                    this.life = 0; 
                }
            }
        }

        if (this.target) {
            this.lostTargetGracePeriod = 0;

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
        }

        this.life--;

        // Blockiger Retro-Trail generieren
        const M_LENGTH = this.radius * 2.8;
        const tailX = this.x - Math.cos(this.angle) * (M_LENGTH * 0.4);
        const tailY = this.y - Math.sin(this.angle) * (M_LENGTH * 0.4);
        
        // Füge jeden Frame ein Trail-Partikel hinzu
        this.trailParticles.push({
            x: tailX + (Math.random() - 0.5) * 2,
            y: tailY + (Math.random() - 0.5) * 2,
            size: 2 + Math.random() * 2,
            life: 15,
            maxLife: 15,
            color: Math.random() > 0.4 ? '#ff8a3d' : '#8c1c1c'
        });

        // Trail updaten
        this.trailParticles.forEach(p => p.life--);
        this.trailParticles = this.trailParticles.filter(p => p.life > 0);
    }

    updateExplosionParticles() {
        this.explosionParticles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            p.alpha = Math.max(0, p.life / p.initialLife);
        });
        this.explosionParticles = this.explosionParticles.filter(p => p.life > 0);
    }

    draw(ctx) {
        if (this.isExploding) {
            this.drawExplosion(ctx);
            return;
        }
        if (this.exploded) return; 

        // Raketenschweif (Pixel-Partikel statt Vektorlinien)
        this.trailParticles.forEach(p => {
            ctx.save();
            ctx.globalAlpha = p.life / p.maxLife;
            ctx.fillStyle = p.color;
            ctx.fillRect(Math.floor(p.x), Math.floor(p.y), Math.floor(p.size), Math.floor(p.size));
            ctx.restore();
        });

        // Rakete zeichnen
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        drawPixelSprite(ctx, missileSprite, MISSILE_DISPLAY_W * (this.radius / 7), MISSILE_DISPLAY_H * (this.radius / 7));

        ctx.restore();
    }

    drawExplosion(ctx) {
        if (!this.isExploding || this.explosionFrame >= this.maxExplosionFrames) return;

        const progress = this.explosionFrame / this.maxExplosionFrames;

        ctx.save();
        ctx.translate(this.x, this.y);

        // 1. Blockiger Haupt-Feuerball (Quadrate statt Kreise/Gradienten)
        const fireballRadius = this.explosionRadius * Math.sin(progress * Math.PI * 0.5); 
        const fireballAlpha = 1 - progress;

        ctx.fillStyle = `rgba(255, 140, 0, ${fireballAlpha})`;
        ctx.fillRect(-fireballRadius, -fireballRadius, fireballRadius * 2, fireballRadius * 2);
        
        ctx.fillStyle = `rgba(255, 215, 0, ${fireballAlpha * 0.9})`;
        ctx.fillRect(-fireballRadius * 0.7, -fireballRadius * 0.7, fireballRadius * 1.4, fireballRadius * 1.4);

        ctx.fillStyle = `rgba(255, 255, 224, ${fireballAlpha * 0.8})`;
        ctx.fillRect(-fireballRadius * 0.3, -fireballRadius * 0.3, fireballRadius * 0.6, fireballRadius * 0.6);

        // 2. Blockige Schockwelle
        if (progress < 0.8) {
            const shockwaveRadius = this.explosionRadius * EXPLOSION_SHOCKWAVE_MAX_RADIUS_FACTOR * (progress / 0.8);
            const shockwaveAlpha = (1 - (progress / 0.8)) * 0.6;
            ctx.strokeStyle = `rgba(255, 220, 180, ${shockwaveAlpha})`;
            ctx.lineWidth = Math.max(1, Math.floor(6 * (1 - (progress / 0.8)))); 
            
            // Eckige Schockwelle
            ctx.strokeRect(-shockwaveRadius, -shockwaveRadius, shockwaveRadius * 2, shockwaveRadius * 2);
        }

        // 3. Pixel-Partikel
        this.explosionParticles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.alpha;
            // Gefüllte Quadrate für Splitter
            const size = Math.floor(p.size * (1 - progress * 0.5));
            ctx.fillRect(Math.floor(p.x), Math.floor(p.y), size, size); 
        });
        ctx.globalAlpha = 1.0;

        ctx.restore();
    }

    detonate(enemies, effectsSystem, rewardContext) { 
        if (this.exploded || this.isExploding) return; 

        this.exploded = true;
        this.isExploding = true;
        this.explosionFrame = 0;
        this.explosionParticles = [];

        if (effectsSystem && typeof effectsSystem.triggerScreenShake === 'function') {
            effectsSystem.triggerScreenShake(9, 12); 
        }

        for (let i = 0; i < EXPLOSION_PARTICLE_COUNT; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1.5 + Math.random() * 3.5;
            const life = this.maxExplosionFrames * 0.6 + Math.random() * (this.maxExplosionFrames * 0.4);
            this.explosionParticles.push({
                x: 0, y: 0, 
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: Math.random() * 4 + 2, // Etwas größere Partikel für blockigen Look
                color: ['#FFD700', '#FFA500', '#FF6347', '#FF4500', '#FF8C00'][Math.floor(Math.random() * 5)],
                life: life,
                initialLife: life,
                alpha: 1
            });
        }

        for (const e of enemies) {
            if (e.alive && !e.exploding) {
                const dx = e.x - this.x;
                const dy = e.y - this.y;
                const distanceToExplosion = Math.sqrt(dx*dx + dy*dy);

                if (distanceToExplosion < this.explosionRadius + (e.size/2)) {
                    const wasAliveBeforeHit = e.hp > 0;
                    e.hp -= this.damage;
                    e.hp = Math.max(0, e.hp); 

                    if (e.hp <= 0) { 
                        if (wasAliveBeforeHit && !e.alreadyAwardedXP && rewardContext) {
                            rewardContext.xpPoints.push(new rewardContext.XP(e.x, e.y));
                            if (Math.random() < rewardContext.GAME_CONFIG.PLASMA_DROP_CHANCE) {
                                let px = e.x;
                                let py = e.y;
                                const centerX = rewardContext.canvas.width / 2;
                                const centerY = rewardContext.canvas.height / 2;
                                const dxPlasma = centerX - e.x;
                                const dyPlasma = centerY - e.y;
                                const distPlasma = Math.sqrt(dxPlasma * dxPlasma + dyPlasma * dyPlasma);
                                if (distPlasma > 0) {
                                    px += dxPlasma / distPlasma * 40;
                                    py += dyPlasma / distPlasma * 40;
                                }
                                px = Math.max(24, Math.min(rewardContext.canvas.width - 24, px));
                                py = Math.max(24, Math.min(rewardContext.canvas.height - 24, py));
                                rewardContext.plasmaCells.push(new rewardContext.PlasmaCell(px, py));
                            }
                            rewardContext.killsRef.value++;
                            e.alreadyAwardedXP = true;
                        }
                        e.destroy(); 
                    } else if (wasAliveBeforeHit) { 
                        if (!e.isHit) {
                           e.isHit = true;
                           e.hitTimer = e.hitDuration;
                        }
                    }
                }
            }
        }
    }

    shouldBeRemoved() {
        return this.exploded && (!this.isExploding || this.explosionFrame >= this.maxExplosionFrames);
    }
}