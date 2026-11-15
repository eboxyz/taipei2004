# Taipei 2004 台北2004: Design Doc

The design source of truth, from the planning sessions in November 2026. Numbers are starting points to tune in playtesting.

## 0. Pitch and pillars

A mobile-browser idle/incremental game set in 2000s Taipei. You run a small real estate agency that buys the city lot by lot, lets income pile up while you're away, and takes each district from its gang boss in auto-battled Turf Wars, using a collection of business-card characters from a tiered gacha.

The mechanics are inspired by Yakuza 0's real estate minigame. All characters, gangs and companies are original.

- **Idle earns, active claims.** Idle and incremental play produce money and power; only Turf Wars take territory.
- **Gentle.** No harsh punishments anywhere. Losing never costs progress.
- **Mobile first.** Portrait, one thumb, 2–5 minute check-ins.
- **Readable without Chinese.** English carries all meaning; Chinese characters and zhuyin add flavor.

---

## 1. World

### Era and tone
- Taipei, about 2002 to New Year's Eve 2004 (Chapter 1). The secret area runs to December 2010.
- A **housing price index (房價指數)** climbs during each run.
- **Taipei 101 rises on the skyline as the run's progress bar.** Claiming Xinyi tops it out and plays the NYE 2004 fireworks: the full show the first time, a short version after that.
- **Cash-out is called 金盆洗手** (washing your hands in the golden basin to retire). It ends with "…but nobody stays retired."
- **Tone:** upbeat crime comedy with bright nightlife. Day is sunny and night is neon. Both are bright, never moody.

### Language rules

| Script | Used for |
|---|---|
| English | Default: UI, descriptions, dialogue |
| Pinyin | Names of people and gangs; a gang name is pinyin plus an English noun ("Miaokou Gang"). Established spellings stay (Taipei, Ximending, Xinyi) |
| 漢字 | Area and location names, crests, signage, impact text |
| 注音 | Decorative styling only |

- Never require reading Chinese.
- Names players type are shown exactly as typed, in any script.
- **Money** is NT$ shown with 萬/億/兆/京, then scientific notation. Press-and-hold shows the English value (1.2億 → 120M), and settings offer a K/M/B option.
- **Taiwanese naming conventions** apply: 阿X / 小X / 老X nicknames, family-style titles (哥 姐 伯 叔 姨), X董 for chairmen, X少 for young masters, and English nicknames like Coco and Vivi.

### Map
- A stylized schematic of the 2000s Taipei metro, north at the top.
  - It is our own drawing, not the official map design or logo.
  - Lines use their era names (板南線, 淡水線, 新店線, 中和線, 木柵線), not the later color/number codes.
  - There was no station at Taipei 101 until 2013; you walked from 市政府.
- **Blue line (板南線), left to right:** 龍山寺 (Wanhua) → 西門 (Ximending) → 台北車站 (junction) → 忠孝復興 / 忠孝敦化 (East District) → 市政府 (Xinyi).
- **Zhongshan** sits on the red line (淡水線), north of Taipei Main.
- **新店** is off the bottom edge. The green line fades out past 公館 until it unlocks, then the map extends south.
- Drag and pinch to move around. Station labels alternate above and below the line.
- **On the map:** street-event icons at stations, Xiaoxiao Realty billboards, and an LED-sign news ticker.

### Areas

| # | Area | Feel | Twist | Rival |
|---|---|---|---|---|
| 1 | **Wanhua 萬華**; Monga 艋舺 appears in flavor (艋舺龍山寺, old-timers) | Old Taipei, temples, stalls | Cheap and steady; the tutorial | Miaokou Gang |
| 2 | **Ximending 西門町** | Youth culture, movie street, tattoo street | Fast income, low property values | Molong Society |
| 3 | **Zhongshan 中山・條通** | Japanese-style lounges, KTV | Night businesses only; night bonus | Yuejian Society |
| 4 | **East District 東區** | 2000s fashion capital | A rotating "hot" lot type earns extra | Jin Tangchi Group |
| 5 | **Xinyi 信義** | 101 rising, new money | Highest values; final boss | Tongtian Development |
| Secret | **Xindian 新店** | Commuter towers, Bitan riverside | Earns extra while offline | Xiaoxiao Realty |

- **The secret area** unlocks after the first Chapter 1 clear and is hidden until then. After that it appears in every run, after Xinyi. Clearing it plays the founding of New Taipei City (25 Dec 2010).
- **Possible expansions:** Yonghe/Zhonghe, Banqiao, Sanchong/Xinzhuang, Dadaocheng, Beitou, Shilin.

### Factions

| Faction | Crest | Meaning | Colors | Who they are |
|---|---|---|---|---|
| Miaokou Gang | 廟口幫 | Temple Square Gang | Red and gold | Old men who've run the temple plaza and its processions forever |
| Molong Society | 墨龍會 | Ink Dragons | Black and electric green | Tattoo-street kids, scooter crews, arcade kings |
| Yuejian Society | 月見會 | Moonview Society | Indigo and silver | The mama-san's lounge network along the 條通 alleys |
| Jin Tangchi Group | 金湯匙集團 | Golden Spoon Group | Gold and pastel pink | The heir and his bodyguards |
| Tongtian Development | 通天建設 | "Reaches the sky" / "connected to the top" | Steel blue and concrete grey | Developer with friends in government |
| Xiaoxiao Realty | 笑笑房屋 | Smile Realty | Sunny yellow and white | Grinning chain on every corner; the secret final boss |
| Player agency | Default 好鄰居房屋 **Hao Linju Realty** ("Good Neighbor Realty") | Player-named | Warm orange and white | You |

- **The arc:** street gang → society → corporation → "legit" developer → it turns out the realtors were the real gangsters.
- **Real names to avoid:** gangs (竹聯幫, 四海幫, 天道盟, …) and realty brands (信義房屋, 永慶, 大家房屋, …). None of our names collided with real ones in a search on 2026-11-15.
- **Foreshadowing Xiaoxiao:**
  - One "Not for sale" Xiaoxiao branch lot in every area. It opens up in 新店.
  - Billboards and a jingle on the map, plus news ticker headlines ("Xiaoxiao Realty opens its 100th branch").
  - A cheerful Xiaoxiao agent in street events whose "helpful" tips were steering you.
  - Each defeated boss's last line points at them ("You think *we're* the problem?").

---

## 2. Economy

### Lots
- About 10 lots per area, including the Xiaoxiao lot. Each has a business category, a ☀ day or 🌙 night tag, a price and an income rate.
- Prices and income scale about ×100 per area.
- **Upgrades:** cost = base × 1.12^level. Income doubles at levels 10, 25, 50 and 100.
- Lot art changes at levels 25, 50 and 100. For the first pass, the code shows a tier badge on one icon.
- Buy ×1 / ×10 / Max toggle; press and hold to keep upgrading.

### Lot categories (draft)

| Area | Categories |
|---|---|
| Wanhua | food stall ☀, herbal shop ☀, old inn 🌙, tea house 🌙 |
| Ximending | internet café 🌙, comic rental ☀, clothing stall ☀, arcade 🌙, tattoo parlor ☀ |
| Zhongshan | lounge 🌙, KTV 🌙, business hotel 🌙, izakaya 🌙 |
| East District | boutique ☀, café ☀, nightclub 🌙, department store ☀ |
| Xinyi | office tower ☀, luxury condo 🌙, nightclub 🌙, department store ☀ |
| Every area | Xiaoxiao Realty branch (locked) |

### Money and the safe
- Income collects in the **safe (保險箱)**, and you tap it to collect.
- **Safe size is measured in hours of income:** 4 hours at the start, upgradable to 24.
- **Offline income** fills the safe and stops there. This is the only idle cap.
- **Accountants** collect automatically while the game is open. Offline income is always capped by the safe.
- On return, a "While you were away" summary appears, styled as a flip-phone text message.

### Day and night
- **24-minute game day:** 1 real minute = 1 game hour. Not tied to real time.
- **Lot income:** lots earn ×1.5 during their own phase and ×1 otherwise, never less. Offline income uses the ×1.25 average.

### Staff
- **Every lot has a Manager slot and a Security slot.** Empty slots are fine; the lot still earns its base rate.
- **Managers are agents.** They add income based on their Business stat, plus a perk from their role:

  | Role | Perk |
  |---|---|
  | 店長 | More income |
  | 代書 | Cheaper upgrades |
  | 房仲 | Cheaper lots in that area |
  | 會計 | Bigger safe |

- **Security are gangsters.** They repel shakedowns and add to the Home Turf bonus in Turf Wars.

### Shakedowns (rewards only)
Rivals periodically lean on your lots in their area.
- **If Security is strong enough,** the shakedown is repelled. You get a cash bonus, XP and a chance at a scratch card.
- **If the lot is unguarded,** nothing happens. It just misses the bonus. There are no penalties.

### Market share and the price index
- **Market share** = your lot value ÷ the area's total value.
  - At 25%, 50% and 75% you can fight the first lieutenant, the second lieutenant and the boss.
  - Lieutenants hold some lots locked until you beat them.
- **Claiming an area:** income in that area doubles, the remaining lots are discounted, and the boss joins your collection.
- **The price index** starts at 100 each run. It rises with buys and milestones and jumps on claims. It multiplies income and property values, drives Face at cash-out, and sets how many floors 101 has.

### Automation (each step is unlocked)
1. Tap the safe to collect.
2. An accountant collects automatically while the game is open.
3. Auto-upgrade per area.
4. Auto-buy the cheapest lot.
5. Auto-assign the best staff.

Steps 1–2 unlock during a run. Steps 3–5 are permanent Face upgrades.

### Street events (optional pop-ups on map stations)
- **Temple procession:** tap for a bonus.
- **Walk-in recruit:** a free N or R card.
- **Broker tip:** a lot is about to jump in value. Sometimes the tip comes from the Xiaoxiao agent.
- **Scratch-card drop.**
- **Hot trend** (East District).
- **Xiaoxiao billboard or news.**

---

## 3. Turf Wars (auto-battler)

### Basics
- **Fights:** in each area, the first lieutenant unlocks at 25% market share, the second at 50%, and the boss at 75%.
- **Length:** about 30–60 seconds for a lieutenant and about 90 for a boss, at 1× or 2× speed.
- **Losing costs nothing.** The results screen gives a hint about what to try next.
- **Quick claim:** you can skip a fight when your army is at least 2× the recommended power.

### Squad
- **Army: 5 slots.** Front row 2, back row 3.
- **Commanders: 2 slots.**
  - Slot 6, the Lieutenant commander, needs a Lieutenant-class character or higher.
  - Slot 7, the Boss commander, needs a Boss-class character.
- **When slots unlock** (permanent):

  | Slot | Unlocks at | Time into first run |
  |---|---|---|
  | 3 army slots | Start | 0 |
  | 4th army slot | Wanhua Lt 1 | ~10 min |
  | 5th army slot | Wanhua Lt 2 | ~20 min |
  | Slot 6 | Wanhua claim | ~40 min |
  | Slot 7 | Ximending claim | ~1.5–2 h |

  From area 3 on, fights assume a full squad of 7. Later areas reward new commander options, not more slots.
- **How commanders work:**
  - A **command aura** is a passive effect on the whole army.
  - An **ultimate** has a long charge and fires as a full-screen card moment.
  - Commanders stand behind the army and can only be targeted once your front row has fallen. If one is knocked out, its aura is lost.
  - Either class can command.
  - Rival bosses' gimmicks are their auras.
- **Home Turf:** +3% Grit to the whole army for each Security posted in that area. This replaced the idea of a reinforcement bench.
- **Prep screen:** drag cards into slots, or use **Auto-fill best**. It shows your power against the recommended power, plus a hint like "nightfall in 4 min".

### Roles

| Class | Role | Row | Does |
|---|---|---|---|
| 兄弟 gangster | 圍事 bouncer | Front | Tank; protects the ally behind |
| 兄弟 | 打手 enforcer | Front | Heavy melee |
| 兄弟 | 小弟 runner | Either | Fast, frequent hits |
| 兄弟 | 軍師 strategist | Back | Buffs allies, debuffs enemies |
| 房仲 agent | 房仲 broker | Back | Buyout: removes an enemy grunt |
| 房仲 | 代書 scrivener | Back | Stuns and strips defense |
| 房仲 | 店長 manager | Back | Heals |
| 房仲 | 會計 accountant | Back | Shields |

- **Stats:** Muscle (damage), Grit (health), Business (strength of agents' skills). Each character also has one signature skill.
- **Skills fire automatically.** Turning Auto off lets you tap portraits to fire skills yourself.

### What changes the odds
- **Time of day:** gangsters get +20% at night, agents +20% by day.
- **Market share:** a small boost for every 5% above the fight's threshold, so idle play can always win eventually.
- **Underdog bonus:** extra Face for winning right at the threshold.
- **Same-faction bonus:** for 2 or 3 crew from the same faction.
- **Boss gimmicks:**

  | Boss | Gimmick | Counter |
  |---|---|---|
  | Miaokou (Wanhua) | Procession: calls in troupe members every few seconds | Hit-all skills |
  | Molong (Ximending) | Scooter crews: very fast, low health | 圍事 plus hit-all skills |
  | Yuejian (Zhongshan) | Charms one of your crew briefly; heals her staff | Burst damage, stuns |
  | Jin Tangchi (East) | Hides behind shielded bodyguards | 代書 defense strip |
  | Tongtian (Xinyi) | Gains a permit buff every 15 s | Fast-kill squads |

### Rewards
- **First win:** unlocks lots or claims the area. The lieutenant or boss joins your collection, and you get gacha currency.
- **Rematches:** available any time, for XP and a little currency.

### Presentation
- **Layout:** portrait, enemies on top, player at the bottom, commanders in a row behind each army.
- **Animated cards:** card portraits lunge, shake and flash, with damage numbers and big 漢字 impact text (砰! 爆! 勝!).
- **Background:** the area banner, blurred, in its current day or night version.
- No character sprites for now. PixelLab animation is a possible later upgrade.

---

## 4. Collection and gacha

### Cards and rarity
Characters are business cards (名片), and the card's finish shows its rarity:

| Rarity | Finish | Rank | Can fill |
|---|---|---|---|
| N | Plain paper | Crew | Army |
| R | Embossed | Crew | Army |
| SR | Lacquered foil | Lieutenant-class | Army or slot 6 |
| SSR | Gold leaf | Boss-class | Any slot |

The 10 rival lieutenants join as SR and the 5 bosses as SSR, so everyone earns commanders by playing.

### Three draw tiers

| Tier | Interaction | N | R | SR | SSR |
|---|---|---|---|---|---|
| Scratch card 刮刮樂 | Scratch with a finger | 70% | 27.5% | 2% | 0.5% |
| Temple 求籤 | Shake the phone (or swipe) until a stick falls | 50% | 38% | 10% | 2% |
| Lottery 樂透 | Balls tumble; SR or better guaranteed; weekly featured character | — | 60% | 32% | 8% |

- **Temple stick grades:** 下籤 = N, 中籤 = R, 上籤 = SR, 上上籤 = SSR.
- **Moon blocks (擲筊):** after a temple draw, you can throw the blocks.
  - Three 聖筊 in a row (12.5%) upgrades the card one rarity.
  - Any other result keeps the card. A throw can never make it worse.
- **Guarantees:** every 10th temple draw is SR or better. The lottery guarantees an SSR by the 40th draw.
- Guarantee counters carry over between runs, and odds are shown in the game.

### Currencies (never reset)

| Currency | Earned from |
|---|---|
| Scratch cards | Street events, repelled shakedowns, rematches |
| Incense money 香油錢 | First wins over lieutenants and bosses, area claims, one free temple visit a day |
| Lottery tickets | First wins over bosses, cashing out, completing binder pages |

No real money anywhere.

### Growth
- **Duplicates** add stars, up to ★5.
  - ★3: the signature skill gets stronger.
  - ★5: the commander aura gets stronger, and the card gets a special frame overlay.
- **Levels** come from working lots and from fights.
- **Extra duplicates** past ★5 trade in for incense money.

### Roster variety
- **Draw-exclusive characters:** some only come from scratch cards, some only from the temple, some only from the lottery.
- **Zodiac (生肖):** chosen at the start. It slightly tilts the odds toward certain factions and roles, and the game explains it in English. The zodiac-to-faction mapping is still to be decided.
- **Commander auras** lead to different army builds.

### Binder (名片簿)
- Pages are grouped by faction. Empty slots show a silhouette and a hint about where to find that character.
- Each completed page gives a permanent bonus.
- Every 10 unique cards adds global income.

---

## 5. Cash-out and long-term progression

### Cashing out (金盆洗手)
- **Unlocks** after the first Wanhua claim.
- **Face reward:** about the square root of your **best** net worth this run, plus a bonus for each area claimed this run, plus underdog bonuses.
- The button always shows "Cash out now: +X Face" and how far you are from the next Face.
- When cashing out would raise your Face by 50% or more, the button glows and the game suggests it's a good time to retire.
- **Ceremony:** one illustration, then "…but nobody stays retired."

| Resets | Stays |
|---|---|
| Cash, lots, upgrades, area control, price index, safe | Cards, stars, levels, binder, draw currencies, guarantee counters, Face and Face upgrades, slot unlocks, automation |

### Face upgrade tree
Four branches, about 30 upgrades in total for Chapter 1, with costs that rise as you buy more:

| Branch | Upgrades |
|---|---|
| Business 生意 | More income, cheaper lots and upgrades, start with cash, start with Wanhua lots |
| Idle 閒 | Safe 4h → 24h, accountant from the start, auto-upgrade, auto-buy, auto-staff |
| Muscle 拳頭 | Stronger army, faster commander ultimates, bigger Home Turf bonus, skills partly charged at the start of a fight |
| Network 人脈 | More street events, better scratch odds, more incense money, faster index growth |

### Pacing targets (to tune)

| Run | Length | Likely reach |
|---|---|---|
| 1 | 2–4 hours plus a night offline | Ximending or Zhongshan |
| 2–3 | About a day each | East District |
| 4–6 | About a day each | Xinyi clear and fireworks |
| After | Ongoing | 新店 and the binder |

**Notoriety (名氣)** levels for after the story are **parked until the user has played a build.**

---

## 6. Phone screens

### Tabs
**Map** (home) · **Crew** (binder, card details, staffing, army setup) · **Draws** · **Office** (Face tree, cash-out, stats, settings, Google sign-in, save export).

Turf Wars launch from an area screen.

### Screens
- **Map:** the metro map with a status bar (cash, income per second, clock with ☀/🌙), the safe button above the tabs, red dots for anything worth tapping, and street-event icons.
- **Area screen:** an illustrated banner (day/night), a market share bar with fight buttons at 25/50/75%, the buy-amount toggle, and a list of lot cards (icon, name, ☀/🌙, level, income, (M)(S) staff slots, upgrade button). Tapping a lot opens a bottom sheet for staffing and details.
- **Turf War:** prep → battle → results.
- **Draws:** each tier has its own full-screen interaction.
- **Face tree:** four vertical scrolling lists, one per branch.
- **"While you were away":** shown on open.

### Phone details
- Portrait only. On desktop or a sideways phone, the portrait column is centered over a backdrop.
- Tap targets of at least 44px, main actions in the bottom third, and padding for the notch and home bar.
- Installable web app: home-screen icon, full screen, fast load.
- Shaking for the temple draw asks for motion permission on iOS, with swipe as a fallback.
- Vibration where supported (not iOS Safari).
- **No push notifications.**

---

## 7. Art

### Style C
- **Characters:** anime style, bold outlines, flat cel shading.
- **Scenery and UI:** 2000s Taiwanese print and signage: halftone dots, vertical shop signs, neon.
- **Day palette:** sunny, with sky blue and sign red, yellow and green.
- **Night palette:** a deep blue-violet base with neon pink, cyan and yellow.
- **Pixel accents:** only where 2000s Taipei really had pixels (LED shop signs, arcade screens, flip-phone displays).

### Who makes what

| Source | Makes |
|---|---|
| **Codex (ChatGPT image generation)** | Style reference sheet, 31 portraits, 5 area banners (day and night), 7 crests, 3 key art. Brief: [`art/BRIEF.md`](../art/BRIEF.md) |
| **PixelLab (free tier: about 40 generations, then a few per day)** | About 20 lot icons and 6 map-event icons as LED-sign pixel pictograms. Claude runs these after the restart. Prompts: [`art/PIXELLAB.md`](../art/PIXELLAB.md) |
| **Claude (code)** | UI, metro map, card frames and finishes, halftone textures, role/currency/tab icons, draw machines, battle effects, the 101 skyline, the LED news ticker, placeholders, and the art processing script |

### Rules
- **No text in the art.** All text, including names, English, Chinese and zhuyin, is rendered in code.
- **Files are named by data id**, and the processing script makes the final sizes.
- **Missing art shows a placeholder** (silhouette plus name), so art can arrive in any order.
- **Enemy grunts** are `street_punk` recolored per faction in code.

---

## 8. Tech, hosting and build plan

- **Stack:** TypeScript, Vite and React.
- **Game state:** one serializable state object, advanced by `tick(state, dt)`. Rendering only reads it.
- **Offline progress** is calculated in closed form, capped by the safe.
- **Saves:** local first (autosave about every 10 s and when the tab is hidden), with a schema version, migrations and an export string.
- **Content is data:** characters, lots, areas and bosses are keyed by id, and art is looked up by the same id.
- **Accounts:**
  - Google OAuth only for now. Accounts are keyed on provider + user id, so LINE can be added later.
  - Guest first: players are prompted to sign in after their first area claim.
- **Database:** `users` and `saves` (a JSON blob, version and `updated_at`).
  - If two devices conflict, the save with more lifetime earnings wins. If they're close, the player chooses.
  - When signed in, offline time is checked against the server clock.
- **Gacha** runs on the client (no real money, no trading).
- **Everything stays on free tiers for now.**
- **Hosting:** Vercel's free Hobby plan (personal, non-commercial use) on a free `vercel.app` subdomain. A static build goes online from milestone 1 so the game can be tested on phones.
- **Accounts and database** arrive at milestone 5. The provider and auth library are chosen then, from free tiers.
- **Code:** private GitHub repo `taipei2004`.
- **Sound:** none for now; revisit later.

### Build order

| Milestone | What's playable |
|---|---|
| 1. Core | Wanhua economy: lots, upgrades, safe, day/night, staff, offline progress, local saves |
| 2. Fights | Wanhua Turf Wars with the starters and earned lieutenants, plus commanders. **First playtest** |
| 3. Draws | All three draw tiers, binder, stars |
| 4. Full run | Areas 2–5, cash-out, Face tree, automation |
| 5. Online | Google sign-in, cloud saves |
| 6. Secret area and polish | 新店, Xiaoxiao Realty, real art swapped in, sound |

### Supporting work
- `CLAUDE.md` with the project rules
- Tests for the economy math, offline progress, gacha odds and the battle simulation
- A pacing simulator that plays runs automatically to check the pacing targets
- An art processing script that turns `art/source` into the final sizes and reports missing files

---

## Open items
- Xiaoxiao Realty characters: secret boss and 2 lieutenants
- Zodiac → faction/role mapping
- Full lot lists per area, plus balancing numbers
- Notoriety levels (after a playtest)
- Sound (later)
- Database and auth provider (milestone 5)

---

## Appendix: Roster (v1, to rebalance in play)

**Rank key:** Boss = Boss-class SSR · Lt = Lieutenant-class SR.
**Source key:** Earned = joins when beaten · Starter = given at the start · Scratch / Temple / Lottery = only from that draw · All = every draw.

| id | Name | Faction | Rank | Role | Source | Look | Skill / aura |
|---|---|---|---|---|---|---|---|
| kun_bo | Kun-bo 坤伯 | Miaokou | Boss SSR | 軍師 | Earned | 70s, bald, white undershirt, prayer beads, plastic slippers, red plastic stool | **Procession:** calls a troupe runner in every 15 s |
| a_biao | A-Biao 阿彪 | Miaokou | Lt SR | 打手 | Earned | Aloha shirt, gold chain, flip-flops, string of firecrackers | **Firecracker String:** hits every enemy |
| gui_yi | Gui-yi 桂姨 | Miaokou | Lt SR | 會計 | Earned | Woman in her 60s, tight perm, glasses on a chain, abacus, donation ledger | **Hush Money:** shields the weakest ally |
| a_jie | A-Jie 阿杰 | Molong | Boss SSR | 打手 | Earned | 22, spiky bleached hair, dragon tattoo sleeves, scooter keys on a lanyard | **Scooter Crew:** army attacks 25% faster |
| xiao_zhen | Xiao Zhen 小針 | Molong | Lt SR | 軍師 | Earned | Woman tattoo artist, half-shaved head, ink-stained gloves, tattoo machine | **Bad Ink:** target deals less damage |
| a_gan | A-Gan 阿桿 | Molong | Lt SR | 小弟 | Earned | Arcade queen, oversized jersey, sweatband, cup of tokens | **Combo:** rapid five-hit flurry |
| yue_jie | Yue-jie 月姐 | Yuejian | Boss SSR | 店長 | Earned | Mama-san in her 50s, silver-streaked updo, kimono-cut qipao, fan, pearls | **Last Call:** heals the army over time; charms one enemy at the start |
| a_jian | A-Jian 阿健 | Yuejian | Lt SR | 圍事 | Earned | Head bartender, slicked hair, vest and bow tie, cocktail shaker | **Last Orders:** enemies must hit him |
| coco | Coco 可可 | Yuejian | Lt SR | 代書 | Earned | Office-lady suit, flip phone covered in charms, clipboard | **Fine Print:** strips defense |
| jin_shao | Jin-shao 金少 | Jin Tangchi | Boss SSR | 房仲 | Earned | 25-year-old heir, pastel suit, popped collar, sunglasses on his head, car keys | **Daddy's Money:** front row starts shielded |
| da_kuai | Da-kuai 大塊 | Jin Tangchi | Lt SR | 圍事 | Earned | Huge bodyguard, black suit, earpiece, never smiles | **Human Wall:** blocks hits on the ally behind for 3 s |
| vivi | Vivi 薇薇 | Jin Tangchi | Lt SR | 會計 | Earned | Assistant, oversized sunglasses, handbag, PDA, credit cards | **Company Card:** shields the back row |
| tian_dong | Tian-dong 田董 | Tongtian | Boss SSR | 軍師 | Earned | Chairman in his 60s, silver hair, double-breasted suit, jade ring, hard hat | **Permits:** army +5% to all stats every 15 s, stacking |
| secretary_lin | Secretary Lin 林秘書 | Tongtian | Lt SR | 代書 | Earned | Woman political aide, sharp bob, thin glasses, briefcase, two flip phones | **Zoning Change:** stuns the strongest enemy |
| tie_ge | Tie-ge 鐵哥 | Tongtian | Lt SR | 打手 | Earned | Site foreman, hard hat, reflective vest, rebar | **Rebar Swing:** heavy hit with knockback |
| a_cai | A-Cai 阿財 | Player agency | R | 房仲 | Starter | Junior broker, white short-sleeved shirt, tie, scooter helmet, flyers | **Sweet Deal:** buys out one enemy grunt |
| hai_shu | Hai-shu 海叔 | Player agency | R | 圍事 | Starter | Retired sailor, big and calm, tank top, towel around his neck | **Anchor:** takes hits for the ally next to him |
| a_di | A-Di 阿弟 | Player agency | N | 小弟 | Starter | 18, runner on a bicycle, keys and lunchboxes | **Errand Run:** fast hits |
| intern | The Intern 實習生 | Player agency | N | 房仲 | All | Young guy, lanyard, suit too big, terrified | **Flyer Storm:** small damage to every enemy |
| bao_zhu | Bao-zhu 寶珠 | Independent | SSR | 房仲 | Lottery | Legendary house-flipper in her 60s, huge perm, jade bangles, cash fanny pack | **Old Money:** agents' skills charge 40% faster |
| a_tai | A-Tai 阿太 | Independent | SSR | 打手 | Temple | Performs as the 電音三太子: giant deity-costume head, sunglasses, glow sticks | **Rave:** doubles the army's night bonus |
| jackpot | Jackpot 頭獎哥 | Independent | SSR | 小弟 | Scratch | Betel-nut stand owner who hit the jackpot, gold everything | **Lucky Streak:** any hit can crit big |
| chen_daishu | Chen Daishu 陳代書 | Independent | SR | 代書 | Temple | Woman land scrivener, cardigan, reading glasses, seal stamps | **Official Seal:** stuns and strips defense |
| lao_zhang | Lao Zhang 老張 | Independent | SR | 店長 | Scratch | Night-market king, apron, giant wok | **Night Market Feast:** heals everyone |
| a_xiong | A-Xiong 阿雄 | Independent | SR | 軍師 | Temple | Taxi driver (運將), aviator sunglasses, CB radio | **Tip-off:** weakens the enemy commanders |
| lao_zhou | Lao Zhou 老周 | Independent | SR | 圍事 | Lottery | Retired detective, trench coat, toothpick, old badge | **Off-Duty Badge:** big self-shield; enemies focus him |
| a_hao | A-Hao 阿豪 | Molong | R | 小弟 | Scratch | Scooter runner, sticker-covered helmet | **Wheelie:** dashes in to hit the back row |
| a_shun | A-Shun 阿順 | Miaokou | R | 打手 | Temple | Procession drummer, headband, drumsticks | **War Drum:** strengthens the front row |
| lao_liu | Lao Liu 老劉 | Jin Tangchi | R | 小弟 | Lottery | Chauffeur, white gloves, peaked cap | **Getaway Car:** revives one ally, once per fight |
| street_punk | Street Punk 街頭小弟 | Molong | N | 小弟 | All | Generic punk with neutral colors, recolored per faction for enemy grunts | **Brawl:** basic hits |
| xiaoxiao_agent | Xiaoxiao agent | Xiaoxiao | NPC | — | — | Sunny-yellow blazer, smiley pin, smile a little too wide | Street-event NPC; becomes collectible after 新店 |

**Counts:** 30 collectible characters plus 1 NPC.
- **Women:** 9.
- **Classes:** 11 agents, 19 gangsters.
- **Faction sizes:** Miaokou 4, Molong 5, Yuejian 3, Jin Tangchi 4, Tongtian 3, player agency 4, independent 7.
