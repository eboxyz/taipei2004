# Taipei 2004 台北2004

A mobile-browser idle/incremental game set in 2000s Taipei. The mechanics are inspired by Yakuza 0's real estate minigame, but every character, gang and company is original.

## Before you work
- **`docs/design.md` is the source of truth.** Read the sections you're touching. Don't re-propose decisions that are already settled there.
- **Design discussions with the user:** one section at a time, recommendations plus a few questions. Don't recap what the user just decided. Build only when the user says go.

## Hard rules
- **Free tiers only.** No paid services.
- **Gentle game:** no harsh punishments. Losing never costs progress.
- **Mobile first:** portrait layout, 44px minimum tap targets, main actions in the bottom third.
- **Language:** English by default. Pinyin for names. 漢字 for places, crests and impact text. 注音 is decoration only. Players must never need to read Chinese.
- **Fictional names only:** no real gangs, realty brands or people. Search any new name for collisions before using it.

## Tech
- TypeScript, Vite and React.
- One serializable game state, advanced by `tick(state, dt)`. Rendering only reads the state.
- Content (characters, lots, areas, bosses) lives in data files keyed by id. Art is looked up by the same id.
- Saves are local first, with a schema version and migrations.
- Offline progress is calculated in closed form and capped by the safe.

## Art
- **No text in art files.** All text is rendered in code.
- Source art goes in `art/source/<category>/<id>.png`. A processing script makes the final sizes. Missing art shows a placeholder.
- **Codex** generates illustrated art from `art/BRIEF.md` and only writes to `art/source/`.
- **PixelLab** is on the free tier. Use it only for the icons in `art/PIXELLAB.md`, essential ones first.
