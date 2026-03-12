import type { Card, CardType } from '../types/index';

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

/**
 * Fisher-Yates shuffle — returns a new shuffled array without mutating the
 * original deck.
 */
export function shuffleCards(cards: Card[]): Card[] {
  const deck = [...cards];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

// ---------------------------------------------------------------------------
// Chance deck — 16 cards (Cơ Hội)
// ---------------------------------------------------------------------------

const TYPE: CardType = 'chance';

export const CHANCE_CARDS: Card[] = [
  // 1. Advance to GO — collect 200 triệu
  {
    id: 'chance_01',
    type: TYPE,
    description: 'Tiến về XUẤT PHÁT. Thu 200 triệu.',
    effect: { type: 'advance_to_go' },
  },

  // 2. Move to Vịnh Hạ Long (position 39)
  {
    id: 'chance_02',
    type: TYPE,
    description: 'Đi tới Vịnh Hạ Long. Nếu đi qua XUẤT PHÁT, thu 200 triệu.',
    effect: { type: 'move_to', position: 39 },
  },

  // 3. Move to Ga Sài Gòn (position 5)
  {
    id: 'chance_03',
    type: TYPE,
    description: 'Đi tới Ga Sài Gòn. Nếu đi qua XUẤT PHÁT, thu 200 triệu.',
    effect: { type: 'move_to', position: 5 },
  },

  // 4. Move to Ga Đà Nẵng (position 15)
  {
    id: 'chance_04',
    type: TYPE,
    description: 'Đi tới Ga Đà Nẵng. Nếu đi qua XUẤT PHÁT, thu 200 triệu.',
    effect: { type: 'move_to', position: 15 },
  },

  // 5. Move to nearest railroad
  {
    id: 'chance_05',
    type: TYPE,
    description: 'Tiến đến ga tàu gần nhất. Nếu chưa có chủ, bạn có thể mua. Nếu có chủ, trả gấp đôi tiền thuê.',
    effect: { type: 'move_to_nearest', squareType: 'railroad' },
  },

  // 6. Move to nearest utility
  {
    id: 'chance_06',
    type: TYPE,
    description: 'Tiến đến cơ sở tiện ích gần nhất. Nếu chưa có chủ, bạn có thể mua. Nếu có chủ, trả gấp đôi tiền thuê.',
    effect: { type: 'move_to_nearest', squareType: 'utility' },
  },

  // 7. Bank pays dividend 50 triệu
  {
    id: 'chance_07',
    type: TYPE,
    description: 'Ngân hàng trả cổ tức cho bạn. Thu 50 triệu.',
    effect: { type: 'collect_money', amount: 50 },
  },

  // 8. Get out of jail free
  {
    id: 'chance_08',
    type: TYPE,
    description: 'Phiếu ra tù miễn phí. Giữ lại cho đến khi cần dùng.',
    effect: { type: 'get_out_of_jail_free' },
  },

  // 9. Go back 3 spaces
  {
    id: 'chance_09',
    type: TYPE,
    description: 'Lùi 3 ô.',
    effect: { type: 'move_forward', spaces: -3 },
  },

  // 10. Go to Jail
  {
    id: 'chance_10',
    type: TYPE,
    description: 'Vào tù ngay! Không đi qua XUẤT PHÁT, không thu 200 triệu.',
    effect: { type: 'go_to_jail' },
  },

  // 11. General repairs — 25 triệu/house, 100 triệu/hotel
  {
    id: 'chance_11',
    type: TYPE,
    description: 'Sửa chữa tổng quát bất động sản của bạn. Trả 25 triệu mỗi nhà và 100 triệu mỗi khách sạn.',
    effect: { type: 'pay_per_house_hotel', perHouse: 25, perHotel: 100 },
  },

  // 12. Pay speeding fine 15 triệu
  {
    id: 'chance_12',
    type: TYPE,
    description: 'Nộp phạt vi phạm giao thông 15 triệu.',
    effect: { type: 'pay_money', amount: 15 },
  },

  // 13. Move to Ga Nha Trang (position 25)
  {
    id: 'chance_13',
    type: TYPE,
    description: 'Đi tới Ga Nha Trang. Nếu đi qua XUẤT PHÁT, thu 200 triệu.',
    effect: { type: 'move_to', position: 25 },
  },

  // 14. Win election — collect 50 triệu from each player
  {
    id: 'chance_14',
    type: TYPE,
    description: 'Bạn đắc cử vào Hội đồng. Thu 50 triệu từ mỗi người chơi.',
    effect: { type: 'collect_from_players', amount: 50 },
  },

  // 15. Bank error in your favour — collect 150 triệu
  {
    id: 'chance_15',
    type: TYPE,
    description: 'Lỗi ngân hàng có lợi cho bạn. Thu 150 triệu.',
    effect: { type: 'collect_money', amount: 150 },
  },

  // 16. Pay hospital fee 100 triệu
  {
    id: 'chance_16',
    type: TYPE,
    description: 'Phí viện phí. Trả 100 triệu.',
    effect: { type: 'pay_money', amount: 100 },
  },
];
