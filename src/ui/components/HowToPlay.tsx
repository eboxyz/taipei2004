/** A short "how it works": one line per system. Opens once for new players, then from the ? in the top bar. */
import { Sheet } from './bits';

const ITEMS: { glyph: string; title: string; text: string }[] = [
  { glyph: '地', title: 'The map', text: 'Each station is a district run by a gang. Start in Wanhua. The NEXT tip at the top always has a good move.' },
  { glyph: '店', title: 'Lots', text: 'Buy lots, then upgrade them. Every ×2 milestone doubles a lot’s income, and Best buy marks the best value.' },
  { glyph: '箱', title: 'The safe', text: 'Income fills the safe, even while you’re away. Tap it to collect; a full safe stops filling.' },
  { glyph: '人', title: 'Crew', text: 'Post agents as Managers to earn more, and gangsters as Security to beat shakedowns for bonuses.' },
  { glyph: '戰', title: 'Turf Wars', text: 'Grow your influence in a district to challenge its lieutenants, then the boss. Claim it for ×2 income. Fights play out on their own, and losing costs nothing.' },
  { glyph: '籤', title: 'Draws', text: 'New crew comes from scratch cards, the temple and the lottery. The temple is free once a day.' },
  { glyph: '辦', title: 'Office', text: 'Once Wanhua is yours, you can cash out (金盆洗手) for Face: permanent upgrades for your next run.' },
];

export function HowToPlay({ onClose }: { onClose: () => void }) {
  return (
    <Sheet onClose={onClose}>
      <h2>
        How it works <span className="zh">玩法</span>
      </h2>
      <p className="howto-lede">Buy up 2000s Taipei one district at a time, and take each one from its gang.</p>
      <ul className="howto">
        {ITEMS.map((it) => (
          <li key={it.title}>
            <span className="howto-glyph" aria-hidden>
              {it.glyph}
            </span>
            <span>
              <b>{it.title}</b>
              <span className="howto-text">{it.text}</span>
            </span>
          </li>
        ))}
      </ul>
      <button className="btn howto-ok" onClick={onClose}>
        Got it
      </button>
      <p className="howto-foot">Tap ? at the top any time to see this again.</p>
    </Sheet>
  );
}
