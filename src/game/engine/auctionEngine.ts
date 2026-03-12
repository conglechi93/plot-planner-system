import type { GameState, AuctionState } from '../types/index';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const MIN_OPENING_BID = 10;
const MIN_RAISE = 10;

function addLog(state: GameState, playerId: string, message: string): GameState {
  return {
    ...state,
    log: [
      ...state.log,
      { turn: state.turnCount, playerId, message, timestamp: Date.now() },
    ],
  };
}

function activeBidders(state: GameState): string[] {
  const auction = state.auction;
  if (!auction) return [];
  return state.players
    .filter((p) => !p.isBankrupt && !auction.passedPlayers.includes(p.id))
    .map((p) => p.id);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function startAuction(
  squareIndex: number,
  excludePlayerId: string | null,
  state: GameState,
): GameState {
  const auctionState: AuctionState = {
    squareIndex,
    currentBid: 0,
    currentBidderId: null,
    bids: [],
    passedPlayers: excludePlayerId ? [excludePlayerId] : [],
    isActive: true,
  };

  // Return state with auction started — no log here; callers are responsible
  // for logging context-appropriate messages (e.g. "X declined to buy, auction starts").
  return { ...state, phase: 'auction', auction: auctionState, pendingAction: null };
}

export function placeBid(playerId: string, bidAmount: number, state: GameState): GameState {
  const auction = state.auction;
  if (!auction || !auction.isActive) return state;

  const player = state.players.find((p) => p.id === playerId);
  if (!player || player.isBankrupt) return state;
  if (auction.passedPlayers.includes(playerId)) return state;

  const minBid = auction.currentBidderId === null ? MIN_OPENING_BID : auction.currentBid + MIN_RAISE;
  if (bidAmount < minBid) return state;

  const effectiveBid = Math.min(bidAmount, player.money);
  if (effectiveBid < minBid) return state;

  const newAuction: AuctionState = {
    ...auction,
    currentBid: effectiveBid,
    currentBidderId: playerId,
    bids: [...auction.bids, { playerId, amount: effectiveBid }],
  };

  const square = state.squares[auction.squareIndex];
  return addLog(
    { ...state, auction: newAuction },
    playerId,
    `${player.name} đặt giá ${effectiveBid} triệu cho ${square?.name ?? `ô ${auction.squareIndex}`}.`,
  );
}

export function passAuction(playerId: string, state: GameState): GameState {
  const auction = state.auction;
  if (!auction || !auction.isActive) return state;
  if (auction.passedPlayers.includes(playerId)) return state;

  const player = state.players.find((p) => p.id === playerId);
  const newAuction: AuctionState = {
    ...auction,
    passedPlayers: [...auction.passedPlayers, playerId],
  };

  const square = state.squares[auction.squareIndex];
  const stateAfterPass = addLog(
    { ...state, auction: newAuction },
    playerId,
    `${player?.name ?? playerId} bỏ qua đấu giá cho ${square?.name ?? `ô ${auction.squareIndex}`}.`,
  );

  return checkAuctionComplete(stateAfterPass);
}

export function checkAuctionComplete(state: GameState): GameState {
  const auction = state.auction;
  if (!auction || !auction.isActive) return state;

  if (activeBidders(state).length > 1) return state;

  return finalizeAuction(state);
}

function finalizeAuction(state: GameState): GameState {
  const auction = state.auction;
  if (!auction) return state;

  const winnerId = auction.currentBidderId;
  const square = state.squares[auction.squareIndex];
  const squareName = square?.name ?? `ô ${auction.squareIndex}`;

  if (!winnerId) {
    return addLog(
      {
        ...state,
        phase: 'player_turn_start',
        auction: { ...auction, isActive: false },
        pendingAction: null,
      },
      state.players[state.currentPlayerIndex]?.id ?? 'bank',
      `Không ai đặt giá cho ${squareName}. Tài sản giữ nguyên với ngân hàng.`,
    );
  }

  const winnerIndex = state.players.findIndex((p) => p.id === winnerId);
  if (winnerIndex === -1) {
    return { ...state, phase: 'player_turn_start', auction: { ...auction, isActive: false }, pendingAction: null };
  }

  const winner = state.players[winnerIndex];
  const winningBid = auction.currentBid;

  const newPlayers = state.players.map((p, i) => {
    if (i !== winnerIndex) return p;
    return {
      ...p,
      money: p.money - winningBid,
      ownedSquares: [...p.ownedSquares, auction.squareIndex],
    };
  });

  const newSquares = state.squares.map((s) =>
    s.index === auction.squareIndex ? { ...s, ownerId: winner.id } : s,
  );

  return addLog(
    {
      ...state,
      phase: 'player_turn_start',
      players: newPlayers,
      squares: newSquares,
      auction: { ...auction, isActive: false },
      pendingAction: null,
    },
    winnerId,
    `${winner.name} thắng đấu giá ${squareName} với giá ${winningBid} triệu!`,
  );
}

// ---------------------------------------------------------------------------
// Compat aliases used by gameReducer.ts
// ---------------------------------------------------------------------------

export function isAuctionOver(state: GameState): boolean {
  const auction = state.auction;
  if (!auction || !auction.isActive) return true;
  return activeBidders(state).length <= 1;
}

export const resolveAuction = checkAuctionComplete;
