---
name: Space Ship Idle
description: A night-flight cockpit instrument panel for a retro arcade shooter — phosphor-green gauges glowing against a black void.
colors:
  void: "#000000"
  panel: "#0a0d0c"
  panel-raised: "#101512"
  hairline: "rgba(120,255,170,0.28)"
  hairline-dim: "rgba(120,255,170,0.14)"
  scrim: "rgba(2,4,3,0.86)"
  phosphor: "#39ff6a"
  phosphor-dim: "rgba(57,255,106,0.65)"
  scope: "#7fe8ff"
  scope-dim: "rgba(127,232,255,0.65)"
  caution: "#ffb000"
  danger: "#ff3b30"
  gold: "#ffd23f"
  text-primary: "#e8fff0"
  text-dim: "rgba(232,255,240,0.62)"
typography:
  numeral:
    fontFamily: "'IBM Plex Mono', 'SF Mono', 'Consolas', monospace"
    fontSize: "11px"
    fontWeight: 600
    letterSpacing: "normal"
  label:
    fontFamily: "'IBM Plex Mono', 'SF Mono', 'Consolas', monospace"
    fontSize: "9px"
    fontWeight: 400
    letterSpacing: "0.14em"
  title:
    fontFamily: "'IBM Plex Mono', 'SF Mono', 'Consolas', monospace"
    fontSize: "20px"
    fontWeight: 600
    letterSpacing: "0.08em"
  body:
    fontFamily: "'IBM Plex Mono', 'SF Mono', 'Consolas', monospace"
    fontSize: "13px"
    fontWeight: 400
    letterSpacing: "normal"
rounded:
  dial: "50%"
  chamfer-sm: "6px"
  chamfer-md: "8px"
  chamfer-lg: "20px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.phosphor}"
    textColor: "{colors.void}"
    rounded: "{rounded.chamfer-md}"
    padding: "12px 26px"
  button-danger:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.danger}"
    rounded: "{rounded.chamfer-md}"
    padding: "12px 26px"
  button-accent:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.scope}"
    rounded: "{rounded.chamfer-md}"
    padding: "8px 20px"
  button-row-idle:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.phosphor}"
    rounded: "{rounded.chamfer-md}"
    padding: "14px 18px"
  button-row-engaged:
    backgroundColor: "{colors.phosphor}"
    textColor: "{colors.void}"
    rounded: "{rounded.chamfer-md}"
    padding: "14px 18px"
---

# Design System: Space Ship Idle

## Overview

**Creative North Star: "Night-Flight Console"**

The HUD reads as an actual cockpit instrument panel, not a themed dashboard. You're not glancing at floating pills — you're cross-checking a glass panel at night with nothing outside the canopy but the void: round tick-marked dial gauges with damped needles, hard-edged chamfered (cut-corner) console panels, backlit-legend switches instead of solid pill buttons, and annunciator lamps that stay dark until something is genuinely wrong. A thin scanline + vignette overlay sits over the whole viewport, like looking through cockpit glass.

The color system is literalized as real annunciator-panel convention: phosphor green means normal/go/life, amber means anticipatory caution, red means true danger or a destructive action, and gold marks a target of opportunity (the elite scanner). Nothing lights up amber or red unless it means it — that restraint is the point.

The procedural pixel-art ship/enemy/pickup sprites (`makePixelSprite`) and all gameplay-signal colors (laser, magnet, XP, elite, plasma-pickup — see `src/constants.js` `COLORS`) are a separate, untouched layer beneath this HUD redesign; this system governs chrome only.

Anti-reference: no rounded glass pills, no glassmorphism panels, no glossy bevels or skeuomorphic chrome (a real embossed-toggle console was considered and rejected for exactly this reason), no flat "clean vector sci-fi" corporate dashboard look.

**Key Characteristics:**
- Near-black gunmetal panels with a chamfered (cut-corner) silhouette everywhere a rounded corner used to be — the one exception is the circular instrument dials themselves.
- Colored glow is still the system's only depth signal (no neutral drop-shadows), but it's now read as a *backlit legend* — an annunciator lamp or an illuminated switch — rather than a decorative halo.
- Round tick-marked dial gauges with a damped-needle settle animation for Level and Plasma, backed by a real tabular-mono digital sub-readout.
- IBM Plex Mono is used everywhere: numerals, labels, titles, body copy. It's the first typeface this project has deliberately chosen (previously an open gap).
- Modals are centered chamfered console panels with a dark scrim behind them, not full-viewport flush-top sheets — this supersedes the old Flush-Top Modal Rule.

## Colors

Functional-first, like before, but the mapping is now literalized as real instrument/annunciator convention: each hue is a status, not a brand accent.

### Primary
- **Phosphor Green** (`#39ff6a`): the "alive" HUD color — dial gauges, needles, tick marks, XP tape fill, the pause toggle icon, and every "go/confirm/engaged" button state (Resume, Restart-on-game-over, unlocked tech-tree rows). Reads as "normal, systems nominal."

### Secondary
- **Scope Cyan** (`#7fe8ff`): the secondary/tech register — Plasma dial, Tech Tree button and modal, available (not-yet-purchased) tech-tree rows. Distinct from Phosphor Green so "life/progress" and "tech currency" stay visually separate, same distinction the old Bio Green/Aqua Solid split made.

### Tertiary
- **Caution Amber** (`#ffb000`): anticipatory warnings only — currently just the enemy-wave annunciator ("Caution — Enemy Wave Incoming"). This is a semantic change from the old system, which used red for this; amber is reserved for "heads up, not yet critical," keeping red exclusively for actual danger.
- **Danger Red** (`#ff3b30`): true danger or a destructive action — the pause-menu Restart button, the mobile fire button, the Systems Failure (game-over) panel. Never used for anticipatory states.
- **Target Gold** (`#ffd23f`): a target of opportunity, not a threat — used for the Weapon Overdrive annunciator ("Weapon Overdrive Engaged") and the XP tape/pickup color. No longer tied to the boss/elite enemy, which now reads as a real threat (Danger Red aura, see gameplay layer) rather than an opportunity.

### Neutral
- **Void** (`#000000`): canvas background, and the text color inside every "engaged" filled button (dark legend on a lit switch).
- **Panel** (`#0a0d0c`): the base fill for every console surface — dials, buttons, modals, HUD chips. Near-black with a faint green cast rather than true neutral black.
- **Panel Raised** (`#101512`): hover/highlighted row state, and the dial face's inner gradient stop.
- **Hairline** (`rgba(120,255,170,0.28)`) / **Hairline Dim** (`rgba(120,255,170,0.14)`): the 1px borders and dividers that replace the old system's near-total absence of borders — an instrument panel has real seams. Hairline for structural borders, Hairline Dim for internal row dividers.
- **Scrim** (`rgba(2,4,3,0.86)`): the full-viewport backdrop behind every modal.
- **Text Primary** (`#e8fff0`) / **Text Dim** (`rgba(232,255,240,0.62)`): pale green-white rather than pure white, matching the phosphor-lit read of the whole panel. Dim is used for secondary copy and captions; both pass 4.5:1 against Panel.

### Named Rules
**The Annunciator Rule.** A color only appears when its status is true. Amber and red are never decorative — if nothing amber or red is lit, nothing needs your attention. This replaces the old "One Meaning, One Hue" rule with a stricter version: same idea, but grounded in literal instrument-lamp behavior instead of abstract brand-color assignment.

## Typography

**Numeral / Label / Title / Body Font:** IBM Plex Mono (with `'SF Mono', 'Consolas', monospace` fallback), loaded from Google Fonts in `index.html`. One family, used everywhere — display, labels, buttons, body copy, and modal titles — differentiated by size, weight, and tracking rather than a second face. This is the project's first deliberate typeface choice; previously every element rendered in the browser's default UI font.

**Character:** technical and legible first — every use is genuine data, measurement, or a control's own label (dial readouts, plasma/level counts, upgrade costs, button legends), never a "technical" costume on prose.

### Hierarchy
- **Title** (600, 20px, 0.08em tracking, uppercase): modal headers (Flight Paused, Tech Tree, Systems Failure, Upgrade Available).
- **Numeral** (600, 11px, tabular figures): dial sub-readouts (Level, Plasma count), stat values in the pause-menu table.
- **Body** (400, 13px): stat rows, modal descriptions, restart copy.
- **Label** (400, 9px, 0.14em tracking, uppercase): dial captions ("LEVEL", "PLASMA"), the XP tape's "XP" mark, annunciator and row-cost text.

### Named Rules
**The Real-Data Rule.** Monospace is only ever attached to a number, a measurement, or a control's own legend — never dropped onto prose to signal "technical."

## Layout

No conventional page layout: the canvas fills the viewport as before. The HUD is now a fixed instrument cluster rather than scattered corner chips: a Level dial + Pause + Settings icon buttons grouped top-left, and a mirrored Tech Tree icon button + Plasma dial grouped top-right (same small 32px icon-button footprint as Pause/Settings, sitting beside the dial rather than stacked below it), with a thin XP tape spanning the full top edge beneath both. Modals are centered chamfered console panels (`min(92vw, 420–560px)` depending on content) over a full-viewport scrim — a deliberate departure from the old system's full-bleed, flush-top sheets.

**Responsive strategy is unchanged and still capability-based, not width-based.** `_isMobile` is detected via touch capability, and every HUD dimension — including, as of this pass, the fixed corner *offsets* themselves, not just element sizes — is scaled by `MOBILE.UI_SCALE_FACTOR` (1.8) so the instrument cluster doesn't collide with itself at the larger mobile scale. Touch controls (joystick + fire button) remain additive UI confined to the bottom `40vh`, reskinned to the same hairline/phosphor/danger materials as the rest of the console but keeping their circular touch-target shape for ergonomics.

## Elevation & Depth

Still no neutral elevation shadows. Depth and status are conveyed through colored glow, but the glow now reads as backlit instrumentation rather than a decorative halo: a dial's resting glow, a button's backlit-legend border, an annunciator's lamp-flash. Modal panels are the one place a real (small, dark, offset) drop shadow is layered underneath the glow, giving them physical lift over the scrim in addition to their accent-colored halo.

### Shadow (Glow) Vocabulary
- **Dial glow** (`0 0 6px 0 <role-dim>`, inset `0 0 10px 1px rgba(0,0,0,0.6)`): resting glow on the Level/Plasma dial faces, role-tinted.
- **Button backlit glow** (`0 0 6px 0 <glow>` idle → `0 0 18px 3px <glow>` hover, `0 0 14px 2px <glow>` engaged): every console button's border-glow.
- **Modal glow** (`0 0 36px 2px <accent>33, 0 4px 24px 0 rgba(0,0,0,0.6)`): accent-tinted halo plus a real offset shadow for panel lift.
- **XP tape fill glow** (`0 0 10px 1px <phosphor-dim>`): leading-edge glow on the tape fill.
- **Annunciator glow** (`0 0 16px 1px <role>66`, plus a 1s opacity flash keyframe): the wave-caution and elite-contact toasts.

### Named Rules
**The Backlit-Legend Rule.** A zero-offset colored glow is only earned when it represents a real backlit instrument (a lit switch, an annunciator lamp, a gauge face) — never a generic "lifted card" effect. Where a surface needs real physical lift (a modal over the scrim), pair the glow with an actual offset shadow.

## Shapes

**Chamfered (cut-corner) panels replace rounded corners system-wide.** Every console surface — buttons, HUD chips, modal panels, annunciator toasts — is clipped with an 8-point polygon that cuts a flat diagonal at each corner (6px small controls, 8px buttons/rows, 20px modal panels, scaled by the mobile multiplier), rather than a border-radius curve. This is the system's new signature silhouette, replacing the old rounded-pill/32px-modal-radius language entirely.

The one exception is the instrument dials themselves, which are true circles (`border-radius: 50%`) — the one place a curved form is earned, because it's a literal gauge face.

Borders are now a first-class part of the system (the old system used almost none): every panel carries a 1px hairline border in its role color, at low opacity when idle and full color when a button is in its "engaged" state.

### Named Rules
**The Chamfer Rule.** Corners are cut, not curved. A `border-radius` on a console surface is a regression to the old world; use `clip-path` chamfering instead. Dial gauges are the sole exception.

## Components

### Instrument Dial (signature component)
The Level and Plasma readouts: a circular panel face with 12 tick marks (major ticks at 12/4/8 o'clock), a glowing needle, a center hub, and a tabular-mono digital sub-readout beneath the needle, captioned below the dial in tracked small caps. The needle isn't a literal value sweep — Level and Plasma are unbounded counters — it performs a "systems nominal" settle flourish (a quick sweep and damped return) on every update, backed by the real digital number doing the actual reporting. This mirrors how real instruments often pair an analog needle with a digital sub-counter (e.g. an altimeter's drum readout).

### Console Button
- **Shape:** chamfered rectangle (8px cut corners, scaled).
- **Idle (backlit-legend):** dark panel background, 1px border and text in the role color, soft resting glow. This is the default state for Danger, Accent, and not-yet-purchased tech-tree rows.
- **Engaged (filled):** solid role-color background, void-black text, stronger glow. Used for confirmed/primary actions (Resume, Restart-on-game-over) and purchased tech-tree upgrades — the same visual grammar as a real lit rocker switch versus an unlit one.
- **Hover / Focus:** idle buttons intensify their glow on hover without changing fill (keeping the idle/engaged distinction meaningful); a global `button:focus-visible` rule (2px Phosphor Green outline, 3px offset) covers keyboard focus everywhere.

### XP Tape
A thin (14px) instrument strip spanning the full top edge, ticked every 10% like a real tape gauge, with a flat Phosphor Green fill (no gradient) and a leading-edge glow. Replaces the old rounded, gradient-filled progress pill.

### Console Panel Modal
A centered chamfered panel (20px cut corners) over a full-viewport scrim, used for the shop, pause menu, tech tree, and game-over screen. Opens with a title bar (tracked-caps heading + a role-colored status lamp) and a hairline divider before its content. Replaces the old full-bleed, flush-top-only sheet.

### Annunciator Toast
A small chamfered panel with a pulsing status lamp and tracked-caps message, used for the wave-incoming caution (amber) and elite-contact scanner (gold). Shares its lamp + chamfer language with the modal title bar's status dot, so the whole system reads as one instrument vocabulary.

### Touch Controls
Joystick base and fire button keep their prior circular shape and position (touch ergonomics are a genuine exception to the Chamfer Rule) but are reskinned into the new material language: hairline phosphor-green ring + crosshair ticks for the joystick base, hairline danger-red ring for the fire button with a filled/glowing "engaged" state on press — the same idle/engaged switch language as the Console Button family.

## Do's and Don'ts

### Do:
- **Do** clip new console surfaces with the chamfer `clip-path`, not `border-radius` — the one exception is a genuine circular gauge face (**The Chamfer Rule**).
- **Do** keep amber and red strictly status-true: amber for anticipatory caution, red for real danger or destructive actions, never decorative (**The Annunciator Rule**).
- **Do** route all new HUD text through IBM Plex Mono, and only reach for it because the content is a number, measurement, or control legend (**The Real-Data Rule**).
- **Do** scale both element sizes *and* fixed position offsets through `MOBILE.UI_SCALE_FACTOR` — a size-only scale was the source of a real collision bug in this pass (the Level dial grew past the pause button's fixed offset).
- **Do** route new game-entity art through `makePixelSprite`/`drawPixelSprite`, and leave gameplay-signal colors (`src/constants.js` `COLORS`) alone — this redesign is chrome-only by design.
- **Do** give an "engaged" (filled, void-text) state to any new confirm/unlocked control, distinct from the default backlit-outline idle state.

### Don't:
- **Don't** bring back rounded pills, glassmorphism, or a flush-top full-bleed modal — those belong to the previous world and were deliberately replaced.
- **Don't** add glossy gradients, embossed bevels, or skeuomorphic chrome — a rendered-console (CD-ROM-chrome-style) direction was explicitly considered and rejected for this reason.
- **Don't** use red for anticipatory/warning states — that's Caution Amber's role now; red is reserved for true danger and destructive actions.
- **Don't** introduce a second display typeface as a side effect of an unrelated task — IBM Plex Mono is now the system's one deliberate choice.
- **Don't** add a neutral gray "lifted card" shadow; every glow must represent a real backlit instrument, and physical lift (where needed) pairs it with a real offset shadow (**The Backlit-Legend Rule**).
