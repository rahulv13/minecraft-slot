
import React, { useState, useEffect, useRef } from 'react';
import { GameState, BlockState, ReelCell, SpecialSymbol, BlockType, PICKAXE_STATS } from './types';
import { GameEngine } from './services/gameEngine';
import MiningBlock from './components/MiningBlock';
import ReelSymbol from './components/ReelSymbol';

const INITIAL_BET = 1.00;
const INITIAL_BALANCE = 1000.00;

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    balance: INITIAL_BALANCE,
    bet: INITIAL_BET,
    reels: GameEngine.generateReels(),
    grid: GameEngine.generateInitialGrid(),
    isSpinning: false,
    isBonusMode: false,
    bonusSpinsLeft: 0,
    lastWin: 0,
    totalSessionWin: 0,
    history: ['Welcome back, Miner!'],
    serverSeed: Math.random().toString(36).substring(2),
    clientSeed: 'miner_default',
    nonce: 0
  });

  const [showWinPopup, setShowWinPopup] = useState(false);
  const [currentWinAmount, setCurrentWinAmount] = useState(0);
  const [isShaking, setIsShaking] = useState(false);
  const [spinningColumns, setSpinningColumns] = useState<boolean[]>([false, false, false, false, false]);

  const addLog = (msg: string) => {
    setGameState(prev => ({
      ...prev,
      history: [msg, ...prev.history].slice(0, 5)
    }));
  };

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 300);
  };

  const handleBonusBuy = () => {
    const cost = gameState.bet * 100;
    if (gameState.balance < cost || gameState.isSpinning || gameState.isBonusMode) {
      addLog("INSUFFICIENT FUNDS FOR BONUS BUY");
      return;
    }

    setGameState(prev => ({
      ...prev,
      balance: prev.balance - cost,
      isBonusMode: true,
      bonusSpinsLeft: 5,
      history: ["BONUS PURCHASED!", ...prev.history]
    }));
  };

  const handleSpin = async () => {
    if (gameState.isSpinning || (gameState.balance < gameState.bet && !gameState.isBonusMode)) {
      if (!gameState.isBonusMode) addLog("INSUFFICIENT FUNDS");
      return;
    }

    // 1. Setup spin state
    setGameState(prev => ({
      ...prev,
      isSpinning: true,
      balance: prev.isBonusMode ? prev.balance : prev.balance - prev.bet,
      lastWin: 0,
      nonce: prev.nonce + 1
    }));
    setSpinningColumns([true, true, true, true, true]);
    setShowWinPopup(false);

    // 2. Start reel spinning animation
    const spinInterval = setInterval(() => {
      setGameState(prev => ({
        ...prev,
        reels: prev.reels.map((col, x) => spinningColumns[x] ? GameEngine.generateColumnReel() : col)
      }));
    }, 80);

    let cumulativePayout = 0;
    let totalEyes = 0;

    // 3. Sequential Column Resolution
    for (let x = 0; x < 5; x++) {
      // Small pause for anticipation
      await new Promise(r => setTimeout(r, 400));
      
      // Stop the spinning for this specific column
      setSpinningColumns(prev => {
        const next = [...prev];
        next[x] = false;
        return next;
      });

      const finalColumnReel = GameEngine.generateColumnReel();
      const outcome = GameEngine.calculateColumnOutcome(
        x,
        finalColumnReel,
        gameState.grid, // use current grid
        gameState.bet,
        gameState.isBonusMode
      );

      // Lock the reel result first
      setGameState(prev => {
        const updatedReels = [...prev.reels];
        updatedReels[x] = outcome.upgradedColumnReel;
        return { ...prev, reels: updatedReels };
      });

      // Antics: wait a tiny bit after the reel stops before the blocks start exploding
      await new Promise(r => setTimeout(r, 100));

      // 4. "Axe Drop" Sequence: Resolve blocks in this column row-by-row
      // This is the core "burst" logic requested
      for (let y = 0; y < 6; y++) {
        // If the block in this row was destroyed in the calculation, update it now
        if (outcome.newGrid[x][y].destroyed || outcome.newGrid[x][y].currentHp < gameState.grid[x][y].currentHp) {
           setGameState(prev => {
             const updatedGrid = [...prev.grid];
             updatedGrid[x] = [...updatedGrid[x]];
             updatedGrid[x][y] = outcome.newGrid[x][y];
             return { ...prev, grid: updatedGrid };
           });
           
           // If the block was fully destroyed, add small delay for "cascade" effect
           if (outcome.newGrid[x][y].destroyed) {
             await new Promise(r => setTimeout(r, 60)); 
           }
        }
      }

      // Update local tracking
      cumulativePayout += outcome.payout;
      totalEyes += outcome.eyesInColumn;

      // Shake if many blocks were destroyed in this column
      const blocksDestroyed = outcome.newGrid[x].filter(b => b.destroyed).length;
      if (blocksDestroyed > 2) triggerShake();
    }

    clearInterval(spinInterval);

    // 5. Finalize round stats
    setGameState(prev => {
      const nextBalance = prev.balance + cumulativePayout;
      
      if (cumulativePayout > 0) {
        setCurrentWinAmount(cumulativePayout);
        setShowWinPopup(true);
        setTimeout(() => setShowWinPopup(false), 1200);
        addLog(`WIN: $${cumulativePayout.toFixed(2)}`);
      }

      let nextBonusMode = prev.isBonusMode;
      let nextBonusSpins = prev.bonusSpinsLeft;

      if (totalEyes >= 3 && !prev.isBonusMode) {
        nextBonusMode = true;
        nextBonusSpins = 5;
        addLog("BONUS ACTIVATED!");
      }

      if (prev.isBonusMode) {
        nextBonusSpins = prev.bonusSpinsLeft - 1;
        if (nextBonusSpins <= 0) {
          nextBonusMode = false;
          addLog("BONUS OVER");
        }
      }

      return {
        ...prev,
        balance: nextBalance,
        totalSessionWin: prev.totalSessionWin + cumulativePayout,
        isBonusMode: nextBonusMode,
        bonusSpinsLeft: nextBonusSpins,
        lastWin: cumulativePayout
      };
    });

    // 6. Refresh every block for the next spin (Reset the board)
    setTimeout(() => {
      setGameState(prev => ({
        ...prev,
        isSpinning: false,
        grid: GameEngine.generateInitialGrid() 
      }));
    }, 1200);
  };

  const updateBet = (dir: number) => {
    if (gameState.isSpinning) return;
    const steps = [0.1, 0.5, 1, 2, 5, 10, 25, 50, 100, 500, 1000];
    const currIdx = steps.indexOf(gameState.bet);
    let nextIdx = currIdx + dir;
    if (nextIdx < 0) nextIdx = 0;
    if (nextIdx >= steps.length) nextIdx = steps.length - 1;
    setGameState(s => ({ ...s, bet: steps[nextIdx] }));
  };

  const getWinLabel = (win: number, bet: number) => {
    const mult = win / bet;
    if (mult >= 50) return "MEGA WIN!";
    if (mult >= 20) return "BIG WIN!";
    if (mult >= 5) return "GOOD WIN!";
    return "WIN!";
  };

  return (
    <div className={`h-screen w-screen bg-sky flex flex-col font-display text-slate-800 overflow-hidden relative select-none ${isShaking ? 'camera-shake' : ''}`}>
      
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-20 left-20 animate-float opacity-90 scale-125"><div className="cloud-pixel"></div></div>
        <div className="absolute top-40 right-40 animate-float opacity-80" style={{ animationDelay: '2s' }}><div className="cloud-pixel"></div></div>
        <div className="absolute top-24 left-1/4 animate-ghast z-0 opacity-40">
          <div className="relative w-24 h-24 bg-white shadow-xl flex flex-col items-center justify-center">
             <div className="flex gap-4 mb-2"><div className="w-2 h-1 bg-gray-400"></div><div className="w-2 h-1 bg-gray-400"></div></div>
             <div className="w-3 h-1 bg-gray-400"></div>
             <div className="absolute -bottom-6 flex gap-1 justify-center w-full">
               <div className="ghast-tentacle"></div><div className="ghast-tentacle h-[20px]"></div><div className="ghast-tentacle h-[30px]"></div><div className="ghast-tentacle h-[25px]"></div><div className="ghast-tentacle"></div>
             </div>
          </div>
        </div>
      </div>

      <nav className="relative z-10 w-full px-4 py-2 flex justify-between items-start">
        <div className="text-white font-bold text-lg drop-shadow-md tracking-tight">MINEDROP BURST</div>
        <div className="flex gap-2">
           <button 
             onClick={handleBonusBuy}
             disabled={gameState.isSpinning || gameState.isBonusMode}
             className="bg-purple-600 text-white font-pixel text-[8px] px-3 py-1 rounded shadow-lg border-b-4 border-purple-900 active:border-b-0 active:translate-y-1 transition-all disabled:opacity-50 disabled:grayscale"
           >
             BONUS BUY (100x)
           </button>
           <div className="bg-white rounded px-2 py-1 shadow-md hover:scale-105 cursor-pointer">
             <span className="material-symbols-outlined text-black text-xl">help_outline</span>
           </div>
        </div>
      </nav>

      <main className="flex-grow flex flex-col items-center justify-center relative z-10 gap-2 -mt-10">
        <div className={`bg-[#C6C6C6] p-1 border-4 border-white border-r-[#555] border-b-[#555] shadow-2xl relative ${gameState.isBonusMode ? 'ring-4 ring-purple-500 ring-offset-2' : ''}`}>
          <div className="grid grid-cols-5 grid-rows-3 gap-[2px] bg-[#8B8B8B] border-2 border-[#373737]">
            {[0, 1, 2].map(y => (
              <React.Fragment key={`reel-row-${y}`}>
                {[0, 1, 2, 3, 4].map(x => (
                  <ReelSymbol key={`reel-${x}-${y}`} cell={gameState.reels[x][y]} spinning={spinningColumns[x]} />
                ))}
              </React.Fragment>
            ))}
          </div>
          {gameState.isBonusMode && (
            <div className="absolute -top-4 -right-4 bg-purple-600 text-white text-[10px] px-2 py-1 rounded-full border-2 border-white animate-pulse shadow-lg pixel-font z-30">
              BONUS: {gameState.bonusSpinsLeft}
            </div>
          )}
        </div>

        <div className="flex flex-col shadow-2xl">
          <div className="grid grid-cols-5 bg-black/10 p-0.5">
            {[0, 1, 2, 3, 4, 5].map(y => (
              <React.Fragment key={`grid-row-${y}`}>
                {[0, 1, 2, 3, 4].map(x => {
                  const block = gameState.grid[x][y];
                  return <MiningBlock key={block.id} block={block} yIndex={y} />;
                })}
              </React.Fragment>
            ))}
          </div>
          <div className="h-4 w-full bg-[#4a4a4a] border-t-2 border-black/50 shadow-inner"></div>
        </div>

        {showWinPopup && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
            <div className="bg-yellow-400 text-black vt323 flex flex-col items-center justify-center p-8 rounded-2xl border-[10px] border-black shadow-[0_15px_0_rgba(0,0,0,1)] animate-bounce italic scale-110">
              <span className="text-4xl font-black mb-2 animate-pulse">{getWinLabel(currentWinAmount, gameState.bet)}</span>
              <span className="text-7xl font-black drop-shadow-[4px_4px_0px_white]">${currentWinAmount.toFixed(2)}</span>
            </div>
          </div>
        )}
      </main>

      <footer className="relative z-20 w-full bg-pattern-dirt pt-6 pb-6 px-4 border-t-8 border-grass shadow-[0_-4px_10px_rgba(0,0,0,0.5)]">
        <div className="absolute top-[-8px] left-0 w-full h-2 bg-[#89e44d] border-b border-black/10"></div>
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <button className="w-16 h-16 bg-cyan-400 rounded-xl border-4 border-black shadow-[0_4px_0_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center">
            <span className="material-symbols-outlined text-black text-4xl">history</span>
          </button>

          <div className="bg-[#1a1a1a] rounded-full p-2 pr-6 flex items-center gap-4 border-2 border-[#333] shadow-lg">
            <button className="w-10 h-10 flex items-center justify-center text-white/50 hover:text-white">
              <span className="material-symbols-outlined text-3xl">account_balance_wallet</span>
            </button>
            <div className="flex flex-col">
              <span className="text-[10px] text-cyan-400 font-bold tracking-widest uppercase">Balance</span>
              <span className="text-white text-2xl font-bold tracking-wide vt323 leading-none">${gameState.balance.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex-grow"></div>

          <div className="bg-[#1a1a1a] rounded-full py-2 px-6 flex items-center justify-between gap-4 border-2 border-[#333] shadow-lg min-w-[180px]">
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-cyan-400 font-bold tracking-widest uppercase">Bet</span>
              <span className="text-white text-2xl font-bold tracking-wide vt323 leading-none">${gameState.bet.toFixed(2)}</span>
            </div>
            <div className="flex flex-col gap-1">
              <button onClick={() => updateBet(1)} className="text-white/50 hover:text-white hover:scale-110 transition-all">
                <span className="material-symbols-outlined text-xl">expand_less</span>
              </button>
              <button onClick={() => updateBet(-1)} className="text-white/50 hover:text-white hover:scale-110 transition-all">
                <span className="material-symbols-outlined text-xl">expand_more</span>
              </button>
            </div>
          </div>

          <div className="relative group mx-2">
            <button 
              onClick={handleSpin}
              disabled={gameState.isSpinning}
              className={`
                w-20 h-20 rounded-full border-[6px] border-black transition-all flex items-center justify-center z-10 relative
                ${gameState.isSpinning 
                  ? 'bg-gray-400 shadow-none translate-y-1 cursor-not-allowed grayscale' 
                  : 'bg-white shadow-[0_6px_0_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none hover:scale-105'
                }
              `}
            >
              <span className={`material-symbols-outlined text-black text-6xl ${gameState.isSpinning ? 'animate-spin' : 'group-hover:rotate-180'} transition-transform duration-700`}>
                {gameState.isSpinning ? 'progress_activity' : 'sync'}
              </span>
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <button className="w-10 h-10 rounded-full bg-white border-2 border-black shadow-[0_3px_0_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center hover:bg-gray-100">
              <span className="material-symbols-outlined text-black text-xl font-bold">autoplay</span>
            </button>
            <button className="w-10 h-10 rounded-full bg-white border-2 border-black shadow-[0_3px_0_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center hover:bg-gray-100">
              <span className="material-symbols-outlined text-black text-xl font-bold">bolt</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
