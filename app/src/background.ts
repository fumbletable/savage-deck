/**
 * Savage Deck — Background script
 *
 * Runs silently for all clients. Subscribes to room metadata and renders
 * stat bubbles (T / P / wounds / shaken / bennies) as local OBR items
 * attached to each linked token.
 *
 * Local items are per-client — each client renders their own copy.
 * Items are recreated on every metadata change (clear + add).
 */

import OBR, { buildShape, buildText, type Item } from '@owlbear-rodeo/sdk';
import { METADATA_KEY, migrateState, type SavageDeckState, type Combatant } from './lib/types';

const BUBBLE_PREFIX = 'savage-deck/bubble';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Apply shared attachment properties to any item builder. */
function attach<B extends ReturnType<typeof buildShape> | ReturnType<typeof buildText>>(
  builder: B,
  tokenId: string
): B {
  return (builder as ReturnType<typeof buildShape>)
    .layer('ATTACHMENT')
    .zIndex(1)
    .locked(true)
    .attachedTo(tokenId)
    .disableAttachmentBehavior(['ROTATION', 'SCALE']) as unknown as B;
}

// ── Clear ─────────────────────────────────────────────────────────────────────

async function clearBubbles(): Promise<void> {
  const existing = await OBR.scene.local.getItems(
    (item) => item.id.startsWith(BUBBLE_PREFIX)
  );
  if (existing.length > 0) {
    await OBR.scene.local.deleteItems(existing.map((i) => i.id));
  }
}

// ── Build items for one combatant ─────────────────────────────────────────────

function buildBubbles(combatant: Combatant, token: Item, dpi: number): Item[] {
  const { x, y } = token.position;

  // All sizes proportional to grid DPI so they scale with zoom
  const offset = dpi * 0.40;                   // token centre → badge centre
  const bSize  = dpi * 0.22;                   // badge width/height
  const fs     = Math.round(dpi * 0.13);       // font size
  const barW   = dpi * 1.02;                   // wound bar spans T→P outer badge edges
  const barH   = dpi * 0.07;                   // wound bar height
  // OBR shapes use top-left anchoring. barTopLeft and badgeTopLeft helpers
  // convert from intended visual-centre coordinates to the top-left corner.
  const barTopY = y + offset - bSize / 2 - barH; // bar sits just above badge top edge
  const sw      = Math.max(1, dpi * 0.012);       // badge stroke width

  const tid = token.id;
  const id  = (s: string) => `${BUBBLE_PREFIX}/${combatant.id}/${s}`;
  const items: Item[] = [];

  // ── Wound bar (above badge row) ───────────────────────────────────────────
  const { current, max } = combatant.stats.wounds;
  const fillFrac = max > 0 ? Math.min(current / max, 1) : 0;
  const barLeft = x - barW / 2; // left edge of bar (centred on token x)

  // Background bar
  items.push(
    attach(
      buildShape()
        .id(id('bar-bg'))
        .shapeType('RECTANGLE')
        .width(barW).height(barH)
        .position({ x: barLeft, y: barTopY })
        .fillColor('#111111').fillOpacity(0.85)
        .strokeColor('#ffffff').strokeWidth(1).strokeOpacity(0.12),
      tid
    ).build() as Item
  );

  // Fill bar (left-to-right from bar left edge)
  if (fillFrac > 0) {
    const fillW = barW * fillFrac;
    items.push(
      attach(
        buildShape()
          .id(id('bar-fill'))
          .shapeType('RECTANGLE')
          .width(fillW).height(barH)
          .position({ x: barLeft, y: barTopY })
          .fillColor(fillFrac >= 1 ? '#7f0000' : '#c0392b').fillOpacity(1)
          .strokeOpacity(0),
        tid
      ).build() as Item
    );
  }

  // ── Badge helper ──────────────────────────────────────────────────────────
  // cx/cy are the INTENDED visual centres. Shapes use top-left, so we offset
  // by -bSize/2 on both axes. Text uses the same offset so it stays centred.

  const addBadge = (
    suffix: string,
    cx: number, cy: number,
    shape: 'RECTANGLE' | 'CIRCLE',
    fillColor: string, fillOpacity: number,
    strokeColor: string,
    text: string, textColor: string,
    fontWeight = 700
  ) => {
    const tl = { x: cx - bSize / 2, y: cy - bSize / 2 }; // top-left (rectangles)
    // OBR circles are centre-anchored; rectangles are top-left-anchored
    const shapePos = shape === 'CIRCLE' ? { x: cx, y: cy } : tl;
    items.push(
      attach(
        buildShape()
          .id(id(`${suffix}-bg`))
          .shapeType(shape)
          .width(bSize).height(bSize)
          .position(shapePos)
          .fillColor(fillColor).fillOpacity(fillOpacity)
          .strokeColor(strokeColor).strokeWidth(sw).strokeOpacity(1),
        tid
      ).build() as Item,
      attach(
        buildText()
          .id(id(`${suffix}-txt`))
          // Centre text in badge: position the bSize×bSize box at tl, rely on CENTER+MIDDLE alignment
          .position({ x: cx - bSize / 2, y: cy - bSize / 2 })
          .width(bSize).height(bSize)
          .plainText(text)
          .textType('PLAIN')
          .fillColor(textColor).fillOpacity(1)
          .strokeOpacity(0).strokeWidth(0)
          .fontFamily('sans-serif')
          .fontSize(fs)
          .fontWeight(fontWeight)
          .textAlign('CENTER')
          .textAlignVertical('MIDDLE'),
        tid
      ).build() as Item
    );
  };

  // ── Toughness (bottom-left, amber) ────────────────────────────────────────
  const toughTotal = combatant.stats.toughness.base + combatant.stats.toughness.armour;
  addBadge('tough', x - offset, y + offset, 'RECTANGLE', '#111111', 0.85, '#c97a2a', String(toughTotal), '#e8a050');

  // ── Parry (bottom-right, teal) ────────────────────────────────────────────
  addBadge('parry', x + offset, y + offset, 'RECTANGLE', '#111111', 0.85, '#2a8aaa', String(combatant.stats.parry), '#50c8e8');

  // ── Bennies (top-left, gold coin) — hidden when 0 ────────────────────────
  if (combatant.stats.bennies > 0) {
    addBadge('benny', x - offset, y - offset, 'CIRCLE', '#c9a800', 1, '#a07800', String(combatant.stats.bennies), '#1a1a1d');
  }

  // ── Shaken (top-right, red) — hidden when not shaken ─────────────────────
  if (combatant.stats.shaken) {
    addBadge('shaken', x + offset, y - offset, 'CIRCLE', '#c0392b', 1, '#8b0000', 'S', '#ffffff', 900);
  }

  return items;
}

// ── Render all ────────────────────────────────────────────────────────────────

async function renderBubbles(state: SavageDeckState | null): Promise<void> {
  await clearBubbles();
  if (!state) return;

  const linked = state.combatants.filter((c) => c.tokenId && c.stats);
  if (linked.length === 0) return;

  const [dpi, tokens] = await Promise.all([
    OBR.scene.grid.getDpi(),
    OBR.scene.items.getItems(linked.map((c) => c.tokenId!)),
  ]);

  const items: Item[] = [];
  for (const combatant of linked) {
    const token = tokens.find((t) => t.id === combatant.tokenId);
    if (token) items.push(...buildBubbles(combatant, token, dpi));
  }

  if (items.length > 0) {
    await OBR.scene.local.addItems(items);
  }
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

OBR.onReady(() => {
  const render = async () => {
    try {
      const meta = await OBR.room.getMetadata();
      await renderBubbles(migrateState(meta[METADATA_KEY]) ?? null);
    } catch {
      // Scene not ready yet — will retry on onReadyChange
    }
  };

  OBR.room.onMetadataChange((meta) => {
    renderBubbles(migrateState(meta[METADATA_KEY]) ?? null).catch(() => {});
  });

  OBR.scene.onReadyChange((ready) => {
    if (ready) render();
    else clearBubbles().catch(() => {});
  });

  render();
});
