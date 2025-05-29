// filepath: /Users/philippkanter/Developer/space-ship-idle/src/ui.js
export function updateExperienceBar(currentXP, maxXP) {
    let experienceBar = document.getElementById('experience-bar');
    if (!experienceBar) {
        experienceBar = document.createElement('div');
        experienceBar.id = 'experience-bar';
        experienceBar.style.position = 'fixed';
        experienceBar.style.top = '0';
        experienceBar.style.left = '0';
        experienceBar.style.height = '10px';
        experienceBar.style.background = 'limegreen';
        experienceBar.style.zIndex = '1000';
        document.body.appendChild(experienceBar);
    }
    experienceBar.style.width = `${(currentXP / maxXP) * 100}%`;
}

export function displayLevel(level) {
    let levelDisplay = document.getElementById('level-display');
    if (!levelDisplay) {
        levelDisplay = document.createElement('div');
        levelDisplay.id = 'level-display';
        levelDisplay.style.position = 'fixed';
        levelDisplay.style.top = '12px';
        levelDisplay.style.left = '10px';
        levelDisplay.style.color = 'white';
        levelDisplay.style.fontSize = '18px';
        levelDisplay.style.zIndex = '1000';
        document.body.appendChild(levelDisplay);
    }
    levelDisplay.innerText = `Level: ${level}`;
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

    const title = document.createElement('h2');
    title.innerText = 'Level Up! Wähle ein Upgrade:';
    title.style.color = 'white';
    modal.appendChild(title);

    const upgrades = [
        {
            key: 'magnet',
            label: 'Magnet-Sphäre (zieht XP an)',
            desc: 'Erhöht die Reichweite und Stärke des XP-Magneten.'
        },
        {
            key: 'laser',
            label: 'Laser-Upgrade',
            desc: 'Erhöht Laserschaden, Geschwindigkeit oder feuert 2 Strahlen.'
        },
        {
            key: 'speed',
            label: 'Schiffs-Geschwindigkeit',
            desc: 'Erhöht die maximale Geschwindigkeit des Schiffs.'
        }
    ];

    upgrades.forEach(upg => {
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