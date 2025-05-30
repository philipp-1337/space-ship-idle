// enemyManager.js
// Verwaltung von Gegnern, Spawning, Elite-Logik, enemyLasers
import Enemy from './enemy.js';
import PlasmaCell from './plasma.js';
import XP from './xp.js';
import { GAME_CONFIG } from './constants.js';

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

export function spawnEnemy(canvas, level, techUpgrades) {
    // Spawn at random edge
    let x, y;
    const edge = Math.floor(Math.random() * 4);
    if (edge === 0) { x = 0; y = Math.random() * canvas.height; }
    if (edge === 1) { x = canvas.width; y = Math.random() * canvas.height; }
    if (edge === 2) { x = Math.random() * canvas.width; y = 0; }
    if (edge === 3) { x = Math.random() * canvas.width; y = canvas.height; }
    enemies.push(new Enemy(x, y, level));
    // Alle 10 Level: Elite-Gegner
    if (level > 0 && level % 10 === 0) {
        let x, y;
        const edge = Math.floor(Math.random() * 4);
        if (edge === 0) { x = 0; y = Math.random() * canvas.height; }
        if (edge === 1) { x = canvas.width; y = Math.random() * canvas.height; }
        if (edge === 2) { x = Math.random() * canvas.width; y = 0; }
        if (edge === 3) { x = Math.random() * canvas.width; y = canvas.height; }
        const elite = new Enemy(x, y, level + 8);
        elite.color = 'gold';
        elite.size = 44;
        elite.isElite = true;
        enemies.push(elite);
        // Optional: Hinweis im UI
        if (techUpgrades && techUpgrades.eliteHint) {
            let hint = document.getElementById('elite-hint');
            if (!hint) {
                hint = document.createElement('div');
                hint.id = 'elite-hint';
                hint.style.position = 'fixed';
                hint.style.top = '80px';
                hint.style.right = '18px';
                hint.style.zIndex = '2000';
                hint.style.background = 'gold';
                hint.style.color = '#222';
                hint.style.fontWeight = 'bold';
                hint.style.fontSize = '20px';
                hint.style.padding = '10px 24px';
                hint.style.borderRadius = '12px';
                hint.style.boxShadow = '0 2px 8px 0 #ff0';
                document.body.appendChild(hint);
            }
            hint.innerText = 'Elite-Gegner gesichtet!';
            setTimeout(() => { if (hint) hint.remove(); }, 3500);
        }
    } else {
        // Normale Gegner
        let x, y;
        const edge = Math.floor(Math.random() * 4);
        if (edge === 0) { x = 0; y = Math.random() * canvas.height; }
        if (edge === 1) { x = canvas.width; y = Math.random() * canvas.height; }
        if (edge === 2) { x = Math.random() * canvas.width; y = 0; }
        if (edge === 3) { x = Math.random() * canvas.width; y = canvas.height; }
        enemies.push(new Enemy(x, y, level));
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
