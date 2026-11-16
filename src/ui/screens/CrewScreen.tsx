import { useState } from 'react';
import { ALL_LOTS, FACTIONS } from '../../game/content/areas';
import { CHARACTERS, MANAGER_PERKS, RANK_OF, ROLES } from '../../game/content/characters';
import { statsOf, xpToNext } from '../../game/characters';
import { postOf } from '../../game/economy';
import type { CharacterDef } from '../../game/types';
import { Portrait, Sheet, Stars } from '../components/bits';
import { BINDER_PAGES, BINDER_STEP, BINDER_STEP_INCOME } from '../../game/content/binder';
import { binderGlobalBonus, isPageComplete, pageMembers, uniqueCards } from '../../game/binder';
import { AREAS } from '../../game/content/areas';
import { AURA_STAR, MAX_STARS, SKILL_STAR } from '../../game/constants';
import { SquadBoard } from '../components/Squad';
import { auraOf } from '../../game/battle';
import { AURA_TEXT, skillOf } from '../../game/content/skills';
import { useGame } from '../store';
import { PostsView } from './PostsView';

const RANK_LABEL = { crew: 'Crew', lieutenant: 'Lieutenant-class', boss: 'Boss-class' } as const;
const COLLECTIBLE = Object.values(CHARACTERS).filter((c) => c.rarity !== 'NPC').length;

function Stats({ id }: { id: string }) {
  const s = useGame();
  const st = statsOf(id, s.characters[id]);
  return (
    <div className="stats">
      <div className="stat">
        <b>{st.muscle}</b>Muscle
      </div>
      <div className="stat">
        <b>{st.grit}</b>Grit
      </div>
      <div className="stat">
        <b>{st.business}</b>Business
      </div>
    </div>
  );
}

function Card({ def, onOpen }: { def: CharacterDef; onOpen: () => void }) {
  const s = useGame();
  const cs = s.characters[def.id]!;
  const post = postOf(s, def.id);
  return (
    <button className="card" data-rarity={def.rarity} data-stars={cs.stars} onClick={onOpen}>
      <Portrait id={def.id} />
      <Stars n={cs.stars} className="card-stars" />
      <div className="card-body">
        <div className="card-name">
          {def.name}
          <span className="zh">{def.nameZh}</span>
        </div>
        <div className="card-role">
          <span>
            {def.role ? `${ROLES[def.role].name} ${ROLES[def.role].nameZh}` : '—'} · Lv {cs.level}
          </span>
          <span className="rarity-badge">{def.rarity}</span>
        </div>
        <Stats id={def.id} />
        <div className="card-post">{post ? `${post.slot === 'manager' ? 'Managing' : 'Guarding'} ${ALL_LOTS[post.lotId]?.name}` : 'Free: not posted'}</div>
      </div>
    </button>
  );
}

function CharSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const s = useGame();
  const def = CHARACTERS[id]!;
  const cs = s.characters[id]!;
  const role = def.role ? ROLES[def.role] : null;
  const post = postOf(s, id);
  const rank = def.rarity === 'NPC' ? null : RANK_OF[def.rarity];
  return (
    <Sheet onClose={onClose}>
      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 14 }}>
        <div className="card" data-rarity={def.rarity} style={{ boxShadow: 'none' }}>
          <Portrait id={id} />
          <div style={{ height: 6 }} />
        </div>
        <div>
          <h2>
            {def.name}
            <span className="zh">{def.nameZh}</span>
          </h2>
          <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.7, marginTop: 4 }}>
            {FACTIONS[def.faction].name} {FACTIONS[def.faction].crest}
          </div>
          <div style={{ fontSize: 13, fontWeight: 800, marginTop: 6 }}>
            {def.rarity} · {rank ? RANK_LABEL[rank] : ''}
            <br />
            {role ? `${role.name} ${role.nameZh} · ${role.cls === 'agent' ? 'Agent' : 'Gangster'}` : ''}
          </div>
          <div style={{ fontSize: 12, marginTop: 8, opacity: 0.75 }}>{def.look}</div>
        </div>
      </div>
      <h3>
        Stars <Stars n={cs.stars} />
      </h3>
      <p style={{ margin: 0, fontSize: 13 }}>
        +10% stats per star. ★{SKILL_STAR}: skill +25%{cs.stars >= SKILL_STAR ? ' ✓' : ''}. ★{AURA_STAR}: commander aura ×1.5
        {cs.stars >= AURA_STAR ? ' ✓' : ''}. {def.source === 'earned' ? 'Beat them again in a later run for a star.' : 'Draw a duplicate for a star.'}
      </p>
      <h3>Stats · Lv {cs.level}</h3>
      <Stats id={id} />
      <div style={{ fontSize: 12, fontWeight: 700, marginTop: 6, opacity: 0.7 }}>
        XP {Math.floor(cs.xp)} / {xpToNext(cs.level)}: from Turf Wars and {role?.cls === 'agent' ? 'managing a lot' : 'guarding lots against shakedowns'}
      </div>
      <h3>Turf War skill</h3>
      <p style={{ margin: 0, fontSize: 14 }}>
        <b>{def.skill.name}:</b> {def.skill.text}
      </p>
      {def.role && (def.rarity === 'SR' || def.rarity === 'SSR') && (
        <p style={{ margin: '6px 0 0', fontSize: 14 }}>
          <b>As a commander:</b> {AURA_TEXT[auraOf({ skill: skillOf(id), role: def.role })]}, and {def.skill.name} fires as an ultimate at double strength.
        </p>
      )}
      {role?.cls === 'agent' && def.role && MANAGER_PERKS[def.role] && (
        <>
          <h3>As a Manager</h3>
          <p style={{ margin: 0, fontSize: 14 }}>
            +{statsOf(id, cs).business}% income on the lot. {MANAGER_PERKS[def.role]}.
          </p>
        </>
      )}
      <h3>Posted</h3>
      <p style={{ margin: 0, fontSize: 14 }}>
        {post ? `${post.slot === 'manager' ? 'Manager' : 'Security'} at ${ALL_LOTS[post.lotId]?.name}` : 'Not posted. Open a lot you own to post them.'}
      </p>
    </Sheet>
  );
}

/** Where to find a card you don't have yet. */
function findHint(def: CharacterDef): string {
  switch (def.source) {
    case 'earned': {
      const area = Object.values(AREAS).find((a) => a.lt1Id === def.id || a.lt2Id === def.id || a.bossId === def.id);
      return area ? `Beat them in ${area.name}` : 'Beat them in a Turf War';
    }
    case 'scratch':
      return 'Scratch cards only';
    case 'temple':
      return 'Temple draws only';
    case 'lottery':
      return 'Lottery only (or when featured)';
    default:
      return 'Any draw';
  }
}

function Missing({ def }: { def: CharacterDef }) {
  return (
    <div className="card missing" data-rarity={def.rarity}>
      <Portrait id={def.id} />
      <div className="card-body">
        <div className="card-name">???</div>
        <div className="card-role">
          <span>{def.role ? `${ROLES[def.role].name} ${ROLES[def.role].nameZh}` : ''}</span>
          <span className="rarity-badge">{def.rarity}</span>
        </div>
        <div className="card-post">{findHint(def)}</div>
      </div>
    </div>
  );
}

export function CrewScreen() {
  const s = useGame();
  const [open, setOpen] = useState<string | null>(null);
  const [view, setView] = useState<'cards' | 'posts'>('cards');
  const unique = uniqueCards(s);
  const steps = Math.floor(unique / BINDER_STEP);
  const nextAt = (steps + 1) * BINDER_STEP;
  return (
    <div>
      <div className="page" style={{ paddingBottom: 0 }}>
        <div className="page-title">
          <h1>CREW</h1>
          <span className="zh">名片簿</span>
        </div>
        <div className="seg crew-view" role="group" aria-label="Crew view">
          <button aria-pressed={view === 'cards'} onClick={() => setView('cards')}>
            Cards
          </button>
          <button aria-pressed={view === 'posts'} onClick={() => setView('posts')}>
            Posts
          </button>
        </div>
        {view === 'posts' && <PostsView />}
      </div>
      {view === 'cards' && (
        <CardsView open={open} setOpen={setOpen} unique={unique} steps={steps} nextAt={nextAt} />
      )}
    </div>
  );
}

function CardsView({ open, setOpen, unique, steps, nextAt }: { open: string | null; setOpen: (id: string | null) => void; unique: number; steps: number; nextAt: number }) {
  const s = useGame();
  return (
    <div>
      <div className="page" style={{ paddingBottom: 0, paddingTop: 0 }}>
        <SquadBoard />
        <div className="panel binder-summary" style={{ marginBottom: 0 }}>
          <h2>Your binder</h2>
          <div className="binder-count">
            <b>{unique}</b> / {COLLECTIBLE} cards
          </div>
          <div className="binder-bar" aria-hidden>
            <i style={{ width: `${(unique / COLLECTIBLE) * 100}%` }} />
            {[10, 20].map((m) => (
              <span key={m} style={{ left: `${(m / COLLECTIBLE) * 100}%` }} />
            ))}
          </div>
          <p style={{ margin: '6px 0 0' }}>
            Every {BINDER_STEP} cards: +{Math.round(BINDER_STEP_INCOME * 100)}% income everywhere
            {steps > 0 ? ` (now +${Math.round(binderGlobalBonus(s) * 100)}%)` : ''}
            {unique < COLLECTIBLE ? `. Next at ${Math.min(nextAt, COLLECTIBLE)}.` : '.'}{' '}
            {`Complete a page for a lasting bonus and a lottery ticket. Duplicates add stars: ★${SKILL_STAR} strengthens the skill, ★${AURA_STAR} the commander aura (max ★${MAX_STARS}).`}
          </p>
        </div>
      </div>
      {BINDER_PAGES.filter((page) => page.faction !== 'xiaoxiao' || s.meta.chapterClears > 0).map((page) => {
        const members = pageMembers(page.faction);
        const have = members.filter((m) => s.characters[m.id]).length;
        const done = isPageComplete(s, page.faction);
        const f = FACTIONS[page.faction];
        return (
          <section key={page.faction} className="binder-page" data-done={done} style={{ ['--c1' as string]: f.colors[0], ['--c2' as string]: f.colors[1] }}>
            <header>
              <div>
                <h2>
                  {f.name} <span className="zh">{f.crest}</span>
                </h2>
                <small>
                  {done ? '✓ ' : ''}
                  {page.text}
                </small>
              </div>
              <span className="page-count">
                {have}/{members.length}
              </span>
            </header>
            <div className="crew-grid">
              {members.map((d) => (s.characters[d.id] ? <Card key={d.id} def={d} onOpen={() => setOpen(d.id)} /> : <Missing key={d.id} def={d} />))}
            </div>
          </section>
        );
      })}
      {open && <CharSheet id={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
