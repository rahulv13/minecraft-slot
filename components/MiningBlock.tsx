
import React, { useState, useEffect, useRef } from 'react';
import { BlockState, BlockType, BLOCK_STATS } from '../types';

interface MiningBlockProps {
  block: BlockState;
  yIndex: number;
}

const playExplosionSound = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(100, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);

    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.6);
  } catch (e) {
    console.warn("Audio context not supported or blocked", e);
  }
};

const MiningBlock: React.FC<MiningBlockProps> = ({ block, yIndex }) => {
  const stats = BLOCK_STATS[block.type];
  const hpPercent = (block.currentHp / block.maxHp) * 100;
  const [showParticles, setShowParticles] = useState(false);
  const [showChestAnimation, setShowChestAnimation] = useState(false);
  const [showExplosion, setShowExplosion] = useState(false);
  const [isHitting, setIsHitting] = useState(false);
  const prevHp = useRef(block.currentHp);

  useEffect(() => {
    // Detect hits
    if (block.currentHp < prevHp.current && block.currentHp > 0) {
      setIsHitting(true);
      const timer = setTimeout(() => setIsHitting(false), 150);
      prevHp.current = block.currentHp;
      return () => clearTimeout(timer);
    }

    if (block.destroyed && prevHp.current > 0) {
      setShowParticles(true);
      const timer = setTimeout(() => setShowParticles(false), 800);
      
      if (block.hasChest) {
        setShowChestAnimation(true);
      }

      if (block.type === BlockType.TNT) {
        setShowExplosion(true);
        playExplosionSound();
        setTimeout(() => setShowExplosion(false), 700);
      }
      
      prevHp.current = 0;
      return () => clearTimeout(timer);
    }
  }, [block.destroyed, block.currentHp, block.hasChest, block.type]);

  const getChestRarityColor = (value: number) => {
    if (value >= 5000) return "bg-purple-600 border-yellow-400 shadow-[0_0_15px_rgba(255,215,0,0.8)]";
    if (value >= 1000) return "bg-red-600 border-white shadow-[0_0_10px_rgba(255,0,0,0.6)]";
    if (value >= 250) return "bg-blue-600 border-cyan-300";
    if (value >= 100) return "bg-yellow-600 border-orange-400";
    return "bg-chest border-black/20";
  };

  const getCrackOpacity = () => {
    if (block.destroyed) return 0;
    if (hpPercent >= 100) return 0;
    if (hpPercent > 75) return 0.2;
    if (hpPercent > 50) return 0.5;
    if (hpPercent > 25) return 0.8;
    return 0.95;
  };

  const renderBlockTexture = () => {
    let classes = "w-16 h-16 block-border relative overflow-visible transition-transform duration-75 ";
    
    if (isHitting) classes += "animate-hit ";

    // Bottom row (y=5) is always visual chest in MineDrop mockup if destroyed or reaching end
    if (yIndex === 5) {
      return (
        <div className={`w-16 h-16 bg-chest block-border flex items-center justify-center relative ${block.destroyed ? 'bg-opacity-20' : ''}`}>
          <div className="w-12 h-1 bg-black/30 absolute top-4"></div>
          <div className="w-4 h-6 bg-gray-300 border border-gray-500 rounded-sm flex items-center justify-center shadow-sm">
            <div className="w-2 h-3 border border-gray-400 bg-gray-200"></div>
          </div>
          {block.destroyed && block.hasChest && (
            <div className={`absolute inset-0 z-20 flex flex-col items-center justify-center ${getChestRarityColor(block.chestValue)} ${showChestAnimation ? 'animate-chest-reveal' : ''}`}>
               <span className="text-[11px] font-black text-white drop-shadow-[0_1px_0_rgba(0,0,0,1)]">x{block.chestValue}</span>
            </div>
          )}
        </div>
      );
    }

    if (block.destroyed) {
      return (
        <div className="w-16 h-16 bg-dirt/10 flex items-center justify-center relative overflow-visible">
          {showExplosion && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full rounded-full bg-orange-500 border-4 border-yellow-300 shadow-[0_0_20px_orange] z-40 animate-explosion pointer-events-none" />
          )}
          
          {showParticles && (
            <div className="absolute inset-0 pointer-events-none z-30">
              {[...Array(16)].map((_, i) => (
                <div
                  key={i}
                  className="particle absolute w-2 h-2 rounded-sm"
                  style={{
                    backgroundColor: stats.color,
                    left: '50%',
                    top: '50%',
                    '--tw-translate-x': `${(Math.random() - 0.5) * 160}px`,
                    '--tw-translate-y': `${(Math.random() - 0.5) * 160}px`,
                  } as React.CSSProperties}
                />
              ))}
            </div>
          )}
        </div>
      );
    }

    const typeClasses: Record<BlockType, string> = {
      [BlockType.DIRT]: yIndex === 0 ? "block-grass" : "block-dirt",
      [BlockType.STONE]: "block-stone",
      [BlockType.RUBY]: "block-ruby-ore",
      [BlockType.GOLD]: "block-gold",
      [BlockType.DIAMOND]: "block-diamond",
      [BlockType.OBSIDIAN]: "block-obsidian",
      [BlockType.TNT]: "bg-red-600 border-red-800 flex items-center justify-center",
    };

    classes += typeClasses[block.type] || "block-dirt";

    return (
      <div className={classes}>
        {/* Crack Overlay */}
        <div 
          className="absolute inset-0 crack-texture pointer-events-none transition-opacity duration-200 z-10"
          style={{ opacity: getCrackOpacity() }}
        />

        {block.type === BlockType.RUBY && (
          <div className="z-5">
            <div className="ruby-gem absolute top-2 left-2"></div>
            <div className="ruby-gem absolute top-2 right-2"></div>
            <div className="ruby-gem absolute top-6 left-1/2 -translate-x-1/2"></div>
            <div className="ruby-gem absolute bottom-2 left-2"></div>
            <div className="ruby-gem absolute bottom-2 right-2"></div>
          </div>
        )}
        
        {block.type === BlockType.TNT && (
          <span className="text-white font-bold text-xs pixel-text-shadow z-10">TNT</span>
        )}

        {/* HP Bar */}
        {block.currentHp < block.maxHp && (
          <div className="absolute bottom-1 left-1 right-1 h-1 bg-black/40 rounded-full overflow-hidden z-20">
            <div className="h-full bg-red-500 transition-all duration-200" style={{ width: `${hpPercent}%` }} />
          </div>
        )}

        {/* Hit/Break White Overlay Flash */}
        {isHitting && <div className="absolute inset-0 bg-white/40 z-30 animate-pulse pointer-events-none" />}
      </div>
    );
  };

  return (
    <div className={block.destroyed && prevHp.current === 0 ? "animate-shatter" : ""}>
      {renderBlockTexture()}
    </div>
  );
};

export default MiningBlock;
