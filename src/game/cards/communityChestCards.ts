import type { Card, CardType } from '../types/index';

// ---------------------------------------------------------------------------
// Community Chest deck — 16 cards (Công Quỹ Cộng Đồng)
// ---------------------------------------------------------------------------

const TYPE: CardType = 'community_chest';

export const COMMUNITY_CHEST_CARDS: Card[] = [
  // 1. Advance to GO — collect 200 triệu
  {
    id: 'cc_01',
    type: TYPE,
    description: 'Tiến về XUẤT PHÁT. Thu 200 triệu.',
    effect: { type: 'advance_to_go' },
  },

  // 2. Bank error in your favour — collect 200 triệu
  {
    id: 'cc_02',
    type: TYPE,
    description: 'Lỗi ngân hàng có lợi cho bạn. Thu 200 triệu.',
    effect: { type: 'collect_money', amount: 200 },
  },

  // 3. Doctor's fee — pay 50 triệu
  {
    id: 'cc_03',
    type: TYPE,
    description: 'Phí khám bác sĩ. Trả 50 triệu.',
    effect: { type: 'pay_money', amount: 50 },
  },

  // 4. From sale of shares — collect 50 triệu
  {
    id: 'cc_04',
    type: TYPE,
    description: 'Thu nhập từ bán cổ phiếu. Thu 50 triệu.',
    effect: { type: 'collect_money', amount: 50 },
  },

  // 5. Get out of jail free
  {
    id: 'cc_05',
    type: TYPE,
    description: 'Phiếu ra tù miễn phí. Giữ lại cho đến khi cần dùng.',
    effect: { type: 'get_out_of_jail_free' },
  },

  // 6. Go to jail
  {
    id: 'cc_06',
    type: TYPE,
    description: 'Vào tù ngay! Không đi qua XUẤT PHÁT, không thu 200 triệu.',
    effect: { type: 'go_to_jail' },
  },

  // 7. Tax refund — collect 20 triệu
  {
    id: 'cc_07',
    type: TYPE,
    description: 'Hoàn thuế thu nhập. Thu 20 triệu.',
    effect: { type: 'collect_money', amount: 20 },
  },

  // 8. Birthday — collect 10 triệu from each player
  {
    id: 'cc_08',
    type: TYPE,
    description: 'Hôm nay là sinh nhật của bạn! Thu 10 triệu từ mỗi người chơi.',
    effect: { type: 'collect_from_players', amount: 10 },
  },

  // 9. Life insurance matures — collect 100 triệu
  {
    id: 'cc_09',
    type: TYPE,
    description: 'Bảo hiểm nhân thọ đáo hạn. Thu 100 triệu.',
    effect: { type: 'collect_money', amount: 100 },
  },

  // 10. Pay hospital fees — 100 triệu
  {
    id: 'cc_10',
    type: TYPE,
    description: 'Phí bệnh viện. Trả 100 triệu.',
    effect: { type: 'pay_money', amount: 100 },
  },

  // 11. Pay school fees — 50 triệu
  {
    id: 'cc_11',
    type: TYPE,
    description: 'Học phí trường học. Trả 50 triệu.',
    effect: { type: 'pay_money', amount: 50 },
  },

  // 12. Receive consultant fee — 25 triệu
  {
    id: 'cc_12',
    type: TYPE,
    description: 'Nhận phí tư vấn dịch vụ. Thu 25 triệu.',
    effect: { type: 'collect_money', amount: 25 },
  },

  // 13. Street repairs — 40 triệu/house, 115 triệu/hotel
  {
    id: 'cc_13',
    type: TYPE,
    description: 'Sửa chữa đường phố. Trả 40 triệu mỗi nhà và 115 triệu mỗi khách sạn.',
    effect: { type: 'pay_per_house_hotel', perHouse: 40, perHotel: 115 },
  },

  // 14. Win talent show — collect 10 triệu
  {
    id: 'cc_14',
    type: TYPE,
    description: 'Bạn đoạt giải cuộc thi tài năng. Thu 10 triệu.',
    effect: { type: 'collect_money', amount: 10 },
  },

  // 15. Win lottery — collect 100 triệu
  {
    id: 'cc_15',
    type: TYPE,
    description: 'Bạn trúng xổ số. Thu 100 triệu.',
    effect: { type: 'collect_money', amount: 100 },
  },

  // 16. Pay income tax — 100 triệu
  {
    id: 'cc_16',
    type: TYPE,
    description: 'Nộp thuế thu nhập. Trả 100 triệu.',
    effect: { type: 'pay_money', amount: 100 },
  },
];
