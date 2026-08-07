# Space Ship Idle — Game Overview

Space Ship Idle is a browser-based retro arcade space shooter with idle-inspired progression. The player actively pilots a ship through an endless flight, destroys enemies, collects XP and Plasma Cells, chooses temporary run upgrades, and builds permanent technology between flights.

The game is rendered with Canvas 2D and uses a dark **Night-Flight Console** interface: phosphor-green flight status, scope-cyan technology readouts, amber caution signals, red danger states, and pixel-art gameplay entities.

## Core loop

1. Start a flight from the Pre-Flight Check.
2. Pilot the ship, aim, thrust, strafe, and fire at incoming enemies.
3. Collect XP orbs to fill the current level bar.
4. Choose one run upgrade whenever the ship levels up.
5. Collect Plasma Cells and spend them on permanent Tech Tree upgrades.
6. Survive waves, bosses, late-game surges, field events, and increasingly specialized enemies.
7. If the ship is destroyed, the current flight ends. Permanent Tech Tree progress, Plasma, Flight Data, and Protocol progress remain.

## Run progression

Run upgrades exist only for the current flight. They are offered in the level-up shop and are lost when the flight ends.

Available run upgrade families include:

- Laser Damage: repeatable damage growth with a softer multiplier after the early upgrade levels.
- Magnet: increases XP and Plasma collection range and strength.
- Speed: increases maximum speed and acceleration.
- Hull Integrity: increases maximum hull and fully repairs the ship.
- Nanite Repair: slowly regenerates damaged hull.
- Deflector Charge: blocks one hit and recharges over time.
- Collector Pulse: temporarily pulls nearby XP and Plasma pickups toward the ship.
- Chain Lightning: gives laser hits a chance to arc to a nearby enemy.
- Overdrive Core: extends the temporary Weapon Overdrive window.
- XP Boost: increases XP gained during the current flight.

Weapon Overdrive temporarily increases laser damage and fire rate. It is triggered by selected shop choices and can become more frequent through Overdrive Core.

## Permanent progression: Phase One — Tech Tree

The Tech Tree is the first permanent progression phase. Plasma Cells are collected during flights and saved in `localStorage`, so they survive death and browser reloads.

The current Tech Tree contains 28 one-time upgrades costing 237 Plasma Cells in total. Its branches cover:

- Auto-Fire and Rapid-Fire
- Homing Missiles, payload, endurance, warhead radius, guidance, and twin missiles
- Drones, five drone damage ranks, twin drones, and targeting
- Piercing Rounds and Explosive Rounds
- Signal Interference EMP
- Reactor Nova
- XP Resonance, Resonance Cascade, and Learning Protocol
- Salvage Drive

Several late branch nodes are level-gated. The final current Tech Tree gate is around Level 35. With an efficient purchase order—especially unlocking XP Resonance and Salvage Drive early—the full tree is expected to be completed around Levels 40–50, depending on deaths, XP choices, collection efficiency, and luck.

Once every Tech Tree node has been purchased, new Plasma Cell drops stop. This applies to normal enemies, bosses, missile kills, and salvage markers. Plasma Cells already lying in the flight space can still be collected.

## Permanent progression: Phase Two — Deep Flight Protocols

After the Tech Tree is complete, the game switches to a second permanent progression layer. Plasma is no longer the endgame currency. Instead, special late-game encounters and milestones generate **Flight Data**.

Flight Data is awarded for:

- Special enemy kills: normally 1 Data
- Boss kills: 5 Data
- Every 25-level milestone after Tech Tree completion: 10 Data
- Deep Scan doubles Data from special enemies

The Flight Protocols menu is available from the completed Tech Tree. Protocols are permanent unlocks, but only three can be active in a flight at once. This creates a loadout decision instead of another unlimited damage ladder.

Current Protocols:

| Protocol | Unlock level | Cost | Effect |
| --- | ---: | ---: | --- |
| Prism Piercer | 50 | 12 Data | Bypasses the first Prism shield hit. |
| Phase Lock | 80 | 14 Data | Shortens Phase Stalker invulnerability windows. |
| Hunter Dampener | 125 | 14 Data | Reduces Hunter dash speed and pressure. |
| Emergency Vector | 50 | 18 Data | Once per flight, survives an otherwise lethal hit at 1 hull. |
| Deep Scan | 75 | 16 Data | Doubles special-enemy Data, but increases special enemies in surges. |

The Protocol layer is intended to extend the life of the game without making every late-game enemy a large HP target. Protocols mostly counter enemy behaviors, improve survival, or trade higher risk for better progression.

## Enemies and combat escalation

Regular enemies become available progressively:

- Triangle: light pursuer, available from Level 1
- Square: tougher splitter, available from Level 5
- Pentagon: heavy splitter, available from Level 10
- Shooter: ranged enemy, available from Level 18
- Aegis: shielded late-game enemy with a telegraphed homing pulse
- Prism: first appears at Level 50 and absorbs an initial hit with a recharging shield
- Phase Stalker: first appears at Level 80 and periodically becomes untargetable and non-colliding
- Hunter: first appears at Level 125 and performs a fast attack dash at close range
- Boss: appears every 10 levels with a telegraphed, tracking Death Ray

Pentagons and Squares split into additional enemies when destroyed. Enemy waves occur at regular level milestones, while late-game surges add timed pressure and specialized enemy compositions. The active enemy population is capped to protect readability and performance.

## Field events

Long flights can contain sparse salvage signals and route hazards. Following a salvage signal can lead to rewards such as XP, early Plasma, hull recovery, temporary Overdrive, a temporary Drone Uplink, or a disposable Hull Overcharge. Asteroids and drifting debris alter flight paths without turning the arena into a permanent obstacle field.

## Ship systems and defensive rules

- Normal enemy contact and hostile projectiles damage hull integrity.
- Boss contact deals heavier damage.
- A short invulnerability window follows a registered hit.
- Deflector Charge blocks a hit completely before hull damage is applied.
- Nanite Repair restores hull slowly while damaged.
- Emergency Vector, if active, prevents one lethal hit per flight.

## Controls

### Desktop

- `W` / `S`: forward / reverse thrust
- `A` / `D`: turn left / right
- `Q` / `E`: strafe left / right
- `Space`: fire
- `T` / `3`: Tech Tree
- `P` / `1`: Pause
- `O` / `2`: Settings
- `Escape`: close the active menu or pause screen

Menus support arrow keys or `W`/`A`/`S`/`D` navigation, plus `Enter` and `Space` for confirmation.

### Mobile

Firing is automatic on touch devices. One-Handed is the default scheme:

- One-Handed: the left stick selects the movement direction and turns the ship toward it; the ship flies forward in that direction.
- Twin-Stick: the left stick aims/turns, while the right stick controls forward/reverse thrust and optional strafe.
- One-Handed can also use the right stick for additional thrust and strafe.

## Persistence and reset behavior

The game stores permanent progression in browser `localStorage`:

- Tech Tree upgrades
- Plasma Cells
- Flight Data
- Flight Protocol unlocks and active loadout
- Current-flight autosave
- Settings and preferences

Factory Reset clears gameplay progress, including Tech Tree, Plasma, Flight Data, Protocols, and current-flight state. Settings and preferences are preserved.

## Design intent

The game has two different progression questions:

- **Phase One:** How do I unlock the ship's permanent technology?
- **Phase Two:** Which tactical Protocol loadout helps me survive and exploit the deep flight?

The first phase builds power. The second phase should create choices, counters, risk, and mastery without relying only on larger numbers.
