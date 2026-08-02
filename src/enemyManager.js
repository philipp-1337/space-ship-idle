// enemyManager.js
// Verwaltung von Gegnern, Spawning, Elite-Logik, enemyLasers
import Enemy from './enemy.js'; // Added COLORS
import { GAME_CONFIG, COLORS } from './constants.js';

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

    // Check if an elite enemy should also spawn
    if (level > 0 && level % GAME_CONFIG.ELITE_ENEMY_INTERVAL === 0) {
        const elitePos = getRandomSpawnPosition(canvas);
        const elite = new Enemy(elitePos.x, elitePos.y, level + GAME_CONFIG.ELITE_ENEMY_HP_BONUS, easyMode);
        elite.color = COLORS.ELITE_ENEMY_COLOR; // Use constant
    elite.size = GAME_CONFIG.ELITE_ENEMY_SIZE;
        elite.isElite = true;
        enemies.push(elite);


    }
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
