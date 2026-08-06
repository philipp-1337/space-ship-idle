import { FIELD_EVENTS } from './constants.js';
import { activateOverdrive } from './upgrades.js';
import { AudioManager } from './audio/AudioManager.js';
import { makePixelSprite, drawPixelSprite } from './pixelArt.js';
import Enemy from './enemy.js';
import { enemies } from './enemyManager.js';

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

function drawRewardVisual(ctx, visual) {
    const progress = 1 - visual.life / visual.maxLife;
    const fade = (1 - progress) * (0.8 + Math.sin(progress * Math.PI) * 0.2);
    const palette = {
        plasma: '#7fe8ff',
        xp: '#ffd23f',
        hull: '#39ff6a',
        milestone: '#ffd23f',
        overdrive: '#ffd23f',
        drone: '#7fe8ff',
        overcharge: '#39ff6a'
    };
    const color = palette[visual.kind];
    const radius = 18 + progress * 52;
    ctx.save();
    ctx.translate(visual.x, visual.y);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = fade;
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.lineWidth = visual.kind === 'hull' ? 3 : 2;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();
    if (visual.kind === 'hull' || visual.kind === 'overcharge') {
        ctx.globalAlpha = fade * 0.9;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-10, 0); ctx.lineTo(10, 0);
        ctx.moveTo(0, -10); ctx.lineTo(0, 10);
        ctx.stroke();
    } else {
        const rays = visual.kind === 'milestone' ? 12 : (visual.kind === 'overdrive' ? 8 : 6);
        const rayStart = radius * 0.42;
        const rayEnd = radius * (visual.kind === 'overdrive' ? 1.18 : 0.9);
        ctx.globalAlpha = fade * 0.85;
        ctx.lineWidth = 2;
        for (let index = 0; index < rays; index++) {
            const angle = index * Math.PI * 2 / rays + progress * 0.55;
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle) * rayStart, Math.sin(angle) * rayStart);
            ctx.lineTo(Math.cos(angle) * rayEnd, Math.sin(angle) * rayEnd);
            ctx.stroke();
        }
    }
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
    const rewardVisuals = [];
    let nextMarkerAt = null;
    let nextObstacleAt = null;

    function addMarker(ship, canvas, now, level, easyMode) {
        const distance = FIELD_EVENTS.MARKER_OFFSCREEN_DISTANCE + Math.random() * FIELD_EVENTS.MARKER_DISTANCE_VARIANCE;
        const position = spawnOutsideView(ship, canvas, distance);
        const initialDistance = Math.hypot(position.x - ship.x, position.y - ship.y);
        markers.push({
            ...position,
            expiresAt: now + FIELD_EVENTS.MARKER_LIFETIME_MS,
            initialDistance,
            closestDistance: initialDistance,
            followed: false
        });
        // Two sparse route contacts make the long flight a deliberate risk,
        // rather than leaving the player alone until the final pickup.
        [0.34, 0.68].forEach((progress) => {
            const x = ship.x + (position.x - ship.x) * progress;
            const y = ship.y + (position.y - ship.y) * progress;
            enemies.push(new Enemy(x, y, Math.max(1, level), easyMode));
            obstacles.push({
                x: x + (Math.random() - 0.5) * 90,
                y: y + (Math.random() - 0.5) * 90,
                kind: Math.random() < 0.5 ? 'asteroid' : 'debris',
                radius: 22 + Math.random() * 8,
                vx: (Math.random() - 0.5) * 0.8,
                vy: (Math.random() - 0.5) * 0.8,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.025,
                expiresAt: now + FIELD_EVENTS.MARKER_LIFETIME_MS
            });
        });
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
        AudioManager.play('SPACE_OBSTACLE');
    }

    function rewardMarker(marker, ship, level, maxXP, now, spawnXpOrb, PlasmaCell, plasmaCells, showSalvageRewardHint) {
        const rewards = level > FIELD_EVENTS.PLASMA_MAX_LEVEL
            ? ['xp', 'hull', 'overdrive', 'drone', 'overcharge']
            : ['plasma', 'xp', 'hull', 'overdrive', 'drone', 'overcharge'];
        const reward = rewards[Math.floor(Math.random() * rewards.length)];
        const outwardAngle = Math.atan2(marker.y - ship.y, marker.x - ship.x);
        const rewardPosition = (index, count, distance = 58) => {
            const spread = count > 1 ? (index / (count - 1) - 0.5) * 0.7 : 0;
            return {
                x: marker.x + Math.cos(outwardAngle + spread) * distance,
                y: marker.y + Math.sin(outwardAngle + spread) * distance
            };
        };
        if (reward === 'plasma') {
            const cellCount = 3 + Math.floor(level / 8);
            for (let i = 0; i < cellCount; i++) {
                const position = rewardPosition(i, cellCount);
                plasmaCells.push(new PlasmaCell(position.x, position.y));
            }
            rewardVisuals.push({ x: marker.x, y: marker.y, kind: 'plasma', life: 34, maxLife: 34 });
        } else if (reward === 'xp') {
            const orbCount = 5;
            const totalXp = Math.max(10, Math.ceil(maxXP * (0.20 + Math.random() * 0.15)));
            for (let i = 0; i < orbCount; i++) {
                const position = rewardPosition(i, orbCount, 62 + (i % 2) * 8);
                spawnXpOrb(position.x, position.y, totalXp / orbCount);
            }
            rewardVisuals.push({ x: marker.x, y: marker.y, kind: 'xp', life: 34, maxLife: 34 });
        } else if (reward === 'hull') {
            const before = ship.hp;
            ship.hp = Math.min(ship.maxHp, ship.hp + 1);
            AudioManager.play(ship.hp > before ? 'SHIELD_UP_V2' : 'MILESTONE');
            showSalvageRewardHint(ship.hp > before ? 'hull' : 'milestone');
            rewardVisuals.push({
                x: ship.x,
                y: ship.y,
                kind: ship.hp > before ? 'hull' : 'milestone',
                life: 42,
                maxLife: 42
            });
        } else if (reward === 'overdrive') {
            activateOverdrive();
            showSalvageRewardHint('overdrive');
            rewardVisuals.push({ x: ship.x, y: ship.y, kind: 'overdrive', life: 42, maxLife: 42 });
        } else if (reward === 'drone') {
            ship.droneUplinkUntil = now + FIELD_EVENTS.DRONE_UPLINK_DURATION_MS;
            showSalvageRewardHint('drone');
            rewardVisuals.push({ x: ship.x, y: ship.y, kind: 'drone', life: 42, maxLife: 42 });
        } else {
            ship.salvageOverchargeUntil = now + FIELD_EVENTS.HULL_OVERCHARGE_DURATION_MS;
            showSalvageRewardHint('overcharge');
            rewardVisuals.push({ x: ship.x, y: ship.y, kind: 'overcharge', life: 42, maxLife: 42 });
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
            [...markers, ...obstacles, ...rewardVisuals].forEach((item) => { item.x += dx; item.y += dy; });
        },
        updateAndDraw({ ship, canvas, ctx, now, dt, level, maxXP, easyMode, spawnXpOrb, PlasmaCell, plasmaCells, showSalvageHint, showSalvageRewardHint }) {
            if (nextMarkerAt === null) nextMarkerAt = now + FIELD_EVENTS.FIRST_MARKER_DELAY_MS;
            if (nextObstacleAt === null) nextObstacleAt = now + FIELD_EVENTS.FIRST_OBSTACLE_DELAY_MS;
            if (now >= nextMarkerAt && markers.length === 0) {
                addMarker(ship, canvas, now, level, easyMode);
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
                const distance = Math.hypot(marker.x - ship.x, marker.y - ship.y);
                marker.closestDistance = Math.min(marker.closestDistance, distance);
                if (!marker.followed && marker.initialDistance - marker.closestDistance >= FIELD_EVENTS.MARKER_FOLLOW_COMMIT_DISTANCE) {
                    marker.followed = true;
                }
                // Once a pilot has demonstrably followed the navigation arrow,
                // the route remains a valid commitment until it is recovered.
                if (!marker.followed && now >= marker.expiresAt) { markers.splice(i, 1); continue; }
                const inView = marker.x >= 0 && marker.x <= canvas.width && marker.y >= 0 && marker.y <= canvas.height;
                if (inView) drawSalvageMarker(ctx, marker, now);
                else drawOffscreenMarker(ctx, { ...marker, shipX: ship.x, shipY: ship.y }, canvas, now);
                if (distanceSquared(marker, ship) <= FIELD_EVENTS.MARKER_CONTACT_RADIUS ** 2) {
                    rewardMarker(marker, ship, level, maxXP, now, spawnXpOrb, PlasmaCell, plasmaCells, showSalvageRewardHint);
                    markers.splice(i, 1);
                }
            }

            for (let i = rewardVisuals.length - 1; i >= 0; i--) {
                const visual = rewardVisuals[i];
                visual.life -= dt;
                if (visual.life <= 0) {
                    rewardVisuals.splice(i, 1);
                    continue;
                }
                drawRewardVisual(ctx, visual);
            }
        }
    };
}
