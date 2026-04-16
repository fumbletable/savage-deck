import type { CardCode } from './deck';

export type Edge = 'QUICK' | 'LEVEL_HEADED' | 'IMPROVED_LEVEL_HEADED' | 'HESITANT' | 'TACTICIAN' | 'MASTER_TACTICIAN';

export type CombatantType = 'PC' | 'NPC' | 'EXTRAS';

export type CombatantStatus = 'PENDING' | 'ACTED' | 'ON_HOLD' | 'SKIPPED';

export interface CombatantStats {
  toughness: { base: number; armour: number }; // total = base + armour; armour can be pierced
  parry: number;
  wounds: { current: number; max: number };
  shaken: boolean;
  bennies: number;
}

export function defaultStats(type: CombatantType): CombatantStats {
  return {
    toughness: { base: 5, armour: 0 },
    parry: 2,
    wounds: { current: 0, max: type === 'EXTRAS' ? 1 : 3 },
    shaken: false,
    bennies: 3,
  };
}

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
  stats: CombatantStats;
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

/** Ensures old state (pre-stats) has defaults on every combatant. */
export function migrateState(raw: unknown): SavageDeckState | null {
  if (!raw || typeof raw !== 'object') return null;
  const state = raw as SavageDeckState;
  return {
    ...state,
    combatants: state.combatants.map((c) => ({
      ...c,
      stats: c.stats ?? defaultStats(c.type),
    })),
  };
}

export function initialState(deck: CardCode[]): SavageDeckState {
  return {
    version: 1,
    round: 0,
    phase: 'SETUP',
    deck: { remaining: deck, discarded: [], jokerDrawnThisRound: false },
    combatants: [],
  };
}
