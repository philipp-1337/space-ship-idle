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
    ENEMY_WAVE_SIZE: 24     // Number of enemies in a wave
};

export const PHYSICS = {
    SHIP_ACCELERATION: 0.15,
    SHIP_MAX_SPEED: 4,
    SHIP_FRICTION: 0.90,
    SHIP_ROTATION_SPEED: 0.07,
    SHIP_ROTATION_RAMP_STEP: 0.06, // per-frame ramp toward full turn speed while a turn key is held
    SHIP_ROTATION_MIN_FACTOR: 0.35, // fraction of full turn speed on the very first held frame (tap = small turn)
    ACCELERATION_UPGRADE_INCREASE: 0.02, // Zuwachs der Beschleunigung pro Upgrade-Level
    BACKWARD_THRUST_FACTOR: 0.7,
    SPEED_UPGRADE_INCREASE: 1.2,
    MARGIN_FACTOR: 0.2, // 20% of canvas for world boundaries
    MOBILE_JOYSTICK_SENSITIVITY: 0.08
};

export const MAGNET = {
    BASE_RADIUS: 30,
    RADIUS_INCREASE: 10,
    BASE_STRENGTH: 0.03,
    STRENGTH_INCREASE: 0.01
};

export const ARMOR = {
    BASE_HP: 1,
    HP_PER_UPGRADE: 1,
    INVULNERABLE_MS: 1200
};

export const OVERDRIVE = {
    DURATION_MS: 8000,
    FIRE_RATE_MULT: 0.5, // multiplies shoot cooldowns
    DAMAGE_MULT: 1.25
};

export const RAPID_FIRE = {
    COOLDOWN_MULT: 0.75 // permanent, stacks multiplicatively with Overdrive
};

export const SHIELD_REGEN = {
    INTERVAL_MS: 8000 // +1 hull point per interval while below max HP
};

export const EXPLOSIVE_ROUNDS = {
    SPLASH_RADIUS: 45,
    SPLASH_DAMAGE_MULT: 0.5
};

export const SALVAGE_DRIVE = {
    DROP_CHANCE_MULT: 2 // doubles GAME_CONFIG.PLASMA_DROP_CHANCE
};

export const COLLECTOR_PULSE = {
    DURATION_MS: 1500,
    STRENGTH: 0.12 // per-frame pull toward the ship, same mechanism as the magnet
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
    // Sized down to 1/3 of the original (was 180/76/140): these are now just a
    // visual "home" reference, not the actual hit target — the whole left/right
    // half of the screen is a live joystick/fire zone (see input.js), so the
    // graphics don't need to be big anymore.
    JOYSTICK_SIZE: 60,
    JOYSTICK_STICK_SIZE: 25,
    JOYSTICK_DEADZONE: 8,
    SHOOT_BUTTON_SIZE: 47,
    CONTAINER_HEIGHT: '40vh',
    // Unscaled px kept clear at the top of the full-height touch zones, so the
    // Level/Hull/Pause/Settings (left) and Plasma/Tech-Tree (right) HUD chrome
    // stays tappable instead of being swallowed by the joystick/fire zones.
    HUD_TOP_RESERVE: 200
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
    XP_COLOR: '#ffd23f', // Gold, passend zum XP-Sphere-Sprite (siehe xp.js)
};

export const PROGRESSION = {
    INITIAL_LEVEL: 1,
    INITIAL_XP: 0,
    INITIAL_MAX_XP: 5,
    XP_INCREASE_PER_LEVEL: 5
};

export const MOBILE = {
    CANVAS_SCALE_FACTOR: 1.2,
    // War 5000 — höher als jedes Modal (Shop 3000, Pre-Flight 3500, Pause 4000,
    // Settings 4500, Tech Tree 5000), wodurch Joystick/Feuer-Zone über den
    // Modals lagen und deren Buttons für Touch unerreichbar machten (sichtbar
    // z.B. beim Pre-Flight-Screen). Jetzt unter dem niedrigsten Modal-Wert.
    TOUCH_Z_INDEX: 1500,
    UI_SCALE_FACTOR: 1.1, // Skalierungsfaktor für UI-Elemente (Texte, Padding etc.) auf Mobilgeräten
    // War 1.5, kalibriert bevor es einen viewport-Meta-Tag gab: Handy-Browser
    // nahmen damals ohne den Tag eine ~980px-Viewport an und skalierten die
    // Seite selbst auf Bildschirmgröße runter — GAME_ZOOM kompensierte genau
    // das. Mit korrektem viewport-Tag (siehe index.html) entfällt dieses
    // implizite Runterskalieren, daher jetzt 1:1 wie am Desktop.
    GAME_ZOOM: 1.0
};