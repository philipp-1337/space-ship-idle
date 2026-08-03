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
    const edge = Math.floor(Math.random() * 4);
    if (edge === 0) { // Left edge
        x = 0; y = Math.random() * window.logicalHeight;
    } else if (edge === 1) { // Right edge
        x = window.logicalWidth; y = Math.random() * window.logicalHeight;
    } else if (edge === 2) { // Top edge
        x = Math.random() * window.logicalWidth; y = 0;
    } else { // Bottom edge (edge === 3)
        x = Math.random() * window.logicalWidth; y = window.logicalHeight;
    }
    return { x, y };
}

export function spawnEnemy(canvas, level, techUpgrades, easyMode = false) {
    // Spawn a regular enemy
    const regularPos = getRandomSpawnPosition(canvas);
    enemies.push(new Enemy(regularPos.x, regularPos.y, level, easyMode));
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
