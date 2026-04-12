# Savage Deck

An Owlbear Rodeo extension for running Savage Worlds (SWADE / SW Pathfinder) Action Deck initiative properly — jokers, edges, on-hold, the lot.

## Status: scaffolding (v0.1.0)

- [x] Plan ([PLAN.md](PLAN.md))
- [x] Rules verified against SWADE core rulebook (Adventure Edition v4.2)
- [x] Vite + React + TypeScript + OBR SDK scaffolded
- [x] Role gate, ready hook, shared state via room metadata
- [x] Start Combat / Reset (GM-only)
- [ ] Combatant list (add/remove PCs, NPCs, Extras)
- [ ] Deal Round — base pipeline
- [ ] Turn order view + Mark Acted
- [ ] On Hold + Interrupt
- [ ] Joker +2 badge + end-of-round reshuffle
- [ ] Quick edge (stretch for v1)
- [ ] Level Headed / Improved LH (stretch for v1)
- [ ] Token link via context menu
- [ ] Deploy to Cloudflare Pages

## Dev

```bash
cd app
npm install
npm run dev
```

To test inside OBR, the dev server URL needs to be HTTPS and reachable by the OBR app. Easiest:

1. `npm run dev` → Vite serves on `http://localhost:5173`
2. Use `ngrok http 5173` (or similar) to get an HTTPS URL
3. In OBR → Settings → Extensions → paste `https://<ngrok>.ngrok.io/manifest.json`

Or build and deploy to Cloudflare Pages (production path — TBD).

## Structure

```
app/
  src/
    lib/
      deck.ts       — cards, shuffle, initiative value, labels
      types.ts      — state shape, edges, combatant types
      obr.ts        — OBR ready/role/shared-state hooks
    App.tsx         — root UI (role-gated)
    main.tsx        — entry
    index.css       — styles
  public/
    manifest.json   — OBR extension manifest
    icon.svg
```

## License

MIT (once published).
