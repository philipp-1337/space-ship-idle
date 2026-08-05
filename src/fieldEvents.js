import { FIELD_EVENTS } from './constants.js';
import { activateOverdrive, getOverdriveDurationMs } from './upgrades.js';
import { AudioManager } from './audio/AudioManager.js';
import { makePixelSprite, drawPixelSprite } from './pixelArt.js';

const MARKER_COLOR = '#ffd23f';
const ASTEROID_COLOR = '#6f7884';
const DEBRIS_COLOR = '#9a6b47';

const asteroidSprite = makePixelSprite(14, 14, ['#3b4650', '#6f7884', '#a3b0bc'], '#101315', (ctx) => {
    ctx.fillStyle = '#6f7884';
    ctx.beginPath();
    ctx.moveTo(7, 1); ctx.lineTo(12, 4); ctx.lineTo(11, 10); ctx.lineTo(7, 13);
    ctx.lineTo(2, 10); ctx.lineTo(1, 5); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#a3b0bc';
    ctx.fillRect(5, 3, 3, 2);
    ctx.fillStyle = '#3b4650';
    ctx.fillRect(8, 8, 2, 2);
});

const debrisSprite = makePixelSprite(14, 14, ['#4d3023', '#9a6b47', '#d6a06d'], '#16110e', (ctx) => {
    ctx.fillStyle = '#9a6b47';
    ctx.fillRect(2, 4, 9, 5);
    ctx.fillRect(5, 2, 4, 10);
    ctx.fillStyle = '#d6a06d';
    ctx.fillRect(3, 5, 4, 1);
    ctx.fillStyle = '#4d3023';
    ctx.fillRect(8, 8, 3, 2);
});

function distanceSquared(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
}

function spawnOutsideView(ship, canvas, distance) {
    const side = Math.floor(Math.random() * 4);
    const inset = 70 + Math.random() * Math.max(40, (side < 2 ? canvas.height : canvas.width) - 140);
    if (side === 0) return { x: -distance, y: inset };
    if (side === 1) return { x: canvas.width + distance, y: inset };
    if (side === 2) return { x: inset, y: -distance };
    return { x: inset, y: canvas.height + distance };
}

function drawOffscreenMarker(ctx, marker, canvas, now) {
    const dx = marker.x - marker.shipX;
    const dy = marker.y - marker.shipY;
    const length = Math.hypot(dx, dy) || 1;
    const ux = dx / length;
    const uy = dy / length;
    const padding = 34;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const scale = Math.min(
        (cx - padding) / Math.max(Math.abs(ux), 0.001),
        (cy - padding) / Math.max(Math.abs(uy), 0.001)
    );
    const x = cx + ux * scale;
    const y = cy + uy * scale;
    const pulse = 0.75 + Math.sin(now / 160) * 0.25;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.atan2(uy, ux));
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = MARKER_COLOR;
    ctx.fillStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.shadowColor = MARKER_COLOR;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(11, 0);
    ctx.lineTo(-7, -8);
    ctx.lineTo(-3, 0);
    ctx.lineTo(-7, 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
}

function drawSalvageMarker(ctx, marker, now) {
    const pulse = 0.8 + Math.sin(now / 180) * 0.2;
    ctx.save();
    ctx.translate(marker.x, marker.y);
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = MARKER_COLOR;
    ctx.shadowColor = MARKER_COLOR;
    ctx.shadowBlur = 14;
    ctx.globalAlpha = pulse;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 19, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.lineTo(0, -10);
    ctx.lineTo(10, 0);
    ctx.lineTo(0, 10);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = '#fff3c4';
    ctx.globalAlpha = 1;
    ctx.fillRect(-3, -3, 6, 6);
    ctx.restore();
}

function drawObstacle(ctx, obstacle, now) {
    const color = obstacle.kind === 'asteroid' ? ASTEROID_COLOR : DEBRIS_COLOR;
    const sprite = obstacle.kind === 'asteroid' ? asteroidSprite : debrisSprite;
    ctx.save();
    ctx.translate(obstacle.x, obstacle.y);
    ctx.rotate(obstacle.rotation);
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = color;
    ctx.fillStyle = '#131719';
    ctx.lineWidth = 2;
    ctx.shadowColor = color;
    ctx.shadowBlur = 7;
    drawPixelSprite(ctx, sprite, obstacle.radius * 2, obstacle.radius * 2);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.45 + Math.sin(now / 230 + obstacle.rotation) * 0.12;
    ctx.beginPath();
    ctx.arc(-obstacle.radius * 0.22, -obstacle.radius * 0.12, obstacle.radius * 0.2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
}

export function createFieldEventSystem() {
    const markers = [];
    const obstacles = [];
    let nextMarkerAt = null;
    let nextObstacleAt = null;

    function addMarker(ship, canvas, now) {
        const position = spawnOutsideView(ship, canvas, FIELD_EVENTS.MARKER_OFFSCREEN_DISTANCE);
        markers.push({ ...position, expiresAt: now + FIELD_EVENTS.MARKER_LIFETIME_MS });
        AudioManager.play('SIGNAL_CONTACT');
    }

    function addObstacle(ship, canvas, now) {
        const position = spawnOutsideView(ship, canvas, 55);
        const asteroid = Math.random() < 0.55;
        const driftAngle = Math.random() * Math.PI * 2;
        const driftSpeed = asteroid ? 0.65 + Math.random() * 0.35 : 0.9 + Math.random() * 0.55;
        obstacles.push({
            ...position,
            kind: asteroid ? 'asteroid' : 'debris',
            radius: asteroid ? 30 + Math.random() * 10 : 22 + Math.random() * 8,
            vx: Math.cos(driftAngle) * driftSpeed,
            vy: Math.sin(driftAngle) * driftSpeed,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.025,
            expiresAt: now + FIELD_EVENTS.OBSTACLE_LIFETIME_MS
        });
    }

    function rewardMarker(marker, ship, spawnXpOrb, PlasmaCell, plasmaCells, showOverdriveHint) {
        const reward = Math.floor(Math.random() * 4);
        const outwardAngle = Math.atan2(marker.y - ship.y, marker.x - ship.x);
        const rewardPosition = (index, count, distance = 58) => {
            const spread = count > 1 ? (index / (count - 1) - 0.5) * 0.7 : 0;
            return {
                x: marker.x + Math.cos(outwardAngle + spread) * distance,
                y: marker.y + Math.sin(outwardAngle + spread) * distance
            };
        };
        if (reward === 0) {
            for (let i = 0; i < 3; i++) {
                const position = rewardPosition(i, 3);
                plasmaCells.push(new PlasmaCell(position.x, position.y));
            }
        } else if (reward === 1) {
            for (let i = 0; i < 5; i++) {
                const position = rewardPosition(i, 5, 62 + (i % 2) * 8);
                spawnXpOrb(position.x, position.y, 2);
            }
        } else if (reward === 2) {
            const before = ship.hp;
            ship.hp = Math.min(ship.maxHp, ship.hp + 1);
            if (ship.hp > before) AudioManager.play('SHIELD_UP');
            else AudioManager.play('RES_COLLECT_XP');
        } else {
            activateOverdrive();
            showOverdriveHint(getOverdriveDurationMs());
        }
        AudioManager.play('SIGNAL_COLLECT');
    }

    function resolveObstacleCollision(obstacle, ship) {
        const dx = ship.x - obstacle.x;
        const dy = ship.y - obstacle.y;
        const distance = Math.hypot(dx, dy) || 0.001;
        const minimum = obstacle.radius + ship.width * 0.42;
        if (distance >= minimum) return;
        const push = minimum - distance;
        ship.x += dx / distance * push;
        ship.y += dy / distance * push;
        ship.vx *= 0.45;
        ship.vy *= 0.45;
    }

    return {
        shift(dx, dy) {
            [...markers, ...obstacles].forEach((item) => { item.x += dx; item.y += dy; });
        },
        updateAndDraw({ ship, canvas, ctx, now, dt, spawnXpOrb, PlasmaCell, plasmaCells, showOverdriveHint, showSalvageHint }) {
            if (nextMarkerAt === null) nextMarkerAt = now + FIELD_EVENTS.FIRST_MARKER_DELAY_MS;
            if (nextObstacleAt === null) nextObstacleAt = now + FIELD_EVENTS.FIRST_OBSTACLE_DELAY_MS;
            if (now >= nextMarkerAt && markers.length === 0) {
                addMarker(ship, canvas, now);
                nextMarkerAt = now + FIELD_EVENTS.MARKER_INTERVAL_MS;
                showSalvageHint();
            }
            if (now >= nextObstacleAt && obstacles.length < FIELD_EVENTS.MAX_ACTIVE_OBSTACLES) {
                addObstacle(ship, canvas, now);
                nextObstacleAt = now + FIELD_EVENTS.OBSTACLE_INTERVAL_MS;
            }

            for (let i = obstacles.length - 1; i >= 0; i--) {
                const obstacle = obstacles[i];
                obstacle.x += obstacle.vx * dt;
                obstacle.y += obstacle.vy * dt;
                obstacle.rotation += obstacle.rotationSpeed * dt;
                const visible = obstacle.x + obstacle.radius >= 0 && obstacle.x - obstacle.radius <= canvas.width
                    && obstacle.y + obstacle.radius >= 0 && obstacle.y - obstacle.radius <= canvas.height;
                if (now >= obstacle.expiresAt && !visible) { obstacles.splice(i, 1); continue; }
                resolveObstacleCollision(obstacle, ship);
                drawObstacle(ctx, obstacle, now);
            }

            for (let i = markers.length - 1; i >= 0; i--) {
                const marker = markers[i];
                if (now >= marker.expiresAt) { markers.splice(i, 1); continue; }
                const inView = marker.x >= 0 && marker.x <= canvas.width && marker.y >= 0 && marker.y <= canvas.height;
                if (inView) drawSalvageMarker(ctx, marker, now);
                else drawOffscreenMarker(ctx, { ...marker, shipX: ship.x, shipY: ship.y }, canvas, now);
                if (distanceSquared(marker, ship) <= FIELD_EVENTS.MARKER_CONTACT_RADIUS ** 2) {
                    rewardMarker(marker, ship, spawnXpOrb, PlasmaCell, plasmaCells, showOverdriveHint);
                    markers.splice(i, 1);
                }
            }
        }
    };
}
