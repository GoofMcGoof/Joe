import React from 'react';
import { Trophy, Lock, Unlock } from 'lucide-react';
import { Inventory } from '../types';

interface AchievementPanelProps {
  inventory: Inventory;
}

export default function AchievementPanel({ inventory }: AchievementPanelProps) {
  return (
    <div className="bg-[#0a0a0f] border border-white/10 rounded-lg p-5 flex flex-col gap-4 backdrop-blur-md h-full">
      <div className="flex items-center gap-2 pb-3 border-b border-white/10">
        <Trophy className="w-5 h-5 text-yellow-400" />
        <div>
          <h3 className="font-display font-bold text-white uppercase tracking-wider text-xs">Achievements</h3>
          <p className="text-[11px] text-white/40">Your path to alchemical greatness.</p>
        </div>
      </div>

      <div className="flex flex-col gap-2 overflow-y-auto">
        {inventory.achievements.map(achievement => (
          <div key={achievement.id} className={`p-3 rounded border flex gap-3 items-center ${achievement.unlocked ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-white/5 border-white/5'}`}>
            {achievement.unlocked ? (
              <Unlock className="w-6 h-6 text-yellow-400" />
            ) : (
              <Lock className="w-6 h-6 text-white/20" />
            )}
            <div>
              <h4 className={`text-xs font-bold ${achievement.unlocked ? 'text-white' : 'text-white/40'}`}>{achievement.name}</h4>
              <p className="text-[10px] text-white/50">{achievement.description}</p>
              {achievement.unlockedAt && (
                <p className="text-[9px] text-yellow-500/50 font-mono mt-1">Unlocked: {new Date(achievement.unlockedAt).toLocaleDateString()}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
