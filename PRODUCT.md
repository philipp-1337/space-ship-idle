# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The developer themself and friends — a personal hobby project, not currently aimed at a broad public audience. It uses a mobile-friendly touch control scheme and is structured for possible future distribution to itch.io/Newgrounds (per README), but that is not the current goal.

## Product Purpose

Space Ship Idle is a top-down arcade space shooter built on HTML5 Canvas (Vite, vanilla JS). The player pilots a ship, dodges and fights waves of enemies, collects XP and plasma cells, and spends them on ship upgrades and a tech tree. Success is a satisfying, escalating combat loop across a session — surviving longer, unlocking stronger upgrades, and reaching tougher elite enemies/waves.

## Positioning

An active, hands-on arcade shooter with idle-game-flavored progression layered on top: "idle" refers to unlockable automation (e.g. auto-shoot via the tech tree), not offline/away progress. The player is always actively flying and fighting — this is not a true incremental/clicker game with progress while the tab is closed.

## Operating Context

- Runs in the browser via Vite dev server (`npm run dev`, localhost:3001) and builds to a static `dist/` bundle (`npm run build`, `npm run zip` for itch.io/Newgrounds-ready packaging).
- Rendered on an HTML5 `<canvas>` with DOM overlays for HUD/menus (XP bar, level display, plasma display, pause menu, game-over screen, shop modal, tech-tree modal).
- Supports both keyboard/mouse (desktop) and an on-screen joystick + shoot button (mobile touch), with a mobile UI scale factor for legibility.
- Core loop: move/aim → shoot enemies → collect XP (levels/experience bar) and plasma cells (tech-tree currency) → spend in shop/tech tree → face elite enemies and enemy waves at level milestones.

## Capabilities and Constraints

- Confirmed mechanics: ship movement/physics (acceleration, friction, rotation), laser weapons, homing missiles, plasma weapon, XP leveling, plasma-cell currency, shop upgrades, tech tree upgrades (including auto-shoot, auto-aim), elite enemies (every 10 levels), enemy waves (every 5 levels), pause/resume, game over/restart.
- Persistence: tech upgrades and plasma count are saved (loadTechUpgrades/saveTechUpgrades, loadPlasmaCount/savePlasmaCount) — likely localStorage-based; no account/login system.
- Firebase project config and Firestore rules exist in the repo but their role (hosting only vs. data) is unconfirmed — treat as undecided/unused for product decisions until confirmed.
- **Player-facing text language: target is English going forward.** The shop/tech-tree UI currently has German player-facing copy (e.g. "Kosten", "Freigeschaltet") left over from earlier development; this is known debt to migrate, not the intended target language. Code comments may remain mixed-language; that's a separate, lower-priority concern.

## Evidence on Hand

None on hand (no testimonials, case studies, or press — none should be fabricated). Sprite/sound/font/shader assets exist under `public/` but were not inventoried in depth during this init pass.

## Product Principles

- Keep the core loop active and skill-based; automation (auto-shoot/auto-aim) is an unlockable convenience layered on top, never a replacement for active play.
- Escalation should feel readable: level-ups, elite enemies, and waves are the pacing beats future UI/UX and balancing work should reinforce, not obscure.
- Player-facing copy should be in English; don't introduce new German player-facing strings.
- This is a personal/hobby project — favor decisions that keep it fun and shippable over ones that assume a large live audience or monetization.

## Accessibility & Inclusion

No product-specific accessibility requirement established yet.
