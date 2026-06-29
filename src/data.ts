/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RawIngredient, Recipe, ClientOrder, PowderGrade, Achievement } from './types';

export const GRADE_ORDER: PowderGrade[] = ['Coarse', 'Medium', 'Fine', 'Superfine', 'Ultra', 'Transmuted'];

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'apprentice', name: 'Alchemist Apprentice', description: 'Reach Level 2', unlocked: false },
  { id: 'first_mixture', name: 'First Formulation', description: 'Create your first custom mixture', unlocked: false },
  { id: 'millionaire', name: 'Alchemist Millionaire', description: 'Accumulate 1000 coins', unlocked: false },
  { id: 'master_refiner', name: 'Master Refiner', description: 'Create a Transmuted grade powder', unlocked: false },
];

export const RAW_INGREDIENTS: RawIngredient[] = [
  // Fuel
  { id: 'coal', name: 'Coal Chunk', color: '#2d3748', particleColor: '#12161a', cost: 4, description: 'A dense chunk of carbon. Grinds easily into fine charcoal powder, the classic organic fuel.', hardness: 2, category: 'Fuel' },
  { id: 'thorium', name: 'Thorium Ore', color: '#d69e2e', particleColor: '#ecc94b', cost: 90, description: 'A stable radioactive fuel source for advanced alchemy.', hardness: 5, category: 'Fuel' },
  { id: 'californium', name: 'Californium Ore', color: '#c53030', particleColor: '#f56565', cost: 200, description: 'The most powerful and dangerous of the radioactive elements.', hardness: 7, category: 'Fuel' },
  
  // Catalyst
  { id: 'sulfur', name: 'Sulfur Crystal', color: '#d69e2e', particleColor: '#f6e05e', cost: 8, description: 'Bright yellow volcanic mineral. Smelly and highly reactive. Essential for low-temp ignition.', hardness: 3, category: 'Catalyst' },
  { id: 'rust', name: 'Rust Plate', color: '#9c4221', particleColor: '#c05621', cost: 6, description: 'Flaky iron oxide scraped from antique metal. Highly reactive when combined with metals.', hardness: 2, category: 'Catalyst' },
  { id: 'plasma_ore', name: 'Plasma Ore Crystals', color: '#e53e3e', particleColor: '#f56565', cost: 55, description: 'Highly volatile, superheated thermal crystallizations. Exceptionally hard to pulverize and highly reactive with moisture.', hardness: 9, category: 'Catalyst' },
  { id: 'mercury', name: 'Mercury Drop', color: '#718096', particleColor: '#a0aec0', cost: 80, description: 'A toxic liquid metal. Extremely volatile and reactive with almost everything.', hardness: 1, category: 'Catalyst' },
  { id: 'radium', name: 'Radium Ore', color: '#e2e8f0', particleColor: '#f7fafc', cost: 120, description: 'Extremely luminous and dangerous. Requires lead-lined containers.', hardness: 4, category: 'Catalyst' },
  { id: 'plutonium', name: 'Plutonium Ore', color: '#9f7aea', particleColor: '#b794f4', cost: 150, description: 'An intensely powerful and volatile element.', hardness: 7, category: 'Catalyst' },
  { id: 'curium', name: 'Curium Ore', color: '#d53f8c', particleColor: '#f687b3', cost: 140, description: 'A rare and highly radioactive element, emits extreme heat.', hardness: 5, category: 'Catalyst' },
  
  // Oxidizer
  { id: 'saltpeter', name: 'Saltpeter Rock', color: '#cbd5e0', particleColor: '#f7fafc', cost: 10, description: 'Niter crystals. An incredibly potent oxidizer that feeds oxygen to combustive reactions.', hardness: 4, category: 'Oxidizer' },
  
  // Metal
  { id: 'iron', name: 'Iron Ore', color: '#4a5568', particleColor: '#718096', cost: 15, description: 'Heavy magnetic ore. Yields coarse iron filings which conduct electricity and spark under impact.', hardness: 7, category: 'Metal' },
  { id: 'aluminium', name: 'Aluminium Scrap', color: '#a0aec0', particleColor: '#cbd5e0', cost: 18, description: 'Light metal flakes. Grinds into fine aluminium powder, which burns with bright, intense white heat.', hardness: 5, category: 'Metal' },
  { id: 'cobalt', name: 'Cobalt Ore', color: '#3182ce', particleColor: '#63b3ed', cost: 35, description: 'A hard, magnetic mineral used to stabilize high-temperature reactions.', hardness: 6, category: 'Metal' },
  { id: 'silver', name: 'Silver Ore', color: '#a0aec0', particleColor: '#e2e8f0', cost: 45, description: 'A reflective, conductive metal that enhances magic and conductivity.', hardness: 4, category: 'Metal' },
  { id: 'uranium', name: 'Uranium Ore', color: '#38a169', particleColor: '#68d391', cost: 100, description: 'Highly radioactive heavy metal, glows faintly green in the dark.', hardness: 6, category: 'Metal' },
  { id: 'americium', name: 'Americium Ore', color: '#3182ce', particleColor: '#63b3ed', cost: 130, description: 'Used in sensitive sensors and radioactive probes.', hardness: 4, category: 'Metal' },
  { id: 'berkelium', name: 'Berkelium Ore', color: '#dd6b20', particleColor: '#f6ad55', cost: 160, description: 'Very unstable and difficult to refine.', hardness: 6, category: 'Metal' },
  
  // Magic
  { id: 'lumina', name: 'Lumina Flower', color: '#319795', particleColor: '#4fd1c5', cost: 25, description: 'A glowing, bioluminescent flower. Powder floats upward, glowing cyan, and accelerates biological growth.', hardness: 1, category: 'Magic' },
  { id: 'glowstone', name: 'Glowstone Shard', color: '#38a169', particleColor: '#48bb78', cost: 22, description: 'A fluorescent crystalline shard. Emits a radioactive green glow, charging up under exposure to light.', hardness: 4, category: 'Magic' },
  { id: 'xenon_salt', name: 'Xenon Salt Matrix', color: '#805ad5', particleColor: '#b794f4', cost: 65, description: 'High-density compressed noble gas structure. Possesses monumental quantum charge and custom floating kinetic force.', hardness: 8, category: 'Magic' },
];

export const RECIPES: Recipe[] = [
  {
    id: 'gunpowder',
    name: 'Classic Gunpowder',
    description: 'The foundational compound of pyrotechnics. Burns rapidly and explodes under containment.',
    requiredRatios: {
      coal: 0.75,
      saltpeter: 0.15,
      sulfur: 0.10,
    },
    tolerance: 0.05,
    rewardXp: 40,
    flavor: 'Formula: 75% Charcoal, 15% Saltpeter, 10% Sulfur. Sift fine for faster reaction speed.',
  },
  {
    id: 'thermite',
    name: 'High-Temp Thermite',
    description: 'A metal-reduction formulation. When ignited with a hot spark, it reaches 2500°C, melting stone into lava.',
    requiredRatios: {
      rust: 0.70,
      aluminium: 0.30,
    },
    tolerance: 0.04,
    rewardXp: 60,
    flavor: 'Formula: 70% Rust, 30% Aluminium. Sift coarse to slow down burning, or superfine to melt immediately.',
  },
  {
    id: 'flashpowder',
    name: 'Blinding Flash Powder',
    description: 'A pyrotechnic mixture that combusts with extreme velocity, creating a bright flash of white light.',
    requiredRatios: {
      sulfur: 0.50,
      aluminium: 0.50,
    },
    tolerance: 0.05,
    rewardXp: 50,
    flavor: 'Formula: 50% Sulfur, 50% Aluminium. Handle with care! Extremely light-sensitive.',
  },
  {
    id: 'tesladust',
    name: 'Tesla Spark Dust',
    description: 'Magnetic filings infused with static mana. Floating, conductive dust that generates electric sparks.',
    requiredRatios: {
      iron: 0.60,
      lumina: 0.40,
    },
    tolerance: 0.06,
    rewardXp: 80,
    flavor: 'Formula: 60% Iron Filings, 40% Lumina Dust. Sparks transfer easily through conductive lines.',
  },
  {
    id: 'bloomdust',
    name: 'Botanical Bloom Dust',
    description: 'A potent fertilizer dust that forces rapid growth in plants, causing glowing vines to sprout instantly.',
    requiredRatios: {
      coal: 0.50,
      lumina: 0.50,
    },
    tolerance: 0.05,
    rewardXp: 70,
    flavor: 'Formula: 50% Charcoal, 50% Lumina Dust. Spray on wood or water to observe spontaneous germination.',
  },
  {
    id: 'auroradust',
    name: 'Aurora Glow Dust',
    description: 'Fluorescent particles suspended in fuel. Combines glowing phosphors with saltpeter to burn and leave glowing trails.',
    requiredRatios: {
      glowstone: 0.60,
      saltpeter: 0.40,
    },
    tolerance: 0.05,
    rewardXp: 90,
    flavor: 'Formula: 60% Glowstone Dust, 40% Saltpeter. Creates a stunning emerald cascade in dark chambers.',
  },
  {
    id: 'supernova_fuel',
    name: 'Supernova Stellar Propellant',
    description: 'An advanced alchemical fuel block built from hyper-dense plasma. Reaches astronomical temperatures.',
    requiredRatios: {
      plasma_ore: 0.60,
      aluminium: 0.20,
      sulfur: 0.20,
    },
    tolerance: 0.03,
    rewardXp: 150,
    flavor: 'Formula: 60% Plasma Ore, 20% Aluminium Scrap, 20% Sulfur Crystal. Extreme heat hazard!',
  },
  {
    id: 'warp_catalyst',
    name: 'Warp Drive Catalyst',
    description: 'A glowing lavender powder that initiates quantum tunneling. Extremely light, floating alchemical reagent.',
    requiredRatios: {
      xenon_salt: 0.50,
      lumina: 0.30,
      saltpeter: 0.20,
    },
    tolerance: 0.03,
    rewardXp: 180,
    flavor: 'Formula: 50% Xenon Salt, 30% Lumina Flower, 20% Saltpeter. Must be ground and sifted superfine to trigger rift folding.',
  }
];

export const INITIAL_ORDERS: ClientOrder[] = [
  {
    id: 'order_1',
    clientName: 'Jack the Pyrotechnician',
    clientAvatar: '🎆',
    dialogue: 'Hey there! The summer festival is next week and I am completely fresh out of fuse powder. Can you grind some Charcoal for me? Coarse or fine, either is good.',
    requiredProduct: {
      type: 'ground',
      targetId: 'coal',
      minGrams: 20,
      minGrade: 'Coarse',
    },
    rewardCoins: 50,
    rewardXp: 20,
    completed: false,
  },
  {
    id: 'order_2',
    clientName: 'Alchemist Serena',
    clientAvatar: '🧙‍♀️',
    dialogue: 'My potions require a highly pure oxidizer. Bring me 25 grams of Saltpeter, ground down to Fine or Superfine quality.',
    requiredProduct: {
      type: 'ground',
      targetId: 'saltpeter',
      minGrams: 25,
      minGrade: 'Fine',
    },
    rewardCoins: 80,
    rewardXp: 35,
    completed: false,
  },
  {
    id: 'order_3',
    clientName: 'Wrecker Bob',
    clientAvatar: '👷‍♂️',
    dialogue: 'We have some old structural beams that we need to melt. I need 50 grams of High-Temp Thermite (70% Rust, 30% Aluminium) to slice right through them. Make it Superfine so it burns fast!',
    requiredProduct: {
      type: 'recipe',
      targetId: 'thermite',
      minGrams: 40,
      minGrade: 'Superfine',
    },
    rewardCoins: 180,
    rewardXp: 60,
    completed: false,
  },
  {
    id: 'order_4',
    clientName: 'Gardener Lily',
    clientAvatar: '👩‍🌾',
    dialogue: 'The giant orchids are blooming slowly this year. Please supply me with 30g of Botanical Bloom Dust. I need that magical Lumina compound mixed with charcoal.',
    requiredProduct: {
      type: 'recipe',
      targetId: 'bloomdust',
      minGrams: 30,
      minGrade: 'Medium',
    },
    rewardCoins: 140,
    rewardXp: 50,
    completed: false,
  },
];

export const LEVEL_UP_XP = [0, 100, 250, 500, 900, 1500, 2500, 4200, 6500, 9500, 13500];

export const UPGRADE_COSTS = {
  pestleSpeed: [0, 75, 150, 300, 600], // levels 1 to 5 cost
  sifterGrade: [0, 100, 250, 500],    // levels 1 to 4 cost
  scalePrecision: [0, 80, 200, 450],  // levels 1 to 4 cost
  sandboxSize: [0, 120, 300, 700],    // levels 1 to 4 cost
  maxOrders: [0, 150, 350, 650],      // levels 1 to 4 cost
};
