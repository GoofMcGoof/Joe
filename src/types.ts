/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PowderGrade = 'Coarse' | 'Medium' | 'Fine' | 'Superfine' | 'Ultra' | 'Transmuted';

export interface RawIngredient {
  id: string;
  name: string;
  color: string;
  particleColor: string; // Color of the crushed powder
  cost: number;
  description: string;
  hardness: number; // How many grinds needed (1-10)
  category: 'Fuel' | 'Oxidizer' | 'Metal' | 'Magic' | 'Catalyst';
}

export interface Worker {
  id: string;
  name: string;
  role: 'grinder' | 'sifter' | 'miner';
  avatar: string;
  hired: boolean;
  wage: number; // coins per 5s tick
  description: string;
  status: 'active' | 'idle' | 'striking';
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
  unlockedAt?: number;
}

export interface RecipeJournal {
  id: string;
  name: string;
  ingredients: { ingredientId: string; grams: number }[];
  grade: PowderGrade;
}

export interface TaxEvasionSkills {
  assetProtection: number; // Reduces IRS tax (rebirth)
  hiddenAssets: number; // Increases raw materials retained after rebirth
  creativeAccounting: number; // Increases coin multiplier per level
}

export interface Inventory {
  coins: number;
  xp: number;
  level: number;
  rawMaterials: Record<string, number>; // id -> quantity (units/chunks)
  groundPowders: Record<string, {
    grams: number;
    grade: PowderGrade;
  }>; // ingredientId -> details
  mixtures: Mixture[]; // custom formulated powders
  unlockedRecipes: string[]; // recipe IDs
  upgrades: {
    pestleSpeed: number; // level 1-5
    sifterGrade: number; // level 1-3
    scalePrecision: number; // level 1-3
    sandboxSize: number; // level 1-3
    maxOrders: number; // level 1-4
  };
  workers: Worker[];
  recipeJournal: RecipeJournal[];
  achievements: Achievement[];
  rebirths: number;
  taxEvasionSkills: TaxEvasionSkills;
}

export interface Mixture {
  id: string;
  name: string;
  proportions: Record<string, number>; // ingredientId -> percentage (0-1)
  grams: number;
  color: string;
  grade: PowderGrade;
  properties: {
    flammability: number; // 0-1
    explosiveness: number; // 0-1
    conductivity: number; // 0-1
    antiGravity: number; // 0-1 (floats up)
    glow: boolean;
    glowColor?: string;
    growthFactor: number; // 0-1 (grows grass/wood)
    reactiveThermite: boolean; // rust + aluminium
    flashPotential: boolean; // sulfur + aluminium
  };
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  requiredRatios: Record<string, number>; // ingredientId -> percentage (0-1)
  tolerance: number; // e.g. 0.05 (5% margin)
  rewardXp: number;
  flavor: string;
}

export interface ClientOrder {
  id: string;
  clientName: string;
  clientAvatar: string;
  dialogue: string;
  requiredProduct: {
    type: 'raw' | 'ground' | 'mixture' | 'recipe';
    targetId: string; // ingredientId, recipeId, or "mixture" with special conditions
    minGrams: number;
    minGrade?: PowderGrade;
    conditions?: {
      minFlammability?: number;
      minExplosiveness?: number;
      minAntiGravity?: number;
    };
  };
  rewardCoins: number;
  rewardXp: number;
  completed: boolean;
  isRich?: boolean; // VIP client offering high rewards and complex contracts
}

// Sandbox Physics Elements
export type ElementType =
  | 'empty'
  | 'stone'
  | 'wood'
  | 'sand'
  | 'water'
  | 'fire'
  | 'acid'
  | 'lava'
  | 'oil'
  | 'spark'
  | 'smoke'
  | 'plant'
  | 'powder_charcoal'
  | 'powder_sulfur'
  | 'powder_saltpeter'
  | 'powder_iron'
  | 'powder_rust'
  | 'powder_aluminium'
  | 'powder_lumina'
  | 'powder_phosphor'
  | 'powder_plasma'
  | 'powder_xenon'
  | 'powder_cobalt'
  | 'powder_silver'
  | 'powder_mercury'
  | 'custom_mixture';

export interface SandboxElement {
  id?: number;
  type: ElementType;
  color: string;
  life?: number;
  temp?: number;
  vx?: number;
  vy?: number;
  mixtureId?: string; // Reference to custom mixture properties
  glow?: boolean;
}
