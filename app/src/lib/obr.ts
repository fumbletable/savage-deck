import { useEffect, useState } from 'react';
import OBR, { buildShape } from '@owlbear-rodeo/sdk';
import { METADATA_KEY, initialState, type SavageDeckState } from './types';
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
      const existing = meta[METADATA_KEY] as SavageDeckState | undefined;
      setState(existing ?? null);
    });
    return OBR.room.onMetadataChange((meta) => {
      const next = meta[METADATA_KEY] as SavageDeckState | undefined;
      setState(next ?? null);
    });
  }, [ready]);

  const write = async (next: SavageDeckState) => {
    await OBR.room.setMetadata({ [METADATA_KEY]: next });
  };

  return { state, write };
}

export function freshState(): SavageDeckState {
  return initialState(shuffle(newDeck()));
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
        .position({ x: token.position.x - size / 2, y: token.position.y - size / 2 })
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
