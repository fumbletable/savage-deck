import { useEffect, useState } from 'react';
import OBR, { buildShape } from '@owlbear-rodeo/sdk';
import { METADATA_KEY, TOKEN_STATS_KEY, initialState, migrateState, defaultStats, type SavageDeckState, type CombatantStats } from './types';
import { newDeck, shuffle } from './deck';

const RING_ID_PREFIX = 'savage-deck/active-ring';

export type Role = 'GM' | 'PLAYER';

export function useObrReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (OBR.isReady) {
      setReady(true);
      return;
    }
    return OBR.onReady(() => setReady(true));
  }, []);
  return ready;
}

export function useRole(ready: boolean): Role | null {
  const [role, setRole] = useState<Role | null>(null);
  useEffect(() => {
    if (!ready) return;
    OBR.player.getRole().then(setRole);
    return OBR.player.onChange((p) => setRole(p.role));
  }, [ready]);
  return role;
}

export function useSharedState(ready: boolean): {
  state: SavageDeckState | null;
  write: (next: SavageDeckState) => Promise<void>;
} {
  const [state, setState] = useState<SavageDeckState | null>(null);

  useEffect(() => {
    if (!ready) return;
    OBR.room.getMetadata().then((meta) => {
      setState(migrateState(meta[METADATA_KEY]) ?? null);
    });
    return OBR.room.onMetadataChange((meta) => {
      setState(migrateState(meta[METADATA_KEY]) ?? null);
    });
  }, [ready]);

  const write = async (next: SavageDeckState) => {
    await OBR.room.setMetadata({ [METADATA_KEY]: next });
    syncStatsToTokens(next).catch(() => {});
  };

  return { state, write };
}

// ── Token metadata persistence ────────────────────────────────────────────────

/** Write each linked combatant's stats onto its token so they survive a Reset. */
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

export function freshState(): SavageDeckState {
  return initialState(shuffle(newDeck()));
}

// Register context menus on tokens so GM can right-click to add combatants.
// Called once on mount from App.
export async function registerContextMenus() {
  const mkIcon = (label: string) => [
    { icon: '/icon.svg', label, filter: { roles: ['GM' as const], every: [{ key: 'layer', value: 'CHARACTER' as const }] } },
  ];
  await OBR.contextMenu.create({
    id: 'com.fumbletable.savage-deck/add-pc',
    icons: mkIcon('Add to Savage Deck (PC)'),
    onClick: (context) => handleAddFromContext(context, 'PC'),
  });
  await OBR.contextMenu.create({
    id: 'com.fumbletable.savage-deck/add-npc',
    icons: mkIcon('Add to Savage Deck (NPC)'),
    onClick: (context) => handleAddFromContext(context, 'NPC'),
  });
  await OBR.contextMenu.create({
    id: 'com.fumbletable.savage-deck/add-extras',
    icons: mkIcon('Add to Savage Deck (Extras)'),
    onClick: (context) => handleAddFromContext(context, 'EXTRAS'),
  });
}

async function handleAddFromContext(
  context: { items: { id: string; name?: string; plainText?: string }[] },
  type: 'PC' | 'NPC' | 'EXTRAS'
) {
  const [meta, fullItems] = await Promise.all([
    OBR.room.getMetadata(),
    OBR.scene.items.getItems(context.items.map((i) => i.id)),
  ]);
  const state = (meta[METADATA_KEY] as SavageDeckState | undefined) ?? freshState();

  let idCounter = 0;
  const makeId = () => {
    idCounter += 1;
    return `c${Date.now().toString(36)}${idCounter}`;
  };

  const existing = new Set(state.combatants.map((c) => c.tokenId).filter(Boolean) as string[]);
  let next = state;
  for (const item of context.items) {
    if (existing.has(item.id)) continue; // already linked, skip
    const fullItem = fullItems.find((fi) => fi.id === item.id);
    // Restore persisted stats if this token has been in a previous combat
    const savedStats = fullItem?.metadata[TOKEN_STATS_KEY] as CombatantStats | undefined;
    next = {
      ...next,
      combatants: [
        ...next.combatants,
        {
          id: makeId(),
          name: item.name || item.plainText || 'Unnamed',
          type,
          hiddenFromPlayers: type !== 'PC',
          tokenId: item.id,
          edges: [],
          status: 'PENDING',
          jokerBonus: false,
          stats: savedStats ?? defaultStats(type),
        },
      ],
    };
  }
  await OBR.room.setMetadata({ [METADATA_KEY]: next });
}

async function clearRings() {
  const existing = await OBR.scene.local.getItems((item) =>
    item.id.startsWith(RING_ID_PREFIX)
  );
  if (existing.length > 0) {
    await OBR.scene.local.deleteItems(existing.map((i) => i.id));
  }
}

export function useActiveRing(ready: boolean, state: SavageDeckState | null) {
  useEffect(() => {
    if (!ready) return;
    if (!state || !state.activeCombatantId) {
      clearRings();
      return;
    }
    const active = state.combatants.find((c) => c.id === state.activeCombatantId);
    if (!active?.tokenId) {
      clearRings();
      return;
    }

    let cancelled = false;

    (async () => {
      // Clear any old ring
      await clearRings();
      if (cancelled) return;

      // Fetch the token to get its position and rough size for the ring
      const [token] = await OBR.scene.items.getItems([active.tokenId!]);
      if (!token || cancelled) return;

      const dpi = await OBR.scene.grid.getDpi();
      const size = dpi * 1.15; // slightly larger than one grid square

      const ring = buildShape()
        .id(`${RING_ID_PREFIX}/${active.id}`)
        .shapeType('CIRCLE')
        .width(size)
        .height(size)
        .position(token.position)
        .fillOpacity(0)
        .strokeColor('#9b7ad8')
        .strokeWidth(8)
        .strokeOpacity(0.9)
        .layer('ATTACHMENT')
        .locked(true)
        .attachedTo(token.id)
        .disableAttachmentBehavior(['ROTATION', 'SCALE'])
        .name('Savage Deck: active combatant')
        .build();

      if (cancelled) return;
      await OBR.scene.local.addItems([ring]);
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, state?.activeCombatantId, state?.combatants]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      clearRings();
    };
  }, []);
}
