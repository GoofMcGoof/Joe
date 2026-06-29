/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, CheckCircle2, User, Award, ShieldCheck, Mail } from 'lucide-react';
import { ClientOrder, Inventory, PowderGrade } from '../types';
import { RAW_INGREDIENTS, RECIPES } from '../data';
import { audio } from '../utils/audio';

interface OrderBoardProps {
  inventory: Inventory;
  updateInventory: (updater: (prev: Inventory) => Inventory) => void;
  orders: ClientOrder[];
  setOrders: React.Dispatch<React.SetStateAction<ClientOrder[]>>;
  onShowMessage: (text: string, type: 'success' | 'error' | 'info') => void;
  checkLevelUp: (xp: number) => void;
}

const GRADE_RANK: Record<PowderGrade, number> = {
  'Coarse': 1,
  'Medium': 2,
  'Fine': 3,
  'Superfine': 4,
  'Ultra': 5,
  'Transmuted': 6
};

export default function OrderBoard({ inventory, updateInventory, orders, setOrders, onShowMessage, checkLevelUp }: OrderBoardProps) {

  const generateNewOrder = (level: number, rebirths: number): ClientOrder => {
    const clients = [
      { name: 'Jack the Pyrotechnician', avatar: '🎆', tag: 'fire' },
      { name: 'Alchemist Serena', avatar: '🧙‍♀️', tag: 'magic' },
      { name: 'Wrecker Bob', avatar: '👷‍♂️', tag: 'construction' },
      { name: 'Gardener Lily', avatar: '👩‍🌾', tag: 'garden' },
      { name: 'Blacksmith Thor', avatar: '🔨', tag: 'metal' },
      { name: 'Dr. Kepler (Astrophysicist)', avatar: '🔭', tag: 'science_astroph' },
      { name: 'Professor Helix (Geneticist)', avatar: '🧬', tag: 'science_genetic' },
      { name: 'Dr. Curie (Radiochemist)', avatar: '☢️', tag: 'science_radio' },
      { name: 'Dr. Marine (Deepsea Biologist)', avatar: '🐙', tag: 'science_marine' },
      { name: 'Professor Tesla (Electrophysicist)', avatar: '⚡', tag: 'science_electro' },
      { name: 'Dr. Fossil (Paleontologist)', avatar: '🦖', tag: 'science_fossil' },
      { name: 'Dr. Quartz (Crystallographer)', avatar: '💎', tag: 'science_crystal' }
    ];
    
    const richClients = [
      { name: 'Baron Goldspire 🏰', avatar: '👑', tag: 'rich' },
      { name: 'Master Tinkerer Cogsworth ⚙️', avatar: '🎩', tag: 'rich' },
      { name: 'Archmage Ignis 🔥', avatar: '🔮', tag: 'rich' },
      { name: 'Lord Sterling 💎', avatar: '🤵', tag: 'rich' },
      { name: 'Director Vance (Quantum Lab) 🌌', avatar: '🕶️', tag: 'rich_quantum' },
      { name: 'Commander Stella (Space Fleet) 🚀', avatar: '👨‍🚀', tag: 'rich_space' },
      { name: 'CEO Elon (Rocket Dynamics) 🪐', avatar: '🦾', tag: 'rich_ceo' },
      { name: 'High Councilor Vael (Chrono-Registry) ⏳', avatar: '👑', tag: 'rich_chrono' },
      { name: 'Arch-Botanist Flora (Giga-Greenhouse) 🌴', avatar: '🧫', tag: 'rich_botany' }
    ];

    const isRich = Math.random() < 0.25; // 25% chance of rich clients
    const client = isRich
      ? richClients[Math.floor(Math.random() * richClients.length)]
      : clients[Math.floor(Math.random() * clients.length)];

    const id = `order_${Date.now()}_${Math.floor(Math.random()*100)}`;
    
    // Choose order type based on level
    const randType = Math.random();
    let type: 'ground' | 'recipe' = 'ground';
    if (level > 1 && randType > 0.4) {
      type = 'recipe';
    }

    const getDialogue = (clientTag: string, ingName: string, minGrams: number, minGrade: PowderGrade, recipeName?: string): string => {
        const options: Record<string, string[]> = {
          'science_astroph': [
            `Kepler here. My telescope spectral calibration requires exactly ${minGrams}g of crushed ${ingName} at ${minGrade} sifting quality to match stellar dust indices.`,
            `Astrophysics research is demanding. I need ${minGrams}g of ${recipeName || ingName} sifted to ${minGrade} to calibrate our star sensors.`,
          ],
          'science_genetic': [
            `Helix speaking. We are modifying cellular sequences and need ${minGrams}g of crushed ${ingName} (${minGrade} grade or better) as a stabilizing medium.`,
            `Our lab needs ${minGrams}g of ${recipeName || ingName} (${minGrade} quality) for urgent gene-splicing experiments.`,
          ],
          'science_radio': [
            `This is Curie. I need ${minGrams}g of crushed ${ingName} at ${minGrade} quality to test as a custom radiation dampener.`,
            `Conducting isotope studies. Supply ${minGrams}g of ${recipeName || ingName} (${minGrade} quality) immediately.`,
          ],
          'science_marine': [
            `I'm studying deep-ocean vents. Can you supply ${minGrams}g of crushed ${ingName} (${minGrade} quality) to simulate extreme marine pressure chemical conditions?`,
            `Deep-sea samples require ${minGrams}g of ${recipeName || ingName} (${minGrade} grade) for high-pressure simulation.`,
          ],
          'science_electro': [
            `Tesla here. High-voltage resonance trials require ${minGrams}g of finely ground ${ingName} (${minGrade}) to coat our secondary coil contacts.`,
            `High-voltage testing needs ${minGrams}g of ${recipeName || ingName} (${minGrade}) to stabilize the electrical field.`,
          ],
          'science_fossil': [
            `Fossil here. I am preserving dinosaur bone matrices and require ${minGrams}g of pure crushed ${ingName} sifted to ${minGrade} quality.`,
            `Carbon-dating fossils. Send ${minGrams}g of ${recipeName || ingName} (${minGrade} quality) for analysis.`,
          ],
          'science_crystal': [
            `Quartz here. To seed some experimental monocrystals, I need ${minGrams}g of crushed ${ingName} of at least ${minGrade} quality.`,
            `Growing experimental crystals requires ${minGrams}g of ${recipeName || ingName} sifted to ${minGrade}.`,
          ],
          'rich_quantum': [
            `Director Vance here. The Quantum Grid project requires a high-purity supply of crushed ${ingName}. Deliver ${minGrams}g sifted to ${minGrade} or better. Cost is immaterial.`,
            `Quantum stability is paramount. Need ${minGrams}g of ${recipeName || ingName} at ${minGrade} quality.`,
          ],
          'rich_space': [
            `Commander Stella reporting. Our orbital thruster manifolds require ${minGrams}g of crushed ${ingName} at ${minGrade} grade for atomic propellant stability.`,
            `Space mission prep: ${minGrams}g of ${recipeName || ingName} at ${minGrade} grade is mandatory.`,
          ],
          'rich_ceo': [
            `My private aerospace initiative is launch-testing. Provide ${minGrams}g of crushed ${ingName} (${minGrade} sifting) for our capsule heat shield composite.`,
            `Testing a new prototype. Need ${minGrams}g of ${recipeName || ingName} (${minGrade} sifting) for structural reinforcement.`,
          ],
          'rich_chrono': [
            `High Councilor Vael here. Temporal shielding arrays demand ${minGrams}g of crushed ${ingName} sifted to ${minGrade} grade to withstand chrono-friction.`,
            `Chronal integrity is at risk! Urgent: ${minGrams}g of ${recipeName || ingName} at ${minGrade} quality.`,
          ],
          'rich_botany': [
            `Flora speaking. Giga-Greenhouse bio-domes need ${minGrams}g of crushed ${ingName} at ${minGrade} quality to fertilize our hyper-evolutionary species.`,
            `Hyper-growth species in the bio-dome require ${minGrams}g of ${recipeName || ingName} at ${minGrade} grade.`,
          ]
        };
        
        const defaultOptions = [
            `I am ${client.name}. I hear you possess raw alchemical components of stellar quality. Bring me ${minGrams}g of crushed ${ingName} sifted to ${minGrade} grade or better. Gold is no object!`,
            `Greetings alchemist. I am looking for a pure supply of crushed ${ingName}. I require at least ${minGrams}g at ${minGrade} sifting quality. Do you have any?`
        ];

        const tagOptions = options[clientTag] || (isRich ? [defaultOptions[0]] : [defaultOptions[1]]);
        return tagOptions[Math.floor(Math.random() * tagOptions.length)];
      };

    let targetId = 'coal';
    let minGrams = Math.floor(15 + Math.random() * 25);
    let minGrade: PowderGrade = 'Coarse';
    let dialogue = '';
    let rewardCoins = 50;
    let rewardXp = 20;

    // Standard Powder Grades to randomly request
    const grades: PowderGrade[] = ['Coarse', 'Medium', 'Fine', 'Superfine'];
    // For level 10+, enforce higher grade requests (increases difficulty!)
    const minPossibleGradeIdx = level >= 10 ? 1 : 0; // Level 10 requires at least Medium sifting
    const maxGradeIndex = Math.min(3, level); // unlock higher grades as level rises
    minGrade = grades[minPossibleGradeIdx + Math.floor(Math.random() * (maxGradeIndex - minPossibleGradeIdx + 1))];

    if (type === 'ground') {
      const allowedIngs = ['coal', 'sulfur', 'saltpeter', 'rust'];
      if (level >= 2) {
        allowedIngs.push('iron', 'aluminium');
      }
      if (level >= 3) {
        allowedIngs.push('lumina', 'glowstone');
      }
      if (level >= 5) {
        allowedIngs.push('cobalt');
      }
      if (level >= 6) {
        allowedIngs.push('silver');
      }
      if (level >= 7) {
        allowedIngs.push('mercury');
      }
      if (level >= 10) {
        allowedIngs.push('plasma_ore', 'xenon_salt');
      }
      if (level >= 11 && rebirths >= 1) {
        allowedIngs.push('uranium', 'radium');
      }
      if (level >= 13 && rebirths >= 2) {
        allowedIngs.push('thorium', 'plutonium');
      }
      if (level >= 15 && rebirths >= 3) {
        allowedIngs.push('americium', 'curium');
      }
      if (level >= 17 && rebirths >= 4) {
        allowedIngs.push('berkelium', 'californium');
      }

      targetId = allowedIngs[Math.floor(Math.random() * allowedIngs.length)];
      const ingName = RAW_INGREDIENTS.find(i => i.id === targetId)?.name || 'Coal';
      
      dialogue = getDialogue(client.tag, ingName, minGrams, minGrade);
      
      rewardCoins = Math.floor(minGrams * 2.2 * (GRADE_RANK[minGrade] * 0.7));
      rewardXp = Math.floor(minGrams * 0.9 * (GRADE_RANK[minGrade] * 0.6));
    } else {
      // Recipe request
      const allowedRecipes = [...RECIPES];
      // Filter based on unlocked items
      const filteredRecipes = allowedRecipes.filter(r => {
        if (r.id === 'supernova_fuel' || r.id === 'warp_catalyst') {
          return level >= 10;
        }
        return true;
      });

      const recipe = filteredRecipes[Math.floor(Math.random() * filteredRecipes.length)];
      targetId = recipe.id;
      minGrams = Math.floor(20 + Math.random() * 20);
      
      dialogue = getDialogue(client.tag, '', minGrams, minGrade, recipe.name);

      rewardCoins = Math.floor(minGrams * 3.8 * (GRADE_RANK[minGrade] * 0.6) + recipe.rewardXp);
      rewardXp = Math.floor(minGrams * 1.5 + recipe.rewardXp * 0.8);
    }

    // Apply VIP Rich Client multiplier (2.8x coins, 1.8x XP)
    if (isRich) {
      rewardCoins = Math.round(rewardCoins * 2.8);
      rewardXp = Math.round(rewardXp * 1.8);
    }

    return {
      id,
      clientName: client.name,
      clientAvatar: client.avatar,
      dialogue,
      requiredProduct: {
        type,
        targetId,
        minGrams,
        minGrade
      },
      rewardCoins,
      rewardXp,
      completed: false,
      isRich
    };
  };

  const maxOrdersCount = 4 + ((inventory.upgrades.maxOrders || 1) - 1) * 2;

  // Sync orders array size to fit the board capacity
  useEffect(() => {
    if (orders.length < maxOrdersCount) {
      const diff = maxOrdersCount - orders.length;
      setOrders(prev => {
        const newOrders = [...prev];
        for (let i = 0; i < diff; i++) {
          const newOrder = generateNewOrder(inventory.level, inventory.rebirths);
          // ensure unique IDs for generated orders
          newOrder.id = `order_gen_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 4)}`;
          newOrders.push(newOrder);
        }
        return newOrders;
      });
    } else if (orders.length > maxOrdersCount) {
      setOrders(prev => prev.slice(0, maxOrdersCount));
    }
  }, [maxOrdersCount, inventory.level, orders.length, setOrders]);

  const checkSatisfaction = (order: ClientOrder): { satisfied: boolean; errorMsg?: string } => {
    const req = order.requiredProduct;
    
    if (req.type === 'ground') {
      const stock = inventory.groundPowders[req.targetId];
      if (!stock || stock.grams < req.minGrams) {
        return { satisfied: false, errorMsg: `Missing enough ground powder. You need ${req.minGrams}g, but only have ${(stock?.grams || 0).toFixed(1)}g.` };
      }
      
      // Check sifting grade level: must be >= required
      const requiredRank = GRADE_RANK[req.minGrade || 'Coarse'];
      const actualRank = GRADE_RANK[stock.grade];
      if (actualRank < requiredRank) {
        return { satisfied: false, errorMsg: `Grade mismatch. Required sifting grade is ${req.minGrade}, but your inventory stock is only ${stock.grade}.` };
      }

      return { satisfied: true };
    } else {
      // Recipe requirement (Classic Gunpowder, Thermite, etc.)
      const recipe = RECIPES.find(r => r.id === req.targetId);
      if (!recipe) return { satisfied: false, errorMsg: 'Recipe definition error.' };

      // Look inside mixtures for one matching the recipe name
      const matchingMix = inventory.mixtures.find(m => 
        m.name.toLowerCase() === recipe.name.toLowerCase() && 
        m.grams >= req.minGrams && 
        GRADE_RANK[m.grade] >= GRADE_RANK[req.minGrade || 'Coarse']
      );

      if (!matchingMix) {
        return { satisfied: false, errorMsg: `No matching compound found. Need ${req.minGrams}g of ${recipe.name} at ${req.minGrade} quality.` };
      }

      return { satisfied: true };
    }
  };

  const fulfillOrder = (order: ClientOrder) => {
    const { satisfied, errorMsg } = checkSatisfaction(order);
    if (!satisfied) {
      onShowMessage(errorMsg || "Inventory does not meet contract requirements!", 'error');
      return;
    }

    const req = order.requiredProduct;

    updateInventory(prev => {
      const updatedGround = { ...prev.groundPowders };
      let updatedMixtures = [...prev.mixtures];

      if (req.type === 'ground') {
        if (updatedGround[req.targetId]) {
          updatedGround[req.targetId].grams = Number((updatedGround[req.targetId].grams - req.minGrams).toFixed(2));
          if (updatedGround[req.targetId].grams <= 0) {
            delete updatedGround[req.targetId];
          }
        }
      } else {
        // Find matching mixture, subtract weight
        const recipe = RECIPES.find(r => r.id === req.targetId);
        const matchIdx = updatedMixtures.findIndex(m => 
          m.name.toLowerCase() === recipe?.name.toLowerCase() && 
          m.grams >= req.minGrams && 
          GRADE_RANK[m.grade] >= GRADE_RANK[req.minGrade || 'Coarse']
        );
        
        if (matchIdx !== -1) {
          updatedMixtures[matchIdx].grams = Number((updatedMixtures[matchIdx].grams - req.minGrams).toFixed(2));
          if (updatedMixtures[matchIdx].grams <= 0) {
            updatedMixtures.splice(matchIdx, 1);
          }
        }
      }

      const nextXp = prev.xp + order.rewardXp;
      
      // Check level-up callback safely inside updater
      setTimeout(() => checkLevelUp(nextXp), 100);

      return {
        ...prev,
        coins: prev.coins + order.rewardCoins,
        xp: nextXp,
        groundPowders: updatedGround,
        mixtures: updatedMixtures
      };
    });

    onShowMessage(`Contract shipped successfully! Earned +${order.rewardCoins} gold & +${order.rewardXp} XP!`, 'success');
    audio.playCoin();

    // Replace completed order with a new generated order dynamically
    setOrders(prev => {
      const filtered = prev.filter(o => o.id !== order.id);
      const replacement = generateNewOrder(inventory.level, inventory.rebirths);
      replacement.id = `order_gen_${Date.now()}_rep_${Math.random().toString(36).substr(2, 4)}`;
      return [...filtered, replacement];
    });
  };

  return (
    <div className="flex flex-col gap-4 h-full p-1" id="order-board-root">
      <div className="bg-[#0a0a0f] border border-white/10 rounded-lg p-4 flex items-center justify-between shadow-inner">
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-cyan-400" />
          <div>
            <h3 className="font-display font-bold text-white uppercase tracking-wider text-xs">Contract Orders Desk</h3>
            <p className="text-[11px] text-white/40">Read letters from local workshops and fulfill their requests to earn gold.</p>
          </div>
        </div>
        <span className="font-mono text-xs text-cyan-400 font-bold bg-cyan-500/10 border border-cyan-500/20 px-2 py-1 rounded uppercase tracking-wider">
          {orders.length} Active Contracts
        </span>
      </div>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto max-h-[500px] pr-1">
        {orders.map((order, index) => {
          const satisfactionResult = checkSatisfaction(order);
          const isSatisfied = satisfactionResult.satisfied;
          const req = order.requiredProduct;
          const targetName = req.type === 'ground' 
            ? RAW_INGREDIENTS.find(i => i.id === req.targetId)?.name 
            : RECIPES.find(r => r.id === req.targetId)?.name;

          return (
            <div
              key={order.id}
              id={`order-card-${order.id}`}
              className="relative w-full h-[240px] border-[4px] border-black rounded-lg overflow-hidden flex bg-[#0f172a]"
            >
              {/* Background Window Scene */}
              <div className="absolute inset-0">
                <div className="absolute top-0 bottom-[80px] left-0 right-[130px] bg-gradient-to-b from-purple-900/40 to-cyan-900/20 border-b-[4px] border-black">
                  {/* Decorative window bars */}
                  <div className="absolute inset-y-0 left-8 w-12 border-l-[4px] border-r-[4px] border-black bg-black/20"></div>
                  <div className="absolute inset-y-0 left-32 w-12 border-l-[4px] border-r-[4px] border-black bg-black/20"></div>
                </div>
              </div>
              
              {/* Counter */}
              <div className="absolute bottom-0 left-0 right-[130px] h-[80px] bg-[#1e293b] border-t-[4px] border-black z-10 flex flex-col">
                <div className="h-3 bg-[#334155] border-b-[2px] border-black/50"></div>
                <div className="flex-1 bg-[#0f172a] relative overflow-hidden">
                  <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, #000 10px, #000 20px)' }}></div>
                </div>
              </div>

              {/* Customer Avatar */}
              <div className="absolute bottom-10 left-12 text-[80px] drop-shadow-[0_4px_0_rgba(0,0,0,1)] z-10" style={{ animation: 'bounce 2s infinite' }}>
                {order.clientAvatar}
              </div>

              {/* Nameplate on counter */}
              <div className="absolute bottom-4 left-10 bg-cyan-700 border-[3px] border-black px-3 py-1 rounded text-white font-black uppercase text-xs shadow-[2px_2px_0_rgba(0,0,0,0.5)] z-20 whitespace-nowrap">
                {order.clientName.split(' ')[0]}
              </div>

              {/* Speech Bubble */}
              <div className="absolute top-4 left-4 right-[140px] bg-white border-[3px] border-black rounded-2xl p-2 z-10 shadow-[4px_4px_0_rgba(0,0,0,0.2)] flex items-center justify-center">
                <div className="absolute -bottom-[12px] left-[50px] w-0 h-0 border-l-[10px] border-l-transparent border-t-[12px] border-t-black border-r-[10px] border-r-transparent"></div>
                <div className="absolute -bottom-[8px] left-[52px] w-0 h-0 border-l-[8px] border-l-transparent border-t-[8px] border-t-white border-r-[8px] border-r-transparent"></div>
                <p className="text-black font-bold text-[9px] leading-tight line-clamp-3 text-center">
                  "{order.dialogue}"
                </p>
              </div>

              {/* Rich client VIP star */}
              {order.isRich && (
                <div className="absolute top-2 left-2 text-2xl z-20 animate-spin" style={{ animationDuration: '4s' }}>
                  ⭐
                </div>
              )}

              {/* The Ticket (Right side) */}
              <div className="absolute right-0 top-0 bottom-0 w-[130px] bg-[#f9f6ef] border-l-[4px] border-black flex flex-col shadow-[-5px_0_15px_rgba(0,0,0,0.5)] z-30">
                {/* Pin at the top */}
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-gray-300 border-[2px] border-black shadow-sm z-40"></div>
                
                {/* Ticket Header */}
                <div className="h-10 border-b-[3px] border-black/20 flex items-center px-2 bg-[#ebdcc2]">
                  <span className="text-red-600 font-bold font-mono text-xl shadow-sm drop-shadow-sm">0{index + 1}</span>
                  <div className="ml-auto flex items-center justify-center w-5 h-5 rounded-full border-[2px] border-black shadow-[1px_1px_0_#000]" 
                        style={{ backgroundColor: order.isRich ? '#fbbf24' : '#fff' }}>
                    {order.isRich && <span className="text-[10px]">👑</span>}
                  </div>
                </div>

                {/* Ticket Body */}
                <div className="flex-1 p-2 flex flex-col gap-2 text-black font-sans bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmOWY2ZWYiLz48cmVjdCB3aWR0aD0iMSIgaGVpZ2h0PSIxIiBmaWxsPSIjZTBlMGQwIi8+PC9zdmc+')]">
                  <div className="text-center font-bold text-[11px] leading-tight border-b-2 border-dashed border-gray-400 pb-2">
                    {targetName}
                  </div>
                  
                  <div className="flex flex-col gap-2 items-center mt-1">
                    <div className="w-full flex justify-between items-center px-1">
                      <span className="text-[10px] font-bold text-gray-500 uppercase">Amt:</span>
                      <span className="font-bold text-[11px] bg-gray-200 px-1.5 rounded border border-gray-400">{req.minGrams}g</span>
                    </div>
                    <div className="w-full flex justify-between items-center px-1">
                      <span className="text-[10px] font-bold text-gray-500 uppercase">Grd:</span>
                      <span className="font-bold text-[9px] uppercase text-white px-1.5 py-0.5 rounded border border-black shadow-[1px_1px_0_#000]"
                            style={{
                              backgroundColor: req.minGrade === 'Coarse' ? '#f97316' :
                                               req.minGrade === 'Medium' ? '#06b6d4' :
                                               req.minGrade === 'Fine' ? '#10b981' : '#a855f7'
                            }}>
                        {req.minGrade}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Ticket Footer / Button area */}
                <div className="p-2 border-t-2 border-dashed border-gray-400 bg-[#ebdcc2]/50 mt-auto">
                  <div className="flex justify-between text-[10px] font-bold mb-2 font-mono">
                    <span className="text-yellow-700">{order.rewardCoins}💰</span>
                    <span className="text-green-700">{order.rewardXp}⭐</span>
                  </div>
                  <button
                    onClick={() => fulfillOrder(order)}
                    className={`w-full py-1.5 font-black text-[11px] uppercase tracking-wider border-[3px] shadow-[2px_2px_0_#000] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all ${
                      isSatisfied 
                        ? 'bg-[#4ade80] border-black text-black hover:bg-[#22c55e]' 
                        : 'bg-[#d1d5db] border-gray-500 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    SHIP
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
