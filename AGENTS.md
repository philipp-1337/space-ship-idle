# Agent Instructions

These instructions are intentionally vendor-neutral and apply to Codex, Claude, Gemini/Antigravity, and other coding agents working in this repository.

## Project context

Space Ship Idle is a vanilla JavaScript/Vite Canvas 2D space shooter. It has two progression layers:

- Run progression: XP orbs, level-up shop upgrades, ship survival, and the current-flight autosave.
- Permanent progression: Plasma Cells and the Tech Tree, including combat, drone, missile, defensive, utility, and XP branches.

The app is English-only. Keep player-facing copy in English unless the user explicitly requests another language.

Read and use [docs/GAME_OVERVIEW.md](./docs/GAME_OVERVIEW.md) as the gameplay and progression reference before changing enemies, spawning, level/XP rules, run upgrades, Tech Tree nodes, Plasma, Flight Data, Flight Protocols, persistence, or balancing. Keep its formulas, tables, phase descriptions, and development context aligned with the shipped implementation.

## Design authority

Read and follow [DESIGN.md](./DESIGN.md) before changing UI, HUD, menus, modals, touch controls, visual effects, or player-facing interaction copy.

The current visual direction is the **Night-Flight Console**: near-black cockpit surfaces, phosphor green for nominal/confirm states, scope cyan for technology, amber for caution, red for true danger, gold for opportunity, IBM Plex Mono, chamfered console panels, and circular instrument dials. Do not introduce generic rounded cards, glassmorphism, decorative gradients, or unrelated visual language.

## Standard workflow

1. Inspect the relevant implementation and existing user changes before editing.
2. Make the smallest coherent change that solves the request. Preserve unrelated work in a dirty working tree.
3. Keep modules focused and use existing services and constants. Route audio through `AudioManager`; do not instantiate ad-hoc audio playback.
4. Keep desktop and mobile behavior in sync where the feature applies to both. For mobile input, remember that the left stick turns/aims only and the right stick handles thrust and strafe.
5. Run the appropriate verification, at minimum `npm run build` for application changes.
6. For every player-visible feature or bug fix, update the semantic application version according to the Versioning Policy before committing.
7. Inspect `git diff`, run `git diff --check`, and create a focused commit.
8. Report the commit hash, version change, verification result, and any limitations.

## Git policy

- Always create a Git commit after completing a requested repository change. Do not ask the user whether a commit should be made; committing is part of the normal workflow.
- Use a concise, descriptive commit message focused on the user-visible change.
- Never push, pull, fetch, open a pull request, or otherwise contact a remote repository unless the user explicitly requests that separate operation. In particular, never run `git push` automatically.
- Do not rewrite history, reset, checkout away, or delete user changes. Ask before any destructive Git operation.
- Do not bundle unrelated existing changes into the commit. If unrelated changes make a clean focused commit impossible, explain the boundary and commit only the requested files when safe.

## Versioning policy

Semantic versioning is mandatory for player-visible application changes. Once the HUD version display is implemented, that displayed version is the release identifier shown in the lower-left HUD beside the FPS counter and must be kept in sync with the shipped behavior.

- Patch (`0.1.1`): bug fixes, balancing adjustments, copy corrections, and small non-breaking polish.
- Minor (`0.2.0`): new player-facing features, upgrades, enemies, controls, or meaningful UI additions.
- Major (`1.0.0`): incompatible or fundamental changes to the game's public behavior or progression model.

Use the canonical `version` field in `package.json` as the version source; do not invent a second independent version number. If that field and the HUD display do not exist yet, implement them together before the first versioned player-facing release. A version bump is not required for internal refactors, tests, documentation-only changes, or other changes with no player-visible effect. Do not auto-increment the version for every Git commit, and do not derive semantic meaning from a commit hash. If the release impact is ambiguous, choose the smallest reasonable increment and mention the decision in the handoff.

Every versioned release must also add a concise, player-facing entry to the in-game changelog in `src/ui.js`. Keep the changelog updated in the same commit as the version bump; a SemVer change without a corresponding changelog entry is incomplete.

## Build, test, and deployment

Available scripts are defined in `package.json`:

```sh
npm run dev
npm run build
npm run preview
npm run zip
```

For a deployment, an agent may offer:

```sh
npm run build && firebase deploy
```

This command must not run automatically. It may be executed exactly once only after the user explicitly confirms the deployment in the current conversation. Do not retry it, split it into additional deploy attempts, or run it again without a new confirmation. Report command output and failures accurately. A deployment confirmation does not authorize Git push.

## Code and architecture guidance

- `src/main.js` owns bootstrap, lifecycle, movement integration, and coordination between systems.
- `src/gameLoop.js` owns per-frame gameplay orchestration.
- `src/input.js` owns keyboard, mouse, and touch input state; keep input semantics separate from physics where practical.
- `src/ui.js` owns HUD, menus, modal focus/navigation, Tech Tree presentation, and notices.
- `src/upgrades.js` owns run upgrades, permanent tech state, persistence helpers, and XP modifiers.
- `src/constants.js` is the source of truth for tunable gameplay, physics, effect, and touch values.
- `src/audio/AudioManager.js` and `src/audio/audioConfig.js` are the source of truth for sound playback and sound registration.
- `src/runState.js` owns current-run persistence and autosave suppression.
- Prefer existing DOM helpers and navigation utilities in `src/ui.js` for new menus. New actionable controls must support pointer and keyboard activation where applicable.
- Tech Tree prerequisites, costs, descriptions, and labels must remain consistent between `src/upgrades.js` and `src/ui.js`.
- Keep performance-sensitive loops bounded. Preserve the XP-particle limits, spatial-grid usage, and guarded magnet behavior unless the user specifically asks to change them.
- Avoid adding dependencies for small tasks. If a dependency is necessary, explain why and verify the build.

## Input and accessibility expectations

- Menus and modals must provide visible selection/focus feedback.
- Support arrow-key navigation and W/A/S/D where spatial navigation is used; support both Enter and Space for confirmation.
- Keyboard selection should trigger the same hover feedback, including UI hover audio where the existing component does so.
- Touch hit zones must not swallow HUD buttons or modal interaction. Preserve the reserved HUD strip and modal z-index relationships in `src/constants.js`.
- Player-facing control instructions must describe the actual current behavior, including the mobile left/right stick split.

## Persistence and compatibility

- Treat existing `localStorage` keys and saved run/Tech Tree data as compatibility-sensitive.
- Add migrations or defensive defaults when introducing persisted fields.
- Version temporary acknowledgement notices with a dedicated key/version and keep their removal straightforward.
- Do not clear or overwrite player progress as part of a normal feature change.

## Documentation expectations

- Keep [README.md](./README.md) accurate when scripts, controls, deployment, major systems, or project structure change.
- Keep [DESIGN.md](./DESIGN.md) as the visual and interaction reference. Update it only when the design system itself changes, not for every implementation detail.
- Keep [docs/GAME_OVERVIEW.md](./docs/GAME_OVERVIEW.md) as the authoritative gameplay-development reference. Whenever a change modifies a documented enemy, spawn rule, level/XP formula, run upgrade, Tech Tree node, Plasma economy, Flight Data reward, Flight Protocol, persistence rule, or balancing assumption, update this document in the same commit.
- When adding a new gameplay system, enemy, upgrade, progression phase, or persistent field, document its purpose, current values, unlock conditions, interactions, and reset/persistence behavior before handoff. Documentation drift is incomplete work even when the code is functional.
- If a change affects a temporary release notice, mention its key/version and removal path in the relevant documentation or commit summary.

## Final handoff

The final response should be concise and include:

- What changed.
- Verification performed, especially the build command and result.
- The commit hash.
- Any known limitation or manual test still worth performing.

Do not claim that a deployment, push, or manual device test occurred unless it actually did.
