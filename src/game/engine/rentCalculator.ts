import type { Square, GameState, PropertyGroup } from '../types/index';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Return every square on the board that belongs to the given color group.
 */
export function getGroupSquares(group: PropertyGroup, squares: Square[]): Square[] {
  return squares.filter((s) => s.type === 'property' && s.group === group);
}

/**
 * Return true when ownerId holds every square in the color group.
 * Mortgaged squares still count toward monopoly ownership for rent-doubling
 * purposes at the base (no-house) level.
 */
export function ownsFullGroup(
  ownerId: string,
  group: PropertyGroup,
  squares: Square[],
): boolean {
  const groupSquares = getGroupSquares(group, squares);
  if (groupSquares.length === 0) return false;
  return groupSquares.every((s) => s.ownerId === ownerId);
}

// ---------------------------------------------------------------------------
// Railroad rent lookup – 25 × 2^(n-1)
// ---------------------------------------------------------------------------
const RAILROAD_RENT: Record<number, number> = {
  1: 25,
  2: 50,
  3: 100,
  4: 200,
};

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Calculate how much rent the current player must pay upon landing on
 * `squareIndex`.  Returns 0 when no rent is owed.
 *
 * @param squareIndex  Index of the square that was landed on.
 * @param state        Full current game state.
 * @param diceTotal    Combined dice roll (used only for utility rent).
 *                     Defaults to 7 (statistical average) when omitted.
 */
export function calculateRent(
  squareIndex: number,
  state: GameState,
  diceTotal?: number,
): number {
  const square = state.squares[squareIndex];
  if (!square) return 0;

  // No owner → no rent
  if (!square.ownerId) return 0;

  // Square is mortgaged → no rent
  if (square.isMortgaged) return 0;

  // Current player owns the square → no rent
  const currentPlayer = state.players[state.currentPlayerIndex];
  if (square.ownerId === currentPlayer.id) return 0;

  // Only property, railroad, and utility squares charge rent
  if (
    square.type !== 'property' &&
    square.type !== 'railroad' &&
    square.type !== 'utility'
  ) {
    return 0;
  }

  // ── Colored property ──────────────────────────────────────────────────────
  if (square.type === 'property') {
    const { houses } = square;

    // Hotel (stored as houses === 5)
    if (houses === 5) return square.rentWithHotel ?? 0;

    // Houses 1–4
    if (houses === 4) return square.rentWith4Houses ?? 0;
    if (houses === 3) return square.rentWith3Houses ?? 0;
    if (houses === 2) return square.rentWith2Houses ?? 0;
    if (houses === 1) return square.rentWith1House ?? 0;

    // No buildings – double base rent if owner holds the full color group
    const baseRent = square.rentBase ?? 0;
    if (square.group && ownsFullGroup(square.ownerId, square.group, state.squares)) {
      return baseRent * 2;
    }
    return baseRent;
  }

  // ── Railroad ──────────────────────────────────────────────────────────────
  if (square.type === 'railroad') {
    const ownedCount = state.squares.filter(
      (s) => s.type === 'railroad' && s.ownerId === square.ownerId,
    ).length;
    return RAILROAD_RENT[Math.min(ownedCount, 4)] ?? 25;
  }

  // ── Utility ───────────────────────────────────────────────────────────────
  if (square.type === 'utility') {
    const dice = diceTotal ?? 7;
    const ownedCount = state.squares.filter(
      (s) => s.type === 'utility' && s.ownerId === square.ownerId,
    ).length;
    return ownedCount >= 2 ? dice * 10 : dice * 4;
  }

  return 0;
}
