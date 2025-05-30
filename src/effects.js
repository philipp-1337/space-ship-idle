// effects.js - Visual Effects System

import { EFFECTS, STARS, COLORS } from './constants.js';

export class EffectsSystem {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Screen Shake
        this.shakeTime = 0;
        this.shakeIntensity = 0;
        
        // XP Particles
        this.xpParticles = [];
        
        // Star Background
        this.starLayers = [];
        this.lastShipX = 0;
        this.lastShipY = 0;
        
        this.initStars();
    }

    // === SCREEN SHAKE SYSTEM ===
    triggerScreenShake(intensity = EFFECTS.SCREEN_SHAKE_INTENSITY, duration = EFFECTS.SCREEN_SHAKE_DURATION) {
        this.shakeTime = duration;
        this.shakeIntensity = intensity;
    }

    applyScreenShake() {
        if (this.shakeTime > 0) {
            const dx = (Math.random() - 0.5) * this.shakeIntensity;
            const dy = (Math.random() - 0.5) * this.shakeIntensity;
            this.ctx.save();
            this.ctx.translate(dx, dy);
            this.shakeTime--;
            return true; // Indicates shake is active
        }
        return false;
    }

    restoreScreenShake() {
        this.ctx.restore();
    }

    // === XP PARTICLE SYSTEM ===
    spawnXpParticles(x, y, color = COLORS.XP_COLOR) {
        for (let i = 0; i < EFFECTS.XP_PARTICLE_COUNT; i++) {
            this.xpParticles.push({
                x,
                y,
                angle: Math.random() * Math.PI * 2,
                speed: EFFECTS.XP_PARTICLE_MIN_SPEED + Math.random() * (EFFECTS.XP_PARTICLE_MAX_SPEED - EFFECTS.XP_PARTICLE_MIN_SPEED),
                life: EFFECTS.XP_PARTICLE_MIN_LIFE + Math.random() * (EFFECTS.XP_PARTICLE_MAX_LIFE - EFFECTS.XP_PARTICLE_MIN_LIFE),
                maxLife: EFFECTS.XP_PARTICLE_MIN_LIFE + Math.random() * (EFFECTS.XP_PARTICLE_MAX_LIFE - EFFECTS.XP_PARTICLE_MIN_LIFE),
                color,
                size: EFFECTS.XP_PARTICLE_MIN_SIZE + Math.random() * (EFFECTS.XP_PARTICLE_MAX_SIZE - EFFECTS.XP_PARTICLE_MIN_SIZE)
            });
        }
    }

    updateAndDrawXpParticles() {
        for (let i = this.xpParticles.length - 1; i >= 0; i--) {
            const p = this.xpParticles[i];
            
            // Update particle
            p.x += Math.cos(p.angle) * p.speed;
            p.y += Math.sin(p.angle) * p.speed;
            p.speed *= EFFECTS.XP_PARTICLE_FRICTION;
            p.life--;
            
            // Draw particle
            this.ctx.save();
            this.ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = p.color;
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
            
            // Remove dead particles
            if (p.life <= 0) {
                this.xpParticles.splice(i, 1);
            }
        }
    }

    // Move particles when world shifts
    moveXpParticles(offsetX, offsetY) {
        this.xpParticles.forEach(p => {
            p.x += offsetX;
            p.y += offsetY;
        });
    }

    // === STAR BACKGROUND SYSTEM ===
    initStars() {
        this.starLayers = STARS.LAYERS.map(layerConfig => ({
            ...layerConfig,
            stars: []
        }));

        this.starLayers.forEach(layer => {
            for (let i = 0; i < layer.count; i++) {
                layer.stars.push({
                    x: Math.random() * this.canvas.width,
                    y: Math.random() * this.canvas.height
                });
            }
        });
    }

    updateStars(shipX, shipY) {
        const dx = shipX - this.lastShipX;
        const dy = shipY - this.lastShipY;
        
        this.starLayers.forEach(layer => {
            layer.stars.forEach(star => {
                star.x -= dx * layer.speed;
                star.y -= dy * layer.speed;
                
                // Wrap around screen
                if (star.x < 0) star.x += this.canvas.width;
                if (star.x > this.canvas.width) star.x -= this.canvas.width;
                if (star.y < 0) star.y += this.canvas.height;
                if (star.y > this.canvas.height) star.y -= this.canvas.height;
            });
        });
        
        this.lastShipX = shipX;
        this.lastShipY = shipY;
    }

    drawStars() {
        this.starLayers.forEach(layer => {
            this.ctx.save();
            this.ctx.fillStyle = layer.color;
            layer.stars.forEach(star => {
                this.ctx.beginPath();
                this.ctx.arc(star.x, star.y, layer.size, 0, Math.PI * 2);
                this.ctx.fill();
            });
            this.ctx.restore();
        });
    }

    // Move stars when world shifts
    moveStars(offsetX, offsetY) {
        this.starLayers.forEach(layer => {
            layer.stars.forEach(star => {
                star.x += offsetX;
                star.y += offsetY;
            });
        });
    }

    // === MAGNET VISUALIZATION ===
    drawMagnetField(shipX, shipY, magnetRadius, magnetLevel) {
        if (magnetLevel > 0) {
            this.ctx.save();
            this.ctx.globalAlpha = 0.18 + 0.07 * magnetLevel;
            this.ctx.beginPath();
            this.ctx.arc(shipX, shipY, magnetRadius, 0, Math.PI * 2);
            this.ctx.fillStyle = COLORS.MAGNET_COLOR;
            this.ctx.fill();
            this.ctx.restore();
        }
    }

    // === LASER GLOW EFFECTS ===
    drawLaserWithGlow(laser, upgradeLevel = 0) {
        this.ctx.save();
        this.ctx.shadowBlur = 16;
        this.ctx.shadowColor = upgradeLevel >= 3 ? COLORS.LASER_UPGRADED : COLORS.LASER_NORMAL;
        laser.draw(this.ctx);
        this.ctx.restore();
    }

    // === ENEMY LASER EFFECTS ===
    drawEnemyLaser(laser) {
        this.ctx.save();
        this.ctx.translate(laser.x, laser.y);
        this.ctx.rotate(laser.angle);
        
        // Main laser body
        this.ctx.fillStyle = laser.color || 'magenta';
        this.ctx.fillRect(0, -laser.height / 2, laser.width, laser.height);
        
        // Glow effect
        this.ctx.globalAlpha = 0.5;
        this.ctx.fillStyle = laser.glowColor || 'pink';
        this.ctx.fillRect(0, -laser.height / 1.5, laser.width, laser.height * 1.5);
        
        this.ctx.restore();
    }

    // === GLOW EFFECTS FOR ITEMS ===
    drawWithGlow(drawFunction, glowColor, glowIntensity = 18) {
        this.ctx.save();
        this.ctx.shadowBlur = glowIntensity;
        this.ctx.shadowColor = glowColor;
        drawFunction();
        this.ctx.restore();
    }

    // === RESIZE HANDLER ===
    resize(width, height) {
        // Reinitialize stars for new canvas size
        this.initStars();
    }

    // === CLEANUP ===
    clearParticles() {
        this.xpParticles = [];
    }

    // === UTILITY ===
    getParticleCount() {
        return this.xpParticles.length;
    }
}