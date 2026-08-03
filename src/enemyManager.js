// enemyManager.js
// Verwaltung von Gegnern, Spawning, Elite-Logik, enemyLasers
import Enemy, { BOSS_TYPE } from './enemy.js';
import { GAME_CONFIG } from './constants.js';
import { AudioManager } from './audio/AudioManager.js';

export let enemies = [];
export let enemyLasers = [];
export let enemySpawnIntervalId = null;

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
    // Determine how many enemies to spawn. 
    // Base is 1. Add an extra "popcorn" (level 1) enemy every 4 levels for the bullet heaven feel.
    const extraSpawns = Math.floor((level - 1) / 4);
    
    // Spawn the main enemy scaled to current level
    const regularPos = getRandomSpawnPosition(canvas);
    enemies.push(new Enemy(regularPos.x, regularPos.y, level, easyMode));
    
    // Spawn additional easy swarm enemies
    for (let i = 0; i < extraSpawns; i++) {
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
        const angle = (Math.PI * 2 / numEnemies) * i;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        enemies.push(new Enemy(x, y, level, easyMode));
    }
}

export function spawnBossRewardWave(canvas, x, y, easyMode = false) {
    const numEnemies = 60;
    const radius = 180;
    
    for (let i = 0; i < numEnemies; i++) {
        const angle = (Math.PI * 2 / numEnemies) * i;
        const ex = x + Math.cos(angle) * radius;
        const ey = y + Math.sin(angle) * radius;
        // Spawn popcorn enemies (level 1)
        const enemy = new Enemy(ex, ey, 1, easyMode);
        // Add a small delay so the laser has time to spawn and hit them
        enemy.hitTimer = 0;
        enemies.push(enemy);
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
