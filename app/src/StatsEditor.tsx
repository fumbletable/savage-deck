import { useState, useEffect } from 'react';
import OBR, { type Item } from '@owlbear-rodeo/sdk';
import {
  METADATA_KEY,
  TOKEN_STATS_KEY,
  migrateState,
  defaultStats,
  type SavageDeckState,
  type Combatant,
  type CombatantStats,
} from './lib/types';
import { setWounds, setMaxWounds, toggleShaken, setBennies, setToughness, setParry } from './lib/engine';

async function syncStatsToTokens(state: SavageDeckState): Promise<void> {
  const linked = state.combatants.filter((c) => c.tokenId && c.stats);
  if (linked.length === 0) return;
  await OBR.scene.items.updateItems(
    linked.map((c) => c.tokenId!),
    (items) => {
      for (const item of items) {
        const c = linked.find((lc) => lc.tokenId === item.id);
        if (c) item.metadata[TOKEN_STATS_KEY] = c.stats;
      }
    }
  );
}

export function StatsEditor() {
  const [state, setState] = useState<SavageDeckState | null>(null);
  const [tokenIds, setTokenIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    OBR.onReady(async () => {
      const [meta, selection] = await Promise.all([
        OBR.room.getMetadata(),
        OBR.player.getSelection(),
      ]);
      setState(migrateState(meta[METADATA_KEY]) ?? null);
      setTokenIds(selection ?? []);
      setReady(true);
    });
  }, []);

  const writeCombat = async (next: SavageDeckState) => {
    setState(next);
    await OBR.room.setMetadata({ [METADATA_KEY]: next });
    syncStatsToTokens(next).catch(() => {});
  };

  if (!ready) return <div className="embed-status">Loading…</div>;
  if (tokenIds.length === 0) return <div className="embed-status">No token selected.</div>;

  // Tokens linked to an active combatant — show live combat editor
  const combatants = state
    ? state.combatants.filter((c) => c.tokenId && tokenIds.includes(c.tokenId))
    : [];

  if (combatants.length > 0 && state) {
    return (
      <div className="embed-panel">
        {combatants.map((c) => (
          <EmbedRow key={c.id} c={c} state={state} write={writeCombat} />
        ))}
      </div>
    );
  }

  // Token not in combat — edit stats directly on the token (pre-combat setup)
  return <TokenStatEditor tokenIds={tokenIds} />;
}

// ── Pre-combat token stat editor ──────────────────────────────────────────────

function TokenStatEditor({ tokenIds }: { tokenIds: string[] }) {
  const [tokens, setTokens] = useState<{ id: string; name: string; stats: CombatantStats }[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    OBR.scene.items.getItems(tokenIds).then((items: Item[]) => {
      setTokens(
        items.map((item) => ({
          id: item.id,
          name: item.name || 'Token',
          stats: (item.metadata[TOKEN_STATS_KEY] as CombatantStats | undefined) ?? defaultStats('PC'),
        }))
      );
      setLoaded(true);
    });
  }, []);

  const writeToken = async (tokenId: string, stats: CombatantStats) => {
    setTokens((prev) => prev.map((t) => (t.id === tokenId ? { ...t, stats } : t)));
    await OBR.scene.items.updateItems([tokenId], (items) => {
      items[0].metadata[TOKEN_STATS_KEY] = stats;
    });
  };

  if (!loaded) return <div className="embed-status">Loading…</div>;

  return (
    <div className="embed-panel">
      {tokens.map((t) => (
        <TokenStatRow
          key={t.id}
          name={t.name}
          stats={t.stats}
          write={(stats) => writeToken(t.id, stats)}
        />
      ))}
    </div>
  );
}

function TokenStatRow({
  name,
  stats,
  write,
}: {
  name: string;
  stats: CombatantStats;
  write: (s: CombatantStats) => Promise<void>;
}) {
  const s = stats;
  const upd = (patch: Partial<CombatantStats>) => write({ ...s, ...patch });

  return (
    <div className="embed-row">
      <div className="embed-name">
        {name}
        <span className="type-tag muted">pre-combat</span>
      </div>
      <div className="embed-controls">
        {/* Max wounds only — no current wounds before combat */}
        <label className="stat-field" title="Max wounds">
          <span className="stat-label">W</span>
          <input
            type="number" className="stat-input" value={s.wounds.max} min={1} max={10}
            onChange={(e) => upd({ wounds: { ...s.wounds, max: +e.target.value } })}
          />
        </label>
        {/* Bennies */}
        <span className="stat-counter benny-counter" title="Bennies">
          <button className="benny-btn" onClick={() => upd({ bennies: Math.max(0, s.bennies - 1) })}>−</button>
          <span className="benny-coin">{s.bennies}</span>
          <button className="benny-btn" onClick={() => upd({ bennies: s.bennies + 1 })}>+</button>
        </span>
      </div>
      <div className="embed-controls embed-tp">
        <label className="stat-field" title="Toughness base (armour)">
          <span className="stat-label stat-label-t">T</span>
          <input
            type="number" className="stat-input" value={s.toughness.base} min={1} max={20}
            onChange={(e) => upd({ toughness: { ...s.toughness, base: +e.target.value } })}
          />
          <span className="stat-sep">(</span>
          <input
            type="number" className="stat-input" value={s.toughness.armour} min={0} max={10}
            onChange={(e) => upd({ toughness: { ...s.toughness, armour: +e.target.value } })}
          />
          <span className="stat-sep">)</span>
        </label>
        <label className="stat-field" title="Parry">
          <span className="stat-label stat-label-p">P</span>
          <input
            type="number" className="stat-input" value={s.parry} min={1} max={20}
            onChange={(e) => upd({ parry: +e.target.value })}
          />
        </label>
      </div>
    </div>
  );
}

// ── Active combat row ─────────────────────────────────────────────────────────

function EmbedRow({
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
    <div className="embed-row">
      <div className="embed-name">
        {c.name}
        <span className="type-tag">{c.type}</span>
      </div>
      <div className="embed-controls">
        <span className="stat-counter embed-wounds" title="Wounds">
          <button onClick={() => write(setWounds(state, c.id, s.wounds.current - 1))}>−</button>
          <span className={`stat-val${s.wounds.current > 0 ? ' stat-wounded' : ''}`}>
            {s.wounds.current}/
          </span>
          <input
            type="number" className="stat-input" value={s.wounds.max} min={1} max={10}
            title="Max wounds"
            onChange={(e) => write(setMaxWounds(state, c.id, +e.target.value))}
          />
          <button onClick={() => write(setWounds(state, c.id, s.wounds.current + 1))}>+</button>
        </span>
        <button
          className={`stat-shaken${s.shaken ? ' active' : ''}`}
          title="Shaken"
          onClick={() => write(toggleShaken(state, c.id))}
        >S</button>
        <span className="stat-counter benny-counter" title="Bennies">
          <button className="benny-btn" onClick={() => write(setBennies(state, c.id, s.bennies - 1))}>−</button>
          <span className="benny-coin">{s.bennies}</span>
          <button className="benny-btn" onClick={() => write(setBennies(state, c.id, s.bennies + 1))}>+</button>
        </span>
      </div>
      <div className="embed-controls embed-tp">
        <label className="stat-field" title="Toughness base (armour)">
          <span className="stat-label stat-label-t">T</span>
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
          <span className="stat-label stat-label-p">P</span>
          <input
            type="number" className="stat-input" value={s.parry} min={1} max={20}
            onChange={(e) => write(setParry(state, c.id, +e.target.value))}
          />
        </label>
      </div>
    </div>
  );
}
