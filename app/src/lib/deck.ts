export type Suit = 'S' | 'H' | 'D' | 'C';
export type Rank = 'A' | 'K' | 'Q' | 'J' | 'T' | '9' | '8' | '7' | '6' | '5' | '4' | '3' | '2';
export type CardCode = `${Rank}${Suit}` | 'JR' | 'JB';

const RANKS: Rank[] = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
const SUITS: Suit[] = ['S', 'H', 'D', 'C'];

export const JOKER_RED: CardCode = 'JR';
export const JOKER_BLACK: CardCode = 'JB';

export function newDeck(): CardCode[] {
  const deck: CardCode[] = [];
  for (const s of SUITS) for (const r of RANKS) deck.push(`${r}${s}` as CardCode);
  deck.push(JOKER_RED, JOKER_BLACK);
  return deck;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function isJoker(c: CardCode): boolean {
  return c === JOKER_RED || c === JOKER_BLACK;
}

const RANK_ORDER: Record<Rank, number> = {
  A: 14, K: 13, Q: 12, J: 11, T: 10,
  '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2,
};
const SUIT_ORDER: Record<Suit, number> = { S: 4, H: 3, D: 2, C: 1 };

// Higher = acts first. Jokers rank above Aces and can act anytime.
export function initiativeValue(c: CardCode): number {
  if (c === JOKER_RED) return 1000;
  if (c === JOKER_BLACK) return 999;
  const rank = c[0] as Rank;
  const suit = c[1] as Suit;
  return RANK_ORDER[rank] * 10 + SUIT_ORDER[suit];
}

export function rankValue(c: CardCode): number {
  if (isJoker(c)) return 100;
  return RANK_ORDER[c[0] as Rank];
}

export function cardLabel(c: CardCode): string {
  if (c === JOKER_RED) return '🃏 Red Joker';
  if (c === JOKER_BLACK) return '🃏 Black Joker';
  const suitSym = { S: '♠', H: '♥', D: '♦', C: '♣' }[c[1] as Suit];
  const rankLabel = c[0] === 'T' ? '10' : c[0];
  return `${rankLabel}${suitSym}`;
}
