import type { GameState, GameEvent, Player } from '../types';
import { canBuildHouse, canBuildHotel } from '../engine/buildingActions';

// ─── Strategy thresholds ──────────────────────────────────────────────────────

/**
 * Money multiplier vs property price required before the AI will buy.
 *   aggressive   → buy if money > price × 1.2
 *   balanced     → buy if money > price × 1.5 (and group not blocked)
 *   conservative → buy if money > price × 2.0 AND money > 500
 */
const BUY_THRESHOLD: Record<Player['aiStrategy'], number> = {
  aggressive:   1.2,
  balanced:     1.5,
  conservative: 2.0,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * True if at least one non-bankrupt other player owns a square in the same
 * colour group.  Used to avoid buying into a colour group that can never be
 * completed.
 */
function groupBlockedByOthers(
  squareIndex: number,
  playerId: string,
  state: GameState,
): boolean {
  const square = state.squares[squareIndex];
  if (!square.group) return false;

  return state.squares.some(
    s =>
      s.group === square.group &&
      s.ownerId !== null &&
      s.ownerId !== playerId,
  );
}

/**
 * Find the cheapest unmortgaged property owned by `player` that has no
 * buildings on it (safe to mortgage without breaking even-build rule).
 */
function cheapestMortgagableSquare(
  player: Player,
  state: GameState,
): number | null {
  const candidates = player.ownedSquares
    .map(i => state.squares[i])
    .filter(s => !s.isMortgaged && s.houses === 0);

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => (a.mortgageValue ?? 0) - (b.mortgageValue ?? 0));
  return candidates[0].index;
}

/**
 * Pick the best square from the player's portfolio on which a house can be
 * built right now.
 */
function pickBuildTarget(player: Player, state: GameState): number | null {
  for (const idx of player.ownedSquares) {
    if (canBuildHouse(idx, player.id, state).canBuild) return idx;
    if (canBuildHotel(idx, player.id, state).canBuild) return idx;
  }
  return null;
}

// ─── Main AI decision function ────────────────────────────────────────────────

/**
 * Inspect the current game state and return the most appropriate GameEvent
 * for the AI player to emit next.
 *
 * Exported as **both** `pickDecision` (legacy name used by useGameEngine) and
 * `pickAIDecision` (canonical name from the updated spec).
 *
 * Call this function once per "tick" in the UI loop when it is the AI's turn.
 */
export function pickAIDecision(player: Player, state: GameState): GameEvent {
  const { phase, pendingAction } = state;

  // ── Jail handling ────────────────────────────────────────────────────────
  if (phase === 'in_jail' || player.inJail) {
    if (player.money > 500 && player.jailTurns < 2) {
      return { type: 'PAY_JAIL_BAIL' };
    }
    if (player.jailFreeCards > 0) {
      return { type: 'USE_JAIL_FREE_CARD' };
    }
    return { type: 'ROLL_FOR_JAIL' };
  }

  // ── Explicit jail-decision pending action ────────────────────────────────
  if (pendingAction?.type === 'jail_decision') {
    if (player.money > 500 && player.jailTurns < 2) {
      return { type: 'PAY_JAIL_BAIL' };
    }
    if (player.jailFreeCards > 0) {
      return { type: 'USE_JAIL_FREE_CARD' };
    }
    return { type: 'ROLL_FOR_JAIL' };
  }

  // ── Start-of-turn: optionally build / mortgage, then roll ────────────────
  if (phase === 'player_turn_start') {
    const buildTarget = pickBuildTarget(player, state);
    if (buildTarget !== null) {
      const sq = state.squares[buildTarget];
      const houseCost = sq.houseCost ?? 0;
      if (player.money > houseCost * 3) {
        if (canBuildHotel(buildTarget, player.id, state).canBuild) {
          return { type: 'BUILD_HOTEL', payload: { squareIndex: buildTarget } };
        }
        return { type: 'BUILD_HOUSE', payload: { squareIndex: buildTarget } };
      }
    }

    // Mortgage cheapest property to raise emergency cash
    if (player.money < 100) {
      const mortgageTarget = cheapestMortgagableSquare(player, state);
      if (mortgageTarget !== null) {
        return { type: 'MORTGAGE_PROPERTY', payload: { squareIndex: mortgageTarget } };
      }
    }

    return { type: 'ROLL_DICE' };
  }

  // ── Drawn card: must be applied immediately ───────────────────────────────
  if (pendingAction?.type === 'card_drawn' || phase === 'drawing_card') {
    return { type: 'APPLY_CARD' };
  }

  // ── Property purchase decision ────────────────────────────────────────────
  if (
    (phase === 'buying_property' || pendingAction?.type === 'buy_or_auction') &&
    pendingAction?.type === 'buy_or_auction'
  ) {
    const square = state.squares[pendingAction.squareIndex];
    const price = square.price ?? 0;
    const threshold = BUY_THRESHOLD[player.aiStrategy];

    // Conservative requires a minimum cash floor in addition to the multiplier
    const hasCashFloor =
      player.aiStrategy !== 'conservative' || player.money > 500;

    // Balanced avoids groups already partially claimed by opponents
    const blocked =
      player.aiStrategy === 'balanced'
        ? groupBlockedByOthers(pendingAction.squareIndex, player.id, state)
        : false;

    const shouldBuy = player.money > price * threshold && hasCashFloor && !blocked;

    return shouldBuy ? { type: 'BUY_PROPERTY' } : { type: 'DECLINE_PROPERTY' };
  }

  // ── Pay rent (mandatory, no real choice) ─────────────────────────────────
  if (phase === 'paying_rent' || pendingAction?.type === 'pay_rent') {
    return { type: 'PAY_RENT' };
  }

  // ── Pay tax: PAY_RENT event handles both pay_rent and pay_tax pending actions
  if (pendingAction?.type === 'pay_tax') {
    return { type: 'PAY_RENT' };
  }

  // ── Landing with nothing else to do → end turn ───────────────────────────
  if (phase === 'landing' && !pendingAction) {
    return { type: 'END_TURN' };
  }

  // ── Fallback ──────────────────────────────────────────────────────────────
  return { type: 'END_TURN' };
}

/** Alias kept for backwards compatibility with `useGameEngine`. */
export const pickDecision = pickAIDecision;

// ─── Supplementary build decisions ───────────────────────────────────────────

/**
 * Return a (possibly empty) list of BUILD_HOUSE / BUILD_HOTEL events the AI
 * should fire when it has acquired a full colour group monopoly.
 *
 * Intended to be called by the AI loop **before** emitting ROLL_DICE during
 * `player_turn_start`, so that houses are placed before the player moves.
 */
export function getAIBuildDecisions(
  player: Player,
  state: GameState,
): GameEvent[] {
  if (state.phase !== 'player_turn_start') return [];

  const events: GameEvent[] = [];

  const groups = [
    'brown', 'light_blue', 'pink', 'orange',
    'red',   'yellow',     'green', 'dark_blue',
  ] as const;

  for (const group of groups) {
    const allInGroup   = state.squares.filter(s => s.group === group);
    const ownedInGroup = allInGroup.filter(
      s => s.ownerId === player.id && !s.isMortgaged,
    );

    // Must own every square in the group to build
    if (ownedInGroup.length < allInGroup.length) continue;
    if (ownedInGroup.length === 0) continue;

    // Build on the cheapest property first
    const sorted = [...ownedInGroup].sort(
      (a, b) => (a.price ?? 0) - (b.price ?? 0),
    );

    for (const sq of sorted) {
      const houseCost = sq.houseCost ?? 0;
      if (houseCost === 0) continue;
      // Keep a 3× house-cost cash buffer
      if (player.money <= houseCost * 3) continue;

      if (sq.houses === 4 && canBuildHotel(sq.index, player.id, state).canBuild) {
        events.push({ type: 'BUILD_HOTEL', payload: { squareIndex: sq.index } });
        break; // one decision per group per tick
      }

      if (sq.houses < 4 && canBuildHouse(sq.index, player.id, state).canBuild) {
        events.push({ type: 'BUILD_HOUSE', payload: { squareIndex: sq.index } });
        break;
      }
    }
  }

  return events;
}
