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
        className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="bg-white pointer-events-auto w-full max-w-lg h-[90vh] sm:h-auto sm:max-h-[85vh] sm:rounded-2xl rounded-t-3xl shadow-2xl overflow-hidden flex flex-col transform transition-transform animate-slide-up">
        
        {/* Header Image */}
        <div className="relative h-56 shrink-0">
           <img 
            src={`https://picsum.photos/seed/${recipe.title.replace(/\s/g, '')}/600/400`} 
            alt={recipe.title}
            className="w-full h-full object-cover"
          />
          <button 
            onClick={onClose}
            className="absolute top-4 left-4 bg-white/30 backdrop-blur-md hover:bg-white/50 text-white p-2 rounded-full transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <button 
            onClick={() => onToggleFavorite(recipe)}
            className="absolute top-4 right-4 bg-white/30 backdrop-blur-md hover:bg-white/50 p-2 rounded-full transition-colors active:scale-95"
          >
             <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill={isFavorite ? "currentColor" : "none"} 
              stroke="currentColor" 
              strokeWidth={isFavorite ? 0 : 2}
              className={`w-6 h-6 ${isFavorite ? 'text-rose-500' : 'text-white'}`}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
          </button>
        </div>

        {/* Content Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">{recipe.title}</h2>
          <p className="text-slate-600 mb-6">{recipe.description}</p>

          <div className="grid grid-cols-2 gap-4 mb-6">
             <div className="bg-orange-50 p-3 rounded-xl border border-orange-100">
               <span className="text-orange-600 text-xs font-bold uppercase tracking-wide">Calories</span>
               <p className="text-lg font-semibold text-slate-800">{recipe.calories || 'N/A'}</p>
             </div>
             <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
               <span className="text-blue-600 text-xs font-bold uppercase tracking-wide">Prep Time</span>
               <p className="text-lg font-semibold text-slate-800">{recipe.prepTimeMinutes} min</p>
             </div>
          </div>

          {/* Video Section */}
          {recipe.videoUrl && (
            <div className="mb-6">
               <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-red-500">
                  <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
                </svg>
                Video Tutorial
              </h3>
              <div className="rounded-xl overflow-hidden shadow-sm bg-slate-100 border border-slate-200">
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
                    className="block p-4 text-center text-emerald-600 font-medium hover:bg-slate-50 transition-colors"
                   >
                     Watch on YouTube &rarr;
                   </a>
                )}
              </div>
            </div>
          )}

          <div className="mb-6">
            <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
              </svg>
              Ingredients
            </h3>
            <ul className="space-y-2">
              {recipe.ingredients.map((ing, idx) => (
                <li key={idx} className="flex justify-between items-center text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <span>{ing.name}</span>
                  <span className="font-medium text-slate-500">{ing.amount}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
              Instructions
            </h3>
            <ol className="space-y-4">
              {recipe.instructions.map((step, idx) => (
                <li key={idx} className="flex gap-4">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold mt-0.5">
                    {idx + 1}
                  </span>
                  <p className="text-slate-600 leading-relaxed">{step}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0">
          <button 
            onClick={() => {
              onAddToPlan(recipe);
              onClose();
            }}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-emerald-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            Add to Schedule
          </button>
        </div>
      </div>
    </div>
  );
};