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
- **Taipei 101 rises on the skyline as the run's progress bar** (4 floors + 0.6 per index point above 100, capped at 100). Claiming Xinyi tops it out at 101 and plays the NYE 2004 fireworks: the full show the first time, a short version after that.
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
- **Layout:** the blue line bends southwest from Ximen down to Longshan Temple (Wanhua), as it does in real life. Labels sit on alternating sides so they never touch.
- **Station labels:** the English name sits above a station-sign tag in the rival gang's color with the Chinese name on it, followed by the percentage of properties you own (each lot counts equally; the Xiaoxiao branch only counts once it's for sale, so owning everything you can buy reads 100%). Investment-weighted market influence is shown separately in the area screen for rival unlocks. Map text has a halo in the map's background color.
- **Decorations:** 12 small illustrated stickers fill the empty corners (a palace hotel, a dragon boat, a garbage truck, scooters and so on). They are made by Codex in `map/`, sit under the stations, can't be tapped, and are darkened at night. A sticker whose art is missing is simply left out.
- **Street-event bubbles:** each station has a fixed bubble spot clear of labels, lines and the map edge. The tail points at the station, and bubbles draw above the stations so a tap always reaches them.

### Areas

| # | Area | Feel | Twist | Rival |
|---|---|---|---|---|
| 1 | **Wanhua 萬華**; Monga 艋舺 appears in flavor (艋舺龍山寺, old-timers) | Old Taipei, temples, stalls | Cheap and steady; the tutorial | Miaokou Gang |
| 2 | **Ximending 西門町** | Youth culture, movie street, tattoo street | Fast income, low property values | Molong Society |
| 3 | **Zhongshan 中山・條通** | Japanese-style lounges, KTV | Night businesses only; night bonus | Yuejian Society |
| 4 | **East District 東區** | 2000s fashion capital | A rotating "hot" lot type earns extra | Jin Tangchi Group |
| 5 | **Xinyi 信義** | 101 rising, new money | Highest values; final boss | Tongtian Development |
| Secret | **Xindian 新店** | Commuter towers, Bitan riverside | Earns extra while offline | Xiaoxiao Realty |

- **The secret area** unlocks after the first Chapter 1 clear and is hidden until then. Its green-line station is permanently revealed after that, but each new run still requires claiming Xinyi to enter. Clearing it plays the founding of New Taipei City (25 Dec 2010).

### Xindian: the Xiaoxiao finale
- **Nine lots:** Station Breakfast Shop, Bitan Riverside Café, Commuter Apartments, Riverside Residences, Hillside Apartments, South Line Offices, Bitan Guesthouse (Qiao-lin), Sunny Courtyard Homes (A-Yin), Xiaoxiao Headquarters (branch network). Uses the existing ×100 district price curve and ×3200 payback slowdown as initial balance values.
- **Commuter district:** Xindian lots earn **×2 while offline** (`XINDIAN_OFFLINE_MULT`). Other districts keep their normal away income. The safe is sized from the boosted offline rate so its stated hours remain accurate; the normal cap still applies. Live income/Best buy continue to use live rates.
- **First lieutenant:** Qiao-lin (`xiaoxiao_agent`), the familiar smiling street-event agent, SR Broker. Friendly Offer buys out a weakened grunt; role aura: Lowball.
- **Second lieutenant:** A-Yin (`a_yin`), SR Scrivener. Final Stamp stuns and strips defense; role aura: Red Tape. His first defeat makes every district’s Xiaoxiao branch available to buy for that run, including headquarters. These lots now have real income; the next cash-out locks the network again.
- **Boss:** Xiao-dong (`xiao_dong`), SSR Broker. Closing Time boosts agent skill charge; commanding gives the existing Old Money aura. Corporate guards shelter the fast-charging back-row agents. Initial suggestion: Defensive (100% daytime boss wins in the 100-seed style check); subject to the balance pass.
- **Rewards:** first wins pay 25 incense; 25 incense +1 ticket; 50 incense +3 tickets respectively. All three join through fights only. The completed Xiaoxiao binder page adds +10% Xindian income and its usual +1 ticket. Later runs award duplicate stars; rematches use the existing cooldown.
- **Completion:** first secret claim shows the full Bitan celebration; later-run claims show the short version. Rematches do not replay the finale. `meta.xindianClears` persists through cash-outs and defaults safely on older saves. Xinyi’s fireworks remain separate.
- **Art:** two new portraits, paired day/night riverside banners and `key/new_taipei`; reuse the existing smiling-agent portrait. New images are pending review. UI supplies names/date/text; no writing in the art.
- **Initial simulation:** 300 seeds, All-around expected Lv30–32 / ★3 / Training 12: Qiao-lin 58% day / 100% night; A-Yin 63% / 100%; Xiao-dong 65% / 100%. Strengths 4.600 / 3.762 / 3.219 are starting values, not the deferred global balance pass. The strong-crew, always-online economy benchmark (`HOURS=96 CREW=1 UP=income:12,lot_price:5,upgrade_price:5,seed:4,old_turf:3 node --import tsx scripts/simulate.ts`) claims Xinyi at 21h47m and Xindian at 74h44m; fights are assumed instantly won and the offline bonus is absent. This longer tail belongs in the balance pass. The default first-run Ximending claim remains 51m.
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
  - One "Not for sale" Xiaoxiao branch lot in every area. Beating Xindian’s second lieutenant opens the branch network for that run.
  - Billboards and a jingle on the map, plus news ticker headlines ("Xiaoxiao Realty opens its 100th branch").
  - A cheerful Xiaoxiao agent in street events whose "helpful" tips were steering you.
  - Each defeated boss's last line points at them ("You think *we're* the problem?").

---

## 2. Economy

### Lots
- About 10 lots per area, including the Xiaoxiao lot. Each has a business category, a ☀ day or 🌙 night tag, a price and an income rate.
- **9 lots per area:** 6 to buy, 2 held by the lieutenants, 1 Xiaoxiao branch. The lists live in `src/game/content/areas.ts`.
- Prices scale ×100 per area, following Wanhua's curve. Income grows less, so each area pays back slower than Wanhua: Ximending ×8 (with cheaper lots, ×0.6 price and ×1.25 income), Zhongshan ×64, East ×400, Xinyi ×800 (prices ×1.5, income ×1.5). Tuned with `npm run sim`.
- **Opening pace:** the first three Wanhua lots cost NT$20K / 85K / 360K (previously 30K / 115K / 440K). This lowers their upgrade costs too. A fresh player can buy the snack stall and upgrade it immediately. Later areas retain the original Wanhua template; existing invested amounts and save balances are preserved.
- **Upgrades:** the first upgrade costs the lot's price, and each level after costs ×1.17 more (tuned with `npm run sim`). Income doubles at levels 10, 25, 50 and 100.
- Lot art changes at levels 25, 50 and 100. For the first pass, the code shows a tier badge on one icon.
- Upgrade toggle: ×1 / ×10 / Max / **Next ×2** (every level up to the next income-doubling milestone, or 10 levels once all are reached). The choice is remembered. Press and hold to keep upgrading.

### Lot categories

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
- **12-minute game day (balance pass, 2026-11-16):** 30 real seconds = 1 game hour, so a 6-minute day and a 6-minute night. Not tied to real time.
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
- **Placement tips (in the assign picker, Map → area → lot):**
  - **A tip line** about that lot. For managers: its earner rank, and either the best fit or, below your top N lots (N = your agent count), advice to put agents on bigger earners first. For security: the area's Muscle need and the bonus a strong guard wins, or that a claimed area has no more shakedowns.
  - **Every candidate shows the real trade:** income added here, what the person they replace adds, and what's lost at the lot they'd leave, so the net on the right adds up. Role perks are said for that lot ("Nothing left to buy in Wanhua, so no discount").
  - **The best guard** is the weakest gangster who still meets the threat, which keeps stronger fighters free for tougher areas.
- **Crew → Posts:** every lot you own by area, with its Manager and Security portraits. Empty slots and too-weak guards are highlighted, your top N earners are tagged, and free crew are listed at the bottom. Tapping a lot opens the same lot sheet and tips.
- **Duty Roster (Face perk, on when bought)** fills empty slots with free crew. Visit empty manager posts by base income, biggest first; choose the free agent who adds the most income to each lot, including 店長 and Local bonuses. Each guard is the weakest one strong enough for that area. **When a new character joins**, it re-shuffles the posts it filled itself (it remembers them) so the newcomer can take the job they're best at. It never moves anyone the player posted by hand.
- **No auto-optimize for players.** "Optimize everyone" is a dev tool only.
- **Dev tools** (the Office dev panel and the speed pill) exist only in dev builds. Production builds strip them out of the bundle entirely.

#### Connections: Locals
Crew from a district’s own gang (`CHARACTERS[id].faction === AREAS[area].rival`): Managers earn **×1.25** on that lot, stacking with 店長; Security count **×2** for Home Turf. Picker labels: “Local: +25% here” / “Local: counts ×2 for Home Turf”. Molong has no agents, so Ximending locals are guards only; Xiaoxiao’s Xindian crew are agents: local Managers there; no local gangster guards yet. Values await the balance pass.

### Shakedowns (rewards only)
Rivals periodically lean on your lots in their area.
- **If Security is strong enough,** the shakedown is repelled. You get a cash bonus, XP and a chance at a scratch card.
- **If the lot is unguarded,** nothing happens. It just misses the bonus. There are no penalties.

### Market share and the price index
- **Market share** = what you've invested ÷ (what you've invested + the rival's stake). The rival's stake is the gang's own base holdings (which include the lieutenant-held lots), plus 1.5× the price of every unlocked lot you don't own yet, including the Xiaoxiao branch. Unlocking a lieutenant's lot never lowers your share.
  - **After you claim an area,** the gang's stake is gone. Only lots still for sale count (1.5× their price), and the not-for-sale Xiaoxiao branch doesn't. Owning every buyable lot is exactly **100%**.
  - The display never rounds up to 100%. Anything short of it shows at most 99%.
  - At 25%, 50% and 75% you can fight the first lieutenant, the second lieutenant and the boss.
  - Lieutenants hold some lots locked until you beat them.
- **Claiming an area:** income in that area doubles, lots you don't own there yet cost 25% less, shakedowns stop there, the price index jumps by 10, and the boss joins your collection.
- **Area twists:** Zhongshan's lots (all night businesses) earn ×2 at night instead of ×1.5. In East District one business type is "hot" and earns ×2; it rotates every game day (boutique → café → nightclub → department store).
- **The price index** starts at 100 each run. It rises with buys and milestones and jumps on claims. A buy or ×2 milestone moves it fully only in your newest open district; each district behind that moves it 100× less (their prices are 100× lower), so cheap old-district milestones are never the best buy late in a run. It multiplies income and property values, drives Face at cash-out, and sets how many floors 101 has.

### Income sources and Best buy (display only; no numbers changed)
- **A lot's income = its base rate × four named sources**, used everywhere income is explained:
  - **The lot:** level and ×2 milestones.
  - **Time & place:** day/night, East District's hot type, a claimed district's ×2.
  - **People:** the Manager.
  - **Reputation:** Good Name, the binder, the price index.
- **Lot sheet:** base rate, then each source's multiplier with a short line on what makes it up ("Off-hours (earns ×1.5 by day) · Claimed ×2"), then income right now.
- **Lot cards:** an unowned lot shows what it would earn right now at Lv 1 with every bonus that already applies (it used to show only base × index).
- **Office → Where your income comes from:** each district's share of income (day and night averaged; under 1% shows as "<1%"), then **Room to grow**, one line per source when it applies: lots within 3 levels of a ×2, the next district to claim, lots with no Manager (and free agents), new cards until the next binder step.
- **Best buy:** of buying a lot, taking one level, or going to the next ×2, the purchase that adds the most income per NT$, day and night averaged. It counts the price-index bump, which raises everything you own, so the number is the real change in income. When the index is most of it, the card and tip say so ("mostly through the price index").
  - **Each district's list** marks its best buy with a green ring and a line ("Lv 10: +NT$X/s for NT$Y"), affordable or not.
  - **The map's next-step tip** names the best buy across all open districts when you can afford it, and later says how much more to save for it.

### Automation (each step is unlocked)
1. Tap the safe to collect.
2. An accountant collects automatically while the game is open.
3. **Standing Orders** (Land Scout merged in, 2026-11-16): one switch in Office. Half of what you earn while the game is open is set aside as its budget (never more than your cash plus the safe), and it spends that on the best buy anywhere, new lots and upgrades alike, one level at a time. It waits for the best buy only when its budget will cover it within 15 seconds; otherwise it takes the best buy it can afford now, so it never sits idle for minutes (fixed 2026-11-16 after it stalled late in a run). Office shows what it's buying or saving for, and says when its budget is waiting in the safe. **Focus on the next rival** (a second switch) sends it to the next rival's district (the one on the map's Next rival card) until that fight is ready, then back to the best buy anywhere; that district's screen says so.
4. **Duty Roster:** keeps posts staffed (see Staff).

Steps 1–2 unlock during a run. Steps 3–4 are permanent Face upgrades, each with an on/off switch that starts on when you buy it. Automation only runs while the game is open. Saves from before v9: owning Land Scout or Standing Orders now means owning Standing Orders (switched on); owning both refunds Land Scout's 20 Face.

### Street events (optional pop-ups on map stations)
- **Temple procession:** tap for a bonus.
- **Walk-in recruit:** a free N or R card.
- **Broker tip:** a lot is about to jump in value. Sometimes the tip comes from the Xiaoxiao agent.
- **Scratch-card drop.**
- **Hot trend** (East District): built into the area as the rotating hot type.
- **Xiaoxiao billboard or news.**
- **Built so far:** one event at a time, every 200–360 s while the game is open, waiting 90 s at a random open station. Temple procession pays 2 minutes of income; a dropped scratch card pays 1; a walk-in recruit is a free N (70%) or R card; a broker tip raises the price index by 2. About a third of tips come from a smiling Xiaoxiao agent.

---

## 3. Turf Wars (auto-battler)

### Basics
- **Fights:** in each area, the first lieutenant unlocks at 25% market share, the second at 50%, and the boss at 75%.
- **Length:** about 30–60 simulated seconds for a lieutenant and about 90 for a boss. Playback defaults to **2×** (roughly 15–45 real seconds), with 1× / 2× / 4× / 8× controls. Existing pre-v7 saves switch to 2× once; later speed choices persist. Ultimate reveals are brief visual overlays and do not pause combat. Battle advancement uses elapsed wall time with fixed simulation steps, independent of rendering; a background timer and visibility/focus handlers catch up throttled tabs. Results resolve once. A browser that fully suspends the tab catches up when it can run again.
- **Losing costs nothing.** The results screen gives a hint about what to try next.
- **Quick claim:** you can skip a fight when your army is at least 2× the recommended power.
- **Time limit:** 75 s for a lieutenant and 120 s for a boss. If the rival holds out, it counts as a loss, which still costs nothing.
- **Recommended power** is tuned per fight with `npm run sim:fights`: it marks roughly where a typical squad starts winning by day. Power is about Muscle ×1.2 + Grit + Business ×0.8 per card, after modifiers.

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
  - Commanders don't make basic attacks.
  - **Aura:** Boss-class cards with a signature aura (Procession, Scooter Crew, Last Call, Daddy's Money, Permits, Old Money, Rave, Lucky Streak) use it. Every other commander gives its role's aura (table below).
  - **Ultimate:** the card's signature skill at double strength, charged over 24 s.
  - **No auto-fill.** The squad stays as you set it; new cards never join on their own (a beaten lieutenant or boss still takes an open slot). New saves start with the starters as the All-around fill; v4 saves with auto-fill on keep that squad as a fixed one.
  - **Three one-tap fills:** Offensive 攻, Defensive 守, All-around 平衡 (`fillSquad` in `turf.ts`). All choose their army first by comparing legal front-row combinations and the best remaining back row; flexible runners compete with fixed-row cards.
    - **Offensive:** Muscle, enforcers, runners and scriveners; keeps a bouncer as an early front-row anchor until an SSR fighter can lead the rush. Prefers damage, speed and skill-charge commander auras.
    - **Defensive:** Grit, healers and shields, with a modest bouncer preference so a much weaker tank does not replace a strong fighter. Prefers health, healing and shield commander auras.
    - **All-around:** total fighting power with a discount for an army summoner, whose signature aura makes commanding especially useful. Back-row attackers go before support; Defensive also considers Business when ordering that row.
    - **Commander selection:** choose Boss first (reserving scarce SSR cards), then Lieutenant, from legal **bench cards outside the army**. Prefer auras matching the style, then estimated aura/ultimate utility. Only if there is no legal bench commander, promote the least valuable legal army fighter by that style's fighting score, and only with a legal bench replacement for its army slot. Reorder the rows after backfilling. If no legal replacement exists, keep the fighter attacking and leave command empty.
    - **Measured gang suggestions:** Miaokou → All-around; Molong → Defensive (tied with All-around against the boss); Yuejian → All-around (tied with Defensive); Jin Tangchi → Offensive; Tongtian → Offensive (Defensive also performs strongly). These are suggestions for typical progression collections, not guarantees for every roster. The 300-seed style sweep has no 0% fills in any scenario; Offensive is still a weaker daytime choice against Molong and Yuejian bosses. Full before/after rates and lineups: [`battle-sim-results.md`](battle-sim-results.md).
- **Home Turf:** +3% Grit to the whole army for each Security posted in that area; a local guard counts twice (+6% before Face upgrades). The prep modifier names the local count. This replaced the idea of a reinforcement bench.
- **Prep screen:** tap a slot to pick a card (drag-and-drop later), or use one of the three fills. Every fill counts the time-of-day bonus for right now (gangsters at night, agents by day), so All-around is the strongest squad for when you fight. A matchup line names the rival's trick and suggests a fill, measured with `STYLES=1 npm run sim:fights` (`MATCHUPS` per district, `FIGHT_MATCHUPS` for lieutenants that differ: Ximending's Xiao Zhen wants All-around, Zhongshan's A-Jian wants Offensive). Current picks: Wanhua All-around, Ximending Offensive, Zhongshan All-around, East District All-around, Xinyi Offensive, Xindian Defensive. The fills are three evenly spaced, equal-width buttons with English names, brief descriptions and a visible Suggested label; the Chinese marks are decorative. It shows your power against the recommended power, every modifier, and a hint like "nightfall in 4 min".
- **Odds, in words:** the prep screen runs 20 practice battles of your exact squad (same engine, fixed seeds, in small slices so phones don't stutter) and shows **Likely win** (70%+), **Even fight** (35–70%) or **Long shot**. If the other half of the day would rate better, it says so and when ("Likely win at night, in 4 min"). Displayed power stays as a rough guide only.
- **After every fight, one line on what happened,** from the finished battle only: win time and crew lost, time running out, the front row falling, plus Tongtian's permit stacks or Miaokou's troupe runners when they mattered. The existing tips stay underneath after a loss.
- A card can be posted at a lot and fight in the squad at the same time.

#### Role auras (commanders without a signature aura)

| Role | Aura |
|---|---|
| 圍事 bouncer | Army +15% health |
| 打手 enforcer | Army +15% damage |
| 小弟 runner | Army attacks 15% faster |
| 軍師 strategist | Skills charge 20% faster |
| 房仲 broker | Enemy grunts start with 15% less health |
| 代書 scrivener | Enemies take 10% more damage |
| 店長 manager | Army heals 1% health per second |
| 會計 accountant | Army starts shielded (15% of health) |

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
- **Home times:** each gang gets the same +20% at its home time: Miaokou, Jin Tangchi, Tongtian and Xiaoxiao by day; Molong and Yuejian at night. The prep screen names it ("Molong Society is strongest at night: the scooter crews race after dark. That's now."). The opening A-Biao fight has no home time.
- **Repelled shakedowns:** each one in a district this run makes that gang's next first-time fight there 2% weaker, up to 10%; the prep screen says so. The count resets after a first-time win there.
- **Market share:** +4% to all stats for every 5% above the fight's threshold, so idle play can always win eventually.
- **Underdog bonus:** extra Face for winning right at the threshold (arrives with Face in milestone 4).
- **Same-faction bonus:** +5% for 2 crew from the same faction, +10% for 3 or more (Independents don't count).
- **Boss gimmicks:**

  | Boss | Gimmick | Counter |
  |---|---|---|
  | Miaokou (Wanhua) | Procession: calls in a troupe runner every 15 s (at most 4 at once) | Hit-all skills |
  | Molong (Ximending) | Scooter crews: very fast, low health | 圍事 plus hit-all skills |
  | Yuejian (Zhongshan) | Charms one of your crew briefly; heals her staff | Burst damage, stuns |
  | Jin Tangchi (East) | Hides behind shielded bodyguards | 代書 defense strip |
  | Tongtian (Xinyi) | Gains a permit buff every 15 s | Fast-kill squads |

### Rewards
- **Opening encounter:** A-Biao unlocks immediately after buying any first Wanhua property. His button says “First property” before that, and the map next-step prompt names him when ready. No market-share grind precedes the first fight. Other rivals retain their 25% / 50% / 75% requirements. This does not grant an underdog Face bonus below the normal 25% line; fight strength and rewards remain as tuned.
- **First win:** unlocks lots or claims the area. The lieutenant or boss joins your collection, and you get gacha currency: 10 incense money for a lieutenant, 20 incense money and 1 lottery ticket for a boss.
- **Rematches:** available any time. A win pays 1 scratch card and XP, at most once per fight every 5 minutes (so quick wins can't be farmed).
- **XP for the whole squad:** 60 for a first win, 30 for any other win, 12 for a loss.
- **Claiming an area** doubles income on its lots and ends shakedowns there.

### Presentation (isometric street diorama, decided 2026-11-16)
- **Camera:** a diagonal isometric plaza (8×8 grid of 2:1 tiles). Rivals stand up-right, your crew down-left, each army in rows: front, back, then commanders furthest from the fight. The battle engine is unchanged; this is presentation only (`src/ui/battle/IsoStage.tsx`).
- **Scene:** the district's paving (its own two tones, a centre lane and slab edges, drawn in 2px steps so edges stair-step like pixel art), darkened at night. Above it, the district's scene in pixel art: the area art cropped to 5:4, shrunk to 130×104 and cut to 32 colours by `npm run art`, drawn at about 3× with hard pixels over a sky gradient.
- **Fighters:** each is its 64 px PixelLab sprite (one still image, facing south-east; rivals are mirrored to face your crew). Until a character's sprite exists, their card stands on the plinth instead. Every fighter has an iso plinth in its side's colour, a shadow, and HP, shield and (yours) skill-charge bars.
- **Motion, all in code:** an attacker dashes part-way to its target and back; a hit flashes the target and knocks it back away from the attacker, with pixel sparks; skills without a target hop; a KO tips the fighter flat; called-in runners drop in from above; an active shield is a cyan ring on the floor; sprites bob on an idle beat. Damage numbers are in the pixel font, and big 漢字 impact text (砰! 爆! 勝!) and the ultimate card stay. Reduced motion turns the movement off.
- **Pacing (slowed 2026-11-16 so fights are readable):** at the default 2× a dash takes about 0.5 s (out, a beat at the target, back), a hit 0.44 s with only the first 40% as a bright flash, a KO tip-over 0.65 s, and damage numbers rise for 1.1 s. Motion scales with battle speed: ×1.4 at 1×, ×0.7 at 4×, ×0.5 at 8×.
- **Grunts** share the `street_punk` sprite washed in their gang's colour (the accent colour when the main one is near black, as with Molong).
- **Manual mode:** tap a glowing fighter to fire its skill.

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
| Lottery 樂透 | Balls tumble; 3 cards per ticket, at least one SR or better; weekly featured character | — | 60% | 32% | 8% |

- **Phone shaking:** request motion permission from the draw button tap. Show whether motion data is connected, blocked by an insecure page, denied, unavailable, or not arriving; offer a permission retry when appropriate. Prefer valid gravity-free acceleration, otherwise filter gravity from the available axes. Four gentle jolts reveal the stick; swipe and tap always remain available.
- **Temple stick grades:** 下籤 = N, 中籤 = R, 上籤 = SR, 上上籤 = SSR.
- **Moon blocks (擲筊):** after a temple draw, you can throw the blocks.
  - Three 聖筊 in a row (12.5%) upgrades the card one rarity.
  - Any other result keeps the card. A throw can never make it worse.
- **Costs:** a scratch card costs 1 scratch card, a temple draw 10 incense money (the first visit each day is free), a lottery spin 1 ticket.
- **Who's inside:** Starter and "All" cards are in every machine; exclusives only in theirs. Earned lieutenants and bosses never come from draws. The lottery's weekly featured card rotates through Jackpot, Lao Zhang, A-Tai, Chen Daishu and A-Xiong and is half of its rarity's chance.
- **Guarantees:** every 10th temple draw is SR or better. The lottery guarantees an SSR by the 40th ticket.
- Guarantee counters carry over between runs, and odds are shown in the game.

#### Connections: Today’s fortune
The **free daily Temple stick** sets that day’s street-event rate: N **×1.25**, R **×1.5**, SR **×1.75**, SSR **×2**. Every stick helps. Use its rarity **before moon-block upgrades**, keyed to `dayKey(gameNow())` like the free visit. Paid draws do not change it. The next scheduled event uses the rate; an existing countdown stays unchanged. The map pill and free-draw slip show the rate. Older saves default to no fortune; cashing out keeps today’s fortune with the draw state.

### Currencies (never reset)

The Map includes a compact one-row **next-step tip** above the map (see §6 for its order). It hides when there's nothing useful to suggest, and dismissing one tip is remembered. The **Resource guide** lives on the Draws page, below the machines (moved off the map 2026-11-16): a collapsible section that starts folded and remembers if you open it. It links to an available rewarded rematch, explains draw costs, currency sources and reward timing, says whether the daily free Temple visit is ready, and briefly covers cash, XP and Face. English labels accompany the decorative currency glyphs.

**How it works (玩法):** a short sheet with one line per system (map, lots, safe, crew, Turf Wars, draws, Office), each with a decorative 漢字 badge. It opens once on a brand-new game, and any time from the **?** button in the top bar.

| Currency | Earned from |
|---|---|
| Scratch cards | Street events, every 4th repelled shakedown, rematch wins |
| Incense money 香油錢 | First wins over lieutenants (10) and bosses (20, which also claims the area), duplicates past ★5 (N 1, R 2, SR 5, SSR 10), plus one free temple visit a day |
| Lottery tickets | First wins over bosses (and Xindian’s second lieutenant), cashing out, completing binder pages |

No real money anywhere.

### Growth
- **Duplicates** add stars, up to ★5. Each star adds 10% to stats.
  - ★3: the signature skill gets 25% stronger.
  - ★5: the commander aura gets 50% stronger, and the card gets a holographic frame.
  - Earned lieutenants and bosses get their duplicates by being beaten again in a later run.
- **Levels** come from working lots and from fights.
- **Extra duplicates** past ★5 trade in for incense money.

### Roster variety
- **Draw-exclusive characters:** some only come from scratch cards, some only from the temple, some only from the lottery.
- **Zodiac (生肖):** picked before your first draw and changeable any time. Each sign makes two roles 1.5× as likely within each rarity; rarity odds never change. Each role is favoured by three signs: Rat 會計 小弟 · Ox 圍事 打手 · Tiger 打手 小弟 · Rabbit 店長 會計 · Dragon 軍師 打手 · Snake 代書 軍師 · Horse 小弟 房仲 · Goat 店長 圍事 · Monkey 房仲 軍師 · Rooster 代書 會計 · Dog 圍事 店長 · Pig 房仲 代書. (Roles only for now: the draw pools are too small for faction tilts to matter.)
- **Commander auras** lead to different army builds.

### Binder (名片簿)
- Pages are grouped by faction. Empty slots show a silhouette and a hint about where to find that character.
- Each completed page gives a permanent bonus and 1 lottery ticket: Hao Linju Realty, lots cost 5% less; each gang page (including Xiaoxiao), +10% income in that gang's area; Independents, the safe holds 2 more hours.
- Every 10 unique cards adds 5% global income.

---

## 5. Cash-out and long-term progression

### Cashing out (金盆洗手)
- **Unlocks** after the first Wanhua claim.
- **Face reward:** floor(√(best net worth this run ÷ NT$10億)), plus 2 per area claimed this run, plus 1 per underdog win (a first win within 5% of the threshold). A cash-out also pays 1 lottery ticket.
- The button always shows "Cash out now: +X Face" and how far you are from the next Face.
- When cashing out would raise your Face by 50% or more (and at least 10 Face, so a first cash-out waits for about a Ximending claim), the button glows and the game suggests it's a good time to retire.
- **Ceremony:** one illustration, then "…but nobody stays retired." Then the new run's three front pages (below).

| Resets | Stays |
|---|---|
| Cash, lots, upgrades, area control, price index, safe, this year's headline and commissions | Cards, stars, levels, binder, draw currencies, guarantee counters, Face and Face upgrades, slot unlocks, automation |

### Run variety: this year's headline and commissions
- **This year's headline (今年頭條):** from run 2 on, the cash-out ends with three tabloid front pages, drawn from the pool below without repeats. You pick one and it applies for the whole run. Run 1 has none. The front pages are drawn in code (red 號外 strip, big 漢字 headline, a line of flavor, the rule, "Good for"), so there's no art. Until you pick, the map's next-step tip and the Office dot point you to them. The headline leads the map's news ticker and sits at the top of Office → This year.

  | Headline | For the whole run | Good for |
  |---|---|---|
  | Typhoon Days 颱風假 | Safe holds 4 more hours (past the usual 24 h cap) | Playing mostly offline |
  | Night Market Fever 夜市熱 | Night businesses everywhere earn ×2 at night, like Zhongshan | Stacking night lots |
  | Election Year 選舉年 | Price index grows 50% faster | Buying and ×2 milestones |
  | New MRT Line 捷運通車 | Lots in one named Chapter 1 district cost 30% less | Rushing that district |
  | Temple Festival Year 遶境年 | Street events 2× as often; processions pay double | Playing actively |
  | Idol Drama Craze 偶像劇熱 | Walk-in recruits 2× as often | Collecting cards |
  | Stock Rally 股市狂飆 | Properties count 1.5× toward net worth, so more Face | Chasing Face |
  | Rearmed Rivals 重整旗鼓 | Rivals 5% stronger (recommended power too; lowered from 15% in the balance pass because fights are steep); every first win pays double incense and +1 Face at cash-out | Fighting |

- **Commissions (委託):** three optional goals per run (run 1 included), drawn from the pool below. Each pays 1 lottery ticket the moment it's done, with a toast, so Face pacing is untouched. A goal that's already done when the run starts is never drawn. Shown in Office → This year with progress bars.
  - Win a Turf War with only agents in your squad (commanders included).
  - Claim Ximending within 2 hours (game time) of starting the run. After that it shows "Missed", the only one that can lapse.
  - Take one lot to Lv 100.
  - Repel 10 shakedowns this run.
  - Win an underdog fight.
  - Own all 8 lots in one district.
  - Raise the price index to 130.
  - Take 5 street events this run.
  - Have a Manager on 6 lots in one district.
- **Saves (v8):** an older save gets three commissions for the run it's in (the timer starts on load), and if it has cashed out before, three front pages to pick from straight away.
- Headline and commission sizes are new values; they get tuned in the balance pass. Values live in `constants.ts` (Run variety).

### Face upgrade tree
Four branches, 17 upgrades (most with several levels), with costs that rise as you buy more. Defined in `src/game/content/face.ts`:

| Branch | Upgrades |
|---|---|
| Business 生意 | Good Name: income +25%/level (20) · Hard Bargain: lots −5%/level (5) · Contractor Friends: upgrades −4%/level (5) · Seed Money: start cash ×10/level (6) · Old Turf: start with 2 Wanhua lots at Lv 10 per level (3) |
| Idle 閒 | Bigger Safe: +2 h/level, 4 → 24 h (10) · Bookkeeper on Staff · Duty Roster (auto-staff) · Standing Orders (auto-buy and auto-upgrade; Land Scout merged in) |
| Muscle 拳頭 | Training: army stats +10%/level (20) · Presence: ultimates charge 15%/level faster (3) · Local Hero: Home Turf +2% per Security per level (5) · Warmed Up: skills start 15%/level charged (4) |
| Network 人脈 | Street Smarts: events 25%/level more often (3) · Lucky Hands: scratch SR +1.5%, SSR +0.5% per level (3) · Temple Regular: Turf War incense +50%/level (3) · Market Buzz: index grows 25%/level faster (4) |

### Pacing targets (to tune)

| Run | Length | Likely reach |
|---|---|---|
| 1 | 2–4 hours plus a night offline | Ximending or Zhongshan |
| 2–3 | About a day each | East District |
| 4–6 | About a day each | Xinyi clear and fireworks |
| After | Ongoing | 新店 and the binder |

Simulated with a perfect, always-online player (`npm run sim`): run 1 claims Ximending at about 51 min after the opening discounts (previously about 55 min) and reaches Zhongshan's lieutenants at 2.5–3.3 h. With early upgrades (Good Name 4, a few discounts) East District's first lieutenant comes at about 6.5 h. A strong late run (Good Name 12 and the other Business upgrades maxed) claims Xinyi at about 17 h. Fights are tuned with the first expected All-around squad for each fight (`TUNE=1 npm run sim:fights`, 400 seeds, strengths to three decimals). After the commander fix, the 400-seed confirmation gives 59–63% daytime wins and 99–100% nighttime wins across all 15 fights; the three stronger Wanhua follow-up squads remain easier. Compare all fills and their lineups with `STYLES=1 N=300 npm run sim:fights`; each uses the same seed range. Power is an estimate, so similar displayed power can still hide differences in attacks, skills and auras.

Opening check (`EARLY=1 HOURS=1 node --import tsx scripts/simulate.ts`, same seed and greedy strategy): second property 85 → 55 seconds; first level-10 milestone 170 → 100 seconds; first lieutenant unlock initially 11m25s → 8m15s from discounts, then → first property purchase (5s in the simulator) with the opening encounter exception; Wanhua claim 20m10s → 16m45s. These are economy unlock times with instantly won fights, not observed player completion times.

**Notoriety (名氣)** levels for after the story are **parked until the user has played a build.**

---

## 6. Phone screens

### Tabs
**Map** (home) · **Crew** (binder, card details, staffing, army setup) · **Draws** · **Office** (Face tree, cash-out, stats, settings, Google sign-in, save export).

Turf Wars launch from an area screen.

### Screens
- **Map:** the metro map with a status bar (cash, income per second, clock with ☀/🌙), red dots for anything worth tapping, and street-event icons.
  - **Next-step tip** (one at a time, dismissable), for money moves: front pages waiting to be picked → an affordable best buy → a free agent with an empty Manager slot → income waiting in the safe → how much more to save for the best buy.
  - **Next rival card** (under the tip): the key milestone. It shows the first unbeaten rival in an open district (a ready one first): portrait, district and rank, and a bar of market influence against the fight's line ("Influence 18% of 25% · buy and upgrade in Wanhua"; for A-Biao, the first Wanhua property). When the fight is ready the card glows and **FIGHT!** opens that fight's prep screen directly. That district's station shows a 戰 badge, pulsing red once the fight is ready.
- **The safe** is a raised button in the middle of the tab bar, so it never covers the lot buttons.
- **Area screen:** an illustrated banner (day/night), a property-ownership count and bar, a fold-out market-influence explanation/bar, and fight buttons at 25/50/75% influence (A-Biao unlocks after the first property), the buy-amount toggle, and a list of lot cards (icon, name, ☀/🌙, level, income, (M)(S) staff slots, upgrade button). Tapping a lot opens a bottom sheet for staffing and details.
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
| **Codex (ChatGPT image generation)** | Style reference sheet, 31 portraits, 5 area banners (day and night), 7 crests, 3 key art, 12 map decorations. Brief: [`art/BRIEF.md`](../art/BRIEF.md) |
| **PixelLab (free tier: about 40 generations, then a few per day)** | 20 lot icons and 6 map-event icons as LED-sign pixel pictograms (all generated). Prompts and results: [`art/PIXELLAB.md`](../art/PIXELLAB.md). Battle sprites: one 64 px still per character in a gritty, realistic-proportion style (not chibi), made a few a day by a daily job, in order: [`art/SPRITES.md`](../art/SPRITES.md) |
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
- **Dev tools (dev builds only):** a DEV speed pill in the top bar cycles game speed 1× / 2× / 4× / 10× (it also speeds up fights), and the console has `taipei2004.skip(seconds)`, `state()` and `set(state)`.

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
- **Light story only (decided 2026-11-16):** keep the rough story already in §1 (the arc, bosses' last lines pointing at Xiaoxiao, the Xindian ending), but no exposition: no story texts, no dialogue scenes, nothing players have to read. The improvement pass's "story beats" section was dropped.
- Xindian implementation is complete locally; new art needs review and the browser walkthrough remains pending.
- Balancing after playtests (`npm run sim` and `npm run sim:fights` hold the current targets)
- **Balance pass (2026-11-16):**
  - **Done:** the 6-minute day and night; rival home times (+20%, with the tutorial fight exempt); repelled shakedowns weakening the gang; district-weighted price-index gains; Standing Orders buying the most valuable unowned lot it can afford first. Every fight re-tuned (`TUNE=1 npm run sim:fights`) to about 70% wins for the expected squad at the gang's off-time.
  - **Home-time difficulty (decided: keep it decisive).** Fights are nearly deterministic (+3% rival strength takes a 70% fight to about 33%), so at a gang's home time the expected squad is a long shot until it's a few levels stronger. That's intended: every gang has a clear right time, it isn't always night, and the wait is at most 6 minutes. The odds line names the better time.
  - **Fill balance (done):** fills now count the time-of-day bonus, All-around is the tuning baseline (about 70% at the off-time for the expected squad), and each style is best somewhere: All-around against East District and Xiao Zhen, Offensive against Ximending's boss, A-Jian, Xinyi and Xindian, Defensive ties in Wanhua, Zhongshan and Xindian. Offensive is a poor pick against Zhongshan and East District, and the matchup hints say so.
  - **Values checked:** Rearmed Rivals lowered to +5% (at +15% it walled off every fight); Locals, the fortune, the other headlines, commissions and Standing Orders' half share stay as they are.
  - **Idea:** a flagship district each run, whose twist gets stronger, so where you invest becomes a real choice.
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
| xiaoxiao_agent | Qiao-lin 喬霖 | Xiaoxiao | Lt SR | 房仲 | Earned | Sunny-yellow blazer, smiley pin, smile a little too wide | **Friendly Offer:** buys out a weakened grunt |
| a_yin | A-Yin 阿印 | Xiaoxiao | Lt SR | 代書 | Earned | Round glasses, yellow waistcoat, sleeve protectors, oversized seal stamp | **Final Stamp:** stuns and strips defense |
| xiao_dong | Xiao-dong 笑董 | Xiaoxiao | Boss SSR | 房仲 | Earned | White suit, yellow tie, salt-and-pepper hair, brochure and house keys | **Closing Time:** charges agent skills; Old Money aura |

**Counts:** 30 collectible characters plus 1 NPC.
- **Women:** 9.
- **Classes:** 11 agents, 19 gangsters.
- **Faction sizes:** Miaokou 4, Molong 5, Yuejian 3, Jin Tangchi 4, Tongtian 3, player agency 4, independent 7.


### Optional analytics and save health

- Office → Settings offers **Share game statistics**, off by default. Production builds send explicit events to the US PostHog ingestion API only after opting in; development builds never send events. No replay, automatic click capture, names or save contents. A separate random browser ID supports return-visit analysis; opting out removes that local ID and stops future sends. Already-sent events are not deleted by this switch.
- Events cover session start/pause/resume and active time, first property purchase in a run, district claims, cash-outs, squad-fill selection, battle outcomes/power ratio/matching fills/playback duration, purchased draws, Temple reveal method, motion access/connection, guide actions and basic error categories. Matching fills can include multiple styles or “custom”; they describe the resulting lineup rather than claiming a fill was selected. Playback duration is wall time, not simulated fight duration. Browser errors are explicit custom events rather than SDK-grouped exception reports.
- Event payloads disable person profiles and GeoIP enrichment and set the IP property to null. Project-level IP discard should also be enabled by the owner. No raw motion readings. Limit collection to 500 events and 10 error reports per page load; no retries or offline event queue. Blocked analytics never blocks gameplay.
- Autosave success/failure and last successful save time appear in Office. A persistent failure banner links there. Save strings and downloadable/uploadable backup files are supported. Saves are local to a browser and website origin; use the stable production URL.
- Engine regression tests cover save failure/recovery and background/resume without duplicate away income. Physical iPhone Chrome/Safari checks remain required for sensor permission, denied/retry, larger text, and browser suspension behavior.
