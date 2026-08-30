// filepath: /Users/philippkanter/Developer/space-ship-idle/src/ui.js
// Night-Flight Console — cockpit instrument HUD (see index.html body comment
// for the direction contract).
import { MOBILE, OVERDRIVE_CORE, XP_BOOST, BOLT_VELOCITY, FLIGHT_PROTOCOLS, FLIGHT_PROTOCOL_SLOT_COUNT } from './constants.js';
import { xpSprite } from './xp.js';
import { clearRunState, suppressAutosave } from './runState.js';
import { getUpgradeStatPreview, getRecommendedUpgradeKey, upgrades, techUpgrades, TECH_MIN_LEVELS, isTechTreeComplete, flightProtocols, handleProtocolUnlock, toggleProtocol } from './upgrades.js';
import { AudioManager } from './audio/AudioManager.js';
import { setScreenShakeEnabled, isScreenShakeEnabled } from './effects.js';
import { t, getLanguage, setLanguage } from './i18n.js';
import packageInfo from '../package.json';

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
// Temporary release notice for the mobile control redesign.
const MOBILE_MOVEMENT_NOTICE_VERSION = 'mobile-controls-v4';

const CHANGELOG_ENTRIES = [
    { version: '0.10.4', date: '2026-08-30', changes: ['Flight Protocols: every row now shows an explicit status line (Active / Unlocked / Locked until Level X / Needs X Data / Loadout full). A protocol you already own can be activated and deactivated at any level — dying and restarting at level 1 no longer locks you out of rearranging your loadout; only unlocking new protocols stays level-gated.'] },
    { version: '0.10.3', date: '2026-08-30', changes: ['Bugfix: Opening the Flight Protocols menu now pauses the flight (like the Pause, Settings, and Tech Tree menus) instead of letting enemies keep attacking behind it. Escape closes the menu.'] },
    { version: '0.10.2', date: '2026-08-30', changes: ['Bugfix: The Flight Protocols and tech-node detail modals no longer overflow the screen on mobile with the longer German labels; their buttons now stack on narrow screens.'] },
    { version: '0.10.1', date: '2026-08-30', changes: ['Tech Tree: Level-gated nodes (Twin Drones, Signal Interference, late Payload Amplifiers, etc.) now stay visible as locked cards showing the required level, instead of being hidden until the current run reaches that level.'] },
    { version: '0.10.0', date: '2026-08-30', changes: ['Added German localization with an English/Deutsch language switch in Settings; the game auto-detects the browser language on first launch. Changelog entries stay in English.'] },
    { version: '0.9.26', date: '2026-08-30', changes: ['Bugfix: On mobile, rotating between portrait and landscape now resizes the playfield to fill the screen instead of leaving it cropped.'] },
    { version: '0.9.25', date: '2026-08-28', changes: ['Balancing: Laser projectile speed is no longer tied to Laser Damage. Added a permanent Bolt Velocity tech node that grants +2 bolt speed and unlocks a repeatable level-up upgrade raising bolt speed up to 18.'] },
    { version: '0.9.24', date: '2026-08-09', changes: ['Performance Fix: Added a hard 60 FPS cap to normalize device performance and prevent battery drain on high-refresh-rate phones (e.g. 120Hz/144Hz displays).'] },
    { version: '0.9.23', date: '2026-08-08', changes: ['Performance Fix: Removed expensive shadowBlur rendering from late-game enemies, resolving severe framerate drops in Chrome.'] },
    { version: '0.9.22', date: '2026-08-08', changes: ['Balancing: The Salvage hull repair reward now restores the ship to full maximum hull instead of just 1 HP.'] },
    { version: '0.9.21', date: '2026-08-08', changes: ['UI Polish: Restored the thematic gold border to the Flight Protocols button.'] },
    { version: '0.9.20', date: '2026-08-08', changes: ['Bugfix: Resolved an issue where the Tech Tree button would overlap the Flight Protocols button when Flight Data was active.'] },
    { version: '0.9.19', date: '2026-08-08', changes: ['UI Polish: Swapped position of Tech Tree and Flight Protocols buttons.', 'UI Polish: Removed stray border color from Tech Tree button.', 'Added 4/F desktop keyboard shortcut for Flight Protocols (visible in Settings once unlocked; Desktop only).'] },
    { version: '0.9.18', date: '2026-08-08', changes: ['Switched to self-hosted local fonts for GDPR/DSGVO compliance instead of loading them from Google Fonts.'] },
    { version: '0.9.17', date: '2026-08-08', changes: ['Added offline caching for Google Fonts to prevent the game from failing to start on poor or slow internet connections.'] },
    { version: '0.9.16', date: '2026-08-08', changes: ['Balancing: Hull Integrity (Armor) drops are now much rarer in the XP shop if you have 10+ Armor and Nanite Repair active, preserving late-game risk.'] },
    { version: '0.9.15', date: '2026-08-08', changes: ['Fixed an issue on mobile where Phase Two (Flight Data) could not be reached because Auto-Fire is unlocked by default and never purchased.'] },
    { version: '0.9.14', date: '2026-08-08', changes: ['Hotfix: Adjusted exponential scaling for late-game damage and HP to prevent extreme scaling drop-offs.'] },
    { version: '0.9.13', date: '2026-08-08', changes: ['Flattened late-game laser damage/speed scaling', 'Increased enemy HP scaling', 'Buffed special enemies and adjusted their spawn pacing'] },
    { version: '0.9.12', date: '2026-08-08', changes: ['Reorganized HUD: Flight Data now appears on the far right, and Flight Protocols have their own dedicated button instead of being hidden in the Tech Tree.'] },
    { version: '0.9.11', date: '2026-08-08', changes: ['Changed Flight Data to physical chip drops instead of instant credit.'] },
    { version: '0.9.10', date: '2026-08-08', changes: ['Added a Flight Data dial to the HUD for late-game progression.'] },
    { version: '0.9.9', date: '2026-08-08', changes: ['Fixed drone rendering overlap for multiple drones', 'Added visual ring for Salvage Event overcharge barrier'] },
    { version: '0.9.8', date: '2026-08-07', changes: ['Added Flight Data and the post-tree Flight Protocols loadout with three active slots and five tactical protocols.'] },
    { version: '0.9.7', date: '2026-08-07', changes: ['Plasma drops now stop once the full Tech Tree is purchased; existing Plasma Cells can still be collected.'] },
    { version: '0.9.6', date: '2026-08-07', changes: ['Added Prism, Phase Stalker, and Hunter enemies from level 50 onward with shields, phase windows, and attack dashes; late-game surges now use their distinct roles.'] },
    { version: '0.9.5', date: '2026-08-07', changes: ['Rebalanced Tech Tree access: earlier XP and Plasma economy, a guaranteed first salvage Plasma reward, and level-gated late-game weapon and drone upgrades.'] },
    { version: '0.9.4', date: '2026-08-07', changes: ['Factory Reset now clears all game progress while preserving settings and preferences.'] },
    { version: '0.9.3', date: '2026-08-07', changes: ['Matched the Pre-Flight Check height constraint to Settings and Tech Tree so small mobile screens get a real scroll viewport.'] },
    { version: '0.9.2', date: '2026-08-07', changes: ['Aligned the mobile Pre-Flight Check with the working scroll behavior used by Settings and Tech Tree, and kept menus above the HUD readouts.'] },
    { version: '0.9.1', date: '2026-08-07', changes: ['Fixed touch scrolling in the mobile Pre-Flight Check dialog.'] },
    { version: '0.9.0', date: '2026-08-07', changes: ['Made One-Handed the default mobile control scheme and made the Pre-Flight Check scrollable on small screens.'] },
    { version: '0.8.1', date: '2026-08-06', changes: ['Added dedicated audio feedback for Signal Interference EMP and Reactor Nova discharges.'] },
    { version: '0.8.0', date: '2026-08-06', changes: ['Expanded salvage rewards with temporary Drone Uplink and Hull Overcharge bonuses, scaled resource rewards, and no Plasma salvage beyond level 24.'] },
    { version: '0.7.2', date: '2026-08-06', changes: ['Enemy lasers now travel much farther through the flight space and end with a small visible magenta discharge.'] },
    { version: '0.7.1', date: '2026-08-06', changes: ['Slightly slowed the boss laser tracking and restored the boss Death Ray when a homing missile lands the final hit.'] },
    { version: '0.7.0', date: '2026-08-06', changes: ['Long flights now maintain nearby combat pressure by bringing distant regular enemies back toward the route and reinforcing sparse encounters.'] },
    { version: '0.6.2', date: '2026-08-06', changes: ['Enemy firing and Death Ray sounds now play only when their source is visible.'] },
    { version: '0.6.1', date: '2026-08-06', changes: ['Salvage signals last longer and stay active after a pilot commits to the route; every salvage reward now has a distinct visual confirmation.'] },
    { version: '0.6.0', date: '2026-08-06', changes: ['Bosses now lock on before firing a slow-tracking red laser that can be evaded through sustained flight; their Death Ray still turns on enemies after defeat.'] },
    { version: '0.5.2', date: '2026-08-06', changes: ['Extended AEGIS pulse flight to six seconds and added a visible cyan detonation on impact or expiry.'] },
    { version: '0.5.1', date: '2026-08-06', changes: ['Restored the hidden Drone Emitter III node and refined AEGIS pulses with a smaller octagonal form, longer flight, and visible-contact audio.'] },
    { version: '0.5.0', date: '2026-08-06', changes: ['Added long-range salvage routes with route hazards, AEGIS homing pulse attacks, and five-rank independent damage paths for drones and homing missiles.'] },
    { version: '0.4.4', date: '2026-08-06', changes: ['Added distinct sounds for boss rays, surges, low hull, salvage recovery, and incoming space obstacles.'] },
    { version: '0.4.3', date: '2026-08-06', changes: ['Update enemy laser sound effect and resource collection sound'] },
    { version: '0.4.2', date: '2026-08-05', changes: ['Made salvage signals rarer and more distant, added a collection ping and visible reward drops, improved obstacle persistence and drift, removed boss popcorn spawns, and strengthened keyboard selection in Pause and Settings.'] },
    { version: '0.4.1', date: '2026-08-05', changes: ['Added a dedicated scanner ping when a salvage signal enters the flight area.'] },
    { version: '0.4.0', date: '2026-08-05', changes: ['Added rare salvage signals with Plasma, XP, hull recovery, or Overdrive rewards, plus sparse asteroids and drifting debris to reshape flight paths.'] },
    { version: '0.3.18', date: '2026-08-05', changes: ['Reduced Reactor Nova frequency and heavy-target damage again so it reads as a recovery pulse instead of a screen reset.'] },
    { version: '0.3.17', date: '2026-08-05', changes: ['Soft-capped late laser damage growth after upgrade level 20 and retuned Aegis shielding for the new endgame damage curve.'] },
    { version: '0.3.16', date: '2026-08-05', changes: ['Capped laser projectile speed at the established mid-game handling level.'] },
    { version: '0.3.15', date: '2026-08-05', changes: ['Tuned Reactor Nova to charge over 24 kills, respect a 10s cooldown, deal 6 damage, and instantly destroy only light targets.'] },
    { version: '0.3.14', date: '2026-08-05', changes: ['Slowed Reactor Nova’s shockwave animation and made it destroy light/medium enemies while only damaging heavy targets.'] },
    { version: '0.3.13', date: '2026-08-05', changes: ['Added cyan Aegis enemies to late-game surges; their shielding makes them take multiple hits without inflating regular enemy HP.'] },
    { version: '0.3.12', date: '2026-08-05', changes: ['Expanded Reactor Nova into a wide, screen-scale shockwave.', 'Added controlled late-game surge events from level 25 onward without increasing regular enemy HP.'] },
    { version: '0.3.11', date: '2026-08-05', changes: ['Fresh enemy kills always keep a visible XP orb nearby, even when the active orb budget is full.'] },
    { version: '0.3.10', date: '2026-08-05', changes: ['Fixed horizontal scrolling in the mobile tech tree modal.', 'Moved mobile FPS and version display to the bottom left.'] },
    { version: '0.3.9', date: '2026-08-05', changes: ['Rebalanced regular enemy HP and split enemy budgets so late-game targets are less bullet-spongy.'] },
    { version: '0.3.8', date: '2026-08-05', changes: ['Added this scrollable in-game changelog and release history.'] },
    { version: '0.3.7', date: '2026-08-05', changes: ['The version and FPS display is now also visible on mobile above the touch controls.'] },
    { version: '0.3.6', date: '2026-08-05', changes: ['Flattened late-game enemy HP scaling so higher-level enemies are less likely to become bullet sponges.'] },
    { version: '0.3.5', date: '2026-08-05', changes: ['Added combat stats to the pause menu.', 'Extended Signal Interference, slowed its EMP pulse, staggered enemy recovery, and softened the Death Ray.'] },
    { version: '0.3.4', date: '2026-08-04', changes: ['Reduced the base HP of the late-game Pentagon and Shooter enemy roles.'] },
    { version: '0.3.3', date: '2026-08-04', changes: ['Made Reactor Nova and Signal Interference visually distinct.', 'Moved the Death Ray origin to the defeated boss.'] },
    { version: '0.3.2', date: '2026-08-04', changes: ['Collector Pulse now pauses during the level-up shop and resumes with its remaining duration.'] },
    { version: '0.3.1', date: '2026-08-04', changes: ['Made Tech Tree dependency connectors more visible with active and locked path states.'] },
    { version: '0.3.0', date: '2026-08-04', changes: ['Restructured the Tech Tree into desktop branches and a mobile-friendly grouped list.'] },
    { version: '0.2.4', date: '2026-08-04', changes: ['Signal Interference is hidden until enemy shooters appear at level 18.', 'Rounded Current XP to two decimal places.'] },
    { version: '0.2.3', date: '2026-08-04', changes: ['Clarified Learning Protocol and Signal Interference descriptions in the Tech Tree.'] },
    { version: '0.2.2', date: '2026-08-04', changes: ['Rounded Total XP Collected to two decimal places in the pause menu.'] },
    { version: '0.2.1', date: '2026-08-04', changes: ['Polished the elite Death Ray with a clearer core, emitter, and fade.'] },
    { version: '0.2.0', date: '2026-08-04', changes: ['Added a progressive Homing Missile branch for payload, endurance, warhead radius, and guidance upgrades.'] },
    { version: '0.1.9', date: '2026-08-04', changes: ['Added close buttons and Escape support for Pause, Settings, and Tech Tree menus.'] },
    { version: '0.1.8', date: '2026-08-04', changes: ['Added desktop shortcuts: T/3 for Tech Tree, P/1 for Pause, and O/2 for Settings.'] },
    { version: '0.1.7', date: '2026-08-04', changes: ['Added clearer mobile control guidance, a scrollable Settings menu, and an updated mobile notice.'] },
    { version: '0.1.6', date: '2026-08-04', changes: ['Restored the legacy one-handed movement behavior without reverse flight on the left stick.'] },
    { version: '0.1.5', date: '2026-08-04', changes: ['Changed Targeting Matrix to support drone targeting only.'] },
    { version: '0.1.4', date: '2026-08-04', changes: ['Added Twin-Stick and One-Handed mobile control schemes.'] },
    { version: '0.1.3', date: '2026-08-04', changes: ['Removed the mobile soft aim assist after playtesting showed it was unclear.'] },
    { version: '0.1.2', date: '2026-08-04', changes: ['Added mobile soft aim assist.'] },
    { version: '0.1.1', date: '2026-08-04', changes: ['Improved mobile touch flight controls and tuning.'] },
    { version: '0.1.0', date: '2026-08-04', changes: ['Introduced the semantic game version shown in the HUD.'] }
];
const MOBILE_MOVEMENT_NOTICE_KEY = 'spaceShipIdleMobileMovementNotice';
const PREFERENCE_STORAGE_KEYS = new Set([
    'spaceShipIdleSettings',
    'spaceShipIdle_sfxEnabled',
    'spaceShipIdle_shakeEnabled'
]);

function clearGameProgressStorage() {
    for (let index = localStorage.length - 1; index >= 0; index--) {
        const key = localStorage.key(index);
        if (key && !PREFERENCE_STORAGE_KEYS.has(key)) localStorage.removeItem(key);
    }
}

// HUD row offset (unscaled px). Row 1 (Level/Plasma dials, Pause, Settings,
// Tech Tree) sits below the XP tape (14px tall) with a small gap, instead of
// at the very top edge — the tape and the row used to overlap.
const HUD_TOP_ROW1 = 22;

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
    button[data-keyboard-selected="true"] {
        outline: 2px solid ${INK.phosphor};
        outline-offset: 3px;
        filter: brightness(1.15);
    }
    #console-scanlines {
        position: fixed;
        inset: 0;
        z-index: 9000;
        pointer-events: none;
        will-change: transform;
        opacity: 0.15;
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
        document.body.appendChild(_plasmaDial.wrap);
    }
    if (isTechTreeComplete()) {
        _plasmaDial.wrap.style.right = scale(84);
    } else {
        _plasmaDial.wrap.style.right = scale(10);
    }
    _plasmaDial.readout.innerText = String(count);
    // 1 Plasma = 15 Grad (1 voller Kreis = 24 Plasma)
    _plasmaDial.needle.style.transform = `rotate(${count * 15}deg)`;
}

// ---------------------------------------------------------------------------
// Flight Data dial
// ---------------------------------------------------------------------------
let _dataDial = null;

export function updateFlightDataUI(count) {
    if (!isTechTreeComplete()) return;
    if (!_dataDial) {
        _dataDial = buildInstrumentDial({ id: 'data-display', captionText: 'Data', color: INK.gold, glowColor: 'rgba(255,210,63,0.55)' });
        _dataDial.wrap.style.right = scale(10);
        document.body.appendChild(_dataDial.wrap);

        if (_plasmaDial) {
            _plasmaDial.wrap.style.right = scale(84);
        }

        const ttBtn = document.getElementById('tech-tree-btn');
        if (ttBtn) {
            ttBtn.style.right = scale(200);
        }
    }
    showProtocolsButton(showFlightProtocolsModal);
    
    _dataDial.readout.innerText = String(count);
    // 1 Data = 15 Grad (1 voller Kreis = 24 Data)
    _dataDial.needle.style.transform = `rotate(${count * 15}deg)`;
}


// Armor is shown solely via the integrity ring around the ship (see
// ship.js: drawIntegrityRing) — no numeric HUD dial. Freed-up screen space
// matters most on mobile, and the ring is legible enough on its own.

export function initializeUI() {
    updateExperienceBar(0, 1);
    displayLevel(1);
    updatePlasmaUI(0);
}

// ---------------------------------------------------------------------------
// Shared console button — backlit legend on a dark chamfered panel. `filled`
// renders the "engaged" state (solid color, dark legend) used for confirmed/
// unlocked states instead of the default backlit outline.
// ---------------------------------------------------------------------------
function consoleButton({ text, color, glowColor, filled = false, fontSize = 16, sound = 'UI_CLICK' }) {
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

    let keyboardSelected = false;
    const setState = (engaged) => {
        if (engaged) {
            btn.style.background = color;
            btn.style.color = INK.void;
            btn.style.boxShadow = keyboardSelected
                ? `0 0 ${scaleNum(22)}px ${scaleNum(4)}px ${glowColor}`
                : `0 0 ${scaleNum(14)}px ${scaleNum(2)}px ${glowColor}`;
        } else {
            btn.style.background = keyboardSelected ? `${color}22` : INK.panel;
            btn.style.color = color;
            btn.style.boxShadow = keyboardSelected
                ? `0 0 ${scaleNum(22)}px ${scaleNum(4)}px ${glowColor}`
                : `0 0 ${scaleNum(6)}px 0 ${glowColor}`;
        }
        btn.style.outline = keyboardSelected ? `2px solid ${color}` : '';
        btn.style.outlineOffset = keyboardSelected ? scale(3) : '';
    };
    setState(filled);
    btn.onmouseenter = () => { btn.style.boxShadow = `0 0 ${scaleNum(keyboardSelected ? 22 : 18)}px ${scaleNum(keyboardSelected ? 4 : 3)}px ${glowColor}`; };
    btn.onmouseleave = () => { setState(filled); };
    btn.addEventListener('keyboardselectionchange', (event) => {
        keyboardSelected = !!event.detail.selected;
        setState(filled);
    });
    mirrorHoverOnFocus(btn); // keyboard focus (Arrow-key nav) gets the same glow bump as hover
    btn.addEventListener('mouseenter', () => AudioManager.play('UI_HOVER'));
    btn.addEventListener('click', () => AudioManager.play(sound));
    return btn;
}

function panelTitleBar(text, color, onClose) {
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

    const lamp = onClose
        ? consoleButton({ text: '×', color, glowColor: `${color}88`, fontSize: 20 })
        : document.createElement('div');
    if (onClose) {
        lamp.classList.add('modal-close-button');
        lamp.setAttribute('aria-label', t('common.closeNamed', { name: text }));
        lamp.style.width = scale(32);
        lamp.style.height = scale(32);
        lamp.style.padding = '0';
        lamp.style.flexShrink = '0';
        lamp.style.lineHeight = '1';
        lamp.onclick = onClose;
    } else {
        lamp.style.width = scale(8);
        lamp.style.height = scale(8);
        lamp.style.borderRadius = '50%';
        lamp.style.background = color;
        lamp.style.boxShadow = `0 0 ${scaleNum(6)}px ${scaleNum(1)}px ${color}`;
    }

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
    // Keep every modal/menu above the HUD, including the mobile FPS/version
    // readout (z-index 9999) and the scanline/vignette chrome.
    modal.style.zIndex = String(Math.max(zIndex, 11000));
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

// Shared spatial keyboard navigation for modal panels, so every console menu
// (Shop, Pause, Settings, Tech Tree, Pre-Flight Check, ...) is usable without
// a mouse. W/S mirror Up/Down and A/D mirror Left/Right. Navigation follows
// the visible layout instead of blindly following DOM order, which matters for
// side-by-side pause buttons and the multi-column tech tree.
function enableArrowKeyNav(panel) {
    const getItems = () => Array.from(panel.querySelectorAll('button:not([disabled])'));
    let idx = -1;
    const setSelected = (item) => {
        getItems().forEach((candidate) => {
            const selected = candidate === item;
            candidate.dataset.keyboardSelected = selected ? 'true' : 'false';
            candidate.dispatchEvent(new CustomEvent('keyboardselectionchange', { detail: { selected } }));
        });
    };
    const centerOf = (item) => {
        const rect = item.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    };
    const findDirectionalItem = (items, currentItem, direction) => {
        if (!currentItem) return -1;
        const current = centerOf(currentItem);
        const candidates = items
            .map((item, itemIndex) => ({ item, itemIndex, center: centerOf(item) }))
            .filter(({ center }) => {
                if (direction === 'up') return center.y < current.y - 1;
                if (direction === 'down') return center.y > current.y + 1;
                if (direction === 'left') return center.x < current.x - 1;
                return center.x > current.x + 1;
            })
            .map(({ itemIndex, center }) => {
                const primary = direction === 'up'
                    ? current.y - center.y
                    : direction === 'down'
                        ? center.y - current.y
                        : direction === 'left'
                            ? current.x - center.x
                            : center.x - current.x;
                const perpendicular = direction === 'up' || direction === 'down'
                    ? Math.abs(center.x - current.x)
                    : Math.abs(center.y - current.y);
                // Prefer the nearest row/column first, then the closest item
                // within that row/column. This makes Tech Tree branches behave
                // like the visual tree while keeping list navigation natural.
                return { itemIndex, score: primary * 10 + perpendicular };
            })
            .sort((a, b) => a.score - b.score);
        return candidates.length ? candidates[0].itemIndex : -1;
    };
    const focusItem = (i) => {
        const items = getItems();
        if (!items.length) return;
        idx = ((i % items.length) + items.length) % items.length;
        setSelected(items[idx]);
        items[idx].focus();
    };
    panel.addEventListener('focusin', (e) => {
        const items = getItems();
        const focusedIndex = items.indexOf(e.target.closest('button'));
        if (focusedIndex >= 0) {
            idx = focusedIndex;
            setSelected(items[idx]);
        }
    });
    panel.addEventListener('keydown', (e) => {
        const items = getItems();
        const focusedIndex = items.indexOf(document.activeElement);
        if (focusedIndex >= 0) idx = focusedIndex;
        const currentItem = items[idx] || items[0];

        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
            e.preventDefault();
            e.stopPropagation(); // don't let this also reach input.js's window-level ship-movement listener
            const nextIndex = findDirectionalItem(items, currentItem, 'up');
            if (nextIndex >= 0) focusItem(nextIndex);
        } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
            e.preventDefault();
            e.stopPropagation();
            const nextIndex = findDirectionalItem(items, currentItem, 'down');
            if (nextIndex >= 0) focusItem(nextIndex);
        } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
            e.preventDefault();
            e.stopPropagation();
            const nextIndex = findDirectionalItem(items, currentItem, 'left');
            if (nextIndex >= 0) focusItem(nextIndex);
        } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
            e.preventDefault();
            e.stopPropagation();
            const nextIndex = findDirectionalItem(items, currentItem, 'right');
            if (nextIndex >= 0) focusItem(nextIndex);
        } else if (e.key === 'Enter' || e.code === 'Space') {
            const activeItem = items[idx] || currentItem;
            if (activeItem) {
                e.preventDefault();
                e.stopPropagation();
                activeItem.click();
            }
        }
    });
    focusItem(0);
}

// Mirrors a row/button's existing mouse-hover visuals onto keyboard focus, so
// Arrow-key navigation (see enableArrowKeyNav) gets the same background
// intensification a mouse hover already gets — on top of the global focus
// outline. Only needed for bespoke rows that aren't built via consoleButton()
// (which already does this itself).
function mirrorHoverOnFocus(el, { playSound = true } = {}) {
    el.addEventListener('focus', () => {
        if (el.onmouseenter) el.onmouseenter();
        if (playSound) AudioManager.play('UI_HOVER');
    });
    el.addEventListener('blur', () => { if (el.onmouseleave) el.onmouseleave(); });
}

// ---------------------------------------------------------------------------
// Pre-flight check — difficulty select, shown once before the game loop
// begins. `onSelect` receives 'easy' or 'normal'.
// ---------------------------------------------------------------------------
export function displayStartScreen(onSelect) {
    if (document.getElementById('start-screen')) return;

    const { modal, panel } = consolePanelModal({ id: 'start-screen', zIndex: 3500, accent: INK.phosphor });
    panel.style.width = 'min(92vw, 460px)';
    panel.style.maxHeight = _isMobile ? '70vh' : '86vh';
    panel.style.overflowY = 'auto';
    panel.style.touchAction = 'pan-y';
    panel.style.webkitOverflowScrolling = 'touch';
    panel.appendChild(panelTitleBar(t('startScreen.title'), INK.phosphor));

    const intro = document.createElement('p');
    intro.innerText = t('startScreen.selectDifficulty');
    intro.style.fontFamily = FONT;
    intro.style.color = INK.textDim;
    intro.style.fontSize = scale(12);
    intro.style.margin = `0 0 ${scale(16)} 0`;
    intro.style.alignSelf = 'flex-start';
    panel.appendChild(intro);

    const modes = [
        { key: 'normal', label: t('startScreen.modeNormalLabel'), desc: t('startScreen.modeNormalDesc') },
        { key: 'easy', label: t('startScreen.modeEasyLabel'), desc: t('startScreen.modeEasyDesc') }
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
        mirrorHoverOnFocus(row);
        row.addEventListener('mouseenter', () => AudioManager.play('UI_HOVER'));
        row.onclick = () => {
            AudioManager.play('UI_CLICK');
            modal.remove();
            onSelect(mode.key);
        };
        panel.appendChild(row);
    });

    // Controls Hint
    const controls = document.createElement('div');
    controls.style.width = '100%';
    controls.style.marginTop = scale(4);
    controls.style.padding = `${scale(12)} ${scale(14)}`;
    controls.style.background = INK.panelRaised;
    controls.style.border = `1px solid ${INK.hairlineDim}`;
    controls.style.clipPath = chamferClip(scaleNum(6));
    controls.style.fontFamily = FONT;
    controls.style.fontSize = scale(11);
    controls.style.color = INK.textDim;
    controls.style.boxSizing = 'border-box';
    
    // CSS to make keys look like actual keys
    const kbdStyle = `display:inline-block; padding:1px 5px; margin:0 2px; background:#1e2421; border:1px solid ${INK.hairline}; border-radius:3px; color:${INK.phosphor}; font-weight:600; box-shadow:0 2px 0 rgba(0,0,0,0.5); font-size:${scale(10)}`;

    if (_isMobile) {
        controls.innerHTML = `
            <div style="color:${INK.text}; margin-bottom:${scale(6)}; font-weight:600; letter-spacing:0.05em;">${t('startScreen.controlsHeading')}</div>
            <div style="margin-bottom:${scale(4)}"><span style="color:${INK.scope}">${t('startScreen.mobileOneHandedLabel')}</span> ${t('startScreen.mobileOneHandedText')}</div>
            <div style="margin-bottom:${scale(4)}"><span style="color:${INK.phosphor}">${t('startScreen.mobileTwinStickLabel')}</span> ${t('startScreen.mobileTwinStickText')}</div>
            <div><span style="color:${INK.text}">${t('startScreen.mobileSwitchLaterLabel')}</span> ${t('startScreen.mobileSwitchLaterText')}</div>
        `;
    } else {
        controls.innerHTML = `
            <div style="color:${INK.text}; margin-bottom:${scale(6)}; font-weight:600; letter-spacing:0.05em;">${t('startScreen.controlsHeading')}</div>
            <div>${t('startScreen.desktopMove')} <kbd style="${kbdStyle}">W</kbd><kbd style="${kbdStyle}">A</kbd><kbd style="${kbdStyle}">S</kbd><kbd style="${kbdStyle}">D</kbd></div>
            <div style="margin-top:${scale(6)}">${t('startScreen.desktopFire')} <kbd style="${kbdStyle}">SPACE</kbd></div>
            <div style="margin-top:${scale(6)}">${t('startScreen.desktopRollStrafe')} <kbd style="${kbdStyle}">Q</kbd> / <kbd style="${kbdStyle}">E</kbd></div>
        `;
    }
    panel.appendChild(controls);

    // PWA Install Hint
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    if (!isStandalone) {
        const pwaHint = document.createElement('div');
        pwaHint.style.marginTop = scale(12);
        pwaHint.style.padding = `${scale(10)} ${scale(14)}`;
        pwaHint.style.border = `1px dashed ${INK.scope}88`;
        pwaHint.style.background = `${INK.scope}11`;
        pwaHint.style.color = INK.scope;
        pwaHint.style.fontFamily = FONT;
        pwaHint.style.fontSize = scale(12);
        pwaHint.style.textAlign = 'center';
        pwaHint.style.clipPath = chamferClip(scaleNum(6));
        
        let pwaHintText = '';
        const ua = navigator.userAgent;
        if (/iphone|ipad|ipod/i.test(ua)) {
            pwaHintText = t('startScreen.pwaHintIos');
        } else if (/Macintosh|Mac OS X/i.test(ua) && /Safari/i.test(ua) && !/Chrome|Chromium|CriOS|Edg|OPR|FxiOS|Firefox/i.test(ua)) {
            pwaHintText = t('startScreen.pwaHintMacSafari');
        } else {
            pwaHintText = t('startScreen.pwaHintGeneric');
        }
        
        pwaHint.innerText = pwaHintText;
        panel.appendChild(pwaHint);
    }

    document.body.appendChild(modal);
    enableArrowKeyNav(panel);
}

// Temporary, acknowledgement-required notice for the mobile control update.
// It is versioned so a later control redesign can show a new notice without
// touching the user's settings or run state.
export function showMobileMovementUpdateNotice() {
    if (!_isMobile || document.getElementById('mobile-movement-update')) return;

    try {
        if (localStorage.getItem(MOBILE_MOVEMENT_NOTICE_KEY) === MOBILE_MOVEMENT_NOTICE_VERSION) return;
    } catch (error) {
        // If storage is unavailable, still show the notice for this session.
    }

    if (typeof window !== 'undefined' && window.isPausedRef) window.isPausedRef.value = true;

    const { modal, panel } = consolePanelModal({ id: 'mobile-movement-update', zIndex: 6500, accent: INK.scope });
    panel.style.width = 'min(92vw, 440px)';
    panel.appendChild(panelTitleBar(t('mobileNotice.title'), INK.scope));

    const intro = document.createElement('div');
    intro.innerText = t('mobileNotice.heading');
    intro.style.fontFamily = FONT;
    intro.style.fontSize = scale(14);
    intro.style.fontWeight = '600';
    intro.style.color = INK.text;
    intro.style.marginBottom = scale(14);
    panel.appendChild(intro);

    const notice = document.createElement('div');
    notice.style.fontFamily = FONT;
    notice.style.fontSize = scale(12);
    notice.style.lineHeight = '1.55';
    notice.style.color = INK.textDim;
    notice.style.padding = `${scale(12)} ${scale(14)}`;
    notice.style.background = INK.panelRaised;
    notice.style.border = `1px solid ${INK.hairlineDim}`;
    notice.style.clipPath = chamferClip(scaleNum(6));
    notice.innerHTML = `
        <div style="margin-bottom:${scale(8)}"><span style="color:${INK.scope}">${t('mobileNotice.oneHandedLabel')}</span> ${t('mobileNotice.oneHandedText')}</div>
        <div style="margin-bottom:${scale(8)}"><span style="color:${INK.phosphor}">${t('mobileNotice.twinStickLabel')}</span> ${t('mobileNotice.twinStickText')}</div>
        <div><span style="color:${INK.text}">${t('mobileNotice.switchAnytimeLabel')}</span> ${t('mobileNotice.switchAnytimeText')}</div>
    `;
    panel.appendChild(notice);

    const confirmBtn = consoleButton({ text: t('common.gotIt'), color: INK.scope, glowColor: INK.scopeDim, filled: true, fontSize: 14 });
    confirmBtn.style.width = '100%';
    confirmBtn.style.marginTop = scale(18);
    confirmBtn.onclick = () => {
        AudioManager.play('UI_CLICK');
        try {
            localStorage.setItem(MOBILE_MOVEMENT_NOTICE_KEY, MOBILE_MOVEMENT_NOTICE_VERSION);
        } catch (error) {
            // The acknowledgement can still dismiss the notice for this session.
        }
        modal.remove();
        if (typeof window !== 'undefined' && window.isPausedRef) window.isPausedRef.value = false;
        if (typeof window.resumeGame === 'function') window.resumeGame();
    };
    panel.appendChild(confirmBtn);

    document.body.appendChild(modal);
    enableArrowKeyNav(panel);
}

// ---------------------------------------------------------------------------
// Game over
// ---------------------------------------------------------------------------
export function displayGameOverScreen(currentLevel) {
    if (document.getElementById('game-over-screen')) return;

    const { modal, panel } = consolePanelModal({ id: 'game-over-screen', zIndex: 2000, accent: INK.danger });
    panel.appendChild(panelTitleBar(t('gameOver.title'), INK.danger));

    const levelText = document.createElement('p');
    levelText.innerText = t('gameOver.endedAtLevel', { level: currentLevel });
    levelText.style.fontFamily = FONT;
    levelText.style.color = INK.text;
    levelText.style.fontSize = scale(15);
    levelText.style.margin = `0 0 ${scale(26)} 0`;
    panel.appendChild(levelText);

    const restartButton = consoleButton({ text: t('common.restart'), color: INK.phosphor, glowColor: INK.phosphorDim, filled: true, fontSize: 15 });
    restartButton.onclick = () => {
        suppressAutosave();
        clearRunState();
        document.location.reload();
    };
    panel.appendChild(restartButton);

    document.body.appendChild(modal);
    enableArrowKeyNav(panel);
}

// ---------------------------------------------------------------------------
// Shop modal
// ---------------------------------------------------------------------------
// Rarity tiers map directly onto existing design tokens (see DESIGN.md) rather
// than inventing new colors: Common = neutral text-dim grey, Rare = Scope Cyan
// (the existing "tech/secondary" register), Legendary = Target Gold (the
// existing "target of opportunity" color) — a natural fit for a rare, high-
// value pick.
const RARITY_WEIGHTS = { common: 70, rare: 25, legendary: 5 };
const RARITY_STYLE = {
    common: { labelKey: 'shop.rarity.common', text: INK.textDim, border: 'rgba(232,255,240,0.35)', borderHover: 'rgba(232,255,240,0.7)', glow: 'rgba(232,255,240,0.25)' },
    rare: { labelKey: 'shop.rarity.rare', text: INK.scope, border: 'rgba(127,232,255,0.45)', borderHover: INK.scope, glow: INK.scopeDim },
    legendary: { labelKey: 'shop.rarity.legendary', text: INK.gold, border: 'rgba(255,210,63,0.5)', borderHover: INK.gold, glow: 'rgba(255,210,63,0.6)' }
};

// Weighted draw of `count` distinct entries from `pool` (no replacement) —
// replaces the old uniform Fisher-Yates shuffle so rarer upgrades really do
// show up less often.
function drawWeightedUpgrades(pool, count) {
    const remaining = [...pool];
    const picked = [];
    while (remaining.length && picked.length < count) {
        const totalWeight = remaining.reduce((sum, u) => sum + RARITY_WEIGHTS[u.rarity], 0);
        let r = Math.random() * totalWeight;
        let chosenIdx = remaining.length - 1;
        for (let i = 0; i < remaining.length; i++) {
            r -= RARITY_WEIGHTS[remaining[i].rarity];
            if (r <= 0) { chosenIdx = i; break; }
        }
        picked.push(remaining[chosenIdx]);
        remaining.splice(chosenIdx, 1);
    }
    return picked;
}

export function displayShopModal(ship, upgrades, onUpgrade) {
    if (document.getElementById('shop-modal')) return;
    if (typeof window !== 'undefined' && window.isPausedRef) window.isPausedRef.value = true;

    const { modal, panel } = consolePanelModal({ id: 'shop-modal', zIndex: 3000, accent: INK.phosphor });
    panel.style.width = 'min(92vw, 460px)';
    panel.appendChild(panelTitleBar(t('shop.title'), INK.phosphor));

    const upgradePool = [
        { key: 'magnet', label: t('shop.upgrades.magnet.label'), desc: t('shop.upgrades.magnet.desc'), rarity: 'common' },
        { key: 'laser', label: t('shop.upgrades.laser.label'), desc: t('shop.upgrades.laser.desc'), rarity: 'common' },
        { key: 'speed', label: t('shop.upgrades.speed.label'), desc: t('shop.upgrades.speed.desc'), rarity: 'common' },
        { key: 'boltVelocity', label: t('shop.upgrades.boltVelocity.label'), desc: t('shop.upgrades.boltVelocity.desc'), rarity: 'rare', maxLevel: BOLT_VELOCITY.SHOP_MAX_LEVEL },
        { key: 'armor', label: t('shop.upgrades.armor.label'), desc: t('shop.upgrades.armor.desc'), rarity: 'common' },
        { key: 'chainLightning', label: t('shop.upgrades.chainLightning.label'), desc: t('shop.upgrades.chainLightning.desc'), rarity: 'common', maxLevel: 5 },
        { key: 'repairModule', label: t('shop.upgrades.repairModule.label'), desc: t('shop.upgrades.repairModule.desc'), rarity: 'rare', maxLevel: 5 },
        { key: 'overdriveCore', label: t('shop.upgrades.overdriveCore.label'), desc: t('shop.upgrades.overdriveCore.desc'), rarity: 'rare', maxLevel: OVERDRIVE_CORE.MAX_LEVEL },
        { key: 'deflectorShield', label: t('shop.upgrades.deflectorShield.label'), desc: t('shop.upgrades.deflectorShield.desc'), rarity: 'legendary', maxLevel: 4 },
        { key: 'xpBoost', label: t('shop.upgrades.xpBoost.label'), desc: t('shop.upgrades.xpBoost.desc'), rarity: 'rare', maxLevel: XP_BOOST.MAX_LEVEL }
    ];
    // Capped upgrades drop out of the pool once their level ceiling is reached —
    // picking them again would do nothing further. Repair Module also stays out
    // until at least one Armor Plating has been bought — with only the base 1 HP,
    // there's nothing meaningful for it to regenerate.
    let availablePool = upgradePool.filter(u => {
        if (u.maxLevel && (upgrades[u.key] || 0) >= u.maxLevel) return false;
        if (u.key === 'repairModule' && (upgrades.armor || 0) <= 0) return false;
        // Bolt Velocity only enters the shop once its permanent tech node is bought.
        if (u.key === 'boltVelocity' && !techUpgrades.boltVelocity) return false;
        return true;
    });
    // Reduce the frequency of Hull Integrity (armor) drops if the player has
    // high health and Nanite Repair, preserving late-game risk.
    availablePool = availablePool.map(u => {
        if (u.key === 'armor' && (upgrades.armor || 0) >= 10 && (upgrades.repairModule || 0) > 0) {
            return { ...u, rarity: 'legendary' };
        }
        return u;
    });

    const upgradesData = drawWeightedUpgrades(availablePool, 3);
    const recommendedKey = getRecommendedUpgradeKey(ship, upgrades);

    upgradesData.forEach(upg => {
        const rarity = RARITY_STYLE[upg.rarity];
        const preview = getUpgradeStatPreview(upg.key, ship, upgrades);
        const isRecommended = upg.key === recommendedKey;

        const row = document.createElement('button');
        row.style.width = '100%';
        row.style.boxSizing = 'border-box';
        row.style.textAlign = 'left';
        row.style.margin = `0 0 ${scale(10)} 0`;
        row.style.padding = `${scale(14)} ${scale(18)}`;
        row.style.cursor = 'pointer';
        row.style.clipPath = chamferClip(scaleNum(8));
        row.style.background = INK.panel;
        row.style.border = `1px solid ${rarity.border}`;
        row.style.color = INK.text;
        row.style.fontFamily = FONT;
        row.style.transition = 'background 0.08s, border-color 0.08s, box-shadow 0.08s';

        let badgesHtml = `<span style="font-size:${scale(9)};letter-spacing:0.1em;text-transform:uppercase;color:${rarity.text}">${t(rarity.labelKey)}</span>`;
        if (isRecommended) {
            badgesHtml += `<span style="font-size:${scale(9)};letter-spacing:0.1em;text-transform:uppercase;color:${INK.phosphor};margin-left:${scale(8)}">&#9679; ${t('shop.recommended')}</span>`;
        }
        const maxBadge = preview && preview.capped
            ? ` <span style="color:${INK.textDim};letter-spacing:0.05em">(${t('shop.max')})</span>`
            : '';
        const previewHtml = preview
            ? `<div style="font-size:${scale(11)};color:${INK.scope};margin-top:${scale(6)};font-variant-numeric:tabular-nums">${preview.label}: ${preview.from}${preview.unit || ''} &rarr; ${preview.to}${preview.unit || ''}${maxBadge}</div>`
            : '';

        row.innerHTML = `
            <div style="display:flex;align-items:baseline;justify-content:space-between;gap:${scale(8)}">
                <span style="font-weight:600;font-size:${scale(14)};letter-spacing:0.03em;text-transform:uppercase;color:${INK.text}">${upg.label}</span>
                <span style="flex-shrink:0;white-space:nowrap">${badgesHtml}</span>
            </div>
            <div style="font-size:${scale(12)};color:${INK.textDim};margin-top:${scale(4)}">${upg.desc}</div>
            ${previewHtml}
        `;
        row.onmouseenter = () => { row.style.background = INK.panelRaised; row.style.borderColor = rarity.borderHover; row.style.boxShadow = `0 0 ${scaleNum(12)}px ${scaleNum(1)}px ${rarity.glow}`; };
        row.onmouseleave = () => { row.style.background = INK.panel; row.style.borderColor = rarity.border; row.style.boxShadow = 'none'; };
        mirrorHoverOnFocus(row);
        row.addEventListener('mouseenter', () => AudioManager.play('UI_HOVER'));
        row.onclick = () => {
            AudioManager.play('UI_UPGRADE');
            document.body.removeChild(modal);
            if (typeof window !== 'undefined' && window.isPausedRef) window.isPausedRef.value = false;
            onUpgrade(upg.key);
        };
        panel.appendChild(row);
    });

    document.body.appendChild(modal);
    enableArrowKeyNav(panel);
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
    btn.setAttribute('aria-label', t('ariaLabel.pause'));
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
    btn.addEventListener('mouseenter', () => AudioManager.play('UI_HOVER'));
    btn.onclick = () => { AudioManager.play('UI_CLICK'); onPause(); };
    document.body.appendChild(btn);
}

export function removePauseButton() {
    const btn = document.getElementById('pause-btn');
    if (btn) btn.remove();
}

// ---------------------------------------------------------------------------
// Confirm Modal
// ---------------------------------------------------------------------------
export function showConfirmModal({ title, text, confirmText, cancelText, onConfirm, onCancel }) {
    if (document.getElementById('confirm-modal')) return;
    if (typeof window !== 'undefined' && window.isPausedRef) window.isPausedRef.value = true;

    const { modal, panel } = consolePanelModal({ id: 'confirm-modal', zIndex: 6000, accent: INK.danger });
    panel.style.width = 'min(92vw, 360px)';
    
    panel.appendChild(panelTitleBar(title, INK.danger));
    
    const msg = document.createElement('div');
    msg.innerText = text;
    msg.style.fontFamily = FONT;
    msg.style.fontSize = scale(13);
    msg.style.color = INK.text;
    msg.style.marginBottom = scale(24);
    msg.style.lineHeight = '1.4';
    panel.appendChild(msg);

    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.gap = scale(12);

    const cancelBtn = consoleButton({ text: cancelText || t('common.cancel'), color: INK.phosphor, glowColor: INK.phosphorDim, filled: true, fontSize: 14 });
    cancelBtn.onclick = () => {
        modal.remove();
        if (typeof window !== 'undefined' && window.isPausedRef && !document.getElementById('settings-menu') && !document.getElementById('pause-menu')) {
            window.isPausedRef.value = false;
        }
        if (onCancel) onCancel();
    };

    const confirmBtn = consoleButton({ text: confirmText || t('common.confirm'), color: INK.danger, glowColor: 'rgba(255,59,48,0.5)', fontSize: 14 });
    confirmBtn.onclick = () => {
        modal.remove();
        if (onConfirm) onConfirm();
    };

    row.appendChild(cancelBtn);
    row.appendChild(confirmBtn);
    panel.appendChild(row);

    document.body.appendChild(modal);
    enableArrowKeyNav(panel);
}

// ---------------------------------------------------------------------------
// Settings button + menu — difficulty switch and (on mobile) a toggle for the
// on-screen joystick/fire-button graphics. Sits right of the Pause button.
// ---------------------------------------------------------------------------
export function displaySettingsButton(onClick) {
    if (document.getElementById('settings-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'settings-btn';
    btn.innerHTML = `<svg width="${scaleNum(16)}" height="${scaleNum(16)}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" stroke="${INK.phosphor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="12" cy="12" r="3" stroke="${INK.phosphor}" stroke-width="2"/>
    </svg>`;
    btn.setAttribute('aria-label', t('ariaLabel.settings'));
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
    btn.addEventListener('mouseenter', () => AudioManager.play('UI_HOVER'));
    btn.onclick = () => { AudioManager.play('UI_CLICK'); onClick(); };
    document.body.appendChild(btn);
}

export function showChangelogModal() {
    if (document.getElementById('changelog-modal')) return;

    const { modal, panel } = consolePanelModal({ id: 'changelog-modal', zIndex: 4700, accent: INK.scope });
    panel.style.width = _isMobile ? '92vw' : 'min(92vw, 520px)';
    panel.style.maxHeight = _isMobile ? '70vh' : '86vh';
    panel.style.overflowY = 'auto';
    panel.style.touchAction = 'pan-y';
    panel.style.webkitOverflowScrolling = 'touch';

    const closeChangelog = () => modal.remove();
    panel.appendChild(panelTitleBar(t('changelog.title'), INK.scope, closeChangelog));

    const intro = document.createElement('div');
    intro.innerText = t('changelog.intro', { version: packageInfo.version });
    intro.style.width = '100%';
    intro.style.fontFamily = FONT;
    intro.style.fontSize = scale(11);
    intro.style.letterSpacing = '0.08em';
    intro.style.textTransform = 'uppercase';
    intro.style.color = INK.textDim;
    intro.style.marginBottom = scale(18);
    panel.appendChild(intro);

    const history = document.createElement('div');
    history.style.width = '100%';
    history.style.display = 'flex';
    history.style.flexDirection = 'column';
    history.style.gap = scale(14);

    CHANGELOG_ENTRIES.forEach((entry, index) => {
        const release = document.createElement('section');
        release.style.width = '100%';
        release.style.paddingBottom = scale(12);
        release.style.borderBottom = index === CHANGELOG_ENTRIES.length - 1
            ? 'none'
            : `1px solid ${INK.hairlineDim}`;

        const heading = document.createElement('div');
        heading.style.display = 'flex';
        heading.style.alignItems = 'baseline';
        heading.style.justifyContent = 'space-between';
        heading.style.gap = scale(12);
        heading.style.marginBottom = scale(6);

        const version = document.createElement('span');
        version.innerText = `v${entry.version}`;
        version.style.fontFamily = FONT;
        version.style.fontSize = scale(14);
        version.style.fontWeight = '600';
        version.style.letterSpacing = '0.05em';
        version.style.color = entry.version === packageInfo.version ? INK.phosphor : INK.scope;

        const date = document.createElement('span');
        date.innerText = entry.date;
        date.style.fontFamily = FONT;
        date.style.fontSize = scale(10);
        date.style.color = INK.textDim;

        heading.appendChild(version);
        heading.appendChild(date);
        release.appendChild(heading);

        entry.changes.forEach((change) => {
            const item = document.createElement('div');
            item.innerText = `— ${change}`;
            item.style.fontFamily = FONT;
            item.style.fontSize = scale(12);
            item.style.lineHeight = '1.45';
            item.style.color = INK.text;
            item.style.marginTop = scale(4);
            release.appendChild(item);
        });

        history.appendChild(release);
    });
    panel.appendChild(history);

    const closeBtn = consoleButton({ text: t('common.close'), color: INK.scope, glowColor: INK.scopeDim, fontSize: 13 });
    closeBtn.style.marginTop = scale(14);
    closeBtn.style.padding = `${scale(8)} ${scale(20)}`;
    closeBtn.onclick = closeChangelog;
    panel.appendChild(closeBtn);

    document.body.appendChild(modal);
    enableArrowKeyNav(panel);
}

export function showSettingsMenu({ easyMode, controlsVisible, mobileAdvancedControls, mobileControlScheme = 'one-handed', isMobile, onDifficultyChange, onToggleControls, onToggleAdvancedControls, onChangeControlScheme }) {
    if (document.getElementById('settings-menu')) return;
    if (typeof window !== 'undefined' && window.isPausedRef) window.isPausedRef.value = true;

    const { modal, panel } = consolePanelModal({ id: 'settings-menu', zIndex: 4500, accent: INK.phosphor });
    panel.style.width = 'min(92vw, 420px)';
    panel.style.maxHeight = _isMobile ? '70vh' : '86vh';
    panel.style.overflowY = 'auto';
    panel.style.touchAction = 'pan-y';
    panel.style.webkitOverflowScrolling = 'touch';
    const closeSettings = () => {
        modal.remove();
        if (typeof window !== 'undefined' && window.isPausedRef) window.isPausedRef.value = false;
        if (typeof window.resumeGame === 'function') window.resumeGame();
    };
    panel.appendChild(panelTitleBar(t('settings.title'), INK.phosphor, closeSettings));

    const rerender = (nextEasyMode, nextControlsVisible, nextAdvancedControls = mobileAdvancedControls, nextControlScheme = mobileControlScheme) => {
        modal.remove();
        showSettingsMenu({ easyMode: nextEasyMode, controlsVisible: nextControlsVisible, mobileAdvancedControls: nextAdvancedControls, mobileControlScheme: nextControlScheme, isMobile, onDifficultyChange, onToggleControls, onToggleAdvancedControls, onChangeControlScheme });
    };

    // Language — switching reloads the page (a few HUD elements cache their
    // captions); the current flight is autosaved and restored on reload.
    panel.appendChild(label(t('settings.language'), INK.textDim));
    const langRow = document.createElement('div');
    langRow.style.display = 'flex';
    langRow.style.gap = scale(10);
    langRow.style.margin = `${scale(8)} 0 ${scale(20)} 0`;
    langRow.style.width = '100%';
    [{ key: 'en', text: t('settings.languageEnglish') }, { key: 'de', text: t('settings.languageGerman') }].forEach(opt => {
        const active = getLanguage() === opt.key;
        const btn = consoleButton({ text: opt.text, color: INK.phosphor, glowColor: INK.phosphorDim, filled: active, fontSize: 13 });
        btn.style.flex = '1';
        btn.style.padding = `${scale(10)} ${scale(12)}`;
        btn.onclick = () => {
            if (active) return;
            setLanguage(opt.key);
            // Persist the in-progress flight so the reload restores it.
            if (typeof window !== 'undefined' && typeof window.saveRunState === 'function') window.saveRunState();
            document.location.reload();
        };
        langRow.appendChild(btn);
    });
    panel.appendChild(langRow);

    panel.appendChild(label(t('settings.difficulty'), INK.textDim));
    const diffRow = document.createElement('div');
    diffRow.style.display = 'flex';
    diffRow.style.gap = scale(10);
    diffRow.style.margin = `${scale(8)} 0 ${scale(10)} 0`;
    diffRow.style.width = '100%';
    [{ key: 'easy', text: t('settings.difficultyEasy') }, { key: 'normal', text: t('settings.difficultyNormal') }].forEach(opt => {
        const active = (opt.key === 'easy') === !!easyMode;
        const btn = consoleButton({ text: opt.text, color: INK.phosphor, glowColor: INK.phosphorDim, filled: active, fontSize: 13 });
        btn.style.flex = '1';
        btn.style.padding = `${scale(10)} ${scale(12)}`;
        btn.onclick = () => {
            if (active) return;
            showConfirmModal({
                title: t('settings.changeDifficultyTitle'),
                text: t('settings.changeDifficultyText'),
                confirmText: t('settings.changeDifficultyConfirm'),
                onConfirm: () => {
                    onDifficultyChange(opt.key);
                    if (typeof window !== 'undefined' && window.saveRunState) {
                        suppressAutosave();
                        clearRunState();
                        document.location.reload();
                    }
                }
            });
        };
        diffRow.appendChild(btn);
    });
    panel.appendChild(diffRow);

    const diffNote = document.createElement('div');
    diffNote.innerText = t('settings.difficultyNote');
    diffNote.style.fontFamily = FONT;
    diffNote.style.fontSize = scale(11);
    diffNote.style.color = INK.textDim;
    diffNote.style.margin = `0 0 ${scale(20)} 0`;
    panel.appendChild(diffNote);

    panel.appendChild(label(t('settings.soundFx'), INK.textDim));
    const sfxEnabled = AudioManager.isSfxEnabled();
    const sfxBtn = consoleButton({ text: sfxEnabled ? t('common.on') : t('common.off'), color: INK.phosphor, glowColor: INK.phosphorDim, filled: sfxEnabled, fontSize: 13 });
    sfxBtn.style.width = '100%';
    sfxBtn.style.margin = `${scale(8)} 0 ${scale(20)} 0`;
    sfxBtn.onclick = () => {
        AudioManager.setSfxEnabled(!sfxEnabled);
        rerender(easyMode, controlsVisible);
    };
    panel.appendChild(sfxBtn);

    panel.appendChild(label(t('settings.screenShake'), INK.textDim));
    const shakeEnabled = isScreenShakeEnabled();
    const shakeBtn = consoleButton({ text: shakeEnabled ? t('common.on') : t('common.off'), color: INK.phosphor, glowColor: INK.phosphorDim, filled: shakeEnabled, fontSize: 13 });
    shakeBtn.style.width = '100%';
    shakeBtn.style.margin = `${scale(8)} 0 ${scale(20)} 0`;
    shakeBtn.onclick = () => {
        setScreenShakeEnabled(!shakeEnabled);
        rerender(easyMode, controlsVisible);
    };
    panel.appendChild(shakeBtn);

    if (isMobile) {
        panel.appendChild(label(t('settings.touchControls'), INK.textDim));
        const toggleBtn = consoleButton({ text: controlsVisible ? t('settings.touchControlsVisible') : t('settings.touchControlsHidden'), color: INK.scope, glowColor: INK.scopeDim, filled: controlsVisible, fontSize: 13 });
        toggleBtn.style.width = '100%';
        toggleBtn.style.margin = `${scale(8)} 0 ${scale(10)} 0`;
        toggleBtn.onclick = () => {
            const next = !controlsVisible;
            onToggleControls(next);
            rerender(easyMode, next);
        };
        panel.appendChild(toggleBtn);

        const ctrlNote = document.createElement('div');
        ctrlNote.innerText = t('settings.touchControlsNote');
        ctrlNote.style.fontFamily = FONT;
        ctrlNote.style.fontSize = scale(11);
        ctrlNote.style.color = INK.textDim;
        ctrlNote.style.margin = `0 0 ${scale(20)} 0`;
        panel.appendChild(ctrlNote);

        panel.appendChild(label(t('settings.controlScheme'), INK.textDim));
        const schemeRow = document.createElement('div');
        schemeRow.style.display = 'flex';
        schemeRow.style.gap = scale(10);
        schemeRow.style.margin = `${scale(8)} 0 ${scale(10)} 0`;
        [{ key: 'twin-stick', text: t('settings.schemeTwinStick') }, { key: 'one-handed', text: t('settings.schemeOneHanded') }].forEach((option) => {
            const schemeBtn = consoleButton({ text: option.text, color: INK.scope, glowColor: INK.scopeDim, filled: mobileControlScheme === option.key, fontSize: 12 });
            schemeBtn.style.flex = '1';
            schemeBtn.onclick = () => {
                if (mobileControlScheme === option.key) return;
                if (onChangeControlScheme) onChangeControlScheme(option.key);
                rerender(easyMode, controlsVisible, mobileAdvancedControls, option.key);
            };
            schemeRow.appendChild(schemeBtn);
        });
        panel.appendChild(schemeRow);

        const schemeNote = document.createElement('div');
        schemeNote.innerText = mobileControlScheme === 'one-handed'
            ? t('settings.schemeNoteOneHanded')
            : t('settings.schemeNoteTwinStick');
        schemeNote.style.fontFamily = FONT;
        schemeNote.style.fontSize = scale(11);
        schemeNote.style.color = INK.textDim;
        schemeNote.style.margin = `0 0 ${scale(20)} 0`;
        panel.appendChild(schemeNote);

        if (mobileControlScheme === 'twin-stick') {
            panel.appendChild(label(t('settings.maneuvering'), INK.textDim));
            const advancedBtn = consoleButton({ text: mobileAdvancedControls ? t('settings.maneuverAdvanced') : t('settings.maneuverSimple'), color: INK.scope, glowColor: INK.scopeDim, filled: mobileAdvancedControls, fontSize: 13 });
            advancedBtn.style.width = '100%';
            advancedBtn.style.margin = `${scale(8)} 0 ${scale(10)} 0`;
            advancedBtn.onclick = () => {
                const next = !mobileAdvancedControls;
                if (onToggleAdvancedControls) onToggleAdvancedControls(next);
                rerender(easyMode, controlsVisible, next, mobileControlScheme);
            };
            panel.appendChild(advancedBtn);

            const maneuverNote = document.createElement('div');
            maneuverNote.innerText = mobileAdvancedControls
                ? t('settings.maneuverNoteAdvanced')
                : t('settings.maneuverNoteSimple');
            maneuverNote.style.fontFamily = FONT;
            maneuverNote.style.fontSize = scale(11);
            maneuverNote.style.color = INK.textDim;
            maneuverNote.style.margin = `0 0 ${scale(20)} 0`;
            panel.appendChild(maneuverNote);
        }

    }

    if (!isMobile) {
        panel.appendChild(label(t('settings.desktopShortcuts'), INK.textDim));
        const shortcuts = document.createElement('div');
        let shortcutText = `P / 1  ${t('settings.shortcutPause')}\nO / 2  ${t('settings.shortcutSettings')}\nT / 3  ${t('settings.shortcutTechTree')}`;
        if (isTechTreeComplete()) {
            shortcutText += `\nF / 4  ${t('settings.shortcutProtocols')}`;
        }
        shortcuts.innerText = shortcutText;
        shortcuts.style.whiteSpace = 'pre-line';
        shortcuts.style.fontFamily = FONT;
        shortcuts.style.fontSize = scale(12);
        shortcuts.style.lineHeight = '1.6';
        shortcuts.style.color = INK.text;
        shortcuts.style.margin = `${scale(8)} 0 ${scale(20)} 0`;
        panel.appendChild(shortcuts);
    }

    panel.appendChild(label(t('settings.releaseNotes'), INK.textDim));
    const changelogBtn = consoleButton({ text: t('settings.openChangelog'), color: INK.scope, glowColor: INK.scopeDim, fontSize: 13 });
    changelogBtn.style.width = '100%';
    changelogBtn.style.margin = `${scale(8)} 0 ${scale(20)} 0`;
    changelogBtn.onclick = showChangelogModal;
    panel.appendChild(changelogBtn);

    panel.appendChild(label(t('settings.factoryReset'), INK.danger));
    const resetBtn = consoleButton({ text: t('settings.resetGame'), color: INK.danger, glowColor: 'rgba(255,59,48,0.5)', fontSize: 13 });
    resetBtn.style.width = '100%';
    resetBtn.style.margin = `${scale(8)} 0 ${scale(20)} 0`;
    resetBtn.onclick = () => {
        showConfirmModal({
            title: t('settings.factoryReset'),
            text: t('settings.factoryResetText'),
            confirmText: t('settings.factoryResetConfirm'),
            onConfirm: () => {
                clearGameProgressStorage();
                if (typeof window !== 'undefined' && window.saveRunState) {
                    suppressAutosave();
                    clearRunState();
                    document.location.reload();
                }
            }
        });
    };
    panel.appendChild(resetBtn);

    const closeBtn = consoleButton({ text: t('common.close'), color: INK.phosphor, glowColor: INK.phosphorDim, filled: true, fontSize: 14 });
    closeBtn.onclick = closeSettings;
    panel.appendChild(closeBtn);

    document.body.appendChild(modal);
    enableArrowKeyNav(panel);
}

export function displayPauseMenu(stats, onResume, onRestart) {
    if (document.getElementById('pause-menu')) return;
    if (typeof window !== 'undefined' && window.isPausedRef) window.isPausedRef.value = true;

    const { modal, panel } = consolePanelModal({ id: 'pause-menu', zIndex: 4000, accent: INK.phosphor });
    panel.style.width = 'min(92vw, 420px)';
    panel.style.maxHeight = _isMobile ? '70vh' : '86vh';
    panel.style.overflowY = 'auto';
    panel.style.touchAction = 'pan-y';
    panel.style.webkitOverflowScrolling = 'touch';
    const closePauseMenu = () => {
        menuCleanup();
        if (typeof window !== 'undefined' && window.isPausedRef) window.isPausedRef.value = false;
        onResume();
    };
    panel.appendChild(panelTitleBar(t('pause.title'), INK.phosphor, closePauseMenu));

    const formatXp = (value) => Number.isFinite(Number(value))
        ? Number(value).toFixed(2)
        : value;
    const currentXp = formatXp(stats.experience);
    const totalXpCollected = formatXp(stats.xpCollected);
    const rows = [
        [t('pause.stats.level'), stats.level],
        [t('pause.stats.currentXp'), `${currentXp} / ${stats.maxXP}`],
        [t('pause.stats.kills'), stats.kills],
        [t('pause.stats.xpCollected'), totalXpCollected],
        [t('pause.stats.hull'), stats.hull],
        [t('pause.stats.laserDamage'), Number.isFinite(Number(stats.laserDamage)) ? Number(stats.laserDamage).toFixed(2) : stats.laserDamage],
        [t('pause.stats.fireInterval'), `${Math.round(stats.fireIntervalMs)} ms`],
        ...(Number.isFinite(Number(stats.boltSpeed)) ? [[t('pause.stats.boltSpeed'), Number(stats.boltSpeed).toFixed(1)]] : []),
        [t('pause.stats.missiles'), stats.missiles],
        [t('pause.stats.drones'), stats.drones],
        ...(Number.isFinite(Number(stats.flightData)) ? [[t('pause.stats.flightData'), stats.flightData]] : []),
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

    const resumeBtn = consoleButton({ text: t('common.resume'), color: INK.phosphor, glowColor: INK.phosphorDim, filled: true, fontSize: 14 });
    resumeBtn.onclick = () => {
        menuCleanup();
        if (typeof window !== 'undefined' && window.isPausedRef) window.isPausedRef.value = false;
        onResume();
    };

    const restartBtn = consoleButton({ text: t('common.restart'), color: INK.danger, glowColor: 'rgba(255,59,48,0.5)', fontSize: 14 });
    restartBtn.onclick = () => {
        suppressAutosave();
        clearRunState();
        document.location.reload();
    };

    row.appendChild(resumeBtn);
    row.appendChild(restartBtn);
    panel.appendChild(row);

    function menuCleanup() { modal.remove(); }

    document.body.appendChild(modal);
    enableArrowKeyNav(panel);
}

export function removePauseMenu() {
    const menu = document.getElementById('pause-menu');
    if (menu) menu.remove();
}

// ---------------------------------------------------------------------------
// Tech tree
// ---------------------------------------------------------------------------
// Small icon button, same footprint/material as Pause + Settings, sitting
// immediately left of the Plasma dial — mirrors the Level dial's Pause/Settings
// pair on the opposite side, instead of a full-width labeled button stacked
// below the dial.
export function showTechTreeButton(onClick) {
    let btn = document.getElementById('tech-tree-btn');
    if (!btn) {
        btn = document.createElement('button');
        btn.id = 'tech-tree-btn';
        btn.innerHTML = `<svg width="${scaleNum(16)}" height="${scaleNum(16)}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="5" r="2.5" stroke="${INK.scope}" stroke-width="2"/>
            <circle cx="5" cy="19" r="2.5" stroke="${INK.scope}" stroke-width="2"/>
            <circle cx="19" cy="19" r="2.5" stroke="${INK.scope}" stroke-width="2"/>
            <path d="M12 7.5V12M12 12L5 16.5M12 12L19 16.5" stroke="${INK.scope}" stroke-width="2" stroke-linecap="round"/>
        </svg>`;
        btn.setAttribute('aria-label', t('ariaLabel.techTree'));
        btn.style.position = 'fixed';
        btn.style.top = scale(HUD_TOP_ROW1);
        btn.style.right = isTechTreeComplete() ? scale(200) : scale(84); // clears the Plasma dial (and Data dial if active)
        btn.style.zIndex = '1200';
        btn.style.display = 'flex';
        btn.style.alignItems = 'center';
        btn.style.justifyContent = 'center';
        btn.style.width = scale(32);
        btn.style.height = scale(32);
        btn.style.cursor = 'pointer';
        btn.style.transition = 'box-shadow 0.15s, background 0.15s';
        panelBase(btn, { chamfer: 6 });
        btn.style.boxShadow = `0 0 ${scaleNum(6)}px 0 ${INK.scopeDim}`;
        btn.onmouseenter = () => { btn.style.boxShadow = `0 0 ${scaleNum(14)}px ${scaleNum(2)}px ${INK.scope}`; };
        btn.onmouseleave = () => { btn.style.boxShadow = `0 0 ${scaleNum(6)}px 0 ${INK.scopeDim}`; };
        btn.addEventListener('mouseenter', () => AudioManager.play('UI_HOVER'));
        btn.onclick = () => { AudioManager.play('UI_CLICK'); onClick(); };
        document.body.appendChild(btn);
    }
    btn.style.display = 'flex';
}

export function showProtocolsButton(onClick) {
    if (!isTechTreeComplete()) return;
    let btn = document.getElementById('protocols-btn');
    if (!btn) {
        btn = document.createElement('button');
        btn.id = 'protocols-btn';
        btn.innerHTML = `<svg width="${scaleNum(16)}" height="${scaleNum(16)}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="4" y="6" width="16" height="12" rx="2" stroke="${INK.gold}" stroke-width="2"/>
            <path d="M8 10h8 M8 14h8" stroke="${INK.gold}" stroke-width="2" stroke-linecap="round"/>
        </svg>`;
        btn.setAttribute('aria-label', t('ariaLabel.flightProtocols'));
        btn.style.position = 'fixed';
        btn.style.top = scale(HUD_TOP_ROW1);
        btn.style.right = scale(158);
        btn.style.zIndex = '1200';
        btn.style.display = 'flex';
        btn.style.alignItems = 'center';
        btn.style.justifyContent = 'center';
        btn.style.width = scale(32);
        btn.style.height = scale(32);
        btn.style.cursor = 'pointer';
        btn.style.transition = 'box-shadow 0.15s, background 0.15s';
        panelBase(btn, { color: 'rgba(255,210,63,0.15)', chamfer: 6 });
        btn.style.boxShadow = `0 0 ${scaleNum(6)}px 0 rgba(255,210,63,0.25)`;
        btn.onmouseenter = () => { btn.style.boxShadow = `0 0 ${scaleNum(14)}px ${scaleNum(2)}px ${INK.gold}`; };
        btn.onmouseleave = () => { btn.style.boxShadow = `0 0 ${scaleNum(6)}px 0 rgba(255,210,63,0.25)`; };
        btn.addEventListener('mouseenter', () => AudioManager.play('UI_HOVER'));
        btn.onclick = () => { AudioManager.play('UI_CLICK'); onClick(); };
        document.body.appendChild(btn);
    }
    btn.style.display = 'flex';
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
            #tech-tree-modal .tt-grid { grid-template-columns: 1fr !important; row-gap: ${scale(6)} !important; }
            #tech-tree-modal .tt-grid > * { grid-column: 1 !important; grid-row: auto !important; }
            #tech-tree-modal .tt-connector { display: none !important; }
            #tech-tree-modal .tt-child-label::before { content: "\\21B3  "; opacity: 0.6; }
            #tech-tree-modal .tt-panel { max-height: 80vh !important; padding: ${scale(16)} ${scale(14)} !important; }
            #tech-tree-modal .tt-node-header { padding: ${scale(7)} ${scale(10)} !important; }
        }
    `;
    document.head.appendChild(style);
}

// Opens a small detail modal for one tech node — description, status, and
// (if purchasable) a Confirm button — stacked over the Tech Tree modal
// itself. Replaces the old inline-expand-in-card interaction: a tap now
// always opens the same focused, full-detail view instead of unfolding
// content in place, which reads better once cards sit four to a row.
// Plasma cost label with singular/plural handling ("1 Plasma Cell" /
// "3 Plasma Cells"). English is the only language that needs the plural split
// here, but the keys exist in every dictionary.
function techCostLabel(cost) {
    return t(cost === 1 ? 'techTree.costPlasmaCellOne' : 'techTree.costPlasmaCellOther', { count: cost });
}

function techStatusLine(unlocked, locked, requiresLabel, costLabel, levelLocked, requiredLevel) {
    if (unlocked) return t('techTree.statusUnlocked');
    if (locked) return t('techTree.statusRequires', { name: requiresLabel });
    if (levelLocked) return t('techTree.statusRequiresLevel', { level: requiredLevel });
    return t('techTree.statusCost', { cost: costLabel });
}

function showTechNodeDetail(upg, unlocked, locked, levelLocked, purchasable, costLabel, onUpgrade) {
    const existing = document.getElementById('tech-node-detail-modal');
    if (existing) existing.remove();

    const accent = unlocked ? INK.phosphor : INK.scope;
    const { modal, panel } = consolePanelModal({ id: 'tech-node-detail-modal', zIndex: 5050, accent });
    panel.style.width = 'min(88vw, 380px)';
    panel.style.alignItems = 'stretch';
    panel.appendChild(panelTitleBar(upg.label, accent));

    const desc = document.createElement('div');
    desc.innerText = upg.desc;
    desc.style.fontFamily = FONT;
    desc.style.fontSize = scale(13);
    desc.style.color = INK.text;
    desc.style.marginBottom = scale(14);
    panel.appendChild(desc);

    const statusLine = document.createElement('div');
    statusLine.innerText = techStatusLine(unlocked, locked, upg.requiresLabel, costLabel, levelLocked, upg.minLevel);
    statusLine.style.fontFamily = FONT;
    statusLine.style.fontSize = scale(11);
    statusLine.style.letterSpacing = '0.05em';
    statusLine.style.textTransform = 'uppercase';
    statusLine.style.color = INK.textDim;
    statusLine.style.marginBottom = scale(18);
    panel.appendChild(statusLine);

    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.gap = scale(10);
    row.style.width = '100%';
    // Two buttons don't both fit on one line in this narrow panel once the
    // labels are German ("Bestätigen — N" / "Nicht genug Plasma" + "Abbrechen"),
    // so stack them on mobile.
    if (purchasable && _isMobile) row.style.flexDirection = 'column';

    if (purchasable) {
        const canAfford = typeof window !== 'undefined' && window.getPlasmaCount ? window.getPlasmaCount() >= upg.cost : true;
        const confirmBtn = consoleButton({ text: t('techTree.confirmCost', { cost: costLabel }), color: INK.scope, glowColor: INK.scopeDim, filled: true, fontSize: 13, sound: canAfford ? 'UI_UPGRADE' : 'UI_ERROR' });
        confirmBtn.style.flex = _isMobile ? '1 1 auto' : '1';
        confirmBtn.style.minWidth = '0';
        confirmBtn.style.textAlign = 'center';
        if (!canAfford) {
            // Kein natives `disabled` — der Klick soll weiterhin feuern (siehe
            // consoleButton's Klick-Listener oben), damit der UI_ERROR-Sound
            // als Feedback hörbar ist, statt komplett ins Leere zu laufen.
            confirmBtn.setAttribute('aria-disabled', 'true');
            confirmBtn.style.opacity = '0.5';
            confirmBtn.style.cursor = 'not-allowed';
            confirmBtn.innerHTML = t('techTree.notEnoughPlasma');
        } else {
            confirmBtn.onclick = () => {
                modal.remove();
                onUpgrade(upg.key, upg.cost);
            };
        }
        row.appendChild(confirmBtn);
    }

    const closeBtn = consoleButton({ text: purchasable ? t('common.cancel') : t('common.close'), color: INK.scope, glowColor: INK.scopeDim, fontSize: 13 });
    // On mobile the two buttons stack (see row.flexDirection below), so each
    // one spans the panel; on desktop keep the "confirm grows / cancel hugs" split.
    closeBtn.style.flex = purchasable && !_isMobile ? '0 0 auto' : '1';
    closeBtn.style.minWidth = '0';
    closeBtn.onclick = () => modal.remove();
    row.appendChild(closeBtn);

    panel.appendChild(row);
    document.body.appendChild(modal);
    enableArrowKeyNav(panel);
}

export function showFlightProtocolsModal() {
    if (!isTechTreeComplete() || document.getElementById('flight-protocols-modal')) return;
    // Freeze the flight while this modal is open, the same way Pause / Settings /
    // Tech Tree do — otherwise enemies keep spawning and the (uncontrollable)
    // ship takes hits behind the scrim.
    if (typeof window !== 'undefined' && window.isPausedRef) window.isPausedRef.value = true;
    const { modal, panel } = consolePanelModal({ id: 'flight-protocols-modal', zIndex: 5100, accent: INK.gold });
    panel.style.width = _isMobile ? '92vw' : 'min(92vw, 560px)';
    panel.style.maxHeight = _isMobile ? '76vh' : '82vh';
    panel.style.overflowY = 'auto';
    panel.style.touchAction = 'pan-y';
    panel.style.webkitOverflowScrolling = 'touch';
    // A plain modal.remove() (used by the unlock/toggle refresh path below)
    // re-opens this modal immediately, so it must NOT resume; closeModal is the
    // real dismissal and hands control back to the game loop.
    const closeModal = () => {
        modal.remove();
        if (typeof window !== 'undefined' && window.isPausedRef) window.isPausedRef.value = false;
        if (typeof window.resumeGame === 'function') window.resumeGame();
    };
    panel.appendChild(panelTitleBar(t('protocols.title'), INK.gold, closeModal));

    const dataReadout = document.createElement('div');
    dataReadout.innerText = t('protocols.dataReadout', {
        data: upgrades.flightData || 0,
        active: flightProtocols.active.length,
        total: FLIGHT_PROTOCOL_SLOT_COUNT,
    });
    dataReadout.style.fontFamily = FONT;
    dataReadout.style.fontSize = scale(12);
    dataReadout.style.color = INK.gold;
    dataReadout.style.letterSpacing = '0.08em';
    dataReadout.style.marginBottom = scale(8);
    dataReadout.style.textAlign = 'center';
    panel.appendChild(dataReadout);

    const intro = document.createElement('div');
    intro.innerText = t('protocols.intro');
    intro.style.fontFamily = FONT;
    intro.style.fontSize = scale(12);
    intro.style.lineHeight = '1.5';
    intro.style.color = INK.textDim;
    intro.style.textAlign = 'center';
    intro.style.marginBottom = scale(16);
    panel.appendChild(intro);

    const currentLevel = typeof window.getCurrentLevel === 'function' ? window.getCurrentLevel() : Infinity;
    const list = document.createElement('div');
    list.style.display = 'grid';
    list.style.gap = scale(8);
    FLIGHT_PROTOCOLS.forEach((protocol) => {
        const unlocked = flightProtocols.unlocked.includes(protocol.key);
        const active = flightProtocols.active.includes(protocol.key);
        const levelLocked = currentLevel < protocol.minLevel;
        const row = document.createElement('div');
        row.style.display = 'grid';
        // Stack copy over the action button on mobile — the German labels
        // ("Freischalten · N Data", "Deaktivieren") are too wide for a
        // side-by-side column at phone width and were pushing the panel
        // off-screen. minmax(0, 1fr) lets the copy column shrink on desktop.
        row.style.gridTemplateColumns = _isMobile ? '1fr' : 'minmax(0, 1fr) auto';
        row.style.gap = scale(10);
        row.style.alignItems = 'center';
        row.style.padding = `${scale(10)} ${scale(12)}`;
        row.style.background = active ? INK.panelRaised : INK.panel;
        row.style.border = `1px solid ${active ? INK.gold : INK.hairlineDim}`;
        row.style.clipPath = chamferClip(scaleNum(6));

        // Three independent facts about a protocol:
        //   unlocked   – permanent, bought with Flight Data, survives death
        //   active     – slotted into the current loadout (max 3), also persisted
        //   levelLocked – only ever blocks *unlocking* a new protocol; a protocol
        //                 you already own stays freely togglable at any level,
        //                 so your loadout is always yours to rearrange (e.g.
        //                 right after a death restarts you at level 1).
        const slotLocked = !active && flightProtocols.active.length >= FLIGHT_PROTOCOL_SLOT_COUNT;
        const affordable = (upgrades.flightData || 0) >= protocol.cost;
        const canActivate = unlocked && !active && !slotLocked;
        const canUnlock = !unlocked && !levelLocked && affordable;
        const interactive = active || canActivate || canUnlock;

        const copy = document.createElement('div');
        copy.style.minWidth = '0'; // allow the copy column to shrink instead of overflowing the panel

        const statusTag = active ? t('protocols.activeTag') : unlocked ? t('protocols.readyTag') : '';
        const title = document.createElement('div');
        title.innerText = `${protocol.label}${statusTag ? `  ${statusTag}` : ''}`;
        title.style.fontFamily = FONT;
        title.style.fontSize = scale(13);
        title.style.fontWeight = '600';
        title.style.color = active ? INK.gold : unlocked ? INK.text : INK.textDim;

        const desc = document.createElement('div');
        desc.innerText = t(`protocols.descriptions.${protocol.key}`);
        desc.style.fontFamily = FONT;
        desc.style.fontSize = scale(11);
        desc.style.lineHeight = '1.4';
        desc.style.color = INK.textDim;
        desc.style.marginTop = scale(4);

        // Always-present status line — spells out where this protocol stands and
        // what (if anything) blocks the next action, so the row is never a
        // greyed-out button with no explanation.
        let statusText;
        if (active) statusText = t('protocols.statusActive');
        else if (unlocked && slotLocked) statusText = t('protocols.statusLoadoutFull', { active: flightProtocols.active.length, total: FLIGHT_PROTOCOL_SLOT_COUNT });
        else if (unlocked) statusText = t('protocols.statusReady');
        else if (levelLocked) statusText = t('protocols.statusLevelLocked', { level: protocol.minLevel });
        else if (!affordable) statusText = t('protocols.statusNeedsData', { cost: protocol.cost, have: upgrades.flightData || 0 });
        else statusText = t('protocols.statusUnlockable', { cost: protocol.cost });
        const status = document.createElement('div');
        status.innerText = statusText;
        status.style.fontFamily = FONT;
        status.style.fontSize = scale(10);
        status.style.letterSpacing = '0.05em';
        status.style.textTransform = 'uppercase';
        status.style.marginTop = scale(5);
        status.style.color = active ? INK.gold : interactive ? INK.phosphor : INK.caution;

        copy.append(title, desc, status);
        row.appendChild(copy);

        const actionLabel = active
            ? t('protocols.deactivate')
            : unlocked ? t('protocols.activate') : t('protocols.unlockCost', { cost: protocol.cost });
        const action = consoleButton({
            text: actionLabel,
            color: INK.gold,
            glowColor: 'rgba(255,210,63,0.55)',
            filled: active,
            fontSize: 11,
            sound: interactive ? 'UI_UPGRADE' : 'UI_ERROR'
        });
        action.style.whiteSpace = 'nowrap';
        if (_isMobile) {
            // Stacked layout: keep the button at its natural width, left-aligned
            // under the copy, with a little breathing room.
            action.style.justifySelf = 'start';
            action.style.marginTop = scale(4);
        }
        if (interactive) {
            action.onclick = () => {
                if (unlocked ? toggleProtocol(protocol.key) : handleProtocolUnlock(protocol.key)) {
                    modal.remove();
                    showFlightProtocolsModal();
                }
            };
        } else {
            action.style.opacity = '0.45';
            action.setAttribute('aria-disabled', 'true');
            action.style.cursor = 'not-allowed';
        }
        row.appendChild(action);
        list.appendChild(row);
    });
    panel.appendChild(list);
    document.body.appendChild(modal);
    enableArrowKeyNav(panel);
}

// Builds one tree node "card" — smaller/denser than the old full-width rows,
// since several now sit side by side. `locked` means a prerequisite is
// unmet (distinct from simply not being able to afford it yet). A tap opens
// a focused detail modal (see showTechNodeDetail) rather than expanding
// content inline.
function techTreeNode(upg, unlocked, locked, levelLocked, onUpgrade) {
    const purchasable = !unlocked && !locked && !levelLocked;
    const costLabel = techCostLabel(upg.cost);

    const node = document.createElement('div');
    node.style.width = '100%';
    node.style.boxSizing = 'border-box';
    node.style.clipPath = chamferClip(scaleNum(8));
    node.style.overflow = 'hidden';
    node.style.position = 'relative';
    node.style.zIndex = '1';
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
    } else if (locked || levelLocked) {
        node.style.background = INK.panel;
        node.style.border = `1px solid ${INK.hairlineDim}`;
        node.style.color = INK.textDim;
        node.style.opacity = '0.5';
        node.style.filter = 'grayscale(1)';
    } else {
        applyIdle();
        node.onmouseenter = () => { node.style.background = INK.panelRaised; node.style.borderColor = INK.scope; };
        node.onmouseleave = applyIdle;
        node.addEventListener('mouseenter', () => AudioManager.play('UI_HOVER'));
    }

    const header = document.createElement('button');
    header.className = 'tt-node-header';
    header.style.width = '100%';
    header.style.boxSizing = 'border-box';
    header.style.textAlign = 'left';
    header.style.padding = `${scale(10)} ${scale(12)}`;
    header.style.fontFamily = FONT;
    header.style.background = 'transparent';
    header.style.border = 'none';
    header.style.color = 'inherit';
    header.style.cursor = 'pointer';

    const statusLine = techStatusLine(unlocked, locked, upg.requiresLabel, costLabel, levelLocked, upg.minLevel);
    const labelClass = upg.requires ? 'tt-child-label' : '';
    header.innerHTML = `<div style="display:flex;align-items:baseline;justify-content:space-between;gap:${scale(6)}"><span class="${labelClass}" style="font-weight:600;font-size:${scale(13)};letter-spacing:0.03em;text-transform:uppercase">${upg.label}${unlocked ? t('techTree.statusOnlineSuffix') : ''}</span><span style="font-size:${scale(13)};opacity:0.55;flex-shrink:0">&#8250;</span></div><div style="font-size:${scale(10)};margin-top:${scale(6)};letter-spacing:0.05em;text-transform:uppercase;opacity:${unlocked ? '0.85' : '0.6'}">${statusLine}</div>`;

    header.onclick = () => {
        AudioManager.play('UI_CLICK');
        showTechNodeDetail(upg, unlocked, locked, levelLocked, purchasable, costLabel, onUpgrade);
    };
    // Hover styling lives on the parent `node`, not this button — mirror it
    // onto keyboard focus the same way mirrorHoverOnFocus() does elsewhere.
    mirrorHoverOnFocus(header, { playSound: !!node.onmouseenter });

    node.appendChild(header);
    return node;
}

export function showTechTreeModal(currentTechUpgrades, onUpgrade) {
    if (document.getElementById('tech-tree-modal')) return;
    if (typeof window !== 'undefined' && window.isPausedRef) window.isPausedRef.value = true;
    ensureTechTreeStyle();

    const { modal, panel } = consolePanelModal({ id: 'tech-tree-modal', zIndex: 5000, accent: INK.scope });
    panel.classList.add('tt-panel');
    panel.style.width = _isMobile ? '92vw' : 'min(94vw, 720px)';
    panel.style.maxHeight = _isMobile ? '70vh' : '86vh';
    panel.style.overflowY = 'auto';
    const closeTechTree = () => {
        modal.remove();
        if (typeof window !== 'undefined' && window.isPausedRef) window.isPausedRef.value = false;
        if (typeof window.resumeGame === 'function') window.resumeGame();
    };
    // html/body run with touch-action:none globally (keeps the touch joystick from
    // triggering page scroll/pull-to-refresh) — that also blocks finger-scrolling
    // inside this panel unless explicitly re-enabled here, which left the Close
    // button unreachable below the fold on phones with no way to scroll to it.
    panel.style.touchAction = 'pan-y';
    panel.style.webkitOverflowScrolling = 'touch';
    panel.appendChild(panelTitleBar(t('techTree.title'), INK.scope, closeTechTree));

    const plasmaLabel = document.createElement('div');
    plasmaLabel.innerText = t('techTree.availablePlasma', { count: upgrades.plasmaCount || 0 });
    plasmaLabel.style.fontFamily = FONT;
    plasmaLabel.style.color = INK.scope;
    plasmaLabel.style.fontSize = scale(14);
    plasmaLabel.style.fontWeight = '600';
    plasmaLabel.style.marginBottom = scale(18);
    plasmaLabel.style.textAlign = 'center';
    panel.appendChild(plasmaLabel);

    const currentLevel = typeof window.getCurrentLevel === 'function'
        ? window.getCurrentLevel()
        : Infinity;

    const nodes = [
        { key: 'xpResonance', label: 'XP Resonance', desc: t(`techTree.nodes.xpResonance`), cost: 5, col: 1, row: 1 },
        { key: 'autoShoot', label: 'Auto-Fire', desc: t(`techTree.nodes.autoShoot`), cost: 4, col: 2, row: 1 },
        { key: 'boltVelocity', label: 'Bolt Velocity', desc: t(`techTree.nodes.boltVelocity`), cost: 6, col: 3, row: 1 },
        { key: 'drone', label: 'Drone', desc: t(`techTree.nodes.drone`), cost: 12, col: 4, row: 1 },
        { key: 'resonanceCascade', label: 'Resonance Cascade', desc: t(`techTree.nodes.resonanceCascade`), cost: 9, col: 1, row: 3, requires: 'xpResonance', requiresLabel: 'XP Resonance' },
        { key: 'rapidFire', label: 'Rapid-Fire Core', desc: t(`techTree.nodes.rapidFire`), cost: 8, col: 2, row: 3, requires: 'autoShoot', requiresLabel: 'Auto-Fire' },
        { key: 'homingMissile', label: 'Homing Missiles', desc: t(`techTree.nodes.homingMissile`), cost: 10, col: 3, row: 3, requires: 'autoShoot', requiresLabel: 'Auto-Fire' },
        { key: 'missilePayload', label: 'Payload Amplifier I', desc: t(`techTree.nodes.missilePayload`), cost: 5, col: 3, row: 7, requires: 'homingMissile', requiresLabel: 'Homing Missiles' },
        { key: 'missilePayload2', label: 'Payload Amplifier II', desc: t(`techTree.nodes.missilePayload2`), cost: 6, col: 3, row: 9, requires: 'missilePayload', requiresLabel: 'Payload Amplifier I' },
        { key: 'missilePayload3', label: 'Payload Amplifier III', desc: t(`techTree.nodes.missilePayload3`), cost: 7, col: 3, row: 11, requires: 'missilePayload2', requiresLabel: 'Payload Amplifier II' },
        { key: 'missilePayload4', label: 'Payload Amplifier IV', desc: t(`techTree.nodes.missilePayload4`), cost: 8, col: 3, row: 13, requires: 'missilePayload3', requiresLabel: 'Payload Amplifier III' },
        { key: 'missilePayload5', label: 'Payload Amplifier V', desc: t(`techTree.nodes.missilePayload5`), cost: 10, col: 3, row: 15, requires: 'missilePayload4', requiresLabel: 'Payload Amplifier IV' },
        { key: 'missileEndurance', label: 'Extended Flight Core', desc: t(`techTree.nodes.missileEndurance`), cost: 8, col: 3, row: 17, requires: 'missilePayload5', requiresLabel: 'Payload Amplifier V' },
        { key: 'missileWarhead', label: 'Siege Warhead', desc: t(`techTree.nodes.missileWarhead`), cost: 10, col: 3, row: 19, requires: 'missileEndurance', requiresLabel: 'Extended Flight Core' },
        { key: 'missileGuidance', label: 'Guidance Array', desc: t(`techTree.nodes.missileGuidance`), cost: 10, col: 3, row: 21, requires: 'missileWarhead', requiresLabel: 'Siege Warhead' },
        { key: 'droneDamage1', label: 'Drone Emitter I', desc: t(`techTree.nodes.droneDamage1`), cost: 4, col: 4, row: 3, requires: 'drone', requiresLabel: 'Drone' },
        { key: 'droneDamage2', label: 'Drone Emitter II', desc: t(`techTree.nodes.droneDamage2`), cost: 5, col: 4, row: 5, requires: 'droneDamage1', requiresLabel: 'Drone Emitter I' },
        { key: 'droneDamage3', label: 'Drone Emitter III', desc: t(`techTree.nodes.droneDamage3`), cost: 6, col: 4, row: 7, requires: 'droneDamage2', requiresLabel: 'Drone Emitter II' },
        { key: 'droneDamage4', label: 'Drone Emitter IV', desc: t(`techTree.nodes.droneDamage4`), cost: 8, col: 4, row: 9, requires: 'droneDamage3', requiresLabel: 'Drone Emitter III' },
        { key: 'droneDamage5', label: 'Drone Emitter V', desc: t(`techTree.nodes.droneDamage5`), cost: 10, col: 4, row: 11, requires: 'droneDamage4', requiresLabel: 'Drone Emitter IV' },
        { key: 'twinDrones', label: 'Twin Drones', desc: t(`techTree.nodes.twinDrones`), cost: 18, col: 4, row: 13, requires: 'droneDamage5', requiresLabel: 'Drone Emitter V' },
        { key: 'learningProtocol', label: 'Learning Protocol', desc: t(`techTree.nodes.learningProtocol`), cost: 8, col: 1, row: 5, requires: 'xpResonance', requiresLabel: 'XP Resonance' },
        { key: 'targetingMatrix', label: 'Targeting Matrix', desc: t(`techTree.nodes.targetingMatrix`), cost: 8, col: 3, row: 5, requires: ['autoShoot', 'drone'], requiresLabel: 'Auto-Fire + Drone' },
        { key: 'piercing', label: 'Piercing Rounds', desc: t(`techTree.nodes.piercing`), cost: 6, col: 2, row: 5, requires: 'autoShoot', requiresLabel: 'Auto-Fire' },
        { key: 'signalInterference', label: 'Signal Interference', desc: t(`techTree.nodes.signalInterference`), cost: 12, col: 4, row: 15, requires: 'droneDamage5', requiresLabel: 'Drone Emitter V' },
        { key: 'salvage', label: 'Salvage Drive', desc: t(`techTree.nodes.salvage`), cost: 6, col: 1, row: 7, requires: 'xpResonance', requiresLabel: 'XP Resonance' },
        { key: 'explosiveRounds', label: 'Explosive Rounds', desc: t(`techTree.nodes.explosiveRounds`), cost: 6, col: 2, row: 7, requires: 'piercing', requiresLabel: 'Piercing Rounds' },
        { key: 'twinMissiles', label: 'Twin Missiles', desc: t(`techTree.nodes.twinMissiles`), cost: 14, col: 4, row: 17, requires: 'missilePayload', requiresLabel: 'Payload Amplifier I' },
        { key: 'reactorNova', label: 'Reactor Nova', desc: t(`techTree.nodes.reactorNova`), cost: 14, col: 2, row: 9, requires: 'explosiveRounds', requiresLabel: 'Explosive Rounds' }
    ];

    const grid = document.createElement('div');
    grid.className = 'tt-grid';
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(4, 1fr)';
    grid.style.columnGap = scale(8);
    grid.style.rowGap = scale(10);
    grid.style.alignItems = 'start';
    grid.style.width = '100%';
    grid.style.marginBottom = scale(4);
    grid.style.position = 'relative';
    grid.style.isolation = 'isolate';

    // Draw Connectors
    const drawConnector = (col, row, type, active) => {
        const c = document.createElement('div');
        c.className = 'tt-connector';
        c.style.gridColumn = typeof col === 'string' ? col : String(col);
        c.style.gridRow = String(row);
        c.style.zIndex = '0';
        c.style.pointerEvents = 'none';
        c.style.opacity = active ? '0.95' : '0.55';
        c.style.borderColor = active ? INK.phosphor : INK.hairlineDim;
        c.style.borderStyle = active ? 'solid' : 'dashed';
        c.style.filter = active ? `drop-shadow(0 0 ${scaleNum(4)}px ${INK.phosphorDim})` : 'none';
        if (type === 'v') {
            c.style.borderLeft = `${scaleNum(active ? 3 : 2)}px ${c.style.borderStyle}`;
            c.style.width = '0';
            c.style.height = '100%';
            c.style.justifySelf = 'center';
        } else if (type === 'h') {
            c.style.borderTop = `${scaleNum(active ? 3 : 2)}px ${c.style.borderStyle}`;
            c.style.height = '0';
            c.style.width = '100%';
            c.style.alignSelf = 'center';
        } else if (type === 'branch') {
            c.style.borderTop = '2px solid';
            c.style.borderLeft = '2px solid';
            c.style.borderRight = '2px solid';
            c.style.height = '100%';
            c.style.width = 'calc(100% + ' + scale(8) + ')'; // span gap
            c.style.marginLeft = 'calc(-50% - ' + scale(4) + ')';
            c.style.alignSelf = 'start';
            // Not perfect with CSS grid but a vertical line in center works too
        }
        grid.appendChild(c);
    }
    
    // Connectors are rendered only on desktop. Mobile gets a linear branch list
    // below, which keeps the dependency hierarchy readable without shrinking a
    // graph into an unusable touch layout.
    //
    // Level-gated nodes stay visible but render locked (greyed, no Confirm) with
    // an "ab Level X" status, so late-game goals like Twin Drones are always
    // discoverable instead of vanishing from the tree until the run catches up.
    nodes.forEach((node) => { node.minLevel = TECH_MIN_LEVELS[node.key] || 0; });
    const visibleNodes = nodes;
    const nodeByKey = new Map(visibleNodes.map((node) => [node.key, node]));
    const isLevelLocked = (node) => currentLevel < node.minLevel;
    const isUnlocked = (key) => key === 'autoShoot' ? (!!currentTechUpgrades[key] || _isMobile) : !!currentTechUpgrades[key];
    const nodeDepth = (node, seen = new Set()) => {
        if (!node || !node.requires || seen.has(node.key)) return 0;
        seen.add(node.key);
        const requirements = Array.isArray(node.requires) ? node.requires : [node.requires];
        return 1 + Math.max(...requirements.map((key) => nodeDepth(nodeByKey.get(key), new Set(seen))));
    };
    const createTreeNode = (n) => {
        const unlocked = n.key === 'autoShoot' ? (!!currentTechUpgrades[n.key] || _isMobile) : !!currentTechUpgrades[n.key];
        const requirements = Array.isArray(n.requires) ? n.requires : (n.requires ? [n.requires] : []);
        const prereqMet = requirements.every((requirement) => requirement === 'autoShoot'
            ? (!!currentTechUpgrades[requirement] || _isMobile)
            : !!currentTechUpgrades[requirement]);
        return techTreeNode(n, unlocked, !prereqMet, isLevelLocked(n), onUpgrade);
    };

    if (_isMobile) {
        const mobileTree = document.createElement('div');
        mobileTree.className = 'tt-mobile-tree';
        mobileTree.style.display = 'flex';
        mobileTree.style.flexDirection = 'column';
        mobileTree.style.gap = scale(16);
        mobileTree.style.width = '100%';

        const groups = [
            { label: t('techTree.groups.xp'), keys: ['xpResonance', 'resonanceCascade', 'learningProtocol'] },
            { label: t('techTree.groups.weapon'), keys: ['autoShoot', 'boltVelocity', 'rapidFire', 'piercing', 'explosiveRounds', 'reactorNova'] },
            { label: t('techTree.groups.missile'), keys: ['homingMissile', 'twinMissiles', 'missilePayload', 'missilePayload2', 'missilePayload3', 'missilePayload4', 'missilePayload5', 'missileEndurance', 'missileWarhead', 'missileGuidance'] },
            { label: t('techTree.groups.drone'), keys: ['drone', 'droneDamage1', 'droneDamage2', 'droneDamage3', 'droneDamage4', 'droneDamage5', 'targetingMatrix', 'twinDrones', 'signalInterference'] },
            { label: t('techTree.groups.utility'), keys: ['salvage'] }
        ];
        groups.forEach((group) => {
            const groupNodes = group.keys.map((key) => nodeByKey.get(key)).filter(Boolean);
            if (!groupNodes.length) return;

            const heading = document.createElement('div');
            heading.innerText = group.label;
            heading.style.fontFamily = FONT;
            heading.style.fontSize = scale(10);
            heading.style.letterSpacing = '0.16em';
            heading.style.color = INK.scope;
            heading.style.marginBottom = scale(-8);
            mobileTree.appendChild(heading);

            const branch = document.createElement('div');
            branch.style.display = 'flex';
            branch.style.flexDirection = 'column';
            branch.style.gap = scale(8);
            branch.style.borderLeft = `2px solid ${INK.hairlineDim}`;
            branch.style.paddingLeft = scale(10);
            groupNodes.forEach((n, index) => {
                const node = createTreeNode(n);
                // Cap the indent so long dependency chains (the missile and drone
                // branches run 6-9 deep) don't squeeze cards off the phone screen.
                const margin = Math.min(nodeDepth(n), 4) * 10;
                node.style.marginLeft = scale(margin);
                node.style.width = `calc(100% - ${scale(margin)})`;
                if (index > 0 && n.requires) node.style.position = 'relative';
                branch.appendChild(node);
            });
            mobileTree.appendChild(branch);
        });
        panel.appendChild(mobileTree);
    } else {
        visibleNodes.filter((node) => node.requires).forEach((node) => {
            const requirements = Array.isArray(node.requires) ? node.requires : [node.requires];
            requirements.forEach((requirement) => {
                const parent = nodeByKey.get(requirement);
                if (!parent) return;
                const active = isUnlocked(parent.key);
                if (parent.col === node.col) {
                    drawConnector(node.col, parent.row + 1, 'v', active);
                } else {
                    const left = Math.min(parent.col, node.col);
                    const right = Math.max(parent.col, node.col);
                    drawConnector(`${left} / ${right + 1}`, parent.row + 1, 'h', active);
                    drawConnector(node.col, parent.row + 1, 'v', active);
                }
            });
        });
        visibleNodes.forEach((n) => {
            const node = createTreeNode(n);
            node.style.gridColumn = String(n.col);
            node.style.gridRow = String(n.row);
            grid.appendChild(node);
        });
        panel.appendChild(grid);
    }

    const closeBtn = consoleButton({ text: t('common.close'), color: INK.scope, glowColor: INK.scopeDim, fontSize: 13 });
    closeBtn.style.marginTop = scale(14);
    closeBtn.style.padding = `${scale(8)} ${scale(20)}`;
    closeBtn.onclick = closeTechTree;
    panel.appendChild(closeBtn);

    document.body.appendChild(modal);
    enableArrowKeyNav(panel);
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
    annunciator({ id: 'wave-hint', top: '96px', text: t('hints.wave'), color: INK.caution, duration: 3500 });
}


export function showOverdriveHint(duration) {
    annunciator({ id: 'overdrive-hint', top: '172px', text: t('hints.overdrive'), color: INK.gold, duration });
}

export function showBossHint() {
    annunciator({ id: 'boss-hint', top: '96px', text: t('hints.boss'), color: INK.danger, duration: 3500 });
}

export function showSalvageHint() {
    annunciator({ id: 'salvage-hint', top: '96px', text: t('hints.salvage'), color: INK.gold, duration: 3500 });
}

export function showSalvageRewardHint(reward) {
    const rewards = {
        hull: { text: t('hints.salvageHull'), color: INK.phosphor },
        milestone: { text: t('hints.salvageMilestone'), color: INK.gold },
        overdrive: { text: t('hints.salvageOverdrive'), color: INK.gold },
        drone: { text: t('hints.salvageDrone'), color: INK.scope },
        overcharge: { text: t('hints.salvageOvercharge'), color: INK.phosphor }
    };
    const entry = rewards[reward];
    if (entry) annunciator({ id: 'salvage-reward-hint', top: '136px', text: entry.text, color: entry.color, duration: 3500 });
}

export function showToast({ id, message, buttonLabel, onClick, isShopOpenRef, isPausedRef, color = INK.scope }) {
    // Remove existing toast if there is one
    const existing = document.getElementById(id);
    if (existing) {
        existing.remove();
    }

    const toast = document.createElement('div');
    toast.id = id;
    toast.style.position = 'fixed';
    toast.style.bottom = scale(24);
    toast.style.right = scale(24);
    toast.style.zIndex = '9999';
    toast.style.display = 'flex';
    toast.style.flexDirection = 'column';
    toast.style.gap = scale(12);
    toast.style.alignItems = 'center';
    toast.style.padding = `${scale(16)} ${scale(24)}`;
    toast.style.pointerEvents = 'auto';

    panelBase(toast, { color: `${color}55`, chamfer: 12 });
    toast.style.boxShadow = `0 0 ${scaleNum(20)}px ${scaleNum(2)}px ${color}33, 0 ${scaleNum(4)}px ${scaleNum(12)}px 0 rgba(0,0,0,0.8)`;

    const msg = document.createElement('div');
    msg.textContent = message;
    msg.style.color = color;
    msg.style.fontFamily = FONT;
    msg.style.fontSize = scale(16);
    msg.style.fontWeight = 'bold';
    msg.style.textTransform = 'uppercase';
    msg.style.letterSpacing = '1px';
    
    toast.appendChild(msg);

    if (buttonLabel && onClick) {
        const btn = consoleButton({
            text: buttonLabel,
            color: color,
            glowColor: color
        });
        btn.onclick = () => {
            toast.remove();
            onClick();
        };
        btn.style.width = '100%';
        toast.appendChild(btn);
    }

    document.body.appendChild(toast);

    // Check visibility periodically so it doesn't cover shop/pause modals
    if (isShopOpenRef || isPausedRef) {
        const interval = setInterval(() => {
            if (!document.getElementById(id)) {
                clearInterval(interval);
                return;
            }
            if (isShopOpenRef?.value || isPausedRef?.value) {
                toast.style.display = 'none';
            } else {
                toast.style.display = 'flex';
            }
        }, 200);
    }
    
    return toast;
}

export function showUpdateToast(onReload, isShopOpenRef, isPausedRef) {
    showToast({
        id: 'pwa-update-toast',
        message: t('toast.updateAvailable'),
        buttonLabel: t('toast.reloadNow'),
        onClick: onReload,
        isShopOpenRef,
        isPausedRef,
        color: INK.scope
    });
}
