import React from 'react';
import { Briefcase, Shield, EyeOff, BarChart3, Lock } from 'lucide-react';
import { Inventory } from '../types';
import { audio } from '../utils/audio';

interface TaxEvasionTreeProps {
  inventory: Inventory;
  updateInventory: (updater: (prev: Inventory) => Inventory) => void;
  onShowMessage: (text: string, type: 'success' | 'error' | 'info') => void;
}

export default function TaxEvasionTree({ inventory, updateInventory, onShowMessage }: TaxEvasionTreeProps) {
  const canInvest = inventory.rebirths > 0;
  
  const skillConfigs = [
    { id: 'assetProtection' as const, name: 'Asset Protection', icon: Shield, description: 'Reduces IRS tax (rebirth) by 10% per level.', max: 3 },
    { id: 'hiddenAssets' as const, name: 'Hidden Assets', icon: EyeOff, description: 'Increases raw materials retained after rebirth by 10% per level.', max: 3 },
    { id: 'creativeAccounting' as const, name: 'Creative Accounting', icon: BarChart3, description: 'Increases coin multiplier per level by 5% per level.', max: 3 },
  ];

  const invest = (skillId: keyof Inventory['taxEvasionSkills']) => {
    if (!canInvest) {
      onShowMessage("You must have at least one rebirth to access this skill tree!", "error");
      return;
    }
    
    const currentLevel = inventory.taxEvasionSkills[skillId];
    if (currentLevel >= 3) {
      onShowMessage("Skill already maxed!", "info");
      return;
    }

    const cost = (currentLevel + 1) * 1000;
    if (inventory.coins < cost) {
      onShowMessage(`Not enough coins! Need ${cost} coins.`, "error");
      return;
    }

    updateInventory(prev => ({
      ...prev,
      coins: prev.coins - cost,
      taxEvasionSkills: {
        ...prev.taxEvasionSkills,
        [skillId]: prev.taxEvasionSkills[skillId] + 1
      }
    }));
    
    onShowMessage(`Invested in ${skillConfigs.find(s => s.id === skillId)?.name}!`, "success");
    audio.playUnlock();
  };

  return (
    <div className="bg-[#0a0a0f] border border-cyan-900/50 rounded-lg p-5 flex flex-col gap-6 backdrop-blur-md h-full">
      <div className="flex items-center gap-2 pb-3 border-b border-cyan-900/50">
        <Briefcase className="w-5 h-5 text-cyan-400" />
        <div>
          <h3 className="font-display font-bold text-white uppercase tracking-wider text-xs">Tax Evasion Skill Tree</h3>
          <p className="text-[11px] text-white/40">Circumvent the IRS with illicit financial maneuvers.</p>
        </div>
      </div>

      {!canInvest && (
        <div className="p-4 bg-red-900/20 border border-red-900 rounded text-center text-red-400 text-xs">
          Access locked. Complete your first IRS Audit (Rebirth) to unlock.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {skillConfigs.map(skill => (
          <div key={skill.id} className="p-4 bg-white/5 border border-white/10 rounded flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <skill.icon className="w-5 h-5 text-cyan-500" />
                <h4 className="text-white font-bold text-xs">{skill.name} ({inventory.taxEvasionSkills[skill.id]}/3)</h4>
              </div>
              <button 
                onClick={() => invest(skill.id)}
                disabled={!canInvest || inventory.taxEvasionSkills[skill.id] >= 3}
                className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded text-[10px] font-mono flex items-center gap-1 hover:bg-cyan-500/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {inventory.taxEvasionSkills[skill.id] >= 3 ? "Maxed" : `Invest ${(inventory.taxEvasionSkills[skill.id] + 1) * 1000} Coins`}
              </button>
            </div>
            <p className="text-[10px] text-white/50">{skill.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
