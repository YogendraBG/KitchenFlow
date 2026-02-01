import React from 'react';
import { Recipe } from '../types';

interface RecipeCardProps {
  recipe: Recipe;
  onSelect?: (recipe: Recipe) => void;
  onAdd?: (recipe: Recipe) => void;
  onToggleFavorite?: (recipe: Recipe) => void;
  isFavorite?: boolean;
  compact?: boolean;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({ 
  recipe, 
  onSelect, 
  onAdd, 
  onToggleFavorite,
  isFavorite = false,
  compact = false 
}) => {
  return (
    <div 
      className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full transition-transform active:scale-[0.98]"
      onClick={() => onSelect && onSelect(recipe)}
    >
      <div className={`relative ${compact ? 'h-24' : 'h-40'} bg-slate-200`}>
        <img 
          src={`https://picsum.photos/seed/${recipe.title.replace(/\s/g, '')}/400/300`} 
          alt={recipe.title}
          className="w-full h-full object-cover"
        />
        
        {/* Prep Time Badge */}
        <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-md text-[10px] font-bold text-white shadow-sm">
          {recipe.prepTimeMinutes}m
        </div>

        {/* Favorite Button */}
        {onToggleFavorite && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(recipe);
            }}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 backdrop-blur-sm shadow-sm hover:bg-white transition-colors active:scale-90"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill={isFavorite ? "currentColor" : "none"} 
              stroke="currentColor" 
              strokeWidth={isFavorite ? 0 : 2}
              className={`w-5 h-5 ${isFavorite ? 'text-rose-500' : 'text-slate-400'}`}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
          </button>
        )}
      </div>
      
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-bold text-slate-800 text-lg leading-tight mb-1 line-clamp-2">
          {recipe.title}
        </h3>
        
        {!compact && (
          <p className="text-slate-500 text-sm mb-3 line-clamp-2 flex-1">
            {recipe.description}
          </p>
        )}

        <div className="flex items-center justify-between mt-auto pt-2">
          <div className="flex gap-1 overflow-hidden">
             {recipe.tags?.slice(0, 2).map((tag, i) => (
               <span key={i} className="text-[10px] uppercase tracking-wider bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md font-medium">
                 {tag}
               </span>
             ))}
          </div>
          
          {onAdd && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onAdd(recipe);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full p-2 shadow-md transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};