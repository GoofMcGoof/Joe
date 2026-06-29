/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Inventory } from '../types';
import { RAW_INGREDIENTS, UPGRADE_COSTS } from '../data';
import { audio } from '../utils/audio';

interface LabShopProps {
  inventory: Inventory;
  updateInventory: (updater: (prev: Inventory) => Inventory) => void;
  onShowMessage: (text: string, type: 'success' | 'error' | 'info') => void;
}

type ShopState = 'home' | 'buy_ores' | 'buy_upgrades' | 'buy_workers' | 'talk';

export default function LabShop({ inventory, updateInventory, onShowMessage }: LabShopProps) {
  const [shopState, setShopState] = useState<ShopState>('home');
  const [hoveredIndex, setHoveredIndex] = useState<number>(0);
  const [hoveredItemText, setHoveredItemText] = useState<string>('');

  const dialogText = {
    home: ["* Greetings, seeker.", "* Welcome to...", "* The Alchemist's Sanctum."],
    talk: ["* The elements speak to those who listen.", "* Patience is the true catalyst.", "* Seek balance in your mixtures.", "* My wares are but tools for your craft."],
  };

  const buyRawMaterial = (ingId: string, cost: number, name: string) => {
    if (inventory.coins < cost) {
      onShowMessage("Not enough G...", "error");
      return;
    }
    updateInventory(prev => ({
      ...prev,
      coins: prev.coins - cost,
      rawMaterials: {
        ...prev.rawMaterials,
        [ingId]: (prev.rawMaterials[ingId] || 0) + 1
      }
    }));
    audio.playCoin();
    onShowMessage(`Bought ${name}!`, "success");
  };

  const buyUpgrade = (category: keyof Inventory['upgrades'], displayName: string) => {
    const currentLevel = inventory.upgrades[category];
    const costs = UPGRADE_COSTS[category];
    if (currentLevel >= costs.length) {
      onShowMessage("MAX LEVEL!!!", "info");
      return;
    }
    const cost = costs[currentLevel];
    if (inventory.coins < cost) {
      onShowMessage("Not enough G...", "error");
      return;
    }
    updateInventory(prev => ({
      ...prev,
      coins: prev.coins - cost,
      upgrades: { ...prev.upgrades, [category]: currentLevel + 1 }
    }));
    audio.playUnlock();
    onShowMessage(`Upgraded ${displayName}!`, "success");
  };

  const toggleWorkerHire = (workerId: string) => {
    updateInventory(prev => {
      const updatedWorkers = prev.workers.map(w => {
        if (w.id === workerId) {
          if (!w.hired) {
            setTimeout(() => { audio.playUnlock(); onShowMessage(`Hired ${w.name}!`, "success"); }, 50);
            return { ...w, hired: true, status: 'active' as const };
          } else {
            setTimeout(() => { audio.playSpark(); onShowMessage(`Dismissed ${w.name}.`, "info"); }, 50);
            return { ...w, hired: false, status: 'idle' as const };
          }
        }
        return w;
      });
      return { ...prev, workers: updatedWorkers };
    });
  };

  const renderHomeRight = () => (
    <div className="flex flex-col gap-4">
      {['Buy Ores', 'Upgrades', 'Hire Labor', 'Talk'].map((opt, i) => (
        <div 
          key={i} 
          className="cursor-pointer flex items-center gap-2 hover:text-cyan-300 select-none transition-colors"
          onMouseEnter={() => setHoveredIndex(i)}
          onClick={() => {
            if (i === 0) setShopState('buy_ores');
            if (i === 1) setShopState('buy_upgrades');
            if (i === 2) setShopState('buy_workers');
            if (i === 3) setShopState('talk');
            setHoveredIndex(0);
          }}
        >
           <span className={`text-cyan-400 font-bold ${hoveredIndex === i ? 'opacity-100' : 'opacity-0'}`}>{'>'}</span>
           {opt}
        </div>
      ))}
    </div>
  );

  const getLockDetails = (ingId: string): { locked: boolean; requirement: string } => {
    const lvl = inventory.level;
    const reb = inventory.rebirths;
    if ((ingId === 'iron' || ingId === 'aluminium') && lvl < 2) return { locked: true, requirement: 'Lvl 2' };
    if ((ingId === 'lumina' || ingId === 'glowstone') && lvl < 3) return { locked: true, requirement: 'Lvl 3' };
    if (ingId === 'cobalt' && lvl < 5) return { locked: true, requirement: 'Lvl 5' };
    if (ingId === 'silver' && lvl < 6) return { locked: true, requirement: 'Lvl 6' };
    if (ingId === 'mercury' && lvl < 7) return { locked: true, requirement: 'Lvl 7' };
    if ((ingId === 'plasma_ore' || ingId === 'xenon_salt') && lvl < 10) return { locked: true, requirement: 'Lvl 10' };
    if ((ingId === 'uranium' || ingId === 'radium') && (lvl < 11 || reb < 1)) return { locked: true, requirement: 'Lvl 11, Reb 1' };
    if ((ingId === 'thorium' || ingId === 'plutonium') && (lvl < 13 || reb < 2)) return { locked: true, requirement: 'Lvl 13, Reb 2' };
    if ((ingId === 'americium' || ingId === 'curium') && (lvl < 15 || reb < 3)) return { locked: true, requirement: 'Lvl 15, Reb 3' };
    if ((ingId === 'berkelium' || ingId === 'californium') && (lvl < 17 || reb < 4)) return { locked: true, requirement: 'Lvl 17, Reb 4' };
    return { locked: false, requirement: '' };
  };

  const renderOresLeft = () => (
    <div className="flex flex-col gap-2 h-full overflow-y-auto pr-2 custom-scrollbar">
      {[...RAW_INGREDIENTS].map((ing, i) => {
        const { locked, requirement } = getLockDetails(ing.id);
        const name = locked ? `??? (${requirement})` : ing.name;
        const stock = inventory.rawMaterials[ing.id] || 0;
        return (
          <div 
            key={i} 
            className={`cursor-pointer flex justify-between gap-2 select-none transition-colors ${locked ? 'text-white/30' : 'hover:text-cyan-300'}`}
            onMouseEnter={() => {
              setHoveredIndex(i);
              setHoveredItemText(locked ? 'Locked...' : `${ing.description} (Stock: ${stock})`);
            }}
            onClick={() => !locked && buyRawMaterial(ing.id, ing.cost, ing.name)}
          >
             <div className="flex items-center gap-2">
               <span className={`text-cyan-400 font-bold shrink-0 ${hoveredIndex === i ? 'opacity-100' : 'opacity-0'}`}>{'>'}</span>
               * {name}
             </div>
             <span>{ing.cost}G</span>
          </div>
        );
      })}
    </div>
  );

  const upgradeDefs = [
    { cat: 'pestleSpeed' as const, name: 'Pestle', desc: 'Increases grinding speed.' },
    { cat: 'sifterGrade' as const, name: 'Sifter', desc: 'Faster sifting.' },
    { cat: 'scalePrecision' as const, name: 'Scale', desc: 'Bigger beaker capacity.' },
    { cat: 'maxOrders' as const, name: 'Contracts', desc: 'More simultaneous orders.' }
  ];

  const renderUpgradesLeft = () => (
    <div className="flex flex-col gap-2 h-full overflow-y-auto pr-2 custom-scrollbar">
      {upgradeDefs.map((up, i) => {
        const currentLevel = inventory.upgrades[up.cat] || 1;
        const costs = UPGRADE_COSTS[up.cat];
        const isMax = currentLevel >= costs.length;
        const nextCost = isMax ? 'MAX' : `${costs[currentLevel]}G`;
        return (
          <div 
            key={i} 
            className={`cursor-pointer flex justify-between gap-2 select-none transition-colors ${isMax ? 'text-white/30' : 'hover:text-cyan-300'}`}
            onMouseEnter={() => {
              setHoveredIndex(i);
              setHoveredItemText(`[Lvl ${currentLevel}] ${up.desc}`);
            }}
            onClick={() => !isMax && buyUpgrade(up.cat, up.name)}
          >
             <div className="flex items-center gap-2">
               <span className={`text-cyan-400 font-bold shrink-0 ${hoveredIndex === i ? 'opacity-100' : 'opacity-0'}`}>{'>'}</span>
               * {up.name}
             </div>
             <span>{nextCost}</span>
          </div>
        );
      })}
    </div>
  );

  const renderWorkersLeft = () => (
    <div className="flex flex-col gap-2 h-full overflow-y-auto pr-2 custom-scrollbar">
      {(inventory.workers || []).map((worker, i) => {
        const isHired = worker.hired;
        return (
          <div 
            key={i} 
            className="cursor-pointer flex justify-between gap-2 select-none hover:text-cyan-300 transition-colors"
            onMouseEnter={() => {
              setHoveredIndex(i);
              setHoveredItemText(`${worker.description} - Wage: ${worker.wage}G/8s`);
            }}
            onClick={() => toggleWorkerHire(worker.id)}
          >
             <div className="flex items-center gap-2">
               <span className={`text-cyan-400 font-bold shrink-0 ${hoveredIndex === i ? 'opacity-100' : 'opacity-0'}`}>{'>'}</span>
               * {worker.name} {isHired ? '[HIRED]' : ''}
             </div>
          </div>
        );
      })}
    </div>
  );

  const renderLeftPanel = () => {
    if (shopState === 'home') return dialogText.home.map((l, i) => <div key={i}>{l}</div>);
    if (shopState === 'talk') return dialogText.talk.map((l, i) => <div key={i}>{l}</div>);
    if (shopState === 'buy_ores') return renderOresLeft();
    if (shopState === 'buy_upgrades') return renderUpgradesLeft();
    if (shopState === 'buy_workers') return renderWorkersLeft();
  };

  const renderRightPanel = () => {
    if (shopState === 'home') return renderHomeRight();
    return (
      <div className="flex flex-col h-full">
        <div 
          className="cursor-pointer flex items-center gap-2 hover:text-cyan-300 select-none mb-4 transition-colors"
          onClick={() => { setShopState('home'); setHoveredIndex(0); setHoveredItemText(''); }}
          onMouseEnter={() => setHoveredIndex(-1)}
        >
           <span className={`text-cyan-400 font-bold ${hoveredIndex === -1 ? 'opacity-100' : 'opacity-0'}`}>{'>'}</span>
           Exit
        </div>
        <div className="text-[12px] leading-snug text-white/70 mt-auto pb-4">
          {hoveredItemText}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full" id="lab-shop-root">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: white; }
      `}</style>
      
      {/* Top Half: Visuals */}
      <div className="flex-1 bg-[#0a0a0f] relative border-b border-white/10 flex flex-col justify-end items-center overflow-hidden min-h-[250px]">
        {/* Pixel Wall Pattern */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-20" 
          style={{ 
            backgroundImage: 'linear-gradient(90deg, #050507 25%, transparent 25%, transparent 75%, #050507 75%, #050507), linear-gradient(90deg, #050507 25%, transparent 25%, transparent 75%, #050507 75%, #050507)', 
            backgroundSize: '40px 40px', 
            backgroundPosition: '0 0, 20px 20px' 
          }} 
        />
        
        {/* Decorations */}
        <div className="absolute top-4 left-4 text-4xl select-none opacity-80 drop-shadow-md">🕸️</div>
        
        {/* Shelf Left */}
        <div className="absolute top-16 left-12 flex flex-col items-center select-none hidden md:flex">
          <div className="flex gap-2 mb-[-5px] z-10 text-3xl drop-shadow-lg">
            <span className="animate-pulse">🔮</span>
            <span>📜</span>
            <span className="animate-pulse" style={{ animationDelay: '0.5s' }}>✨</span>
          </div>
          <div className="w-32 h-3 bg-[#050507] border-t border-b border-white/10 shadow-[0_4px_10px_rgba(0,0,0,0.5)]"></div>
        </div>

        {/* Shelf Right */}
        <div className="absolute top-24 right-16 flex flex-col items-center select-none hidden md:flex">
          <div className="flex gap-1 mb-[-5px] z-10 text-3xl items-end drop-shadow-lg">
            <span>📚</span>
            <span>🧪</span>
            <span>🌿</span>
          </div>
          <div className="w-36 h-3 bg-[#050507] border-t border-b border-white/10 shadow-[0_4px_10px_rgba(0,0,0,0.5)]"></div>
        </div>

        {/* Floating Sparkles */}
        <div className="absolute top-10 right-1/3 text-2xl select-none animate-ping text-yellow-300 opacity-50">✦</div>
        <div className="absolute top-32 left-1/4 text-xl select-none animate-ping text-cyan-300 opacity-50" style={{ animationDelay: '1s' }}>✦</div>

        {/* Shopkeeper */}
        <div className="relative flex flex-col items-center mt-auto">
          <div className="text-8xl select-none animate-bounce mb-[-10px] z-10 drop-shadow-xl" style={{ animationDuration: '2s' }}>
            🧙‍♂️
          </div>
          
          {/* Desk Items */}
          <div className="absolute bottom-[88px] left-2 text-4xl z-30 select-none drop-shadow-lg">🕯️</div>
          <div className="absolute bottom-[92px] right-2 text-4xl z-30 select-none animate-pulse drop-shadow-lg">🦉</div>

          {/* Box / Desk */}
          <div className="bg-[#050507] border-t border-l border-r border-cyan-500/30 w-72 h-24 flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.15)] relative z-20 overflow-hidden">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(6,182,212,0.5) 10px, rgba(6,182,212,0.5) 20px)' }}></div>
            <span className="font-mono text-2xl font-bold text-cyan-400 select-none z-10 relative tracking-widest drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]">
              *SANCTUM*
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Half: UI */}
      <div className="h-[250px] bg-[#0a0a0f] p-4 flex gap-4 font-mono text-white/80 text-lg uppercase border-t border-white/5">
        {/* Left Box (Dialog / List) */}
        <div className="flex-[2] border border-cyan-500/20 rounded p-4 flex flex-col justify-center relative bg-[#050507] shadow-inner">
          {renderLeftPanel()}
        </div>

        {/* Right Box (Menu / Exit) */}
        <div className="flex-1 border border-cyan-500/20 rounded p-4 flex flex-col justify-between relative bg-[#050507] shadow-inner">
          {renderRightPanel()}
          
          {/* Gold Display */}
          <div className="mt-auto pt-3 border-t border-cyan-500/20 flex justify-between items-center text-cyan-400 font-bold">
            <span>{inventory.coins}</span>
            <span>G</span>
          </div>
        </div>
      </div>
    </div>
  );
}
