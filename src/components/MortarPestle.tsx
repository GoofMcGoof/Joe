/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Pocket, ShieldAlert, Sparkles, MoveRight, HelpCircle } from 'lucide-react';
import { RawIngredient, PowderGrade, Inventory } from '../types';
import { RAW_INGREDIENTS } from '../data';
import { audio } from '../utils/audio';

interface MortarPestleProps {
  inventory: Inventory;
  updateInventory: (updater: (prev: Inventory) => Inventory) => void;
  onShowMessage: (text: string, type: 'success' | 'error' | 'info') => void;
}

export default function MortarPestle({ inventory, updateInventory, onShowMessage }: MortarPestleProps) {
  const [selectedId, setSelectedId] = useState<string>('coal');
  const [activeTab, setActiveTab] = useState<'grind' | 'sift'>('grind');
  
  // Grinding State
  const [isGrinding, setIsGrinding] = useState(false);
  const [grindProgress, setGrindProgress] = useState(0); // 0 to 100
  const [currentGrade, setCurrentGrade] = useState<PowderGrade>('Coarse');
  const [isCollected, setIsCollected] = useState(false);
  const [mortarLoaded, setMortarLoaded] = useState(false);
  const [chunkHealth, setChunkHealth] = useState(100);
  const [dustCount, setDustCount] = useState<Array<{ id: number; x: number; y: number; r: number; color: string }>>([]);
  const [pestlePos, setPestlePos] = useState({ x: 0, y: 0 });

  // Sifting State
  const [siftProgress, setSiftProgress] = useState(0);
  const [siftShakes, setSiftShakes] = useState(0);
  const [sieveLoadedId, setSieveLoadedId] = useState<string | null>(null);
  const [isSifting, setIsSifting] = useState(false);
  
  const mortarRef = useRef<HTMLDivElement>(null);
  const sieveRef = useRef<HTMLDivElement>(null);
  const lastMousePos = useRef<{ x: number; y: number; time: number } | null>(null);
  const nextParticleId = useRef(0);

  const selectedIngredient = RAW_INGREDIENTS.find(i => i.id === selectedId) || RAW_INGREDIENTS[0];

  // Initialize selected item on level unlock
  const availableIngredients = RAW_INGREDIENTS.filter(ing => {
    if (ing.id === 'coal' || ing.id === 'sulfur' || ing.id === 'saltpeter' || ing.id === 'rust') return true;
    if (ing.id === 'iron' || ing.id === 'aluminium') return inventory.level >= 2;
    if (ing.id === 'lumina' || ing.id === 'glowstone') return inventory.level >= 3;
    if (ing.id === 'cobalt') return inventory.level >= 5;
    if (ing.id === 'silver') return inventory.level >= 6;
    if (ing.id === 'mercury') return inventory.level >= 7;
    if (ing.id === 'plasma_ore' || ing.id === 'xenon_salt') return inventory.level >= 10;
    return false;
  });

  const upgradeGrindMultiplier = 1 + (inventory.upgrades.pestleSpeed - 1) * 0.35;
  const upgradeSiftMultiplier = 1 + (inventory.upgrades.sifterGrade - 1) * 0.4;

  const loadIngredient = () => {
    const stock = inventory.rawMaterials[selectedId] || 0;
    if (stock <= 0) {
      onShowMessage(`No stock of ${selectedIngredient.name}! Buy some from the Trader.`, 'error');
      return;
    }

    updateInventory(prev => ({
      ...prev,
      rawMaterials: {
        ...prev.rawMaterials,
        [selectedId]: prev.rawMaterials[selectedId] - 1
      }
    }));

    setChunkHealth(100);
    setGrindProgress(0);
    setCurrentGrade('Coarse');
    setDustCount([]);
    setMortarLoaded(true);
    setIsCollected(false);
    onShowMessage(`Loaded one ${selectedIngredient.name} into the Mortar. Let's grind!`, 'info');
    audio.playSpark();
  };

  // Drag and Pestle Movement Math for Grinding
  const handlePestleMove = (clientX: number, clientY: number) => {
    if (!mortarLoaded || isCollected) return;
    if (!mortarRef.current) return;

    const rect = mortarRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Calculate offset from center of mortar
    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Constrain pestle inside mortar radius (approx 85px)
    const maxRadius = 75;
    let finalX = dx;
    let finalY = dy;
    if (distance > maxRadius) {
      finalX = (dx / distance) * maxRadius;
      finalY = (dy / distance) * maxRadius;
    }
    
    setPestlePos({ x: finalX, y: finalY });

    // Calculate speed of dragging to play audio & grind
    const now = Date.now();
    if (lastMousePos.current) {
      const dt = now - lastMousePos.current.time;
      if (dt > 16) {
        const mx = clientX - lastMousePos.current.x;
        const my = clientY - lastMousePos.current.y;
        const distMoved = Math.sqrt(mx * mx + my * my);
        const speed = distMoved / dt; // pixels per ms

        if (speed > 0.05) {
          setIsGrinding(true);
          audio.startGrind();
          audio.setGrindIntensity(Math.min(1.0, speed * 2));

          // Progress calculation
          const grindCost = selectedIngredient.hardness;
          const energy = speed * 12 * upgradeGrindMultiplier;
          
          setChunkHealth(prev => {
            const next = Math.max(0, prev - energy / grindCost);
            if (next === 0 && grindProgress < 100) {
              setGrindProgress(p => {
                const newP = Math.min(100, p + energy / (grindCost * 1.5));
                // Add dust particles
                if (Math.random() > 0.4 && newP < 100) {
                  addDustParticles(3);
                }
                return newP;
              });
            }
            return next;
          });
        } else {
          audio.setGrindIntensity(0.01);
        }
      }
    }
    lastMousePos.current = { x: clientX, y: clientY, time: now };
  };

  const handlePestleLeave = () => {
    setIsGrinding(false);
    audio.stopGrind();
    lastMousePos.current = null;
  };

  const addDustParticles = (count: number) => {
    const newParticles = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 45;
      newParticles.push({
        id: nextParticleId.current++,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        r: Math.random() * 2.5 + 0.8,
        color: selectedIngredient.particleColor
      });
    }
    setDustCount(prev => [...prev, ...newParticles].slice(-160)); // limit max dust
  };

  const collectPowder = () => {
    if (grindProgress < 100) {
      onShowMessage("Keep grinding until the material is fully pulverized!", 'error');
      return;
    }

    // Determine weight yielded: random around 10g-15g
    const gramsYielded = Math.floor((10 + Math.random() * 5) * 10) / 10;

    updateInventory(prev => {
      const existing = prev.groundPowders[selectedId] || { grams: 0, grade: 'Coarse' };
      // Combining formulas: can combine or overwrite. We replace/add with Coarse grade initially
      return {
        ...prev,
        groundPowders: {
          ...prev.groundPowders,
          [selectedId]: {
            grams: Number((existing.grams + gramsYielded).toFixed(1)),
            grade: 'Coarse' // starts as coarse, must sift
          }
        },
        xp: prev.xp + 15
      };
    });

    setIsCollected(true);
    setMortarLoaded(false);
    onShowMessage(`Pulverized! Harvested ${gramsYielded}g of Coarse ${selectedIngredient.name} Powder. Go to Sift tab to refine it!`, 'success');
    audio.playCoin();
  };

  // Sifting Logic
  const handleSieveLoad = (id: string) => {
    const count = inventory.groundPowders[id]?.grams || 0;
    if (count <= 0) {
      onShowMessage(`No ground ${RAW_INGREDIENTS.find(i => i.id === id)?.name} powder available!`, 'error');
      return;
    }
    setSieveLoadedId(id);
    setSiftProgress(0);
    setSiftShakes(0);
    onShowMessage(`Loaded powder into Sieve. Shake/Click the Sieve rapidly to filter!`, 'info');
  };

  const shakeSieve = () => {
    if (!sieveLoadedId) return;
    setIsSifting(true);
    audio.playBubble(); // high register resonant click
    
    setSiftShakes(prev => {
      const next = prev + 1;
      const progressEarned = 3 * upgradeSiftMultiplier;
      setSiftProgress(p => {
        const nextP = Math.min(100, p + progressEarned);
        if (nextP === 100) {
          // Upgrade the grade of this powder!
          const ingName = RAW_INGREDIENTS.find(i => i.id === sieveLoadedId)?.name || 'Unknown';
          updateInventory(prevInv => {
            const current = prevInv.groundPowders[sieveLoadedId];
            if (!current) return prevInv;
            
            let nextGrade: PowderGrade = 'Coarse';
            if (current.grade === 'Coarse') nextGrade = 'Medium';
            else if (current.grade === 'Medium') nextGrade = 'Fine';
            else if (current.grade === 'Fine') nextGrade = 'Superfine';
            else nextGrade = 'Superfine';

            return {
              ...prevInv,
              groundPowders: {
                ...prevInv.groundPowders,
                [sieveLoadedId]: {
                  ...current,
                  grade: nextGrade
                }
              },
              xp: prevInv.xp + 10
            };
          });

          onShowMessage(`Refined! The powder is now upgraded to ${
            inventory.groundPowders[sieveLoadedId]?.grade === 'Coarse' ? 'Medium' :
            inventory.groundPowders[sieveLoadedId]?.grade === 'Medium' ? 'Fine' : 'Superfine'
          } grade!`, 'success');
          audio.playUnlock();
          return 0; // Reset progress for next tier of sifting
        }
        return nextP;
      });
      return next;
    });

    setTimeout(() => {
      setIsSifting(false);
    }, 150);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full p-1" id="powder-lab-root">
      {/* Tab Switcher and Controls */}
      <div className="lg:col-span-4 flex flex-col gap-4">
        <div className="bg-[#0a0a0f] border border-white/10 rounded-lg p-1.5 flex gap-2 shadow-inner">
          <button
            id="tab-grind-btn"
            onClick={() => setActiveTab('grind')}
            className={`flex-1 py-2 px-3 rounded font-sans font-semibold text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 border ${
              activeTab === 'grind'
                ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.25)]'
                : 'bg-transparent border-transparent text-white/50 hover:text-white'
            }`}
          >
            <Pocket className="w-3.5 h-3.5" />
            Grinding Mortar
          </button>
          <button
            id="tab-sift-btn"
            onClick={() => {
              setActiveTab('sift');
              audio.stopGrind();
            }}
            className={`flex-1 py-2 px-3 rounded font-sans font-semibold text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 border ${
              activeTab === 'sift'
                ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.25)]'
                : 'bg-transparent border-transparent text-white/50 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Sifting Sieve
          </button>
        </div>

        {/* Ingredients Selection Board */}
        <div className="bg-[#0a0a0f] border border-white/10 rounded-lg p-4 flex flex-col gap-3 flex-1 backdrop-blur-md">
          <div className="flex justify-between items-center pb-2 border-b border-white/10">
            <h3 className="font-display font-bold text-white uppercase tracking-wider text-xs">
              {activeTab === 'grind' ? 'Select Raw Material' : 'Ground Powders'}
            </h3>
            <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">
              {activeTab === 'grind' ? 'Needs grinding' : 'Needs filtering'}
            </span>
          </div>

          {activeTab === 'grind' ? (
            <div className="grid grid-cols-2 gap-2 overflow-y-auto max-h-[360px] pr-1">
              {availableIngredients.map(ing => {
                const stock = inventory.rawMaterials[ing.id] || 0;
                const isSelected = selectedId === ing.id;
                return (
                  <button
                    key={ing.id}
                    id={`ing-select-${ing.id}`}
                    onClick={() => {
                      setSelectedId(ing.id);
                      if (mortarLoaded && !isCollected) {
                        onShowMessage(`You currently have a session loaded in the Mortar. Complete it first!`, 'error');
                      }
                    }}
                    className={`p-3 rounded border text-left flex flex-col gap-2 transition-all relative overflow-hidden ${
                      isSelected
                        ? 'bg-cyan-950/30 border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.15)]'
                        : 'bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span
                        className="w-3.5 h-3.5 rounded-sm border border-white/15 shadow-md"
                        style={{ backgroundColor: ing.color }}
                      />
                      <span className="font-mono text-[9px] font-bold text-cyan-400 px-1.5 py-0.5 rounded bg-[#050507]">
                        x{stock}
                      </span>
                    </div>
                    <div>
                      <div className="font-sans font-bold text-xs text-white truncate">{ing.name}</div>
                      <div className="font-mono text-[9px] uppercase text-white/40 mt-1">Hardness: {ing.hardness}/10</div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col gap-2 overflow-y-auto max-h-[360px] pr-1">
              {Object.keys(inventory.groundPowders).length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs font-sans">
                  No ground powders yet.<br />Go grind some raw materials first!
                </div>
              ) : (
                Object.entries(inventory.groundPowders).map(([id, item]) => {
                  const ing = RAW_INGREDIENTS.find(i => i.id === id);
                  if (!ing) return null;
                  const isLoaded = sieveLoadedId === id;
                  return (
                    <div
                      key={id}
                    className={`p-3 rounded border flex justify-between items-center transition-all bg-white/5 border-white/5`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-3 h-3 rounded-sm border border-white/10"
                        style={{ backgroundColor: ing.particleColor }}
                      />
                      <div>
                        <div className="font-sans font-bold text-xs text-white">{ing.name}</div>
                        <div className="flex gap-2 items-center mt-0.5">
                          <span className="font-mono text-[10px] text-white/50 font-bold">{item.grams}g</span>
                          <span className={`text-[9px] font-mono uppercase px-1 rounded font-bold ${
                            item.grade === 'Coarse' ? 'bg-orange-500/25 text-orange-400' :
                            item.grade === 'Medium' ? 'bg-cyan-500/25 text-cyan-400' :
                            item.grade === 'Fine' ? 'bg-emerald-500/25 text-emerald-400' :
                            'bg-purple-500/25 text-purple-400'
                          }`}>
                            {item.grade}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {item.grade !== 'Superfine' ? (
                      <button
                        id={`sift-load-${id}`}
                        onClick={() => handleSieveLoad(id)}
                        disabled={item.grams <= 0}
                        className="p-1 px-2.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono uppercase hover:bg-cyan-500/20 hover:text-cyan-400 hover:border-cyan-500/50 transition-all text-white/80 disabled:opacity-30"
                      >
                        {isLoaded ? 'Loaded' : 'Sift'}
                      </button>
                    ) : (
                      <span className="text-[10px] text-cyan-400 font-mono tracking-wider italic pr-2">MAX GRADE</span>
                    )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Details & Tip Panel */}
          <div className="bg-gradient-to-br from-cyan-500/10 to-transparent p-4 rounded border border-white/5 mt-auto">
            <div className="flex gap-2 items-start text-xs text-white/60">
              <HelpCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div className="font-sans leading-relaxed text-[11px]">
                {activeTab === 'grind' ? (
                  <>
                    <strong className="text-cyan-400 font-bold">GRINDING METRICS:</strong> Place a raw mineral chunk into the bowl. Click and drag the pestle in rapid circular motions to pulverize into raw dust.
                  </>
                ) : (
                  <>
                    <strong className="text-cyan-400 font-bold">REFINERY METRICS:</strong> Sifting separates uneven grits to increase purity. Superfine grades maximize chemical reaction rates inside testing chambers.
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Interactive Workshop Chamber */}
      <div className="lg:col-span-8 flex flex-col gap-4">
        <div className="bg-[#0a0a0f] border border-white/10 rounded-lg p-6 flex flex-col items-center justify-center min-h-[480px] shadow-[inset_0_0_60px_rgba(0,0,0,0.8)] relative overflow-hidden flex-1">
          {/* Subtle grid background */}
          <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

          {activeTab === 'grind' ? (
            <div className="flex flex-col items-center w-full max-w-lg gap-6 z-10">
              {/* Mortar Loaded State Controller */}
              {!mortarLoaded ? (
                <div className="text-center py-10 flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded border-2 border-dashed border-white/15 flex items-center justify-center text-white/20">
                    <Pocket className="w-8 h-8 text-white/30 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-white text-base tracking-wide uppercase">{selectedIngredient.name}</h3>
                    <p className="text-white/40 text-xs mt-1.5 max-w-xs leading-relaxed font-sans">
                      {selectedIngredient.description}
                    </p>
                  </div>
                  <button
                    id="mortar-load-btn"
                    onClick={loadIngredient}
                    className="mt-2 px-5 py-2.5 rounded bg-cyan-500/20 border border-cyan-500/50 hover:bg-cyan-500/30 text-cyan-400 font-sans font-bold shadow-[0_0_15px_rgba(6,182,212,0.25)] active:scale-95 transition-all text-xs uppercase tracking-wider"
                  >
                    Load Chunk into Mortar
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center w-full gap-5">
                  <div className="flex justify-between w-full text-[10px] font-mono uppercase tracking-wider text-white/40 bg-black/40 p-2.5 rounded border border-white/5">
                    <div>Ore Hardness: <span className="text-cyan-400 font-bold">{selectedIngredient.hardness}/10</span></div>
                    <div>Pestle Speed: <span className="text-emerald-400 font-bold">x{upgradeGrindMultiplier.toFixed(1)}</span></div>
                  </div>

                  {/* Mortar Container */}
                  <div
                    id="mortar-bowl"
                    ref={mortarRef}
                    onMouseMove={(e) => handlePestleMove(e.clientX, e.clientY)}
                    onTouchMove={(e) => {
                      if (e.touches[0]) {
                        handlePestleMove(e.touches[0].clientX, e.touches[0].clientY);
                      }
                    }}
                    onMouseLeave={handlePestleLeave}
                    onTouchEnd={handlePestleLeave}
                    className="relative w-64 h-64 rounded-full bg-[#050507] border-[6px] border-white/10 flex items-center justify-center cursor-crosshair shadow-2xl shadow-black group overflow-hidden touch-none"
                  >
                    {/* Interior Shadow Bowl and Rim */}
                    <div className="absolute inset-2 rounded-full border border-white/5 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0a0a0f] via-slate-950 to-black pointer-events-none" />

                    {/* Ground Dust Render */}
                    <div className="absolute inset-0 pointer-events-none">
                      {dustCount.map(p => (
                        <div
                          key={p.id}
                          className="absolute rounded-full"
                          style={{
                            left: `calc(50% + ${p.x}px)`,
                            top: `calc(50% + ${p.y}px)`,
                            width: `${p.r}px`,
                            height: `${p.r}px`,
                            backgroundColor: p.color,
                            boxShadow: `0 0 1px ${p.color}`,
                            opacity: 0.8
                          }}
                        />
                      ))}
                    </div>

                    {/* Chunk Render */}
                    {chunkHealth > 0 && (
                      <motion.div
                        id="raw-chunk"
                        animate={{
                          scale: [1, 1.05, 1],
                          rotate: isGrinding ? [0, -3, 3, 0] : 0,
                          x: isGrinding ? [0, -1, 1, 0] : 0
                        }}
                        transition={{ duration: 0.2, repeat: isGrinding ? Infinity : 0 }}
                        className="w-16 h-16 rounded-xl relative z-10 flex items-center justify-center shadow-lg pointer-events-none"
                        style={{
                          backgroundColor: selectedIngredient.color,
                          boxShadow: `inset -6px -6px 12px rgba(0,0,0,0.5), 0 10px 20px rgba(0,0,0,0.4), 0 0 15px ${selectedIngredient.color}33`,
                          clipPath: 'polygon(20% 0%, 80% 10%, 100% 40%, 85% 90%, 15% 100%, 0% 50%)'
                        }}
                      >
                        {/* Crack Overlays */}
                        {chunkHealth < 75 && (
                          <div className="absolute inset-0 bg-black/20 mix-blend-multiply border-b border-black/40 pointer-events-none" style={{ clipPath: 'polygon(10% 50%, 90% 55%, 50% 90%)' }} />
                        )}
                        {chunkHealth < 40 && (
                          <div className="absolute inset-0 bg-black/35 mix-blend-multiply border-t border-black/40 pointer-events-none" style={{ clipPath: 'polygon(40% 10%, 60% 80%, 20% 70%)' }} />
                        )}
                        <span className="font-mono text-[10px] font-bold text-white/55">
                          {Math.ceil(chunkHealth)}%
                        </span>
                      </motion.div>
                    )}

                    {/* Pestle head drawing */}
                    <div
                      id="pestle-head"
                      className="absolute w-12 h-12 rounded-full border-2 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.4)] pointer-events-none z-20 transition-transform duration-75 ease-out"
                      style={{
                        transform: `translate(${pestlePos.x}px, ${pestlePos.y}px)`,
                        background: 'radial-gradient(circle, #22d3ee 20%, #0891b2 100%)',
                        boxShadow: '0 8px 24px rgba(6,182,212,0.4)'
                      }}
                    >
                      <div className="w-full h-full rounded-full border border-white/20 relative">
                        {/* Highlights */}
                        <div className="absolute top-1 left-2 w-3 h-3 rounded-full bg-white/45 filter blur-[0.5px]" />
                        {/* Pestle Handle sticking up vertically */}
                        <div className="absolute -top-12 left-4 w-4 h-12 bg-gradient-to-r from-cyan-800 to-[#0a0a0f] rounded-full opacity-60 border-t border-white/10" />
                      </div>
                    </div>
                  </div>

                  {/* Grinding Status Bars */}
                  <div className="w-full flex flex-col gap-2">
                    <div className="flex justify-between text-[10px] font-mono uppercase tracking-wider text-white/40">
                      <span>Status: <span className="font-bold text-white">{chunkHealth > 0 ? 'Breaking Chunk' : 'Pulverizing Dust'}</span></span>
                      <span className={grindProgress === 100 ? 'text-emerald-400' : 'text-cyan-400'}>{grindProgress === 100 ? '100% PULVERIZED' : `${Math.round(grindProgress)}%`}</span>
                    </div>
                    <div className="w-full bg-[#050507] rounded-full h-2 overflow-hidden border border-white/10">
                      <div
                        className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full transition-all duration-100 ease-out shadow-[0_0_8px_rgba(6,182,212,0.5)]"
                        style={{ width: `${chunkHealth > 0 ? (100 - chunkHealth) / 2 : 50 + grindProgress / 2}%` }}
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 w-full justify-center">
                    <button
                      id="scrap-mortar-btn"
                      onClick={() => {
                        setMortarLoaded(false);
                        onShowMessage(`Discarded material.`, 'info');
                      }}
                      className="px-4 py-2 border border-white/10 rounded hover:bg-white/5 text-white/40 hover:text-white text-xs font-mono uppercase transition-colors"
                    >
                      Scrap Batch
                    </button>
                    <button
                      id="collect-powder-btn"
                      onClick={collectPowder}
                      disabled={grindProgress < 100}
                      className={`px-6 py-2 rounded font-sans font-bold text-xs tracking-wider uppercase transition-all flex items-center gap-1.5 border ${
                        grindProgress === 100
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 hover:bg-emerald-500/30 hover:border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)] cursor-pointer'
                          : 'bg-white/5 border-white/5 text-white/20 cursor-not-allowed'
                      }`}
                    >
                      <MoveRight className="w-3.5 h-3.5" />
                      Collect Powder
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center w-full max-w-lg gap-6 z-10">
              {/* Sifter Loaded State Controller */}
              {!sieveLoadedId ? (
                <div className="text-center py-10 flex flex-col items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-slate-950/80 border border-slate-800 flex items-center justify-center text-slate-500 shadow-inner">
                    <Sparkles className="w-10 h-10 text-slate-600" />
                  </div>
                  <div>
                    <h3 className="font-sans font-bold text-slate-200">Sifting Station</h3>
                    <p className="text-slate-400 text-xs mt-1 max-w-xs leading-relaxed">
                      Refining your powders filter out un-crushed grits. Upgraded grades (Coarse → Medium → Fine → Superfine) unlock explosive reactive potency.
                    </p>
                  </div>
                  <p className="text-[11px] font-sans text-amber-500/80 italic">
                    💡 Load an eligible ground powder from the left panel to begin.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center w-full gap-5">
                  {/* Sieve loaded information */}
                  <div className="w-full flex justify-between items-center bg-black/40 p-3 rounded border border-white/15">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-sm border border-white/20 shadow"
                        style={{ backgroundColor: RAW_INGREDIENTS.find(i => i.id === sieveLoadedId)?.particleColor }}
                      />
                      <span className="font-sans font-bold text-white text-xs">
                        Refining {RAW_INGREDIENTS.find(i => i.id === sieveLoadedId)?.name}
                      </span>
                    </div>
                    <div className="flex gap-2 items-center text-xs font-mono">
                      <span className="text-white/40 uppercase text-[10px]">Current Grade:</span>
                      <span className="text-cyan-400 font-bold">
                        {inventory.groundPowders[sieveLoadedId]?.grade}
                      </span>
                    </div>
                  </div>

                  {/* Sieve Visual Shaker */}
                  <motion.div
                    id="sieve-shaker"
                    ref={sieveRef}
                    animate={{
                      x: isSifting ? [-15, 15, -12, 12, -8, 8, 0] : 0,
                      rotate: isSifting ? [-2, 2, -1.5, 1.5, 0] : 0
                    }}
                    transition={{ duration: 0.15 }}
                    onClick={shakeSieve}
                    className="relative w-56 h-36 rounded bg-[#050507] border-2 border-white/20 flex flex-col items-center justify-center cursor-pointer shadow-lg hover:border-cyan-500/50 hover:shadow-[0_0_15px_rgba(6,182,212,0.15)] transition-all"
                  >
                    {/* Metal mesh texture drawing */}
                    <div className="absolute inset-2 bg-[linear-gradient(rgba(139,92,26,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,26,0.15)_1px,transparent_1px)] bg-[size:4px_4px] pointer-events-none rounded" />
                    
                    {/* Sifting powder pile rendering inside sieve */}
                    <div className="absolute bottom-2 w-44 h-16 pointer-events-none opacity-85 rounded-full filter blur-[1px]"
                      style={{
                        backgroundColor: RAW_INGREDIENTS.find(i => i.id === sieveLoadedId)?.particleColor,
                        boxShadow: `0 0 10px ${RAW_INGREDIENTS.find(i => i.id === sieveLoadedId)?.particleColor}44`,
                        clipPath: 'polygon(10% 90%, 50% 10%, 90% 90%)'
                      }}
                    />

                    {/* Help overlay text */}
                    <span className="font-sans font-bold text-slate-400 text-[10px] uppercase tracking-wider select-none z-10 bg-slate-950/80 px-2 py-1 rounded border border-slate-800">
                      Click to Shake / Sift
                    </span>
                  </motion.div>

                  {/* Sifting progress bar */}
                  <div className="w-full flex flex-col gap-1.5">
                    <div className="flex justify-between text-[10px] font-mono uppercase tracking-wider text-white/40">
                      <span>Sifting Progress:</span>
                      <span className="text-cyan-400">{Math.round(siftProgress)}%</span>
                    </div>
                    <div className="w-full bg-[#050507] rounded-full h-2 overflow-hidden border border-white/10">
                      <div
                        className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full transition-all duration-100 ease-out shadow-[0_0_8px_rgba(6,182,212,0.4)]"
                        style={{ width: `${siftProgress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      id="sieve-unload-btn"
                      onClick={() => {
                        setSieveLoadedId(null);
                        onShowMessage(`Unloaded sieve.`, 'info');
                      }}
                      className="px-4 py-2 border border-white/10 rounded hover:bg-white/5 text-white/40 hover:text-white text-xs font-mono uppercase transition-colors"
                    >
                      Unload Sieve
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
