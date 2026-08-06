import { makePixelSprite, makeFlashSprite, drawPixelSprite } from './pixelArt.js';
import { AudioManager } from './audio/AudioManager.js';
import { spawnEnemyLaser, spawnAegisPulse } from './enemyManager.js';
import { AEGIS_PULSE, ENEMY_BALANCE } from './constants.js';

// Pixel-Art Gegnergrafiken: einmalig aus den ursprünglichen Formen in niedriger
// Auflösung gerendert, dann grob (nearest-neighbor) auf `size` hochskaliert.
const ENEMY_SPRITE_RES = 12;
const ENEMY_RANGE = 16; // lokale Koordinaten laufen von -ENEMY_RANGE..ENEMY_RANGE
const enemyMx = x => (x + ENEMY_RANGE) / (2 * ENEMY_RANGE) * ENEMY_SPRITE_RES;
const enemyMy = y => (y + ENEMY_RANGE) / (2 * ENEMY_RANGE) * ENEMY_SPRITE_RES;
const enemyPath = (ctx, pts, color) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    pts.forEach(([x, y], i) => {
        const px = enemyMx(x), py = enemyMy(y);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fill();
};

const triangleSprite = makePixelSprite(ENEMY_SPRITE_RES, ENEMY_SPRITE_RES,
    ['#c62828', '#8e1f1f', '#e05a5a', '#ffe082'], '#2b0a0a',
    (ctx) => {
        const s = 15;
        enemyPath(ctx, [[0, -s / 2], [-s / 2, s / 2], [s / 2, s / 2]], '#c62828');
        enemyPath(ctx, [[0, -s / 2], [s / 2, s / 2], [0, s / 2]], '#8e1f1f');
        enemyPath(ctx, [[0, -s / 2], [-s / 2, s / 2], [-s / 2 * 0.4, s / 2]], '#e05a5a');
        ctx.fillStyle = '#ffe082';
        ctx.fillRect(enemyMx(-4.5) - 0.5, enemyMy(2.5) - 0.5, 1.3, 1.3);
        ctx.fillRect(enemyMx(3.2) - 0.5, enemyMy(2.5) - 0.5, 1.3, 1.3);
    }
);

const squareSprite = makePixelSprite(ENEMY_SPRITE_RES, ENEMY_SPRITE_RES,
    ['#1f4fa0', '#123166', '#3f7bd1', '#ffe082'], '#08142e',
    (ctx) => {
        const s = 15;
        const x0 = enemyMx(-s / 2), y0 = enemyMy(-s / 2);
        const size = enemyMx(s / 2) - enemyMx(-s / 2);
        ctx.fillStyle = '#1f4fa0';
        ctx.fillRect(x0, y0, size, size);
        ctx.fillStyle = '#123166';
        ctx.fillRect(x0, enemyMy(0), size, enemyMy(s / 2) - enemyMy(0));
        ctx.fillStyle = '#3f7bd1';
        ctx.fillRect(x0, y0, size, enemyMy(-s / 2 + 3) - y0);
        ctx.fillStyle = '#ffe082';
        ctx.fillRect(enemyMx(-2), enemyMy(-2), enemyMx(2) - enemyMx(-2), enemyMy(2) - enemyMy(-2));
    }
);

const pentagonSprite = makePixelSprite(ENEMY_SPRITE_RES, ENEMY_SPRITE_RES,
    ['#1b6b34', '#0f4a22', '#7bffb0'], '#04220f',
    (ctx) => {
        const s = 15;
        const pts = [];
        for (let i = 0; i < 5; i++) {
            const a = -Math.PI / 2 + i * 2 * Math.PI / 5;
            pts.push([Math.cos(a) * s / 2, Math.sin(a) * s / 2]);
        }
        enemyPath(ctx, pts, '#1b6b34');
        enemyPath(ctx, [pts[2], pts[3], pts[4], [0, 0]], '#0f4a22');
        ctx.fillStyle = '#7bffb0';
        ctx.beginPath();
        ctx.arc(enemyMx(0), enemyMy(0), Math.max(0.6, ENEMY_SPRITE_RES / (2 * ENEMY_RANGE) * 2.2), 0, Math.PI * 2);
        ctx.fill();
    }
);

const circleSprite = makePixelSprite(ENEMY_SPRITE_RES, ENEMY_SPRITE_RES,
    ['#6a1b9a', '#4a1170', '#a24fd6', '#2a0a40', '#ffe082'], '#180524',
    (ctx) => {
        const s = 15;
        const r = enemyMx(s / 2) - enemyMx(0);
        ctx.fillStyle = '#2a0a40';
        ctx.fillRect(enemyMx(-1.5), enemyMy(-s / 2 - 2), enemyMx(1.5) - enemyMx(-1.5), enemyMy(-s / 2 + 2) - enemyMy(-s / 2 - 2));
        ctx.fillStyle = '#6a1b9a';
        ctx.beginPath();
        ctx.arc(enemyMx(0), enemyMy(0), r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#4a1170';
        ctx.beginPath();
        ctx.arc(enemyMx(1.5), enemyMy(1.5), r * 0.85, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#a24fd6';
        ctx.beginPath();
        ctx.arc(enemyMx(-3), enemyMy(-3), r * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffe082';
        ctx.beginPath();
        ctx.arc(enemyMx(0), enemyMy(1), Math.max(0.6, r * 0.18), 0, Math.PI * 2);
        ctx.fill();
    }
);

const aegisSprite = makePixelSprite(ENEMY_SPRITE_RES, ENEMY_SPRITE_RES,
    ['#0b6178', '#0b2f3a', '#55e8ff', '#d9fbff'], '#03151b',
    (ctx) => {
        const s = 15;
        enemyPath(ctx, [[0, -s / 2], [s / 2, 0], [0, s / 2], [-s / 2, 0]], '#0b6178');
        enemyPath(ctx, [[0, -s / 2], [s / 2, 0], [0, 0], [-s / 2, 0]], '#0b2f3a');
        ctx.strokeStyle = '#55e8ff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(enemyMx(-5), enemyMy(0));
        ctx.lineTo(enemyMx(0), enemyMy(-5));
        ctx.lineTo(enemyMx(5), enemyMy(0));
        ctx.lineTo(enemyMx(0), enemyMy(5));
        ctx.closePath();
        ctx.stroke();
        ctx.fillStyle = '#d9fbff';
        ctx.fillRect(enemyMx(-1.5), enemyMy(-1.5), enemyMx(3) - enemyMx(0), enemyMy(3) - enemyMy(0));
    }
);

// Boss-Sprite: gepanzerter, bestachelter Sechseck-Rumpf mit glühendem
// Reaktorkern in Warnrot/Schwarz statt einer der zufälligen Standard-Formen —
// jeder Boss sieht dadurch gleich und sofort als eigene Bedrohungsklasse
// erkennbar aus, statt "zufälliger Gegner mit dünnem Goldring".
const bossSprite = makePixelSprite(ENEMY_SPRITE_RES, ENEMY_SPRITE_RES,
    ['#1a1a1a', '#ff3b30', '#8a0f0a', '#ffb000', '#fff3c4'], '#000000',
    (ctx) => {
        const s = 15.5;
        const hex = [];
        for (let i = 0; i < 6; i++) {
            const a = -Math.PI / 2 + i * Math.PI / 3;
            hex.push([Math.cos(a) * s / 2, Math.sin(a) * s / 2]);
        }
        // Gepanzerter Rumpf
        enemyPath(ctx, hex, '#1a1a1a');
        // Kernplatten
        enemyPath(ctx, [hex[5], hex[0], hex[1], [0, 0]], '#8a0f0a');
        enemyPath(ctx, [hex[2], hex[3], hex[4], [0, 0]], '#ff3b30');
        // Panzerstacheln an jeder Ecke
        hex.forEach(([px, py]) => {
            const nx = px / (s / 2), ny = py / (s / 2);
            const tx = -ny, ty = nx;
            enemyPath(ctx, [
                [px + tx * 1.1, py + ty * 1.1],
                [px + nx * 4, py + ny * 4],
                [px - tx * 1.1, py - ty * 1.1]
            ], '#ff3b30');
        });
        // Glühender Reaktorkern
        ctx.fillStyle = '#ffb000';
        ctx.beginPath();
        ctx.arc(enemyMx(0), enemyMy(0), Math.max(1.4, ENEMY_SPRITE_RES / (2 * ENEMY_RANGE) * 3), 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff3c4';
        ctx.beginPath();
        ctx.arc(enemyMx(0), enemyMy(0), Math.max(0.7, ENEMY_SPRITE_RES / (2 * ENEMY_RANGE) * 1.2), 0, Math.PI * 2);
        ctx.fill();
    }
);

const ENEMY_SPRITES = {
    triangle: { normal: triangleSprite, hit: makeFlashSprite(triangleSprite, '#ffffff') },
    square: { normal: squareSprite, hit: makeFlashSprite(squareSprite, '#ffffff') },
    pentagon: { normal: pentagonSprite, hit: makeFlashSprite(pentagonSprite, '#ffffff') },
    circle: { normal: circleSprite, hit: makeFlashSprite(circleSprite, '#ffffff') },
    aegis: { normal: aegisSprite, hit: makeFlashSprite(aegisSprite, '#ffffff') },
    boss: { normal: bossSprite, hit: makeFlashSprite(bossSprite, '#ffffff') },
};

export const ENEMY_TYPES = [
    {
        name: 'triangle',
        minLevel: 1,
        shape: 'triangle',
        baseHp: 3,
        baseSpeed: 0.7,
        color: 'darkred',
        baseXpValue: 1
    },
    {
        name: 'square',
        minLevel: 5,
        shape: 'square',
        baseHp: 6,
        baseSpeed: 0.6,
        color: 'darkblue',
        baseXpValue: 3
    },
    {
        name: 'pentagon',
        minLevel: 10,
        shape: 'pentagon',
        baseHp: 9, // The split creates two additional targets.
        baseSpeed: 0.5,
        color: 'darkgreen',
        baseXpValue: 5
    },
    {
        name: 'shooter',
        minLevel: 18,
        shape: 'circle',
        baseHp: 12, // Shooters also add ranged pressure.
        baseSpeed: 0.45,
        color: 'purple',
        canShoot: true,
        baseXpValue: 8
    }
];

// Eigenes Stat-Profil für den Boss statt einer zufällig aus ENEMY_TYPES
// gewählten Form — sonst würde ein Boss je nach Zufallstreffer mal ein
// schwaches Dreieck, mal ein zäher Shooter
// sein, obwohl er optisch immer gleich (bossSprite) aussieht.
export const BOSS_TYPE = {
    name: 'boss',
    shape: 'boss',
    baseHp: 30,
    baseSpeed: 0.4,
    color: 'crimson',
    canShoot: true
};

export const SURGE_AEGIS_TYPE = {
    name: 'aegis',
    minLevel: 25,
    shape: 'aegis',
    baseHp: 12,
    baseSpeed: 0.5,
    color: '#55e8ff',
    baseXpValue: 12,
    damageTakenMultiplier: 0.75,
    canShoot: true
};

class Enemy {
    constructor(x, y, level = 1, easyMode = false, forcedType = null) {
        // Typ nach Level bestimmen (oder fest vorgegeben, z.B. BOSS_TYPE)
        const type = forcedType || (() => {
            const availableTypes = ENEMY_TYPES.filter(t => level >= t.minLevel);
            return availableTypes[Math.floor(Math.random() * availableTypes.length)];
        })();
        this.type = type;
        this.x = x;
        this.y = y;
        this.size = 30;
        // Regular enemy HP follows a small, bounded combat budget. New enemy
        // behaviors and composition should create difficulty; raw HP should
        // preserve a short time-to-kill even in late levels.
        const isBoss = type.name === 'boss';
        const hpGrowth = isBoss ? ENEMY_BALANCE.BOSS_HP_LEVEL_GROWTH : ENEMY_BALANCE.HP_LEVEL_GROWTH;
        const hpMultiplier = isBoss ? ENEMY_BALANCE.BOSS_HP_LEVEL_MULTIPLIER : ENEMY_BALANCE.HP_LEVEL_MULTIPLIER;
        this.hp = Math.max(1, Math.round((type.baseHp + (level - 1) * hpGrowth) * Math.pow(hpMultiplier, level - 1) * (easyMode ? 0.5 : 1)));
        this.maxHp = this.hp;
        this.damageTakenMultiplier = type.damageTakenMultiplier || 1;
        this.isAegis = type.name === 'aegis';
        this.color = type.color;
        this.alive = true;
        this.canShoot = type.canShoot || false;
        this.lastShot = performance.now() + Math.random() * 2000;
        this.isElite = false; // wird in spawnBoss() gesetzt
        this.xpValue = type.baseXpValue || 1;
        this.hitFlashTimer = 0;
        this.exploding = false;
        this.alreadyAwardedXP = false; // NEU: Flag um doppelte XP-Vergabe zu verhindern
        this.explosionFrame = 0;
        this.maxExplosionFrames = 14;
        this.explosionParticlesSpawned = false;
        this.particles = [];
        this.canShoot = !!type.canShoot;
        // Shooter volleys should not synchronize when several enemies spawn
        // during the same wave.
        this.shootCooldown = type.canShoot ? Math.random() * 150 : 0;
        this.pulseCharge = 0;
        // Speed-Skalierung bleibt wie zuvor oder kann angepasst werden
        this.speed = type.baseSpeed * (1 + Math.floor((level-1)/4) * 0.03);

        // Für Hit-Flash
        this.isHit = false;
        this.hitTimer = 0;
        this.hitDuration = 6; // Dauer des Flashes in Frames
    }

    update(shipX, shipY, dt = 1) {
        if (this.exploding) {
            this.explosionFrame += dt;
            // Partikel animieren
            this.particles.forEach(p => {
                p.x += Math.cos(p.angle) * p.speed * dt;
                p.y += Math.sin(p.angle) * p.speed * dt;
                p.life -= dt;
            });
            this.particles = this.particles.filter(p => p.life > 0);
            if (!this.explosionParticlesSpawned) {
                this.explosionParticlesSpawned = true;
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
            this.hitTimer -= dt;
            if (this.hitTimer <= 0) {
                this.hitTimer = 0;
                this.isHit = false;
            }
        }
        if (this.alive) {
            // Bewegung
            const angle = Math.atan2(shipY - this.y, shipX - this.x);
            const dx = Math.cos(angle) * this.speed;
            const dy = Math.sin(angle) * this.speed;
            this.x += dx * 0.5 * dt;
            this.y += dy * 0.5 * dt;
            // Shooter-Logik
            if (this.isAegis && this.pulseCharge > 0) {
                this.pulseCharge -= dt;
                if (this.pulseCharge <= 0) {
                    const sourceVisible = this.x >= 0 && this.x <= window.logicalWidth
                        && this.y >= 0 && this.y <= window.logicalHeight;
                    spawnAegisPulse(this.x, this.y, angle, sourceVisible);
                }
            } else if (this.canShoot && this.shootCooldown <= 0) {
                if (this.isAegis) {
                    this.shootCooldown = AEGIS_PULSE.COOLDOWN_FRAMES + Math.random() * 90;
                    this.pulseCharge = AEGIS_PULSE.CHARGE_FRAMES;
                } else {
                    this.shootCooldown = 150 + Math.random()*60;
                    spawnEnemyLaser(this.x, this.y, angle);
                }
            }
            if (this.canShoot && this.shootCooldown > 0) {
                this.shootCooldown -= dt;
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

            // Boss-Aura: pulsierender Warnrot-Ring statt des alten dünnen
            // Goldrings — Gold steht im Design-System für ein "Beute-Ziel",
            // Warnrot für echte Gefahr, was zu einem Endgegner besser passt.
            // Hinter dem Sprite gezeichnet, damit sie wie ein Halo wirkt.
            if (this.isElite) {
                const pulse = 0.6 + 0.4 * Math.sin(Date.now() / 260);
                ctx.save();
                ctx.globalAlpha = 0.55 * pulse;
                ctx.strokeStyle = '#ff3b30';
                ctx.lineWidth = 3;
                ctx.shadowBlur = 14 * pulse;
                ctx.shadowColor = '#ff3b30';
                ctx.beginPath();
                ctx.arc(0, 0, this.size / 2 + 10, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }
            if (this.isAegis) {
                const pulse = 0.65 + 0.35 * Math.sin(Date.now() / 180);
                ctx.save();
                ctx.globalAlpha = 0.65 * pulse;
                ctx.strokeStyle = '#55e8ff';
                ctx.lineWidth = 2;
                ctx.shadowBlur = 12 * pulse;
                ctx.shadowColor = '#55e8ff';
                ctx.beginPath();
                ctx.arc(0, 0, this.size / 2 + 8 + pulse * 2, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
                if (this.pulseCharge > 0) {
                    const charge = 1 - this.pulseCharge / AEGIS_PULSE.CHARGE_FRAMES;
                    ctx.save();
                    ctx.globalAlpha = 0.4 + charge * 0.6;
                    ctx.fillStyle = '#d9fbff';
                    ctx.shadowColor = '#55e8ff';
                    ctx.shadowBlur = 8 + charge * 16;
                    ctx.beginPath();
                    ctx.arc(0, 0, 3 + charge * 6, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
            }

            const sprites = ENEMY_SPRITES[this.type.shape];
            const sprite = (this.isHit && this.hitTimer > 0) ? sprites.hit : sprites.normal;
            drawPixelSprite(ctx, sprite, this.size, this.size);
            // HP-Balken (beim Boss breiter, in Warnrot, mit "BOSS"-Label)
            if (this.maxHp > 1) {
                const barWidth = this.isElite ? this.size * 1.15 : this.size;
                const barHeight = this.isElite ? 6 : 5;
                const barY = -this.size / 2 - (this.isElite ? 14 : 8);
                ctx.fillStyle = 'black';
                ctx.fillRect(-barWidth / 2, barY, barWidth, barHeight);
                ctx.fillStyle = this.isElite ? '#ff3b30' : (this.isAegis ? '#55e8ff' : 'lime');
                ctx.fillRect(-barWidth / 2, barY, barWidth * (this.hp / this.maxHp), barHeight);
                if (this.isElite) {
                    ctx.fillStyle = '#ff3b30';
                    ctx.font = '700 10px "IBM Plex Mono", monospace';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'bottom';
                    ctx.fillText('BOSS', 0, barY - 3);
                } else if (this.isAegis) {
                    ctx.fillStyle = '#55e8ff';
                    ctx.font = '700 8px "IBM Plex Mono", monospace';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'bottom';
                    ctx.fillText('AEGIS', 0, barY - 3);
                }
            }
            ctx.restore();
        }
    }

    checkCollision(ship) {
        // Hitbox ist nur aktiv, wenn der Gegner NICHT explodiert
        if (this.exploding) return false;
        // Kleine Hitbox für Kollision mit Schiff
        const dx = this.x - ship.x;
        const dy = this.y - ship.y;
        const enemyCollisionHitbox = this.size * 0.38;
        const shipCollisionHitbox = ship.width * 0.28;
        return Math.sqrt(dx*dx + dy*dy) < enemyCollisionHitbox + shipCollisionHitbox;
    }

    checkLaserHit(laser) {
        // Hitbox ist nur aktiv, wenn der Gegner NICHT explodiert
        if (this.exploding) return false;
        // Große Hitbox für Lasertreffer
        const dx = this.x - laser.x;
        const dy = this.y - laser.y;
        const enemyLaserHitbox = this.size * 0.7;
        const hit = Math.sqrt(dx*dx + dy*dy) < enemyLaserHitbox;
        if (this.alive && hit) {
            if (!this.isHit) { // Verhindere, dass mehrere Laser im selben Frame den Flash neu auslösen
                this.takeDamage(laser.damage);
                if (this.hp <= 0) {
                    this.destroy();
                } else {
                    this.isHit = true;
                    this.hitTimer = this.hitDuration;
                    AudioManager.play('ENEMY_HIT');
                }
            }
            return true; // Treffer registriert
        }
        return false;
    }

    takeDamage(amount) {
        this.hp = Math.max(0, this.hp - amount * this.damageTakenMultiplier);
        return this.hp <= 0;
    }

    destroy() {
        if (!this.exploding) {
            this.exploding = true;
            this.explosionFrame = 0;
            AudioManager.play('ENEMY_EXPLODE');
        }
    }
}

export default Enemy;
