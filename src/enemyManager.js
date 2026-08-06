// enemyManager.js
// Verwaltung von Gegnern, Spawning, Elite-Logik, enemyLasers
import Enemy, { BOSS_TYPE, ENEMY_TYPES, SURGE_AEGIS_TYPE } from './enemy.js';
import { GAME_CONFIG, AEGIS_PULSE } from './constants.js';
import { AudioManager } from './audio/AudioManager.js';

export let enemies = [];
export let enemyLasers = [];
export let enemySpawnIntervalId = null;

function activeEnemyCount() {
    return enemies.reduce((count, enemy) => count + (enemy.alive && !enemy.exploding ? 1 : 0), 0);
}

function canSpawnEnemy() {
    return activeEnemyCount() < GAME_CONFIG.MAX_ACTIVE_ENEMIES;
}

export function spawnEnemyLaser(x, y, angle) {
    enemyLasers.push({
        x,
        y,
        angle,
        speed: 5,
        life: 80
    });
    AudioManager.play('ENEMY_LASER');
}

export function spawnAegisPulse(x, y, angle, sourceVisible) {
    enemyLasers.push({
        kind: 'aegisPulse', x, y, angle,
        speed: AEGIS_PULSE.SPEED,
        life: AEGIS_PULSE.LIFE_FRAMES,
        homingFrames: AEGIS_PULSE.HOMING_FRAMES,
        turnSpeed: AEGIS_PULSE.TURN_SPEED,
        damage: AEGIS_PULSE.DAMAGE,
        radius: AEGIS_PULSE.RADIUS
    });
    if (sourceVisible) AudioManager.play('ENEMY_PULSE_START', 0.55);
}

// Helper function to get random spawn position on the canvas edge
function getRandomSpawnPosition(canvas) {
    let x, y;
    const padding = 80; // Spawn completely outside the screen
    const edge = Math.floor(Math.random() * 4);
    if (edge === 0) { // Left edge
        x = -padding; y = Math.random() * window.logicalHeight;
    } else if (edge === 1) { // Right edge
        x = window.logicalWidth + padding; y = Math.random() * window.logicalHeight;
    } else if (edge === 2) { // Top edge
        x = Math.random() * window.logicalWidth; y = -padding;
    } else { // Bottom edge (edge === 3)
        x = Math.random() * window.logicalWidth; y = window.logicalHeight + padding;
    }
    return { x, y };
}

export function spawnEnemy(canvas, level, techUpgrades, easyMode = false) {
    if (!canSpawnEnemy()) return;
    // Keep level-1 "popcorn" enemies as a light swarm accent instead of
    // letting their population grow without bound. The main enemy still
    // scales with the current level; popcorn ramps in from level 5 and caps
    // at three extras per spawn.
    const extraSpawns = Math.min(3, Math.floor(level / 5));
    
    // Spawn the main enemy scaled to current level
    const regularPos = getRandomSpawnPosition(canvas);
    enemies.push(new Enemy(regularPos.x, regularPos.y, level, easyMode));
    
    // Spawn additional easy swarm enemies
    for (let i = 0; i < extraSpawns && canSpawnEnemy(); i++) {
        const extraPos = getRandomSpawnPosition(canvas);
        enemies.push(new Enemy(extraPos.x, extraPos.y, 1, easyMode));
    }
}

// Ein einzelner Boss statt eines wiederholten Elite-Spawns: wird einmalig beim
// Erreichen eines ELITE_ENEMY_INTERVAL-Levels ausgelöst (siehe levelUp() in
// gameLoop.js), nicht mehr aus dem wiederkehrenden spawnEnemy()-Tick heraus —
// sonst spawnte für die gesamte Dauer eines solchen Levels alle
// ENEMY_SPAWN_INTERVAL ms ein weiterer Elite-Gegner zusätzlich.
export function spawnBoss(canvas, level, easyMode = false) {
    const pos = getRandomSpawnPosition(canvas);
    const boss = new Enemy(pos.x, pos.y, level + GAME_CONFIG.ELITE_ENEMY_HP_BONUS, easyMode, BOSS_TYPE);
    boss.size = GAME_CONFIG.ELITE_ENEMY_SIZE;
    boss.isElite = true;
    enemies.push(boss);
    AudioManager.play('ENEMY_BOSS');
    return boss;
}

export function spawnEnemyWave(canvas, level, easyMode = false) {
    console.log(`Spawning enemy wave for level ${level}!`);
    const numEnemies = GAME_CONFIG.ENEMY_WAVE_SIZE;
    const centerX = window.logicalWidth / 2;
    const centerY = window.logicalHeight / 2;
    // Spawn outside the visible screen
    const radius = Math.max(window.logicalWidth, window.logicalHeight) / 2 + 100;
    
    for (let i = 0; i < numEnemies; i++) {
        if (!canSpawnEnemy()) break;
        const angle = (Math.PI * 2 / numEnemies) * i;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        enemies.push(new Enemy(x, y, level, easyMode));
    }
}

// Late-game surges add short, readable pressure through composition and
// density. They are deliberately capped and do not increase enemy HP.
export function spawnLateGameSurge(canvas, level, easyMode = false) {
    const availableTypes = ENEMY_TYPES.filter(type => level >= type.minLevel && type.shape !== 'triangle');
    const surgeSize = Math.min(
        GAME_CONFIG.LATE_GAME_SURGE_MAX_SIZE,
        GAME_CONFIG.LATE_GAME_SURGE_BASE_SIZE + Math.floor((level - GAME_CONFIG.LATE_GAME_START_LEVEL) / GAME_CONFIG.LATE_GAME_SURGE_LEVEL_STEP)
    );
    const centerX = window.logicalWidth / 2;
    const centerY = window.logicalHeight / 2;
    const radius = Math.max(window.logicalWidth, window.logicalHeight) / 2 + 140;

    for (let i = 0; i < surgeSize; i++) {
        if (!canSpawnEnemy()) break;
        const angle = (Math.PI * 2 / surgeSize) * i + Math.random() * 0.18;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        const forcedType = Math.random() < 0.28
            ? SURGE_AEGIS_TYPE
            : (availableTypes.length ? availableTypes[Math.floor(Math.random() * availableTypes.length)] : null);
        enemies.push(new Enemy(x, y, level, easyMode, forcedType));
    }
}

export function startEnemySpawning(canvas, levelRef, techUpgradesRef, isPausedRef, isShopOpenRef, isGameOverRef, easyModeRef) {
    if (enemySpawnIntervalId) clearInterval(enemySpawnIntervalId);
    enemySpawnIntervalId = setInterval(() => {
        // Skip spawning if game is paused, shop is open, or game over
        if (isPausedRef && isPausedRef.value) return;
        if (isShopOpenRef && isShopOpenRef.value) return;
        if (isGameOverRef && isGameOverRef.value) return;

        const easyMode = easyModeRef ? easyModeRef.value : false;
        spawnEnemy(canvas, levelRef.value, techUpgradesRef.value, easyMode);
    }, GAME_CONFIG.ENEMY_SPAWN_INTERVAL);
}

export function stopEnemySpawning() {
    if (enemySpawnIntervalId) clearInterval(enemySpawnIntervalId);
    enemySpawnIntervalId = null;
}

export function spawnSplitEnemies(parentEnemy, easyMode = false) {
    let spawnShape = null;
    let spawnCount = 2;

    if (parentEnemy.type.shape === 'pentagon') {
        spawnShape = 'square';
    } else if (parentEnemy.type.shape === 'square') {
        spawnShape = 'triangle';
    } else {
        return; // Other shapes don't split
    }

    const childType = ENEMY_TYPES.find(t => t.shape === spawnShape);
    if (!childType) return;

    for (let i = 0; i < spawnCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const offset = 15;
        const x = parentEnemy.x + Math.cos(angle) * offset;
        const y = parentEnemy.y + Math.sin(angle) * offset;
        
        // Spawn with the child's minimum level to match its stats
        const child = new Enemy(x, y, childType.minLevel, easyMode, childType);
        enemies.push(child);
    }
}
