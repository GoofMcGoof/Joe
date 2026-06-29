/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Scale, Beaker, HelpCircle, Check, Play, ChevronRight, RefreshCw, Sparkles, Lightbulb } from 'lucide-react';
import { Inventory, Mixture, PowderGrade, Recipe } from '../types';
import { RAW_INGREDIENTS, RECIPES } from '../data';
import { audio } from '../utils/audio';

interface MixingStationProps {
  inventory: Inventory;
  updateInventory: (updater: (prev: Inventory) => Inventory) => void;
  onShowMessage: (text: string, type: 'success' | 'error' | 'info') => void;
}

export default function MixingStation({ inventory, updateInventory, onShowMessage }: MixingStationProps) {
  // Beaker content: Record of ingredientId -> grams poured
  const [beakerGrams, setBeakerGrams] = useState<Record<string, number>>({});
  const [isStirring, setIsStirring] = useState(false);
  const [customName, setCustomName] = useState('');
  const [matchingRecipe, setMatchingRecipe] = useState<Recipe | null>(null);

  // Upgrade constraints
  const maxBeakerCapacity = inventory.upgrades.scalePrecision === 1 ? 50 : inventory.upgrades.scalePrecision === 2 ? 100 : 200;
  const scalePrecisionStep = inventory.upgrades.scalePrecision === 1 ? 1 : inventory.upgrades.scalePrecision === 2 ? 0.5 : 0.1;

  // Calculate current totals
  const totalGramsInBeaker = Number(
    (Object.values(beakerGrams) as number[]).reduce((sum: number, g: number) => sum + g, 0).toFixed(2)
  );

  const pourPowder = (ingId: string, grams: number) => {
    const available = inventory.groundPowders[ingId]?.grams || 0;
    const currentInBeaker = beakerGrams[ingId] || 0;

    if (grams > 0) {
      // Check stock limits
      if (currentInBeaker + grams > available) {
        onShowMessage(`Not enough ground ${RAW_INGREDIENTS.find(i => i.id === ingId)?.name}! You only have ${available.toFixed(1)}g total.`, 'error');
        return;
      }
      // Check beaker capacity
      if (totalGramsInBeaker + grams > maxBeakerCapacity) {
        onShowMessage(`Beaker overflowing! Max capacity is ${maxBeakerCapacity}g. Upgrade your Scale to hold more!`, 'error');
        return;
      }
    } else {
      // Pouring back / removing
      if (currentInBeaker + grams < 0) {
        return; // can't go negative
      }
    }

    setBeakerGrams(prev => {
      const nextGrams = Number(( (prev[ingId] || 0) + grams ).toFixed(2));
      const updated = { ...prev, [ingId]: nextGrams };
      if (nextGrams <= 0) {
        delete updated[ingId];
      }
      checkMatches(updated);
      return updated;
    });

    audio.playBubble();
  };

  const clearBeaker = () => {
    setBeakerGrams({});
    setMatchingRecipe(null);
    setCustomName('');
    onShowMessage("Beaker emptied. All materials reclaimed.", "info");
    audio.playSpark();
  };

  const checkMatches = (currentBeaker: Record<string, number>) => {
    const sum = Object.values(currentBeaker).reduce((a, b) => a + b, 0);
    if (sum <= 0) {
      setMatchingRecipe(null);
      return;
    }

    // Convert beaker to proportions
    const ratios: Record<string, number> = {};
    Object.entries(currentBeaker).forEach(([id, grams]) => {
      ratios[id] = grams / sum;
    });

    // Check against all recipes
    let found: Recipe | null = null;
    for (const recipe of RECIPES) {
      let match = true;
      
      // All ingredients in recipe must match beaker proportions within tolerance
      const recipeIngredients = Object.keys(recipe.requiredRatios);
      const beakerIngredients = Object.keys(ratios);

      // Must have the exact same set of ingredients
      if (recipeIngredients.length !== beakerIngredients.length) {
        continue;
      }

      for (const ingId of recipeIngredients) {
        const expected = recipe.requiredRatios[ingId];
        const actual = ratios[ingId] || 0;
        if (Math.abs(expected - actual) > recipe.tolerance) {
          match = false;
          break;
        }
      }

      if (match) {
        found = recipe;
        break;
      }
    }

    setMatchingRecipe(found);
  };

  // Auto-fill beaker using ratios for an unlocked/discovered recipe
  const fillRecipeShortcut = (recipe: Recipe) => {
    clearBeaker();
    
    // We want to fill 30g
    const targetGrams = 30;
    const itemsToPour: Record<string, number> = {};
    
    // Check if we have enough stock for each
    let hasEnough = true;
    for (const [ingId, ratio] of Object.entries(recipe.requiredRatios)) {
      const needed = Number((targetGrams * ratio).toFixed(1));
      const available = inventory.groundPowders[ingId]?.grams || 0;
      if (available < needed) {
        hasEnough = false;
        onShowMessage(`Missing ingredients! Need ${needed}g of ground ${RAW_INGREDIENTS.find(i => i.id === ingId)?.name}, only have ${available.toFixed(1)}g.`, 'error');
        break;
      }
      itemsToPour[ingId] = needed;
    }

    if (hasEnough) {
      setBeakerGrams(itemsToPour);
      setMatchingRecipe(recipe);
      onShowMessage(`Loaded formula ratios for ${recipe.name}!`, 'success');
      audio.playUnlock();
    }
  };

  const stirAndSynthesize = () => {
    if (totalGramsInBeaker <= 0) {
      onShowMessage("Pour some powders into the beaker first!", 'error');
      return;
    }

    setIsStirring(true);
    audio.playSizzle(true);

    setTimeout(() => {
      setIsStirring(false);
      audio.playSizzle(false);

      // Perform synthesis
      const finalGrams = totalGramsInBeaker;
      const beakerSnapshot = beakerGrams as Record<string, number>;

      // Subtract items from inventory
      updateInventory(prev => {
        const updatedGround = { ...prev.groundPowders };
        (Object.entries(beakerSnapshot) as [string, number][]).forEach(([ingId, grams]) => {
          if (updatedGround[ingId]) {
            updatedGround[ingId].grams = Number((updatedGround[ingId].grams - grams).toFixed(2));
            if (updatedGround[ingId].grams <= 0) {
              delete updatedGround[ingId];
            }
          }
        });

        // Determine quality grade: Lowest grade of all inputs
        let lowestGrade: PowderGrade = 'Superfine';
        Object.keys(beakerSnapshot).forEach(ingId => {
          const itemGrade = prev.groundPowders[ingId]?.grade || 'Coarse';
          if (itemGrade === 'Coarse') lowestGrade = 'Coarse';
          else if (itemGrade === 'Medium' && lowestGrade !== 'Coarse') lowestGrade = 'Medium';
          else if (itemGrade === 'Fine' && lowestGrade !== 'Coarse' && lowestGrade !== 'Medium') lowestGrade = 'Fine';
        });

        // Calculate blended color (weighted average)
        let rSum = 0, gSum = 0, bSum = 0;
        (Object.entries(beakerSnapshot) as [string, number][]).forEach(([ingId, grams]) => {
          const ing = RAW_INGREDIENTS.find(i => i.id === ingId);
          if (ing) {
            // simple hex to rgb
            const hex = ing.particleColor.replace('#', '');
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            rSum += r * (grams / finalGrams);
            gSum += g * (grams / finalGrams);
            bSum += b * (grams / finalGrams);
          }
        });

        const blendedColor = `rgb(${Math.round(rSum)}, ${Math.round(gSum)}, ${Math.round(bSum)})`;

        // Calculate dynamic properties
        const coalProportion = ((beakerSnapshot['coal'] || 0) as number) / finalGrams;
        const sulfurProportion = ((beakerSnapshot['sulfur'] || 0) as number) / finalGrams;
        const saltpeterProportion = ((beakerSnapshot['saltpeter'] || 0) as number) / finalGrams;
        const ironProportion = ((beakerSnapshot['iron'] || 0) as number) / finalGrams;
        const rustProportion = ((beakerSnapshot['rust'] || 0) as number) / finalGrams;
        const alumProportion = ((beakerSnapshot['aluminium'] || 0) as number) / finalGrams;
        const luminaProportion = ((beakerSnapshot['lumina'] || 0) as number) / finalGrams;
        const phosphorProportion = ((beakerSnapshot['glowstone'] || 0) as number) / finalGrams;
        const plasmaProportion = ((beakerSnapshot['plasma_ore'] || 0) as number) / finalGrams;
        const xenonProportion = ((beakerSnapshot['xenon_salt'] || 0) as number) / finalGrams;

        // Base properties
        const flammability = Math.min(1.0, (coalProportion * 0.4 + sulfurProportion * 0.8 + alumProportion * 0.9 + plasmaProportion * 1.0) * (1.0 + (saltpeterProportion + xenonProportion) * 1.5));
        const conductivity = ironProportion;
        const antiGravity = Math.min(1.0, luminaProportion + xenonProportion * 0.9);
        const growthFactor = Math.min(1.0, (coalProportion * 0.3 + luminaProportion * 0.7));

        // Explosiveness needs fuel + oxidizer/catalyst
        let explosiveness = 0;
        const totalOxidizers = saltpeterProportion + xenonProportion;
        if (totalOxidizers > 0.05) {
          const fuels = coalProportion + sulfurProportion + alumProportion + plasmaProportion * 1.4;
          explosiveness = Math.min(1.0, fuels * 1.3 * (totalOxidizers * 3.5));
        }

        const flashPotential = (sulfurProportion > 0.3 && alumProportion > 0.3) || plasmaProportion > 0.4;
        const reactiveThermite = rustProportion > 0.5 && alumProportion > 0.2;

        const isGlow = luminaProportion > 0.15 || phosphorProportion > 0.15 || plasmaProportion > 0.15 || xenonProportion > 0.15;
        
        let glowColor = '#39ff14'; // default green
        if (luminaProportion > phosphorProportion && luminaProportion > plasmaProportion && luminaProportion > xenonProportion) {
          glowColor = '#00f5ff'; // cyan
        } else if (plasmaProportion > luminaProportion && plasmaProportion > phosphorProportion && plasmaProportion > xenonProportion) {
          glowColor = '#ff2a2a'; // volatile fiery red
        } else if (xenonProportion > luminaProportion && xenonProportion > phosphorProportion && xenonProportion > plasmaProportion) {
          glowColor = '#b794f4'; // deep magical violet
        }

        // Mixture ID
        const mixId = `mixture_${Date.now()}`;
        const nameOfMix = matchingRecipe ? matchingRecipe.name : (customName.trim() || `Custom Blend #${prev.mixtures.length + 1}`);

        const newMixture: Mixture = {
          id: mixId,
          name: nameOfMix,
          proportions: beakerSnapshot,
          grams: finalGrams,
          color: blendedColor,
          grade: lowestGrade,
          properties: {
            flammability,
            explosiveness,
            conductivity,
            antiGravity,
            glow: isGlow,
            glowColor: isGlow ? glowColor : undefined,
            growthFactor,
            reactiveThermite,
            flashPotential,
          }
        };

        // Grant XP bonuses if matching a recipe
        const recipeXpReward = matchingRecipe ? matchingRecipe.rewardXp : 20;

        onShowMessage(`Synthesized ${finalGrams.toFixed(1)}g of "${nameOfMix}" at ${lowestGrade} grade!`, 'success');
        audio.playUnlock();

        return {
          ...prev,
          groundPowders: updatedGround,
          mixtures: [...prev.mixtures, newMixture],
          xp: prev.xp + recipeXpReward
        };
      });

      // Reset beaker
      setBeakerGrams({});
      setMatchingRecipe(null);
      setCustomName('');
    }, 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full p-1" id="mixing-station-root">
      {/* Left: Ingredients pour drawers */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        <div className="bg-[#0a0a0f] border border-white/10 rounded-lg p-4 flex flex-col gap-3 backdrop-blur-md">
          <div className="flex justify-between items-center pb-2 border-b border-white/10">
            <h3 className="font-display font-bold text-white uppercase tracking-wider text-xs">Measure Ingredients</h3>
            <span className="font-mono text-[10px] text-white/40 uppercase tracking-widest">Scale Precision: {scalePrecisionStep}g</span>
          </div>

          <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[280px] pr-1">
            {Object.keys(inventory.groundPowders).length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-xs font-sans">
                No ground powders in inventory.<br />Go pulverize raw elements first!
              </div>
            ) : (
              Object.entries(inventory.groundPowders).map(([id, item]) => {
                const ing = RAW_INGREDIENTS.find(i => i.id === id);
                if (!ing) return null;
                const poured = beakerGrams[id] || 0;
                const available = Number((item.grams - poured).toFixed(1));

                return (
                  <div key={id} className="p-3 bg-[#050507]/40 border border-white/5 hover:border-white/10 rounded flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-sm border border-white/10" style={{ backgroundColor: ing.particleColor }} />
                        <span className="font-sans font-bold text-xs text-white">{ing.name}</span>
                      </div>
                      <span className="font-mono text-[10px] text-white/50">
                        Poured: <span className="text-cyan-400 font-bold">{poured}g</span> / Stock: {available}g
                      </span>
                    </div>

                    {/* Pour Action Buttons */}
                    <div className="flex gap-1.5 items-center justify-end">
                      <button
                        id={`pour-back-10-${id}`}
                        onClick={() => pourPowder(id, -10)}
                        disabled={poured < 10}
                        className="px-2 py-1 text-[9px] font-mono bg-white/5 border border-white/10 rounded text-white/60 hover:text-white disabled:opacity-30 transition-all"
                      >
                        -10g
                      </button>
                      <button
                        id={`pour-back-1-${id}`}
                        onClick={() => pourPowder(id, -1)}
                        disabled={poured < 1}
                        className="px-2 py-1 text-[9px] font-mono bg-white/5 border border-white/10 rounded text-white/60 hover:text-white disabled:opacity-30 transition-all"
                      >
                        -1g
                      </button>
                      
                      <div className="h-4 w-[1px] bg-white/10 mx-1" />

                      <button
                        id={`pour-in-1-${id}`}
                        onClick={() => pourPowder(id, 1)}
                        disabled={available < 1}
                        className="px-2 py-1 text-[9px] font-mono bg-[#0a0a0f] border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-500/50 rounded disabled:opacity-30 transition-all"
                      >
                        +1g
                      </button>
                      <button
                        id={`pour-in-5-${id}`}
                        onClick={() => pourPowder(id, 5)}
                        disabled={available < 5}
                        className="px-2 py-1 text-[9px] font-mono bg-[#0a0a0f] border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-500/50 rounded disabled:opacity-30 transition-all"
                      >
                        +5g
                      </button>
                      <button
                        id={`pour-in-10-${id}`}
                        onClick={() => pourPowder(id, 10)}
                        disabled={available < 10}
                        className="px-2 py-1 text-[9px] font-mono bg-[#0a0a0f] border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-500/50 rounded disabled:opacity-30 transition-all"
                      >
                        +10g
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recipes Shortcut Book */}
        <div className="bg-[#0a0a0f] border border-white/10 rounded-lg p-4 flex flex-col gap-3">
          <div className="flex items-center gap-1.5 pb-2 border-b border-white/10">
            <Lightbulb className="w-4 h-4 text-cyan-400" />
            <h3 className="font-display font-bold text-white uppercase tracking-wider text-xs">Recipe Handbook</h3>
          </div>
          <div className="flex flex-col gap-2 overflow-y-auto max-h-[220px] pr-1">
            {RECIPES.map(recipe => {
              const isUnlocked = true; // For simpler layout, can view all recipes!
              return (
                <div key={recipe.id} className="p-2.5 rounded bg-white/5 border border-white/5 flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <span className="font-sans font-bold text-white text-[11px]">{recipe.name}</span>
                    <button
                      id={`recipe-fill-${recipe.id}`}
                      onClick={() => fillRecipeShortcut(recipe)}
                      className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/80 hover:bg-cyan-500/20 hover:text-cyan-400 hover:border-cyan-500/50 transition-all text-[9px] font-mono uppercase"
                    >
                      Use Formula
                    </button>
                  </div>
                  <p className="text-[10px] text-white/40 font-sans leading-relaxed">{recipe.description}</p>
                  <span className="font-mono text-[9px] text-cyan-400/70 mt-1">{recipe.flavor}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right: Mixing scale, beaker visualization and dynamic properties output */}
      <div className="lg:col-span-7 flex flex-col gap-4">
        <div className="bg-[#0a0a0f] border border-white/10 rounded-lg p-6 flex flex-col items-center justify-between h-full min-h-[480px] shadow-[inset_0_0_60px_rgba(0,0,0,0.8)] relative overflow-hidden flex-1">
          {/* Beaker & Scale visualization zone */}
          <div className="flex flex-col items-center justify-center w-full flex-1 gap-6 py-4 z-10">
            
            {/* Real scale weighing indicator */}
            <div className="bg-[#050507] border border-white/10 p-3 rounded flex gap-4 items-center w-full max-w-sm shadow-inner justify-between">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-cyan-400 animate-pulse" />
                <span className="font-sans text-xs text-white/50 uppercase tracking-wider">Beaker Net Weight:</span>
              </div>
              <div className="font-mono text-lg font-bold text-emerald-400">
                {totalGramsInBeaker.toFixed(1)}g <span className="text-xs text-white/20">/ {maxBeakerCapacity}g</span>
              </div>
            </div>

            {/* Glass Beaker rendering with fluid-levels */}
            <div className="relative w-44 h-52 border-l-[4px] border-r-[4px] border-b-[4px] border-white/20 rounded-b-xl flex flex-col-reverse items-center justify-start overflow-hidden bg-slate-950/20 shadow-lg">
              {/* Scribe scale lines on beaker glass */}
              <div className="absolute inset-y-0 right-2 flex flex-col justify-between py-4 text-[9px] font-mono text-white/20 select-none pointer-events-none">
                <span>- {maxBeakerCapacity}g</span>
                <span>- {maxBeakerCapacity * 0.75}g</span>
                <span>- {maxBeakerCapacity * 0.5}g</span>
                <span>- {maxBeakerCapacity * 0.25}g</span>
                <span>- 0g</span>
              </div>

              {/* Stacked colored powders rendering inside beaker */}
              <div className="w-full flex flex-col-reverse justify-start">
                {(Object.entries(beakerGrams) as [string, number][]).map(([ingId, grams]) => {
                  const ing = RAW_INGREDIENTS.find(i => i.id === ingId);
                  if (!ing) return null;
                  const ratio = grams / maxBeakerCapacity;
                  const percentHeight = `${ratio * 100}%`;
                  return (
                    <motion.div
                      key={ingId}
                      layout
                      initial={{ height: 0 }}
                      animate={{ height: `${(grams / maxBeakerCapacity) * 160}px` }}
                      className="w-full relative"
                      style={{
                        backgroundColor: ing.particleColor,
                        borderTop: '1px solid rgba(255,255,255,0.15)'
                      }}
                    >
                      {/* Dust textures on the layers */}
                      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:4px_4px]" />
                    </motion.div>
                  );
                })}
              </div>

              {/* Glass stirring rod */}
              <motion.div
                id="stirring-rod"
                animate={{
                  rotate: isStirring ? [0, -10, 10, -10, 10, 0] : 0,
                  x: isStirring ? [-5, 5, -5, 5, 0] : 0,
                  y: isStirring ? [5, -5, 5, -5, 0] : 0
                }}
                transition={{ duration: 1, repeat: isStirring ? Infinity : 0 }}
                className="absolute -top-6 left-1/2 -ml-1 w-2 h-44 bg-gradient-to-b from-white/60 to-white/20 border-r border-white/35 rounded-full filter drop-shadow z-10 pointer-events-none origin-bottom"
              />

              {/* Glowing reaction swirl */}
              <AnimatePresence>
                {isStirring && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1, rotate: 360 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  >
                    <div className="w-24 h-24 rounded-full border border-dashed border-cyan-500/60 animate-spin" />
                    <Sparkles className="w-8 h-8 text-cyan-400 absolute animate-pulse" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Formula Match Indicator */}
            {matchingRecipe ? (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#0a0a0f] border border-emerald-500/50 p-2.5 rounded flex items-center gap-2 text-xs text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
              >
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  Recipe detected: <strong className="text-white">{matchingRecipe.name}</strong>
                  <div className="text-[10px] text-emerald-400/80 mt-0.5">Yields high explosiveness and recipe bonuses!</div>
                </div>
              </motion.div>
            ) : totalGramsInBeaker > 0 ? (
              <div className="flex flex-col gap-1.5 w-full max-w-sm">
                <input
                  id="custom-blend-name-input"
                  type="text"
                  placeholder="Name your custom mixture..."
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full text-center py-2 bg-[#050507] border border-white/10 rounded font-sans text-xs text-white placeholder-white/20 focus:outline-none focus:border-cyan-500"
                />
              </div>
            ) : null}

            {/* Synthesize Button */}
            <button
              id="synthesize-mix-btn"
              onClick={stirAndSynthesize}
              disabled={totalGramsInBeaker <= 0 || isStirring}
              className={`w-full max-w-sm py-3 rounded font-sans font-bold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 border ${
                totalGramsInBeaker > 0 && !isStirring
                  ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 hover:bg-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                  : 'bg-white/5 border-white/5 text-white/20 cursor-not-allowed'
              }`}
            >
              {isStirring ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Blending & Crystallizing...
                </>
              ) : (
                <>
                  <Beaker className="w-4 h-4" />
                  Stir & Synthesize Compound
                </>
              )}
            </button>

            {totalGramsInBeaker > 0 && (
              <button
                id="discard-beaker-btn"
                onClick={clearBeaker}
                className="text-xs font-mono uppercase tracking-wider text-white/40 hover:text-white underline mt-1"
              >
                Empty Beaker & Reclaim Powders
              </button>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
