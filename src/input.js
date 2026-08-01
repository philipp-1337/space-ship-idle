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

    setupTouchControls() {
        this.createTouchControlsUI();
    }

    createTouchControlsUI() {
        const touchContainer = document.createElement('div');
        touchContainer.id = 'touch-controls';
        touchContainer.style.position = 'fixed';
        touchContainer.style.left = '0';
        touchContainer.style.bottom = '0';
        touchContainer.style.width = '100vw';
        touchContainer.style.height = TOUCH_CONTROLS.CONTAINER_HEIGHT;
        touchContainer.style.zIndex = MOBILE.TOUCH_Z_INDEX.toString();
        touchContainer.style.pointerEvents = 'none';

        this.createVirtualJoystick(touchContainer);
        this.createShootButton(touchContainer);

        document.body.appendChild(touchContainer);
    }

    createVirtualJoystick(container) {
        const joystickSize = TOUCH_CONTROLS.JOYSTICK_SIZE;
        const stickSize = TOUCH_CONTROLS.JOYSTICK_STICK_SIZE;
        
        const joystickBase = document.createElement('div');
        joystickBase.style.position = 'absolute';
        joystickBase.style.left = '36px';
        joystickBase.style.bottom = '36px';
        joystickBase.style.width = joystickSize + 'px';
        joystickBase.style.height = joystickSize + 'px';
        joystickBase.style.background = 'rgba(10,13,12,0.55)';
        joystickBase.style.borderRadius = '50%';
        joystickBase.style.pointerEvents = 'auto';
        joystickBase.style.touchAction = 'none';
        joystickBase.style.border = '1px solid rgba(57,255,106,0.35)';
        joystickBase.style.boxShadow = '0 0 12px 1px rgba(57,255,106,0.18) inset, 0 0 8px 0 rgba(57,255,106,0.15)';
        joystickBase.style.boxSizing = 'border-box';

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
        joystickStick.style.left = (joystickSize/2 - stickSize/2) + 'px';
        joystickStick.style.top = (joystickSize/2 - stickSize/2) + 'px';
        joystickStick.style.width = stickSize + 'px';
        joystickStick.style.height = stickSize + 'px';
        joystickStick.style.background = '#39ff6a';
        joystickStick.style.borderRadius = '50%';
        joystickStick.style.border = '1px solid rgba(232,255,240,0.9)';
        joystickStick.style.boxShadow = '0 0 10px 3px rgba(57,255,106,0.7)';
        joystickStick.style.boxSizing = 'border-box';
        joystickStick.style.transition = 'left 0.08s, top 0.08s';
        
        joystickBase.appendChild(joystickStick);
        container.appendChild(joystickBase);

        this.setupJoystickEvents(joystickBase, joystickStick, joystickSize, stickSize);
    }

    setupJoystickEvents(base, stick, baseSize, stickSize) {
        let joystickTouchId = null;
        let baseRect = null;

        const moveStick = (x, y) => {
            const dx = x - baseSize/2;
            const dy = y - baseSize/2;
            const maxDist = baseSize/2 - stickSize/2;
            let dist = Math.sqrt(dx*dx + dy*dy);
            let nx = dx, ny = dy;
            
            if (dist > maxDist) {
                nx = dx * maxDist / dist;
                ny = dy * maxDist / dist;
                dist = maxDist;
            }
            
            stick.style.left = (baseSize/2 - stickSize/2 + nx) + 'px';
            stick.style.top = (baseSize/2 - stickSize/2 + ny) + 'px';
            
            this.setJoystickVector(nx, ny);
        };

        const resetJoystick = () => {
            stick.style.left = (baseSize/2 - stickSize/2) + 'px';
            stick.style.top = (baseSize/2 - stickSize/2) + 'px';
            this.joystickMove = { x: 0, y: 0 };
            this.keys.up = this.keys.down = this.keys.left = this.keys.right = false;
        };

        base.addEventListener('touchstart', (e) => {
            if (joystickTouchId !== null) return;

            // Defensive checks for touch data
            if (!e.changedTouches || e.changedTouches.length === 0) {
                console.error("Joystick touchstart: No changedTouches found in event.", e);
                return; 
            }
            const touch = e.changedTouches[0];
            if (!touch) { 
                console.error("Joystick touchstart: First touch point (e.changedTouches[0]) is invalid.", e);
                return;
            }

            joystickTouchId = touch.identifier;
            baseRect = base.getBoundingClientRect();

            // Further check for valid coordinates and baseRect
            if (typeof touch.clientX !== 'number' || typeof touch.clientY !== 'number' || !baseRect) {
                console.error("Joystick touchstart: Invalid touch coordinates or baseRect is missing.", { touchClientX: touch.clientX, touchClientY: touch.clientY, baseRectExists: !!baseRect });
                joystickTouchId = null; // Reset to allow a new touch attempt
                return;
            }

            const x = touch.clientX - baseRect.left;
            const y = touch.clientY - baseRect.top;
            moveStick(x, y);
            e.preventDefault();
        }, { passive: false });

        base.addEventListener('touchmove', (e) => {
            if (joystickTouchId === null) return;
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                if (touch.identifier === joystickTouchId) {
                    const x = touch.clientX - baseRect.left;
                    const y = touch.clientY - baseRect.top;
                    moveStick(x, y);
                    e.preventDefault();
                    break;
                }
            }
        }, { passive: false });

        base.addEventListener('touchend', (e) => {
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                if (touch.identifier === joystickTouchId) {
                    joystickTouchId = null;
                    resetJoystick();
                    e.preventDefault();
                    break;
                }
            }
        }, { passive: false });

        base.addEventListener('touchcancel', () => {
            joystickTouchId = null;
            resetJoystick();
        });
    }

    setJoystickVector(dx, dy) {
        const deadzone = TOUCH_CONTROLS.JOYSTICK_DEADZONE;
        
        if (Math.abs(dx) > deadzone || Math.abs(dy) > deadzone) {
            this.joystickMove = { x: dx, y: dy };
        } else {
            this.joystickMove = { x: 0, y: 0 };
        }
    }

    createShootButton(container) {
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
        shootBtn.style.position = 'absolute';
        shootBtn.style.right = '64px';
        shootBtn.style.bottom = '96px';
        shootBtn.style.width = TOUCH_CONTROLS.SHOOT_BUTTON_SIZE + 'px';
        shootBtn.style.height = TOUCH_CONTROLS.SHOOT_BUTTON_SIZE + 'px';
        shootBtn.style.display = 'flex';
        shootBtn.style.alignItems = 'center';
        shootBtn.style.justifyContent = 'center';
        shootBtn.style.borderRadius = '50%';
        shootBtn.style.boxSizing = 'border-box';
        shootBtn.style.pointerEvents = 'auto';
        shootBtn.style.touchAction = 'none';

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

        shootBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.keys.shooting = true;
            shootBtn.style.transform = 'scale(0.92)';
            engagedStyle();
        });

        shootBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.keys.shooting = false;
            shootBtn.style.transform = 'scale(1)';
            idleStyle();
        });

        container.appendChild(shootBtn);
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