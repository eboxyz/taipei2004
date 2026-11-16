# Squad fill and battle tuning verification

Measured against the existing progression scenarios in `scripts/battle-sim.ts`, with deterministic seeds starting at 1. Before/after comparisons use 300 seeds for each fill and phase. The final default All-around check uses 400 seeds. The after results include both squad selection changes and fight-strength re-tuning; they do not isolate the commander fix alone.

Command: `STYLES=1 N=300 npm run sim:fights`. Slots 0–1 are front, 2–4 back, 5 Lieutenant, 6 Boss. A dash is an empty/locked slot. The extra stronger Wanhua scenarios are retained as progression checks, not tuning targets.

Findings: every style has nonzero wins in every scenario. Offensive is strongest at Zhongshan's first lieutenant (100% versus 57.3% for the other fills); Defensive is strongest at Xinyi's first lieutenant (100% versus 14.7% Offensive and 61.3% All-around). All-around ties the strongest fill against the Molong and Yuejian bosses, while remaining near 60% by day throughout progression. Styles can share an army and tie when the collection offers few suitable alternatives. Offensive remains a weaker daytime choice against the Molong and Yuejian bosses; the hints recommend steady fills there. Rates describe these collections and seeds, not all possible rosters.

## Before (300 seeds per fill and phase)

```text
wanhua_lt1 | starters Lv1 | N=300
    offense  day 95.3% | night 100.0% | 0:hai_shu 1:a_di 2:a_cai 3:- 4:- 5:- 6:-
    defense  day 95.3% | night 100.0% | 0:hai_shu 1:a_di 2:a_cai 3:- 4:- 5:- 6:-
    balanced day 95.3% | night 100.0% | 0:hai_shu 1:a_di 2:a_cai 3:- 4:- 5:- 6:-
wanhua_lt1 | starters Lv2 | N=300
    offense  day 100.0% | night 100.0% | 0:hai_shu 1:a_di 2:a_cai 3:- 4:- 5:- 6:-
    defense  day 100.0% | night 100.0% | 0:hai_shu 1:a_di 2:a_cai 3:- 4:- 5:- 6:-
    balanced day 100.0% | night 100.0% | 0:hai_shu 1:a_di 2:a_cai 3:- 4:- 5:- 6:-
wanhua_lt2 | +A-Biao Lv1, starters Lv2 | N=300
    offense  day 59.3% | night 100.0% | 0:a_biao 1:hai_shu 2:a_cai 3:a_di 4:- 5:- 6:-
    defense  day 59.3% | night 100.0% | 0:a_biao 1:hai_shu 2:a_cai 3:a_di 4:- 5:- 6:-
    balanced day 59.3% | night 100.0% | 0:a_biao 1:hai_shu 2:a_cai 3:a_di 4:- 5:- 6:-
wanhua_lt2 | +A-Biao Lv2, starters Lv3 | N=300
    offense  day 100.0% | night 100.0% | 0:a_biao 1:hai_shu 2:a_cai 3:a_di 4:- 5:- 6:-
    defense  day 100.0% | night 100.0% | 0:a_biao 1:hai_shu 2:a_cai 3:a_di 4:- 5:- 6:-
    balanced day 100.0% | night 100.0% | 0:a_biao 1:hai_shu 2:a_cai 3:a_di 4:- 5:- 6:-
wanhua_boss | +Gui-yi Lv1, A-Biao Lv2, starters Lv3 | N=300
    offense  day 20.0% | night 98.7% | 0:a_biao 1:hai_shu 2:gui_yi 3:a_cai 4:a_di 5:- 6:-
    defense  day 20.0% | night 98.7% | 0:a_biao 1:hai_shu 2:gui_yi 3:a_cai 4:a_di 5:- 6:-
    balanced day 20.0% | night 98.7% | 0:a_biao 1:hai_shu 2:gui_yi 3:a_cai 4:a_di 5:- 6:-
wanhua_boss | Gui-yi Lv3, A-Biao Lv4, starters Lv4 | N=300
    offense  day 100.0% | night 100.0% | 0:a_biao 1:hai_shu 2:gui_yi 3:a_cai 4:a_di 5:- 6:-
    defense  day 100.0% | night 100.0% | 0:a_biao 1:hai_shu 2:gui_yi 3:a_cai 4:a_di 5:- 6:-
    balanced day 100.0% | night 100.0% | 0:a_biao 1:hai_shu 2:gui_yi 3:a_cai 4:a_di 5:- 6:-
ximending_lt1 | run 1: crew Lv5, Wanhua cards Lv3 | N=300
    offense  day 0.0% | night 0.0% | 0:a_di 1:hai_shu 2:kun_bo 3:gui_yi 4:a_cai 5:a_biao 6:-
    defense  day 37.7% | night 95.0% | 0:hai_shu 1:a_biao 2:a_di 3:gui_yi 4:a_cai 5:kun_bo 6:-
    balanced day 64.0% | night 100.0% | 0:a_biao 1:hai_shu 2:a_di 3:gui_yi 4:a_cai 5:kun_bo 6:-
ximending_lt2 | run 1: + Xiao Zhen | N=300
    offense  day 0.0% | night 0.0% | 0:a_di 1:hai_shu 2:kun_bo 3:xiao_zhen 4:gui_yi 5:a_biao 6:-
    defense  day 0.0% | night 48.7% | 0:hai_shu 1:a_biao 2:a_cai 3:gui_yi 4:xiao_zhen 5:kun_bo 6:-
    balanced day 44.0% | night 84.7% | 0:a_biao 1:hai_shu 2:a_cai 3:gui_yi 4:xiao_zhen 5:kun_bo 6:-
ximending_boss | run 1: + A-Gan | N=300
    offense  day 0.0% | night 0.0% | 0:a_gan 1:hai_shu 2:kun_bo 3:xiao_zhen 4:gui_yi 5:a_biao 6:-
    defense  day 63.7% | night 100.0% | 0:a_biao 1:hai_shu 2:a_gan 3:gui_yi 4:xiao_zhen 5:kun_bo 6:-
    balanced day 63.7% | night 100.0% | 0:a_biao 1:hai_shu 2:a_gan 3:gui_yi 4:xiao_zhen 5:kun_bo 6:-
zhongshan_lt1 | run 2: Lv10, Training 3 | N=300
    offense  day 49.7% | night 100.0% | 0:a_gan 1:hai_shu 2:kun_bo 3:xiao_zhen 4:gui_yi 5:a_biao 6:a_jie
    defense  day 100.0% | night 100.0% | 0:a_jie 1:a_biao 2:a_gan 3:a_cai 4:xiao_zhen 5:gui_yi 6:kun_bo
    balanced day 65.3% | night 100.0% | 0:a_gan 1:a_biao 2:a_cai 3:gui_yi 4:xiao_zhen 5:kun_bo 6:a_jie
zhongshan_lt2 | run 2: + A-Jian | N=300
    offense  day 0.0% | night 100.0% | 0:a_gan 1:hai_shu 2:kun_bo 3:xiao_zhen 4:gui_yi 5:a_biao 6:a_jie
    defense  day 100.0% | night 100.0% | 0:a_jie 1:a_biao 2:a_gan 3:a_cai 4:xiao_zhen 5:gui_yi 6:kun_bo
    balanced day 65.3% | night 99.3% | 0:a_gan 1:a_biao 2:a_cai 3:gui_yi 4:xiao_zhen 5:kun_bo 6:a_jie
zhongshan_boss | run 2: + Coco | N=300
    offense  day 0.0% | night 52.7% | 0:a_gan 1:hai_shu 2:kun_bo 3:xiao_zhen 4:gui_yi 5:a_biao 6:a_jie
    defense  day 100.0% | night 100.0% | 0:a_jie 1:a_biao 2:a_gan 3:a_cai 4:xiao_zhen 5:gui_yi 6:kun_bo
    balanced day 52.3% | night 96.0% | 0:a_gan 1:a_biao 2:a_cai 3:gui_yi 4:xiao_zhen 5:kun_bo 6:a_jie
east_lt1 | run 3: Lv15 ★2, Training 6 | N=300
    offense  day 0.0% | night 100.0% | 0:a_gan 1:a_jian 2:kun_bo 3:yue_jie 4:xiao_zhen 5:a_biao 6:a_jie
    defense  day 100.0% | night 100.0% | 0:a_jie 1:a_jian 2:xiao_zhen 3:a_gan 4:gui_yi 5:kun_bo 6:yue_jie
    balanced day 63.0% | night 100.0% | 0:a_jian 1:a_biao 2:gui_yi 3:yue_jie 4:xiao_zhen 5:kun_bo 6:a_jie
east_lt2 | run 3: + Da-kuai | N=300
    offense  day 0.0% | night 33.3% | 0:a_gan 1:a_jian 2:kun_bo 3:yue_jie 4:xiao_zhen 5:a_biao 6:a_jie
    defense  day 100.0% | night 100.0% | 0:a_jie 1:a_jian 2:xiao_zhen 3:a_gan 4:gui_yi 5:kun_bo 6:yue_jie
    balanced day 52.3% | night 100.0% | 0:a_jian 1:a_biao 2:gui_yi 3:yue_jie 4:xiao_zhen 5:kun_bo 6:a_jie
east_boss | run 3: + Vivi | N=300
    offense  day 98.7% | night 100.0% | 0:a_gan 1:a_jian 2:kun_bo 3:yue_jie 4:xiao_zhen 5:a_biao 6:a_jie
    defense  day 100.0% | night 100.0% | 0:a_jie 1:a_jian 2:xiao_zhen 3:coco 4:gui_yi 5:kun_bo 6:yue_jie
    balanced day 52.0% | night 100.0% | 0:a_jian 1:a_biao 2:gui_yi 3:yue_jie 4:xiao_zhen 5:kun_bo 6:a_jie
xinyi_lt1 | run 4: Lv22 ★3, Training 10 | N=300
    offense  day 19.7% | night 100.0% | 0:a_gan 1:a_jian 2:kun_bo 3:yue_jie 4:jin_shao 5:a_biao 6:a_jie
    defense  day 100.0% | night 100.0% | 0:a_jie 1:a_jian 2:gui_yi 3:vivi 4:jin_shao 5:kun_bo 6:yue_jie
    balanced day 56.3% | night 98.0% | 0:a_jian 1:a_biao 2:xiao_zhen 3:yue_jie 4:jin_shao 5:kun_bo 6:a_jie
xinyi_lt2 | run 4: + Secretary Lin | N=300
    offense  day 91.0% | night 100.0% | 0:a_gan 1:a_jian 2:kun_bo 3:yue_jie 4:jin_shao 5:a_biao 6:a_jie
    defense  day 100.0% | night 100.0% | 0:a_jie 1:a_jian 2:gui_yi 3:vivi 4:jin_shao 5:kun_bo 6:yue_jie
    balanced day 60.3% | night 100.0% | 0:a_jian 1:a_biao 2:xiao_zhen 3:yue_jie 4:jin_shao 5:kun_bo 6:a_jie
xinyi_boss | run 4: + Tie-ge | N=300
    offense  day 97.7% | night 100.0% | 0:a_gan 1:a_jian 2:kun_bo 3:yue_jie 4:jin_shao 5:a_biao 6:a_jie
    defense  day 100.0% | night 100.0% | 0:a_jie 1:a_jian 2:gui_yi 3:vivi 4:jin_shao 5:kun_bo 6:yue_jie
    balanced day 68.3% | night 100.0% | 0:a_jian 1:a_biao 2:xiao_zhen 3:yue_jie 4:jin_shao 5:kun_bo 6:a_jie
```

## After (300 seeds per fill and phase)

```text
> taipei2004@0.1.0 sim:fights
> node --import tsx scripts/battle-sim.ts

wanhua_lt1 | starters Lv1 | N=300
    offense  day 67.7% | night 99.0% | 0:hai_shu 1:a_di 2:a_cai 3:- 4:- 5:- 6:-
    defense  day 67.7% | night 99.0% | 0:hai_shu 1:a_di 2:a_cai 3:- 4:- 5:- 6:-
    balanced day 67.7% | night 99.0% | 0:hai_shu 1:a_di 2:a_cai 3:- 4:- 5:- 6:-
wanhua_lt1 | starters Lv2 | N=300
    offense  day 98.3% | night 100.0% | 0:hai_shu 1:a_di 2:a_cai 3:- 4:- 5:- 6:-
    defense  day 98.3% | night 100.0% | 0:hai_shu 1:a_di 2:a_cai 3:- 4:- 5:- 6:-
    balanced day 98.3% | night 100.0% | 0:hai_shu 1:a_di 2:a_cai 3:- 4:- 5:- 6:-
wanhua_lt2 | +A-Biao Lv1, starters Lv2 | N=300
    offense  day 66.0% | night 100.0% | 0:a_biao 1:hai_shu 2:a_cai 3:a_di 4:- 5:- 6:-
    defense  day 61.3% | night 100.0% | 0:a_biao 1:hai_shu 2:a_di 3:a_cai 4:- 5:- 6:-
    balanced day 61.3% | night 100.0% | 0:a_biao 1:hai_shu 2:a_di 3:a_cai 4:- 5:- 6:-
wanhua_lt2 | +A-Biao Lv2, starters Lv3 | N=300
    offense  day 100.0% | night 100.0% | 0:a_biao 1:hai_shu 2:a_cai 3:a_di 4:- 5:- 6:-
    defense  day 99.7% | night 100.0% | 0:a_biao 1:hai_shu 2:a_di 3:a_cai 4:- 5:- 6:-
    balanced day 99.7% | night 100.0% | 0:a_biao 1:hai_shu 2:a_di 3:a_cai 4:- 5:- 6:-
wanhua_boss | +Gui-yi Lv1, A-Biao Lv2, starters Lv3 | N=300
    offense  day 62.3% | night 100.0% | 0:a_biao 1:hai_shu 2:gui_yi 3:a_cai 4:a_di 5:- 6:-
    defense  day 62.7% | night 100.0% | 0:a_biao 1:hai_shu 2:gui_yi 3:a_di 4:a_cai 5:- 6:-
    balanced day 62.7% | night 100.0% | 0:a_biao 1:hai_shu 2:a_di 3:gui_yi 4:a_cai 5:- 6:-
wanhua_boss | Gui-yi Lv3, A-Biao Lv4, starters Lv4 | N=300
    offense  day 100.0% | night 100.0% | 0:a_biao 1:hai_shu 2:gui_yi 3:a_cai 4:a_di 5:- 6:-
    defense  day 100.0% | night 100.0% | 0:a_biao 1:hai_shu 2:gui_yi 3:a_di 4:a_cai 5:- 6:-
    balanced day 100.0% | night 100.0% | 0:a_biao 1:hai_shu 2:a_di 3:gui_yi 4:a_cai 5:- 6:-
ximending_lt1 | run 1: crew Lv5, Wanhua cards Lv3 | N=300
    offense  day 95.7% | night 100.0% | 0:a_biao 1:hai_shu 2:kun_bo 3:a_cai 4:a_di 5:gui_yi 6:-
    defense  day 100.0% | night 100.0% | 0:a_biao 1:hai_shu 2:gui_yi 3:a_di 4:a_cai 5:kun_bo 6:-
    balanced day 59.7% | night 100.0% | 0:a_biao 1:hai_shu 2:kun_bo 3:a_di 4:a_cai 5:gui_yi 6:-
ximending_lt2 | run 1: + Xiao Zhen | N=300
    offense  day 42.3% | night 100.0% | 0:a_biao 1:hai_shu 2:kun_bo 3:xiao_zhen 4:a_cai 5:gui_yi 6:-
    defense  day 60.0% | night 99.0% | 0:a_biao 1:hai_shu 2:kun_bo 3:gui_yi 4:a_cai 5:xiao_zhen 6:-
    balanced day 60.0% | night 99.0% | 0:a_biao 1:hai_shu 2:kun_bo 3:gui_yi 4:a_cai 5:xiao_zhen 6:-
ximending_boss | run 1: + A-Gan | N=300
    offense  day 20.3% | night 100.0% | 0:a_biao 1:hai_shu 2:kun_bo 3:a_gan 4:xiao_zhen 5:gui_yi 6:-
    defense  day 61.0% | night 100.0% | 0:a_biao 1:hai_shu 2:kun_bo 3:xiao_zhen 4:gui_yi 5:a_gan 6:-
    balanced day 61.0% | night 100.0% | 0:a_biao 1:hai_shu 2:kun_bo 3:xiao_zhen 4:gui_yi 5:a_gan 6:-
zhongshan_lt1 | run 2: Lv10, Training 3 | N=300
    offense  day 100.0% | night 100.0% | 0:a_jie 1:a_biao 2:a_gan 3:xiao_zhen 4:a_cai 5:gui_yi 6:kun_bo
    defense  day 57.3% | night 100.0% | 0:a_jie 1:a_biao 2:xiao_zhen 3:gui_yi 4:a_cai 5:a_gan 6:kun_bo
    balanced day 57.3% | night 100.0% | 0:a_jie 1:a_biao 2:xiao_zhen 3:gui_yi 4:a_cai 5:a_gan 6:kun_bo
zhongshan_lt2 | run 2: + A-Jian | N=300
    offense  day 61.3% | night 100.0% | 0:a_jie 1:a_biao 2:a_gan 3:xiao_zhen 4:gui_yi 5:a_jian 6:kun_bo
    defense  day 61.3% | night 100.0% | 0:a_jie 1:a_biao 2:a_gan 3:xiao_zhen 4:gui_yi 5:a_jian 6:kun_bo
    balanced day 61.3% | night 100.0% | 0:a_jie 1:a_biao 2:a_gan 3:xiao_zhen 4:gui_yi 5:a_jian 6:kun_bo
zhongshan_boss | run 2: + Coco | N=300
    offense  day 11.7% | night 100.0% | 0:a_jie 1:a_biao 2:a_gan 3:xiao_zhen 4:gui_yi 5:coco 6:kun_bo
    defense  day 61.0% | night 100.0% | 0:a_jie 1:a_biao 2:a_gan 3:xiao_zhen 4:gui_yi 5:a_jian 6:kun_bo
    balanced day 61.0% | night 100.0% | 0:a_jie 1:a_biao 2:a_gan 3:xiao_zhen 4:gui_yi 5:a_jian 6:kun_bo
east_lt1 | run 3: Lv15 ★2, Training 6 | N=300
    offense  day 100.0% | night 100.0% | 0:a_jie 1:a_biao 2:yue_jie 3:a_gan 4:xiao_zhen 5:coco 6:kun_bo
    defense  day 100.0% | night 100.0% | 0:a_jie 1:a_biao 2:xiao_zhen 3:yue_jie 4:gui_yi 5:a_jian 6:kun_bo
    balanced day 57.0% | night 100.0% | 0:a_jie 1:a_biao 2:xiao_zhen 3:yue_jie 4:gui_yi 5:a_gan 6:kun_bo
east_lt2 | run 3: + Da-kuai | N=300
    offense  day 100.0% | night 100.0% | 0:a_jie 1:a_biao 2:yue_jie 3:a_gan 4:xiao_zhen 5:coco 6:kun_bo
    defense  day 100.0% | night 100.0% | 0:a_jie 1:a_biao 2:xiao_zhen 3:yue_jie 4:gui_yi 5:a_jian 6:kun_bo
    balanced day 61.3% | night 100.0% | 0:a_jie 1:a_biao 2:xiao_zhen 3:yue_jie 4:gui_yi 5:a_gan 6:kun_bo
east_boss | run 3: + Vivi | N=300
    offense  day 100.0% | night 100.0% | 0:a_jie 1:a_biao 2:yue_jie 3:a_gan 4:xiao_zhen 5:coco 6:kun_bo
    defense  day 100.0% | night 100.0% | 0:a_jie 1:a_biao 2:yue_jie 3:xiao_zhen 4:gui_yi 5:a_jian 6:kun_bo
    balanced day 60.0% | night 100.0% | 0:a_jie 1:a_biao 2:xiao_zhen 3:yue_jie 4:gui_yi 5:a_gan 6:kun_bo
xinyi_lt1 | run 4: Lv22 ★3, Training 10 | N=300
    offense  day 14.7% | night 100.0% | 0:a_jie 1:a_biao 2:yue_jie 3:a_gan 4:kun_bo 5:xiao_zhen 6:jin_shao
    defense  day 100.0% | night 100.0% | 0:a_jie 1:a_biao 2:yue_jie 3:jin_shao 4:gui_yi 5:a_jian 6:kun_bo
    balanced day 61.3% | night 99.0% | 0:a_jie 1:a_biao 2:xiao_zhen 3:yue_jie 4:jin_shao 5:gui_yi 6:kun_bo
xinyi_lt2 | run 4: + Secretary Lin | N=300
    offense  day 100.0% | night 100.0% | 0:a_jie 1:a_biao 2:yue_jie 3:a_gan 4:jin_shao 5:xiao_zhen 6:kun_bo
    defense  day 100.0% | night 100.0% | 0:a_jie 1:a_biao 2:yue_jie 3:jin_shao 4:gui_yi 5:a_jian 6:kun_bo
    balanced day 57.3% | night 100.0% | 0:a_jie 1:a_biao 2:xiao_zhen 3:yue_jie 4:jin_shao 5:gui_yi 6:kun_bo
xinyi_boss | run 4: + Tie-ge | N=300
    offense  day 100.0% | night 100.0% | 0:a_jie 1:a_biao 2:yue_jie 3:a_gan 4:jin_shao 5:xiao_zhen 6:kun_bo
    defense  day 100.0% | night 100.0% | 0:a_jie 1:a_biao 2:yue_jie 3:jin_shao 4:gui_yi 5:da_kuai 6:kun_bo
    balanced day 58.7% | night 100.0% | 0:a_jie 1:a_biao 2:xiao_zhen 3:yue_jie 4:jin_shao 5:gui_yi 6:kun_bo
```

## Final All-around confirmation (400 seeds per phase)

Command: `npm run sim:fights`. All 15 first/expected scenarios win 59–63% by day and 99–100% at night. The stronger Wanhua follow-ups win 99–100%.

```text
> taipei2004@0.1.0 sim:fights
> node --import tsx scripts/battle-sim.ts

wanhua_lt1   rec  115 | starters Lv1
    day: power 117 → win 63% (52s, avg 53s)
    night: power 124 → win 99% (50s, avg 50s)
wanhua_lt1   rec  115 | starters Lv2
    day: power 127 → win 99% (50s, avg 50s)
    night: power 134 → win 100% (45s, avg 45s)
wanhua_lt2   rec  210 | +A-Biao Lv1, starters Lv2
    day: power 208 → win 60% (53s, avg 62s)
    night: power 232 → win 100% (43s, avg 43s)
wanhua_lt2   rec  210 | +A-Biao Lv2, starters Lv3
    day: power 227 → win 100% (46s, avg 46s)
    night: power 251 → win 100% (37s, avg 37s)
wanhua_boss  rec  315 | +Gui-yi Lv1, A-Biao Lv2, starters Lv3
    day: power 304 → win 61% (84s, avg 87s)
    night: power 315 → win 100% (66s, avg 66s)
wanhua_boss  rec  315 | Gui-yi Lv3, A-Biao Lv4, starters Lv4
    day: power 336 → win 100% (68s, avg 68s)
    night: power 349 → win 100% (59s, avg 59s)
ximending_lt1 rec  480 | run 1: crew Lv5, Wanhua cards Lv3
    day: power 474 → win 60% (68s, avg 71s)
    night: power 506 → win 100% (39s, avg 39s)
ximending_lt2 rec  550 | run 1: + Xiao Zhen
    day: power 535 → win 59% (52s, avg 56s)
    night: power 583 → win 99% (50s, avg 50s)
ximending_boss rec  570 | run 1: + A-Gan
    day: power 557 → win 61% (101s, avg 106s)
    night: power 633 → win 100% (60s, avg 60s)
zhongshan_lt1 rec 1250 | run 2: Lv10, Training 3
    day: power 1224 → win 60% (69s, avg 71s)
    night: power 1372 → win 100% (47s, avg 47s)
zhongshan_lt2 rec 1310 | run 2: + A-Jian
    day: power 1263 → win 60% (66s, avg 69s)
    night: power 1453 → win 100% (47s, avg 47s)
zhongshan_boss rec 1310 | run 2: + Coco
    day: power 1270 → win 61% (87s, avg 94s)
    night: power 1462 → win 100% (56s, avg 56s)
east_lt1     rec 2360 | run 3: Lv15 ★2, Training 6
    day: power 2316 → win 60% (66s, avg 69s)
    night: power 2542 → win 100% (43s, avg 43s)
east_lt2     rec 2460 | run 3: + Da-kuai
    day: power 2415 → win 61% (61s, avg 67s)
    night: power 2649 → win 100% (47s, avg 47s)
east_boss    rec 2490 | run 3: + Vivi
    day: power 2430 → win 60% (88s, avg 81s)
    night: power 2662 → win 100% (52s, avg 52s)
xinyi_lt1    rec 4110 | run 4: Lv22 ★3, Training 10
    day: power 4295 → win 60% (71s, avg 72s)
    night: power 4477 → win 99% (51s, avg 51s)
xinyi_lt2    rec 4250 | run 4: + Secretary Lin
    day: power 4446 → win 60% (59s, avg 66s)
    night: power 4630 → win 100% (42s, avg 42s)
xinyi_boss   rec 4270 | run 4: + Tie-ge
    day: power 4468 → win 59% (100s, avg 105s)
    night: power 4648 → win 100% (52s, avg 52s)
```

## Tuning

Ran `TUNE=1 npm run sim:fights` at the default 400 seeds, then repeated with `ONLY=east` and `ONLY=xinyi` after adjusting the All-around commander preference. Final strengths use three decimals and are saved in `src/game/content/fights.ts`. The simulator runs through `node --import tsx` to avoid the tsx CLI IPC socket, which is blocked by this workspace sandbox.
