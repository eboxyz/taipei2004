# Battle sprites (PixelLab)

Fighters on the isometric Turf War stage. One still image per character; code does all the motion (idle bob, dash, hit flash, knock-over). A card standee stands in until a character's sprite exists, so these can arrive in any order.

## How to make one
- **Tool:** `create_image_pixen` (1 generation each). The free plan runs one job at a time: start one, `wait_for_jobs`, `get_image`, then start the next.
- **Settings:** `width` 64, `height` 64, `no_background` true, `view` "low top-down", `direction` "south-east", `outline` "single color black outline", `detail` "medium detail".
- **Description:** the shared opening below, then the character's line from the table.
  > full body pixel art character, realistic adult proportions (not chibi), cool gritty 2000s Taipei
- **End every description with:** `, moody shading, limited palette`
- **Save to:** `art/source/sprites/<id>.png`, then run `npm run art`.
- **Check it** before marking it done: one full-body character, not cut off, not chibi, no text or logos, facing roughly toward the viewer and to the right, recognizably the character's look. A clear miss is marked `retry` with a note and tried again on a later day, never twice in one day.
- **Look we're after:** realistic proportions, gritty shading, black outline. See `a_biao` and `hai_shu`, which the user approved.
- Rivals' sprites are mirrored in code, and grunts reuse `street_punk` recolored per gang in code, so keep the punk's clothes neutral grey and black.

## Order and status
Earliest-seen characters first: the grunt and starters, then each district's rivals in map order, then draw-only crew, then Xiaoxiao Realty (secret area).

| # | id | Description (after the shared opening) | Status |
|---|---|---|---|
| — | a_biao | gangster: A-Biao, a swaggering enforcer in his 30s, loud red aloha shirt hanging open over a white undershirt, thick gold chain, slicked-back black hair, dark sunglasses, cargo shorts and flip-flops, a long string of red firecrackers slung over one shoulder, tough confident stance | done |
| — | hai_shu | street bouncer: Hai-shu, a weathered retired sailor in his 50s, broad muscular shoulders, grey buzz cut and stubble, faded anchor tattoo on his forearm, white tank top, a towel slung around his neck, navy work pants, rubber sandals, arms crossed, calm unshakable stance | done |
| 1 | street_punk | street punk grunt: a wiry young thug in his early 20s, messy hair, plain grey hoodie, black track pants and sneakers, hands in pockets, sneering, neutral grey and black clothing only | done |
| 2 | a_cai | junior real estate broker: A-Cai, an eager young man in his mid 20s, neat side-parted hair, white short-sleeve dress shirt, loosened tie, slacks, a stack of property flyers in one hand, hustler grin | done |
| 3 | a_di | bicycle errand runner: A-Di, a skinny 18-year-old, messy hair, oversized t-shirt and basketball shorts, sneakers, a ring of keys on his belt and a bag of lunchboxes, cocky grin | todo |
| 4 | gui_yi | gang accountant: Gui-yi, a sharp woman in her 60s, tight curly perm, reading glasses on a chain, floral blouse and cardigan, holding a wooden abacus, shrewd stare | todo |
| 5 | kun_bo | old gang boss: Kun-bo, a bald man in his 70s, white undershirt, loose slacks and slippers, wooden prayer beads around his wrist, carrying a red plastic stool, calm menacing presence | todo |
| 6 | xiao_zhen | tattoo artist: Xiao Zhen, a woman in her late 20s, half-shaved head with long black hair on one side, tattooed arms, black tank top, black inked latex gloves, holding a tattoo machine, cool stare | todo |
| 7 | a_gan | arcade champion: A-Gan, a young woman around 20, oversized basketball jersey, cap worn backwards, track pants, holding a cup full of arcade tokens, smug grin | todo |
| 8 | a_jie | scooter crew leader: A-Jie, a 22-year-old man, bleached spiky hair, sleeveless top showing dragon tattoo sleeves on both arms, ripped jeans, boots, scooter key on one finger, fierce look | todo |
| 9 | a_jian | head bartender and bouncer: A-Jian, a broad man in his 40s, slicked hair, black vest, white shirt and bow tie, holding a cocktail shaker, stern unflappable stance | todo |
| 10 | coco | office-lady fixer: Coco, a woman in her late 20s, sleek bob, fitted grey skirt suit, a charm-covered pink flip phone in one hand and a clipboard in the other, sly smile | todo |
| 11 | yue_jie | lounge mama-san: Yue-jie, an elegant woman in her 50s, silver-streaked updo, indigo qipao, folding fan held up, poised commanding stance | todo |
| 12 | da_kuai | giant bodyguard: Da-kuai, a huge man, black suit, white shirt, black tie, sunglasses, coiled earpiece cord, hands folded, intimidating bulk | todo |
| 13 | vivi | rich heir's assistant: Vivi, a woman in her 20s, oversized sunglasses, pastel blouse and pencil skirt, a PDA in one hand and a fan of credit cards in the other, bored expression | todo |
| 14 | jin_shao | spoiled rich heir: Jin-shao, a man in his late 20s, pastel pink suit, popped collar, sunglasses pushed up on styled hair, gold watch, arrogant smirk | todo |
| 15 | tie_ge | construction site foreman: Tie-ge, a burly man in his 40s, yellow hard hat, orange reflective vest over a work shirt, work boots, a length of steel rebar over his shoulder, tough scowl | todo |
| 16 | secretary_lin | political aide: Secretary Lin, a woman in her 30s, sharp black bob, thin glasses, dark pantsuit, a briefcase in one hand and two flip phones in the other, cold efficient look | todo |
| 17 | tian_dong | property developer chairman: Tian-dong, a man in his 60s, swept silver hair, double-breasted navy suit, a white hard hat under one arm, gold cufflinks, powerful smug stance | todo |
| 18 | intern | nervous agency intern: a young man around 22, suit two sizes too big, lanyard ID badge, clutching a folder, terrified expression | todo |
| 19 | a_shun | temple procession drummer: A-Shun, a muscular man in his 30s, red headband, sleeveless tunic, drumsticks in both hands, energetic stance | todo |
| 20 | a_hao | scooter runner: A-Hao, a young man around 20, sticker-covered open-face helmet, windbreaker, cargo pants, sneakers, scooter key in hand | todo |
| 21 | lao_liu | chauffeur: Lao Liu, a man in his 50s, black chauffeur uniform, peaked cap, white gloves, holding car keys, dignified stance | todo |
| 22 | chen_daishu | land scrivener: Chen Daishu, a woman in her 50s, short practical hair, glasses, beige cardigan over a blouse, holding a carved seal stamp and a red ink pad, precise look | todo |
| 23 | lao_zhang | night market king: Lao Zhang, a stocky man in his 50s, white tank top, stained apron, towel on one shoulder, holding a giant wok, grinning | todo |
| 24 | a_xiong | taxi driver: A-Xiong, a man in his 40s, aviator sunglasses, loud patterned short-sleeve shirt, CB radio handset in hand, toothpick, laid-back swagger | todo |
| 25 | lao_zhou | retired detective: Lao Zhou, a man in his 60s, beige trench coat, grey slacks, toothpick in his mouth, hands in pockets, world-weary stare | todo |
| 26 | bao_zhu | legendary property flipper: Bao-zhu, a woman in her 50s, huge permed hair, jade bangles, bright floral blouse, cash-stuffed fanny pack, confident laugh | todo |
| 27 | a_tai | temple festival performer: A-Tai, a young man in a Techno Third Prince deity costume with a big painted festival head, glow sticks in both hands, dancing pose | todo |
| 28 | jackpot | betel-nut stand owner who won the lottery: Jackpot, a man in his 40s, gold chains, gold watch, gold-rimmed sunglasses, flashy gold shirt, cheeky grin | todo |
| 29 | xiaoxiao_agent | cheerful realtor: Qiao-ling, a young woman in her 20s, sunny yellow blazer, white blouse, smiley-face pin, neat ponytail, a smile a little too wide, holding property flyers | todo |
| 30 | a_yin | meticulous scrivener: A-Yin, a thin man around 30, round glasses, yellow waistcoat, white shirt with sleeve protectors, an oversized seal stamp and a document folder, prim | todo |
| 31 | xiao_dong | sunny realty chairman: Xiao-dong, a man around 50, immaculate white suit, yellow tie and pocket square, gold house-key lapel pin, open property brochure in hand, beaming too-perfect smile | todo |

## Log
- 2026-11-16: a_biao, hai_shu (style tests, approved); street_punk, a_cai. Generations left: 0.
