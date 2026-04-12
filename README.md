# Savage Deck

An Owlbear Rodeo extension for running Savage Worlds (SWADE / SW Pathfinder) Action Deck initiative. Handles jokers, on-hold, edges, and map-side token highlighting automatically.

**Current version:** v0.2.0 — [release notes](https://github.com/fumbletable/savage-deck/releases/tag/v0.2.0)

## Install in Owlbear Rodeo

1. Open any OBR room (you'll be GM of rooms you create)
2. Settings (⚙, bottom-left) → **Extensions** → **Add Extension**
3. Paste: `https://fumbletable.github.io/savage-deck/manifest.json`
4. Click **Add** → the Ace of Clubs icon appears in the top-left toolbar

Existing users auto-update — just hard refresh the OBR tab.

## Using it

**Setup phase:**
1. Click the Savage Deck icon → **Start Combat**
2. Add combatants — two ways:
   - **From the map:** right-click any token (or multi-select several) → **Add to Savage Deck** → choose PC / NPC / Extras. Creates the combatant and links to the token in one step.
   - **Manually:** type a name, pick PC / NPC / Extras, click Add. Or **+ From Party** to pull all connected players as PCs.
3. Toggle edges per combatant: **Q** (Quick), **LH** (Level Headed), **LH+** (Improved Level Headed). Hover each toggle for the full SWADE rule.
4. Click the **Link** button on any row to attach a combatant to a selected map token (if you added them manually).
5. Click **Deal Round 1**

**Acting phase:**
- Combatants sort by Action Card rank (Ace high → Two low, Jokers on top)
- The active combatant glows purple in the panel with a ▶ marker
- If they have a linked token, it gets a **purple ring on the map** that follows them
- NPC cards hidden from players until the NPC acts
- GM clicks **Acted** → marker auto-advances to the next combatant. Or click any row to set active manually.
- **Hold** discards the card and floats the combatant to the top with an **Interrupt** button. Interrupt rolls are opposed Athletics at the table (the tool doesn't roll for you).
- Jokers show on a gold card with a +2 reminder and flag the deck for end-of-round reshuffle

**End of round:**
- Click **End Round**
- If any joker was drawn, deck auto-reshuffles (full 54 cards back)
- On-hold combatants carry their hold into the next round — no new card dealt

## Features

### Rules handled automatically
- 54-card Action Deck with correct tie-breaking (Spades > Hearts > Diamonds > Clubs)
- **Jokers:** +2 bonus badge, end-of-round reshuffle
- **Quick** (Novice, Agility d8+): redraws until rank > 5
- **Level Headed / Improved Level Headed** (Seasoned, Smarts d8+): draws +1 / +2, keeps best, stacks correctly with Quick per SWADE rules
- **On Hold / Interrupt:** card discarded, combatant floats, Athletics roll adjudicated at table
- Hidden NPC cards, auto-reveal when the NPC acts

### UX / map integration
- Active-turn highlight in the panel with auto-advance
- Purple ring on the active combatant's linked token, follows the token when moved
- Right-click tokens to add them as combatants (+ auto-link in one step)
- Multi-client sync via OBR room metadata — survives browser refreshes
- GM-only controls; players get a read-only view of turn order with hidden NPC cards

### Styled to feel right
- Card faces on cream stock, serif font, red hearts/diamonds, black spades/clubs, gold Jokers
- Tooltips on edge toggles explain the full rule

## Coming later

- **Hesitant hindrance** — joker-exception logic
- **Tactician / Master Tactician** — distribute extra cards to allied Extras
- **Benny-for-new-card** draw phase
- **Sound effects** — shuffle, card-flip, joker fanfare
- **Reveal-all-NPC-cards** option at end of round

## Feedback

Open an issue on this repo, or tell your GM.

## Local development

```bash
cd app
npm install
npm run dev
```

Dev server runs on `http://localhost:5173`. Inside OBR, pushes to `main` auto-deploy to GitHub Pages in ~30 seconds.

## Project docs

- [PLAN.md](PLAN.md) — architecture, state machine, SWADE rules verified from the core rulebook
- `app/src/lib/engine.ts` — pure functions (addCombatant, dealRound, endRound, etc.) — the SWADE logic, framework-agnostic
- `app/src/lib/obr.ts` — OBR SDK integration (ready, role, shared state, map ring, context menus)

## License

MIT. See [LICENSE](LICENSE).

## Credits

- Toolbar icon: ["Card Ace Clubs"](https://game-icons.net/1x1/aussiesim/card-ace-clubs.html) by aussiesim, [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/), via [game-icons.net](https://game-icons.net).

Built by [Fumble Table](https://fumbletable.com).
