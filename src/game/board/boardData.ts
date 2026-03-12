import type { Square, PropertyGroup } from '../types/index';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Round a number to the nearest 5. */
function r5(n: number): number {
  return Math.round(n / 5) * 5;
}

/**
 * Build a purchasable property square.
 *
 * Rent formula (per spec):
 *   rentBase        = price × 0.10
 *   rentWith1House  = price × 0.30
 *   rentWith2Houses = price × 0.60
 *   rentWith3Houses = price × 1.20
 *   rentWith4Houses = price × 1.80
 *   rentWithHotel   = price × 2.50
 *   houseCost       = price × 0.50
 *   mortgageValue   = price × 0.50
 * All values rounded to nearest 5.
 */
function makeProp(
  index: number,
  name: string,
  group: PropertyGroup,
  price: number,
): Square {
  return {
    index,
    name,
    type: 'property',
    group,
    price,
    rentBase:        r5(price * 0.10),
    rentWith1House:  r5(price * 0.30),
    rentWith2Houses: r5(price * 0.60),
    rentWith3Houses: r5(price * 1.20),
    rentWith4Houses: r5(price * 1.80),
    rentWithHotel:   r5(price * 2.50),
    houseCost:       r5(price * 0.50),
    mortgageValue:   r5(price * 0.50),
    ownerId: null,
    houses: 0,
    isMortgaged: false,
  };
}

/** Non-purchasable special square (GO, Jail, Free Parking, Go-to-Jail, Chance, Community Chest). */
function makeSpecial(index: number, name: string, type: Square['type']): Square {
  return { index, name, type, ownerId: null, houses: 0, isMortgaged: false };
}

/**
 * Railroad square — fixed price 200.
 * Rent depends on number owned by same player (handled by engine):
 *   1 owned → 25 | 2 → 50 | 3 → 100 | 4 → 200
 * mortgageValue = 100 (half of 200).
 */
function makeRailroad(index: number, name: string): Square {
  return {
    index,
    name,
    type: 'railroad',
    price: 200,
    mortgageValue: 100,
    ownerId: null,
    houses: 0,
    isMortgaged: false,
  };
}

/**
 * Utility square — fixed price 150.
 * Rent is 4× dice total (1 owned) or 10× dice total (2 owned) — handled by engine.
 * mortgageValue = 75 (half of 150).
 */
function makeUtility(index: number, name: string): Square {
  return {
    index,
    name,
    type: 'utility',
    price: 150,
    mortgageValue: 75,
    ownerId: null,
    houses: 0,
    isMortgaged: false,
  };
}

/**
 * Tax square — `price` field carries the flat tax amount.
 * Index 4  → Thuế Thu Nhập → 200 triệu
 * Index 38 → Thuế Xa Xỉ   → 100 triệu
 */
function makeTax(index: number, name: string, amount: number): Square {
  return {
    index,
    name,
    type: 'tax',
    price: amount,
    ownerId: null,
    houses: 0,
    isMortgaged: false,
  };
}

// ---------------------------------------------------------------------------
// Board — 40 squares, indices 0-39
// ---------------------------------------------------------------------------

export const BOARD_SQUARES: Square[] = [
  // ── 0 ── GO ───────────────────────────────────────────────────────────────
  makeSpecial(0,  'XUẤT PHÁT',             'go'),

  // ── 1-3 ── Brown ──────────────────────────────────────────────────────────
  makeProp(   1,  'Đồng Tháp',             'brown',      60),
  makeSpecial(2,  'Công Quỹ Cộng Đồng',   'community_chest'),
  makeProp(   3,  'An Giang',              'brown',      60),

  // ── 4 ── Tax ──────────────────────────────────────────────────────────────
  makeTax(    4,  'Thuế Thu Nhập',                      200),

  // ── 5 ── Railroad ─────────────────────────────────────────────────────────
  makeRailroad(5, 'Ga Sài Gòn'),

  // ── 6-9 ── Light Blue ─────────────────────────────────────────────────────
  makeProp(   6,  'Cần Thơ',              'light_blue', 100),
  makeSpecial(7,  'Cơ Hội',              'chance'),
  makeProp(   8,  'Tiền Giang',          'light_blue', 100),
  makeProp(   9,  'Vĩnh Long',           'light_blue', 120),

  // ── 10 ── Jail / Just Visiting ────────────────────────────────────────────
  makeSpecial(10, 'Thăm Tù / Ngồi Tù',  'jail'),

  // ── 11-14 ── Pink ─────────────────────────────────────────────────────────
  makeProp(   11, 'Huế',                 'pink',       140),
  makeUtility(12, 'Điện Lực Việt Nam'),
  makeProp(   13, 'Đà Nẵng',            'pink',       140),
  makeProp(   14, 'Quảng Nam',          'pink',       160),

  // ── 15 ── Railroad ────────────────────────────────────────────────────────
  makeRailroad(15, 'Ga Đà Nẵng'),

  // ── 16-19 ── Orange ───────────────────────────────────────────────────────
  makeProp(   16, 'Bình Định',          'orange',     180),
  makeSpecial(17, 'Công Quỹ Cộng Đồng','community_chest'),
  makeProp(   18, 'Khánh Hòa',         'orange',     180),
  makeProp(   19, 'Lâm Đồng',          'orange',     200),

  // ── 20 ── Free Parking ────────────────────────────────────────────────────
  makeSpecial(20, 'Đỗ Xe Miễn Phí',    'free_parking'),

  // ── 21-24 ── Red ──────────────────────────────────────────────────────────
  makeProp(   21, 'Gia Lai',            'red',        220),
  makeSpecial(22, 'Cơ Hội',            'chance'),
  makeProp(   23, 'Đắk Lắk',           'red',        220),
  makeProp(   24, 'Bình Dương',         'red',        240),

  // ── 25 ── Railroad ────────────────────────────────────────────────────────
  makeRailroad(25, 'Ga Nha Trang'),

  // ── 26-29 ── Yellow ───────────────────────────────────────────────────────
  makeProp(   26, 'Đồng Nai',          'yellow',     260),
  makeProp(   27, 'Bà Rịa-Vũng Tàu',  'yellow',     260),
  makeUtility(28, 'Cấp Nước Sài Gòn'),
  makeProp(   29, 'Bình Thuận',        'yellow',     280),

  // ── 30 ── Go to Jail ──────────────────────────────────────────────────────
  makeSpecial(30, 'Vào Tù Ngay!',      'go_to_jail'),

  // ── 31-34 ── Green ────────────────────────────────────────────────────────
  makeProp(   31, 'TP. Hồ Chí Minh',  'green',      300),
  makeProp(   32, 'Hà Nội',           'green',      300),
  makeSpecial(33, 'Công Quỹ Cộng Đồng','community_chest'),
  makeProp(   34, 'Đà Lạt',           'green',      320),

  // ── 35 ── Railroad ────────────────────────────────────────────────────────
  makeRailroad(35, 'Ga Hà Nội'),

  // ── 36 ── Chance ──────────────────────────────────────────────────────────
  makeSpecial(36, 'Cơ Hội',           'chance'),

  // ── 37-39 ── Dark Blue ────────────────────────────────────────────────────
  makeProp(   37, 'Hội An',           'dark_blue',  350),
  makeTax(    38, 'Thuế Xa Xỉ',                     100),
  makeProp(   39, 'Vịnh Hạ Long',    'dark_blue',  400),
];

// ---------------------------------------------------------------------------
// Group colours
// ---------------------------------------------------------------------------

export const GROUP_COLORS: Record<PropertyGroup, string> = {
  brown:      '#8B4513',
  light_blue: '#87CEEB',
  pink:       '#FF69B4',
  orange:     '#FFA500',
  red:        '#FF0000',
  yellow:     '#FFD700',
  green:      '#008000',
  dark_blue:  '#00008B',
};

/**
 * Return a fresh deep-copy of BOARD_SQUARES with runtime state reset.
 * Used by createInitialGameState() in gameReducer.ts.
 */
export function createInitialSquares(): Square[] {
  return BOARD_SQUARES.map(sq => ({ ...sq, ownerId: null, houses: 0, isMortgaged: false }));
}
