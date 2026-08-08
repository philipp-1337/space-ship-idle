// input.js - Input Management System

import { TOUCH_CONTROLS, MOBILE } from './constants.js';

export class InputManager {
    constructor() {
        this.keys = {
            up: false,
            down: false,
            left: false,
            right: false,
            strafeLeft: false,
            strafeRight: false,
            shooting: false
        };
        this.joystickMove = null;
        this.strafeValue = 0; // -1..1, mobile right-stick horizontal axis
        this.maneuverThrustValue = 0; // -1..1, mobile right-stick vertical axis
        this.mobileAdvancedControls = false;
        this.mobileControlScheme = 'one-handed';
        this.desktopShortcutHandler = null;
        this.isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        
        this.setupKeyboardListeners();
        this.setupMouseListeners();
        
        if (this.isMobile) {
            this.setupTouchControls();
        }
    }

    setupKeyboardListeners() {
        window.addEventListener('keydown', (event) => {
            if (!this.isMobile && this.desktopShortcutHandler) {
                const shortcut = {
                    t: 'techTree',
                    '3': 'techTree',
                    f: 'flightProtocols',
                    '4': 'flightProtocols',
                    p: 'pause',
                    '1': 'pause',
                    o: 'settings',
                    '2': 'settings'
                }[event.key.toLowerCase()];
                if (shortcut) {
                    event.preventDefault();
                    this.desktopShortcutHandler(shortcut);
                    return;
                }
            }
            if (event.code === 'Space') {
                if (!this.keys.shooting) {
                    this.keys.shooting = true;
                }
                event.preventDefault();
            }
            if (["ArrowUp", "w", "W"].includes(event.key)) this.keys.up = true;
            if (["ArrowDown", "s", "S"].includes(event.key)) this.keys.down = true;
            if (["ArrowLeft", "a", "A"].includes(event.key)) this.keys.left = true;
            if (["ArrowRight", "d", "D"].includes(event.key)) this.keys.right = true;
            // Q/E: lateral strafe, independent of turning (A/D) and thrust (W/S) —
            // lets the ship translate sideways while keeping its facing (and fire
            // direction) unchanged.
            if (["q", "Q"].includes(event.key)) this.keys.strafeLeft = true;
            if (["e", "E"].includes(event.key)) this.keys.strafeRight = true;
        });

        window.addEventListener('keyup', (event) => {
            if (event.code === 'Space') this.keys.shooting = false;
            if (["ArrowUp", "w", "W"].includes(event.key)) this.keys.up = false;
            if (["ArrowDown", "s", "S"].includes(event.key)) this.keys.down = false;
            if (["ArrowLeft", "a", "A"].includes(event.key)) this.keys.left = false;
            if (["ArrowRight", "d", "D"].includes(event.key)) this.keys.right = false;
            if (["q", "Q"].includes(event.key)) this.keys.strafeLeft = false;
            if (["e", "E"].includes(event.key)) this.keys.strafeRight = false;
        });
    }

    setDesktopShortcutHandler(handler) {
        this.desktopShortcutHandler = typeof handler === 'function' ? handler : null;
    }

    setupMouseListeners() {
        const canvas = document.querySelector('canvas');
        if (canvas) {
            canvas.addEventListener('mousedown', (e) => {
                if (e.button === 0) {
                    this.keys.shooting = true;
                }
            });

            canvas.addEventListener('mouseup', (e) => {
                if (e.button === 0) {
                    this.keys.shooting = false;
                }
            });
        }
    }

    // Touch layout: two full-height capture zones (left = move, right = maneuver)
    // spanning nearly the whole screen, below a reserved strip that keeps the
    // HUD buttons (Pause/Settings/Tech Tree, etc.) tappable. The joystick base
    // and maneuver-stick graphics are purely visual (pointer-events: none) — all
    // input logic lives on the zones, so touching anywhere in a zone works
    // exactly the same as touching the small graphic used to be.
    // `setControlsVisible` toggles only the graphics; the zones themselves
    // always stay active.
    //
    // Firing is fully automatic on mobile (see keys.shooting below) — there's
    // no manual fire button. The right zone is a second stick: horizontal
    // strafe, vertical forward/reverse relative to the ship's facing.
    setupTouchControls() {
        this.controlsVisible = true;
        this.keys.shooting = true;
        this.createVirtualJoystickVisual();

        this.createRightManeuverVisual();
        this.createTouchZones();
    }

    createTouchZones() {
        const scaleFactor = MOBILE.UI_SCALE_FACTOR || 1.5;
        const topReserve = TOUCH_CONTROLS.HUD_TOP_RESERVE * scaleFactor;

        const leftZone = document.createElement('div');
        leftZone.id = 'joystick-zone';
        leftZone.style.position = 'fixed';
        leftZone.style.left = '0';
        leftZone.style.top = `${topReserve}px`;
        leftZone.style.bottom = '0';
        leftZone.style.width = '50vw';
        leftZone.style.zIndex = MOBILE.TOUCH_Z_INDEX.toString();
        leftZone.style.touchAction = 'none';
        leftZone.style.background = 'transparent';
        document.body.appendChild(leftZone);

        const rightZone = document.createElement('div');
        rightZone.id = 'strafe-zone';
        rightZone.style.position = 'fixed';
        rightZone.style.right = '0';
        rightZone.style.top = `${topReserve}px`;
        rightZone.style.bottom = '0';
        rightZone.style.width = '50vw';
        rightZone.style.zIndex = MOBILE.TOUCH_Z_INDEX.toString();
        rightZone.style.touchAction = 'none';
        rightZone.style.background = 'transparent';
        document.body.appendChild(rightZone);

        this.setupJoystickZoneEvents(leftZone);
        this.setupRightManeuverZoneEvents(rightZone);
    }

    createVirtualJoystickVisual() {
        const joystickSize = TOUCH_CONTROLS.JOYSTICK_SIZE;
        const stickSize = TOUCH_CONTROLS.JOYSTICK_STICK_SIZE;

        const joystickBase = document.createElement('div');
        joystickBase.style.position = 'fixed';
        joystickBase.style.left = `${TOUCH_CONTROLS.EDGE_MARGIN}px`;
        joystickBase.style.bottom = `${TOUCH_CONTROLS.EDGE_MARGIN}px`;
        joystickBase.style.width = joystickSize + 'px';
        joystickBase.style.height = joystickSize + 'px';
        joystickBase.style.background = 'rgba(10,13,12,0.55)';
        joystickBase.style.borderRadius = '50%';
        joystickBase.style.pointerEvents = 'none';
        joystickBase.style.border = '1px solid rgba(57,255,106,0.35)';
        joystickBase.style.boxShadow = '0 0 12px 1px rgba(57,255,106,0.18) inset, 0 0 8px 0 rgba(57,255,106,0.15)';
        joystickBase.style.boxSizing = 'border-box';
        joystickBase.style.zIndex = MOBILE.TOUCH_Z_INDEX.toString();

        // Crosshair ticks, matching the console's instrument-dial language.
        for (let i = 0; i < 4; i++) {
            const tick = document.createElement('div');
            const horizontal = i % 2 === 0;
            tick.style.position = 'absolute';
            tick.style.background = 'rgba(57,255,106,0.3)';
            if (horizontal) {
                tick.style.width = '10px';
                tick.style.height = '1px';
                tick.style.top = '50%';
                tick.style[i === 0 ? 'left' : 'right'] = '6px';
            } else {
                tick.style.width = '1px';
                tick.style.height = '10px';
                tick.style.left = '50%';
                tick.style[i === 1 ? 'top' : 'bottom'] = '6px';
            }
            joystickBase.appendChild(tick);
        }

        const joystickStick = document.createElement('div');
        joystickStick.style.position = 'absolute';
        joystickStick.style.left = '0px';
        joystickStick.style.top = '0px';
        joystickStick.style.transform = `translate(${joystickSize/2 - stickSize/2}px, ${joystickSize/2 - stickSize/2}px)`;
        joystickStick.style.width = stickSize + 'px';
        joystickStick.style.height = stickSize + 'px';
        joystickStick.style.background = '#39ff6a';
        joystickStick.style.borderRadius = '50%';
        joystickStick.style.border = '1px solid rgba(232,255,240,0.9)';
        joystickStick.style.boxShadow = '0 0 10px 3px rgba(57,255,106,0.7)';
        joystickStick.style.boxSizing = 'border-box';
        joystickStick.style.transition = 'transform 0.08s';
        joystickStick.style.willChange = 'transform';

        joystickBase.appendChild(joystickStick);
        document.body.appendChild(joystickBase);

        this.joystickBase = joystickBase;
        this.joystickStick = joystickStick;
    }

    setupJoystickZoneEvents(zone) {
        const baseSize = TOUCH_CONTROLS.JOYSTICK_SIZE;
        const stickSize = TOUCH_CONTROLS.JOYSTICK_STICK_SIZE;
        const maxDist = baseSize/2 - stickSize/2;
        let touchId = null;
        let originX = 0, originY = 0;

        const setBasePosition = (x, y) => {
            this.joystickBase.style.left = (x - baseSize/2) + 'px';
            this.joystickBase.style.top = (y - baseSize/2) + 'px';
            this.joystickBase.style.bottom = 'auto';
        };
        const resetBasePosition = () => {
            this.joystickBase.style.left = `${TOUCH_CONTROLS.EDGE_MARGIN}px`;
            this.joystickBase.style.top = 'auto';
            this.joystickBase.style.bottom = `${TOUCH_CONTROLS.EDGE_MARGIN}px`;
        };
        const moveStick = (dx, dy) => {
            let dist = Math.sqrt(dx*dx + dy*dy);
            let nx = dx, ny = dy;
            if (dist > maxDist) {
                nx = dx * maxDist / dist;
                ny = dy * maxDist / dist;
            }
            this.joystickStick.style.transform = `translate(${baseSize/2 - stickSize/2 + nx}px, ${baseSize/2 - stickSize/2 + ny}px)`;
            this.setJoystickVector(nx, ny);
        };
        const resetStick = () => {
            this.joystickStick.style.transform = `translate(${baseSize/2 - stickSize/2}px, ${baseSize/2 - stickSize/2}px)`;
            this.joystickMove = { x: 0, y: 0 };
            this.keys.up = this.keys.down = this.keys.left = this.keys.right = false;
        };

        zone.addEventListener('touchstart', (e) => {
            if (touchId !== null) return;
            const touch = e.changedTouches && e.changedTouches[0];
            if (!touch || typeof touch.clientX !== 'number') return;

            touchId = touch.identifier;
            originX = touch.clientX;
            originY = touch.clientY;
            // Floating joystick: the base graphic jumps to wherever the touch
            // started, so the whole zone behaves like the old fixed base did.
            if (this.controlsVisible) setBasePosition(originX, originY);
            moveStick(0, 0);
            e.preventDefault();
        }, { passive: false });

        zone.addEventListener('touchmove', (e) => {
            if (touchId === null) return;
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                if (touch.identifier === touchId) {
                    moveStick(touch.clientX - originX, touch.clientY - originY);
                    e.preventDefault();
                    break;
                }
            }
        }, { passive: false });

        const endTouch = (e) => {
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === touchId) {
                    touchId = null;
                    resetStick();
                    resetBasePosition();
                    break;
                }
            }
        };
        zone.addEventListener('touchend', endTouch, { passive: false });
        zone.addEventListener('touchcancel', endTouch);
    }

    setJoystickVector(dx, dy) {
        const deadzone = TOUCH_CONTROLS.JOYSTICK_DEADZONE;

        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= deadzone) {
            this.joystickMove = { x: 0, y: 0 };
            return;
        }
        const maxDist = TOUCH_CONTROLS.JOYSTICK_SIZE / 2 - TOUCH_CONTROLS.JOYSTICK_STICK_SIZE / 2;
        const magnitude = Math.min(1, (distance - deadzone) / Math.max(1, maxDist - deadzone));
        this.joystickMove = { x: (dx / distance) * magnitude, y: (dy / distance) * magnitude };
    }

    // Right maneuver stick: horizontal movement strafes, vertical movement
    // applies forward/reverse thrust relative to the ship's current facing.
    createRightManeuverVisual() {
        const trackSize = TOUCH_CONTROLS.RIGHT_STICK_SIZE;
        const knobSize = TOUCH_CONTROLS.RIGHT_STICK_KNOB_SIZE;

        const track = document.createElement('div');
        track.style.position = 'fixed';
        track.style.right = `${TOUCH_CONTROLS.EDGE_MARGIN}px`;
        track.style.bottom = `${TOUCH_CONTROLS.EDGE_MARGIN}px`;
        track.style.width = trackSize + 'px';
        track.style.height = trackSize + 'px';
        track.style.background = 'rgba(10,13,12,0.55)';
        track.style.borderRadius = '50%';
        track.style.pointerEvents = 'none';
        track.style.border = '1px solid rgba(127,232,255,0.35)';
        track.style.boxShadow = '0 0 12px 1px rgba(127,232,255,0.18) inset, 0 0 8px 0 rgba(127,232,255,0.15)';
        track.style.boxSizing = 'border-box';
        track.style.zIndex = MOBILE.TOUCH_Z_INDEX.toString();

        [['left', '‹'], ['right', '›']].forEach(([side, glyph]) => {
            const tick = document.createElement('div');
            tick.innerText = glyph;
            tick.style.position = 'absolute';
            tick.style.top = '50%';
            tick.style.transform = 'translateY(-50%)';
            tick.style[side] = '8px';
            tick.style.color = 'rgba(127,232,255,0.4)';
            tick.style.fontSize = '13px';
            tick.style.lineHeight = '1';
            track.appendChild(tick);
        });
        [['top', '▲'], ['bottom', '▼']].forEach(([side, glyph]) => {
            const tick = document.createElement('div');
            tick.innerText = glyph;
            tick.style.position = 'absolute';
            tick.style.left = '50%';
            tick.style.transform = 'translateX(-50%)';
            tick.style[side] = '7px';
            tick.style.color = 'rgba(127,232,255,0.4)';
            tick.style.fontSize = '9px';
            tick.style.lineHeight = '1';
            track.appendChild(tick);
        });

        const knob = document.createElement('div');
        knob.style.position = 'absolute';
        knob.style.top = ((trackSize - knobSize) / 2) + 'px';
        knob.style.left = ((trackSize - knobSize) / 2) + 'px';
        knob.style.width = knobSize + 'px';
        knob.style.height = knobSize + 'px';
        knob.style.background = '#7fe8ff';
        knob.style.borderRadius = '50%';
        knob.style.border = '1px solid rgba(232,255,240,0.9)';
        knob.style.boxShadow = '0 0 10px 3px rgba(127,232,255,0.7)';
        knob.style.boxSizing = 'border-box';
        knob.style.transition = 'transform 0.08s';
        knob.style.willChange = 'transform';

        track.appendChild(knob);
        document.body.appendChild(track);

        this.strafeTrack = track;
        this.strafeKnob = knob;
    }

    setupRightManeuverZoneEvents(zone) {
        const trackSize = TOUCH_CONTROLS.RIGHT_STICK_SIZE;
        const knobSize = TOUCH_CONTROLS.RIGHT_STICK_KNOB_SIZE;
        const maxDist = trackSize / 2 - knobSize / 2;
        let touchId = null;
        let originX = 0, originY = 0;

        const setTrackPosition = (x, y) => {
            this.strafeTrack.style.left = (x - trackSize / 2) + 'px';
            this.strafeTrack.style.top = (y - trackSize / 2) + 'px';
            this.strafeTrack.style.right = 'auto';
            this.strafeTrack.style.bottom = 'auto';
        };
        const resetTrackPosition = () => {
            this.strafeTrack.style.left = 'auto';
            this.strafeTrack.style.top = 'auto';
            this.strafeTrack.style.right = `${TOUCH_CONTROLS.EDGE_MARGIN}px`;
            this.strafeTrack.style.bottom = `${TOUCH_CONTROLS.EDGE_MARGIN}px`;
        };
        const moveKnob = (dx, dy) => {
            const distance = Math.sqrt(dx * dx + dy * dy);
            const scale = distance > maxDist ? maxDist / distance : 1;
            const clampedX = dx * scale;
            const clampedY = dy * scale;
            const effectiveX = this.mobileAdvancedControls || this.mobileControlScheme === 'one-handed' ? clampedX : 0;
            this.strafeKnob.style.transform = `translate(${effectiveX}px, ${clampedY}px)`;
            this.setRightManeuverVector(effectiveX, clampedY, maxDist);
        };
        const resetKnob = () => {
            this.strafeKnob.style.transform = 'translate(0px, 0px)';
            this.strafeValue = 0;
            this.maneuverThrustValue = 0;
        };

        zone.addEventListener('touchstart', (e) => {
            if (touchId !== null) return;
            const touch = e.changedTouches && e.changedTouches[0];
            if (!touch || typeof touch.clientX !== 'number') return;

            touchId = touch.identifier;
            originX = touch.clientX;
            originY = touch.clientY;
            if (this.controlsVisible) setTrackPosition(originX, originY);
            moveKnob(0, 0);
            e.preventDefault();
        }, { passive: false });

        zone.addEventListener('touchmove', (e) => {
            if (touchId === null) return;
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                if (touch.identifier === touchId) {
                    moveKnob(touch.clientX - originX, touch.clientY - originY);
                    e.preventDefault();
                    break;
                }
            }
        }, { passive: false });

        const endTouch = (e) => {
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === touchId) {
                    touchId = null;
                    resetKnob();
                    resetTrackPosition();
                    break;
                }
            }
        };
        zone.addEventListener('touchend', endTouch, { passive: false });
        zone.addEventListener('touchcancel', endTouch);
    }

    setRightManeuverVector(dx, dy, maxDist) {
        const deadzone = TOUCH_CONTROLS.STRAFE_DEADZONE;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= deadzone) {
            this.strafeValue = 0;
            this.maneuverThrustValue = 0;
            return;
        }
        const magnitude = Math.min(1, (distance - deadzone) / Math.max(1, maxDist - deadzone));
        const strafeEnabled = this.mobileAdvancedControls || this.mobileControlScheme === 'one-handed';
        this.strafeValue = strafeEnabled ? (dx / distance) * magnitude : 0;
        // Screen Y is inverted: dragging up means positive forward thrust.
        this.maneuverThrustValue = (-dy / distance) * magnitude;
    }

    setMobileAdvancedControls(enabled) {
        this.mobileAdvancedControls = !!enabled;
        if (!this.mobileAdvancedControls) this.strafeValue = 0;
    }

    setMobileControlScheme(scheme) {
        this.mobileControlScheme = scheme === 'one-handed' ? 'one-handed' : 'twin-stick';
    }


    // Hides/shows only the joystick/maneuver-stick/auto-fire graphics; the
    // underlying touch zones keep working either way (Settings > Touch Controls).
    setControlsVisible(visible) {
        this.controlsVisible = visible;
        if (this.joystickBase) this.joystickBase.style.display = visible ? 'block' : 'none';
        if (this.strafeTrack) this.strafeTrack.style.display = visible ? 'block' : 'none';

    }

    resizeCanvasForMobile() {
        const canvas = document.querySelector('canvas');
        if (canvas && this.isMobile) {
            canvas.width = window.innerWidth * MOBILE.CANVAS_SCALE_FACTOR;
            canvas.height = window.innerHeight * MOBILE.CANVAS_SCALE_FACTOR;
            canvas.style.width = window.innerWidth + 'px';
            canvas.style.height = window.innerHeight + 'px';
            
            const ctx = canvas.getContext('2d');
            ctx.setTransform(MOBILE.CANVAS_SCALE_FACTOR, 0, 0, MOBILE.CANVAS_SCALE_FACTOR, 0, 0);
        }
    }

    // Getters für die Input-States
    getKeys() {
        return this.keys;
    }

    getJoystickMove() {
        return this.joystickMove;
    }

    // -1 (full left) .. 1 (full right); 0 when idle. Desktop has no equivalent
    // getter — updateShipMovement reads keys.strafeLeft/strafeRight directly there.
    getStrafeValue() {
        return this.strafeValue;
    }

    getRightManeuver() {
        return { x: this.strafeValue, y: this.maneuverThrustValue };
    }

    isShooting() {
        return this.keys.shooting;
    }

    isMoving() {
        return this.keys.up || this.keys.down || this.keys.left || this.keys.right ||
               this.keys.strafeLeft || this.keys.strafeRight ||
               (this.joystickMove && (Math.abs(this.joystickMove.x) > 0 || Math.abs(this.joystickMove.y) > 0)) ||
               Math.abs(this.strafeValue) > 0 || Math.abs(this.maneuverThrustValue) > 0;
    }
}
