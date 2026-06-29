/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Pocket, 
  Beaker, 
  Sparkles, 
  ShoppingCart, 
  Mail, 
  Coins, 
  Trophy, 
  TrendingUp, 
  Flame,
  Info,
  CheckCircle,
  AlertCircle,
  BookOpen,
  AlertTriangle,
  Briefcase
} from 'lucide-react';
import { Inventory, ClientOrder } from './types';
import { INITIAL_ORDERS, LEVEL_UP_XP, ACHIEVEMENTS } from './data';
import MortarPestle from './components/MortarPestle';
import MixingStation from './components/MixingStation';
import SandboxChamber from './components/SandboxChamber';
import OrderBoard from './components/OrderBoard';
import LabShop from './components/LabShop';
import RefinementStation from './components/RefinementStation';
import RecipeJournal from './components/RecipeJournal';
import AchievementPanel from './components/AchievementPanel';
import RebirthStation from './components/RebirthStation';
import TaxEvasionTree from './components/TaxEvasionTree';
import { audio } from './utils/audio';

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<'workshop' | 'mixing' | 'refinement' | 'journal' | 'achievements' | 'rebirth' | 'skills' | 'sandbox' | 'orders' | 'shop'>('workshop');

  // Player State
  const [inventory, setInventory] = useState<Inventory>({
    coins: 120, // slightly boosted starting coins for labor testing
    xp: 0,
    level: 1,
    rawMaterials: {
      coal: 5,
      sulfur: 3,
      saltpeter: 2,
      rust: 2,
    },
    groundPowders: {},
    mixtures: [],
    unlockedRecipes: ['gunpowder'],
    upgrades: {
      pestleSpeed: 1,
      sifterGrade: 1,
      scalePrecision: 1,
      sandboxSize: 1,
      maxOrders: 1,
    },
    workers: [
      {
        id: 'apprentice_grinder',
        name: 'Barnaby the Grinder',
        role: 'grinder',
        avatar: '🧑‍🔬',
        hired: false,
        wage: 4,
        description: 'Automatically pulverizes 1 unit of raw material into 15g of Coarse powder every 8 seconds.',
        status: 'idle'
      },
      {
        id: 'master_sifter',
        name: 'Silvia the Sifter',
        role: 'sifter',
        avatar: '👩‍🔬',
        hired: false,
        wage: 7,
        description: 'Refines ground powders in storage up to higher sifting grades every 8 seconds.',
        status: 'idle'
      },
      {
        id: 'scavenger_miner',
        name: 'Grommet the Miner',
        role: 'miner',
        avatar: '⛏️',
        hired: false,
        wage: 10,
        description: 'Scavenges the outskirts to collect 1-2 random raw mineral units every 8 seconds.',
        status: 'idle'
      }
    ],
    recipeJournal: [],
    achievements: ACHIEVEMENTS,
    rebirths: 0,
    taxEvasionSkills: {
      assetProtection: 0,
      hiddenAssets: 0,
      creativeAccounting: 0,
    },
  });

  // Client Orders list
  const [orders, setOrders] = useState<ClientOrder[]>([]);
  
  // IRS Event State
  const [irsEvent, setIrsEvent] = useState<{ id: string; material: string; amount: number } | null>(null);
  const [showIrsModal, setShowIrsModal] = useState(false);

  // Cartel Event State
  const [cartelEvent, setCartelEvent] = useState<{ id: string; deadWorker: Worker; newWorker: Worker } | null>(null);
  const [showCartelModal, setShowCartelModal] = useState(false);

  // Notifications
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Initialize initial orders once on startup
  useEffect(() => {
    setOrders(INITIAL_ORDERS);
  }, []);

  // IRS Random Event Trigger (every 60s)
  useEffect(() => {
    const interval = setInterval(() => {
      // 1% chance
      if (Math.random() < 0.01 && !showIrsModal) {
        const materials = Object.keys(inventory.rawMaterials).filter(m => inventory.rawMaterials[m] > 0);
        if (materials.length > 0) {
          const material = materials[Math.floor(Math.random() * materials.length)];
          const amount = Math.ceil(inventory.rawMaterials[material] * 0.5); // seize 50%
          setIrsEvent({ id: Date.now().toString(), material, amount });
          setShowIrsModal(true);
          audio.playUnlock(); 
        }
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [inventory.rawMaterials, showIrsModal]);

  // Cartel Random Event Trigger (every 60s)
  useEffect(() => {
    const interval = setInterval(() => {
      // 5% chance, only if rebirths >= 10
      if (inventory.rebirths >= 10 && Math.random() < 0.05 && !showCartelModal) {
        const hiredWorkers = inventory.workers.filter(w => w.hired);
        if (hiredWorkers.length > 0) {
          const deadWorker = hiredWorkers[Math.floor(Math.random() * hiredWorkers.length)];
          
          const newNames = ['Pablo', 'El Jefe', 'Diego', 'Hector', 'Tuco', 'Gustavo', 'Lalo'];
          const newAvatars = ['🕴️', '🕶️', '👤', '🤠', '💀'];
          
          const newWorker: Worker = {
            id: 'cartel_' + Date.now().toString(),
            name: newNames[Math.floor(Math.random() * newNames.length)],
            role: deadWorker.role,
            avatar: newAvatars[Math.floor(Math.random() * newAvatars.length)],
            hired: true,
            wage: Math.max(1, Math.floor(deadWorker.wage * (Math.random() * 1.5 + 0.5))),
            description: "A suspicious individual sent by the cartel.",
            status: 'active'
          };

          setCartelEvent({ id: Date.now().toString(), deadWorker, newWorker });
          setShowCartelModal(true);
          audio.playError();
        }
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [inventory.rebirths, inventory.workers, showCartelModal]);

  // Hired worker background tick simulation (every 8 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      setInventory(prev => {
        const hiredWorkers = prev.workers.filter(w => w.hired);
        if (hiredWorkers.length === 0) return prev;

        const totalWages = hiredWorkers.reduce((sum, w) => sum + w.wage, 0);

        // Check if player has enough coins to pay wages
        if (prev.coins < totalWages) {
          // Workers strike!
          const updatedWorkers = prev.workers.map(w => {
            if (w.hired) {
              return { ...w, status: 'striking' as const };
            }
            return w;
          });

          setTimeout(() => {
            triggerToast("⚠️ WORKERS ON STRIKE! You cannot afford their wages.", "error");
          }, 50);

          return {
            ...prev,
            workers: updatedWorkers
          };
        }

        // Pay wages
        let nextCoins = prev.coins - totalWages;
        const updatedWorkers = [...prev.workers];
        const updatedRawMaterials = { ...prev.rawMaterials };
        const updatedGroundPowders = { ...prev.groundPowders };

        let workerReports: string[] = [];

        // Execute worker actions
        updatedWorkers.forEach(worker => {
          if (!worker.hired) return;
          worker.status = 'active' as const;

          if (worker.id === 'apprentice_grinder') {
            // Find a raw material with stock >= 1
            const candidates = Object.keys(updatedRawMaterials).filter(key => updatedRawMaterials[key] >= 1);
            if (candidates.length > 0) {
              // Choose highest quantity candidate to grind
              const targetKey = candidates.reduce((maxKey, curKey) => 
                updatedRawMaterials[curKey] > updatedRawMaterials[maxKey] ? curKey : maxKey
              , candidates[0]);

              updatedRawMaterials[targetKey] -= 1;
              const currentGround = updatedGroundPowders[targetKey] || { grams: 0, grade: 'Coarse' };
              updatedGroundPowders[targetKey] = {
                grams: Number((currentGround.grams + 15).toFixed(1)),
                grade: currentGround.grade // Keep current or default to coarse
              };
              workerReports.push(`${worker.avatar} Barnaby ground 1x raw material into Coarse powder.`);
            } else {
              worker.status = 'idle' as const;
            }
          }

          if (worker.id === 'master_sifter') {
            const gradesOrder: ('Coarse' | 'Medium' | 'Fine' | 'Superfine')[] = ['Coarse', 'Medium', 'Fine', 'Superfine'];
            // Find a ground powder that is not yet Superfine
            const upgradeCandidates = Object.keys(updatedGroundPowders).filter(key => {
              const currentGrade = updatedGroundPowders[key].grade;
              return currentGrade !== 'Superfine';
            });

            if (upgradeCandidates.length > 0) {
              const targetKey = upgradeCandidates[Math.floor(Math.random() * upgradeCandidates.length)];
              const current = updatedGroundPowders[targetKey];
              const currentIndex = gradesOrder.indexOf(current.grade);
              const nextGrade = gradesOrder[currentIndex + 1];
              
              updatedGroundPowders[targetKey] = {
                ...current,
                grade: nextGrade
              };
              workerReports.push(`${worker.avatar} Silvia refined your powder to ${nextGrade} sifting.`);
            } else {
              worker.status = 'idle' as const;
            }
          }

          if (worker.id === 'scavenger_miner') {
            // Get raw materials unlocked for level
            const allowedIngs = ['coal', 'sulfur', 'saltpeter', 'rust'];
            if (prev.level >= 2) allowedIngs.push('iron', 'aluminium');
            if (prev.level >= 3) allowedIngs.push('lumina', 'glowstone');
            if (prev.level >= 10) allowedIngs.push('plasma_ore', 'xenon_salt');

            const minedIng = allowedIngs[Math.floor(Math.random() * allowedIngs.length)];
            const minedCount = Math.random() < 0.3 ? 2 : 1;
            updatedRawMaterials[minedIng] = (updatedRawMaterials[minedIng] || 0) + minedCount;
            workerReports.push(`${worker.avatar} Grommet scavenged +${minedCount} raw materials.`);
          }
        });

        setTimeout(() => {
          triggerToast(`💼 Paid ${totalWages}💰 wages. Workers completed automated tasks!`, "info");
        }, 50);

        return {
          ...prev,
          coins: nextCoins,
          workers: updatedWorkers,
          rawMaterials: updatedRawMaterials,
          groundPowders: updatedGroundPowders
        };
      });
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  // Check achievements
  useEffect(() => {
    let changed = false;
    const newAchievements = inventory.achievements.map(ach => {
      if (ach.unlocked) return ach;
      
      let unlocked = false;
      if (ach.id === 'apprentice' && inventory.level >= 2) unlocked = true;
      if (ach.id === 'first_mixture' && inventory.mixtures.length > 0) unlocked = true;
      if (ach.id === 'millionaire' && inventory.coins >= 1000) unlocked = true;
      if (ach.id === 'master_refiner' && Object.values(inventory.groundPowders).some((p: any) => p.grade === 'Transmuted')) unlocked = true;
      
      if (unlocked) {
        changed = true;
        setToast({ text: `Achievement Unlocked: ${ach.name}!`, type: 'success' });
        return { ...ach, unlocked: true, unlockedAt: Date.now() };
      }
      return ach;
    });

    if (changed) {
      setInventory(prev => ({ ...prev, achievements: newAchievements }));
    }
  }, [inventory.level, inventory.mixtures.length, inventory.coins, inventory.groundPowders, inventory.achievements]);

  const triggerToast = (text: string, type: 'success' | 'error' | 'info') => {
    setToast({ text, type });
  };

  const stopSeizure = () => {
    // Check if any tax evasion skill point > 0
    const { assetProtection, hiddenAssets, creativeAccounting } = inventory.taxEvasionSkills;
    if (assetProtection + hiddenAssets + creativeAccounting > 0) {
      // Find one and decrement
      let updatedSkills = { ...inventory.taxEvasionSkills };
      if (assetProtection > 0) updatedSkills.assetProtection -= 1;
      else if (hiddenAssets > 0) updatedSkills.hiddenAssets -= 1;
      else updatedSkills.creativeAccounting -= 1;

      updateInventory(prev => ({
        ...prev,
        taxEvasionSkills: updatedSkills
      }));
      triggerToast("IRS Audit stopped by illicit maneuvers!", "success");
    } else {
        triggerToast("Not enough skill points to stop the IRS!", "error");
        acceptSeizure();
        return;
    }
    setShowIrsModal(false);
  };

  const acceptSeizure = () => {
    if (!irsEvent) return;
    updateInventory(prev => {
        return {
            ...prev,
            rawMaterials: {
                ...prev.rawMaterials,
                [irsEvent.material]: Math.max(0, prev.rawMaterials[irsEvent.material] - irsEvent.amount)
            }
        };
    });
    triggerToast(`IRS seized ${irsEvent.amount} ${irsEvent.material}!`, "error");
    setShowIrsModal(false);
  };

  const acceptCartelAction = () => {
    if (!cartelEvent) return;
    
    updateInventory(prev => {
      const updatedWorkers = prev.workers.filter(w => w.id !== cartelEvent.deadWorker.id);
      updatedWorkers.push(cartelEvent.newWorker);
      return {
        ...prev,
        workers: updatedWorkers
      };
    });
    
    triggerToast(`The cartel "replaced" ${cartelEvent.deadWorker.name}.`, "error");
    setShowCartelModal(false);
    setCartelEvent(null);
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Level Up logic checker
  const checkLevelUp = (currentXp: number) => {
    let nextLvl = inventory.level;
    while (nextLvl < LEVEL_UP_XP.length && currentXp >= LEVEL_UP_XP[nextLvl]) {
      nextLvl++;
    }

    if (nextLvl > inventory.level) {
      setInventory(prev => ({
        ...prev,
        level: nextLvl
      }));

      // Play special unlock notification
      setTimeout(() => {
        audio.playUnlock();
        let unlockText = "";
        if (nextLvl === 2) {
          unlockText = "Unlocked raw Iron Ore, Aluminium Scrap, and custom Sandbox Gravity directions!";
        } else if (nextLvl === 3) {
          unlockText = "Unlocked glowing Lumina Flower & green Glowstone Shards!";
        } else if (nextLvl === 10) {
          unlockText = "CRITICAL ALCHEMY RANK! Unlocked volatile Plasma Ore, custom Xenon Salt, interstellar formulas, and lucrative RICH VIP CLIENT contracts!";
        } else {
          unlockText = "XP bonus rewarded and maximum lab grade status increased!";
        }
        triggerToast(`🎉 LEVEL UP! You are now Level ${nextLvl}! ${unlockText}`, 'success');
      }, 600);
    }
  };

  // Helper utility to safely update deep state
  const updateInventory = (updater: (prev: Inventory) => Inventory) => {
    setInventory(prev => {
      const next = updater(prev);
      return next;
    });
  };

  const getXpProgress = () => {
    const currentLvl = inventory.level;
    const base = LEVEL_UP_XP[currentLvl - 1] || 0;
    const nextGoal = LEVEL_UP_XP[currentLvl] || 99999;
    const earned = inventory.xp - base;
    const needed = nextGoal - base;
    return Math.min(100, Math.max(0, (earned / needed) * 100));
  };

  return (
    <div className="min-h-screen bg-[#050507] text-[#e0e0e0] flex flex-col selection:bg-cyan-500 selection:text-slate-950 font-sans relative overflow-x-hidden" id="app-wrapper">
      
      {/* Visual Ambient Gloom Background effects */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-cyan-500/5 filter blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-emerald-500/5 filter blur-[120px] pointer-events-none" />

      {/* Primary Header */}
      <header className="h-16 flex items-center border-b border-white/10 bg-[#0a0a0f] sticky top-0 z-50 px-6" id="main-header">
        <div className="max-w-7xl w-full mx-auto flex justify-between items-center gap-4">
          
          {/* Logo Title */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-sm border-2 border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)] flex items-center justify-center text-cyan-500 font-bold italic font-display">P</div>
            <div>
              <h1 className="font-display font-black tracking-tighter uppercase italic text-white text-lg leading-none">
                POWDER<span className="text-cyan-500 font-bold">LAB</span>
              </h1>
              <p className="text-[9px] font-mono text-white/40 mt-0.5 uppercase tracking-widest">
                Industrial Alchemy & Sand Sandbox
              </p>
            </div>
          </div>

          {/* Player stats bar */}
          <div className="flex items-center gap-6 text-xs font-mono tracking-wider">
            
            {/* Level and XP progress bar */}
            <div className="flex items-center gap-3 bg-[#050507] border border-white/5 p-1.5 px-3 rounded-md">
              <div className="text-cyan-400 font-bold font-display uppercase tracking-wider text-[10px]">
                LVL {inventory.level}
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] text-white/40 font-mono uppercase leading-none">
                  XP: {inventory.xp}/{LEVEL_UP_XP[inventory.level] || 'MAX'}
                </span>
                <div className="w-20 bg-white/5 rounded-full h-1 mt-1 overflow-hidden">
                  <div
                    className="bg-cyan-500 h-full transition-all duration-300 shadow-[0_0_8px_rgba(6,182,212,0.8)]"
                    style={{ width: `${getXpProgress()}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Coins indicator */}
            <div className="flex flex-col items-end">
              <span className="text-white/40 text-[9px] uppercase tracking-widest">CREDITS</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1 font-mono">
                {inventory.coins} <span className="text-[10px] text-emerald-500/80">⛃</span>
              </span>
            </div>

            {/* Simulation Status */}
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-white/40 text-[9px] uppercase tracking-widest">SIMULATION</span>
              <span className="text-cyan-400 font-bold">STABLE</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main body navigation and content pane */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col gap-6" id="main-content-pane">
        
        {/* Navigation Tabs Bar */}
        <nav className="flex flex-wrap gap-2 border-b border-white/10 pb-3" id="navigation-tabs">
          {[
            { id: 'workshop' as const, label: 'Grinding Mortar', icon: Pocket },
            { id: 'mixing' as const, label: 'Mixing Scale', icon: Beaker },
            { id: 'refinement' as const, label: 'Refinement', icon: Sparkles },
            { id: 'journal' as const, label: 'Recipe Journal', icon: BookOpen },
            { id: 'achievements' as const, label: 'Achievements', icon: Trophy },
            { id: 'rebirth' as const, label: 'IRS Tax Audit', icon: AlertTriangle },
            { id: 'skills' as const, label: 'Tax Evasion', icon: Briefcase },
            { id: 'sandbox' as const, label: 'Testing Chamber', icon: Sparkles },
            { id: 'orders' as const, label: 'Client Orders', icon: Mail },
            { id: 'shop' as const, label: 'Trader & Upgrades', icon: ShoppingCart },
          ].map((tab) => {
            const ActiveIcon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`nav-tab-${tab.id}`}
                onClick={() => {
                  setActiveTab(tab.id);
                  audio.playSpark();
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded font-sans font-semibold text-xs tracking-wider uppercase transition-all duration-150 border ${
                  active
                    ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.25)]'
                    : 'bg-white/5 border-white/5 text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                <ActiveIcon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Content Tabs Zone */}
        <div className="flex-1 min-h-[500px]" id="component-container">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              {activeTab === 'workshop' && (
                <MortarPestle
                  inventory={inventory}
                  updateInventory={updateInventory}
                  onShowMessage={triggerToast}
                />
              )}
              {activeTab === 'mixing' && (
                <MixingStation
                  inventory={inventory}
                  updateInventory={updateInventory}
                  onShowMessage={triggerToast}
                />
              )}
              {activeTab === 'refinement' && (
                <RefinementStation
                  inventory={inventory}
                  updateInventory={updateInventory}
                  onShowMessage={triggerToast}
                />
              )}
              {activeTab === 'journal' && (
                <RecipeJournal
                  inventory={inventory}
                  updateInventory={updateInventory}
                  onShowMessage={triggerToast}
                />
              )}
              {activeTab === 'achievements' && (
                <AchievementPanel inventory={inventory} />
              )}
              {activeTab === 'rebirth' && (
                <RebirthStation
                  inventory={inventory}
                  updateInventory={updateInventory}
                  onShowMessage={triggerToast}
                />
              )}
              {activeTab === 'skills' && (
                <TaxEvasionTree
                  inventory={inventory}
                  updateInventory={updateInventory}
                  onShowMessage={triggerToast}
                />
              )}
              {activeTab === 'sandbox' && (
                <SandboxChamber
                  inventory={inventory}
                  updateInventory={updateInventory}
                  onShowMessage={triggerToast}
                />
              )}
              {activeTab === 'orders' && (
                <OrderBoard
                  inventory={inventory}
                  updateInventory={updateInventory}
                  orders={orders}
                  setOrders={setOrders}
                  onShowMessage={triggerToast}
                  checkLevelUp={checkLevelUp}
                />
              )}
              {activeTab === 'shop' && (
                <LabShop
                  inventory={inventory}
                  updateInventory={updateInventory}
                  onShowMessage={triggerToast}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Global Toast Feedback Card */}
      <AnimatePresence>
        {toast && (
          <motion.div
            id="system-toast"
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 max-w-sm"
          >
            <div className={`p-4 rounded border flex items-start gap-3 shadow-[0_0_20px_rgba(0,0,0,0.5)] backdrop-blur-md ${
              toast.type === 'success' ? 'bg-[#0a0a0f]/95 border-emerald-500/50 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)]' :
              toast.type === 'error' ? 'bg-[#0a0a0f]/95 border-rose-500/50 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.15)]' :
              'bg-[#0a0a0f]/95 border-cyan-500/50 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
            }`}>
              {toast.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : toast.type === 'error' ? (
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              ) : (
                <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
              )}
              <div>
                <span className="font-sans font-medium text-xs text-white leading-relaxed">
                  {toast.text}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* IRS Seizure Modal */}
      {showIrsModal && irsEvent && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#0a0a0f] border border-red-900/50 p-6 rounded-lg shadow-[0_0_30px_rgba(220,38,38,0.2)] max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4 text-red-500">
              <AlertTriangle className="w-8 h-8" />
              <h2 className="font-display font-bold uppercase tracking-wider">IRS AUDIT!</h2>
            </div>
            <p className="text-sm text-white/70 mb-6">
              The IRS is seizing 50% of your <span className="text-red-400 font-bold">{irsEvent.material}</span>! 
              You can stop this by spending 1 Tax Evasion skill point.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={stopSeizure}
                className="flex-1 px-4 py-2 bg-red-900/20 border border-red-500/50 text-red-400 rounded hover:bg-red-900/40 text-xs font-mono transition-all"
              >
                Spend Skill Point
              </button>
              <button 
                onClick={acceptSeizure}
                className="flex-1 px-4 py-2 bg-white/5 border border-white/10 text-white/60 rounded hover:bg-white/10 text-xs font-mono transition-all"
              >
                Let them seize
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cartel Event Modal */}
      {showCartelModal && cartelEvent && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#0a0a0f] border border-purple-900/50 p-6 rounded-lg shadow-[0_0_30px_rgba(168,85,247,0.2)] max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4 text-purple-500">
              <span className="text-2xl">💀</span>
              <h2 className="font-display font-bold uppercase tracking-wider">THE CARTEL VISITS...</h2>
            </div>
            <p className="text-sm text-white/70 mb-6">
              Those shady deals caught up with you. The cartel took out <span className="text-red-400 font-bold">{cartelEvent.deadWorker.name}</span>!
              <br/><br/>
              They left <span className="text-purple-400 font-bold">{cartelEvent.newWorker.name}</span> {cartelEvent.newWorker.avatar} in their place.
              <br/>
              <span className="text-xs text-white/50 block mt-2">Wage: {cartelEvent.newWorker.wage} coins per tick.</span>
            </p>
            <div className="flex gap-3">
              <button 
                onClick={acceptCartelAction}
                className="w-full px-4 py-2 bg-purple-900/20 border border-purple-500/50 text-purple-400 rounded hover:bg-purple-900/40 text-xs font-mono transition-all"
              >
                Acknowledge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Immersive Diagnostics Footer */}
      <footer className="h-10 bg-[#050507] px-8 flex items-center justify-between border-t border-white/5 text-[9px] font-mono tracking-widest text-white/30" id="main-footer">
        <div className="flex space-x-6">
          <span className="uppercase">CPU LOAD: 12.4%</span>
          <span className="uppercase">MEMORY: 412MB</span>
          <span className="uppercase hidden md:inline">POWDER LAB SECURE CORE v0.8.2 // ONLINE</span>
        </div>
        <div className="text-cyan-500/40 font-mono">v0.8.2-delta // session_active</div>
      </footer>
    </div>
  );
}
