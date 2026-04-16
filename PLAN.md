# Savage Deck — OBR Extension for Savage Worlds

**Status:** Ready to build — v1 scaffold not yet started
**Owner:** Damien (code) / Scott (first user)
**Started:** 2026-04-12

---

## START HERE (fresh session entry point)

**What this is:** Action Deck tracker for Savage Worlds in Owlbear Rodeo. Replaces Savage Bubbles (retired). Scott is the first user, running SW Pathfinder.

**Architecture decision (locked 2026-04-16):**
- Savage Bubbles retired. Deck absorbs its job.
- **Popover** = initiative tracker + per-combatant stat editing (Wounds, Toughness, Parry, Shaken)
- **Background script** = reads token metadata, renders stat bubbles on map tokens
- **Token metadata key:** `com.fumbletable.savage-deck/stats`
- **Deploy:** Cloudflare Pages (NOT GitHub Pages — Cloudflare was already the plan for Deck)

**First task for the next build session:**
1. Create the repo: `fumbletable/savage-deck` (use SSH alias `git@github-fumbletable:fumbletable/savage-deck.git`)
2. Scaffold with Vite + React + TypeScript + OBR SDK v3 (same pattern as Savage Dice)
3. Confirm popover opens and OBR role detection works (GM vs PLAYER)
4. Implement combatant list with add/remove — no deck logic yet, just the data model
5. Persist combatant list to OBR scene metadata

**What's NOT built yet:** Everything. The repo doesn't exist. All the planning below is design/spec, not code.

**Rules reference:** Verified SWADE rules in the "SWADE Rules" section below. Use these — don't guess.

---

## SCOUT

**Success:** An Owlbear Rodeo extension Scott can use to run SWADE combat the way it's meant to be run — Action Deck, edges, jokers, on-hold — without the hassle of physical cards or hand-waving the rules. Polished enough to publish publicly under Fumble Table as a community contribution.

**Context:** Existing extension (`hemolack/deck-o-cards`) is 390 lines, covers only basic shuffle/draw. Missing every SWADE-specific behaviour. No license — can't fork legally anyway. Decision taken 2026-04-12 to build our own from scratch.

---

## Zoom Out — What Are We Actually Building?

Before deciding features, answer: **what does a GM need from an Action Deck tool during play?**

The physical deck works because it's tactile — GM deals, players see their card, order is immediate. A digital version has to match that feel *and* earn its place by doing something paper can't: enforcing edges automatically, remembering state across refreshes, giving the GM hidden draws for enemies.

**The test:** after 3 rounds of combat, has the tool stayed out of the way, or has it been the thing everyone's fighting with?

**Design principles:**
1. **GM drives the deal, not players.** One click deals to everyone in the initiative list. Players don't click Draw — they watch.
2. **Combatants are first-class objects**, not "whoever happened to click." You add PCs + enemies once, then deal rounds.
3. **Edges are per-combatant toggles**, applied automatically. Nobody should have to remember "Bob has Quick."
4. **Jokers announce themselves loudly.** +2 reminder on the combatant, reshuffle flag at end of round.
5. **Hidden enemies.** GM sees enemy cards, players don't, until that enemy acts.
6. **Survive a refresh.** State in OBR room metadata, not just in-memory React state. Mid-combat tab crash shouldn't lose the round.

---

## SWADE Rules — Verified from Core Rulebook (Adventure Edition v4.2)

All rules below pulled directly from the SWADE core rulebook (pp. 91–93, 101–102, edges/hindrances). SW Pathfinder inherits these unchanged.

### The Deck & Round Structure

- **54-card Action Deck** = standard 52 + 2 Jokers.
- **Round:** Ace → Deuce countdown. GM starts at Ace and calls down.
- **At start of each round:** deal one card to each Wild Card (plus extras for edges). Extras (zombies, wolves, minions) usually share one card per group. GM may group Wild Cards with their minions.
- **Allies under a player's control act on the player's card.**
- **Mounts** are NOT dealt cards.
- **Ties** broken by suit: **Spades ♠ > Hearts ♥ > Diamonds ♦ > Clubs ♣** (reverse alphabetical).
- **Reshuffle** after any round in which a Joker was dealt (not mid-round).
- **Face up or face down** is GM's choice. Common pattern: players face up, villains face down.

### Jokers

- Joker holder **acts whenever they want** in the round, including **interrupting another's action**.
- **+2 to ALL Trait rolls AND damage rolls** that round.
- Triggers reshuffle at end of round.

### Quick (Edge, Novice, Agility d8+)

- Whenever dealt a card of **5 or lower**, may discard and **keep drawing until card is >5**.
- Repeats — not a single redraw.

### Level Headed / Improved Level Headed (Edges, Seasoned, Smarts d8+)

- **Level Headed:** draw **+1 additional card** each round, choose which to use.
- **Improved Level Headed:** draw **+2 additional cards** each round, choose which to use.
- **LH + Quick stack:** draw the additional LH card first and pick. If chosen card is ≤5, Quick can then replace it until >5.
- Discards go to the discard pile (not back in deck — matters for joker tracking).

### Hesitant (Minor Hindrance)

- Draw **2 cards**, act on the **lowest**.
- **Exception:** if one of the two is a **Joker, keep and use it normally** (the Joker benefits apply). This means Hesitant *increases* joker odds.
- Hesitant cannot take Quick or Level Headed.

### Tactician / Master Tactician (Edges, Seasoned+, needs Command + Battle d6+)

- **Tactician:** dealt **one extra card**, kept **separate from their own**. At start of round, may discard it OR give it to any **allied Extra in Command Range**. Recipient (player or GM) decides whether to accept it (replacing their current card) or discard.
- **Master Tactician:** two extras to distribute.

### On Hold

- Character may choose to go on Hold instead of acting. Discard current card, mark "On Hold" with a counter.
- On Hold persists across rounds until used. If still On Hold when new round begins, **not dealt a new card**.
- **Interrupting:** opposed **Athletics** rolls (not Agility). Highest goes first; ties = simultaneous. Failed interrupt = lose Hold but still get a turn after the foe finishes.
- **Shaken or Stunned while On Hold:** immediately lose Hold status AND the turn. Shaken/Stunned characters can't go On Hold.

### Bennies & Extra Cards

- Player may **spend a Benny to draw a new Action Card** — AFTER all cards dealt and edges/hindrances resolved.
- Quick/LH do NOT apply to Benny-drawn cards.
- Multiple Bennies can be spent (take choice of all draws). Continues until everyone (including GM) passes.

### Incapacitated Characters

- Still dealt Action Cards (for recovery rolls, Bleeding Out, etc.).
- Quick / Level Headed / Hesitant are **ignored** while Incapacitated.

### Surprised Characters

- Automatically On Hold at start of encounter. Dealt in as usual.

### Large Groups (optional)

- For speed, GM can deal **one card per side** (heroes vs villains). Level Headed / Quick apply once, to the side's draw.

### Out of Scope for v1

- **Chases** use cards differently (v2+).
- **Dramatic Tasks** use card spreads (v2+).
- **Interludes** — suit-driven story prompts (separate tool).
- **Adventure Deck** — entirely separate product.

---

## Proposed Feature Set — v1

**GM actions:**
- Add combatant (name, optional token link, edges: Quick / LH / Improved LH / Hesitant / None)
- Add NPC combatant (same, but hidden from players)
- Deal round (auto-applies all edges, auto-handles jokers)
- Manually move combatant on/off hold
- Reveal NPC card (when they act)
- Skip/remove combatant (died, fled)
- End round (triggers reshuffle if joker was drawn)
- Reset combat

**Automatic behaviour:**
- Quick: redraw automatically until card > 5 (or whatever the rule says — TBD)
- Level Headed: draw N, present the set, GM (or player?) picks — then discards go to pile, flag joker if any drawn
- Hesitant: draw 2, auto-keep lowest
- Joker drawn → +2 badge on combatant for this round, reshuffle flag set
- End of round → if flag set, reshuffle full deck

**Display (shared view):**
- Turn order list, current combatant highlighted
- Each entry: name, card (or "hidden" for NPCs not yet acted), edge badges, joker badge
- Round number, cards remaining in deck, reshuffle pending indicator

**Player view:**
- See their own card + any revealed NPC cards
- See turn order with current actor highlighted
- Cannot deal, cannot see hidden NPC cards

**State:**
- Persisted in OBR room metadata (survives refresh)
- Only GM can mutate; players subscribe to updates

---

## Architecture Decision (2026-04-16)

Savage Bubbles is being retired. Savage Deck absorbs its functionality:

- **Popover** = initiative tracker + per-combatant stat editing (Wounds, Toughness, Parry, Shaken)
- **Background script** = reads token metadata, renders wound/stat bubbles on map tokens
- **Token metadata schema** = `com.fumbletable.savage-deck/stats` — single source of truth

This means one extension install covers initiative tracking AND on-map stat display. Savage Dice remains separate and will integrate at v2+ via shared broadcasts.

## v2+ Ideas (out of scope now, noted for later)

- **Damage → wounds integration with Savage Dice** — Dice rolls damage, passes result to Deck, Deck calculates wounds against combatant's Toughness, updates token, bubbles re-render
- **Toughness as target** — Deck passes a combatant's Toughness to Dice for damage calculation context
- (Note: trait dice NOT integrated — those are character-sheet data, not token data)
- Tactician / Master Tactician distribution UI
- Chase cards (suit → complication/bonus)
- Dramatic Tasks (action card spread)
- Adventure Deck (separate tool, probably)
- Interlude prompts
- Combat log export (for session recap)
- **Wound calculator** — damage total + Toughness → wounds output (lives in Deck, not Dice)

---

## Architecture (SDK research done 2026-04-12)

**Persistence:** Room metadata (`OBR.room.setMetadata`), partial-merge, survives scene changes. Key `com.fumbletable.savage-deck/state`. Single JSON blob.

**Role gating:** `OBR.player.getRole()` returns `'GM' | 'PLAYER'`. GM-only writes enforced in our code (SDK doesn't gate).

**Surfaces:**
- Action popover (main panel) — `OBR.action.*`
- Context menu on tokens — `OBR.contextMenu.create` for "Add as combatant"
- Action badge — shows round number / joker alert

**Sync model:** Metadata for state, broadcast only for transient effects (sound, animation). Players subscribe via `OBR.room.onMetadataChange`.

**State shape:** single `SavageDeckState` object — deck, round, phase, combatants[]. Each combatant owns its card reference. See plan doc history for TypeScript interface sketch.

**State machine phases:** SETUP → ACTING → ENDED. Edge pipeline runs inside "Deal Round": base → Tactician extras → LH picks → Quick redraws → (Hesitant v2+) → joker flag.

**Hosting:** Vite static build → Cloudflare Pages. Manifest at `https://savage-deck.pages.dev/manifest.json`.

**Stack:** Vite + React + TypeScript + OBR SDK v3. Match the ecosystem.

## Still to Validate in Scaffold

1. Action popover max width/height — can we fit a 10-combatant list comfortably?
2. Room metadata size ceiling (documented ~64KB class limit; we're far under).
3. setMetadata throttling — stage pipeline in local state and write once per phase transition rather than per-step.

## Technical Architecture Questions (research before scaffolding)

1. **OBR room metadata vs scene metadata vs broadcast** — which is the right persistence layer for combat state? Scene metadata likely, because combat is scene-scoped. Need to read the SDK docs on metadata limits, conflict resolution, who can write.
2. **GM detection** — how does the SDK identify GM vs player role, and can a player spoof it? (Security-ish; matters for hidden NPC cards.)
3. **Extension UI surfaces** — action popover (top-left), context menu, or tool? Probably action popover for the main panel, context menu on tokens for "add as combatant."
4. **Token linking** — can we attach a combatant to an OBR token so the map highlights whose turn it is? Requires token metadata.
5. **Real-time sync latency** — broadcast for actions, metadata for persistence, or metadata for everything? Need to understand what re-renders on all clients.
6. **Local dev + hosting** — Vite dev server works, but OBR loads extensions from a public HTTPS manifest URL. Deploy target? Vercel / GitHub Pages / Cloudflare Pages. Probably Vercel since we have that setup.

---

## Decisions (2026-04-12)

- **Scope:** Ship minimum-viable v1 to Scott fast. Core loop + jokers + on-hold + token linking. Edges added one at a time; if any edge is too complicated to implement well, we just don't support it and GMs handle it manually.
- **Release:** Published under Fumble Table GitHub. Not Fumble Table branded — neutral product identity.
- **Home:** `projects/savage-deck/` standalone.

## v1 Minimum (to Scott)

1. Combatant list (add/remove, PC vs NPC, token link optional)
2. Deal Round — one card per combatant, properly sorted
3. Turn order view with current-combatant highlight
4. Mark Acted / Put On Hold / Interrupt Now
5. Joker detection + +2 badge + reshuffle flag
6. End Round → reshuffle if flagged
7. Hidden NPC cards until acted
8. State persisted in OBR scene metadata
9. GM-only controls (role-gated)

## v1 Stretch (include if not painful)

- Quick edge (cleanest of the edges to implement — single cascade)
- Level Headed (+1 / +2 additional, GM picks)
- Token pulse on current turn

## Deferred until v2+

- Hesitant (joker exception is fiddly)
- Tactician / Master Tactician (Command Range is an abstraction the tool can't verify)
- Benny-draw sub-phase
- Chases, Dramatic Tasks, Interludes
- Adventure Deck

Principle: if an edge needs more than a toggle + a deal-time rule, defer it.

## Runtime Model (how cards bind to people)

Combatants are the primary objects. Each round, cards are dealt INTO combatant slots — they don't float loose. Turn order view = combatants sorted by card rank (desc) + suit (desc), with current highlighted, Jokers and On Hold floated as "can act anytime." GM drives round by clicking Acted on each combatant as they go. State lives in OBR scene metadata so a mid-combat refresh doesn't break anything.

## Open Questions for Damien

1. **License:** MIT under Fumble Table? Confirm before publishing.
2. **Home:** Keep in `projects/savage-deck/` standalone, or move under Fumble Table project umbrella?
3. **Scope pressure:** ship v1 minimal (just deck + jokers + Quick/LH) to Scott fast, then iterate? Or hold until edges + hidden NPCs + persistence are all in?
4. **Brand:** Fumble Table branded, or neutral? Affects extension store listing and visual identity.
5. **Do you have a SWADE rulebook / SRD access I can draw from for rule verification?**

---

## Next Steps

1. Damien answers the open questions above.
2. Rule verification — confirm the "need to verify" bullets against SWADE SRD.
3. Read OBR SDK docs on: room metadata, scene metadata, extension surfaces, token metadata.
4. Sketch state machine (combatants, deck, discard, round, on-hold) before writing React.
5. Scaffold Vite + React + OBR SDK project.
6. v1 build.
