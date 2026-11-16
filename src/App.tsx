import { useCallback, useEffect, useRef, useState } from 'react';
import { canHireAccountant } from './game/actions';
import { canDraw } from './game/gacha';
import { gameNow } from './ui/time';
import { ALL_LOTS, AREAS } from './game/content/areas';
import { CHARACTERS } from './game/content/characters';
import { ACCOUNTANT_COST } from './game/constants';
import { formatMoney } from './game/format';
import { marketShare, postOf } from './game/economy';
import { SHARE_THRESHOLDS } from './game/constants';
import { fightFor } from './game/content/fights';
import type { AwaySummary } from './game/offline';
import type { AreaId, GameEvent, GameState } from './game/types';
import { AwayModal, SafeButton, TabBar, Toasts, TopBar, type Tab, type Toast } from './ui/components/chrome';
import { startEngine } from './ui/engine';
import { store, useGame } from './ui/store';
import { AreaScreen } from './ui/screens/AreaScreen';
import { CrewScreen } from './ui/screens/CrewScreen';
import { DrawsScreen } from './ui/screens/DrawsScreen';
import { MapScreen } from './ui/screens/MapScreen';
import { OfficeScreen } from './ui/screens/OfficeScreen';

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
    case 'level-up':
      return { tone: 'good', text: `${CHARACTERS[e.charId]?.name} reached Lv ${e.level}!` };
    default:
      return null;
  }
}

function Game() {
  const s = useGame();
  const [tab, setTab] = useState<Tab>('map');
  const [area, setArea] = useState<AreaId | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [away, setAway] = useState<AwaySummary | null>(null);
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
  const fightReady = (['wanhua'] as AreaId[]).some((a) =>
    (['lt1', 'lt2', 'boss'] as const).some((k) => !s.areas[a][k] && fightFor(a, k) && marketShare(s, a) >= SHARE_THRESHOLDS[k]),
  );
  const dots: Partial<Record<Tab, boolean>> = {
    map: fightReady,
    crew: freeCrew && openSlots,
    office: canHireAccountant(s) && s.cash >= ACCOUNTANT_COST,
    draws: !s.zodiac || canDraw(s, 'temple', gameNow()).free,
  };

  return (
    <div className="phone">
      <TopBar />
      <main className="screen" ref={screenRef}>
        {tab === 'map' && !area && <MapScreen onOpenArea={setArea} onLocked={(m) => toast(m)} />}
        {tab === 'map' && area && <AreaScreen area={area} onBack={() => setArea(null)} onToast={toast} />}
        {tab === 'crew' && <CrewScreen />}
        {tab === 'draws' && <DrawsScreen />}
        {tab === 'office' && <OfficeScreen onToast={toast} />}
      </main>
      <TabBar
        tab={tab}
        dots={dots}
        center={<SafeButton />}
        onTab={(t) => {
          if (t === 'map' && tab === 'map') setArea(null);
          setTab(t);
        }}
      />
      <Toasts toasts={toasts} />
      {away && <AwayModal summary={away} onClose={() => setAway(null)} />}
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
