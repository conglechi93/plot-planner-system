import type {
  GameState,
  GameEvent,
  Player,
  Square,
  GameLogEntry,
  PendingAction,
  AIStrategy,
} from '../types/index';
import { createInitialSquares } from '../board/boardData';
import { CHANCE_CARDS, shuffleCards } from '../cards/chanceCards';
import { COMMUNITY_CHEST_CARDS } from '../cards/communityChestCards';
import { calculateRent } from './rentCalculator';
import { applyCard } from './cardActions';
import {
  buildHouse as buildHouseEngine,
  buildHotel as buildHotelEngine,
  sellHouse as sellHouseEngine,
  sellHotel as sellHotelEngine,
} from './buildingActions';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BOARD_SIZE = 40;
const GO_POSITION = 0;
const GO_BONUS = 200;
const JAIL_POSITION = 10;
const JAIL_BAIL = 50;
const STARTING_MONEY = 1500;
const BANK_HOUSES = 32;
const BANK_HOTELS = 12;

const PLAYER_COLORS = ['#E53E3E', '#3182CE', '#D69E2E', '#805AD5'] as const;

// ---------------------------------------------------------------------------
// Logging helper
// ---------------------------------------------------------------------------

function addLog(state: GameState, playerId: string, message: string): GameState {
  const entry: GameLogEntry = {
    turn: state.turnCount,
    playerId,
    message,
    timestamp: Date.now(),
  };
  return { ...state, log: [...state.log, entry] };
}

// ---------------------------------------------------------------------------
// Dice helper
// ---------------------------------------------------------------------------

function rollDie(override?: number): number {
  if (override !== undefined && override >= 1 && override <= 6) return override;
  return Math.floor(Math.random() * 6) + 1;
}

// ---------------------------------------------------------------------------
// Bankruptcy helper
// ---------------------------------------------------------------------------

/**
 * Transfer all assets from the bankrupt player to `creditorId` (or to the
 * bank when creditorId is null), mark them bankrupt, and check for a winner.
 */
function transferAssetsAndBankrupt(
  bankruptPlayer: Player,
  creditorId: string | null,
  state: GameState,
): GameState {
  const ownedIndices = bankruptPlayer.ownedSquares;

  // Re-assign all owned squares
  const newSquares: Square[] = state.squares.map((sq) => {
    if (!ownedIndices.includes(sq.index)) return sq;
    if (creditorId) {
      // Transfer to creditor (keep mortgage status)
      return { ...sq, ownerId: creditorId };
    }
    // Return to bank: clear ownership, mortgage, and buildings
    return { ...sq, ownerId: null, isMortgaged: false, houses: 0 };
  });

  const newPlayers = state.players.map((p) => {
    if (p.id === bankruptPlayer.id) {
      return { ...p, isBankrupt: true, money: 0, ownedSquares: [] };
    }
    if (creditorId && p.id === creditorId) {
      return {
        ...p,
        money: p.money + bankruptPlayer.money,
        ownedSquares: [...p.ownedSquares, ...ownedIndices],
      };
    }
    return p;
  });

  // Return building tokens to the bank
  let bankHouses = state.bankHouses;
  let bankHotels = state.bankHotels;
  for (const idx of ownedIndices) {
    const sq = state.squares[idx];
    if (sq.houses === 5) bankHotels += 1;
    else bankHouses += sq.houses;
  }

  // Check for a winner (only one non-bankrupt player left)
  const activePlayers = newPlayers.filter((p) => !p.isBankrupt);
  const winner = activePlayers.length === 1 ? activePlayers[0].id : null;

  return addLog(
    {
      ...state,
      players: newPlayers,
      squares: newSquares,
      bankHouses,
      bankHotels,
      winner,
      phase: winner ? 'game_over' : state.phase,
      pendingAction: winner ? null : state.pendingAction,
    },
    bankruptPlayer.id,
    `${bankruptPlayer.name} đã phá sản!`,
  );
}

// ---------------------------------------------------------------------------
// Player-rotation helper
// ---------------------------------------------------------------------------

function nextActivePlayerIndex(currentIndex: number, players: Player[]): number {
  const count = players.length;
  for (let i = 1; i <= count; i++) {
    const idx = (currentIndex + i) % count;
    if (!players[idx].isBankrupt) return idx;
  }
  return currentIndex;
}

// ---------------------------------------------------------------------------
// Landing logic helper
// ---------------------------------------------------------------------------

/**
 * Determine which PendingAction (if any) to set after a player lands on
 * `position`.  Card squares and go_to_jail are handled inline in ROLL_DICE.
 */
function buildPendingAction(
  position: number,
  player: Player,
  state: GameState,
  diceSum: number,
): PendingAction | null {
  const square = state.squares[position];

  switch (square.type) {
    case 'property':
    case 'railroad':
    case 'utility': {
      if (!square.ownerId) {
        return { type: 'buy_or_auction', squareIndex: position };
      }
      if (square.ownerId !== player.id && !square.isMortgaged) {
        const rent = calculateRent(position, state, diceSum);
        if (rent > 0) {
          return {
            type: 'pay_rent',
            squareIndex: position,
            amount: rent,
            toPlayerId: square.ownerId,
          };
        }
      }
      return null;
    }

    case 'tax':
      return { type: 'pay_tax', amount: square.price ?? 0 };

    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Card-draw helper
// ---------------------------------------------------------------------------

function drawCard(
  squareType: 'chance' | 'community_chest',
  state: GameState,
): GameState {
  let deck =
    squareType === 'chance' ? [...state.chanceDeck] : [...state.communityChestDeck];

  if (deck.length === 0) {
    deck = shuffleCards(squareType === 'chance' ? CHANCE_CARDS : COMMUNITY_CHEST_CARDS);
  }

  const [card, ...remaining] = deck;
  const deckUpdate =
    squareType === 'chance'
      ? { chanceDeck: remaining }
      : { communityChestDeck: remaining };

  return addLog(
    {
      ...state,
      ...deckUpdate,
      lastDrawnCard: card,
      phase: 'drawing_card',
      pendingAction: { type: 'card_drawn', card } as PendingAction,
    },
    state.players[state.currentPlayerIndex].id,
    `Rút lá bài: ${card.description}`,
  );
}

// ---------------------------------------------------------------------------
// Main Reducer
// ---------------------------------------------------------------------------

export function gameReducer(state: GameState, event: GameEvent): GameState {
  const player = state.players[state.currentPlayerIndex];

  switch (event.type) {

    // ─────────────────────────────────────────────────────────────────────────
    // ROLL_DICE
    // ─────────────────────────────────────────────────────────────────────────
    case 'ROLL_DICE': {
      // While in jail the player must use ROLL_FOR_JAIL
      if (player.inJail) return state;

      const d1 = rollDie(event.payload?.d1 as number | undefined);
      const d2 = rollDie(event.payload?.d2 as number | undefined);
      const isDoubles = d1 === d2;
      const diceSum = d1 + d2;

      const newDoublesCount = isDoubles ? player.doublesCount + 1 : 0;

      // Three consecutive doubles → go to jail immediately, turn ends
      if (newDoublesCount >= 3) {
        const jailedPlayers = state.players.map((p, i) =>
          i === state.currentPlayerIndex
            ? { ...p, position: JAIL_POSITION, inJail: true, jailTurns: 0, doublesCount: 0 }
            : p,
        );
        const jailed3State = addLog(
          {
            ...state,
            players: jailedPlayers,
            diceValues: [d1, d2],
            isDoubles: false,
            pendingAction: null,
          },
          player.id,
          `${player.name} tung xúc xắc ba đôi liên tiếp – vào tù! Lượt chơi kết thúc.`,
        );
        const nextIdx3 = nextActivePlayerIndex(state.currentPlayerIndex, jailed3State.players);
        return {
          ...jailed3State,
          currentPlayerIndex: nextIdx3,
          phase: 'player_turn_start',
          diceValues: null,
          turnCount: jailed3State.turnCount + 1,
        };
      }

      // Calculate new position, detect GO crossing
      const oldPos = player.position;
      const newPos = (oldPos + diceSum) % BOARD_SIZE;
      const passedGo = newPos < oldPos; // only true when wrapping past position 0
      const goBonus = passedGo ? GO_BONUS : 0;

      // Apply movement
      let newState: GameState = {
        ...state,
        diceValues: [d1, d2],
        isDoubles,
        phase: 'moving_token',
        pendingAction: null,
        players: state.players.map((p, i) =>
          i === state.currentPlayerIndex
            ? { ...p, position: newPos, money: p.money + goBonus, doublesCount: newDoublesCount }
            : p,
        ),
      };

      if (passedGo) {
        newState = addLog(
          newState,
          player.id,
          `${player.name} đi qua XUẤT PHÁT, thu ${GO_BONUS} triệu.`,
        );
      }

      const landedSquare = newState.squares[newPos];

      // ── Go to Jail ──────────────────────────────────────────────────────────
      if (landedSquare.type === 'go_to_jail') {
        const jailedPlayers2 = newState.players.map((p, i) =>
          i === state.currentPlayerIndex
            ? { ...p, position: JAIL_POSITION, inJail: true, jailTurns: 0, doublesCount: 0 }
            : p,
        );
        const jailed2State = addLog(
          { ...newState, pendingAction: null, isDoubles: false, players: jailedPlayers2 },
          player.id,
          `${player.name} vào tù! Lượt chơi kết thúc.`,
        );
        const nextIdx2 = nextActivePlayerIndex(state.currentPlayerIndex, jailed2State.players);
        return {
          ...jailed2State,
          currentPlayerIndex: nextIdx2,
          phase: 'player_turn_start',
          diceValues: null,
          turnCount: jailed2State.turnCount + 1,
        };
      }

      // ── Card square ─────────────────────────────────────────────────────────
      if (landedSquare.type === 'chance' || landedSquare.type === 'community_chest') {
        return drawCard(landedSquare.type, { ...newState, phase: 'landing' });
      }

      // ── Free Parking – collect the pot ──────────────────────────────────────
      if (landedSquare.type === 'free_parking' && newState.freeParkingPot > 0) {
        const pot = newState.freeParkingPot;
        newState = addLog(
          {
            ...newState,
            freeParkingPot: 0,
            players: newState.players.map((p, i) =>
              i === state.currentPlayerIndex ? { ...p, money: p.money + pot } : p,
            ),
          },
          player.id,
          `${player.name} đỗ xe miễn phí, nhận ${pot} triệu!`,
        );
      }

      // ── Standard landing ────────────────────────────────────────────────────
      const updatedPlayer = newState.players[state.currentPlayerIndex];
      const pending = buildPendingAction(newPos, updatedPlayer, newState, diceSum);

      let phase: GameState['phase'] = 'landing';
      if (pending?.type === 'buy_or_auction') phase = 'buying_property';
      else if (pending?.type === 'pay_rent') phase = 'paying_rent';
      else if (pending?.type === 'pay_tax') phase = 'paying_rent';
      // else: stay 'landing' — player must click End Turn (or AI dispatches END_TURN)

      return addLog(
        { ...newState, phase, pendingAction: pending },
        player.id,
        `${player.name} dừng tại ${landedSquare.name}.`,
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // BUY_PROPERTY
    // ─────────────────────────────────────────────────────────────────────────
    case 'BUY_PROPERTY': {
      const pending = state.pendingAction;
      if (pending?.type !== 'buy_or_auction') return state;

      const { squareIndex } = pending;
      const square = state.squares[squareIndex];
      const price = square.price ?? 0;

      if (player.money < price) return state;

      const newPlayers = state.players.map((p, i) =>
        i === state.currentPlayerIndex
          ? { ...p, money: p.money - price, ownedSquares: [...p.ownedSquares, squareIndex] }
          : p,
      );
      const newSquares = state.squares.map((s) =>
        s.index === squareIndex ? { ...s, ownerId: player.id } : s,
      );

      return addLog(
        {
          ...state,
          players: newPlayers,
          squares: newSquares,
          pendingAction: null,
          phase: 'landing',
        },
        player.id,
        `${player.name} mua ${square.name} với giá ${price} triệu.`,
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DECLINE_PROPERTY  — player passes; property stays with the bank
    // ─────────────────────────────────────────────────────────────────────────
    case 'DECLINE_PROPERTY': {
      const pending = state.pendingAction;
      if (pending?.type !== 'buy_or_auction') return state;

      const square = state.squares[pending.squareIndex];
      return addLog(
        { ...state, pendingAction: null, phase: 'landing' },
        player.id,
        `${player.name} bỏ qua ${square.name}.`,
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PAY_RENT
    // ─────────────────────────────────────────────────────────────────────────
    case 'PAY_RENT': {
      const pending = state.pendingAction;
      if (!pending) return state;

      // ── pay_rent ──────────────────────────────────────────────────────────
      if (pending.type === 'pay_rent') {
        const { amount, toPlayerId, squareIndex } = pending;
        const landlord = state.players.find((p) => p.id === toPlayerId);

        if (player.money >= amount) {
          const newPlayers = state.players.map((p) => {
            if (p.id === player.id) return { ...p, money: p.money - amount };
            if (p.id === toPlayerId) return { ...p, money: p.money + amount };
            return p;
          });
          return addLog(
            { ...state, players: newPlayers, pendingAction: null, phase: 'landing' },
            player.id,
            `${player.name} trả ${amount} triệu tiền thuê tại ô ${squareIndex} cho ${landlord?.name ?? toPlayerId}.`,
          );
        }

        // Can't pay – go bankrupt to landlord
        return transferAssetsAndBankrupt(player, toPlayerId, {
          ...state,
          pendingAction: null,
          phase: 'bankruptcy_resolution',
        });
      }

      // ── pay_tax ───────────────────────────────────────────────────────────
      if (pending.type === 'pay_tax') {
        const { amount: taxAmount } = pending;

        if (player.money >= taxAmount) {
          const newPlayers = state.players.map((p) =>
            p.id === player.id ? { ...p, money: p.money - taxAmount } : p,
          );
          return addLog(
            {
              ...state,
              players: newPlayers,
              pendingAction: null,
              phase: 'landing',
              freeParkingPot: state.freeParkingPot + taxAmount,
            },
            player.id,
            `${player.name} nộp thuế ${taxAmount} triệu.`,
          );
        }

        // Can't pay tax – go bankrupt to bank
        return transferAssetsAndBankrupt(player, null, {
          ...state,
          pendingAction: null,
          phase: 'bankruptcy_resolution',
        });
      }

      return state;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // APPLY_CARD
    // ─────────────────────────────────────────────────────────────────────────
    case 'APPLY_CARD': {
      const pending = state.pendingAction;
      if (pending?.type !== 'card_drawn') return state;

      const { card } = pending;
      let newState = applyCard(card, { ...state, pendingAction: null });

      const updatedPlayer = newState.players[state.currentPlayerIndex];
      const diceSum = newState.diceValues
        ? newState.diceValues[0] + newState.diceValues[1]
        : 0;

      // Skip follow-up landing logic when player is in jail or bankrupt
      if (updatedPlayer.inJail || updatedPlayer.isBankrupt) {
        return newState;
      }

      const landedSquare = newState.squares[updatedPlayer.position];

      // Chain into another card draw if landed on a card square
      if (
        landedSquare.type === 'chance' ||
        landedSquare.type === 'community_chest'
      ) {
        return drawCard(landedSquare.type, newState);
      }

      // Free parking pot collection after a card movement
      if (landedSquare.type === 'free_parking' && newState.freeParkingPot > 0) {
        const pot = newState.freeParkingPot;
        newState = addLog(
          {
            ...newState,
            freeParkingPot: 0,
            players: newState.players.map((p, i) =>
              i === state.currentPlayerIndex ? { ...p, money: p.money + pot } : p,
            ),
          },
          updatedPlayer.id,
          `${updatedPlayer.name} đỗ xe miễn phí, nhận ${pot} triệu!`,
        );
      }

      const newPending = buildPendingAction(
        updatedPlayer.position,
        updatedPlayer,
        newState,
        diceSum,
      );

      let phase: GameState['phase'] = 'landing';
      if (newPending?.type === 'buy_or_auction') phase = 'buying_property';
      else if (newPending?.type === 'pay_rent') phase = 'paying_rent';
      else if (newPending?.type === 'pay_tax') phase = 'paying_rent';

      return { ...newState, pendingAction: newPending, phase };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // BUILD_HOUSE
    // ─────────────────────────────────────────────────────────────────────────
    case 'BUILD_HOUSE': {
      const squareIndex = event.payload?.squareIndex as number | undefined;
      if (squareIndex === undefined) return state;

      const result = buildHouseEngine(squareIndex, player.id, state);
      if (!result.success || !result.newState) return state;
      return result.newState; // log already added by buildHouseEngine
    }

    // ─────────────────────────────────────────────────────────────────────────
    // BUILD_HOTEL
    // ─────────────────────────────────────────────────────────────────────────
    case 'BUILD_HOTEL': {
      const squareIndex = event.payload?.squareIndex as number | undefined;
      if (squareIndex === undefined) return state;

      const result = buildHotelEngine(squareIndex, player.id, state);
      if (!result.success || !result.newState) return state;
      return result.newState;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SELL_HOUSE
    // ─────────────────────────────────────────────────────────────────────────
    case 'SELL_HOUSE': {
      const squareIndex = event.payload?.squareIndex as number | undefined;
      if (squareIndex === undefined) return state;

      const result = sellHouseEngine(squareIndex, player.id, state);
      if (!result.success || !result.newState) return state;
      return result.newState;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SELL_HOTEL
    // ─────────────────────────────────────────────────────────────────────────
    case 'SELL_HOTEL': {
      const squareIndex = event.payload?.squareIndex as number | undefined;
      if (squareIndex === undefined) return state;

      const result = sellHotelEngine(squareIndex, player.id, state);
      if (!result.success || !result.newState) return state;
      return result.newState;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MORTGAGE_PROPERTY
    // ─────────────────────────────────────────────────────────────────────────
    case 'MORTGAGE_PROPERTY': {
      const squareIndex = event.payload?.squareIndex as number | undefined;
      if (squareIndex === undefined) return state;

      const sq = state.squares[squareIndex];
      if (sq.ownerId !== player.id || sq.isMortgaged) return state;
      if (
        sq.type !== 'property' &&
        sq.type !== 'railroad' &&
        sq.type !== 'utility'
      ) return state;

      const mortgageValue = sq.mortgageValue ?? 0;

      return addLog(
        {
          ...state,
          squares: state.squares.map((s) =>
            s.index === squareIndex ? { ...s, isMortgaged: true } : s,
          ),
          players: state.players.map((p) =>
            p.id === player.id ? { ...p, money: p.money + mortgageValue } : p,
          ),
        },
        player.id,
        `${player.name} thế chấp ${sq.name}, thu ${mortgageValue} triệu.`,
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UNMORTGAGE_PROPERTY
    // ─────────────────────────────────────────────────────────────────────────
    case 'UNMORTGAGE_PROPERTY': {
      const squareIndex = event.payload?.squareIndex as number | undefined;
      if (squareIndex === undefined) return state;

      const sq = state.squares[squareIndex];
      if (sq.ownerId !== player.id || !sq.isMortgaged) return state;

      const unmortgageCost = Math.ceil((sq.mortgageValue ?? 0) * 1.1);
      if (player.money < unmortgageCost) return state;

      return addLog(
        {
          ...state,
          squares: state.squares.map((s) =>
            s.index === squareIndex ? { ...s, isMortgaged: false } : s,
          ),
          players: state.players.map((p) =>
            p.id === player.id ? { ...p, money: p.money - unmortgageCost } : p,
          ),
        },
        player.id,
        `${player.name} chuộc lại ${sq.name}, trả ${unmortgageCost} triệu.`,
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PAY_JAIL_BAIL
    // ─────────────────────────────────────────────────────────────────────────
    case 'PAY_JAIL_BAIL': {
      if (!player.inJail || player.money < JAIL_BAIL) return state;

      return addLog(
        {
          ...state,
          phase: 'player_turn_start',
          players: state.players.map((p, i) =>
            i === state.currentPlayerIndex
              ? { ...p, money: p.money - JAIL_BAIL, inJail: false, jailTurns: 0 }
              : p,
          ),
        },
        player.id,
        `${player.name} nộp phạt ${JAIL_BAIL} triệu để ra tù.`,
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // USE_JAIL_FREE_CARD
    // ─────────────────────────────────────────────────────────────────────────
    case 'USE_JAIL_FREE_CARD': {
      if (!player.inJail || player.jailFreeCards < 1) return state;

      return addLog(
        {
          ...state,
          phase: 'player_turn_start',
          players: state.players.map((p, i) =>
            i === state.currentPlayerIndex
              ? { ...p, inJail: false, jailTurns: 0, jailFreeCards: p.jailFreeCards - 1 }
              : p,
          ),
        },
        player.id,
        `${player.name} dùng thẻ thoát tù miễn phí.`,
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ROLL_FOR_JAIL
    // ─────────────────────────────────────────────────────────────────────────
    case 'ROLL_FOR_JAIL': {
      if (!player.inJail) return state;

      const d1 = rollDie(event.payload?.d1 as number | undefined);
      const d2 = rollDie(event.payload?.d2 as number | undefined);
      const isDoubles = d1 === d2;
      const diceSum = d1 + d2;

      const rolledState: GameState = { ...state, diceValues: [d1, d2], isDoubles };

      // ── Rolled doubles: get out of jail ────────────────────────────────────
      if (isDoubles) {
        const newPos = (JAIL_POSITION + diceSum) % BOARD_SIZE;
        const releasedPlayers = rolledState.players.map((p, i) =>
          i === state.currentPlayerIndex
            ? { ...p, inJail: false, jailTurns: 0, position: newPos, doublesCount: 0 }
            : p,
        );

        let freedState: GameState = addLog(
          // isDoubles = false: rolling doubles to exit jail does NOT grant an extra turn
          { ...rolledState, players: releasedPlayers, phase: 'moving_token', isDoubles: false },
          player.id,
          `${player.name} tung đôi và ra tù, tiến đến ô ${newPos}.`,
        );

        const landedSquare = freedState.squares[newPos];

        // Go to jail (extremely rare, but handle it)
        if (landedSquare.type === 'go_to_jail') {
          return addLog(
            {
              ...freedState,
              phase: 'in_jail',
              pendingAction: null,
              players: freedState.players.map((p, i) =>
                i === state.currentPlayerIndex
                  ? { ...p, position: JAIL_POSITION, inJail: true, jailTurns: 0 }
                  : p,
              ),
            },
            player.id,
            `${player.name} vào tù ngay!`,
          );
        }

        // Card square
        if (
          landedSquare.type === 'chance' ||
          landedSquare.type === 'community_chest'
        ) {
          return drawCard(landedSquare.type, { ...freedState, phase: 'landing' });
        }

        // Free parking
        if (landedSquare.type === 'free_parking' && freedState.freeParkingPot > 0) {
          const pot = freedState.freeParkingPot;
          freedState = addLog(
            {
              ...freedState,
              freeParkingPot: 0,
              players: freedState.players.map((p, i) =>
                i === state.currentPlayerIndex ? { ...p, money: p.money + pot } : p,
              ),
            },
            player.id,
            `${player.name} đỗ xe miễn phí, nhận ${pot} triệu!`,
          );
        }

        const updatedPlayer = freedState.players[state.currentPlayerIndex];
        const pending = buildPendingAction(newPos, updatedPlayer, freedState, diceSum);

        let phase: GameState['phase'] = 'landing';
        if (pending?.type === 'buy_or_auction') phase = 'buying_property';
        else if (pending?.type === 'pay_rent') phase = 'paying_rent';
        else if (pending?.type === 'pay_tax') phase = 'paying_rent';

        return { ...freedState, pendingAction: pending, phase };
      }

      // ── Did not roll doubles ───────────────────────────────────────────────
      const newJailTurns = player.jailTurns + 1;

      if (newJailTurns >= 3) {
        // Third failed attempt – must pay bail automatically
        const autoBailMoney = Math.max(0, player.money - JAIL_BAIL);
        return addLog(
          {
            ...rolledState,
            phase: 'player_turn_start',
            players: rolledState.players.map((p, i) =>
              i === state.currentPlayerIndex
                ? { ...p, jailTurns: 0, inJail: false, money: autoBailMoney }
                : p,
            ),
          },
          player.id,
          `${player.name} tự động nộp phạt ${JAIL_BAIL} triệu để ra tù sau 3 lượt.`,
        );
      }

      // Player stayed in jail – end this turn and give control to next player
      const stayJailState = addLog(
        {
          ...rolledState,
          isDoubles: false,
          players: rolledState.players.map((p, i) =>
            i === state.currentPlayerIndex ? { ...p, jailTurns: newJailTurns } : p,
          ),
        },
        player.id,
        `${player.name} không tung đôi, ở lại tù (lượt ${newJailTurns}/3).`,
      );
      const nextJailIdx = nextActivePlayerIndex(state.currentPlayerIndex, stayJailState.players);
      return {
        ...stayJailState,
        currentPlayerIndex: nextJailIdx,
        phase: 'player_turn_start',
        diceValues: null,
        turnCount: stayJailState.turnCount + 1,
      };
    }
    // ─────────────────────────────────────────────────────────────────────────
    case 'DECLARE_BANKRUPTCY': {
      const creditorId = (event.payload?.creditorId as string | undefined) ?? null;
      return transferAssetsAndBankrupt(player, creditorId, state);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // END_TURN
    // ─────────────────────────────────────────────────────────────────────────
    case 'END_TURN': {
      // Rolled doubles on the previous roll → same player goes again
      if (state.isDoubles && !player.inJail) {
        return {
          ...state,
          phase: 'player_turn_start',
          pendingAction: null,
          diceValues: null,
          isDoubles: false,
        };
      }

      // Check for winner
      const activePlayers = state.players.filter((p) => !p.isBankrupt);
      if (activePlayers.length <= 1) {
        const winnerId = activePlayers[0]?.id ?? null;
        const winnerName = state.players.find((p) => p.id === winnerId)?.name ?? '';
        return addLog(
          { ...state, phase: 'game_over', winner: winnerId, pendingAction: null },
          winnerId ?? '',
          `Trò chơi kết thúc! ${winnerName} là người chiến thắng!`,
        );
      }

      const nextIdx = nextActivePlayerIndex(state.currentPlayerIndex, state.players);

      return addLog(
        {
          ...state,
          currentPlayerIndex: nextIdx,
          phase: 'player_turn_start',
          pendingAction: null,
          diceValues: null,
          isDoubles: false,
          turnCount: state.turnCount + 1,
          // Reset the outgoing player's doubles streak
          players: state.players.map((p, i) =>
            i === state.currentPlayerIndex ? { ...p, doublesCount: 0 } : p,
          ),
        },
        state.players[nextIdx].id,
        `Đến lượt của ${state.players[nextIdx].name}.`,
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Exhaustiveness guard
    // ─────────────────────────────────────────────────────────────────────────
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Initial state factory
// ---------------------------------------------------------------------------

/**
 * Create the starting GameState for a new game.
 *
 * @param playerNames  Names of human players (first element is primary human).
 * @param aiStrategies One strategy per AI opponent (determines count too).
 * @param tokenColors  Optional override colors — index 0 = human, rest = AIs.
 *                     Falls back to PLAYER_COLORS when not provided.
 */
export function createInitialState(
  playerNames: string[],
  aiStrategies: AIStrategy[],
  tokenColors?: string[],
): GameState {
  const players: Player[] = [];
  let colorIndex = 0;

  function pickColor(idx: number): string {
    return tokenColors?.[idx] ?? PLAYER_COLORS[colorIndex % PLAYER_COLORS.length];
  }

  // Human players (index 0 = primary human, all are isAI: false)
  for (let i = 0; i < playerNames.length; i++) {
    players.push({
      id: i === 0 ? 'player_0' : `player_${i}`,
      name: playerNames[i],
      isAI: false,
      aiStrategy: 'balanced',
      money: STARTING_MONEY,
      position: GO_POSITION,
      inJail: false,
      jailTurns: 0,
      jailFreeCards: 0,
      isBankrupt: false,
      doublesCount: 0,
      tokenColor: pickColor(colorIndex),
      ownedSquares: [],
    });
    colorIndex++;
  }

  // AI players
  for (let i = 0; i < aiStrategies.length; i++) {
    players.push({
      id: `ai_${i}`,
      name: `AI ${i + 1}`,
      isAI: true,
      aiStrategy: aiStrategies[i],
      money: STARTING_MONEY,
      position: GO_POSITION,
      inJail: false,
      jailTurns: 0,
      jailFreeCards: 0,
      isBankrupt: false,
      doublesCount: 0,
      tokenColor: pickColor(colorIndex),
      ownedSquares: [],
    });
    colorIndex++;
  }

  return {
    phase: 'player_turn_start',
    players,
    squares: createInitialSquares(),
    currentPlayerIndex: 0,
    diceValues: null,
    isDoubles: false,
    chanceDeck: shuffleCards(CHANCE_CARDS),
    communityChestDeck: shuffleCards(COMMUNITY_CHEST_CARDS),
    lastDrawnCard: null,
    bankHouses: BANK_HOUSES,
    bankHotels: BANK_HOTELS,
    freeParkingPot: 0,
    turnCount: 1,
    log: [],
    winner: null,
    pendingAction: null,
  };
}
