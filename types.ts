
export enum PickaxeType {
  WOODEN = 'WOODEN',
  STONE = 'STONE',
  GOLD = 'GOLD',
  DIAMOND = 'DIAMOND'
}

export enum SpecialSymbol {
  EYE = 'EYE',
  SPELLBOOK = 'SPELLBOOK',
  NONE = 'NONE'
}

export enum BlockType {
  DIRT = 'DIRT',
  STONE = 'STONE',
  RUBY = 'RUBY',
  GOLD = 'GOLD',
  DIAMOND = 'DIAMOND',
  OBSIDIAN = 'OBSIDIAN',
  TNT = 'TNT'
}

export interface BlockState {
  id: string;
  type: BlockType;
  currentHp: number;
  maxHp: number;
  payoutMultiplier: number;
  destroyed: boolean;
  hasChest: boolean;
  chestValue: number;
}

export interface ReelCell {
  pickaxe?: PickaxeType;
  special: SpecialSymbol;
}

export interface GameState {
  balance: number;
  bet: number;
  reels: ReelCell[][];
  grid: BlockState[][];
  isSpinning: boolean;
  isBonusMode: boolean;
  bonusSpinsLeft: number;
  lastWin: number;
  totalSessionWin: number;
  history: string[];
  serverSeed: string;
  clientSeed: string;
  nonce: number;
}

export const PICKAXE_STATS = {
  [PickaxeType.WOODEN]: { hits: 1, color: '#964B00' },
  [PickaxeType.STONE]: { hits: 2, color: '#808080' },
  [PickaxeType.GOLD]: { hits: 3, color: '#FFD700' },
  [PickaxeType.DIAMOND]: { hits: 5, color: '#00FFFF' }
};

export const BLOCK_STATS = {
  [BlockType.DIRT]: { hp: 1, payout: 0, color: '#5C4033' },
  [BlockType.STONE]: { hp: 2, payout: 0.10, color: '#696969' },
  [BlockType.RUBY]: { hp: 4, payout: 1.00, color: '#E0115F' },
  [BlockType.GOLD]: { hp: 5, payout: 3.00, color: '#FFD700' },
  [BlockType.DIAMOND]: { hp: 6, payout: 5.00, color: '#B9F2FF' },
  [BlockType.OBSIDIAN]: { hp: 7, payout: 25.00, color: '#313131' },
  [BlockType.TNT]: { hp: 1, payout: 0, color: '#FF0000' }
};
