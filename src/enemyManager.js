// enemyManager.js
// Verwaltung von Gegnern, Spawning, Elite-Logik, enemyLasers
import Enemy from './enemy.js';
import { GAME_CONFIG, COLORS } from './constants.js'; // Added COLORS

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
        x = 0; y = Math.random() * canvas.height;
    } else if (edge === 1) { // Right edge
        x = canvas.width; y = Math.random() * canvas.height;
    } else if (edge === 2) { // Top edge
        x = Math.random() * canvas.width; y = 0;
    } else { // Bottom edge (edge === 3)
        x = Math.random() * canvas.width; y = canvas.height;
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
        elite.size = 44; // Consider making this a constant, e.g., GAME_CONFIG.ELITE_ENEMY_SIZE
        elite.isElite = true;
        enemies.push(elite);

        // Display hint if the tech upgrade is active
        if (techUpgrades && techUpgrades.eliteHint) {
            let hint = document.getElementById('elite-hint');
            if (!hint) {
                hint = document.createElement('div');
                hint.id = 'elite-hint';
                // Styling for the hint
                Object.assign(hint.style, {
                    position: 'fixed', top: '80px', right: '18px', zIndex: '2000',
                    background: 'gold', color: '#222', fontWeight: 'bold',
                    fontSize: '20px', padding: '10px 24px', borderRadius: '12px',
                    boxShadow: '0 2px 8px 0 #ff0'
                });
                document.body.appendChild(hint);
            }
            hint.innerText = 'Elite-Gegner gesichtet!';
            setTimeout(() => { if (hint) hint.remove(); }, GAME_CONFIG.ELITE_HINT_DURATION);
        }
    }
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
