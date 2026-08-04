# Space Ship Idle

Space Ship Idle is a browser-based retro arcade space shooter with idle/progression systems. The player pilots a ship through increasingly dangerous waves, collects XP and Plasma, buys run upgrades, and unlocks permanent technology between flights.

The game is written in vanilla JavaScript, rendered with the Canvas 2D API, and bundled with Vite. The interface follows the project's **Night-Flight Console** design language: a dark cockpit instrument panel with phosphor-green status lights, scope-cyan technology readouts, chamfered console panels, and pixel-art gameplay entities.

See [DESIGN.md](./DESIGN.md) for the visual system and interaction principles. Agent and automation instructions live in [AGENTS.md](./AGENTS.md).

## Features

- Canvas-based space combat with player lasers, enemy projectiles, bosses, missiles, drones, explosions, and screen effects.
- XP progression: collect XP orbs, level up, and choose run-specific upgrades from the level-up shop.
- Plasma progression: collect Plasma Cells and spend them in the permanent Tech Tree.
- Tech Tree branches for automated fire, drones, missiles, targeting, piercing and explosive rounds, EMP-style signal interference, Reactor Nova, salvage, and several XP improvements.
- Defensive systems including Hull Integrity, Nanite Repair, and Deflector Charge.
- Weapon and utility upgrades including Magnet, Collector Pulse, Chain Lightning, Weapon Overdrive, and incremental XP gain.
- Normal and Easy difficulty modes. Normal is the default Pre-Flight selection.
- Desktop keyboard controls, mouse interaction, and mobile touch controls with automatic firing.
- Mobile twin-stick controls: the left stick turns/aims only; the right stick controls forward/reverse thrust and strafing.
- Keyboard-accessible menus and modals with spatial arrow-key navigation, W/A/S/D navigation, Enter/Space confirmation, visible selection feedback, and hover audio feedback.
- Audio feedback for UI interaction, level-up moments, tech unlocks, shields, lasers, drones, explosions, and game over.
- PWA support and Firebase hosting configuration.

## Controls

### Desktop

- `W` / `S`: forward / reverse thrust
- `A` / `D`: turn left / right
- `Q` / `E`: strafe left / right
- `Space`: fire
- Menus: arrow keys or `W`/`A`/`S`/`D` to navigate; `Enter` or `Space` to confirm

### Mobile

- Left thumb: turn and aim the ship without applying thrust
- Right thumb, up/down: forward / reverse thrust
- Right thumb, left/right: strafe
- Firing is automatic on touch devices

After the mobile control redesign, existing mobile players see a one-time acknowledgement notice. The temporary notice is versioned in `src/ui.js` and can be removed later as a self-contained cleanup.

## Development

Install dependencies:

```sh
npm install
```

Start the Vite development server:

```sh
npm run dev
```

The development server normally runs at [http://localhost:3001](http://localhost:3001). Use the URL printed by Vite if the port is occupied.

Create a production build:

```sh
npm run build
```

Preview the production build locally:

```sh
npm run preview
```

Create the distributable archive:

```sh
npm run zip
```

`npm run zip` builds the app and creates `dist/game.zip`.

## Deployment

The project contains Firebase configuration in [firebase.json](./firebase.json). A deployment consists of a production build followed by Firebase deployment:

```sh
npm run build && firebase deploy
```

Agents may offer this command, but must only execute it after the user explicitly confirms the deployment. It should be executed at most once for that request; do not retry or deploy again without a new confirmation.

## Project structure

```text
.
├── public/                  Static assets: audio and app icons
├── src/
│   ├── main.js              Game bootstrap, loop integration, movement, lifecycle
│   ├── gameLoop.js          Per-frame combat, spawning, collection, and progression
│   ├── input.js             Keyboard, mouse, joystick, and mobile maneuver input
│   ├── ui.js                HUD, menus, modals, Tech Tree, and notifications
│   ├── upgrades.js          Run upgrades, permanent tech, persistence, and XP math
│   ├── enemy*.js             Enemy definitions, spawning, waves, lasers, and bosses
│   ├── ship.js               Player ship state, damage, shields, repair, and drawing
│   ├── collectibles.js       XP, Plasma, tractor items, magnets, and collection effects
│   ├── effects.js            Particles, screen effects, stars, and performance limits
│   ├── audio/                Audio service and sound configuration
│   ├── constants.js          Gameplay, physics, visual, and mobile-control constants
│   ├── runState.js           Current-run persistence and autosave handling
│   └── sw.js                 PWA service worker source
├── DESIGN.md                Visual and interaction design system
├── AGENTS.md                Instructions for coding agents
├── firebase.json             Firebase Hosting/Firestore deployment configuration
├── index.html                Application shell
├── package.json              Scripts and dependencies
└── vite.config.js            Vite and PWA build configuration
```

## Persistence

The game uses browser `localStorage` for permanent Tech Tree progress, Plasma, difficulty/settings, current-run autosaves, and temporary release acknowledgements. A factory reset is available from Settings and clears the relevant game data.

## Contribution notes

Keep the application UI and player-facing copy in English. Preserve the visual language in [DESIGN.md](./DESIGN.md), keep gameplay entities pixel-art based, and use the existing `AudioManager` for new sound feedback. Before handing off a change, run `npm run build`, inspect the diff, and create a focused Git commit. See [AGENTS.md](./AGENTS.md) for the complete agent workflow.
