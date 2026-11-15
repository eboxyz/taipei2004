# Art Brief for Codex

You are making the illustrated art for a mobile-browser idle game set in 2000s Taipei. A different agent (Claude) builds the game. Your job is images only.

- The full game design is in `docs/design.md`. Read sections 1 and 7 and the roster appendix for context.
- **Only write files inside `art/source/`.** Do not edit code, docs or any other files.

---

## 1. Workflow

1. **Make the style sheet first** (prompt S1 below). Save it, show it to the user, and **stop**. Do not continue until the user approves it. Revise as often as they ask.
2. **After approval, work in batches, in this order.** After each batch, list the files you made and wait for the user's review.
   - Batch A: the 5 boss portraits
   - Batch B: the other 26 portraits
   - Batch C: the 5 area banners, day versions
   - Batch D: the 5 area banners, night versions
   - Batch E: the 7 crests
   - Batch F: the 3 key art pieces
3. **Attach the approved style sheet as a reference image to every generation,** and paste the shared style block (section 2) into every prompt.
4. **Regenerate anything the user rejects.** Keep only the latest accepted version under the final file name.
5. **Keep `art/source/LOG.md` up to date:** one line per file with its status (`accepted`, `pending review`, `redo`) and any notes.

---

## 2. Shared style block (paste into every prompt)

> Style: 2000s Taipei crime comedy for a mobile game. Characters drawn in clean modern anime style: bold confident dark outlines, flat cel shading with a single shadow tone, expressive likeable faces, adult proportions (not chibi). Shadows carry a light halftone dot texture, like an old Taiwanese printed movie poster. Colors are saturated and upbeat. Daytime scenes: bright sun, sky blue, shop-sign red, yellow and green. Night scenes: deep blue-violet base lit by neon pink, cyan and warm yellow, bright and lively, never gloomy. No text, no letters, no numbers, no logos, no watermark, no signature, no border or frame.

### Palette (match these as closely as you can)

| Use | Hex |
|---|---|
| Outline / ink | `#1E1B2E` |
| Day sky | `#5EC8F2` |
| Sign red | `#E8382F` |
| Sign yellow | `#FFC93C` |
| Sign green | `#2BB673` |
| Concrete | `#D9D4CC` |
| Night base | `#241A4A` |
| Night deep | `#120C2E` |
| Neon pink | `#FF3EA5` |
| Neon cyan | `#2EF0FF` |
| Warm yellow | `#FFD34D` |
| Lantern red | `#FF5A3C` |

### Faction accent colors

| Faction | Colors |
|---|---|
| Miaokou Gang | Red and gold |
| Molong Society | Black and electric green |
| Yuejian Society | Indigo and silver |
| Jin Tangchi Group | Gold and pastel pink |
| Tongtian Development | Steel blue and concrete grey |
| Player agency | Warm orange and white |
| Xiaoxiao Realty | Sunny yellow and white |

### Content rules
- **Comedy, not menace.** Everyone is likeable.
- **Props, not weapons.** Only the comedic props listed (firecrackers, rebar, wok, seal stamps). No guns or knives, and no blood.
- **No sexualized poses or outfits.**
- **Taiwanese (East Asian)** characters in 2000s fashion.
- **Shop signs in scenes** are blank colored panels or neon outlines. At most one large simple character per sign, chosen from 茶 酒 冰 麵 書 網 唱 旅 湯 藥. No other text, because the players read Chinese and garbled characters will show.
- **Real landmarks** may appear loosely as background shapes. Never show real brand names or logos.
- **No card frames, borders or rarity effects.** The game adds those in code.

---

## 3. Technical specs

| Asset | Generate at | Background | Framing |
|---|---|---|---|
| Style sheet | 1536×1024 | Any | See S1 |
| Portraits | 1024×1536 | **Transparent PNG** | Waist-up, centered, face in the upper third, whole head visible, about 10% empty margin on the top and sides. The game crops a 3:4 card and a circle around the face |
| Area banners | 1536×1024 | Full scene | Wide street view. Keep everything important in the **middle 60% vertically**, because the game crops to a 2.4:1 strip |
| Crests | 1024×1024 | **Transparent PNG** | One centered emblem with a margin |
| Key art | 1024×1536 | Full scene | Keep important content away from the left and right 8%, because the game crops to 9:16 |

- If transparency is unavailable, use a flat solid `#00B140` green background with no shadows or gradients on it, and note that in the LOG.
- **Night banners are edits of the approved day banners.** Same camera, same buildings, same composition; only the time of day changes.

### File names

```
art/source/style/style_sheet.png
art/source/characters/<id>.png
art/source/areas/<id>_day.png
art/source/areas/<id>_night.png
art/source/crests/<id>.png
art/source/key/<id>.png
art/source/LOG.md
```

---

## 4. Prompts

Each prompt below goes after the shared style block, with the style sheet attached.

### S1 — Style sheet (`style/style_sheet.png`)
> A style reference sheet for the game, on a plain light background.
> - **Left half:** three waist-up characters standing side by side:
>   - an elderly bald temple-plaza boss in a white undershirt with prayer beads (Kun-bo)
>   - an elegant 50-something mama-san in an indigo kimono-cut qipao holding a fan (Yue-jie)
>   - an eager young real estate broker in a short-sleeved white shirt and tie, holding a stack of flyers (A-Cai)
> - **Right half, top:** the same old Taipei temple-front street corner shown twice, by day and at night.
> - **Right half, bottom:** a row of plain color swatches using the palette.
>
> No text anywhere.

### Portraits (`characters/<id>.png`)
Every portrait is **waist-up on a transparent background**. Describe the character exactly as below.

**Miaokou Gang (red and gold)**
- `kun_bo`: Taiwanese man in his 70s, bald with a ring of white stubble, wiry and tanned. White sleeveless undershirt, loose grey slacks, wooden prayer beads on his wrist, a red-and-gold embroidered temple-committee sash over one shoulder. Seated on a red plastic stool, leaning forward with his hands on his knees. Calm half-smile of a man who owns the whole plaza.
- `a_biao`: Stocky Taiwanese man in his mid-30s, buzz cut, toothpick. Loud red-and-gold aloha shirt open over a white tank top, thick gold chain, a long string of red firecrackers slung over one shoulder like a bandolier. Cocky grin, thumbs up.
- `gui_yi`: Taiwanese woman in her 60s, tight curly perm, reading glasses on a beaded chain, floral blouse and cardigan. Wooden abacus in one hand and a thick red ledger under her arm. A sharp, knowing look over the top of her glasses.
- `a_shun`: Taiwanese man in his 30s, temple procession drummer. Red headband, sleeveless red troupe shirt, two drumsticks held crossed. Fierce, focused expression.

**Molong Society (black and electric green)**
- `a_jie`: Lean Taiwanese man, 22, spiky bleached-blond 2000s hair. Black-and-green dragon tattoo sleeves on both arms, black sleeveless hoodie. Spinning scooter keys on a green lanyard around one finger. Confident smirk.
- `xiao_zhen`: Taiwanese woman, mid-20s, half-shaved head with the long side dyed green, several ear piercings, black tank top. Black gloves stained with ink, holding a tattoo machine like a pen. Cool, sly half-smile.
- `a_gan`: Taiwanese young woman, 19, short messy bob with hair clips, oversized basketball jersey, terry-cloth sweatband. Holding a paper cup overflowing with arcade tokens. Competitive grin.
- `a_hao`: Taiwanese young man, 20, scooter runner. Open-face helmet covered in colorful stickers (no text) held by its strap, windbreaker, fingerless gloves. Cheeky grin.
- `street_punk`: Generic Taiwanese street punk, early 20s. Messy hair, hoodie, wallet chain, cracking his knuckles. **Clothing and hair only in neutral greys and white**, so the game can recolor him per faction. Generic, forgettable face.

**Yuejian Society (indigo and silver)**
- `yue_jie`: Elegant Taiwanese woman in her 50s, silver-streaked hair in a neat updo with a hairpin. Indigo qipao with a kimono-style crossed collar and a silver moon pattern, pearl earrings. A half-open folding fan held near her chin. Warm, amused, completely in control.
- `a_jian`: Broad-shouldered Taiwanese man in his 30s, slicked-back hair. Black vest over a white shirt, silver bow tie, sleeves rolled up. Holding a silver cocktail shaker. Unbothered polite smile, one eyebrow raised.
- `coco`: Taiwanese woman in her late 20s, glossy straight hair with side bangs. Fitted pale-lavender 2000s office skirt suit, a flip phone covered in dangling charms, a clipboard of contracts, a pen behind her ear. Sweet smile, sharp eyes.

**Jin Tangchi Group (gold and pastel pink)**
- `jin_shao`: Taiwanese man, 25, rich heir. Styled hair, pastel-pink suit over a polo shirt with the collar popped, designer sunglasses pushed up on his head, gold watch, dangling sports-car keys. Smug, carefree grin.
- `da_kuai`: Huge Taiwanese man in his 40s, shaved head, square jaw. Black suit straining at the shoulders, pink pocket square, earpiece with a coiled wire, black sunglasses, arms crossed. Stone-faced.
- `vivi`: Taiwanese woman in her late 20s, glossy waves. Oversized white sunglasses, cream blazer, a fan of credit cards in one hand and a 2000s PDA with a stylus in the other, handbag on her arm (no logos). Unimpressed, one eyebrow raised.
- `lao_liu`: Taiwanese man in his 50s, chauffeur. Peaked cap, white gloves, grey uniform jacket, car keys in hand. Dignified, polite.

**Tongtian Development (steel blue and concrete grey)**
- `tian_dong`: Heavy-set Taiwanese man in his 60s, slicked silver hair. Navy double-breasted suit, jade ring, gold tie clip, a white hard hat tucked under one arm, an unlit cigar between his fingers. Benevolent smile that doesn't reach his eyes.
- `secretary_lin`: Taiwanese woman in her 30s, sharp black bob, thin rimless glasses, charcoal pantsuit, leather briefcase, a flip phone held to each ear. Brisk, efficient, slightly exasperated.
- `tie_ge`: Muscular, sunburnt Taiwanese man in his 40s. White hard hat, orange reflective vest over a tank top, towel around his neck, a length of rebar resting on his shoulder. Big hearty laugh.

**Player agency (warm orange and white)**
- `a_cai`: Taiwanese young man, 23, neat side-parted hair. Short-sleeved white shirt, slightly crooked orange tie, blank name badge. Open-face scooter helmet under one arm and a thick stack of property flyers in the other hand. Eager, hopeful smile.
- `hai_shu`: Big Taiwanese man in his 50s, weathered ex-sailor, grey crew cut, faded anchor tattoo on his forearm. White tank top, orange towel around his neck, arms folded. Calm, gentle, immovable.
- `a_di`: Skinny Taiwanese young man, 18, spiky black hair, orange track jacket. Holding a ring of keys and a stack of bento lunchboxes. Breathless grin.
- `intern`: Taiwanese young man, 22, bowl-cut hair, a suit two sizes too big, lanyard with a blank ID badge, clutching a folder to his chest. Terrified and sweating.

**Independents (use each character's own accent)**
- `bao_zhu`: Taiwanese woman in her 60s with an enormous voluminous perm, gold-rimmed glasses, bold floral blouse, jade bangles stacked on both wrists, a fanny pack bursting with cash, an old brick-style mobile phone. Shrewd, delighted grin. Accent: jade green and gold.
- `a_tai`: A festival performer in a Techno Third Prince (電音三太子) costume. Oversized round-cheeked child-deity costume head with a topknot, wearing wraparound sunglasses, embroidered red, gold and green deity robes, glowing rave sticks in both hands, mid-dance. Joyful and festive. A respectful, affectionate depiction of a temple festival performer. Accent: neon multicolor.
- `jackpot`: Taiwanese man in his 40s, a betel-nut stand owner who just won the lottery. Shiny gold shirt, gold chain, gold watch, gold-rimmed sunglasses, holding a winning scratch card up proudly (no readable text). Ecstatic. Accent: lucky gold and red.
- `chen_daishu`: Taiwanese woman in her 50s, neat short hair, beige cardigan, reading glasses. Holding a carved seal stamp in each hand like a fighter, red ink pad clipped to her belt. Stern, no-nonsense. Accent: vermilion.
- `lao_zhang`: Heavy-set Taiwanese man in his 50s, the night-market king. Sweatband, stained apron, towel on his shoulder, holding a huge wok with flames leaping out. Big generous laugh. Accent: lantern orange.
- `a_xiong`: Taiwanese man in his 40s, taxi driver. Aviator sunglasses, polo shirt, gold pendant, a CB radio handset in one hand, leaning on a yellow taxi roof light (no text). Knowing smirk. Accent: taxi yellow.
- `lao_zhou`: Taiwanese man in his late 50s, retired detective. Rumpled tan trench coat, loosened tie, toothpick, holding up an old police badge (no readable text). Tired but sharp eyes. Accent: khaki and police blue.

**Xiaoxiao Realty (sunny yellow and white)**
- `xiaoxiao_agent`: Taiwanese realtor in his late 20s. Bright sunny-yellow blazer with a round smiley-face pin, white shirt, perfect teeth, a property listing folder under one arm, giving a thumbs up. Overly cheerful, with a smile slightly too wide: friendly, but faintly unsettling.

### Area banners (`areas/<id>_day.png`, then `areas/<id>_night.png`)
Write the **day** prompt using the description below. For **night**, attach the approved day image and say:

> Edit this image into the same scene at night. Keep the camera, buildings and composition identical. Deep blue-violet sky; shop signs, windows and lanterns glowing in neon pink, cyan and warm yellow; bright and lively. More people out than in the day version.

- `wanhua`: An old Taipei temple-front plaza. Ornate temple roof with curved ridges, incense smoke, red lanterns, old shophouses with covered arcade walkways (騎樓), snack stalls with plastic stools, an herbal shop with hanging bundles, scooters parked in rows, pigeons, elderly locals chatting.
- `ximending`: A crowded pedestrian shopping street full of teenagers. Big blank movie billboards, an arcade glowing inside, clothing stalls, bubble-tea cups. A red-brick octagonal theater building in the distance.
- `zhongshan`: A narrow 條通 alley lined with small Japanese-style lounges and bars. Stacked vertical signboards, paper lanterns, noren curtains, taxis waiting at the alley mouth, a cat on a step. Quiet with shutters half down in the day version.
- `east_district`: A wide, fashionable boulevard. Department store facades, boutique windows, café terraces with stylish young people in 2000s fashion (no logos), a pedestrian overpass.
- `xinyi`: A wide new-money plaza between glass office towers. Construction cranes; a tall, segmented, bamboo-like skyscraper under construction in the background; landscaped walkways and businesspeople.

### Crests (`crests/<id>.png`), transparent, emblem only, no text
- `miaokou_gang`: A bronze incense burner under a curved temple roof, inside a red-and-gold circular seal.
- `molong_society`: A coiling dragon painted in one bold black ink brushstroke, with an electric-green eye.
- `yuejian_society`: A silver crescent moon above a half-open indigo folding fan.
- `jin_tangchi_group`: A golden spoon wearing a tiny crown, with pastel-pink sparkle accents.
- `tongtian_development`: A stylized steel-blue skyscraper with a ladder reaching up into a cloud.
- `xiaoxiao_realty`: A cheerful house with a big smiley face for a door, in sunny yellow and white. Friendly mascot energy.
- `player_agency`: A small house with a potted plant beside the door, in warm orange and white. Modest and neighborly.

### Key art (`key/<id>.png`)
- `title`: A night skyline of Taipei, with a tall segmented bamboo-like skyscraper glowing in the center. In the foreground, a lively neon street with scooters streaking light trails. Leave the top third of the sky clear for the game's title text.
- `cash_out`: A ceremonial golden basin of water on a carved wooden table, in a warm temple-like room lit by red candles. Two hands rinse in the basin while incense smoke curls up. Dignified and slightly comedic.
- `fireworks`: New Year's Eve: a tall, segmented, bamboo-like skyscraper erupting with fireworks along its sides. A crowd silhouetted below, phones and arms raised. Joyful.
