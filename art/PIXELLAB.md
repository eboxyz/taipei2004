# PixelLab Prompts (Claude runs these after the restart)

**Budget:** free tier only. Third-party sources put it at about 40 generations, then a few per day; check the real limit when the tool loads. There are 26 icons below, which leaves roughly 14 retries, so generate the **essential** icons first.

**Look:** LED-sign pixel pictograms. Pixel art appears only where 2000s Taipei really had pixels: LED shop signs, arcade screens and flip-phone displays.

## Shared style
> Pixel art icon in the style of a glowing LED dot-matrix shop sign from 2000s Taipei. A simple bold pictogram made of bright LED-colored pixels (red `#FF3B30`, amber `#FFB000`, green `#3DFF6E`, cyan `#2EF0FF`, pink `#FF3EA5`, white) on a dark rounded panel (`#120C2E`). Subtle glow. No text, no letters, no numbers. Centered, readable at small size.

- **Size:** 32×32 (try 48×48 if 32 loses detail). Displayed at whole-number scales.
- **Background:** transparent outside the rounded panel.
- **Save to:** `art/source/lots/<id>.png` and `art/source/events/<id>.png`.

## Lot icons (`lots/<id>.png`)

| id | Pictogram | Essential |
|---|---|---|
| food_stall | Steaming noodle bowl with chopsticks | ✓ |
| herbal_shop | Bundle of herb leaves | ✓ |
| old_inn | Bed with a key | ✓ |
| tea_house | Teapot and small cup | ✓ |
| internet_cafe | CRT monitor with a headset | ✓ |
| comic_rental | Open comic book | |
| clothing_stall | T-shirt on a hanger | ✓ |
| arcade | Joystick and button | ✓ |
| tattoo_parlor | Tattoo machine with a small dragon curl | |
| lounge | Cocktail glass with a crescent moon | ✓ |
| ktv | Microphone with music notes | ✓ |
| business_hotel | Hotel bell | |
| izakaya | Paper lantern and sake bottle | |
| boutique | Handbag (no logo) | ✓ |
| cafe | Coffee cup with steam | |
| nightclub | Disco ball | ✓ |
| department_store | Shopping bag | ✓ |
| office_tower | Tall office building | ✓ |
| luxury_condo | Condo tower with a sparkle | |
| xiaoxiao_branch | House with a smiley-face door | ✓ |

## Map event icons (`events/<id>.png`)

| id | Pictogram | Essential |
|---|---|---|
| procession | Temple flag with a drum | ✓ |
| recruit | Person silhouette with a star | ✓ |
| tip | Speech bubble with a coin | ✓ |
| scratch_card | Scratch card with a shiny corner | ✓ |
| hot_trend | Flame | |
| news | Megaphone | |

If the budget runs out, the code draws fallback LED pictograms for any icon that hasn't been generated.

## Status (2026-11-15)
All 26 icons are generated and in `art/source/lots/` and `art/source/events/` (the scratch card becomes `events/scratch.png` through the alias in `scripts/process-art.mjs`). Used 38 of the 40 trial generations.
- **What worked:** `create_image_pixen` at 32×32 with `no_background`, `detail: low detail`, and prompts that read "<pictogram>, glowing LED shop sign icon, bright <colors> light, solid filled shapes, bold simple silhouette, centered, transparent background, no text". The free plan runs one job at a time.
- **Fixes in post:** `food_stall` had a black backdrop that was keyed out. `ktv` was brightened ×2.
- **Retried:** old_inn, tea_house, ktv (×2), office_tower, scratch_card (the first attempt had letters in it), luxury_condo.
- **Weakest:** tattoo_parlor (reads a bit like a blade), procession (a temple and drums, not a flag), izakaya (small).
- **Display:** lot icons sit at 1.5× (48px) in the 56px LED panel. Event icons replace the kanji glyph in the map bubble. Xiaoxiao tips keep the yellow 笑 bubble. `hot_trend` and `news` have no place in the UI yet.
