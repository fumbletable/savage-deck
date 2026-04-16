import { useState, useEffect } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { useObrReady, useRole, useSharedState, freshState, useActiveRing, registerContextMenus } from './lib/obr';
import { cardLabel } from './lib/deck';
import type { CardCode } from './lib/deck';

function suitClass(card: CardCode): string {
  if (card === 'JR' || card === 'JB') return '';
  const suit = card[1];
  return suit === 'H' || suit === 'D' ? 'suit-red' : 'suit-black';
}
import {
  addCombatant,
  removeCombatant,
  toggleEdge,
  dealRound,
  markActed,
  putOnHold,
  interruptFromHold,
  endRound,
  sortedForDisplay,
  setActive,
  linkToken,
  unlinkToken,
  setWounds,
  setMaxWounds,
  toggleShaken,
  setBennies,
  setToughness,
  setParry,
} from './lib/engine';
import type { Combatant, Edge, SavageDeckState } from './lib/types';

const EDGES: { key: Edge; label: string; short: string; explain: string }[] = [
  { key: 'QUICK', label: 'Quick', short: 'Q', explain: 'Quick: redraw any card of 5 or lower until a 6+ comes up.' },
  { key: 'LEVEL_HEADED', label: 'Level Headed', short: 'LH', explain: 'Level Headed: draw 1 extra card each round, keep the best.' },
  { key: 'IMPROVED_LEVEL_HEADED', label: 'Improved LH', short: 'LH+', explain: 'Improved Level Headed: draw 2 extra cards each round, keep the best.' },
];

export default function App() {
  const ready = useObrReady();
  const role = useRole(ready);
  const { state, write } = useSharedState(ready);
  useActiveRing(ready, state);

  useEffect(() => {
    if (ready) registerContextMenus();
  }, [ready]);

  if (!ready) return <div className="status">Connecting to Owlbear Rodeo…</div>;
  if (!role) return <div className="status">Loading role…</div>;

  const isGm = role === 'GM';

  if (!state) {
    return (
      <div className="panel">
        <Header role={role} />
        <div className="empty">
          <p>No combat in progress.</p>
          {isGm ? (
            <button onClick={() => write(freshState())}>Start Combat</button>
          ) : (
            <p className="muted">Waiting for GM to start combat.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <Header role={role} />
      <MetaBar state={state} />
      {isGm && <GmControls state={state} write={write} />}
      {state.phase === 'SETUP' ? (
        <SetupView state={state} write={write} isGm={isGm} />
      ) : (
        <ActingView state={state} write={write} isGm={isGm} />
      )}
    </div>
  );
}

function Header({ role }: { role: string }) {
  return (
    <header>
      <h1>Savage Deck</h1>
      <span className="role-badge">{role}</span>
    </header>
  );
}

function MetaBar({ state }: { state: SavageDeckState }) {
  return (
    <div className="meta">
      <span>Round {state.round}</span>
      <span>Deck {state.deck.remaining.length}</span>
      <span>Discard {state.deck.discarded.length}</span>
      <span>Phase {state.phase}</span>
      {state.deck.jokerDrawnThisRound && <span className="joker-warn">⚠ Joker — reshuffle at end</span>}
    </div>
  );
}

function GmControls({ state, write }: { state: SavageDeckState; write: (s: SavageDeckState) => Promise<void> }) {
  return (
    <div className="controls">
      {state.phase === 'SETUP' && state.combatants.length > 0 && (
        <button className="primary" onClick={() => write(dealRound(state))}>
          Deal Round {state.round + 1}
        </button>
      )}
      {state.phase === 'ACTING' && (
        <button className="primary" onClick={() => write(endRound(state))}>
          End Round
        </button>
      )}
      <button onClick={() => write(freshState())}>Reset</button>
    </div>
  );
}

function SetupView({
  state,
  write,
  isGm,
}: {
  state: SavageDeckState;
  write: (s: SavageDeckState) => Promise<void>;
  isGm: boolean;
}) {
  return (
    <div className="setup">
      <h2>Combatants ({state.combatants.length})</h2>
      {state.combatants.length === 0 && <p className="muted">No combatants yet.</p>}
      <ul className="combatant-list">
        {state.combatants.map((c) => (
          <CombatantRow key={c.id} c={c} state={state} write={write} isGm={isGm} editable={isGm} showCard={false} />
        ))}
      </ul>
      {isGm && <AddCombatant state={state} write={write} />}
      {isGm && (
        <div className="legend">
          <strong>Edges:</strong>{' '}
          {EDGES.map((e, i) => (
            <span key={e.key}>
              {i > 0 && ' · '}
              <span className="edge-chip">{e.short}</span> {e.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ActingView({
  state,
  write,
  isGm,
}: {
  state: SavageDeckState;
  write: (s: SavageDeckState) => Promise<void>;
  isGm: boolean;
}) {
  const sorted = sortedForDisplay(state.combatants);
  return (
    <div className="acting">
      <ul className="combatant-list">
        {sorted.map((c) => (
          <CombatantRow key={c.id} c={c} state={state} write={write} isGm={isGm} editable={false} showCard={true} />
        ))}
      </ul>
    </div>
  );
}

function CombatantRow({
  c,
  state,
  write,
  isGm,
  editable,
  showCard,
}: {
  c: Combatant;
  state: SavageDeckState;
  write: (s: SavageDeckState) => Promise<void>;
  isGm: boolean;
  editable: boolean;
  showCard: boolean;
}) {
  const cardVisible = c.card && (isGm || !c.hiddenFromPlayers || c.status === 'ACTED');
  const isActive = state.activeCombatantId === c.id;

  return (
    <li className={`combatant status-${c.status.toLowerCase()}${isActive ? ' active' : ''}`}>
      <div
        className="row-main"
        onClick={() => {
          if (isGm && showCard && c.status !== 'ACTED' && c.card) {
            write(setActive(state, c.id));
          }
        }}
        style={isGm && showCard && c.status !== 'ACTED' && c.card ? { cursor: 'pointer' } : undefined}
      >
        <span className="name">
          {c.hiddenFromPlayers && !isGm ? '???' : c.name}
          <span className="type-tag">{c.type}</span>
        </span>
        {showCard && c.card && (
          <span
            className={`card ${c.jokerBonus ? 'joker' : ''} ${
              cardVisible ? suitClass(c.card) : 'hidden-card'
            }`}
          >
            {cardVisible ? cardLabel(c.card) : '🂠'}
          </span>
        )}
        {c.status === 'ON_HOLD' && <span className="hold-badge">ON HOLD</span>}
        {c.status === 'ACTED' && <span className="acted-badge">✓</span>}
      </div>
      <div className="row-details">
        {c.edges.length > 0 && (
          <span className="edges">
            {c.edges.map((e) => {
              const meta = EDGES.find((x) => x.key === e);
              return meta ? <span key={e} className="edge-chip">{meta.short}</span> : null;
            })}
          </span>
        )}
        {editable && isGm && <EdgeToggles c={c} state={state} write={write} />}
        {isGm && state.phase === 'ACTING' && (
          <span className="row-actions">
            {c.status === 'PENDING' && (
              <>
                <button onClick={() => write(markActed(state, c.id))}>Acted</button>
                <button onClick={() => write(putOnHold(state, c.id))}>Hold</button>
              </>
            )}
            {c.status === 'ON_HOLD' && (
              <button onClick={() => write(interruptFromHold(state, c.id))}>Interrupt</button>
            )}
          </span>
        )}
        {isGm && <LinkTokenButton c={c} state={state} write={write} />}
        {isGm && (
          <button
            className="remove"
            title="Remove from combat"
            onClick={() => write(removeCombatant(state, c.id))}
          >
            ✕
          </button>
        )}
      </div>
      {isGm && editable && <StatSetupRow c={c} state={state} write={write} />}
      {isGm && !editable && <StatActingRow c={c} state={state} write={write} />}
    </li>
  );
}

function EdgeToggles({
  c,
  state,
  write,
}: {
  c: Combatant;
  state: SavageDeckState;
  write: (s: SavageDeckState) => Promise<void>;
}) {
  return (
    <span className="edge-toggles">
      {EDGES.map((e) => (
        <label key={e.key} title={e.explain}>
          <input
            type="checkbox"
            checked={c.edges.includes(e.key)}
            onChange={() => write(toggleEdge(state, c.id, e.key))}
          />
          {e.short}
        </label>
      ))}
    </span>
  );
}

function LinkTokenButton({
  c,
  state,
  write,
}: {
  c: Combatant;
  state: SavageDeckState;
  write: (s: SavageDeckState) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  if (c.tokenId) {
    return (
      <button
        className="link-btn linked"
        title="Token linked. Click to unlink."
        onClick={() => write(unlinkToken(state, c.id))}
      >
        🔗
      </button>
    );
  }

  const onLink = async () => {
    setBusy(true);
    try {
      const sel = await OBR.player.getSelection();
      if (!sel || sel.length === 0) {
        await OBR.notification.show('Select a token on the map first, then click Link.', 'WARNING');
        return;
      }
      await write(linkToken(state, c.id, sel[0]));
    } finally {
      setBusy(false);
    }
  };

  return (
    <button className="link-btn" title="Link to selected map token" disabled={busy} onClick={onLink}>
      Link
    </button>
  );
}

// ── Stat rows ─────────────────────────────────────────────────────────────────

function StatSetupRow({
  c,
  state,
  write,
}: {
  c: Combatant;
  state: SavageDeckState;
  write: (s: SavageDeckState) => Promise<void>;
}) {
  const s = c.stats;
  return (
    <div className="row-stats">
      <label className="stat-field" title="Toughness: base (armour)">
        <span className="stat-label">T</span>
        <input
          type="number" className="stat-input" value={s.toughness.base} min={1} max={20}
          onChange={(e) => write(setToughness(state, c.id, +e.target.value, s.toughness.armour))}
        />
        <span className="stat-sep">(</span>
        <input
          type="number" className="stat-input" value={s.toughness.armour} min={0} max={10}
          onChange={(e) => write(setToughness(state, c.id, s.toughness.base, +e.target.value))}
        />
        <span className="stat-sep">)</span>
      </label>
      <label className="stat-field" title="Parry">
        <span className="stat-label">P</span>
        <input
          type="number" className="stat-input" value={s.parry} min={1} max={20}
          onChange={(e) => write(setParry(state, c.id, +e.target.value))}
        />
      </label>
      <label className="stat-field" title="Max wounds">
        <span className="stat-label">W</span>
        <input
          type="number" className="stat-input" value={s.wounds.max} min={1} max={10}
          onChange={(e) => write(setMaxWounds(state, c.id, +e.target.value))}
        />
      </label>
      <label className="stat-field" title="Starting bennies">
        <span className="stat-label">B</span>
        <input
          type="number" className="stat-input" value={s.bennies} min={0} max={10}
          onChange={(e) => write(setBennies(state, c.id, +e.target.value))}
        />
      </label>
    </div>
  );
}

function StatActingRow({
  c,
  state,
  write,
}: {
  c: Combatant;
  state: SavageDeckState;
  write: (s: SavageDeckState) => Promise<void>;
}) {
  const s = c.stats;
  const toughTotal = s.toughness.base + s.toughness.armour;
  return (
    <div className="row-stats">
      <span className="stat-counter" title="Wounds">
        <button onClick={() => write(setWounds(state, c.id, s.wounds.current - 1))}>−</button>
        <span className={`stat-val${s.wounds.current > 0 ? ' stat-wounded' : ''}`}>
          {s.wounds.current}/{s.wounds.max}
        </span>
        <button onClick={() => write(setWounds(state, c.id, s.wounds.current + 1))}>+</button>
      </span>
      <button
        className={`stat-shaken${s.shaken ? ' active' : ''}`}
        title="Shaken"
        onClick={() => write(toggleShaken(state, c.id))}
      >S</button>
      <span className="stat-counter" title="Bennies">
        <button onClick={() => write(setBennies(state, c.id, s.bennies - 1))}>−</button>
        <span className="stat-val">{s.bennies}♦</span>
        <button onClick={() => write(setBennies(state, c.id, s.bennies + 1))}>+</button>
      </span>
      <span className="stat-passive" title={`Toughness ${s.toughness.base}(${s.toughness.armour})`}>T{toughTotal}</span>
      <span className="stat-passive" title="Parry">P{s.parry}</span>
    </div>
  );
}

function AddCombatant({
  state,
  write,
}: {
  state: SavageDeckState;
  write: (s: SavageDeckState) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<Combatant['type']>('PC');

  const submit = async () => {
    if (!name.trim()) return;
    await write(addCombatant(state, { name: name.trim(), type }));
    setName('');
  };

  const addFromParty = async () => {
    const players = await OBR.party.getPlayers();
    const existing = new Set(state.combatants.map((c) => c.name.toLowerCase()));
    let next = state;
    for (const p of players) {
      if (p.role === 'PLAYER' && !existing.has(p.name.toLowerCase())) {
        next = addCombatant(next, { name: p.name, type: 'PC', hiddenFromPlayers: false });
      }
    }
    await write(next);
  };

  return (
    <div className="add-combatant">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="Combatant name"
      />
      <select value={type} onChange={(e) => setType(e.target.value as Combatant['type'])}>
        <option value="PC">PC</option>
        <option value="NPC">NPC</option>
        <option value="EXTRAS">Extras</option>
      </select>
      <button onClick={submit}>Add</button>
      <button className="secondary" onClick={addFromParty}>
        + From Party
      </button>
    </div>
  );
}
