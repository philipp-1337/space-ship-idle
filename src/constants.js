// constants.js - Game Configuration and Constants

export const GAME_CONFIG = {
    BASE_LASER_DAMAGE: 0.8,
    ENEMY_SPAWN_INTERVAL: 2500, // Erhöht die Spawn-Frequenz der Gegner
    LASER_SHOOT_COOLDOWN: 280,
    AUTO_SHOOT_COOLDOWN: 320,
    EXPLOSION_DURATION: 1000,
    PLASMA_DROP_CHANCE: 0.05,
    ELITE_ENEMY_INTERVAL: 10, // Every 10 levels
    ELITE_ENEMY_HP_BONUS: 8,
    ELITE_HINT_DURATION: 3500,
    ELITE_ENEMY_SIZE: 44,
    ENEMY_WAVE_INTERVAL: 5, // Every 5 levels for an enemy wave
    ENEMY_WAVE_SIZE: 10     // Number of enemies in a wave
};

export const PHYSICS = {
    SHIP_ACCELERATION: 0.15,
    SHIP_MAX_SPEED: 4,
    SHIP_FRICTION: 0.90,
    SHIP_ROTATION_SPEED: 0.07,
    ACCELERATION_UPGRADE_INCREASE: 0.02, // Zuwachs der Beschleunigung pro Upgrade-Level
    BACKWARD_THRUST_FACTOR: 0.7,
    SPEED_UPGRADE_INCREASE: 1.2,
    MARGIN_FACTOR: 0.2 // 20% of canvas for world boundaries
};

export const MAGNET = {
    BASE_RADIUS: 30,
    RADIUS_INCREASE: 10,
    BASE_STRENGTH: 0.03,
    STRENGTH_INCREASE: 0.01
};

export const EFFECTS = {
    SCREEN_SHAKE_INTENSITY: 8,
    SCREEN_SHAKE_DURATION: 18,
    SCREEN_SHAKE_HIT_INTENSITY: 12,
    SCREEN_SHAKE_HIT_DURATION: 24,
    SCREEN_SHAKE_LASER_INTENSITY: 8,
    SCREEN_SHAKE_LASER_DURATION: 15,
    
    // XP Particles
    XP_PARTICLE_COUNT: 12,
    XP_PARTICLE_MIN_SPEED: 1.2,
    XP_PARTICLE_MAX_SPEED: 3.0,
    XP_PARTICLE_MIN_LIFE: 18,
    XP_PARTICLE_MAX_LIFE: 28,
    XP_PARTICLE_MIN_SIZE: 1.5,
    XP_PARTICLE_MAX_SIZE: 3.0,
    XP_PARTICLE_FRICTION: 0.93
};

export const STARS = {
    LAYERS: [
        { count: 60, speed: 0.15, size: 1.2, color: 'rgba(255,255,255,0.7)' },
        { count: 40, speed: 0.08, size: 1.7, color: 'rgba(180,220,255,0.5)' },
        { count: 20, speed: 0.04, size: 2.2, color: 'rgba(255,255,200,0.3)' }
    ]
};

export const TOUCH_CONTROLS = {
    JOYSTICK_SIZE: 180,
    JOYSTICK_STICK_SIZE: 76,
    JOYSTICK_DEADZONE: 18,
    SHOOT_BUTTON_SIZE: 140,
    CONTAINER_HEIGHT: '40vh'
};

export const ENEMY_LASER = {
    SPEED: 5,
    LIFE: 80,
    WIDTH: 10,
    HEIGHT: 4,
    COLOR: 'magenta',
    GLOW_COLOR: 'pink'
};

export const COLORS = {
    ELITE_ENEMY_COLOR: 'gold',
    LASER_NORMAL: 'red',
    LASER_UPGRADED: 'cyan',
    MAGNET_COLOR: 'deepskyblue',
    PLASMA_COLOR: 'aqua',
    XP_COLOR: 'deepskyblue',
};

export const PROGRESSION = {
    INITIAL_LEVEL: 1,
    INITIAL_XP: 0,
    INITIAL_MAX_XP: 5,
    XP_INCREASE_PER_LEVEL: 5
};

export const MOBILE = {
    CANVAS_SCALE_FACTOR: 2,
    TOUCH_Z_INDEX: 5000,
    UI_SCALE_FACTOR: 1.8 // Skalierungsfaktor für UI-Elemente (Texte, Padding etc.) auf Mobilgeräten
};