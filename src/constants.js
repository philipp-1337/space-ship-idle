// constants.js - Game Configuration and Constants

// Shared touch-device check — mirrors the inline detection duplicated in
// input.js/ui.js, centralized here for code that needs it in more than one
// module (see upgrades.js: mobile Auto-Fire tech bypass).
export function isTouchDevice() {
    return typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
}

export const GAME_CONFIG = {
    BASE_LASER_DAMAGE: 0.8,
    MAX_LASER_PROJECTILE_SPEED: 26.4,
    LASER_DAMAGE_SOFT_CAP_LEVEL: 20,
    LASER_DAMAGE_EARLY_MULTIPLIER: 1.10,
    LASER_DAMAGE_LATE_MULTIPLIER: 1.07,
    ENEMY_SPAWN_INTERVAL: 1500, // Erhöht die Spawn-Frequenz der Gegner
    LASER_SHOOT_COOLDOWN: 280,
    AUTO_SHOOT_COOLDOWN: 320,
    EXPLOSION_DURATION: 1000,
    PLASMA_DROP_CHANCE: 0.05,
    ELITE_ENEMY_INTERVAL: 10, // Every 10 levels
    ELITE_ENEMY_HP_BONUS: 8,
    ELITE_HINT_DURATION: 3500,
    ELITE_ENEMY_SIZE: 44,
    ENEMY_WAVE_INTERVAL: 5, // Every 5 levels for an enemy wave
    ENEMY_WAVE_SIZE: 24,    // Number of enemies in a wave
    LATE_GAME_START_LEVEL: 25,
    LATE_GAME_SURGE_INTERVAL_MS: 45000,
    LATE_GAME_SURGE_INITIAL_DELAY_MS: 15000,
    LATE_GAME_SURGE_BASE_SIZE: 8,
    LATE_GAME_SURGE_LEVEL_STEP: 15,
    LATE_GAME_SURGE_MAX_SIZE: 20,
    MAX_ACTIVE_ENEMIES: 90,
    // Special enemy unlocks every 10 levels
    LATE_GAME_PRISM_LEVEL: 35,
    LATE_GAME_PHASE_LEVEL: 45,
    LATE_GAME_HUNTER_LEVEL: 55
};

// Sparse points of interest keep the flight space legible: the player gets a
// reason to leave the current skirmish without turning every run into an
// obstacle course. Timers use real milliseconds because the game loop's dt is
// normalized to 60fps.
export const FIELD_EVENTS = {
    FIRST_MARKER_DELAY_MS: 30000,
    MARKER_INTERVAL_MS: 100000,
    MARKER_LIFETIME_MS: 80000,
    MARKER_FOLLOW_COMMIT_DISTANCE: 260,
    MARKER_OFFSCREEN_DISTANCE: 4400,
    MARKER_DISTANCE_VARIANCE: 1800,
    MARKER_CONTACT_RADIUS: 34,
    PLASMA_MAX_LEVEL: 24,
    DRONE_UPLINK_DURATION_MS: 25000,
    HULL_OVERCHARGE_DURATION_MS: 25000,
    FIRST_OBSTACLE_DELAY_MS: 45000,
    OBSTACLE_INTERVAL_MS: 90000,
    OBSTACLE_LIFETIME_MS: 42000,
    MAX_ACTIVE_OBSTACLES: 2
};

// Keep long-distance flight populated without letting normal spawn timers turn
// into a sudden swarm. Existing regular enemies can close the gap first; one
// fresh contact is only added when that still leaves the player alone.
export const COMBAT_PRESSURE = {
    FIRST_CHECK_DELAY_MS: 20000,
    CHECK_INTERVAL_MS: 8000,
    NEARBY_RADIUS: 560,
    MIN_NEARBY_ENEMIES: 3,
    MIN_DISTANT_ENEMIES: 2,
    REPOSITION_LIMIT: 2
};

export function calculateLaserDamage(baseDamage, upgradeLevel) {
    const earlyLevels = Math.min(Math.max(0, upgradeLevel), GAME_CONFIG.LASER_DAMAGE_SOFT_CAP_LEVEL);
    const lateLevels = Math.max(0, upgradeLevel - GAME_CONFIG.LASER_DAMAGE_SOFT_CAP_LEVEL);
    
    // Exponential growth for early levels
    const earlyMult = Math.pow(GAME_CONFIG.LASER_DAMAGE_EARLY_MULTIPLIER, earlyLevels);
    
    // Decaying exponential curve for late game to continuously flatten out.
    // Instead of lateLevels growing linearly, we apply a fractional exponent (0.85),
    // causing the percentage growth to smoothly diminish the higher the level goes.
    const effectiveLateLevels = Math.pow(lateLevels, 0.85);
    const lateMult = Math.pow(GAME_CONFIG.LASER_DAMAGE_LATE_MULTIPLIER, effectiveLateLevels);
    
    return baseDamage * earlyMult * lateMult;
}

export const ENEMY_BALANCE = {
    // Regular enemy HP is budgeted around the player's growing weapon output.
    // Composition, split behavior, and ranged pressure provide the later-game
    // challenge; level should not turn regular enemies into damage sponges.
    HP_LEVEL_GROWTH: 0.3,
    HP_LEVEL_MULTIPLIER: 1.008,
    BOSS_HP_LEVEL_GROWTH: 1.0,
    BOSS_HP_LEVEL_MULTIPLIER: 1.015
};

// Late-game enemies add readable combat decisions instead of only inflating
// regular HP. Values use the existing 60fps-normalized frame units.
export const PRISM_ENEMY = {
    SHIELD_ON_FRAMES: 180,
    SHIELD_OFF_FRAMES: 90
};

export const PHASE_STALKER = {
    PHASE_DURATION_FRAMES: 90, // was 42
    PHASE_COOLDOWN_FRAMES: 120 // was 150
};

export const HUNTER_ENEMY = {
    DASH_RANGE: 500, // was 420
    DASH_DURATION_FRAMES: 60, // was 36
    DASH_COOLDOWN_FRAMES: 160,
    DASH_SPEED_MULTIPLIER: 2.8 // was 2.2
};

export const FLIGHT_PROTOCOL_SLOT_COUNT = 3;

// Permanent post-tree loadout options. Their effects are intentionally
// tactical counters and risk/reward modifiers, not another linear laser-DPS
// ladder.
export const FLIGHT_PROTOCOLS = [
    { key: 'prismPiercer', label: 'Prism Piercer', description: 'Bypasses the first Prism shield hit.', cost: 12, minLevel: 35 },
    { key: 'phaseLock', label: 'Phase Lock', description: 'Shortens Phase Stalker invulnerability windows.', cost: 14, minLevel: 45 },
    { key: 'hunterDampener', label: 'Hunter Dampener', description: 'Reduces Hunter dash speed and pressure.', cost: 14, minLevel: 55 },
    { key: 'emergencyVector', label: 'Emergency Vector', description: 'Once per flight, survive one otherwise lethal hit at 1 hull.', cost: 18, minLevel: 35 },
    { key: 'deepScan', label: 'Deep Scan', description: 'Special enemies yield double Flight Data, but appear more often in surges.', cost: 16, minLevel: 45 }
];

export const PHYSICS = {
    SHIP_ACCELERATION: 0.15,
    SHIP_MAX_SPEED: 4,
    SHIP_FRICTION: 0.90,
    SHIP_ROTATION_SPEED: 0.07,
    SHIP_ROTATION_RAMP_STEP: 0.06, // per-frame ramp toward full turn speed while a turn key is held
    SHIP_ROTATION_MIN_FACTOR: 0.35, // fraction of full turn speed on the very first held frame (tap = small turn)
    ACCELERATION_UPGRADE_INCREASE: 0.02, // Zuwachs der Beschleunigung pro Upgrade-Level
    BACKWARD_THRUST_FACTOR: 0.7,
    STRAFE_THRUST_FACTOR: 0.8, // lateral (Q/E, mobile strafe stick) thrust relative to forward acceleration
    SPEED_UPGRADE_INCREASE: 1.2,
    MARGIN_FACTOR: 0.2, // 20% of canvas for world boundaries
    MOBILE_JOYSTICK_TURN_SPEED: 0.055,
    MOBILE_JOYSTICK_RESPONSE_CURVE: 1.6,
    MOBILE_ONE_HANDED_JOYSTICK_SENSITIVITY: 0.08
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
    INVULNERABLE_MS: 2400 // doubled per player feedback — the old 1200ms window felt like frequent insta-deaths
};

export const OVERDRIVE = {
    DURATION_MS: 8000,
    FIRE_RATE_MULT: 0.5, // multiplies shoot cooldowns
    DAMAGE_MULT: 1.25
};

export const OVERDRIVE_CORE = {
    DURATION_MULT_PER_LEVEL: 0.5, // level N -> duration x(1 + 0.5*N), capped at MAX_LEVEL
    MAX_LEVEL: 3
};

export const XP_BOOST = {
    XP_PER_LEVEL: 0.05,
    MAX_LEVEL: 5
};

export const XP_TECH = {
    RESONANCE_MULT: 0.10,
    CASCADE_MULT: 0.10,
    LEARNING_MULT: 0.20,
    LEARNING_LEVEL_CAP: 5
};

export const RAPID_FIRE = {
    COOLDOWN_MULT: 0.75 // permanent, stacks multiplicatively with Overdrive
};

export const REPAIR_MODULE = {
    BASE_INTERVAL_MS: 45000, // level 1: +1 shield point every 45s while below max HP
    INTERVAL_STEP_MS: 5000, // each further level shortens the interval by this much
    MIN_INTERVAL_MS: 25000 // floor — reached at level 5
};

export const CHAIN_LIGHTNING = {
    CHANCE_PER_LEVEL: 0.2, // level N -> arc chance N*20%, capped at MAX_CHANCE
    MAX_CHANCE: 0.9, // reached at level 5
    DAMAGE_MULT: 0.5, // arc damage relative to the triggering laser's damage
    RANGE: 140, // px, how far the arc can jump to find a second target
    FLASH_LIFE: 10 // frames the visual arc line stays visible
};

export const SIGNAL_INTERFERENCE = {
    COOLDOWN_MS: 15000,
    DISRUPTION_MS: 4500,
    VISUAL_LIFE: 60
};

export const REACTOR_NOVA = {
    KILLS_PER_TRIGGER: 32,
    COOLDOWN_MS: 15000,
    RADIUS_FACTOR: 0.72,
    MIN_RADIUS: 280,
    DAMAGE: 4,
    VISUAL_LIFE: 48
};

export const EXPLOSIVE_ROUNDS = {
    SPLASH_RADIUS: 45,
    SPLASH_DAMAGE_MULT: 0.5
};

export const SALVAGE_DRIVE = {
    DROP_CHANCE_MULT: 2 // doubles GAME_CONFIG.PLASMA_DROP_CHANCE
};

export const DRONE = {
    ORBIT_RADIUS: 55,
    ORBIT_SPEED: 0.035, // rad pro Frame @60fps
    SIZE: 14,
    FIRE_RANGE: 220,
    FIRE_COOLDOWN_MS: 650,
    BASE_DAMAGE_MULTIPLIER: 0.45,
    DAMAGE_MULTIPLIER_PER_RANK: 0.12
};

export const HOMING_MISSILE_TECH = {
    BASE_DAMAGE: 6,
    DAMAGE_BONUS_PER_RANK: 1.2,
    BASE_LIFE: 240,
    LIFE_BONUS: 120,
    BASE_LOST_TARGET_GRACE_FRAMES: 90,
    LOST_TARGET_GRACE_BONUS: 60,
    BASE_EXPLOSION_RADIUS: 60,
    EXPLOSION_RADIUS_BONUS: 25,
    BASE_TURN_SPEED: 0.045,
    TURN_SPEED_BONUS: 0.015
};

export const AEGIS_PULSE = {
    CHARGE_FRAMES: 48,
    COOLDOWN_FRAMES: 420,
    SPEED: 1.7,
    LIFE_FRAMES: 360,
    HOMING_FRAMES: 54,
    TURN_SPEED: 0.028,
    DAMAGE: 2,
    RADIUS: 7
};

// The boss weapon is deliberately telegraphed: the lock-on gives the player
// a chance to move, while the limited turn rate makes sustained flight the
// reliable answer instead of a reflex-only dodge.
export const BOSS_LASER = {
    CHARGE_FRAMES: 60,
    FIRE_FRAMES: 240,
    COOLDOWN_FRAMES: 450,
    TURN_SPEED: 0.016,
    LENGTH: 2000,
    DAMAGE: 1,
    HIT_RADIUS: 22
};

export const COLLECTOR_PULSE = {
    BASE_DURATION_MS: 1500, // level 1 pull duration
    DURATION_STEP_MS: 400, // each further level extends the pull by this much
    MAX_DURATION_MS: 3500, // ceiling, reached at level 6 — stays offered past this, just stops growing
    STRENGTH: 0.12 // per-frame pull toward the ship, same mechanism as the magnet
};

export const DEFLECTOR_SHIELD = {
    BASE_RECHARGE_MS: 15000, // level 1 recharge time after a charge is consumed
    RECHARGE_STEP_MS: 3000, // each further level shortens the recharge by this much
    MIN_RECHARGE_MS: 6000 // floor — reached at level 4
};

export const EFFECTS = {
    SCREEN_SHAKE_INTENSITY: 8,
    SCREEN_SHAKE_DURATION: 18,
    SCREEN_SHAKE_HIT_INTENSITY: 12,
    SCREEN_SHAKE_HIT_DURATION: 24,
    SCREEN_SHAKE_LASER_INTENSITY: 8,
    SCREEN_SHAKE_LASER_DURATION: 15,
    
    // XP Particles
    XP_ORB_MAX_ACTIVE: 200,
    XP_PARTICLE_COUNT: 12,
    XP_PARTICLE_MAX_ACTIVE: 480,
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
    JOYSTICK_DEADZONE: 5,
    // Shared left/right inset from the screen edge for both maneuver sticks.
    EDGE_MARGIN: 36,
    // The right stick controls thrust by default; horizontal strafe is enabled
    // through the Advanced mobile control setting.
    RIGHT_STICK_SIZE: 72,
    RIGHT_STICK_KNOB_SIZE: 28,
    STRAFE_DEADZONE: 5,
    CONTAINER_HEIGHT: '40vh',
    // Unscaled px kept clear at the top of the full-height touch zones, so the
    // Level/Pause/Settings (left) and Plasma/Tech-Tree (right) HUD chrome
    // stays tappable instead of being swallowed by the joystick/fire zones.
    HUD_TOP_RESERVE: 200
};

export const ENEMY_LASER = {
    SPEED: 5,
    LIFE: 210,
    EXPLOSION_LIFE: 12,
    WIDTH: 10,
    HEIGHT: 4,
    COLOR: 'magenta',
    GLOW_COLOR: 'pink'
};

export const COLORS = {
    LASER_NORMAL: 'red',
    LASER_UPGRADED: 'cyan',
    MAGNET_COLOR: '#7fe8ff', // Scope Cyan, passend zur Tech-/Sammel-Farbfamilie (Plasma, Tech Tree)
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
    CANVAS_SCALE_FACTOR: 1.0,
    // War 5000 — höher als jedes Modal (Shop 3000, Pre-Flight 3500, Pause 4000,
    // Settings 4500, Tech Tree 5000), wodurch Joystick/Feuer-Zone über den
    // Modals lagen und deren Buttons für Touch unerreichbar machten (sichtbar
    // z.B. beim Pre-Flight-Screen). Jetzt unter dem niedrigsten Modal-Wert.
    TOUCH_Z_INDEX: 1500,
    UI_SCALE_FACTOR: 1.0, // Skalierungsfaktor für UI-Elemente (Texte, Padding etc.) auf Mobilgeräten
    // War 1.5, kalibriert bevor es einen viewport-Meta-Tag gab: Handy-Browser
    // nahmen damals ohne den Tag eine ~980px-Viewport an und skalierten die
    // Seite selbst auf Bildschirmgröße runter — GAME_ZOOM kompensierte genau
    // das. Mit korrektem viewport-Tag (siehe index.html) entfällt dieses
    // implizite Runterskalieren, daher jetzt 1:1 wie am Desktop.
    GAME_ZOOM: 1.0
};
