// filepath: /Users/philippkanter/Developer/space-ship-idle/src/ui.js
import { MOBILE } from './constants.js';

const _isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
const _uiScale = _isMobile ? (MOBILE.UI_SCALE_FACTOR || 1.5) : 1; // Fallback, falls nicht in constants definiert

function scale(value) { return `${value * _uiScale}px`; }
function scaleNum(value) { return value * _uiScale; }

export function updateExperienceBar(currentXP, maxXP) {
    let experienceBar = document.getElementById('experience-bar');
    if (!experienceBar) {
        experienceBar = document.createElement('div');
        experienceBar.id = 'experience-bar';
        experienceBar.style.position = 'fixed';
        experienceBar.style.top = '0';
        experienceBar.style.left = '0';
        experienceBar.style.height = scale(12);
        experienceBar.style.background = 'linear-gradient(90deg, #00ff99 0%, #00eaff 100%)';
        experienceBar.style.zIndex = '1000';
        experienceBar.style.boxShadow = `0 0 ${scaleNum(16)}px ${scaleNum(4)}px #00eaff, 0 ${scaleNum(2)}px ${scaleNum(8)}px 0 #222`;
        experienceBar.style.transition = 'width 0.35s cubic-bezier(.4,1.6,.4,1)';
        experienceBar.style.borderRadius = `0 0 ${scale(12)} 0`;
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
        levelDisplay.style.color = 'white'; // Farbe bleibt
        levelDisplay.style.fontSize = scale(20);
        levelDisplay.style.zIndex = '1000';
        levelDisplay.style.fontWeight = 'bold';
        levelDisplay.style.padding = `${scale(6)} ${scale(18)}`;
        levelDisplay.style.borderRadius = scale(16);
        levelDisplay.style.background = 'rgba(30,40,60,0.85)';
        levelDisplay.style.boxShadow = `0 ${scaleNum(2)}px ${scaleNum(8)}px 0 #222`;
        levelDisplay.style.textShadow = `0 ${scaleNum(2)}px ${scaleNum(4)}px #222`;
        levelDisplay.style.transition = 'transform 0.18s cubic-bezier(.4,1.6,.4,1), box-shadow 0.18s';
        document.body.appendChild(levelDisplay);
    }
    levelDisplay.innerText = `Level: ${level}`;
    // Pop-Animation bei Level-Up
    if (pop) {
        levelDisplay.style.transform = 'scale(1.25)';
        levelDisplay.style.boxShadow = `0 ${scaleNum(2)}px ${scaleNum(16)}px 0 #222`;
        setTimeout(() => {
            levelDisplay.style.transform = 'scale(1)';
            levelDisplay.style.boxShadow = `0 ${scaleNum(2)}px ${scaleNum(8)}px 0 #222`;
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
        plasmaDisplay.style.fontSize = scale(20);
        plasmaDisplay.style.zIndex = '1000';
        plasmaDisplay.style.fontWeight = 'bold';
        plasmaDisplay.style.padding = `${scale(6)} ${scale(18)}`;
        plasmaDisplay.style.borderRadius = scale(16);
        plasmaDisplay.style.background = 'rgba(0,40,60,0.85)';
        plasmaDisplay.style.boxShadow = `0 ${scaleNum(2)}px ${scaleNum(8)}px 0 #0ff`;
        plasmaDisplay.style.textShadow = `0 ${scaleNum(2)}px ${scaleNum(4)}px #0ff`;
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
    gameOverText.style.fontSize = scale(48);
    gameOverText.style.marginBottom = scale(20);

    const levelText = document.createElement('p');
    levelText.innerText = `Du hast Level ${currentLevel} erreicht!`;
    levelText.style.fontSize = scale(24);
    levelText.style.marginBottom = scale(30);

    const restartButton = document.createElement('button');
    restartButton.innerText = 'Spiel neustarten';
    restartButton.style.padding = `${scale(15)} ${scale(30)}`;
    restartButton.style.fontSize = scale(20);
    restartButton.style.cursor = 'pointer';
    restartButton.style.border = 'none';
    restartButton.style.borderRadius = scale(5);
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
    modal.style.backdropFilter = `blur(${scaleNum(2)}px)`;
    modal.style.borderRadius = `0 0 ${scale(32)} ${scale(32)}`;
    modal.style.boxShadow = `0 0 ${scaleNum(32)}px ${scaleNum(8)}px #00eaff, 0 ${scaleNum(2)}px ${scaleNum(8)}px 0 #222`;

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
        btn.style.margin = scale(16);
        btn.style.padding = `${scale(18)} ${scale(32)}`;
        btn.style.fontSize = scale(18);
        btn.style.borderRadius = scale(8);
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
    btn.style.fontSize = scale(20);
    btn.style.padding = `${scale(6)} ${scale(14)}`;
    btn.style.borderRadius = scale(16);
    btn.style.border = 'none';
    btn.style.background = 'rgba(30,40,60,0.85)'; // Passend zu Level Display
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
    menu.style.backdropFilter = `blur(${scaleNum(2)}px)`;
    menu.style.borderRadius = `0 0 ${scale(32)} ${scale(32)}`;
    menu.style.boxShadow = `0 0 ${scaleNum(32)}px ${scaleNum(8)}px #00eaff, 0 ${scaleNum(2)}px ${scaleNum(8)}px 0 #222`;

    const title = document.createElement('h2');
    title.innerText = 'Pause';
    title.style.color = 'white';
    menu.appendChild(title);

    // Statistiken
    const statsDiv = document.createElement('div');
    statsDiv.style.color = 'white';
    statsDiv.style.fontSize = scale(18);
    statsDiv.style.margin = `${scale(18)} 0 ${scale(28)} 0`;
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
    resumeBtn.style.margin = scale(8);
    resumeBtn.style.padding = `${scale(12)} ${scale(28)}`;
    resumeBtn.style.fontSize = scale(18);
    resumeBtn.style.borderRadius = scale(8);
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
    restartBtn.style.margin = scale(8);
    restartBtn.style.padding = `${scale(12)} ${scale(28)}`;
    restartBtn.style.fontSize = scale(18);
    restartBtn.style.borderRadius = scale(8);
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
        btn.style.fontSize = scale(18);
        btn.style.padding = `${scale(10)} ${scale(22)}`;
        btn.style.borderRadius = scale(12);
        btn.style.border = 'none';
        btn.style.background = 'aqua';
        btn.style.color = '#003';
        btn.style.fontWeight = 'bold';
        btn.style.boxShadow = `0 ${scaleNum(2)}px ${scaleNum(8)}px 0 #0ff`;
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
    modal.style.backdropFilter = `blur(${scaleNum(2)}px)`;
    modal.style.borderRadius = `0 0 ${scale(32)} ${scale(32)}`;
    modal.style.boxShadow = `0 0 ${scaleNum(32)}px ${scaleNum(8)}px #00eaff, 0 ${scaleNum(2)}px ${scaleNum(8)}px 0 #222`;

    const title = document.createElement('h2');
    title.innerText = 'Tech-Tree: Upgrades freischalten';
    title.style.color = 'aqua';
    modal.appendChild(title);

    const upgradesList = [
        {
            key: 'eliteHint',
            label: 'Elite-Gegner-Scanner',
            desc: 'Zeigt an, wenn ein Elite-Gegner erscheint.',
            cost: 1
        },
        {
            key: 'autoShoot',
            label: 'Automatisches Schießen',
            desc: 'Das Schiff schießt automatisch auf Gegner.',
            cost: 4
        },
        {
            key: 'homingMissile',
            label: 'Lenkraketen',
            desc: 'Feuert automatisch Lenkraketen, die Gegner auf Kreisbahn verfolgen und Flächenschaden verursachen.',
            cost: 10
        }
        // Weitere Upgrades können hier ergänzt werden
    ];

    upgradesList.forEach(upg => {
        const unlocked = upgrades[upg.key];
        const btn = document.createElement('button');
        btn.innerHTML = `<b>${upg.label}</b><br><small>${upg.desc}</small><br>Kosten: ${upg.cost} Plasmazelle(n)`;
        btn.style.margin = scale(16);
        btn.style.padding = `${scale(18)} ${scale(32)}`;
        btn.style.fontSize = scale(18);
        btn.style.borderRadius = scale(8);
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
    closeBtn.style.marginTop = scale(24);
    closeBtn.style.fontSize = scale(18);
    closeBtn.style.padding = `${scale(10)} ${scale(22)}`;
    closeBtn.style.borderRadius = scale(12);
    closeBtn.style.border = 'none';
    closeBtn.style.background = 'aqua';
    closeBtn.style.color = '#003';
    closeBtn.style.fontWeight = 'bold';
    closeBtn.style.boxShadow = `0 ${scaleNum(2)}px ${scaleNum(8)}px 0 #0ff`;
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

export function showWaveHint() {
    let hint = document.getElementById('wave-hint');
    if (hint) hint.remove(); // Entferne existierenden Hint, um Timer zurückzusetzen

    hint = document.createElement('div');
    hint.id = 'wave-hint';
    Object.assign(hint.style, {
        position: 'fixed',
        top: '120px', // Position anpassen bei Bedarf
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: '2000',
        background: 'rgba(200, 0, 0, 0.9)',
        color: 'white',
        fontWeight: 'bold',
        fontSize: scale(22),
        padding: `${scale(10)} ${scale(25)}`,
        borderRadius: scale(10),
        boxShadow: `0 ${scaleNum(2)}px ${scaleNum(8)}px 0 #800`,
        textAlign: 'center',
        border: `${scaleNum(2)}px solid #ff4444`,
        textShadow: `0 0 ${scaleNum(5)}px black`
    });
    document.body.appendChild(hint);

    hint.innerText = `ACHTUNG: Gegnerwelle!`;
    setTimeout(() => {
        if (document.getElementById('wave-hint') === hint) {
            hint.remove();
        }
    }, 3500); // Dauer der Anzeige: 3.5 Sekunden
}