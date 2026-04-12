import type { CardCode } from './deck';

export type Edge = 'QUICK' | 'LEVEL_HEADED' | 'IMPROVED_LEVEL_HEADED' | 'HESITANT' | 'TACTICIAN' | 'MASTER_TACTICIAN';

export type CombatantType = 'PC' | 'NPC' | 'EXTRAS';

export type CombatantStatus = 'PENDING' | 'ACTED' | 'ON_HOLD' | 'SKIPPED';

export interface Combatant {
  id: string;
  name: string;
  type: CombatantType;
  hiddenFromPlayers: boolean;
  tokenId?: string;
  edges: Edge[];
  card?: CardCode;
  discardedPicks?: CardCode[];
  status: CombatantStatus;
  jokerBonus: boolean;
}

export type Phase = 'SETUP' | 'ACTING' | 'ENDED';

export interface SavageDeckState {
  version: 1;
  round: number;
  phase: Phase;
  deck: {
    remaining: CardCode[];
    discarded: CardCode[];
    jokerDrawnThisRound: boolean;
  };
  combatants: Combatant[];
  activeCombatantId?: string;
}

export const METADATA_KEY = 'com.fumbletable.savage-deck/state';

export function initialState(deck: CardCode[]): SavageDeckState {
  return {
    version: 1,
    round: 0,
    phase: 'SETUP',
    deck: { remaining: deck, discarded: [], jokerDrawnThisRound: false },
    combatants: [],
  };
}
