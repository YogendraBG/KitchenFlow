import React from 'react';
import { Recipe } from '../types';

interface RecipeDetailModalProps {
  recipe: Recipe | null;
  onClose: () => void;
  onAddToPlan: (recipe: Recipe) => void;
  onToggleFavorite: (recipe: Recipe) => void;
  isFavorite: boolean;
}

const getYoutubeId = (url: string) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

export const RecipeDetailModal: React.FC<RecipeDetailModalProps> = ({ 
  recipe, 
  onClose, 
  onAddToPlan,
  onToggleFavorite,
  isFavorite
}) => {
  if (!recipe) return null;

  const youtubeId = recipe.videoUrl ? getYoutubeId(recipe.videoUrl) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm pointer-events-auto transition-opacity duration-300" 
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="bg-white pointer-events-auto w-full max-w-lg h-[92vh] sm:h-auto sm:max-h-[85vh] sm:rounded-3xl rounded-t-[2.5rem] shadow-2xl overflow-hidden flex flex-col transform transition-transform animate-slide-up relative">
        
        {/* Floating Close Button */}
        <div className="absolute top-4 left-0 w-full z-20 flex justify-between px-4">
            <button 
                onClick={onClose}
                className="bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-white/40 p-2.5 rounded-full transition-all shadow-lg"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
            </button>

            <button 
                onClick={() => onToggleFavorite(recipe)}
                className="bg-white/20 backdrop-blur-md border border-white/30 p-2.5 rounded-full transition-all shadow-lg active:scale-95"
            >
                <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill={isFavorite ? "#f43f5e" : "rgba(255,255,255,0.2)"} 
                stroke={isFavorite ? "#f43f5e" : "white"} 
                strokeWidth={isFavorite ? 0 : 2}
                className="w-6 h-6"
                >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
            </button>
        </div>

        {/* Header Image */}
        <div className="relative h-72 shrink-0">
           <img 
            src={`https://picsum.photos/seed/${recipe.title.replace(/\s/g, '')}/600/600`} 
            alt={recipe.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-black/30"></div>
        </div>

        {/* Content Scrollable */}
        <div className="flex-1 overflow-y-auto px-8 -mt-12 relative z-10">
          <div className="bg-white rounded-t-3xl pt-2 pb-8">
            <h2 className="text-3xl font-bold text-slate-800 mb-2 tracking-tight">{recipe.title}</h2>
            <p className="text-slate-500 font-light leading-relaxed mb-6">{recipe.description}</p>

            <div className="flex gap-4 mb-8 overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-3 px-4 py-3 bg-rose-50 rounded-2xl border border-rose-100 min-w-[120px]">
                    <div className="bg-white p-2 rounded-full shadow-sm text-rose-500">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                            <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.616a1 1 0 01.894-1.79l1.599.8L9 4.323V3a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Calories</p>
                        <p className="font-semibold text-slate-800">{recipe.calories || 350} kcal</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 px-4 py-3 bg-teal-50 rounded-2xl border border-teal-100 min-w-[120px]">
                    <div className="bg-white p-2 rounded-full shadow-sm text-teal-500">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-teal-400 uppercase tracking-wider">Prep Time</p>
                        <p className="font-semibold text-slate-800">{recipe.prepTimeMinutes} min</p>
                    </div>
                </div>
            </div>

            <div className="mb-8">
                <h3 className="font-bold text-slate-900 text-lg mb-4">Ingredients</h3>
                <ul className="space-y-3">
                {recipe.ingredients.map((ing, idx) => (
                    <li key={idx} className="flex justify-between items-center group">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-slate-200 group-hover:bg-primary transition-colors"></div>
                            <span className="text-slate-600 font-medium group-hover:text-slate-900 transition-colors">{ing.name}</span>
                        </div>
                        <span className="text-sm font-semibold text-slate-400 bg-slate-50 px-3 py-1 rounded-full">{ing.amount}</span>
                    </li>
                ))}
                </ul>
            </div>

            <div className="mb-8">
                <h3 className="font-bold text-slate-900 text-lg mb-4">Instructions</h3>
                <ol className="relative border-l border-slate-100 ml-3 space-y-6">
                {recipe.instructions.map((step, idx) => (
                    <li key={idx} className="mb-6 ml-6">
                        <span className="absolute flex items-center justify-center w-8 h-8 bg-white rounded-full -left-4 ring-4 ring-white border border-slate-100 text-xs font-bold text-slate-400 shadow-sm">
                            {idx + 1}
                        </span>
                        <p className="text-slate-600 leading-relaxed font-light">{step}</p>
                    </li>
                ))}
                </ol>
            </div>

            {/* Video Section */}
            {recipe.videoUrl && (
                <div className="mb-8">
                    <h3 className="font-bold text-slate-900 text-lg mb-4">Video Tutorial</h3>
                    <div className="rounded-2xl overflow-hidden shadow-lg shadow-slate-200">
                        {youtubeId ? (
                        <iframe 
                            width="100%" 
                            height="200" 
                            src={`https://www.youtube.com/embed/${youtubeId}`} 
                            title="YouTube video player" 
                            frameBorder="0" 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                            allowFullScreen
                            className="w-full aspect-video"
                        ></iframe>
                        ) : (
                        <a 
                            href={recipe.videoUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="block bg-slate-50 p-6 text-center text-primary font-medium hover:bg-slate-100 transition-colors"
                        >
                            Watch Video on YouTube &rarr;
                        </a>
                        )}
                    </div>
                </div>
            )}
          </div>
        </div>

        {/* Floating Action Button Footer */}
        <div className="absolute bottom-6 left-0 w-full px-6 pointer-events-none">
          <button 
            onClick={() => {
              onAddToPlan(recipe);
              onClose();
            }}
            className="w-full pointer-events-auto bg-slate-900 text-white font-medium py-4 rounded-2xl shadow-xl shadow-slate-300 active:scale-[0.98] transition-all flex items-center justify-center gap-3 text-lg hover:bg-slate-800"
          >
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v2.5h-2.5a.75.75 0 000 1.5h2.5v2.5a.75.75 0 001.5 0v-2.5h2.5a.75.75 0 000-1.5h-2.5v-2.5z" clipRule="evenodd" />
            </svg>
            Add to Schedule
          </button>
        </div>
      </div>
    </div>
  );
};