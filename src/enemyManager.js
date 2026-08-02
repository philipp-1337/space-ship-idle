// enemyManager.js
// Verwaltung von Gegnern, Spawning, Elite-Logik, enemyLasers
import Enemy from './enemy.js'; // Added COLORS
import { GAME_CONFIG, COLORS } from './constants.js';
import { showEliteHint } from './ui.js';

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
        x = 0; y = Math.random() * window.innerHeight;
    } else if (edge === 1) { // Right edge
        x = window.innerWidth; y = Math.random() * window.innerHeight;
    } else if (edge === 2) { // Top edge
        x = Math.random() * window.innerWidth; y = 0;
    } else { // Bottom edge (edge === 3)
        x = Math.random() * window.innerWidth; y = window.innerHeight;
    }
    return { x, y };
}

export function spawnEnemy(canvas, level, techUpgrades) {
    // Spawn a regular enemy
    const regularPos = getRandomSpawnPosition(canvas);
    enemies.push(new Enemy(regularPos.x, regularPos.y, level));

    // Check if an elite enemy should also spawn
    if (level > 0 && level % GAME_CONFIG.ELITE_ENEMY_INTERVAL === 0) {
        const elitePos = getRandomSpawnPosition(canvas);
        const elite = new Enemy(elitePos.x, elitePos.y, level + GAME_CONFIG.ELITE_ENEMY_HP_BONUS);
        elite.color = COLORS.ELITE_ENEMY_COLOR; // Use constant
    elite.size = GAME_CONFIG.ELITE_ENEMY_SIZE; 
        elite.isElite = true;
        enemies.push(elite);

        // Display hint if the tech upgrade is active
        if (techUpgrades && techUpgrades.eliteHint) {
            showEliteHint(GAME_CONFIG.ELITE_HINT_DURATION);
        }
    }
}

export function spawnEnemyWave(canvas, level) {
    console.log(`Spawning enemy wave for level ${level}!`);
    for (let i = 0; i < GAME_CONFIG.ENEMY_WAVE_SIZE; i++) {
        const pos = getRandomSpawnPosition(canvas);
        // Spawnt reguläre Gegner, skaliert auf das aktuelle Level
        enemies.push(new Enemy(pos.x, pos.y, level));
    }
    // Hier könnte man optional eine kleine Verzögerung zwischen den Spawns einbauen,
    // aber für den Anfang spawnen wir alle gleichzeitig.
}
export function startEnemySpawning(canvas, levelRef, techUpgradesRef) {
    if (enemySpawnIntervalId) clearInterval(enemySpawnIntervalId);
    enemySpawnIntervalId = setInterval(() => {
        spawnEnemy(canvas, levelRef.value, techUpgradesRef.value);
    }, GAME_CONFIG.ENEMY_SPAWN_INTERVAL);
}

export function stopEnemySpawning() {
    if (enemySpawnIntervalId) clearInterval(enemySpawnIntervalId);
    enemySpawnIntervalId = null;
}
