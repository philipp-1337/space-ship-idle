import Laser from './laser.js';

class Ship {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 40; // Vergrößert für ein imposanteres Schiff
        this.height = 28; // Vergrößert für ein imposanteres Schiff
        this.angle = 0;
        this.speed = 5;
        // Explosion
        this.isExploding = false;
        this.explosionFrame = 0;
        this.maxExplosionFrames = 24;
        this.particles = [];
        this.thrustState = 'none'; // 'none', 'forward', 'backward'
    }

    update() {
        if (this.isExploding) {
            this.explosionFrame++;
            // Partikel animieren
            this.particles.forEach(p => {
                p.x += Math.cos(p.angle) * p.speed;
                p.y += Math.sin(p.angle) * p.speed;
                p.life--;
            });
            this.particles = this.particles.filter(p => p.life > 0);
        }
    }

    explode() {
        if (this.isExploding) return;
        this.isExploding = true;
        this.explosionFrame = 0;
        this.particles = [];
        for (let i = 0; i < 22; i++) {
            this.particles.push({
                x: 0,
                y: 0,
                angle: Math.random() * Math.PI * 2,
                speed: 2 + Math.random() * 2.5,
                color: i % 2 === 0 ? 'orange' : 'yellow',
                size: 2 + Math.random() * 2,
                life: 14 + Math.random() * 12
            });
        }
    }

    draw(ctx) {
        if (this.isExploding) {
            ctx.save();
            // Glow nur in den ersten 60% der Explosion anzeigen
            const glowCutoff = Math.floor(this.maxExplosionFrames * 0.6);
            if (this.explosionFrame < glowCutoff) {
                ctx.globalAlpha = 1 - this.explosionFrame / glowCutoff;
                ctx.translate(this.x, this.y);
                // Explosionseffekt (Feuerball)
                const r = this.width/2 + this.explosionFrame * 1.2;
                let grad = ctx.createRadialGradient(0,0,0, 0,0,r);
                grad.addColorStop(0, 'yellow');
                grad.addColorStop(0.4, 'orange');
                grad.addColorStop(1, 'rgba(80,0,0,0)');
                ctx.beginPath();
                ctx.arc(0, 0, r, 0, Math.PI*2);
                ctx.fillStyle = grad;
                ctx.fill();
                ctx.globalAlpha = 1;
            } else {
                ctx.translate(this.x, this.y);
            }
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
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        const bodyLength = this.width;      // Länge des Rumpfes, jetzt 40
        const bodyWidth = this.height * 0.8; // Breite des Rumpfes, etwas breiter relativ zur Höhe, ca. 22.4

        // Rumpf
        ctx.fillStyle = 'slategray'; // Eine etwas "raumschiffigere" Farbe
        ctx.beginPath();
        ctx.moveTo(bodyLength / 2, 0);                      // Nasenspitze (20, 0)
        ctx.lineTo(bodyLength / 3.5, -bodyWidth / 2);       // Obere Schulter (ca. 11.4, -11.2) - schlankere Front
        ctx.lineTo(-bodyLength / 2, -bodyWidth / 2.8);      // Oberes Heck (ca. -20, -8) - etwas breiteres Heck für Triebwerke
        ctx.lineTo(-bodyLength / 2, bodyWidth / 2.8);       // Unteres Heck (ca. -20, 8)
        ctx.lineTo(bodyLength / 3.5, bodyWidth / 2);        // Untere Schulter (ca. 11.4, 11.2)
        ctx.closePath();
        ctx.fill();

        // Flügel (nach hinten geneigt)
        const wingOuterTipX = -bodyLength * 0.15; // X-Position der Flügelspitze (stärker nach hinten, ca. -6)
        const wingOuterTipY = this.height * 0.85;  // Y-Position der Flügelspitze (breitere Flügel, ca. 23.8)
        const wingInnerAttachX = bodyLength * 0.20; // Vordere Befestigung am Rumpf (ca. 8)
        const wingInnerAttachY = bodyWidth / 2.4;   // Y-Position der vorderen Befestigung (ca. 9.3)
        const wingRearAttachX = -bodyLength * 0.45; // Hintere Befestigung am Rumpf (stärkerer Pfeilwinkel, ca. -18)

        ctx.fillStyle = '#4682B4'; // Stahlblau für die Flügel

        // Oberer Flügel
        ctx.beginPath();
        ctx.moveTo(wingInnerAttachX, -wingInnerAttachY);      // Vorne innen
        ctx.lineTo(wingOuterTipX, -wingOuterTipY);            // Außen an der Spitze (weiter außen)
        ctx.lineTo(wingRearAttachX, -wingInnerAttachY * 0.9); // Hinten innen (leicht verjüngt)
        ctx.closePath();
        ctx.fill();

        // Unterer Flügel
        ctx.beginPath();
        ctx.moveTo(wingInnerAttachX, wingInnerAttachY);       // Vorne innen (weiter außen)
        ctx.lineTo(wingOuterTipX, wingOuterTipY);             // Außen an der Spitze (weiter außen)
        ctx.lineTo(wingRearAttachX, wingInnerAttachY * 0.9);  // Hinten innen
        ctx.closePath();
        ctx.fill();

        // Triebwerke
        const nacelleLength = bodyLength * 0.20;    // Länge des Triebwerkgehäuses (ca. 8)
        const nacelleThickness = bodyWidth * 0.22;  // Dicke des Gehäuses (ca. 4.9)
        const nacelleOffsetY = bodyWidth * 0.18;    // Y-Abstand von der Schiffsmitte (ca. 4)
        const nacelleStartX = -bodyLength / 2;      // Beginnt am Heck des Rumpfes (-20)

        // Triebwerkgehäuse
        ctx.fillStyle = 'darkslategrey';
        // Oberes Gehäuse
        ctx.fillRect(
            nacelleStartX,
            -nacelleOffsetY - nacelleThickness / 2,
            nacelleLength,
            nacelleThickness
        );
        // Unteres Gehäuse
        ctx.fillRect(
            nacelleStartX,
            nacelleOffsetY - nacelleThickness / 2,
            nacelleLength,
            nacelleThickness
        );

        // Triebwerksstrahl/-glühen basierend auf thrustState
        if (this.thrustState === 'forward') {
            ctx.save();
            ctx.shadowBlur = 18;
            ctx.shadowColor = 'orangered';
            ctx.fillStyle = 'orangered';
            const glowDepth = nacelleLength * 0.8; // Etwas längerer Strahl
            const glowThickness = nacelleThickness * 0.85; // Etwas dickerer Strahl
            // Oberer Strahl
            ctx.fillRect(nacelleStartX + nacelleLength, -nacelleOffsetY - glowThickness / 2, glowDepth, glowThickness);
            // Unterer Strahl
            ctx.fillRect(nacelleStartX + nacelleLength, nacelleOffsetY - glowThickness / 2, glowDepth, glowThickness);
            ctx.restore();
        } else if (this.thrustState === 'backward') {
            ctx.save();
            ctx.shadowBlur = 14;
            ctx.shadowColor = 'lightblue';
            ctx.fillStyle = 'lightblue'; // Andere Farbe für Rückwärtsschub
            const glowDepth = nacelleLength * 0.5; // Kürzerer Strahl
            const glowThickness = nacelleThickness * 0.7; // Etwas schmalerer Strahl
            // Oberer Strahl (Rückwärts)
            ctx.fillRect(nacelleStartX + nacelleLength, -nacelleOffsetY - glowThickness / 2, glowDepth, glowThickness);
            // Unterer Strahl (Rückwärts)
            ctx.fillRect(nacelleStartX + nacelleLength, nacelleOffsetY - glowThickness / 2, glowDepth, glowThickness);
            ctx.restore();
        }

        // Cockpit
        ctx.fillStyle = 'skyblue';
        ctx.beginPath();
        const cockpitX = bodyLength * 0.28; // Weiter vorne auf der längeren Nase (ca. 11.2)
        const cockpitRadius = bodyWidth * 0.18; // Etwas kleiner relativ zum Rumpf (ca. 4)
        ctx.arc(cockpitX, 0, cockpitRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
        // --- DEBUG: Hitboxen anzeigen ---
        // XP-Hitbox (groß, cyan)
        ctx.save();
        ctx.globalAlpha = 0.4;
        ctx.strokeStyle = 'cyan';
        const xpHitbox = this.width * 0.5;
        ctx.beginPath();
        ctx.arc(this.x, this.y, xpHitbox, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        // Kollision-Hitbox (klein, lime)
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = 'lime';
        const collisionHitbox = this.width * 0.28;
        ctx.beginPath();
        ctx.arc(this.x, this.y, collisionHitbox, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    moveTo(x, y) {
        this.x = x;
        this.y = y;
    }

    shoot() {
        // Laser spawns at tip of ship
        const tipX = this.x + Math.cos(this.angle) * this.width/2;
        const tipY = this.y + Math.sin(this.angle) * this.width/2;
        // Laser-Upgrade: Doppellaser ab Level 2
        if (typeof window !== 'undefined' && window.upgrades && window.upgrades.laser >= 2) {
            // Zwei Laser leicht versetzt
            const offset = 7;
            return [
                new Laser(
                    this.x + Math.cos(this.angle) * this.width/2 - Math.sin(this.angle) * offset,
                    this.y + Math.sin(this.angle) * this.width/2 + Math.cos(this.angle) * offset,
                    this.angle,
                    window.upgrades.laser
                ),
                new Laser(
                    this.x + Math.cos(this.angle) * this.width/2 + Math.sin(this.angle) * offset,
                    this.y + Math.sin(this.angle) * this.width/2 - Math.cos(this.angle) * offset,
                    this.angle,
                    window.upgrades.laser
                )
            ];
        }
        return [new Laser(tipX, tipY, this.angle, window.upgrades ? window.upgrades.laser : 0)];
    }

    getCollisionRadius() {
        return this.width * 0.28;
    }
    getXpRadius() {
        return this.width * 0.5;
    }
}

export { Ship };