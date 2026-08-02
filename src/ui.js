// filepath: /Users/philippkanter/Developer/space-ship-idle/src/ui.js
// Night-Flight Console — cockpit instrument HUD (see index.html body comment
// for the direction contract).
import { MOBILE, ARMOR } from './constants.js';
import { xpSprite } from './xp.js';

const _isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
const _uiScale = _isMobile ? (MOBILE.UI_SCALE_FACTOR || 1.5) : 1; // Fallback, falls nicht in constants definiert

function scale(value) { return `${value * _uiScale}px`; }
function scaleNum(value) { return value * _uiScale; }

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------
const INK = {
    panel: '#0a0d0c',
    panelRaised: '#101512',
    hairline: 'rgba(120,255,170,0.28)',
    hairlineDim: 'rgba(120,255,170,0.14)',
    scrim: 'rgba(2,4,3,0.86)',
    phosphor: '#39ff6a',
    phosphorDim: 'rgba(57,255,106,0.65)',
    scope: '#7fe8ff',
    scopeDim: 'rgba(127,232,255,0.65)',
    caution: '#ffb000',
    danger: '#ff3b30',
    gold: '#ffd23f',
    text: '#e8fff0',
    textDim: 'rgba(232,255,240,0.62)',
    void: '#000000',
};

const FONT = "'IBM Plex Mono', 'SF Mono', 'Consolas', monospace";
const CHAMFER = 10; // px, unscaled — corner cut for the console-panel shape

// HUD row offsets (unscaled px). Row 1 (Level/Plasma dials, Pause, Settings)
// sits below the XP tape (14px tall) with a small gap, instead of at the very
// top edge — the tape and the row used to overlap. Row 2 (Hull dial, Tech
// Tree button) keeps the same relative gap it always had below row 1.
const HUD_TOP_ROW1 = 22;
const HUD_TOP_ROW2 = 100 + (HUD_TOP_ROW1 - 10);

function chamferClip(px) {
    const c = `${px}px`;
    return `polygon(${c} 0, calc(100% - ${c}) 0, 100% ${c}, 100% calc(100% - ${c}), calc(100% - ${c}) 100%, ${c} 100%, 0 calc(100% - ${c}), 0 ${c})`;
}

// Global chrome: font, focus ring, and the scanline/vignette overlay that
// makes the whole viewport read as glass under a cockpit canopy.
const _globalHudStyle = document.createElement('style');
_globalHudStyle.textContent = `
    button, input, select {
        font-family: ${FONT};
    }
    button:focus-visible {
        outline: 2px solid ${INK.phosphor};
        outline-offset: 3px;
    }
    #console-scanlines {
        position: fixed;
        inset: 0;
        z-index: 9000;
        pointer-events: none;
        mix-blend-mode: overlay;
        opacity: 0.5;
        background:
            repeating-linear-gradient(
                to bottom,
                rgba(180,255,210,0.05) 0px,
                rgba(180,255,210,0.05) 1px,
                transparent 1px,
                transparent 3px
            );
    }
    #console-vignette {
        position: fixed;
        inset: 0;
        z-index: 9001;
        pointer-events: none;
        background: radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,4,2,0.55) 100%);
    }
`;
document.head.appendChild(_globalHudStyle);

(function installCanopyOverlay() {
    if (document.getElementById('console-scanlines')) return;
    const scan = document.createElement('div');
    scan.id = 'console-scanlines';
    const vig = document.createElement('div');
    vig.id = 'console-vignette';
    document.body.appendChild(scan);
    document.body.appendChild(vig);
})();

function panelBase(el, { color = INK.hairline, chamfer = CHAMFER } = {}) {
    el.style.background = INK.panel;
    el.style.border = `1px solid ${color}`;
    el.style.clipPath = chamferClip(scaleNum(chamfer));
    el.style.boxSizing = 'border-box';
}

function label(text, color = INK.textDim) {
    const cap = document.createElement('div');
    cap.innerText = text;
    cap.style.fontFamily = FONT;
    cap.style.fontSize = scale(9);
    cap.style.letterSpacing = '0.14em';
    cap.style.textTransform = 'uppercase';
    cap.style.color = color;
    return cap;
}

// ---------------------------------------------------------------------------
// Instrument dial — round tick-marked gauge with a damped needle, used for
// the Level and Plasma readouts. The needle isn't a literal value sweep (LVL
// and Plasma count are unbounded); it performs a "systems nominal" settle
// flourish, backed by a real tabular-mono digital sub-readout.
// ---------------------------------------------------------------------------
function buildInstrumentDial({ id, captionText, color, glowColor }) {
    const size = 64;
    const wrap = document.createElement('div');
    wrap.id = id;
    wrap.style.position = 'fixed';
    wrap.style.top = scale(HUD_TOP_ROW1);
    wrap.style.zIndex = '1000';
    wrap.style.display = 'flex';
    wrap.style.flexDirection = 'column';
    wrap.style.alignItems = 'center';
    wrap.style.width = scale(size);

    const face = document.createElement('div');
    face.style.position = 'relative';
    face.style.width = scale(size);
    face.style.height = scale(size);
    face.style.borderRadius = '50%';
    face.style.background = `radial-gradient(circle at 50% 42%, ${INK.panelRaised} 0%, ${INK.panel} 78%)`;
    face.style.border = `1px solid ${color === INK.phosphor ? INK.hairline : glowColor}`;
    face.style.boxShadow = `0 0 ${scaleNum(10)}px ${scaleNum(1)}px rgba(0,0,0,0.6) inset, 0 0 ${scaleNum(6)}px 0 ${glowColor}`;
    face.style.boxSizing = 'border-box';

    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.style.position = 'absolute';
    svg.style.inset = '0';
    svg.style.width = '100%';
    svg.style.height = '100%';
    for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * 360;
        const tick = document.createElementNS(svgNS, 'line');
        const major = i % 3 === 0;
        tick.setAttribute('x1', '50');
        tick.setAttribute('y1', major ? '8' : '11');
        tick.setAttribute('x2', '50');
        tick.setAttribute('y2', '16');
        tick.setAttribute('stroke', color);
        tick.setAttribute('stroke-width', major ? '2' : '1');
        tick.setAttribute('opacity', major ? '0.85' : '0.4');
        tick.setAttribute('transform', `rotate(${angle} 50 50)`);
        svg.appendChild(tick);
    }
    const needle = document.createElementNS(svgNS, 'line');
    needle.setAttribute('x1', '50');
    needle.setAttribute('y1', '50');
    needle.setAttribute('x2', '50');
    needle.setAttribute('y2', '18');
    needle.setAttribute('stroke', color);
    needle.setAttribute('stroke-width', '2');
    needle.setAttribute('stroke-linecap', 'round');
    needle.style.filter = `drop-shadow(0 0 3px ${glowColor})`;
    needle.style.transformOrigin = '50px 50px';
    needle.style.transform = 'rotate(0deg)';
    needle.style.transition = 'transform 0.6s cubic-bezier(.22,1.12,.36,1)';
    svg.appendChild(needle);

    const hub = document.createElementNS(svgNS, 'circle');
    hub.setAttribute('cx', '50');
    hub.setAttribute('cy', '50');
    hub.setAttribute('r', '2.5');
    hub.setAttribute('fill', color);
    svg.appendChild(hub);
    face.appendChild(svg);

    const readout = document.createElement('div');
    readout.className = 'dial-readout';
    readout.style.position = 'absolute';
    readout.style.left = '50%';
    readout.style.bottom = scale(11);
    readout.style.transform = 'translateX(-50%)';
    readout.style.fontFamily = FONT;
    readout.style.fontWeight = '600';
    readout.style.fontSize = scale(11);
    readout.style.color = INK.text;
    readout.style.textShadow = `0 0 4px ${glowColor}`;
    readout.style.fontVariantNumeric = 'tabular-nums';
    face.appendChild(readout);

    wrap.appendChild(face);
    wrap.appendChild(label(captionText, color === INK.phosphor ? INK.phosphorDim : (color === INK.scope ? INK.scopeDim : glowColor)));

    return { wrap, needle, readout };
}

// Der 'sweepNeedle'-Flourish wurde entfernt, stattdessen rotieren die Nadeln nun dynamisch.

// ---------------------------------------------------------------------------
// XP tape — a horizontal instrument strip along the top edge, ticked every
// 10%, in place of the old rounded progress pill.
// ---------------------------------------------------------------------------
export function updateExperienceBar(currentXP, maxXP) {
    let tape = document.getElementById('experience-bar');
    if (!tape) {
        tape = document.createElement('div');
        tape.id = 'experience-bar';
        tape.style.position = 'fixed';
        tape.style.top = '0';
        tape.style.left = '0';
        tape.style.width = '100%';
        tape.style.height = scale(14);
        tape.style.zIndex = '999';
        tape.style.background = INK.panel;
        tape.style.borderBottom = `1px solid ${INK.hairlineDim}`;
        tape.style.boxSizing = 'border-box';
        tape.style.overflow = 'hidden';

        const ticks = document.createElement('div');
        ticks.style.position = 'absolute';
        ticks.style.inset = '0';
        ticks.style.backgroundImage = `repeating-linear-gradient(to right, ${INK.hairlineDim} 0, ${INK.hairlineDim} 1px, transparent 1px, transparent 10%)`;
        ticks.style.zIndex = '2';
        tape.appendChild(ticks);

        const fill = document.createElement('div');
        fill.id = 'experience-bar-fill';
        fill.style.position = 'absolute';
        fill.style.top = '0';
        fill.style.left = '0';
        fill.style.height = '100%';
        fill.style.background = INK.gold;
        fill.style.boxShadow = `0 0 ${scaleNum(10)}px ${scaleNum(1)}px rgba(255,210,63,0.65)`;
        fill.style.transition = 'width 0.4s cubic-bezier(.16,1,.3,1)';
        tape.appendChild(fill);

        // Kleines Icon der tatsächlichen XP-Sphäre, damit Balken und Pickup optisch
        // als dasselbe Konzept erkennbar sind (statt reinem Textlabel).
        const iconGroup = document.createElement('div');
        iconGroup.style.position = 'absolute';
        iconGroup.style.left = scale(10);
        iconGroup.style.top = '50%';
        iconGroup.style.transform = 'translateY(-50%)';
        iconGroup.style.zIndex = '3';
        iconGroup.style.display = 'flex';
        iconGroup.style.alignItems = 'center';
        iconGroup.style.gap = scale(5);
        iconGroup.style.mixBlendMode = 'difference';

        const icon = document.createElement('canvas');
        icon.width = 10;
        icon.height = 10;
        icon.style.width = scale(10);
        icon.style.height = scale(10);
        const iconCtx = icon.getContext('2d');
        iconCtx.imageSmoothingEnabled = false;
        iconCtx.drawImage(xpSprite, 0, 0, 10, 10);
        iconGroup.appendChild(icon);

        iconGroup.appendChild(label('XP', INK.gold));
        tape.appendChild(iconGroup);

        document.body.appendChild(tape);
    }
    const fill = document.getElementById('experience-bar-fill');
    fill.style.width = `${Math.min(100, (currentXP / maxXP) * 100)}%`;
}

// ---------------------------------------------------------------------------
// Level dial
// ---------------------------------------------------------------------------
let _levelDial = null;

export function displayLevel(level, pop = false) {
    if (!_levelDial) {
        _levelDial = buildInstrumentDial({ id: 'level-display', captionText: 'Level', color: INK.phosphor, glowColor: INK.phosphorDim });
        _levelDial.wrap.style.left = scale(10);
        document.body.appendChild(_levelDial.wrap);
    }
    _levelDial.readout.innerText = String(level).padStart(2, '0');
    // 1 Level = 30 Grad (1 voller Kreis = 12 Level)
    _levelDial.needle.style.transform = `rotate(${(level - 1) * 30}deg)`;
}

// ---------------------------------------------------------------------------
// Plasma dial
// ---------------------------------------------------------------------------
let _plasmaDial = null;

export function updatePlasmaUI(count) {
    if (!_plasmaDial) {
        _plasmaDial = buildInstrumentDial({ id: 'plasma-display', captionText: 'Plasma', color: INK.scope, glowColor: INK.scopeDim });
        _plasmaDial.wrap.style.right = scale(10);
        document.body.appendChild(_plasmaDial.wrap);
    }
    _plasmaDial.readout.innerText = String(count);
    // 1 Plasma = 15 Grad (1 voller Kreis = 24 Plasma)
    _plasmaDial.needle.style.transform = `rotate(${count * 15}deg)`;
}

// ---------------------------------------------------------------------------
// Hull dial — mirrors the Level dial's slot on the opposite side, showing
// remaining armor as a bounded -90deg..+90deg sweep (unlike Level/Plasma,
// hull is a ratio, not an ever-growing count).
// ---------------------------------------------------------------------------
let _hullDial = null;

export function updateHullUI(hp, maxHp) {
    if (!_hullDial) {
        _hullDial = buildInstrumentDial({ id: 'hull-display', captionText: 'Hull', color: INK.caution, glowColor: 'rgba(255,176,0,0.6)' });
        _hullDial.wrap.style.left = scale(10);
        _hullDial.wrap.style.top = scale(HUD_TOP_ROW2); // clears the Level dial's full footprint (face + caption)
        document.body.appendChild(_hullDial.wrap);
    }
    const ratio = maxHp > 0 ? Math.max(0, Math.min(1, hp / maxHp)) : 0;
    _hullDial.readout.innerText = `${hp}/${maxHp}`;
    _hullDial.needle.style.transform = `rotate(${-90 + ratio * 180}deg)`;
}

export function initializeUI() {
    updateExperienceBar(0, 1);
    displayLevel(1);
    updatePlasmaUI(0);
    updateHullUI(ARMOR.BASE_HP, ARMOR.BASE_HP);
}

// ---------------------------------------------------------------------------
// Shared console button — backlit legend on a dark chamfered panel. `filled`
// renders the "engaged" state (solid color, dark legend) used for confirmed/
// unlocked states instead of the default backlit outline.
// ---------------------------------------------------------------------------
function consoleButton({ text, color, glowColor, filled = false, fontSize = 16 }) {
    const btn = document.createElement('button');
    btn.innerHTML = text;
    btn.style.fontFamily = FONT;
    btn.style.fontWeight = '600';
    btn.style.fontSize = scale(fontSize);
    btn.style.letterSpacing = '0.04em';
    btn.style.textTransform = 'uppercase';
    btn.style.cursor = 'pointer';
    btn.style.clipPath = chamferClip(scaleNum(8));
    btn.style.boxSizing = 'border-box';
    btn.style.border = `1px solid ${color}`;
    btn.style.padding = `${scale(12)} ${scale(26)}`;
    btn.style.transition = 'background 0.1s, box-shadow 0.15s, color 0.1s';

    const setState = (engaged) => {
        if (engaged) {
            btn.style.background = color;
            btn.style.color = INK.void;
            btn.style.boxShadow = `0 0 ${scaleNum(14)}px ${scaleNum(2)}px ${glowColor}`;
        } else {
            btn.style.background = INK.panel;
            btn.style.color = color;
            btn.style.boxShadow = `0 0 ${scaleNum(6)}px 0 ${glowColor}`;
        }
    };
    setState(filled);
    btn.onmouseenter = () => { btn.style.boxShadow = `0 0 ${scaleNum(18)}px ${scaleNum(3)}px ${glowColor}`; };
    btn.onmouseleave = () => { setState(filled); };
    return btn;
}

function panelTitleBar(text, color) {
    const bar = document.createElement('div');
    bar.style.width = '100%';
    bar.style.display = 'flex';
    bar.style.alignItems = 'center';
    bar.style.justifyContent = 'space-between';
    bar.style.padding = `0 0 ${scale(10)} 0`;
    bar.style.marginBottom = scale(18);
    bar.style.borderBottom = `1px solid ${INK.hairlineDim}`;

    const h2 = document.createElement('h2');
    h2.innerText = text;
    h2.style.margin = '0';
    h2.style.fontFamily = FONT;
    h2.style.fontWeight = '600';
    h2.style.fontSize = scale(20);
    h2.style.letterSpacing = '0.08em';
    h2.style.textTransform = 'uppercase';
    h2.style.color = color;
    h2.style.textShadow = `0 0 6px ${color}55`;

    const lamp = document.createElement('div');
    lamp.style.width = scale(8);
    lamp.style.height = scale(8);
    lamp.style.borderRadius = '50%';
    lamp.style.background = color;
    lamp.style.boxShadow = `0 0 ${scaleNum(6)}px ${scaleNum(1)}px ${color}`;

    bar.appendChild(h2);
    bar.appendChild(lamp);
    return bar;
}

function consolePanelModal({ id, zIndex, accent = INK.phosphor }) {
    const modal = document.createElement('div');
    modal.id = id;
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.background = INK.scrim;
    modal.style.display = 'flex';
    modal.style.flexDirection = 'column';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.zIndex = String(zIndex);
    modal.style.backdropFilter = `blur(${scaleNum(2)}px)`;

    const panel = document.createElement('div');
    panel.style.display = 'flex';
    panel.style.flexDirection = 'column';
    panel.style.alignItems = 'center';
    panel.style.maxWidth = 'min(92vw, 560px)';
    panel.style.padding = `${scale(28)} ${scale(32)}`;
    panelBase(panel, { color: `${accent}55`, chamfer: 20 });
    panel.style.boxShadow = `0 0 ${scaleNum(36)}px ${scaleNum(2)}px ${accent}33, 0 ${scaleNum(4)}px ${scaleNum(24)}px 0 rgba(0,0,0,0.6)`;

    modal.appendChild(panel);
    return { modal, panel };
}

// ---------------------------------------------------------------------------
// Pre-flight check — difficulty select, shown once before the game loop
// begins. `onSelect` receives 'easy' or 'normal'.
// ---------------------------------------------------------------------------
export function displayStartScreen(onSelect) {
    if (document.getElementById('start-screen')) return;

    const { modal, panel } = consolePanelModal({ id: 'start-screen', zIndex: 3500, accent: INK.phosphor });
    panel.style.width = 'min(92vw, 460px)';
    panel.appendChild(panelTitleBar('Pre-Flight Check', INK.phosphor));

    const intro = document.createElement('p');
    intro.innerText = 'Select your difficulty.';
    intro.style.fontFamily = FONT;
    intro.style.color = INK.textDim;
    intro.style.fontSize = scale(12);
    intro.style.margin = `0 0 ${scale(16)} 0`;
    intro.style.alignSelf = 'flex-start';
    panel.appendChild(intro);

    const modes = [
        { key: 'easy', label: 'Easy', desc: 'Enemies at half strength, ship starts reinforced — a gentler entry.' },
        { key: 'normal', label: 'Normal', desc: 'Standard difficulty — the full challenge.' }
    ];

    modes.forEach(mode => {
        const row = document.createElement('button');
        row.style.width = '100%';
        row.style.boxSizing = 'border-box';
        row.style.textAlign = 'left';
        row.style.margin = `0 0 ${scale(10)} 0`;
        row.style.padding = `${scale(14)} ${scale(18)}`;
        row.style.cursor = 'pointer';
        row.style.clipPath = chamferClip(scaleNum(8));
        row.style.background = INK.panel;
        row.style.border = `1px solid ${INK.hairline}`;
        row.style.color = INK.text;
        row.style.fontFamily = FONT;
        row.style.transition = 'background 0.08s, border-color 0.08s';
        row.innerHTML = `<div style="font-weight:600;font-size:${scale(14)};letter-spacing:0.03em;text-transform:uppercase;color:${INK.phosphor}">${mode.label}</div><div style="font-size:${scale(12)};color:${INK.textDim};margin-top:${scale(4)}">${mode.desc}</div>`;
        row.onmouseenter = () => { row.style.background = INK.panelRaised; row.style.borderColor = INK.phosphor; };
        row.onmouseleave = () => { row.style.background = INK.panel; row.style.borderColor = INK.hairline; };
        row.onclick = () => {
            document.body.removeChild(modal);
            onSelect(mode.key);
        };
        panel.appendChild(row);
    });

    document.body.appendChild(modal);
}

// ---------------------------------------------------------------------------
// Game over
// ---------------------------------------------------------------------------
export function displayGameOverScreen(currentLevel) {
    if (document.getElementById('game-over-screen')) return;

    const { modal, panel } = consolePanelModal({ id: 'game-over-screen', zIndex: 2000, accent: INK.danger });
    panel.appendChild(panelTitleBar('Systems Failure', INK.danger));

    const levelText = document.createElement('p');
    levelText.innerText = `Flight ended at Level ${currentLevel}.`;
    levelText.style.fontFamily = FONT;
    levelText.style.color = INK.text;
    levelText.style.fontSize = scale(15);
    levelText.style.margin = `0 0 ${scale(26)} 0`;
    panel.appendChild(levelText);

    const restartButton = consoleButton({ text: 'Restart', color: INK.phosphor, glowColor: INK.phosphorDim, filled: true, fontSize: 15 });
    restartButton.onclick = () => document.location.reload();
    panel.appendChild(restartButton);

    document.body.appendChild(modal);
}

// ---------------------------------------------------------------------------
// Shop modal
// ---------------------------------------------------------------------------
export function displayShopModal(onUpgrade) {
    if (document.getElementById('shop-modal')) return;
    if (typeof window !== 'undefined' && window.isPausedRef) window.isPausedRef.value = true;

    const { modal, panel } = consolePanelModal({ id: 'shop-modal', zIndex: 3000, accent: INK.phosphor });
    panel.style.width = 'min(92vw, 460px)';
    panel.appendChild(panelTitleBar('Upgrade Available', INK.phosphor));

    const upgradePool = [
        { key: 'magnet', label: 'Magnet Range', desc: 'Increases the passive pull range and strength of your XP magnet.' },
        { key: 'laser', label: 'Laser Damage', desc: `Increases your laser's damage and triggers a brief Overdrive.` },
        { key: 'speed', label: "Ship Speed", desc: "Increases your ship's maximum speed." },
        { key: 'armor', label: 'Armor Plating', desc: 'Adds a hull point and fully repairs your ship.' },
        { key: 'collectorPulse', label: 'Tractor Pulse', desc: 'One-time burst: instantly pulls every XP and Plasma orb on the field to your ship.' }
    ];
    // Randomisiere Auswahl UND Reihenfolge, damit nicht jedes Level-Up dieselben
    // drei Optionen in derselben Reihenfolge zeigt (Fisher-Yates shuffle).
    const shuffled = [...upgradePool];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const upgradesData = shuffled.slice(0, 3);

    upgradesData.forEach(upg => {
        const row = document.createElement('button');
        row.style.width = '100%';
        row.style.boxSizing = 'border-box';
        row.style.textAlign = 'left';
        row.style.margin = `0 0 ${scale(10)} 0`;
        row.style.padding = `${scale(14)} ${scale(18)}`;
        row.style.cursor = 'pointer';
        row.style.clipPath = chamferClip(scaleNum(8));
        row.style.background = INK.panel;
        row.style.border = `1px solid ${INK.hairline}`;
        row.style.color = INK.text;
        row.style.fontFamily = FONT;
        row.style.transition = 'background 0.08s, border-color 0.08s';
        row.innerHTML = `<div style="font-weight:600;font-size:${scale(14)};letter-spacing:0.03em;text-transform:uppercase;color:${INK.phosphor}">${upg.label}</div><div style="font-size:${scale(12)};color:${INK.textDim};margin-top:${scale(4)}">${upg.desc}</div>`;
        row.onmouseenter = () => { row.style.background = INK.panelRaised; row.style.borderColor = INK.phosphor; };
        row.onmouseleave = () => { row.style.background = INK.panel; row.style.borderColor = INK.hairline; };
        row.onclick = () => {
            document.body.removeChild(modal);
            if (typeof window !== 'undefined' && window.isPausedRef) window.isPausedRef.value = false;
            onUpgrade(upg.key);
        };
        panel.appendChild(row);
    });

    document.body.appendChild(modal);
}

// ---------------------------------------------------------------------------
// Pause toggle + menu
// ---------------------------------------------------------------------------
export function displayPauseButton(onPause) {
    if (document.getElementById('pause-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'pause-btn';
    btn.innerHTML = `<svg width="${scaleNum(14)}" height="${scaleNum(14)}" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="2" width="4" height="12" rx="0.5" fill="${INK.phosphor}"/>
        <rect x="9" y="2" width="4" height="12" rx="0.5" fill="${INK.phosphor}"/>
    </svg>`;
    btn.setAttribute('aria-label', 'Pause');
    btn.style.position = 'fixed';
    btn.style.top = scale(HUD_TOP_ROW1);
    btn.style.left = scale(84); // clears the Level dial (10 left + 64 diameter + 10 gap)
    btn.style.zIndex = '1100';
    btn.style.display = 'flex';
    btn.style.alignItems = 'center';
    btn.style.justifyContent = 'center';
    btn.style.width = scale(32);
    btn.style.height = scale(32);
    btn.style.cursor = 'pointer';
    btn.style.transition = 'box-shadow 0.15s, background 0.15s';
    panelBase(btn, { chamfer: 6 });
    btn.style.boxShadow = `0 0 ${scaleNum(6)}px 0 ${INK.phosphorDim}`;
    btn.onmouseenter = () => { btn.style.boxShadow = `0 0 ${scaleNum(14)}px ${scaleNum(2)}px ${INK.phosphor}`; };
    btn.onmouseleave = () => { btn.style.boxShadow = `0 0 ${scaleNum(6)}px 0 ${INK.phosphorDim}`; };
    btn.onclick = onPause;
    document.body.appendChild(btn);
}

export function removePauseButton() {
    const btn = document.getElementById('pause-btn');
    if (btn) btn.remove();
}

// ---------------------------------------------------------------------------
// Settings button + menu — difficulty switch and (on mobile) a toggle for the
// on-screen joystick/fire-button graphics. Sits right of the Pause button.
// ---------------------------------------------------------------------------
export function displaySettingsButton(onClick) {
    if (document.getElementById('settings-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'settings-btn';
    btn.innerHTML = `<svg width="${scaleNum(15)}" height="${scaleNum(15)}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="3.2" stroke="${INK.phosphor}" stroke-width="1.8"/>
        <g stroke="${INK.phosphor}" stroke-width="2" stroke-linecap="round">
            <line x1="12" y1="1.5" x2="12" y2="5"/>
            <line x1="12" y1="19" x2="12" y2="22.5"/>
            <line x1="1.5" y1="12" x2="5" y2="12"/>
            <line x1="19" y1="12" x2="22.5" y2="12"/>
            <line x1="4.4" y1="4.4" x2="6.8" y2="6.8"/>
            <line x1="17.2" y1="17.2" x2="19.6" y2="19.6"/>
            <line x1="4.4" y1="19.6" x2="6.8" y2="17.2"/>
            <line x1="17.2" y1="6.8" x2="19.6" y2="4.4"/>
        </g>
    </svg>`;
    btn.setAttribute('aria-label', 'Settings');
    btn.style.position = 'fixed';
    btn.style.top = scale(HUD_TOP_ROW1);
    btn.style.left = scale(126); // clears the Pause button (84 left + 32 wide + 10 gap)
    btn.style.zIndex = '1100';
    btn.style.display = 'flex';
    btn.style.alignItems = 'center';
    btn.style.justifyContent = 'center';
    btn.style.width = scale(32);
    btn.style.height = scale(32);
    btn.style.cursor = 'pointer';
    btn.style.transition = 'box-shadow 0.15s, background 0.15s';
    panelBase(btn, { chamfer: 6 });
    btn.style.boxShadow = `0 0 ${scaleNum(6)}px 0 ${INK.phosphorDim}`;
    btn.onmouseenter = () => { btn.style.boxShadow = `0 0 ${scaleNum(14)}px ${scaleNum(2)}px ${INK.phosphor}`; };
    btn.onmouseleave = () => { btn.style.boxShadow = `0 0 ${scaleNum(6)}px 0 ${INK.phosphorDim}`; };
    btn.onclick = onClick;
    document.body.appendChild(btn);
}

export function showSettingsMenu({ easyMode, controlsVisible, isMobile, onDifficultyChange, onToggleControls }) {
    if (document.getElementById('settings-menu')) return;
    if (typeof window !== 'undefined' && window.isPausedRef) window.isPausedRef.value = true;

    const { modal, panel } = consolePanelModal({ id: 'settings-menu', zIndex: 4500, accent: INK.phosphor });
    panel.style.width = 'min(92vw, 420px)';
    panel.appendChild(panelTitleBar('Settings', INK.phosphor));

    const rerender = (nextEasyMode, nextControlsVisible) => {
        modal.remove();
        showSettingsMenu({ easyMode: nextEasyMode, controlsVisible: nextControlsVisible, isMobile, onDifficultyChange, onToggleControls });
    };

    panel.appendChild(label('Difficulty', INK.textDim));
    const diffRow = document.createElement('div');
    diffRow.style.display = 'flex';
    diffRow.style.gap = scale(10);
    diffRow.style.margin = `${scale(8)} 0 ${scale(10)} 0`;
    diffRow.style.width = '100%';
    [{ key: 'easy', text: 'Easy' }, { key: 'normal', text: 'Normal' }].forEach(opt => {
        const active = (opt.key === 'easy') === !!easyMode;
        const btn = consoleButton({ text: opt.text, color: INK.phosphor, glowColor: INK.phosphorDim, filled: active, fontSize: 13 });
        btn.style.flex = '1';
        btn.style.padding = `${scale(10)} ${scale(12)}`;
        btn.onclick = () => {
            onDifficultyChange(opt.key);
            rerender(opt.key === 'easy', controlsVisible);
        };
        diffRow.appendChild(btn);
    });
    panel.appendChild(diffRow);

    const diffNote = document.createElement('div');
    diffNote.innerText = 'Applies to enemies from now on. Switching to Easy also reinforces your hull once.';
    diffNote.style.fontFamily = FONT;
    diffNote.style.fontSize = scale(11);
    diffNote.style.color = INK.textDim;
    diffNote.style.margin = `0 0 ${scale(20)} 0`;
    panel.appendChild(diffNote);

    if (isMobile) {
        panel.appendChild(label('Touch Controls', INK.textDim));
        const toggleBtn = consoleButton({ text: controlsVisible ? 'Visible' : 'Hidden', color: INK.scope, glowColor: INK.scopeDim, filled: controlsVisible, fontSize: 13 });
        toggleBtn.style.width = '100%';
        toggleBtn.style.margin = `${scale(8)} 0 ${scale(10)} 0`;
        toggleBtn.onclick = () => {
            const next = !controlsVisible;
            onToggleControls(next);
            rerender(easyMode, next);
        };
        panel.appendChild(toggleBtn);

        const ctrlNote = document.createElement('div');
        ctrlNote.innerText = 'The joystick and fire zones cover the full left/right half of the screen either way — this only shows or hides the graphics.';
        ctrlNote.style.fontFamily = FONT;
        ctrlNote.style.fontSize = scale(11);
        ctrlNote.style.color = INK.textDim;
        ctrlNote.style.margin = `0 0 ${scale(20)} 0`;
        panel.appendChild(ctrlNote);
    }

    const closeBtn = consoleButton({ text: 'Close', color: INK.phosphor, glowColor: INK.phosphorDim, filled: true, fontSize: 14 });
    closeBtn.onclick = () => {
        modal.remove();
        if (typeof window !== 'undefined' && window.isPausedRef) window.isPausedRef.value = false;
        if (typeof window.resumeGame === 'function') window.resumeGame();
    };
    panel.appendChild(closeBtn);

    document.body.appendChild(modal);
}

export function displayPauseMenu(stats, onResume, onRestart) {
    if (document.getElementById('pause-menu')) return;
    if (typeof window !== 'undefined' && window.isPausedRef) window.isPausedRef.value = true;

    const { modal, panel } = consolePanelModal({ id: 'pause-menu', zIndex: 4000, accent: INK.phosphor });
    panel.style.width = 'min(92vw, 420px)';
    panel.appendChild(panelTitleBar('Flight Paused', INK.phosphor));

    const rows = [
        ['Level', stats.level],
        ['Current XP', `${stats.experience} / ${stats.maxXP}`],
        ['Enemies Defeated', stats.kills],
        ['Total XP Collected', stats.xpCollected],
    ];
    const statsDiv = document.createElement('div');
    statsDiv.style.width = '100%';
    statsDiv.style.fontFamily = FONT;
    statsDiv.style.fontSize = scale(13);
    statsDiv.style.color = INK.text;
    statsDiv.style.margin = `0 0 ${scale(24)} 0`;
    rows.forEach(([k, v]) => {
        const r = document.createElement('div');
        r.style.display = 'flex';
        r.style.justifyContent = 'space-between';
        r.style.padding = `${scale(6)} 0`;
        r.style.borderBottom = `1px solid ${INK.hairlineDim}`;
        r.innerHTML = `<span style="color:${INK.textDim};text-transform:uppercase;letter-spacing:0.05em;font-size:${scale(11)}">${k}</span><span style="font-variant-numeric:tabular-nums;font-weight:600">${v}</span>`;
        statsDiv.appendChild(r);
    });
    panel.appendChild(statsDiv);

    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.gap = scale(12);

    const resumeBtn = consoleButton({ text: 'Resume', color: INK.phosphor, glowColor: INK.phosphorDim, filled: true, fontSize: 14 });
    resumeBtn.onclick = () => {
        menuCleanup();
        if (typeof window !== 'undefined' && window.isPausedRef) window.isPausedRef.value = false;
        onResume();
    };

    const restartBtn = consoleButton({ text: 'Restart', color: INK.danger, glowColor: 'rgba(255,59,48,0.5)', fontSize: 14 });
    restartBtn.onclick = () => document.location.reload();

    row.appendChild(resumeBtn);
    row.appendChild(restartBtn);
    panel.appendChild(row);

    function menuCleanup() { modal.remove(); }

    document.body.appendChild(modal);
}

export function removePauseMenu() {
    const menu = document.getElementById('pause-menu');
    if (menu) menu.remove();
}

// ---------------------------------------------------------------------------
// Tech tree
// ---------------------------------------------------------------------------
export function showTechTreeButton(onClick) {
    let btn = document.getElementById('tech-tree-btn');
    if (!btn) {
        btn = consoleButton({ text: 'Tech&nbsp;Tree', color: INK.scope, glowColor: INK.scopeDim, fontSize: 13 });
        btn.id = 'tech-tree-btn';
        btn.style.position = 'fixed';
        btn.style.top = scale(HUD_TOP_ROW2); // clears the Plasma dial's full footprint (face + caption)
        btn.style.right = scale(10);
        btn.style.zIndex = '1200';
        btn.style.padding = `${scale(8)} ${scale(16)}`;
        btn.onclick = onClick;
        document.body.appendChild(btn);
    }
    btn.style.display = 'block';
}

// One-time responsive stylesheet for the tech tree: collapses the 3-column
// branch layout to a single stacked column on narrow screens, since a
// side-by-side tree doesn't have room to breathe below ~460px.
function ensureTechTreeStyle() {
    if (document.getElementById('tech-tree-style')) return;
    const style = document.createElement('style');
    style.id = 'tech-tree-style';
    style.textContent = `
        @media (max-width: 460px) {
            #tech-tree-modal .tt-grid { grid-template-columns: 1fr !important; row-gap: ${scale(10)} !important; }
            #tech-tree-modal .tt-grid > * { grid-column: 1 !important; grid-row: auto !important; }
            #tech-tree-modal .tt-connector { display: none !important; }
            #tech-tree-modal .tt-child-label::before { content: "\\21B3  "; opacity: 0.6; }
        }
    `;
    document.head.appendChild(style);
}

// Builds one tree node "card" — smaller/denser than the old full-width rows,
// since several now sit side by side. `locked` means a prerequisite is
// unmet (distinct from simply not being able to afford it yet). Details and
// the purchase action are hidden behind a tap: the header always shows just
// the label + status, a click reveals the description and (if purchasable)
// a Confirm button, so buying always takes two deliberate taps.
function techTreeNode(upg, unlocked, locked, onUpgrade) {
    const purchasable = !unlocked && !locked;
    const costLabel = `${upg.cost} Plasma Cell${upg.cost === 1 ? '' : 's'}`;

    const node = document.createElement('div');
    node.style.width = '100%';
    node.style.boxSizing = 'border-box';
    node.style.clipPath = chamferClip(scaleNum(8));
    node.style.overflow = 'hidden';
    node.style.transition = 'background 0.08s, border-color 0.08s, opacity 0.08s';

    const applyIdle = () => {
        node.style.background = INK.panel;
        node.style.border = `1px solid ${INK.hairline}`;
        node.style.color = INK.scope;
        node.style.opacity = '1';
        node.style.filter = 'none';
    };
    if (unlocked) {
        node.style.background = INK.phosphor;
        node.style.border = `1px solid ${INK.phosphor}`;
        node.style.color = INK.void;
        node.style.boxShadow = `0 0 ${scaleNum(12)}px ${scaleNum(1)}px ${INK.phosphorDim}`;
    } else if (locked) {
        node.style.background = INK.panel;
        node.style.border = `1px solid ${INK.hairlineDim}`;
        node.style.color = INK.textDim;
        node.style.opacity = '0.5';
        node.style.filter = 'grayscale(1)';
    } else {
        applyIdle();
        node.onmouseenter = () => { node.style.background = INK.panelRaised; node.style.borderColor = INK.scope; };
        node.onmouseleave = applyIdle;
    }

    const header = document.createElement('button');
    header.style.width = '100%';
    header.style.boxSizing = 'border-box';
    header.style.textAlign = 'left';
    header.style.padding = `${scale(10)} ${scale(12)}`;
    header.style.fontFamily = FONT;
    header.style.background = 'transparent';
    header.style.border = 'none';
    header.style.color = 'inherit';
    header.style.cursor = 'pointer';

    const statusLine = unlocked
        ? 'Unlocked'
        : (locked ? `Requires ${upg.requiresLabel}` : `Cost: ${costLabel}`);
    const labelClass = upg.requires ? 'tt-child-label' : '';
    header.innerHTML = `<div style="display:flex;align-items:baseline;justify-content:space-between;gap:${scale(6)}"><span class="${labelClass}" style="font-weight:600;font-size:${scale(13)};letter-spacing:0.03em;text-transform:uppercase">${upg.label}${unlocked ? ' &mdash; Online' : ''}</span><span class="tt-chevron" style="font-size:${scale(11)};opacity:0.55;flex-shrink:0">&#9662;</span></div><div style="font-size:${scale(10)};margin-top:${scale(6)};letter-spacing:0.05em;text-transform:uppercase;opacity:${unlocked ? '0.85' : '0.6'}">${statusLine}</div>`;

    const details = document.createElement('div');
    details.style.display = 'none';
    details.style.padding = `0 ${scale(12)} ${scale(12)} ${scale(12)}`;

    const desc = document.createElement('div');
    desc.innerText = upg.desc;
    desc.style.fontFamily = FONT;
    desc.style.fontSize = scale(11);
    desc.style.opacity = '0.8';
    desc.style.marginBottom = purchasable ? scale(10) : '0';
    details.appendChild(desc);

    if (purchasable) {
        const confirmBtn = consoleButton({ text: `Confirm &mdash; ${costLabel}`, color: INK.scope, glowColor: INK.scopeDim, filled: true, fontSize: 11 });
        confirmBtn.style.width = '100%';
        confirmBtn.style.padding = `${scale(8)} ${scale(12)}`;
        confirmBtn.onclick = (e) => {
            e.stopPropagation();
            onUpgrade(upg.key, upg.cost);
        };
        details.appendChild(confirmBtn);
    }

    let expanded = false;
    header.onclick = () => {
        expanded = !expanded;
        details.style.display = expanded ? 'block' : 'none';
        const chevron = header.querySelector('.tt-chevron');
        if (chevron) chevron.innerHTML = expanded ? '&#9652;' : '&#9662;';
    };

    node.appendChild(header);
    node.appendChild(details);
    return node;
}

export function showTechTreeModal(upgrades, onUpgrade) {
    if (document.getElementById('tech-tree-modal')) return;
    if (typeof window !== 'undefined' && window.isPausedRef) window.isPausedRef.value = true;
    ensureTechTreeStyle();

    const { modal, panel } = consolePanelModal({ id: 'tech-tree-modal', zIndex: 5000, accent: INK.scope });
    panel.style.width = 'min(92vw, 480px)';
    panel.style.maxHeight = '86vh';
    panel.style.overflowY = 'auto';
    panel.appendChild(panelTitleBar('Tech Tree', INK.scope));

    // Branching layout: tier-1 nodes side by side (wrapping at 3 per row),
    // then Homing Missiles gated on Auto-Fire, then Twin Missiles gated on
    // Homing Missiles — both chained nodes stay centered under Auto-Fire's
    // column, connected by vertical lines.
    const tier1 = [

        { key: 'autoShoot', label: 'Auto-Fire', desc: 'Your ship fires automatically at enemies.', cost: 4 },
        { key: 'piercing', label: 'Piercing Rounds', desc: 'Lasers pass through enemies instead of stopping on the first hit.', cost: 6 },
        { key: 'explosiveRounds', label: 'Explosive Rounds', desc: 'Lasers deal small splash damage to enemies near the impact.', cost: 6 },
        { key: 'rapidFire', label: 'Rapid-Fire Core', desc: 'Permanently shortens your weapon cooldowns.', cost: 8 },
        { key: 'salvage', label: 'Salvage Drive', desc: 'Doubles the chance defeated enemies drop a Plasma Cell.', cost: 8 }
    ];
    const chainColumn = 1; // 0-indexed column under 'autoShoot' (tier1[1])
    const tier2 = { key: 'homingMissile', label: 'Homing Missiles', desc: 'Automatically fires missiles that track enemies in a circling orbit and deal area damage.', cost: 10, requires: 'autoShoot', requiresLabel: 'Auto-Fire' };
    const tier3 = { key: 'twinMissiles', label: 'Twin Missiles', desc: 'Fires two homing missiles per volley instead of one.', cost: 14, requires: 'homingMissile', requiresLabel: 'Homing Missiles' };

    const grid = document.createElement('div');
    grid.className = 'tt-grid';
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(3, 1fr)';
    grid.style.columnGap = scale(8);
    grid.style.rowGap = scale(10);
    grid.style.alignItems = 'start';
    grid.style.width = '100%';
    grid.style.marginBottom = scale(4);

    let row = 1;
    for (let r = 0; r * 3 < tier1.length; r++) {
        tier1.slice(r * 3, r * 3 + 3).forEach((upg, i) => {
            const node = techTreeNode(upg, !!upgrades[upg.key], false, onUpgrade);
            node.style.gridColumn = String(i + 1);
            node.style.gridRow = String(row);
            grid.appendChild(node);
        });
        row++;
    }

    const addChainedNode = (tierDef) => {
        const prereqMet = !!upgrades[tierDef.requires];
        const connector = document.createElement('div');
        connector.className = 'tt-connector';
        connector.style.gridColumn = String(chainColumn + 1);
        connector.style.gridRow = String(row);
        connector.style.justifySelf = 'center';
        connector.style.width = '2px';
        connector.style.height = scale(16);
        connector.style.background = prereqMet ? INK.scope : INK.hairlineDim;
        grid.appendChild(connector);
        row++;

        const node = techTreeNode(tierDef, !!upgrades[tierDef.key], !prereqMet, onUpgrade);
        node.style.gridColumn = String(chainColumn + 1);
        node.style.gridRow = String(row);
        grid.appendChild(node);
        row++;
    };
    addChainedNode(tier2);
    addChainedNode(tier3);

    panel.appendChild(grid);

    const closeBtn = consoleButton({ text: 'Close', color: INK.scope, glowColor: INK.scopeDim, fontSize: 13 });
    closeBtn.style.marginTop = scale(14);
    closeBtn.style.padding = `${scale(8)} ${scale(20)}`;
    closeBtn.onclick = () => {
        modal.remove();
        if (typeof window !== 'undefined' && window.isPausedRef) window.isPausedRef.value = false;
        if (typeof window.resumeGame === 'function') window.resumeGame();
    };
    panel.appendChild(closeBtn);

    document.body.appendChild(modal);
}

// ---------------------------------------------------------------------------
// Annunciator toasts — shared by the wave-incoming caution and the elite
// scanner readout (also used from enemyManager.js).
// ---------------------------------------------------------------------------
function annunciator({ id, top, text, color, duration }) {
    let hint = document.getElementById(id);
    if (hint) hint.remove();

    hint = document.createElement('div');
    hint.id = id;
    hint.style.position = 'fixed';
    hint.style.top = top;
    hint.style.left = '50%';
    hint.style.transform = 'translateX(-50%)';
    hint.style.zIndex = '2000';
    hint.style.display = 'flex';
    hint.style.alignItems = 'center';
    hint.style.gap = scale(10);
    hint.style.padding = `${scale(9)} ${scale(20)}`;
    hint.style.fontFamily = FONT;
    hint.style.fontWeight = '600';
    hint.style.fontSize = scale(13);
    hint.style.letterSpacing = '0.06em';
    hint.style.textTransform = 'uppercase';
    hint.style.color = color;
    panelBase(hint, { color, chamfer: 6 });
    hint.style.boxShadow = `0 0 ${scaleNum(16)}px ${scaleNum(1)}px ${color}66`;
    hint.style.animation = 'console-lamp-flash 1s ease-in-out infinite';

    if (!document.getElementById('console-lamp-flash-kf')) {
        const kf = document.createElement('style');
        kf.id = 'console-lamp-flash-kf';
        kf.textContent = `@keyframes console-lamp-flash { 0%,100% { opacity: 1; } 50% { opacity: 0.72; } }`;
        document.head.appendChild(kf);
    }

    const lamp = document.createElement('div');
    lamp.style.width = scale(8);
    lamp.style.height = scale(8);
    lamp.style.borderRadius = '50%';
    lamp.style.background = color;
    lamp.style.boxShadow = `0 0 ${scaleNum(6)}px ${scaleNum(1)}px ${color}`;
    lamp.style.flexShrink = '0';

    const label = document.createElement('span');
    label.innerText = text;

    hint.appendChild(lamp);
    hint.appendChild(label);
    document.body.appendChild(hint);

    setTimeout(() => {
        if (document.getElementById(id) === hint) hint.remove();
    }, duration);

    return hint;
}

export function showWaveHint() {
    annunciator({ id: 'wave-hint', top: '96px', text: 'Caution — Enemy Wave Incoming', color: INK.caution, duration: 3500 });
}


export function showOverdriveHint(duration) {
    annunciator({ id: 'overdrive-hint', top: '172px', text: 'Weapon Overdrive Engaged', color: INK.gold, duration });
}

