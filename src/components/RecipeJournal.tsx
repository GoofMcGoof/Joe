import React from 'react';
import { motion } from 'motion/react';
import { BookOpen, Zap } from 'lucide-react';
import { Inventory, PowderGrade } from '../types';
import { RAW_INGREDIENTS } from '../data';
import { audio } from '../utils/audio';

interface RecipeJournalProps {
  inventory: Inventory;
  updateInventory: (updater: (prev: Inventory) => Inventory) => void;
  onShowMessage: (text: string, type: 'success' | 'error' | 'info') => void;
}

export default function RecipeJournal({ inventory, updateInventory, onShowMessage }: RecipeJournalProps) {
  const saveToJournal = (mixture: any) => {
    updateInventory(prev => {
      const isAlreadyInJournal = prev.recipeJournal.some(r => r.id === mixture.id);
      if (isAlreadyInJournal) {
        onShowMessage("Already in your journal!", "info");
        return prev;
      }
      return {
        ...prev,
        recipeJournal: [...prev.recipeJournal, {
          id: mixture.id,
          name: mixture.name,
          ingredients: Object.entries(mixture.proportions).map(([ingredientId, grams]) => ({ ingredientId, grams: grams as number })),
          grade: mixture.grade
        }]
      };
    });
    onShowMessage("Recipe saved!", "success");
    audio.playUnlock();
  };

  return (
    <div className="bg-[#0a0a0f] border border-white/10 rounded-lg p-5 flex flex-col gap-6 backdrop-blur-md h-full">
      <div className="flex items-center gap-2 pb-3 border-b border-white/10">
        <BookOpen className="w-5 h-5 text-cyan-400" />
        <div>
          <h3 className="font-display font-bold text-white uppercase tracking-wider text-xs">Recipe Journal</h3>
          <p className="text-[11px] text-white/40">Your collection of saved powder formulas.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <h4 className="text-white text-xs font-bold uppercase mb-2">Saved Recipes</h4>
          {inventory.recipeJournal.length === 0 ? (
            <div className="text-center py-4 text-slate-500 text-[10px] font-sans">
              No saved recipes yet.
            </div>
          ) : (
            inventory.recipeJournal.map(recipe => (
              <div key={recipe.id} className="p-3 bg-white/5 border border-white/10 rounded flex justify-between items-center">
                <div>
                  <h4 className="text-white font-bold text-xs">{recipe.name}</h4>
                  <p className="text-[10px] text-white/50">{recipe.grade} Grade</p>
                </div>
                <button 
                  onClick={() => onShowMessage(`Quick-crafting ${recipe.name}...`, 'info')}
                  className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded text-[10px] font-mono flex items-center gap-1 hover:bg-cyan-500/30 transition-all"
                >
                  <Zap className="w-3 h-3" />
                  Craft
                </button>
              </div>
            ))
          )}
        </div>

        <div className="flex flex-col gap-2">
          <h4 className="text-white text-xs font-bold uppercase mb-2">Past Mixtures</h4>
          {inventory.mixtures.length === 0 ? (
            <div className="text-center py-4 text-slate-500 text-[10px] font-sans">
              No past mixtures.
            </div>
          ) : (
            inventory.mixtures.map(mixture => (
              <div key={mixture.id} className="p-3 bg-black/30 border border-white/5 rounded flex justify-between items-center">
                <div>
                  <h4 className="text-white font-bold text-xs">{mixture.name}</h4>
                  <p className="text-[10px] text-white/50">{mixture.grade} Grade</p>
                </div>
                <button 
                  onClick={() => saveToJournal(mixture)}
                  className="px-3 py-1 bg-white/10 text-white rounded text-[10px] font-mono flex items-center gap-1 hover:bg-white/20 transition-all"
                >
                  Save
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
