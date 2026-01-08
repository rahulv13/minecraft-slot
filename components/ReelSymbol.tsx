
import React from 'react';
import { ReelCell, SpecialSymbol, PickaxeType } from '../types';

interface ReelSymbolProps {
  cell: ReelCell;
  spinning: boolean;
}

const PixelPickaxe = ({ type }: { type: PickaxeType }) => {
  const colors = {
    [PickaxeType.WOODEN]: { head: '#8B4513', highlight: '#A0522D', handle: '#5D2906' },
    [PickaxeType.STONE]: { head: '#707070', highlight: '#8B8B8B', handle: '#5D2906' },
    [PickaxeType.GOLD]: { head: '#FFD700', highlight: '#FFFACD', handle: '#5D2906' },
    [PickaxeType.DIAMOND]: { head: '#4EE2EC', highlight: '#B9F2FF', handle: '#5D2906' },
  };

  const { head, highlight, handle } = colors[type];

  return (
    <svg viewBox="0 0 16 16" className="w-10 h-10 drop-shadow-[2px_2px_0_rgba(0,0,0,0.5)]">
      {/* Handle */}
      <rect x="2" y="13" width="1" height="1" fill={handle} />
      <rect x="3" y="12" width="1" height="1" fill={handle} />
      <rect x="4" y="11" width="1" height="1" fill={handle} />
      <rect x="5" y="10" width="1" height="1" fill={handle} />
      <rect x="6" y="9" width="1" height="1" fill={handle} />
      <rect x="7" y="8" width="1" height="1" fill={handle} />
      <rect x="8" y="7" width="1" height="1" fill={handle} />
      <rect x="9" y="6" width="1" height="1" fill={handle} />
      
      {/* Head Bottom */}
      <rect x="9" y="5" width="2" height="1" fill={head} />
      <rect x="10" y="6" width="1" height="2" fill={head} />
      
      {/* Head Top Right */}
      <rect x="11" y="4" width="2" height="1" fill={head} />
      <rect x="13" y="3" width="1" height="1" fill={head} />
      <rect x="12" y="5" width="1" height="2" fill={head} />
      <rect x="13" y="7" width="1" height="1" fill={head} />
      
      {/* Head Top Left */}
      <rect x="8" y="2" width="1" height="2" fill={head} />
      <rect x="7" y="1" width="1" height="1" fill={head} />
      <rect x="5" y="3" width="2" height="1" fill={head} />
      <rect x="3" y="2" width="1" height="1" fill={head} />

      {/* Highlights */}
      <rect x="12" y="4" width="1" height="1" fill={highlight} />
      <rect x="10" y="5" width="1" height="1" fill={highlight} />
      <rect x="8" y="3" width="1" height="1" fill={highlight} />
      <rect x="6" y="3" width="1" height="1" fill={highlight} />
    </svg>
  );
};

const ReelSymbol: React.FC<ReelSymbolProps> = ({ cell, spinning }) => {
  const renderIcon = () => {
    if (cell.special === SpecialSymbol.EYE) {
      return (
        <div className="w-10 h-10 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-black border-2 border-cyan-400 shadow-[0_0_8px_rgba(0,255,255,0.8)] flex items-center justify-center relative overflow-hidden">
             <div className="absolute inset-0 bg-cyan-900 opacity-40"></div>
             <div className="w-2 h-5 bg-white rounded-full shadow-[0_0_5px_white]"></div>
          </div>
        </div>
      );
    }
    if (cell.special === SpecialSymbol.SPELLBOOK) {
      return (
        <div className="w-10 h-10 flex items-center justify-center relative">
          <div className="w-7 h-9 bg-purple-800 border-2 border-purple-400 rounded-sm shadow-lg flex flex-col justify-between p-1">
             <div className="w-full h-1 bg-yellow-400"></div>
             <div className="w-full h-3 bg-purple-900 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
             </div>
             <div className="w-full h-1 bg-yellow-400"></div>
          </div>
        </div>
      );
    }

    if (cell.pickaxe) {
      return <PixelPickaxe type={cell.pickaxe} />;
    }

    return null;
  };

  return (
    <div className={`w-14 h-14 bg-[#8B8B8B] shadow-inner flex items-center justify-center border-2 border-[#373737] relative transition-all duration-100 ${spinning ? 'animate-reel-spin' : ''}`}>
      <div className={spinning ? 'scale-110' : ''}>
        {renderIcon()}
      </div>
      {cell.special === SpecialSymbol.SPELLBOOK && !spinning && (
        <div className="absolute inset-0 bg-purple-500/30 animate-pulse pointer-events-none"></div>
      )}
      {cell.pickaxe && !spinning && (
        <span className="absolute bottom-0 right-1 text-[10px] text-white p-0.5 font-black leading-none pixel-text-shadow">
          {cell.pickaxe === PickaxeType.DIAMOND ? '5' : cell.pickaxe === PickaxeType.GOLD ? '3' : cell.pickaxe === PickaxeType.STONE ? '2' : '1'}
        </span>
      )}
    </div>
  );
};

export default ReelSymbol;
