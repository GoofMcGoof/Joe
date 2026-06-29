import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Inventory } from '../types';
import { audio } from '../utils/audio';

interface RebirthStationProps {
  inventory: Inventory;
  updateInventory: (updater: (prev: Inventory) => Inventory) => void;
  onShowMessage: (text: string, type: 'success' | 'error' | 'info') => void;
}

export default function RebirthStation({ inventory, updateInventory, onShowMessage }: RebirthStationProps) {
  const performRebirth = () => {
    if (inventory.level < 10) {
      onShowMessage("You need to reach Level 10 to escape the IRS!", "error");
      return;
    }

    updateInventory(prev => {
      const taxReduction = prev.taxEvasionSkills.assetProtection * 0.1;
      const taxRate = Math.max(0.1, 0.9 - taxReduction);
      
      const materialsRetention = prev.taxEvasionSkills.hiddenAssets * 0.1;
      
      // Filter rawMaterials
      const retainedMaterials: Record<string, number> = {};
      if (materialsRetention > 0) {
        Object.entries(prev.rawMaterials).forEach(([id, qty]) => {
          retainedMaterials[id] = Math.floor(qty * materialsRetention);
        });
      }

      return {
        ...prev,
        level: 1,
        xp: 0,
        rebirths: prev.rebirths + 1,
        coins: Math.floor(prev.coins * taxRate), // IRS tax
        rawMaterials: retainedMaterials,
        groundPowders: {},
        mixtures: [],
        upgrades: {
          ...prev.upgrades,
          pestleSpeed: 1,
          sifterGrade: 1,
          scalePrecision: 1,
          sandboxSize: 1,
          maxOrders: 1,
        },
      };
    });

    onShowMessage("THE IRS HAS CAPTURED YOU! Rebirth successful.", "info");
    audio.playUnlock();
  };

  return (
    <div className="bg-red-950/20 border border-red-500/30 rounded-lg p-5 flex flex-col gap-4 backdrop-blur-md">
      <div className="flex items-center gap-2 pb-3 border-b border-red-500/20">
        <AlertTriangle className="w-5 h-5 text-red-500" />
        <h3 className="font-display font-bold text-red-500 uppercase tracking-wider text-xs">IRS Tax Audit (Rebirth)</h3>
      </div>
      <p className="text-xs text-white/70">
        Level 10 reached! Rebirth to reset your progress but increase your power and level cap. 
        <span className="font-bold text-red-400"> Warning: IRS will take 90% of your current assets and reset your upgrades!</span>
      </p>
      <button onClick={performRebirth} className="w-full py-3 bg-red-600 text-white rounded font-bold uppercase hover:bg-red-700 transition-all text-xs">
        Rebirth (IRS Audit)
      </button>
      <div className="text-[10px] text-white/40 text-center mt-2">Current Rebirths: {inventory.rebirths}</div>
    </div>
  );
}
