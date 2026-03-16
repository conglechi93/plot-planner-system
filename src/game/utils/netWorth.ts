import type { Player, Square } from '../types/index';

/**
 * Tính net worth của một player:
 * = tiền mặt
 * + giá trị BĐS (50% nếu thế chấp)
 * + giá trị nhà/KS đã xây (tính theo 50% chi phí xây)
 */
export function calcNetWorth(player: Player, squares: Square[]): number {
  let worth = player.money;
  for (const idx of player.ownedSquares) {
    const sq = squares[idx];
    if (!sq) continue;
    const landValue  = (sq.price ?? 0) * (sq.isMortgaged ? 0.5 : 1);
    const buildValue = sq.houses > 0 && sq.houses < 5
      ? sq.houses * (sq.houseCost ?? 0) * 0.5
      : sq.houses === 5
        ? (sq.houseCost ?? 0) * 0.5
        : 0;
    worth += landValue + buildValue;
  }
  return Math.round(worth);
}
