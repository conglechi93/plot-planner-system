import type { GameState, Card, PendingAction } from '../types/index';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BOARD_SIZE = 40;
const GO_POSITION = 0;
const GO_BONUS = 200;
const JAIL_POSITION = 10;

/** All railroad positions on the board. */
const RAILROAD_POSITIONS: readonly number[] = [5, 15, 25, 35];

/** All utility positions on the board. */
const UTILITY_POSITIONS: readonly number[] = [12, 28];

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Add a log entry to state (pure). */
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

/**
 * Scan forward from `fromPos` and return the position of the nearest square
 * whose board index is in `candidates`.
 */
function nearestForward(fromPos: number, candidates: readonly number[]): number {
  for (let step = 1; step < BOARD_SIZE; step++) {
    const pos = (fromPos + step) % BOARD_SIZE;
    if (candidates.includes(pos)) return pos;
  }
  return candidates[0]; // fallback (should never reach)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Apply `card`'s effect to the current player in `state`.
 *
 * This is a pure function — it never mutates `state`.
 * After movement effects the phase is set to `'landing'` so the game
 * reducer can evaluate what happens on the new square.
 */
export function applyCard(card: Card, state: GameState): GameState {
  const playerIndex = state.currentPlayerIndex;
  const player = state.players[playerIndex];
  const effect = card.effect;

  // Base log entry describing what card was drawn
  const baseLog = addLog(state, player.id, `${player.name} rút thẻ: ${card.description}`);

  switch (effect.type) {
    // ── Collect money from the bank ──────────────────────────────────────────
    case 'collect_money': {
      const { amount } = effect;
      return addLog(
        {
          ...baseLog,
          players: baseLog.players.map((p, i) =>
            i === playerIndex ? { ...p, money: p.money + amount } : p,
          ),
          phase: 'player_turn_start',
        },
        player.id,
        `${player.name} nhận ${amount} triệu từ ngân hàng.`,
      );
    }

    // ── Pay money to the bank ────────────────────────────────────────────────
    case 'pay_money': {
      const { amount } = effect;
      const newMoney = player.money - amount;

      if (newMoney < 0) {
        // Player cannot afford – flag for bankruptcy resolution
        return addLog(
          {
            ...baseLog,
            players: baseLog.players.map((p, i) =>
              i === playerIndex ? { ...p, money: newMoney } : p,
            ),
            phase: 'bankruptcy_resolution',
            pendingAction: { type: 'pay_tax', amount } as PendingAction,
          },
          player.id,
          `${player.name} phải trả ${amount} triệu nhưng không đủ tiền!`,
        );
      }

      return addLog(
        {
          ...baseLog,
          players: baseLog.players.map((p, i) =>
            i === playerIndex ? { ...p, money: newMoney } : p,
          ),
          phase: 'player_turn_start',
        },
        player.id,
        `${player.name} trả ${amount} triệu cho ngân hàng.`,
      );
    }

    // ── Move to an absolute board position ───────────────────────────────────
    case 'move_to': {
      const target = ((effect.position % BOARD_SIZE) + BOARD_SIZE) % BOARD_SIZE;
      // Collect GO if the destination is behind the current position
      const passedGo = target < player.position;
      const bonus = passedGo ? GO_BONUS : 0;

      let newState: GameState = {
        ...baseLog,
        players: baseLog.players.map((p, i) =>
          i === playerIndex
            ? { ...p, position: target, money: p.money + bonus }
            : p,
        ),
        phase: 'landing',
      };

      if (passedGo) {
        newState = addLog(
          newState,
          player.id,
          `${player.name} đi qua XUẤT PHÁT, thu ${GO_BONUS} triệu.`,
        );
      }

      return newState;
    }

    // ── Move forward (or backward) N spaces ─────────────────────────────────
    case 'move_forward': {
      const { spaces } = effect;
      const newPos =
        ((player.position + spaces) % BOARD_SIZE + BOARD_SIZE) % BOARD_SIZE;

      // Collect GO only when moving forward and wrapping around
      const passedGo = spaces > 0 && newPos < player.position;
      const bonus = passedGo ? GO_BONUS : 0;

      let newState: GameState = {
        ...baseLog,
        players: baseLog.players.map((p, i) =>
          i === playerIndex
            ? { ...p, position: newPos, money: p.money + bonus }
            : p,
        ),
        phase: 'landing',
      };

      if (passedGo) {
        newState = addLog(
          newState,
          player.id,
          `${player.name} đi qua XUẤT PHÁT, thu ${GO_BONUS} triệu.`,
        );
      }

      const direction = spaces >= 0 ? `tiến ${spaces}` : `lùi ${Math.abs(spaces)}`;
      return addLog(
        newState,
        player.id,
        `${player.name} ${direction} ô, dừng tại ô ${newPos}.`,
      );
    }

    // ── Move to nearest railroad or utility ──────────────────────────────────
    case 'move_to_nearest': {
      const candidates =
        effect.squareType === 'railroad' ? RAILROAD_POSITIONS : UTILITY_POSITIONS;
      const target = nearestForward(player.position, candidates);

      const passedGo = target < player.position;
      const bonus = passedGo ? GO_BONUS : 0;

      const typeName = effect.squareType === 'railroad' ? 'ga tàu' : 'tiện ích';
      const targetSquare = baseLog.squares[target];

      let newState: GameState = {
        ...baseLog,
        players: baseLog.players.map((p, i) =>
          i === playerIndex
            ? { ...p, position: target, money: p.money + bonus }
            : p,
        ),
        phase: 'landing',
      };

      if (passedGo) {
        newState = addLog(
          newState,
          player.id,
          `${player.name} đi qua XUẤT PHÁT, thu ${GO_BONUS} triệu.`,
        );
      }

      return addLog(
        newState,
        player.id,
        `${player.name} tiến đến ${typeName} gần nhất: ${targetSquare?.name ?? target}.`,
      );
    }

    // ── Go directly to jail ──────────────────────────────────────────────────
    case 'go_to_jail': {
      return addLog(
        {
          ...baseLog,
          players: baseLog.players.map((p, i) =>
            i === playerIndex
              ? { ...p, position: JAIL_POSITION, inJail: true, jailTurns: 0 }
              : p,
          ),
          phase: 'in_jail',
          pendingAction: null,
        },
        player.id,
        `${player.name} vào tù ngay!`,
      );
    }

    // ── Receive a Get Out of Jail Free card ──────────────────────────────────
    case 'get_out_of_jail_free': {
      return addLog(
        {
          ...baseLog,
          players: baseLog.players.map((p, i) =>
            i === playerIndex
              ? { ...p, jailFreeCards: p.jailFreeCards + 1 }
              : p,
          ),
          phase: 'player_turn_start',
        },
        player.id,
        `${player.name} nhận được phiếu thoát tù miễn phí.`,
      );
    }

    // ── Collect `amount` from every other active player ──────────────────────
    case 'collect_from_players': {
      const { amount } = effect;
      // Each payer contributes min(their money, amount)
      let totalCollected = 0;
      const newPlayers = baseLog.players.map((p, i) => {
        if (i === playerIndex) return p; // handle collector below
        if (p.isBankrupt) return p;
        const paid = Math.min(p.money, amount);
        totalCollected += paid;
        return { ...p, money: p.money - paid };
      });

      const updatedPlayers = newPlayers.map((p, i) =>
        i === playerIndex ? { ...p, money: p.money + totalCollected } : p,
      );

      return addLog(
        {
          ...baseLog,
          players: updatedPlayers,
          phase: 'player_turn_start',
        },
        player.id,
        `${player.name} thu ${amount} triệu từ mỗi người chơi (tổng ${totalCollected} triệu).`,
      );
    }

    // ── Pay per house / hotel across all owned properties ────────────────────
    case 'pay_per_house_hotel': {
      const { perHouse, perHotel } = effect;

      let totalOwed = 0;
      for (const idx of player.ownedSquares) {
        const sq = baseLog.squares[idx];
        if (!sq) continue;
        if (sq.houses === 5) {
          totalOwed += perHotel;
        } else {
          totalOwed += sq.houses * perHouse;
        }
      }

      const newMoney = player.money - totalOwed;

      if (newMoney < 0) {
        return addLog(
          {
            ...baseLog,
            players: baseLog.players.map((p, i) =>
              i === playerIndex ? { ...p, money: newMoney } : p,
            ),
            phase: 'bankruptcy_resolution',
            pendingAction: { type: 'pay_tax', amount: totalOwed } as PendingAction,
          },
          player.id,
          `${player.name} phải trả ${totalOwed} triệu phí sửa chữa nhưng không đủ tiền!`,
        );
      }

      return addLog(
        {
          ...baseLog,
          players: baseLog.players.map((p, i) =>
            i === playerIndex ? { ...p, money: newMoney } : p,
          ),
          phase: 'player_turn_start',
        },
        player.id,
        `${player.name} trả ${totalOwed} triệu phí sửa chữa bất động sản.`,
      );
    }

    // ── Advance to GO ────────────────────────────────────────────────────────
    case 'advance_to_go': {
      return addLog(
        {
          ...baseLog,
          players: baseLog.players.map((p, i) =>
            i === playerIndex
              ? { ...p, position: GO_POSITION, money: p.money + GO_BONUS }
              : p,
          ),
          phase: 'landing',
        },
        player.id,
        `${player.name} tiến về XUẤT PHÁT, thu ${GO_BONUS} triệu.`,
      );
    }

    default: {
      // TypeScript exhaustive check
      const _exhaustive: never = effect;
      return _exhaustive;
    }
  }
}
