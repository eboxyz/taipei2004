import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { canHireAccountant } from './game/actions';
import { canDraw } from './game/gacha';
import { canCashOut, cashOutPreview } from './game/face';
import { gameNow } from './ui/time';
import { ALL_LOTS, AREAS, AREA_ORDER } from './game/content/areas';
import { CHARACTERS } from './game/content/characters';
import { COMMISSIONS } from './game/commissions';
import { ACCOUNTANT_COST } from './game/constants';
import { formatMoney } from './game/format';
import { postOf } from './game/economy';
import { canChallenge } from './game/turf';
import { fightFor } from './game/content/fights';
import type { AwaySummary } from './game/offline';
import type { AreaId, GameEvent, GameState } from './game/types';
import { AwayModal, SafeButton, TabBar, Toasts, TopBar, type Tab, type Toast } from './ui/components/chrome';
import { getSaveHealth, subscribeSaveHealth, startEngine } from './ui/engine';
import { store, useGame } from './ui/store';
import { AreaScreen } from './ui/screens/AreaScreen';
import { CrewScreen } from './ui/screens/CrewScreen';
import { DrawsScreen } from './ui/screens/DrawsScreen';
import { MapScreen } from './ui/screens/MapScreen';
import { OfficeScreen } from './ui/screens/OfficeScreen';
import { HowToPlay } from './ui/components/HowToPlay';
import { track } from './ui/analytics';

const INTRO_KEY = 'taipei2004.intro';

function describe(e: GameEvent, s: GameState): Omit<Toast, 'id'> | null {
  const fmt = s.settings.numberFormat;
  switch (e.kind) {
    case 'shakedown-repelled': {
      const lot = ALL_LOTS[e.lotId];
      const gang = lot ? AREAS[lot.area].rival : null;
      return {
        tone: 'good',
        text: `${CHARACTERS[e.charId]?.name} ran off a ${gang ? `${gang[0]!.toUpperCase()}${gang.slice(1)}` : ''} shakedown at ${lot?.name}: +${formatMoney(e.bonus, fmt)}${e.scratch ? '. They dropped a scratch card 刮刮樂!' : ''}`,
      };
    }
    case 'shakedown-unguarded':
      return { text: `Someone leaned on ${ALL_LOTS[e.lotId]?.name}. Post Security there to earn shakedown bonuses.` };
    case 'auto-bought':
      return { tone: 'good', text: `Standing Orders bought ${ALL_LOTS[e.lotId]?.name}.` };
    case 'level-up':
      return { tone: 'good', text: `${CHARACTERS[e.charId]?.name} reached Lv ${e.level}!` };
    case 'commission':
      return { tone: 'good', text: `Commission done: ${COMMISSIONS[e.id].text} +1 lottery ticket 樂透` };
    default:
      return null;
  }
}

function Game() {
  const s = useGame();
  const saveHealth = useSyncExternalStore(subscribeSaveHealth, getSaveHealth);
  const [tab, setTab] = useState<Tab>('map');
  const [area, setArea] = useState<AreaId | null>(null);
  /** A fight to open straight onto when entering a district from the map's FIGHT! button. */
  const [areaFight, setAreaFight] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [away, setAway] = useState<AwaySummary | null>(null);
  // "How it works" opens once on a brand-new game; after that it's behind the ? in the top bar.
  const [help, setHelp] = useState(() => {
    const st = store.get();
    const fresh = st.meta.runs === 0 && Object.keys(st.lots).length === 0 && st.stats.lotsBought === 0;
    try {
      return fresh && localStorage.getItem(INTRO_KEY) !== 'seen';
    } catch {
      return fresh;
    }
  });
  const closeHelp = () => {
    setHelp(false);
    try {
      localStorage.setItem(INTRO_KEY, 'seen');
    } catch {
      /* shows again next time, which is fine */
    }
  };
  const screenRef = useRef<HTMLDivElement>(null);

  const toast = useCallback((text: string, tone?: Toast['tone']) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600);
  }, []);

  useEffect(
    () =>
      startEngine({
        onEvents: (events) => {
          for (const e of events) {
            const d = describe(e, store.get());
            if (d) toast(d.text, d.tone);
          }
        },
        onAway: setAway,
      }),
    [toast],
  );

  useEffect(() => {
    screenRef.current?.scrollTo({ top: 0 });
  }, [tab, area]);

  const freeCrew = Object.keys(s.characters).some((id) => !postOf(s, id));
  const openSlots = Object.values(s.lots).some((ls) => !ls.manager || !ls.security);
  const fightReady = AREA_ORDER.some((a) =>
    (['lt1', 'lt2', 'boss'] as const).some((k) => !s.areas[a][k] && fightFor(a, k) && canChallenge(s, fightFor(a, k)!)),
  ) || !!s.event;
  const dots: Partial<Record<Tab, boolean>> = {
    map: fightReady,
    crew: freeCrew && openSlots,
    draws: !s.zodiac || (['scratch', 'temple', 'lottery'] as const).some((kind) => canDraw(s, kind, gameNow()).ok),
    office: (canHireAccountant(s) && s.cash >= ACCOUNTANT_COST) || (canCashOut(s) && cashOutPreview(s).goodTime) || s.run.offers.length > 0,
  };

  return (
    <div className="phone">
      <TopBar
        onHelp={() => {
          track('help_opened');
          setHelp(true);
        }}
      />
      {saveHealth.failed && <button className="save-warning" onClick={() => { setArea(null); setTab('office'); }}>Saving is unavailable. Tap to export a backup in Office.</button>}
      <main className="screen" ref={screenRef}>
        {tab === 'map' && !area && (
          <MapScreen
            onOpenCrew={() => setTab('crew')}
            onOpenOffice={() => setTab('office')}
            onOpenFight={(a, f) => {
              setAreaFight(f);
              setArea(a);
            }}
            onOpenArea={(a) => {
              setAreaFight(null);
              setArea(a);
            }}
            onLocked={(m) => toast(m)}
          />
        )}
        {tab === 'map' && area && (
          <AreaScreen
            key={area}
            area={area}
            fightId={areaFight}
            onBack={() => {
              setArea(null);
              setAreaFight(null);
            }}
            onToast={toast}
          />
        )}
        {tab === 'crew' && <CrewScreen />}
        {tab === 'draws' && (
          <DrawsScreen
            onOpenArea={(a) => {
              setAreaFight(null);
              setArea(a);
              setTab('map');
            }}
          />
        )}
        {tab === 'office' && <OfficeScreen onToast={toast} />}
      </main>
      <TabBar
        tab={tab}
        dots={dots}
        center={<SafeButton />}
        onTab={(t) => {
          if (t === 'map' && tab === 'map') {
            setArea(null);
            setAreaFight(null);
          }
          setTab(t);
        }}
      />
      <Toasts toasts={toasts} />
      {away && <AwayModal summary={away} onClose={() => setAway(null)} />}
      {help && !away && <HowToPlay onClose={closeHelp} />}
    </div>
  );
}

export function App() {
  return (
    <div className="app">
      <Game />
    </div>
  );
}
