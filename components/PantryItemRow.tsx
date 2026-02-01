import React from 'react';
import { PantryItem } from '../types';

interface PantryItemRowProps {
  item: PantryItem;
  onDelete: (id: string) => void;
}

export const PantryItemRow: React.FC<PantryItemRowProps> = ({ item, onDelete }) => {
  const getStatusColor = (dateStr: string) => {
    if (!dateStr) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(dateStr);
    
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'bg-slate-200 text-slate-500 border-slate-300'; // Expired
    if (diffDays <= 3) return 'bg-red-100 text-red-800 border-red-200'; // Critical
    if (diffDays <= 7) return 'bg-orange-100 text-orange-800 border-orange-200'; // Warning
    return 'bg-emerald-100 text-emerald-800 border-emerald-200'; // Good
  };

  const getStatusText = (dateStr: string) => {
    if (!dateStr) return 'No Date';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(dateStr);
    
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Expired';
    if (diffDays === 0) return 'Expires Today';
    if (diffDays === 1) return 'Expires Tomorrow';
    return `Expires in ${diffDays} days`;
  };

  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-bold text-slate-800 truncate">{item.name}</h4>
          <span className="text-xs text-slate-400 font-medium px-2 py-0.5 bg-slate-50 rounded-full border border-slate-100">
            {item.quantity}
          </span>
        </div>
        <div className="flex items-center gap-2">
           <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getStatusColor(item.expirationDate)}`}>
             {getStatusText(item.expirationDate)}
           </span>
           <span className="text-[10px] text-slate-400">{item.expirationDate}</span>
        </div>
      </div>
      
      <button 
        onClick={() => onDelete(item.id)}
        className="ml-4 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
};