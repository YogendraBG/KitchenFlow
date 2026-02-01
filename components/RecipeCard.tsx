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
      className={`relative group bg-white/80 backdrop-blur-sm rounded-3xl overflow-hidden flex flex-col h-full transition-all duration-300 ${compact ? 'shadow-sm hover:shadow-md' : 'shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1'}`}
      onClick={() => onSelect && onSelect(recipe)}
    >
      <div className={`relative ${compact ? 'h-24' : 'h-48'} overflow-hidden`}>
        <img 
          src={`https://picsum.photos/seed/${recipe.title.replace(/\s/g, '')}/400/300`} 
          alt={recipe.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        
        {/* Gradient Overlay for Text Readability if needed, mostly for aesthetics */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Prep Time Badge */}
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold text-slate-700 shadow-sm flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-accent">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clipRule="evenodd" />
          </svg>
          {recipe.prepTimeMinutes}m
        </div>

        {/* Favorite Button */}
        {onToggleFavorite && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(recipe);
            }}
            className="absolute top-3 right-3 p-2 rounded-full bg-white/30 backdrop-blur-md border border-white/50 shadow-sm hover:bg-white transition-all active:scale-90"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill={isFavorite ? "#f43f5e" : "none"} 
              stroke={isFavorite ? "#f43f5e" : "white"} 
              strokeWidth={isFavorite ? 0 : 2}
              className="w-5 h-5 drop-shadow-sm"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
          </button>
        )}
      </div>
      
      <div className="p-5 flex-1 flex flex-col">
        <h3 className={`font-bold text-slate-800 leading-snug mb-2 ${compact ? 'text-sm' : 'text-xl'}`}>
          {recipe.title}
        </h3>
        
        {!compact && (
          <p className="text-slate-500 text-sm mb-4 line-clamp-2 leading-relaxed flex-1 font-light">
            {recipe.description}
          </p>
        )}

        <div className="flex items-center justify-between mt-auto">
          <div className="flex flex-wrap gap-1.5 overflow-hidden">
             {recipe.tags?.slice(0, compact ? 1 : 2).map((tag, i) => (
               <span key={i} className="text-[10px] uppercase tracking-wider bg-rose-50 text-rose-600 px-2.5 py-1 rounded-lg font-semibold">
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
              className="group/btn relative bg-slate-900 hover:bg-slate-800 text-white rounded-full p-2.5 shadow-lg shadow-slate-200 transition-all active:scale-95"
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