// filepath: /Users/philippkanter/Developer/space-ship-idle/src/ui.js
export function updateExperienceBar(currentXP, maxXP) {
    let experienceBar = document.getElementById('experience-bar');
    if (!experienceBar) {
        experienceBar = document.createElement('div');
        experienceBar.id = 'experience-bar';
        experienceBar.style.position = 'fixed';
        experienceBar.style.top = '0';
        experienceBar.style.left = '0';
        experienceBar.style.height = '12px';
        experienceBar.style.background = 'linear-gradient(90deg, #00ff99 0%, #00eaff 100%)';
        experienceBar.style.zIndex = '1000';
        experienceBar.style.boxShadow = '0 0 16px 4px #00eaff, 0 2px 8px 0 #222';
        experienceBar.style.transition = 'width 0.35s cubic-bezier(.4,1.6,.4,1)';
        experienceBar.style.borderRadius = '0 0 12px 0';
        document.body.appendChild(experienceBar);
    }
    experienceBar.style.width = `${(currentXP / maxXP) * 100}%`;
}

export function displayLevel(level, pop = false) {
    let levelDisplay = document.getElementById('level-display');
    if (!levelDisplay) {
        levelDisplay = document.createElement('div');
        levelDisplay.id = 'level-display';
        levelDisplay.style.position = 'fixed';
        levelDisplay.style.top = '12px';
        levelDisplay.style.left = '10px';
        levelDisplay.style.color = 'white';
        levelDisplay.style.fontSize = '20px';
        levelDisplay.style.zIndex = '1000';
        levelDisplay.style.fontWeight = 'bold';
        levelDisplay.style.padding = '6px 18px';
        levelDisplay.style.borderRadius = '16px';
        levelDisplay.style.background = 'rgba(30,40,60,0.85)';
        levelDisplay.style.boxShadow = '0 0 16px 4px deepskyblue, 0 2px 8px 0 #222';
        levelDisplay.style.textShadow = '0 0 8px #00eaff, 0 2px 4px #222';
        levelDisplay.style.transition = 'transform 0.18s cubic-bezier(.4,1.6,.4,1), box-shadow 0.18s';
        document.body.appendChild(levelDisplay);
    }
    levelDisplay.innerText = `Level: ${level}`;
    // Pop-Animation bei Level-Up
    if (pop) {
        levelDisplay.style.transform = 'scale(1.25)';
        levelDisplay.style.boxShadow = '0 0 32px 8px #00eaff, 0 2px 8px 0 #222';
        setTimeout(() => {
            levelDisplay.style.transform = 'scale(1)';
            levelDisplay.style.boxShadow = '0 0 16px 4px deepskyblue, 0 2px 8px 0 #222';
        }, 180);
    }
}

export function initializeUI() {
    updateExperienceBar(0, 1);
    displayLevel(1);
}

export function displayGameOverScreen(currentLevel) {
    if (document.getElementById('game-over-screen')) {
        return; // Verhindert mehrfache Erstellung
    }

    const gameOverScreen = document.createElement('div');
    gameOverScreen.id = 'game-over-screen';
    gameOverScreen.style.position = 'fixed';
    gameOverScreen.style.top = '0';
    gameOverScreen.style.left = '0';
    gameOverScreen.style.width = '100%';
    gameOverScreen.style.height = '100%';
    gameOverScreen.style.backgroundColor = 'rgba(0, 0, 0, 0.75)';
    gameOverScreen.style.color = 'white';
    gameOverScreen.style.display = 'flex';
    gameOverScreen.style.flexDirection = 'column';
    gameOverScreen.style.justifyContent = 'center';
    gameOverScreen.style.alignItems = 'center';
    gameOverScreen.style.zIndex = '2000'; // Stellt sicher, dass es über allem liegt

    const gameOverText = document.createElement('h1');
    gameOverText.innerText = 'Game Over!';
    gameOverText.style.fontSize = '48px';
    gameOverText.style.marginBottom = '20px';

    const levelText = document.createElement('p');
    levelText.innerText = `Du hast Level ${currentLevel} erreicht!`;
    levelText.style.fontSize = '24px';
    levelText.style.marginBottom = '30px';

    const restartButton = document.createElement('button');
    restartButton.innerText = 'Spiel neustarten';
    restartButton.style.padding = '15px 30px';
    restartButton.style.fontSize = '20px';
    restartButton.style.cursor = 'pointer';
    restartButton.style.border = 'none';
    restartButton.style.borderRadius = '5px';
    restartButton.style.backgroundColor = 'limegreen';
    restartButton.style.color = 'white';
    restartButton.onclick = () => {
        document.location.reload();
    };

    gameOverScreen.appendChild(gameOverText);
    gameOverScreen.appendChild(levelText);
    gameOverScreen.appendChild(restartButton);
    document.body.appendChild(gameOverScreen);
}

export function displayShopModal(onUpgrade) {
    if (document.getElementById('shop-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'shop-modal';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.background = 'rgba(0,0,0,0.8)';
    modal.style.display = 'flex';
    modal.style.flexDirection = 'column';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.zIndex = '3000';
    modal.style.backdropFilter = 'blur(2px)';
    modal.style.borderRadius = '0 0 32px 32px';
    modal.style.boxShadow = '0 0 32px 8px #00eaff, 0 2px 8px 0 #222';

    const title = document.createElement('h2');
    title.innerText = 'Level Up! Wähle ein Upgrade:';
    title.style.color = 'white';
    modal.appendChild(title);

    // Globale Zustände für aktuelle Upgrade-Level und Basisschaden abrufen
    const currentLaserUpgradeLevel = (typeof window !== 'undefined' && window.upgrades) ? window.upgrades.laser : 0;
    const baseLaserDmg = (typeof window !== 'undefined' && window.BASE_LASER_DAMAGE) ? window.BASE_LASER_DAMAGE : 1;

    const calculateLaserDamage = (level) => {
        return baseLaserDmg * Math.pow(1.05, level);
    };

    const currentDamageText = calculateLaserDamage(currentLaserUpgradeLevel).toFixed(2);
    const nextLevelDamageText = calculateLaserDamage(currentLaserUpgradeLevel + 1).toFixed(2);

    const upgradesData = [
        {
            key: 'magnet',
            label: 'Magnet-Sphäre (zieht XP an)',
            desc: 'Erhöht die Reichweite und Stärke des XP-Magneten.'
        },
        {
            key: 'laser',
            label: `Laser-Upgrade (Schaden)`,
            desc: `Erhöht den Laserschaden. Aktuell: ${currentDamageText} / Nächstes Lvl: ${nextLevelDamageText}.`
        },
        {
            key: 'speed',
            label: 'Schiffs-Geschwindigkeit',
            desc: 'Erhöht die maximale Geschwindigkeit des Schiffs.'
        }
    ];

    upgradesData.forEach(upg => {
        const btn = document.createElement('button');
        btn.innerHTML = `<b>${upg.label}</b><br><small>${upg.desc}</small>`;
        btn.style.margin = '16px';
        btn.style.padding = '18px 32px';
        btn.style.fontSize = '18px';
        btn.style.borderRadius = '8px';
        btn.style.border = 'none';
        btn.style.background = '#222';
        btn.style.color = 'white';
        btn.style.cursor = 'pointer';
        btn.onmouseenter = () => btn.style.background = '#444';
        btn.onmouseleave = () => btn.style.background = '#222';
        btn.onclick = () => {
            document.body.removeChild(modal);
            onUpgrade(upg.key);
        };
        modal.appendChild(btn);
    });
    document.body.appendChild(modal);
}