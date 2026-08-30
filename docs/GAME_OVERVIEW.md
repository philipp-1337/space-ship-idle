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

### Level and XP rules

The first level requires 5 XP. The XP requirement increases by 5 after every level, so Level `n` requires `5 × n` XP for the next level.

The approximate XP required to reach Level `L` from a fresh flight is:

```text
5 × (1 + 2 + ... + (L - 1))
= 2.5 × L × (L - 1)
```

Every level-up opens the run-upgrade shop and pauses combat until the player chooses an upgrade. The current run level, XP, hull, kills, and collected XP can be autosaved during a flight. A death clears the current flight state.

XP modifiers are additive:

- XP Boost: +5% per rank, up to +25% during the current flight
- XP Resonance: +10% permanently
- Resonance Cascade: another +10% permanently
- Learning Protocol: +20% during Levels 1–5 of every flight

Boss XP orbs are special: collecting one fills the XP bar to the next level instead of granting a fixed XP value.

### Weapon math

The base laser damage is 0.8. Laser upgrades use two growth bands:

- Upgrade Levels 1–20: ×1.10 per level
- Upgrade Levels above 20: ×1.07 per level

Rapid-Fire multiplies the normal laser cooldown by 0.75. Weapon Overdrive multiplies the cooldown by another 0.5 and temporarily multiplies damage by 1.25. Piercing, Explosive Rounds, Chain Lightning, drones, missiles, and Reactor Nova add target coverage or secondary damage on top of the main laser.

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

### Complete Tech Tree reference

The following table reflects the current implementation. Prerequisites are permanent Tech Tree nodes, not run upgrades.

| Node | Cost | Prerequisite | Level gate | Effect |
| --- | ---: | --- | ---: | --- |
| XP Resonance | 5 | — | — | +10% XP from collected orbs. |
| Auto-Fire | 4 | — | — | Automatically fires on desktop; touch devices already fire automatically. |
| Drone | 12 | — | — | Adds one autonomous orbiting drone. |
| Resonance Cascade | 9 | XP Resonance | — | Adds another +10% XP. |
| Rapid-Fire Core | 8 | Auto-Fire | — | Permanently shortens weapon cooldowns. |
| Homing Missiles | 10 | Auto-Fire | — | Fires tracking missiles automatically. |
| Payload Amplifier I–V | 5 / 6 / 7 / 8 / 10 | Previous payload node | 0 / 0 / 15 / 18 / 22 | Each rank adds 1.2 missile damage. |
| Extended Flight Core | 8 | Payload V | 25 | Missiles fly longer and retain targets after losing them. |
| Siege Warhead | 10 | Extended Flight Core | 30 | Adds 25px missile explosion radius. |
| Guidance Array | 10 | Siege Warhead | 35 | Improves missile turning speed. |
| Drone Emitter I–V | 4 / 5 / 6 / 8 / 10 | Previous drone emitter | 0 / 0 / 0 / 15 / 20 | Each rank adds 0.12× base laser damage to drone shots. |
| Twin Drones | 18 | Drone Emitter V | 25 | Adds a second drone opposite the first. |
| Learning Protocol | 8 | XP Resonance | — | Adds +20% XP during Levels 1–5 of each flight. |
| Targeting Matrix | 8 | Auto-Fire + Drone | — | Makes drones prioritize more dangerous nearby targets. |
| Piercing Rounds | 6 | Auto-Fire | — | Allows lasers to pass through enemies. |
| Signal Interference | 12 | Drone Emitter V | 18 | Periodically clears enemy shots and disrupts hostile weapons. |
| Salvage Drive | 6 | XP Resonance | — | Doubles the normal Plasma drop chance from 5% to 10%. |
| Explosive Rounds | 6 | Piercing Rounds | — | Adds splash damage around laser impacts. |
| Twin Missiles | 14 | Payload I | — | Fires two missiles per missile volley. |
| Reactor Nova | 14 | Explosive Rounds | — | Discharges a wide shockwave every 32 kills, subject to cooldown. |

The exact unlock order is not forced by the UI, but XP Resonance followed by Salvage Drive is the strongest economy opening when the goal is to complete the tree quickly.

## Permanent progression: Phase Two — Deep Flight Protocols

After the Tech Tree is complete, the game switches to a second permanent progression layer. Plasma is no longer the endgame currency. Instead, special late-game encounters and milestones generate **Flight Data**.

Flight Data is awarded for:

- Special enemy kills: normally 1 Data (10% drop chance)
- Boss kills: 5 Data (100% drop chance)
- Every 25-level milestone after Tech Tree completion: 10 Data
- Deep Scan doubles Data from special enemies

The Flight Protocols menu is available from the completed Tech Tree, opens from its own HUD button, and pauses the flight while open (like the Pause, Settings, and Tech Tree menus). Protocols are permanent unlocks, but only three can be active in a flight at once. This creates a loadout decision instead of another unlimited damage ladder.

The per-protocol **unlock level** gates *unlocking* only. Flight Data and every unlocked protocol persist through death (they live in their own `localStorage` keys, untouched by the run-state reset). After a death restarts the run at level 1, an already-unlocked protocol can still be activated or deactivated freely — the loadout is always the player's to rearrange; only spending Flight Data on a not-yet-unlocked protocol stays blocked until its level. Each menu row shows an explicit status: Active in loadout / Unlocked · ready / Unlocked · loadout full / Locked until Level X / Needs X Data / Unlockable now.

Current Protocols:

| Protocol | Unlock level | Cost | Effect |
| --- | ---: | ---: | --- |
| Prism Piercer | 35 | 12 Data | Bypasses the first Prism shield hit. |
| Phase Lock | 45 | 14 Data | Shortens Phase Stalker invulnerability windows. |
| Hunter Dampener | 55 | 14 Data | Reduces Hunter dash speed and pressure. |
| Emergency Vector | 35 | 18 Data | Once per flight, survives an otherwise lethal hit at 1 hull. |
| Deep Scan | 45 | 16 Data | Doubles special-enemy Data, but increases special enemies in surges. |

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

### Enemy reference

Regular enemy HP is calculated from the current flight level:

```text
round((base HP + (level - 1) × 0.25) × 1.005^(level - 1))
```

Easy Mode applies a 0.5 HP multiplier. Bosses use a separate, stronger growth curve. Enemy composition and special behavior are intended to provide the main late-game challenge; regular HP growth is deliberately restrained to avoid bullet sponges.

| Enemy | First level | Base HP | Base speed | XP | Behavior |
| --- | ---: | ---: | ---: | ---: | --- |
| Triangle | 1 | 3 | 0.70 | 1 | Fast, light pursuer. |
| Square | 5 | 6 | 0.60 | 3 | Splits into two Triangles on destruction. |
| Pentagon | 10 | 9 | 0.50 | 5 | Splits into two Squares; those Squares split again. |
| Shooter | 18 | 12 | 0.45 | 8 | Pursues while firing regular enemy lasers. |
| Aegis | 25 in surges | 12 | 0.50 | 12 | Takes 25% less damage and charges a homing pulse attack. |
| Prism | 50 | 18 | 0.52 | 16 | Absorbs one damaging hit, then recharges its shield after a delay. |
| Phase Stalker | 80 | 26 | 0.62 | 20 | Periodically becomes untargetable and non-colliding for a short window. |
| Hunter | 125 | 32 | 0.48 | 24 | Fires and performs a high-speed dash when close to the ship. |
| Boss | Every 10 levels | 30 base | 0.40 | — | Large elite with a long-range, telegraphed Death Ray. |

### Spawning and pacing

- Every 1.5 seconds, one main enemy is spawned at the current level.
- From Level 5 onward, each spawn also adds up to three Level-1 Triangle enemies.
- The active enemy population is capped at 90.
- Every five levels, a 24-enemy wave is spawned after the level-up shop.
- Every ten levels, one Boss is spawned after the level-up shop.
- Late-game surges begin at Level 25 after an initial 15-second delay, then repeat every 45 seconds.
- Surge size starts at 8, grows by one every 15 levels, and is capped at 20.
- Surges mix Aegis, regular late-game enemies, and—after their unlock levels—Prism, Phase Stalker, and Hunter enemies.
- Combat pressure checks every 8 seconds and may reposition distant enemies or add one contact when the nearby field is too empty.

Special enemies are intentionally short time-to-kill targets with tactical rules. The intended challenge is target priority, movement, timing, and composition—not simply surviving enemies with enormous HP pools.

## Field events

Long flights can contain sparse salvage signals and route hazards. Following a salvage signal can lead to rewards such as XP, early Plasma, full hull recovery, temporary Overdrive, a temporary Drone Uplink, or a disposable Hull Overcharge. Asteroids and drifting debris alter flight paths without turning the arena into a permanent obstacle field.

## Ship systems and defensive rules

- Normal enemy contact and hostile projectiles damage hull integrity.
- Boss contact deals heavier damage.
- A short invulnerability window follows a registered hit.
- Deflector Charge blocks a hit completely before hull damage is applied.
- Nanite Repair restores hull slowly while damaged.
- Emergency Vector, if active, prevents one lethal hit per flight.

## Progression and balancing reference

The game has two permanent economies and one temporary run economy:

| Economy | Earned from | Persistence | Purpose |
| --- | --- | --- | --- |
| XP | Enemy XP orbs and field events | Current flight only | Level-ups and run upgrades. |
| Plasma Cells | Enemy drops, bosses, early salvage rewards | Permanent | Phase One Tech Tree. Stops dropping after tree completion. |
| Flight Data | Special enemies and deep-flight milestones | Permanent | Phase Two Protocol unlocks. |

This separation is important when adding content:

- New permanent power should not automatically increase raw laser damage forever.
- New late-game enemies should generally introduce a readable counter or decision.
- New Protocols should be useful in specific situations and compete for three loadout slots.
- New Flight Data sources should reward entering dangerous deep flight, not merely idling at a safe level.
- Factory Reset must clear Plasma, Tech Tree, Flight Data, Protocols, and current-flight state while preserving settings/preferences.

The current expected progression landmarks are:

- Level 1–20: establish movement, basic weapons, XP shop choices, and first Tech Tree branches.
- Level 25–50: Aegis and the first late-game enemy roles appear; the Tech Tree approaches completion.
- Level 50+: Phase Two becomes available once the Tech Tree is complete; Prism and the first Protocols enter the game.
- Level 80–125: Phase Stalker, Deep Scan, Hunter, and Hunter Dampener expand the tactical loadout space.
- Level 150+: the game should rely increasingly on special compositions, surges, and challenge protocols rather than only increasing regular HP.

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
