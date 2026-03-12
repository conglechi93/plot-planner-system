export type PropertyGroup =
  | 'brown' | 'light_blue' | 'pink' | 'orange'
  | 'red' | 'yellow' | 'green' | 'dark_blue';

export type SquareType =
  | 'go' | 'property' | 'community_chest' | 'chance'
  | 'tax' | 'railroad' | 'utility' | 'jail'
  | 'free_parking' | 'go_to_jail';

export type GamePhase =
  | 'setup'
  | 'player_turn_start'
  | 'rolling_dice'
  | 'moving_token'
  | 'landing'
  | 'buying_property'
  | 'paying_rent'
  | 'drawing_card'
  | 'auction'
  | 'in_jail'
  | 'building'
  | 'bankruptcy_resolution'
  | 'game_over';

export type CardType = 'chance' | 'community_chest';

export type CardEffect =
  | { type: 'collect_money'; amount: number }
  | { type: 'pay_money'; amount: number }
  | { type: 'move_to'; position: number }
  | { type: 'move_forward'; spaces: number }
  | { type: 'move_to_nearest'; squareType: 'railroad' | 'utility' }
  | { type: 'go_to_jail' }
  | { type: 'get_out_of_jail_free' }
  | { type: 'collect_from_players'; amount: number }
  | { type: 'pay_per_house_hotel'; perHouse: number; perHotel: number }
  | { type: 'advance_to_go' };

export interface Card {
  id: string;
  type: CardType;
  description: string;
  effect: CardEffect;
}

export interface Square {
  index: number;
  name: string;
  type: SquareType;
  group?: PropertyGroup;
  price?: number;
  rentBase?: number;
  rentWith1House?: number;
  rentWith2Houses?: number;
  rentWith3Houses?: number;
  rentWith4Houses?: number;
  rentWithHotel?: number;
  houseCost?: number;
  mortgageValue?: number;
  ownerId: string | null;
  houses: number; // 0-4 = houses, 5 = hotel
  isMortgaged: boolean;
}

export interface AuctionBid {
  playerId: string;
  amount: number;
}

export interface AuctionState {
  squareIndex: number;
  currentBid: number;
  currentBidderId: string | null;
  bids: AuctionBid[];
  passedPlayers: string[];
  isActive: boolean;
}

export interface GameLogEntry {
  turn: number;
  playerId: string;
  message: string;
  timestamp: number;
}

export type AIStrategy = 'aggressive' | 'balanced' | 'conservative';

export interface Player {
  id: string;
  name: string;
  isAI: boolean;
  aiStrategy: AIStrategy;
  money: number;
  position: number;
  inJail: boolean;
  jailTurns: number;
  jailFreeCards: number;
  isBankrupt: boolean;
  doublesCount: number;
  tokenColor: string;
  ownedSquares: number[];
}

export type PendingAction =
  | { type: 'buy_or_auction'; squareIndex: number }
  | { type: 'pay_rent'; squareIndex: number; amount: number; toPlayerId: string }
  | { type: 'card_drawn'; card: Card }
  | { type: 'jail_decision' }
  | { type: 'building' }
  | { type: 'pay_tax'; amount: number };

export type GameEventType =
  | 'ROLL_DICE'
  | 'BUY_PROPERTY'
  | 'DECLINE_PROPERTY'
  | 'PAY_RENT'
  | 'APPLY_CARD'
  | 'START_AUCTION'
  | 'PLACE_BID'
  | 'PASS_AUCTION'
  | 'BUILD_HOUSE'
  | 'BUILD_HOTEL'
  | 'SELL_HOUSE'
  | 'SELL_HOTEL'
  | 'MORTGAGE_PROPERTY'
  | 'UNMORTGAGE_PROPERTY'
  | 'PAY_JAIL_BAIL'
  | 'USE_JAIL_FREE_CARD'
  | 'ROLL_FOR_JAIL'
  | 'DECLARE_BANKRUPTCY'
  | 'END_TURN';

export interface GameEvent {
  type: GameEventType;
  payload?: Record<string, unknown>;
}

export interface GameState {
  phase: GamePhase;
  players: Player[];
  squares: Square[];
  currentPlayerIndex: number;
  diceValues: [number, number] | null;
  isDoubles: boolean;
  chanceDeck: Card[];
  communityChestDeck: Card[];
  lastDrawnCard: Card | null;
  auction: AuctionState | null;
  bankHouses: number;
  bankHotels: number;
  freeParkingPot: number;
  turnCount: number;
  log: GameLogEntry[];
  winner: string | null;
  pendingAction: PendingAction | null;
}
