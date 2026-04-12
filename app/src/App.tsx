import { useObrReady, useRole, useSharedState, freshState } from './lib/obr';

export default function App() {
  const ready = useObrReady();
  const role = useRole(ready);
  const { state, write } = useSharedState(ready);

  if (!ready) return <div className="status">Connecting to Owlbear Rodeo…</div>;
  if (!role) return <div className="status">Loading role…</div>;

  return (
    <div className="panel">
      <header>
        <h1>Savage Deck</h1>
        <span className="role-badge">{role}</span>
      </header>

      {!state ? (
        <div className="empty">
          <p>No combat in progress.</p>
          {role === 'GM' ? (
            <button onClick={() => write(freshState())}>Start Combat</button>
          ) : (
            <p className="muted">Waiting for GM to start combat.</p>
          )}
        </div>
      ) : (
        <div className="combat">
          <div className="meta">
            <span>Round {state.round}</span>
            <span>Deck: {state.deck.remaining.length} left</span>
            <span>Discard: {state.deck.discarded.length}</span>
            <span>Phase: {state.phase}</span>
            {state.deck.jokerDrawnThisRound && (
              <span className="joker-warn">⚠ Joker — reshuffle at end</span>
            )}
          </div>
          {role === 'GM' && (
            <div className="controls">
              <button onClick={() => write(freshState())}>Reset</button>
            </div>
          )}
          <p className="muted">Combatant list + dealing coming next.</p>
        </div>
      )}
    </div>
  );
}
