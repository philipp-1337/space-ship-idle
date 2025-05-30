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
        // Glow/BoxShadow entfernt, nur noch dezenter Schatten
        levelDisplay.style.boxShadow = '0 2px 8px 0 #222';
        levelDisplay.style.textShadow = '0 2px 4px #222';
        levelDisplay.style.transition = 'transform 0.18s cubic-bezier(.4,1.6,.4,1), box-shadow 0.18s';
        document.body.appendChild(levelDisplay);
    }
    levelDisplay.innerText = `Level: ${level}`;
    // Pop-Animation bei Level-Up
    if (pop) {
        levelDisplay.style.transform = 'scale(1.25)';
        levelDisplay.style.boxShadow = '0 2px 16px 0 #222';
        setTimeout(() => {
            levelDisplay.style.transform = 'scale(1)';
            levelDisplay.style.boxShadow = '0 2px 8px 0 #222';
        }, 180);
    }
}

export function initializeUI() {
    updateExperienceBar(0, 1);
    displayLevel(1);
    // Plasmazellen-Anzeige initialisieren
    updatePlasmaUI(0);
}

// Plasmazellen-Anzeige
export function updatePlasmaUI(count) {
    let plasmaDisplay = document.getElementById('plasma-display');
    if (!plasmaDisplay) {
        plasmaDisplay = document.createElement('div');
        plasmaDisplay.id = 'plasma-display';
        plasmaDisplay.style.position = 'fixed';
        plasmaDisplay.style.top = '12px';
        plasmaDisplay.style.right = '18px';
        plasmaDisplay.style.color = 'aqua';
        plasmaDisplay.style.fontSize = '20px';
        plasmaDisplay.style.zIndex = '1000';
        plasmaDisplay.style.fontWeight = 'bold';
        plasmaDisplay.style.padding = '6px 18px';
        plasmaDisplay.style.borderRadius = '16px';
        plasmaDisplay.style.background = 'rgba(0,40,60,0.85)';
        plasmaDisplay.style.boxShadow = '0 2px 8px 0 #0ff';
        plasmaDisplay.style.textShadow = '0 2px 4px #0ff';
        document.body.appendChild(plasmaDisplay);
    }
    plasmaDisplay.innerText = `Plasmazellen: ${count}`;
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
    // Spiel pausieren, wenn Shop geöffnet wird
    if (typeof window !== 'undefined' && window.isPausedRef) window.isPausedRef.value = true;
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
            desc: `Erhöht den Laserschaden.`
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
            // Spiel fortsetzen, wenn Shop geschlossen wird
            if (typeof window !== 'undefined' && window.isPausedRef) window.isPausedRef.value = false;
            onUpgrade(upg.key);
        };
        modal.appendChild(btn);
    });
    document.body.appendChild(modal);
}

export function displayPauseButton(onPause) {
    if (document.getElementById('pause-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'pause-btn';
    btn.innerText = '⏸️';
    btn.style.position = 'fixed';
    btn.style.top = '12px';
    btn.style.left = '120px'; // Rechts neben Level-Anzeige
    btn.style.zIndex = '1100';
    btn.style.fontSize = '20px';
    btn.style.padding = '6px 14px';
    btn.style.borderRadius = '16px';
    btn.style.border = 'none';
    btn.style.background = '#222';
    btn.style.color = 'white';
    btn.style.cursor = 'pointer';
    btn.onclick = onPause;
    document.body.appendChild(btn);
}

export function removePauseButton() {
    const btn = document.getElementById('pause-btn');
    if (btn) btn.remove();
}

export function displayPauseMenu(stats, onResume, onRestart) {
    if (document.getElementById('pause-menu')) return;
    // Spiel pausieren, wenn Pause-Menü geöffnet wird
    if (typeof window !== 'undefined' && window.isPausedRef) window.isPausedRef.value = true;
    const menu = document.createElement('div');
    menu.id = 'pause-menu';
    menu.style.position = 'fixed';
    menu.style.top = '0';
    menu.style.left = '0';
    menu.style.width = '100vw';
    menu.style.height = '100vh';
    menu.style.background = 'rgba(0,0,0,0.8)';
    menu.style.display = 'flex';
    menu.style.flexDirection = 'column';
    menu.style.justifyContent = 'center';
    menu.style.alignItems = 'center';
    menu.style.zIndex = '4000';
    menu.style.backdropFilter = 'blur(2px)';
    menu.style.borderRadius = '0 0 32px 32px';
    menu.style.boxShadow = '0 0 32px 8px #00eaff, 0 2px 8px 0 #222';

    const title = document.createElement('h2');
    title.innerText = 'Pause';
    title.style.color = 'white';
    menu.appendChild(title);

    // Statistiken
    const statsDiv = document.createElement('div');
    statsDiv.style.color = 'white';
    statsDiv.style.fontSize = '18px';
    statsDiv.style.margin = '18px 0 28px 0';
    statsDiv.style.textAlign = 'center';
    statsDiv.innerHTML = `
        <b>Level:</b> ${stats.level}<br>
        <b>Erfahrung:</b> ${stats.experience} / ${stats.maxXP}<br>
        <b>Gegner besiegt:</b> ${stats.kills}<br>
        <b>Gesammelte XP:</b> ${stats.xpCollected}
    `;
    menu.appendChild(statsDiv);

    // Resume Button
    const resumeBtn = document.createElement('button');
    resumeBtn.innerText = 'Weiterspielen';
    resumeBtn.style.margin = '8px';
    resumeBtn.style.padding = '12px 28px';
    resumeBtn.style.fontSize = '18px';
    resumeBtn.style.borderRadius = '8px';
    resumeBtn.style.border = 'none';
    resumeBtn.style.background = 'limegreen';
    resumeBtn.style.color = 'white';
    resumeBtn.onclick = () => {
        menu.remove();
        // Spiel fortsetzen, wenn Pause-Menü geschlossen wird
        if (typeof window !== 'undefined' && window.isPausedRef) window.isPausedRef.value = false;
        onResume();
    };
    menu.appendChild(resumeBtn);

    // Restart Button
    const restartBtn = document.createElement('button');
    restartBtn.innerText = 'Neustarten';
    restartBtn.style.margin = '8px';
    restartBtn.style.padding = '12px 28px';
    restartBtn.style.fontSize = '18px';
    restartBtn.style.borderRadius = '8px';
    restartBtn.style.border = 'none';
    restartBtn.style.background = '#e74c3c';
    restartBtn.style.color = 'white';
    restartBtn.onclick = () => {
        document.location.reload();
    };
    menu.appendChild(restartBtn);

    document.body.appendChild(menu);
}

export function removePauseMenu() {
    const menu = document.getElementById('pause-menu');
    if (menu) menu.remove();
}

// Tech-Tree-Button und Modal
export function showTechTreeButton(onClick) {
    let btn = document.getElementById('tech-tree-btn');
    if (!btn) {
        btn = document.createElement('button');
        btn.id = 'tech-tree-btn';
        btn.innerText = 'Tech-Tree';
        btn.style.position = 'fixed';
        btn.style.top = '60px';
        btn.style.right = '18px';
        btn.style.zIndex = '1200';
        btn.style.fontSize = '18px';
        btn.style.padding = '10px 22px';
        btn.style.borderRadius = '12px';
        btn.style.border = 'none';
        btn.style.background = 'aqua';
        btn.style.color = '#003';
        btn.style.fontWeight = 'bold';
        btn.style.boxShadow = '0 2px 8px 0 #0ff';
        btn.style.cursor = 'pointer';
        btn.onclick = onClick;
        document.body.appendChild(btn);
    }
    btn.style.display = 'block';
}

export function showTechTreeModal(upgrades, onUpgrade) {
    if (document.getElementById('tech-tree-modal')) return;
    // Setze Pause-Status beim Öffnen
    if (typeof window !== 'undefined' && window.isPausedRef) window.isPausedRef.value = true;
    const modal = document.createElement('div');
    modal.id = 'tech-tree-modal';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.background = 'rgba(0,0,0,0.85)';
    modal.style.display = 'flex';
    modal.style.flexDirection = 'column';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.zIndex = '5000';
    modal.style.backdropFilter = 'blur(2px)';
    modal.style.borderRadius = '0 0 32px 32px';
    modal.style.boxShadow = '0 0 32px 8px #00eaff, 0 2px 8px 0 #222';

    const title = document.createElement('h2');
    title.innerText = 'Tech-Tree: Upgrades freischalten';
    title.style.color = 'aqua';
    modal.appendChild(title);

    const upgradesList = [
        {
            key: 'autoShoot',
            label: 'Automatisches Schießen',
            desc: 'Das Schiff schießt automatisch auf Gegner.',
            cost: 1
        },
        {
            key: 'autoAim',
            label: 'Automatisches Anvisieren',
            desc: 'Das Schiff visiert Gegner automatisch an (dreht sich automatisch).',
            cost: 2
        },
        {
            key: 'eliteHint',
            label: 'Elite-Gegner-Scanner',
            desc: 'Zeigt an, wenn ein Elite-Gegner erscheint.',
            cost: 3
        },
        {
            key: 'homingMissile',
            label: 'Lenkraketen',
            desc: 'Feuert automatisch Lenkraketen, die Gegner auf Kreisbahn verfolgen und Flächenschaden verursachen.',
            cost: 4
        }
        // Weitere Upgrades können hier ergänzt werden
    ];

    upgradesList.forEach(upg => {
        const unlocked = upgrades[upg.key];
        const btn = document.createElement('button');
        btn.innerHTML = `<b>${upg.label}</b><br><small>${upg.desc}</small><br>Kosten: ${upg.cost} Plasmazelle(n)`;
        btn.style.margin = '16px';
        btn.style.padding = '18px 32px';
        btn.style.fontSize = '18px';
        btn.style.borderRadius = '8px';
        btn.style.border = 'none';
        btn.style.background = unlocked ? '#0f0' : '#222';
        btn.style.color = unlocked ? '#003' : 'aqua';
        btn.style.cursor = unlocked ? 'default' : 'pointer';
        btn.disabled = unlocked;
        if (unlocked) {
            btn.innerHTML += '<br><span style="color:#0f0">Freigeschaltet</span>';
        }
        btn.onclick = () => {
            if (!unlocked) {
                onUpgrade(upg.key, upg.cost);
            }
        };
        modal.appendChild(btn);
    });

    // Schließen-Button
    const closeBtn = document.createElement('button');
    closeBtn.innerText = 'Schließen';
    closeBtn.style.marginTop = '24px';
    closeBtn.style.fontSize = '18px';
    closeBtn.style.padding = '10px 22px';
    closeBtn.style.borderRadius = '12px';
    closeBtn.style.border = 'none';
    closeBtn.style.background = 'aqua';
    closeBtn.style.color = '#003';
    closeBtn.style.fontWeight = 'bold';
    closeBtn.style.boxShadow = '0 2px 8px 0 #0ff';
    closeBtn.style.cursor = 'pointer';
    closeBtn.onclick = () => {
        modal.remove();
        // Spiel fortsetzen, falls pausiert
        if (typeof window !== 'undefined' && window.isPausedRef) window.isPausedRef.value = false;
        if (typeof window.resumeGame === 'function') window.resumeGame();
    };
    modal.appendChild(closeBtn);

    document.body.appendChild(modal);
}

export function displayAutoAimButton(isActive, onToggle) {
    let btn = document.getElementById('auto-aim-btn');
    if (!btn) {
        btn = document.createElement('button');
        btn.id = 'auto-aim-btn';
        btn.style.position = 'fixed';
        btn.style.top = '44px';
        btn.style.left = '10px';
        btn.style.zIndex = '1100';
        btn.style.fontSize = '16px';
        btn.style.padding = '6px 14px';
        btn.style.borderRadius = '16px';
        btn.style.border = 'none';
        btn.style.background = '#222';
        btn.style.color = 'white';
        btn.style.cursor = 'pointer';
        btn.onclick = onToggle;
        document.body.appendChild(btn);
    }
    btn.innerText = isActive ? 'Auto-Aim: AN' : 'Auto-Aim: AUS';
    btn.style.background = isActive ? 'limegreen' : '#222';
}