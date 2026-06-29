import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, ArrowRight, AlertTriangle } from 'lucide-react';
import { Inventory, PowderGrade } from '../types';
import { GRADE_ORDER } from '../data';
import { audio } from '../utils/audio';

interface RefinementStationProps {
  inventory: Inventory;
  updateInventory: (updater: (prev: Inventory) => Inventory) => void;
  onShowMessage: (text: string, type: 'success' | 'error' | 'info') => void;
}

export default function RefinementStation({ inventory, updateInventory, onShowMessage }: RefinementStationProps) {
  const [selectedPowder, setSelectedPowder] = useState<string | null>(null);

  const refinePowder = () => {
    if (!selectedPowder) return;
    
    updateInventory(prev => {
      const powder = prev.groundPowders[selectedPowder];
      if (!powder) return prev;

      const currentIndex = GRADE_ORDER.indexOf(powder.grade);
      if (currentIndex === -1 || currentIndex >= GRADE_ORDER.length - 1) {
        onShowMessage("Already at maximum grade!", "error");
        return prev;
      }

      // Cost: 10 coins + 5g of Lumina/Glowstone as catalyst
      const hasCatalyst = (prev.groundPowders['lumina']?.grams || 0) >= 5 || (prev.groundPowders['glowstone']?.grams || 0) >= 5;
      if (prev.coins < 10 || !hasCatalyst) {
        onShowMessage("Need 10 coins and 5g of Lumina or Glowstone catalyst!", "error");
        return prev;
      }

      const nextGrade = GRADE_ORDER[currentIndex + 1];
      const newGroundPowders = { ...prev.groundPowders };
      newGroundPowders[selectedPowder] = { ...powder, grade: nextGrade };
      
      // Consume catalyst
      if ((newGroundPowders['lumina']?.grams || 0) >= 5) {
        newGroundPowders['lumina'].grams -= 5;
      } else {
        newGroundPowders['glowstone'].grams -= 5;
      }

      onShowMessage(`Refined to ${nextGrade}!`, "success");
      audio.playUnlock();

      return {
        ...prev,
        coins: prev.coins - 10,
        groundPowders: newGroundPowders
      };
    });
  };

  return (
    <div className="bg-[#0a0a0f] border border-white/10 rounded-lg p-5 flex flex-col gap-4 backdrop-blur-md">
      <div className="flex items-center gap-2 pb-3 border-b border-white/10">
        <Sparkles className="w-5 h-5 text-cyan-400" />
        <div>
          <h3 className="font-display font-bold text-white uppercase tracking-wider text-xs">Transmutation Chamber</h3>
          <p className="text-[11px] text-white/40">Refine powders to Ultra and Transmuted grades.</p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(inventory.groundPowders).map(([id, p]) => (
          <button 
            key={id}
            onClick={() => setSelectedPowder(id)}
            className={`p-2 rounded border ${selectedPowder === id ? 'bg-cyan-500/20 border-cyan-500' : 'bg-white/5 border-white/10'}`}
          >
            <div className="text-xs text-white">{id}</div>
            <div className="text-[10px] text-white/50">{p.grade}</div>
          </button>
        ))}
      </div>
      
      <button 
        onClick={refinePowder}
        disabled={!selectedPowder}
        className="w-full py-2 bg-cyan-500/20 text-cyan-400 rounded disabled:opacity-30"
      >
        Transmute (10💰 + 5g Catalyst)
      </button>
    </div>
  );
}
