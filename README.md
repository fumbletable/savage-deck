# Savage Deck

An Owlbear Rodeo extension for running Savage Worlds (SWADE / SW Pathfinder) Action Deck initiative. Handles jokers, on-hold, Quick and Level Headed automatically.

## Install in Owlbear Rodeo

1. Open any OBR room (you'll be GM of rooms you create)
2. Settings (⚙, bottom-left) → **Extensions** → **Add Extension**
3. Paste: `https://fumbletable.github.io/savage-deck/manifest.json`
4. Click **Add** → the Savage Deck icon appears in the top-left toolbar

## Using it

**Setup phase:**
1. Click the Savage Deck icon → **Start Combat**
2. Add combatants — type a name, pick PC / NPC / Extras, click Add. Or click **+ From Party** to pull connected players as PCs.
3. Toggle edges on each combatant: **Q** (Quick), **LH** (Level Headed), **LH+** (Improved Level Headed)
4. Click **Deal Round 1**

**Acting phase:**
- Combatants sort by Action Card rank (Ace high → Two low, Jokers act anytime)
- NPC cards hidden from players until the NPC acts
- For each combatant, GM clicks **Acted** when their turn finishes, or **Hold** to wait
- **On Hold** characters float to top of the list with an **Interrupt** button
- Joker bonus shows a highlighted card + reshuffle flag at end of round

**End of round:**
- Click **End Round**
- If any joker was drawn, deck auto-reshuffles
- On-hold combatants carry their hold into the next round (no new card dealt)

## What's in v0.1 (this release)

- Action Deck with proper tie-breaking (Spades > Hearts > Diamonds > Clubs)
- Jokers: +2 bonus badge + end-of-round reshuffle
- **Quick** edge: redraws until rank > 5
- **Level Headed** / **Improved Level Headed**: draws 2/3, keeps best, stacks correctly with Quick
- On Hold + Interrupt (with Athletics roll handled at the table)
- Hidden NPC cards, auto-reveal on act
- Multi-client sync via OBR room metadata
- GM-only controls; players read-only view

## Coming later

- Hesitant hindrance (joker exception)
- Tactician / Master Tactician (distribute cards to allied Extras)
- Benny-for-new-card draw phase
- Token linking (highlight the active combatant's token on the map)
- "Current turn" auto-advance
- Real card art instead of text
- Sound effects

## Local development

```bash
cd app
npm install
npm run dev
```

Dev server runs on `http://localhost:5173`. For testing inside OBR, you'll want the deployed preview URL (pushes to `main` auto-deploy to GitHub Pages in ~30 seconds).

## Project docs

- [PLAN.md](PLAN.md) — architecture, state machine, SWADE rules verified from the core rulebook
- `app/src/lib/engine.ts` — pure functions (addCombatant, dealRound, endRound, etc.) — the SWADE logic, unit-testable
- `app/src/lib/obr.ts` — OBR SDK integration (ready, role, shared state)

## License

MIT. See [LICENSE](LICENSE).

## Credits

- Toolbar icon: ["Card Ace Clubs"](https://game-icons.net/1x1/aussiesim/card-ace-clubs.html) by aussiesim, [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/), via [game-icons.net](https://game-icons.net).

Built by [Fumble Table](https://fumbletable.com).
