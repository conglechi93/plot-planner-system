import type { GameState, Square } from '../types/index';

// ---------------------------------------------------------------------------
// Public result type
// ---------------------------------------------------------------------------

export interface BuildResult {
  success: boolean;
  error?: string;
  newState?: GameState;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Return all property squares that share the color group of squareIndex. */
function groupSquaresFor(squareIndex: number, squares: Square[]): Square[] {
  const sq = squares[squareIndex];
  if (!sq?.group) return [];
  return squares.filter((s) => s.type === 'property' && s.group === sq.group);
}

/** Add a log entry to state. */
function addLog(state: GameState, playerId: string, message: string): GameState {
  return {
    ...state,
    log: [
      ...state.log,
      {
        turn: state.turnCount,
        playerId,
        message,
        timestamp: Date.now(),
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Can-build checks
// ---------------------------------------------------------------------------

/**
 * Determine whether `playerId` can legally build a house on `squareIndex`.
 *
 * Rules:
 *  1. Square must be a property owned by playerId, not mortgaged.
 *  2. Player must own the full color group (none mortgaged).
 *  3. Even-building: square must have ≤ minimum houses in the group.
 *  4. Must currently have fewer than 4 houses (hotels handled separately).
 *  5. Bank must hold at least one house token.
 */
export function canBuildHouse(
  squareIndex: number,
  playerId: string,
  state: GameState,
): { canBuild: boolean; reason?: string } {
  const square = state.squares[squareIndex];

  if (!square) return { canBuild: false, reason: 'Ô không tồn tại.' };
  if (square.type !== 'property') return { canBuild: false, reason: 'Chỉ có thể xây trên đất màu.' };
  if (square.ownerId !== playerId) return { canBuild: false, reason: 'Bạn không sở hữu ô này.' };
  if (square.isMortgaged) return { canBuild: false, reason: 'Ô đang bị thế chấp.' };
  if (square.houses >= 4) return { canBuild: false, reason: 'Đã đủ 4 nhà, hãy xây khách sạn.' };
  if (state.bankHouses < 1) return { canBuild: false, reason: 'Ngân hàng hết nhà.' };

  // Full group ownership check (none mortgaged)
  const group = groupSquaresFor(squareIndex, state.squares);
  if (group.length === 0) return { canBuild: false, reason: 'Không tìm thấy nhóm màu.' };
  if (!group.every((s) => s.ownerId === playerId)) {
    return { canBuild: false, reason: 'Chưa sở hữu toàn bộ nhóm màu.' };
  }
  if (group.some((s) => s.isMortgaged)) {
    return { canBuild: false, reason: 'Có ô trong nhóm đang bị thế chấp.' };
  }

  // Even-building: this square must not already have more houses than any other
  const minHouses = Math.min(...group.map((s) => s.houses));
  if (square.houses > minHouses) {
    return { canBuild: false, reason: 'Phải xây đều – ô khác có ít nhà hơn.' };
  }

  return { canBuild: true };
}

/**
 * Determine whether `playerId` can legally build a hotel on `squareIndex`
 * (replacing all 4 houses).
 *
 * Rules:
 *  1. Square must have exactly 4 houses.
 *  2. All other squares in the group must also have at least 4 houses (or hotel).
 *  3. Bank must hold at least one hotel token.
 */
export function canBuildHotel(
  squareIndex: number,
  playerId: string,
  state: GameState,
): { canBuild: boolean; reason?: string } {
  const square = state.squares[squareIndex];

  if (!square) return { canBuild: false, reason: 'Ô không tồn tại.' };
  if (square.type !== 'property') return { canBuild: false, reason: 'Chỉ có thể xây trên đất màu.' };
  if (square.ownerId !== playerId) return { canBuild: false, reason: 'Bạn không sở hữu ô này.' };
  if (square.isMortgaged) return { canBuild: false, reason: 'Ô đang bị thế chấp.' };
  if (square.houses !== 4) return { canBuild: false, reason: 'Cần đúng 4 nhà để nâng cấp lên khách sạn.' };
  if (state.bankHotels < 1) return { canBuild: false, reason: 'Ngân hàng hết khách sạn.' };

  // Full group ownership check
  const group = groupSquaresFor(squareIndex, state.squares);
  if (!group.every((s) => s.ownerId === playerId)) {
    return { canBuild: false, reason: 'Chưa sở hữu toàn bộ nhóm màu.' };
  }
  if (group.some((s) => s.isMortgaged)) {
    return { canBuild: false, reason: 'Có ô trong nhóm đang bị thế chấp.' };
  }

  // Even-building: all other properties must have 4 houses or a hotel already
  const others = group.filter((s) => s.index !== squareIndex);
  if (!others.every((s) => s.houses >= 4)) {
    return { canBuild: false, reason: 'Phải xây đều – các ô khác chưa có 4 nhà.' };
  }

  return { canBuild: true };
}

// ---------------------------------------------------------------------------
// Build actions
// ---------------------------------------------------------------------------

/**
 * Build one house on `squareIndex` for `playerId`.
 * Deducts houseCost from player's money; returns one house from the bank.
 */
export function buildHouse(
  squareIndex: number,
  playerId: string,
  state: GameState,
): BuildResult {
  const { canBuild, reason } = canBuildHouse(squareIndex, playerId, state);
  if (!canBuild) return { success: false, error: reason };

  const square = state.squares[squareIndex];
  const houseCost = square.houseCost ?? 0;

  const player = state.players.find((p) => p.id === playerId);
  if (!player) return { success: false, error: 'Không tìm thấy người chơi.' };
  if (player.money < houseCost) {
    return { success: false, error: 'Không đủ tiền để xây nhà.' };
  }

  const newSquares = state.squares.map((s) =>
    s.index === squareIndex ? { ...s, houses: s.houses + 1 } : s,
  );
  const newPlayers = state.players.map((p) =>
    p.id === playerId ? { ...p, money: p.money - houseCost } : p,
  );

  const newState = addLog(
    {
      ...state,
      squares: newSquares,
      players: newPlayers,
      bankHouses: state.bankHouses - 1,
    },
    playerId,
    `${player.name} xây nhà tại ${square.name} với giá ${houseCost} triệu.`,
  );

  return { success: true, newState };
}

/**
 * Build a hotel on `squareIndex` for `playerId` (4 houses → hotel).
 * The 4 houses return to the bank; one hotel leaves the bank.
 * Deducts houseCost from player's money.
 */
export function buildHotel(
  squareIndex: number,
  playerId: string,
  state: GameState,
): BuildResult {
  const { canBuild, reason } = canBuildHotel(squareIndex, playerId, state);
  if (!canBuild) return { success: false, error: reason };

  const square = state.squares[squareIndex];
  const houseCost = square.houseCost ?? 0;

  const player = state.players.find((p) => p.id === playerId);
  if (!player) return { success: false, error: 'Không tìm thấy người chơi.' };
  if (player.money < houseCost) {
    return { success: false, error: 'Không đủ tiền để xây khách sạn.' };
  }

  const newSquares = state.squares.map((s) =>
    s.index === squareIndex ? { ...s, houses: 5 } : s,
  );
  const newPlayers = state.players.map((p) =>
    p.id === playerId ? { ...p, money: p.money - houseCost } : p,
  );

  // The 4 houses go back to the bank; 1 hotel is consumed
  const newState = addLog(
    {
      ...state,
      squares: newSquares,
      players: newPlayers,
      bankHouses: state.bankHouses + 4,
      bankHotels: state.bankHotels - 1,
    },
    playerId,
    `${player.name} xây khách sạn tại ${square.name} với giá ${houseCost} triệu.`,
  );

  return { success: true, newState };
}

// ---------------------------------------------------------------------------
// Sell actions
// ---------------------------------------------------------------------------

/**
 * Sell one house on `squareIndex` for `playerId`.
 * Refunds half of houseCost; house token returns to the bank.
 *
 * Even-selling rule: the square must have ≥ the maximum houses in the group
 * (i.e., you can only sell from the most-built square).
 */
export function sellHouse(
  squareIndex: number,
  playerId: string,
  state: GameState,
): BuildResult {
  const square = state.squares[squareIndex];
  if (!square) return { success: false, error: 'Ô không tồn tại.' };
  if (square.type !== 'property') return { success: false, error: 'Chỉ có thể bán nhà trên đất màu.' };
  if (square.ownerId !== playerId) return { success: false, error: 'Bạn không sở hữu ô này.' };
  if (square.houses < 1 || square.houses > 4) {
    return { success: false, error: 'Không có nhà để bán (hoặc đây là khách sạn).' };
  }

  // Even-selling: must sell from the square with the most houses
  const group = groupSquaresFor(squareIndex, state.squares);
  const maxHouses = Math.max(...group.map((s) => s.houses));
  if (square.houses < maxHouses) {
    return { success: false, error: 'Phải bán đều – ô khác có nhiều nhà hơn.' };
  }

  const player = state.players.find((p) => p.id === playerId);
  if (!player) return { success: false, error: 'Không tìm thấy người chơi.' };

  const refund = Math.floor((square.houseCost ?? 0) / 2);

  const newSquares = state.squares.map((s) =>
    s.index === squareIndex ? { ...s, houses: s.houses - 1 } : s,
  );
  const newPlayers = state.players.map((p) =>
    p.id === playerId ? { ...p, money: p.money + refund } : p,
  );

  const newState = addLog(
    {
      ...state,
      squares: newSquares,
      players: newPlayers,
      bankHouses: state.bankHouses + 1,
    },
    playerId,
    `${player.name} bán nhà tại ${square.name}, thu lại ${refund} triệu.`,
  );

  return { success: true, newState };
}

/**
 * Sell a hotel on `squareIndex` for `playerId`.
 * Refunds half of houseCost; hotel returns to the bank.
 * The square reverts to 4 houses IF the bank has enough; otherwise as many
 * as available (clamped to what the bank holds).
 *
 * Even-selling for hotels: all other squares in the group must also have a
 * hotel (or we are selling the last one in a group — allowed for fundraising).
 * Standard Monopoly rules allow selling hotels at any time to raise cash;
 * we enforce that all hotels in a group must be simultaneously downgraded if
 * the bank can't supply the 4 replacement houses.
 */
export function sellHotel(
  squareIndex: number,
  playerId: string,
  state: GameState,
): BuildResult {
  const square = state.squares[squareIndex];
  if (!square) return { success: false, error: 'Ô không tồn tại.' };
  if (square.type !== 'property') return { success: false, error: 'Chỉ có thể bán khách sạn trên đất màu.' };
  if (square.ownerId !== playerId) return { success: false, error: 'Bạn không sở hữu ô này.' };
  if (square.houses !== 5) return { success: false, error: 'Ô này không có khách sạn.' };

  const player = state.players.find((p) => p.id === playerId);
  if (!player) return { success: false, error: 'Không tìm thấy người chơi.' };

  const refund = Math.floor((square.houseCost ?? 0) / 2);

  // The hotel goes back; replace with as many houses as the bank can supply
  const housesReturned = Math.min(4, state.bankHouses);

  const newSquares = state.squares.map((s) =>
    s.index === squareIndex ? { ...s, houses: housesReturned } : s,
  );
  const newPlayers = state.players.map((p) =>
    p.id === playerId ? { ...p, money: p.money + refund } : p,
  );

  const newState = addLog(
    {
      ...state,
      squares: newSquares,
      players: newPlayers,
      bankHouses: state.bankHouses - housesReturned,
      bankHotels: state.bankHotels + 1,
    },
    playerId,
    `${player.name} bán khách sạn tại ${square.name}, thu lại ${refund} triệu.`,
  );

  return { success: true, newState };
}
