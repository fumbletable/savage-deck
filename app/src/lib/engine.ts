import type { SavageDeckState, Combatant, Edge } from './types';
import type { CardCode } from './deck';
import { shuffle, newDeck, isJoker, initiativeValue, rankValue } from './deck';

function nextActiveId(combatants: Combatant[]): string | undefined {
  const candidates = combatants.filter(
    (c) => c.card && c.status === 'PENDING'
  );
  if (candidates.length === 0) return undefined;
  const sorted = [...candidates].sort(
    (a, b) => initiativeValue(b.card!) - initiativeValue(a.card!)
  );
  return sorted[0].id;
}

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `c${Date.now().toString(36)}${idCounter}`;
}

export function addCombatant(
  state: SavageDeckState,
  input: { name: string; type: Combatant['type']; hiddenFromPlayers?: boolean; tokenId?: string; edges?: Edge[] }
): SavageDeckState {
  const combatant: Combatant = {
    id: nextId(),
    name: input.name,
    type: input.type,
    hiddenFromPlayers: input.hiddenFromPlayers ?? (input.type !== 'PC'),
    tokenId: input.tokenId,
    edges: input.edges ?? [],
    status: 'PENDING',
    jokerBonus: false,
  };
  return { ...state, combatants: [...state.combatants, combatant] };
}

export function removeCombatant(state: SavageDeckState, id: string): SavageDeckState {
  const removed = state.combatants.find((c) => c.id === id);
  const nextCombatants = state.combatants.filter((c) => c.id !== id);
  // If removed combatant had a card, return it to the discard pile
  let discarded = state.deck.discarded;
  if (removed?.card) {
    discarded = [...discarded, removed.card];
    if (removed.discardedPicks) discarded = [...discarded, ...removed.discardedPicks];
  }
  const next: SavageDeckState = {
    ...state,
    combatants: nextCombatants,
    deck: { ...state.deck, discarded },
  };
  // If the removed combatant was active, advance to the next
  if (state.activeCombatantId === id) {
    return { ...next, activeCombatantId: nextActiveId(nextCombatants) };
  }
  return next;
}

export function updateCombatant(
  state: SavageDeckState,
  id: string,
  patch: Partial<Combatant>
): SavageDeckState {
  return {
    ...state,
    combatants: state.combatants.map((c) => (c.id === id ? { ...c, ...patch } : c)),
  };
}

export function toggleEdge(state: SavageDeckState, id: string, edge: Edge): SavageDeckState {
  return {
    ...state,
    combatants: state.combatants.map((c) => {
      if (c.id !== id) return c;
      const has = c.edges.includes(edge);
      return { ...c, edges: has ? c.edges.filter((e) => e !== edge) : [...c.edges, edge] };
    }),
  };
}

function drawOne(deck: CardCode[]): [CardCode, CardCode[]] {
  if (deck.length === 0) throw new Error('Deck exhausted');
  const [card, ...rest] = deck;
  return [card, rest];
}

// Runs the full deal pipeline:
// 1. Deal one card to each PENDING combatant (skip ON_HOLD)
// 2. For Level Headed / Improved Level Headed: draw +1 / +2 more, keep highest rank
// 3. For Quick: redraw until rank > 5
// 4. Set jokerDrawnThisRound if any joker ended up anywhere
// Hesitant and Tactician deferred to v2.
export function dealRound(state: SavageDeckState): SavageDeckState {
  let remaining = [...state.deck.remaining];
  let discarded = [...state.deck.discarded];
  let jokerSeen = false;

  const markJoker = (card: CardCode) => {
    if (isJoker(card)) jokerSeen = true;
  };

  const combatants = state.combatants.map((c) => {
    if (c.status === 'ON_HOLD') return c; // keep prior card discarded; no new deal
    if (c.status === 'SKIPPED') return c;

    const picks: CardCode[] = [];

    // Base card
    const [base, afterBase] = drawOne(remaining);
    remaining = afterBase;
    markJoker(base);
    picks.push(base);

    // Level Headed extras
    let extraCount = 0;
    if (c.edges.includes('LEVEL_HEADED')) extraCount += 1;
    if (c.edges.includes('IMPROVED_LEVEL_HEADED')) extraCount += 2;
    for (let i = 0; i < extraCount; i++) {
      const [extra, afterExtra] = drawOne(remaining);
      remaining = afterExtra;
      markJoker(extra);
      picks.push(extra);
    }

    // Pick best by initiative value (Joker > Ace > ...)
    picks.sort((a, b) => initiativeValue(b) - initiativeValue(a));
    let chosen = picks[0];
    const leftover = picks.slice(1);

    // Quick: redraw chosen if rank <= 5 (Quick applies AFTER LH pick per SWADE rules)
    if (c.edges.includes('QUICK')) {
      const quickDiscards: CardCode[] = [];
      while (!isJoker(chosen) && rankValue(chosen) <= 5) {
        quickDiscards.push(chosen);
        if (remaining.length === 0) break;
        const [next, afterNext] = drawOne(remaining);
        remaining = afterNext;
        markJoker(next);
        chosen = next;
      }
      leftover.push(...quickDiscards);
    }

    discarded.push(...leftover);

    return {
      ...c,
      card: chosen,
      discardedPicks: leftover.length ? leftover : undefined,
      status: 'PENDING' as const,
      jokerBonus: isJoker(chosen),
    };
  });

  const next = {
    ...state,
    phase: 'ACTING' as const,
    round: state.round + 1,
    combatants,
    deck: {
      remaining,
      discarded,
      jokerDrawnThisRound: state.deck.jokerDrawnThisRound || jokerSeen,
    },
  };
  return { ...next, activeCombatantId: nextActiveId(combatants) };
}

export function markActed(state: SavageDeckState, id: string): SavageDeckState {
  const next = updateCombatant(state, id, { status: 'ACTED' });
  // Auto-advance active marker if we just completed the active one
  if (state.activeCombatantId === id) {
    return { ...next, activeCombatantId: nextActiveId(next.combatants) };
  }
  return next;
}

export function setActive(state: SavageDeckState, id: string): SavageDeckState {
  return { ...state, activeCombatantId: id };
}

export function linkToken(state: SavageDeckState, combatantId: string, tokenId: string): SavageDeckState {
  return updateCombatant(state, combatantId, { tokenId });
}

export function unlinkToken(state: SavageDeckState, combatantId: string): SavageDeckState {
  return updateCombatant(state, combatantId, { tokenId: undefined });
}

export function putOnHold(state: SavageDeckState, id: string): SavageDeckState {
  const target = state.combatants.find((c) => c.id === id);
  if (!target?.card) return state;
  const nextCombatants = state.combatants.map((c) =>
    c.id === id ? { ...c, status: 'ON_HOLD' as const, card: undefined, jokerBonus: false } : c
  );
  const next = {
    ...state,
    deck: { ...state.deck, discarded: [...state.deck.discarded, target.card] },
    combatants: nextCombatants,
  };
  if (state.activeCombatantId === id) {
    return { ...next, activeCombatantId: nextActiveId(nextCombatants) };
  }
  return next;
}

export function interruptFromHold(state: SavageDeckState, id: string): SavageDeckState {
  return updateCombatant(state, id, { status: 'ACTED' });
}

export function endRound(state: SavageDeckState): SavageDeckState {
  // Discard all current cards (except ON_HOLD which already discarded)
  const newDiscarded = [...state.deck.discarded];
  for (const c of state.combatants) {
    if (c.card) newDiscarded.push(c.card);
    if (c.discardedPicks) newDiscarded.push(...c.discardedPicks);
  }

  // If a joker was drawn, reshuffle everything back into the deck
  const shouldReshuffle = state.deck.jokerDrawnThisRound;
  const nextDeck = shouldReshuffle
    ? { remaining: shuffle(newDeck()), discarded: [], jokerDrawnThisRound: false }
    : { remaining: state.deck.remaining, discarded: newDiscarded, jokerDrawnThisRound: false };

  const combatants = state.combatants.map((c) => ({
    ...c,
    card: undefined,
    discardedPicks: undefined,
    jokerBonus: false,
    // ON_HOLD persists; PENDING/ACTED/SKIPPED reset to PENDING for next round
    status: c.status === 'ON_HOLD' ? ('ON_HOLD' as const) : ('PENDING' as const),
  }));

  return {
    ...state,
    phase: 'SETUP',
    combatants,
    deck: nextDeck,
    activeCombatantId: undefined,
  };
}

export function sortedForDisplay(combatants: Combatant[]): Combatant[] {
  return [...combatants].sort((a, b) => {
    // ON_HOLD floats to top (can act anytime)
    if (a.status === 'ON_HOLD' && b.status !== 'ON_HOLD') return -1;
    if (b.status === 'ON_HOLD' && a.status !== 'ON_HOLD') return 1;
    // ACTED sinks to bottom
    if (a.status === 'ACTED' && b.status !== 'ACTED') return 1;
    if (b.status === 'ACTED' && a.status !== 'ACTED') return -1;
    // Otherwise by card initiative value (desc). No card = SETUP phase, keep add order.
    if (!a.card || !b.card) return 0;
    return initiativeValue(b.card) - initiativeValue(a.card);
  });
}
