import { useEffect, useState } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { METADATA_KEY, initialState, type SavageDeckState } from './types';
import { newDeck, shuffle } from './deck';

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
