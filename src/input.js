// input.js - Input Management System

import { TOUCH_CONTROLS, MOBILE } from './constants.js';

export class InputManager {
    constructor() {
        this.keys = { 
            up: false, 
            down: false, 
            left: false, 
            right: false, 
            shooting: false 
        };
        this.joystickMove = null;
        this.isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        
        this.setupKeyboardListeners();
        this.setupMouseListeners();
        
        if (this.isMobile) {
            this.setupTouchControls();
        }
    }

    setupKeyboardListeners() {
        window.addEventListener('keydown', (event) => {
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
        });

        window.addEventListener('keyup', (event) => {
            if (event.code === 'Space') this.keys.shooting = false;
            if (["ArrowUp", "w", "W"].includes(event.key)) this.keys.up = false;
            if (["ArrowDown", "s", "S"].includes(event.key)) this.keys.down = false;
            if (["ArrowLeft", "a", "A"].includes(event.key)) this.keys.left = false;
            if (["ArrowRight", "d", "D"].includes(event.key)) this.keys.right = false;
        });
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

    // Touch layout: two full-height capture zones (left = steer, right = fire)
    // spanning nearly the whole screen, below a reserved strip that keeps the
    // HUD buttons (Pause/Settings/Tech Tree, etc.) tappable. The joystick base
    // and fire button are purely visual (pointer-events: none) — all input
    // logic lives on the zones, so touching anywhere in a zone works exactly
    // the same as touching the small graphic used to be. `setControlsVisible`
    // toggles only the graphics; the zones themselves always stay active.
    setupTouchControls() {
        this.controlsVisible = true;
        this.createVirtualJoystickVisual();
        this.createShootButtonVisual();
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
        rightZone.id = 'fire-zone';
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
        this.setupFireZoneEvents(rightZone);
    }

    createVirtualJoystickVisual() {
        const joystickSize = TOUCH_CONTROLS.JOYSTICK_SIZE;
        const stickSize = TOUCH_CONTROLS.JOYSTICK_STICK_SIZE;

        const joystickBase = document.createElement('div');
        joystickBase.style.position = 'fixed';
        joystickBase.style.left = '36px';
        joystickBase.style.bottom = '36px';
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
            this.joystickBase.style.left = '36px';
            this.joystickBase.style.top = 'auto';
            this.joystickBase.style.bottom = '36px';
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

        if (Math.abs(dx) > deadzone || Math.abs(dy) > deadzone) {
            this.joystickMove = { x: dx, y: dy };
        } else {
            this.joystickMove = { x: 0, y: 0 };
        }
    }

    createShootButtonVisual() {
        const shootBtn = document.createElement('button');
        shootBtn.innerHTML = `<svg width="42%" height="42%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/>
            <circle cx="12" cy="12" r="2.5" fill="currentColor"/>
            <line x1="12" y1="0.5" x2="12" y2="4.5" stroke="currentColor" stroke-width="1.5"/>
            <line x1="12" y1="19.5" x2="12" y2="23.5" stroke="currentColor" stroke-width="1.5"/>
            <line x1="0.5" y1="12" x2="4.5" y2="12" stroke="currentColor" stroke-width="1.5"/>
            <line x1="19.5" y1="12" x2="23.5" y2="12" stroke="currentColor" stroke-width="1.5"/>
        </svg>`;
        shootBtn.setAttribute('aria-label', 'Fire');
        shootBtn.style.position = 'fixed';
        shootBtn.style.right = '36px';
        shootBtn.style.bottom = '36px';
        shootBtn.style.width = TOUCH_CONTROLS.SHOOT_BUTTON_SIZE + 'px';
        shootBtn.style.height = TOUCH_CONTROLS.SHOOT_BUTTON_SIZE + 'px';
        shootBtn.style.display = 'flex';
        shootBtn.style.alignItems = 'center';
        shootBtn.style.justifyContent = 'center';
        shootBtn.style.borderRadius = '50%';
        shootBtn.style.boxSizing = 'border-box';
        shootBtn.style.pointerEvents = 'none';
        shootBtn.style.zIndex = MOBILE.TOUCH_Z_INDEX.toString();

        const idleStyle = () => {
            shootBtn.style.border = '1px solid rgba(255,59,48,0.6)';
            shootBtn.style.background = 'rgba(10,13,12,0.55)';
            shootBtn.style.color = '#ff3b30';
            shootBtn.style.boxShadow = '0 0 16px 1px rgba(255,59,48,0.25)';
        };
        const engagedStyle = () => {
            shootBtn.style.border = '1px solid #ff3b30';
            shootBtn.style.background = '#ff3b30';
            shootBtn.style.color = '#0a0d0c';
            shootBtn.style.boxShadow = '0 0 22px 5px rgba(255,59,48,0.6)';
        };
        idleStyle();
        shootBtn.style.transition = 'transform 0.08s, box-shadow 0.08s, background 0.08s, color 0.08s';

        this.setShootButtonEngaged = (engaged) => {
            shootBtn.style.transform = engaged ? 'scale(0.92)' : 'scale(1)';
            if (engaged) engagedStyle(); else idleStyle();
        };

        document.body.appendChild(shootBtn);
        this.shootBtn = shootBtn;
    }

    setupFireZoneEvents(zone) {
        const activeTouches = new Set();
        const updateShooting = () => {
            this.keys.shooting = activeTouches.size > 0;
            if (this.setShootButtonEngaged) this.setShootButtonEngaged(this.keys.shooting);
        };

        zone.addEventListener('touchstart', (e) => {
            for (let i = 0; i < e.changedTouches.length; i++) activeTouches.add(e.changedTouches[i].identifier);
            updateShooting();
            e.preventDefault();
        }, { passive: false });

        const release = (e) => {
            for (let i = 0; i < e.changedTouches.length; i++) activeTouches.delete(e.changedTouches[i].identifier);
            updateShooting();
        };
        zone.addEventListener('touchend', release, { passive: false });
        zone.addEventListener('touchcancel', release);
    }

    // Hides/shows only the joystick and fire-button graphics; the underlying
    // touch zones keep working either way (Settings > Touch Controls).
    setControlsVisible(visible) {
        this.controlsVisible = visible;
        if (this.joystickBase) this.joystickBase.style.display = visible ? 'block' : 'none';
        if (this.shootBtn) this.shootBtn.style.display = visible ? 'flex' : 'none';
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

    isShooting() {
        return this.keys.shooting;
    }

    isMoving() {
        return this.keys.up || this.keys.down || this.keys.left || this.keys.right || 
               (this.joystickMove && (Math.abs(this.joystickMove.x) > 0 || Math.abs(this.joystickMove.y) > 0));
    }
}