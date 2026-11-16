# Taipei 2004 台北2004

A mobile-browser idle game set in 2000s Taipei. Buy the city one lot at a time, let the income pile up, and take each district from its boss with a crew of business-card characters.

- Design: [`docs/design.md`](docs/design.md)
- Art brief (Codex): [`art/BRIEF.md`](art/BRIEF.md)
- Pixel icons (PixelLab): [`art/PIXELLAB.md`](art/PIXELLAB.md)

Status: milestone 4 (all five Chapter 1 areas, Turf Wars, draws, binder, cash-out, the Face tree and automation) is playable.

## Run it

```sh
npm install
npm run dev          # http://localhost:5173
npm run dev:phone    # also serves on your LAN so you can open it on your phone
npm test             # game logic tests
npm run sim          # full-run pacing simulator (UP=income:4,lot_price:2 HOURS=12 npm run sim)
npm run sim:fights   # Turf War win rates and lengths for typical squads
npm run art          # process art/source into public/art after Codex adds images (maps brief names like east_district → east)
```

In dev builds:
- The **DEV** pill in the top bar cycles game speed 1× → 2× → 4× → 10×. Fights run faster too.
- Office → Dev tools: pretend you were away 1 h / 8 h, +100 Face, +draw currency.
- The browser console has `taipei2004.skip(3 * 3600)` to pretend you were away for 3 hours, plus `taipei2004.state()` and `taipei2004.set(state)`.
