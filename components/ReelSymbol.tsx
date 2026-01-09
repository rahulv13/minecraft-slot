import React from 'react';
import { ReelCell, SpecialSymbol, PickaxeType } from '../types';
import woodenPickaxe from '../assets/pickaxes/wooden.webp';
import stonePickaxe from '../assets/pickaxes/stone.webp';
import goldPickaxe from '../assets/pickaxes/gold.webp';
import diamondPickaxe from '../assets/pickaxes/diamond.webp';

interface ReelSymbolProps {
  cell: ReelCell;
  spinning: boolean;
}

const ReelSymbol: React.FC<ReelSymbolProps> = ({ cell, spinning }) => {
  const getPickaxeImage = (type: PickaxeType) => {
    switch (type) {
      case PickaxeType.WOODEN:
        return woodenPickaxe;
      case PickaxeType.STONE:
        return stonePickaxe;
      case PickaxeType.GOLD:
        return goldPickaxe;
      case PickaxeType.DIAMOND:
        return diamondPickaxe;
      default:
        return woodenPickaxe;
    }
  };

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
      return (
        <img
          src={getPickaxeImage(cell.pickaxe)}
          alt={cell.pickaxe}
          className="w-10 h-10 object-contain drop-shadow-[2px_2px_0_rgba(0,0,0,0.5)]"
        />
      );
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
