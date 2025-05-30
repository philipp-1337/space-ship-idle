// homingMissile.js
// Modul für Lenkraketen

// Konstanten für Raketenaussehen und Explosion
const EXPLOSION_ANIMATION_DURATION = 30; // Frames
const EXPLOSION_PARTICLE_COUNT = 35;
const EXPLOSION_SHOCKWAVE_MAX_RADIUS_FACTOR = 1.3; // Multiplikator für explosionRadius

const MISSILE_TRAIL_OPACITY = 0.7;
const MISSILE_TRAIL_WIDTH_FACTOR = 0.6;


export default class HomingMissile {
    constructor(x, y, target, options = {}) {
        this.x = x;
        this.y = y;
        this.radius = options.radius || 7;
        this.speed = options.speed || 2.2;
        this.angle = options.angle || 0;
        this.target = target;
        this.turnSpeed = options.turnSpeed || 0.045; // wie stark die Rakete sich pro Frame drehen kann
        this.life = options.life || 240; // Etwas längere Lebensdauer für mehr Orbit-Verhalten
        this.exploded = false; // True, wenn Schaden angewendet wurde und Explosion beginnt
        this.explosionRadius = options.explosionRadius || 60;
        this.damage = options.damage || 6;
        this.color = options.color || 'orange';
        this.trail = [];
        this.trailMax = 12;
        this.orbitPhase = Math.random() * Math.PI * 2;
        this.orbitRadius = options.orbitRadius || 50 + Math.random()*20;

        // Für Explosionsanimation
        this.isExploding = false; // True, während die Animation läuft
        this.explosionFrame = 0;
        this.maxExplosionFrames = EXPLOSION_ANIMATION_DURATION;
        this.explosionParticles = [];

        // Neue Eigenschaften für Verhalten bei Zielverlust
        this.lostTargetGracePeriod = 0; // Zähler für Frames ohne Ziel
        this.MAX_LOST_TARGET_GRACE_FRAMES = options.maxLostTargetGraceFrames || 90; // Ca. 1.5 Sekunden bei 60fps
    }

    update(enemies) {
        if (this.isExploding) {
            this.explosionFrame++;
            this.updateExplosionParticles();
            return;
        }
        if (this.exploded) return; // Wenn logisch explodiert, aber Animation noch nicht gestartet/beendet

        if (!this.target || !this.target.alive) {
            this.target = null; // Ziel explizit entfernen

            // Versuche, ein neues Ziel zu finden
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
                this.lostTargetGracePeriod = 0; // Gnadenfrist zurücksetzen
                // Orbit-Phase für sanfteren Übergang zum neuen Ziel anpassen
                this.orbitPhase = Math.atan2(this.target.y - this.y, this.target.x - this.x);
            } else {
                // Kein neues Ziel gefunden, während der Gnadenfrist geradeaus fliegen
                this.lostTargetGracePeriod++;
                this.x += Math.cos(this.angle) * this.speed; // In aktueller Richtung weiterfliegen
                this.y += Math.sin(this.angle) * this.speed;

                if (this.lostTargetGracePeriod > this.MAX_LOST_TARGET_GRACE_FRAMES) {
                    this.life = 0; // Markiert für Detonation durch Ablaufen der Lebenszeit
                }
            }
        }

        // Wenn ein Ziel vorhanden ist (ursprünglich oder neu erfasst), Orbit-Logik ausführen
        if (this.target) {
            // Sicherstellen, dass die Gnadenfrist zurückgesetzt ist, wenn ein Ziel vorhanden ist
            this.lostTargetGracePeriod = 0;

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
        }
        // Falls kein Ziel vorhanden ist, wurde die Bewegung bereits im Block "Kein neues Ziel gefunden" gehandhabt.

        this.life--;

        // Trail
        this.trail.push({x: this.x, y: this.y});
        if (this.trail.length > this.trailMax) this.trail.shift();
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
        if (this.exploded) return; // Nicht zeichnen, wenn logisch explodiert und Animation vorbei

        // Raketenschweif (in Weltkoordinaten)
        if (this.trail.length > 1) {
            ctx.save();
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            for (let i = 0; i < this.trail.length - 1; i++) {
                const p1 = this.trail[i];
                const p2 = this.trail[i+1];
                const segmentProgress = (i + 1) / this.trailMax;
                const alpha = MISSILE_TRAIL_OPACITY * (1 - segmentProgress * 0.8);
                const lineWidth = Math.max(1, (this.radius * MISSILE_TRAIL_WIDTH_FACTOR) * (1 - segmentProgress * 0.7));

                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.strokeStyle = `rgba(255, ${165 + Math.floor(90 * (1-segmentProgress))}, 0, ${alpha})`;
                ctx.lineWidth = lineWidth;
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
            }
            ctx.restore();
        }

        // Rakete zeichnen
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        const M_LENGTH = this.radius * 2.8; // Länge der Rakete
        const M_WIDTH = this.radius * 1.2;  // Breite des Rumpfes

        // Haupt-Rumpf
        ctx.fillStyle = "slateGray";
        ctx.strokeStyle = "#444";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.rect(-M_LENGTH * 0.4, -M_WIDTH * 0.5, M_LENGTH * 0.9, M_WIDTH); // Startet etwas hinter der Spitze
        ctx.fill();
        ctx.stroke();

        // Nasenspitze
        ctx.fillStyle = this.color; // z.B. 'orange'
        ctx.beginPath();
        ctx.moveTo(M_LENGTH * 0.6, 0); // Spitze
        ctx.lineTo(M_LENGTH * 0.6 - M_LENGTH * 0.45, -M_WIDTH * 0.5); // Basis der Spitze, verbindet mit Rumpf
        ctx.lineTo(M_LENGTH * 0.6 - M_LENGTH * 0.45, M_WIDTH * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Heckflossen
        ctx.fillStyle = "darkRed";
        const finSize = M_WIDTH * 0.8;
        // Obere Flosse
        ctx.beginPath();
        ctx.moveTo(-M_LENGTH * 0.4, -M_WIDTH * 0.5);
        ctx.lineTo(-M_LENGTH * 0.4 - finSize, -M_WIDTH * 0.5 - finSize * 0.7);
        ctx.lineTo(-M_LENGTH * 0.4 - finSize * 0.2, -M_WIDTH * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Untere Flosse
        ctx.beginPath();
        ctx.moveTo(-M_LENGTH * 0.4, M_WIDTH * 0.5);
        ctx.lineTo(-M_LENGTH * 0.4 - finSize, M_WIDTH * 0.5 + finSize * 0.7);
        ctx.lineTo(-M_LENGTH * 0.4 - finSize * 0.2, M_WIDTH * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Kleiner Triebwerksstrahl
        const flameSize = M_WIDTH * 0.5;
        ctx.fillStyle = `rgba(255, ${Math.floor(180 + Math.random()*75)}, 0, 0.9)`;
        ctx.beginPath();
        ctx.ellipse(-M_LENGTH*0.4 - flameSize*0.6, 0, flameSize, flameSize*0.7, 0, 0, Math.PI*2);
        ctx.fill();

        ctx.restore();
    }

    drawExplosion(ctx) {
        if (!this.isExploding || this.explosionFrame >= this.maxExplosionFrames) return;

        const progress = this.explosionFrame / this.maxExplosionFrames;

        ctx.save();
        ctx.translate(this.x, this.y);

        // 1. Haupt-Feuerball
        const fireballRadius = this.explosionRadius * Math.sin(progress * Math.PI * 0.5); // Smooth expansion
        const fireballAlpha = 1 - progress;

        let grad = ctx.createRadialGradient(0, 0, 0, 0, 0, fireballRadius);
        grad.addColorStop(0, `rgba(255, 255, 224, ${fireballAlpha * 0.95})`); // Hellgelb
        grad.addColorStop(0.25, `rgba(255, 215, 0, ${fireballAlpha * 0.9})`);  // Gold
        grad.addColorStop(0.55, `rgba(255, 140, 0, ${fireballAlpha * 0.8})`);  // Dunkelorange
        grad.addColorStop(1, `rgba(255, 69, 0, ${fireballAlpha * 0.4})`);    // Rot-Orange, ausklingend

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, fireballRadius, 0, Math.PI * 2);
        ctx.fill();

        // 2. Schockwelle
        if (progress < 0.8) {
            const shockwaveRadius = this.explosionRadius * EXPLOSION_SHOCKWAVE_MAX_RADIUS_FACTOR * (progress / 0.8);
            const shockwaveAlpha = (1 - (progress / 0.8)) * 0.6;
            ctx.strokeStyle = `rgba(255, 220, 180, ${shockwaveAlpha})`;
            ctx.lineWidth = 2 + 6 * (1 - (progress / 0.8)); // Wird dünner
            ctx.beginPath();
            ctx.arc(0, 0, shockwaveRadius, 0, Math.PI * 2);
            ctx.stroke();
        }

        // 3. Partikel
        this.explosionParticles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.alpha;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * (1 - progress * 0.5), 0, Math.PI * 2); // Partikel schrumpfen leicht
            ctx.fill();
        });
        ctx.globalAlpha = 1.0;

        ctx.restore();
    }

    detonate(enemies, effectsSystem, rewardContext) { // rewardContext hinzugefügt
        if (this.exploded || this.isExploding) return; // Verhindert mehrfache Detonation oder während Animation

        this.exploded = true;
        this.isExploding = true;
        this.explosionFrame = 0;
        this.explosionParticles = [];

        // Bildschirmerschütterung auslösen
        if (effectsSystem && typeof effectsSystem.triggerScreenShake === 'function') {
            effectsSystem.triggerScreenShake(9, 12); // Stärkere Erschütterung
        }

        // Explosionspartikel erzeugen
        for (let i = 0; i < EXPLOSION_PARTICLE_COUNT; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1.5 + Math.random() * 3.5;
            const life = this.maxExplosionFrames * 0.6 + Math.random() * (this.maxExplosionFrames * 0.4);
            this.explosionParticles.push({
                x: 0, y: 0, // Relativ zum Raketenzentrum
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: Math.random() * 3.5 + 1.5,
                color: ['#FFD700', '#FFA500', '#FF6347', '#FF4500', '#FF8C00'][Math.floor(Math.random() * 5)],
                life: life,
                initialLife: life,
                alpha: 1
            });
        }

        // Schaden an Gegnern im Radius
        for (const e of enemies) {
            // Nur agieren, wenn Gegner aktiv ist und nicht schon explodiert
            if (e.alive && !e.exploding) {
                const dx = e.x - this.x;
                const dy = e.y - this.y;
                const distanceToExplosion = Math.sqrt(dx*dx + dy*dy);

                if (distanceToExplosion < this.explosionRadius + (e.size/2)) {
                    const wasAliveBeforeHit = e.hp > 0;
                    e.hp -= this.damage;
                    e.hp = Math.max(0, e.hp); // Verhindere negative HP

                    if (e.hp <= 0) { // Gegner durch diese Rakete zerstört
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
                        e.destroy(); // Starte Zerstörungsanimation des Gegners
                    } else if (wasAliveBeforeHit) { // Getroffen, aber nicht zerstört
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
