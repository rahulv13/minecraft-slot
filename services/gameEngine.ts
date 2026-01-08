
import { 
  PickaxeType, 
  BlockType, 
  SpecialSymbol, 
  BlockState, 
  ReelCell, 
  BLOCK_STATS, 
  GameState 
} from '../types';

/**
 * Game Engine handles RNG and simulation of hits.
 * Target RTP: 96%
 */
export class GameEngine {
  
  // Weights for Reel Generation
  private static SYMBOL_WEIGHTS = [
    { type: PickaxeType.WOODEN, weight: 55 },
    { type: PickaxeType.STONE, weight: 25 },
    { type: PickaxeType.GOLD, weight: 10 },
    { type: PickaxeType.DIAMOND, weight: 3 },
    { special: SpecialSymbol.SPELLBOOK, weight: 5 },
    { special: SpecialSymbol.EYE, weight: 2 },
  ];

  // Treasure Chest Multiplier Tiers (Multiplier, Weight)
  private static CHEST_CONFIG = [
    { multiplier: 10, weight: 450 },
    { multiplier: 20, weight: 250 },
    { multiplier: 50, weight: 150 },
    { multiplier: 100, weight: 80 },
    { multiplier: 250, weight: 40 },
    { multiplier: 500, weight: 20 },
    { multiplier: 1000, weight: 9 },
    { multiplier: 5000, weight: 1 }, 
  ];

  static generateInitialGrid(): BlockState[][] {
    const grid: BlockState[][] = [];
    for (let x = 0; x < 5; x++) {
      const col: BlockState[] = [];
      for (let y = 0; y < 6; y++) {
        col.push(this.generateRandomBlock(x, y));
      }
      grid.push(col);
    }
    return grid;
  }

  static generateChestMultipliers(): number[] {
    const chests: number[] = [];
    for (let x = 0; x < 5; x++) {
      const totalWeight = this.CHEST_CONFIG.reduce((sum, item) => sum + item.weight, 0);
      let rand = Math.random() * totalWeight;
      let selectedMult = 10;
      for (const item of this.CHEST_CONFIG) {
        if (rand <= item.weight) {
          selectedMult = item.multiplier;
          break;
        }
        rand -= item.weight;
      }
      chests.push(selectedMult);
    }
    return chests;
  }

  static generateRandomBlock(x: number, y: number): BlockState {
    let type = BlockType.DIRT;

    switch (y) {
      case 0:
      case 1:
        type = BlockType.DIRT;
        break;
      case 2:
        type = BlockType.STONE;
        break;
      case 3:
        type = Math.random() < 0.3 ? BlockType.RUBY : BlockType.GOLD;
        break;
      case 4:
        type = Math.random() < 0.2 ? BlockType.OBSIDIAN : BlockType.DIAMOND;
        break;
      case 5:
        type = BlockType.DIRT;
        break;
      default:
        type = BlockType.DIRT;
    }

    if (y < 5 && Math.random() < 0.015) {
      type = BlockType.TNT;
    }

    const stats = BLOCK_STATS[type];
    return {
      id: `${x}-${y}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      currentHp: stats.hp,
      maxHp: stats.hp,
      payoutMultiplier: stats.payout,
      destroyed: false
    };
  }

  static generateReels(): ReelCell[][] {
    const reels: ReelCell[][] = [];
    for (let x = 0; x < 5; x++) {
      reels.push(this.generateColumnReel());
    }
    return reels;
  }

  static generateColumnReel(): ReelCell[] {
    const col: ReelCell[] = [];
    for (let y = 0; y < 3; y++) {
      const rand = Math.random() * 100;
      let cumulative = 0;
      let cell: ReelCell = { special: SpecialSymbol.NONE };

      for (const item of this.SYMBOL_WEIGHTS) {
        cumulative += item.weight;
        if (rand <= cumulative) {
          if ('type' in item) {
            cell.pickaxe = item.type;
          } else {
            cell.special = item.special!;
          }
          break;
        }
      }
      col.push(cell);
    }
    return col;
  }

  /**
   * Calculates the outcome for a single column.
   * This allows the UI to resolve columns one by one.
   */
  static calculateColumnOutcome(
    x: number,
    columnReel: ReelCell[],
    currentGrid: BlockState[][],
    chestMultipliers: number[],
    bet: number,
    isBonusMode: boolean
  ): {
    newGrid: BlockState[][],
    payout: number,
    eyesInColumn: number,
    upgradedColumnReel: ReelCell[]
  } {
    const newGrid = JSON.parse(JSON.stringify(currentGrid)) as BlockState[][];
    const upgradedColumnReel = JSON.parse(JSON.stringify(columnReel)) as ReelCell[];
    let totalPayout = 0;
    let eyesInColumn = 0;

    // 1. Process Spellbooks
    let hasSpellbook = false;
    for (let y = 0; y < 3; y++) {
      if (upgradedColumnReel[y].special === SpecialSymbol.SPELLBOOK) {
        hasSpellbook = true;
      }
      if (upgradedColumnReel[y].special === SpecialSymbol.EYE) {
        eyesInColumn++;
      }
    }
    if (hasSpellbook) {
      for (let y = 0; y < 3; y++) {
        if (upgradedColumnReel[y].pickaxe) {
          upgradedColumnReel[y].pickaxe = PickaxeType.DIAMOND;
        }
      }
    }

    // 2. Process Hits for this column
    let totalHits = 0;
    for (let y = 0; y < 3; y++) {
      const pType = upgradedColumnReel[y].pickaxe;
      if (pType) {
        totalHits += this.getPickaxeHits(pType);
      }
    }

    if (isBonusMode) {
      totalHits = Math.floor(totalHits * 1.5) + 1;
    }

    for (let y = 0; y < 6 && totalHits > 0; y++) {
      const block = newGrid[x][y];
      if (!block.destroyed) {
        const hitsToApply = Math.min(totalHits, block.currentHp);
        block.currentHp -= hitsToApply;
        totalHits -= hitsToApply;

        if (block.currentHp <= 0) {
          totalPayout += this.destroyBlock(newGrid, x, y, isBonusMode);
        }
      }
    }

    // Check for Column Clear (Chest Unlocking)
    let isColumnCleared = true;
    for (let y = 0; y < 6; y++) {
      if (!newGrid[x][y].destroyed) {
        isColumnCleared = false;
        break;
      }
    }

    let chestWin = 0;
    if (isColumnCleared) {
      // Award the chest multiplier for this column
      // Note: We check if the chest was *already* awarded by checking if the grid was already cleared
      // But based on the game flow, we calculate outcomes incrementally.
      // However, calculateColumnOutcome is called repeatedly or once per spin?
      // The App logic calls it once per column per spin.
      // So if it clears NOW, we award it.
      // We need to ensure we don't award it twice if we re-calculate, but the App uses the NEW grid state.
      // So checking `!currentGrid[x][last_row].destroyed` vs `newGrid[x][last_row].destroyed` is a good way
      // to see if it JUST got cleared.

      const wasClearedBefore = currentGrid[x].every(b => b.destroyed);
      if (!wasClearedBefore) {
         chestWin = chestMultipliers[x];
      }
    }

    return {
      newGrid,
      payout: (totalPayout * bet) + (chestWin * bet),
      eyesInColumn,
      upgradedColumnReel
    };
  }

  private static getPickaxeHits(type: PickaxeType): number {
    switch(type) {
      case PickaxeType.WOODEN: return 1;
      case PickaxeType.STONE: return 2;
      case PickaxeType.GOLD: return 3;
      case PickaxeType.DIAMOND: return 5;
      default: return 0;
    }
  }

  private static destroyBlock(grid: BlockState[][], x: number, y: number, isBonus: boolean): number {
    const block = grid[x][y];
    if (block.destroyed) return 0;

    block.destroyed = true;
    let payout = block.payoutMultiplier;

    if (block.type === BlockType.TNT) {
      payout += this.triggerExplosion(grid, x, y, isBonus);
    }

    return payout;
  }

  private static triggerExplosion(grid: BlockState[][], centerX: number, centerY: number, isBonus: boolean): number {
    let totalPayout = 0;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const nx = centerX + dx;
        const ny = centerY + dy;
        if (nx >= 0 && nx < 5 && ny >= 0 && ny < 6) {
          totalPayout += this.destroyBlock(grid, nx, ny, isBonus);
        }
      }
    }
    return totalPayout;
  }

  static getRefilledGrid(grid: BlockState[][]): BlockState[][] {
    const newGrid = JSON.parse(JSON.stringify(grid)) as BlockState[][];
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 6; y++) {
        if (newGrid[x][y].destroyed) {
          newGrid[x][y] = this.generateRandomBlock(x, y);
        }
      }
    }
    return newGrid;
  }
}
