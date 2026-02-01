import React, { useState, useEffect, useRef } from 'react';
import { generateRecipes } from './services/geminiService';
import { initGoogleClient, signIn, signOut, syncToSheets, loadFromSheets, AppData } from './services/googleSheetsService';
import { fuzzyMatch } from './services/searchService';
import { Recipe, DayPlan, ViewState, MealType, UserPreferences, CookingSkill, PantryItem, SyncState } from './types';
import { RecipeCard } from './components/RecipeCard';
import { RecipeDetailModal } from './components/RecipeDetailModal';
import { PantryItemRow } from './components/PantryItemRow';

// --- Icons ---
const HomeIcon = ({ active }: { active: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 2} className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
  </svg>
);
const CalendarIcon = ({ active }: { active: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 2} className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
  </svg>
);
const ChefIcon = ({ active }: { active: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 2} className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 00-1.423 1.423z" />
  </svg>
);
const HeartIcon = ({ active }: { active: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 2} className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
  </svg>
);
const PantryIcon = ({ active }: { active: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 2} className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
  </svg>
);

// --- Helpers ---
const getTodayDate = () => new Date().toISOString().split('T')[0];
const getDayName = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
};
const getFutureDates = (days: number) => {
  const dates = [];
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
};

// --- Constants ---
const REGIONS = [
    "South Indian",
    "North Indian",
    "Italian",
    "Mexican",
    "Thai",
    "Chinese",
    "Mediterranean",
    "American",
    "Japanese",
    "French"
];

// --- Sub Components ---
const Header = ({ onProfileClick, view, syncState }: { onProfileClick: () => void, view: ViewState, syncState: SyncState }) => (
  <div className="fixed top-0 w-full z-30 px-6 pt-12 pb-4 flex justify-between items-center bg-white/70 backdrop-blur-xl border-b border-white/40">
    <div>
      <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-500 tracking-tight flex items-center gap-2 drop-shadow-sm">
          KitchenFlow
          {/* Sync Status Dot */}
          {syncState === 'syncing' && <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shadow-[0_0_8px_rgba(96,165,250,0.6)]" title="Syncing..."></span>}
          {syncState === 'synced' && <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" title="Synced"></span>}
      </h1>
      <p className="text-xs text-slate-500 font-medium tracking-wide">Your Smart Culinary Assistant</p>
    </div>
    <button 
      onClick={onProfileClick}
      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border transition-all duration-300 shadow-md ${
          view === 'settings' 
            ? 'bg-slate-900 text-white border-slate-900 scale-105' 
            : 'bg-white text-slate-700 border-slate-100 hover:border-slate-300 hover:shadow-lg'
      }`}
    >
      {view === 'settings' ? (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
        </svg>
      ) : 'K'}
    </button>
  </div>
);

const EmptyState = ({ message, onAction, actionText, icon }: { message: string, onAction: () => void, actionText: string, icon?: React.ReactNode }) => (
  <div className="flex flex-col items-center justify-center py-16 px-8 text-center h-full animate-fade-in">
    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 text-slate-300 shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
      {icon || (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )}
    </div>
    <h3 className="text-xl font-semibold text-slate-800 mb-3">Nothing here yet</h3>
    <p className="text-slate-500 text-sm mb-8 max-w-[240px] leading-relaxed">{message}</p>
    <button 
        onClick={onAction} 
        className="px-6 py-3 rounded-full bg-white border border-slate-200 text-slate-900 font-semibold shadow-sm hover:shadow-md transition-all active:scale-95"
    >
      {actionText}
    </button>
  </div>
);

export default function App() {
  const [view, setView] = useState<ViewState>('dashboard');
  const [schedule, setSchedule] = useState<Record<string, DayPlan>>({});
  const [favorites, setFavorites] = useState<Recipe[]>([]);
  const [generatedRecipes, setGeneratedRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [planTarget, setPlanTarget] = useState<{ date: string, meal: MealType } | null>(null);
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  
  // Sync State
  const [syncState, setSyncState] = useState<SyncState>('offline');
  const [isSignedIn, setIsSignedIn] = useState(false);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Generator State
  const [prompt, setPrompt] = useState("");
  const [ingredientInput, setIngredientInput] = useState("");
  const [ingredients, setIngredients] = useState<string[]>([]);
  
  // Search State
  const [favoritesSearchQuery, setFavoritesSearchQuery] = useState("");
  const [pantrySearchQuery, setPantrySearchQuery] = useState("");

  // Recommendation State
  const [dailyRecs, setDailyRecs] = useState<Recipe[]>([]);
  const [recLoading, setRecLoading] = useState(false);

  // Pantry Form State
  const [newItemName, setNewItemName] = useState("");
  const [newItemQty, setNewItemQty] = useState("");
  const [newItemDate, setNewItemDate] = useState("");

  const [preferences, setPreferences] = useState<UserPreferences>({
    dietaryRestrictions: "",
    excludeIngredients: "",
    servings: 2,
    cookingSkill: 'Intermediate',
    region: ""
  });

  // Load data from local storage on mount
  useEffect(() => {
    const savedSchedule = localStorage.getItem('kitchenflow_schedule');
    const savedFavorites = localStorage.getItem('kitchenflow_favorites');
    const savedPreferences = localStorage.getItem('kitchenflow_preferences');
    const savedPantry = localStorage.getItem('kitchenflow_pantry');
    
    if (savedSchedule) {
      try { setSchedule(JSON.parse(savedSchedule)); } catch (e) { console.error(e); }
    } else {
        const dates = getFutureDates(7);
        const initialSchedule: Record<string, DayPlan> = {};
        dates.forEach(d => { initialSchedule[d] = { date: d, meals: {} }; });
        setSchedule(initialSchedule);
    }

    if (savedFavorites) {
        try { setFavorites(JSON.parse(savedFavorites)); } catch (e) { console.error(e); }
    }

    if (savedPreferences) {
        try { setPreferences(JSON.parse(savedPreferences)); } catch (e) { console.error(e); }
    }

    if (savedPantry) {
        try { setPantry(JSON.parse(savedPantry)); } catch (e) { console.error(e); }
    }

    // Initialize Google Auth
    initGoogleClient((signedIn) => {
        setIsSignedIn(signedIn);
        if (signedIn) {
            setSyncState('syncing');
            // Initial pull from cloud
            loadFromSheets().then(data => {
                if (data) {
                    if (data.pantry) setPantry(data.pantry);
                    if (data.schedule) setSchedule(data.schedule);
                    if (data.favorites) setFavorites(data.favorites);
                    if (data.preferences) setPreferences(data.preferences);
                    setSyncState('synced');
                } else {
                    setSyncState('synced'); // No data yet or create failed but authed
                }
            });
        } else {
            setSyncState('auth_required');
        }
    });
  }, []);

  // Centralized Persist & Sync Effect
  useEffect(() => {
    // 1. Save to LocalStorage (Instant)
    if (Object.keys(schedule).length > 0) localStorage.setItem('kitchenflow_schedule', JSON.stringify(schedule));
    localStorage.setItem('kitchenflow_favorites', JSON.stringify(favorites));
    localStorage.setItem('kitchenflow_preferences', JSON.stringify(preferences));
    localStorage.setItem('kitchenflow_pantry', JSON.stringify(pantry));

    // 2. Sync to Cloud (Debounced)
    if (isSignedIn) {
        setSyncState('syncing');
        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
        
        // Wait 3 seconds of inactivity before pushing to Google Sheets
        syncTimeoutRef.current = setTimeout(async () => {
             const data: AppData = { pantry, schedule, favorites, preferences };
             await syncToSheets(data);
             setSyncState('synced');
        }, 3000); // 3s debounce
    }
  }, [schedule, favorites, preferences, pantry, isSignedIn]);

  // Auto Recommendation Effect
  useEffect(() => {
    const generateDailyRecs = async () => {
       const today = getTodayDate();
       const key = `kitchenflow_daily_recs_v2_${today}`; // Versioned key to break cache from old single-recipe format
       const savedRecs = localStorage.getItem(key);

       if (savedRecs) {
           try {
               const parsed = JSON.parse(savedRecs);
               if (Array.isArray(parsed) && parsed.length > 0) {
                   setDailyRecs(parsed);
                   return;
               }
           } catch (e) {
               console.error("Error parsing saved recs", e);
           }
       }

       // Only generate if we don't have one and not currently loading
       // We delay slightly to ensure pantry/prefs are loaded
       setRecLoading(true);

       // Determine Context
       const hour = new Date().getHours();
       let mealTime = "Dinner";
       if (hour < 11) mealTime = "Breakfast";
       else if (hour < 15) mealTime = "Lunch";

       const expiring = getExpiringItems();
       const expiringIngredients = expiring.map(i => i.name);
       
       const prompt = `Suggest 3 distinct ${mealTime} recipes${expiringIngredients.length > 0 ? ` that use ${expiringIngredients.slice(0, 3).join(', ')} to reduce waste` : ''}. Make sure they are appropriate for ${mealTime}.`;
       
       const recipes = await generateRecipes(prompt, expiringIngredients, preferences, 3);
       
       if (recipes && recipes.length > 0) {
           // Add tags to all
           recipes.forEach(r => {
               if (!r.tags.includes('Chef\'s Pick')) r.tags.unshift('Chef\'s Pick');
           });
           setDailyRecs(recipes);
           localStorage.setItem(key, JSON.stringify(recipes));
       }
       setRecLoading(false);
    };

    // Trigger only if we have some data loaded or after a short delay
    const t = setTimeout(() => {
        generateDailyRecs();
    }, 1000);

    return () => clearTimeout(t);
  }, [pantry, preferences]); // Re-run if these change heavily

  const handleSignIn = () => {
      signIn();
      setSyncState('syncing');
      setTimeout(() => {
           initGoogleClient((signedIn) => {
               setIsSignedIn(signedIn);
               if(signedIn) setSyncState('synced');
           });
      }, 5000);
  };
  
  const handleSignOut = () => {
      signOut();
      setIsSignedIn(false);
      setSyncState('auth_required');
  };

  const handleGenerate = async () => {
    if (!prompt.trim() && ingredients.length === 0) return;
    setLoading(true);
    setGeneratedRecipes([]);
    const recipes = await generateRecipes(prompt, ingredients, preferences);
    setGeneratedRecipes(recipes);
    setLoading(false);
  };

  const handleAddIngredient = () => {
      if (ingredientInput.trim()) {
          setIngredients([...ingredients, ingredientInput.trim()]);
          setIngredientInput("");
      }
  };

  const handleRemoveIngredient = (index: number) => {
      setIngredients(ingredients.filter((_, i) => i !== index));
  };

  // Pantry Actions
  const handleAddToPantry = () => {
    if (newItemName.trim() && newItemQty.trim()) {
        const newItem: PantryItem = {
            id: Date.now().toString(),
            name: newItemName.trim(),
            quantity: newItemQty.trim(),
            expirationDate: newItemDate || ""
        };
        setPantry(prev => [...prev, newItem]);
        setNewItemName("");
        setNewItemQty("");
        setNewItemDate("");
    }
  };

  const handleDeletePantryItem = (id: string) => {
      setPantry(prev => prev.filter(item => item.id !== id));
  };

  const getExpiringItems = () => {
      const today = new Date();
      today.setHours(0,0,0,0);
      return pantry.filter(item => {
          if(!item.expirationDate) return false;
          const expiry = new Date(item.expirationDate);
          const diffTime = expiry.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return diffDays <= 7; // Expiring in a week or expired
      });
  };

  const handleCookExpiring = () => {
      const expiring = getExpiringItems();
      const expiringNames = expiring.map(item => item.name);
      setIngredients(expiringNames);
      setPrompt("Recipe using expiring ingredients");
      setView('generator');
  };

  const addToSchedule = (recipe: Recipe) => {
    if (planTarget) {
      setSchedule(prev => ({
        ...prev,
        [planTarget.date]: {
          ...prev[planTarget.date],
          meals: {
            ...prev[planTarget.date]?.meals,
            [planTarget.meal]: recipe
          }
        }
      }));
      setPlanTarget(null);
      setView('planner');
    } else {
        const dates = getFutureDates(7);
        let targetDate = null;
        for (const d of dates) {
            if (!schedule[d]?.meals?.Dinner) {
                targetDate = d;
                break;
            }
        }

        if (targetDate) {
             setSchedule(prev => ({
                ...prev,
                [targetDate!]: {
                    ...prev[targetDate!],
                    meals: {
                        ...prev[targetDate!]?.meals,
                        Dinner: recipe
                    }
                }
            }));
            setView('planner');
        } else {
            alert("Your dinner schedule for the next 7 days is full! Try replacing a meal explicitly.");
        }
    }
  };

  const toggleFavorite = (recipe: Recipe) => {
      setFavorites(prev => {
          const exists = prev.some(r => r.id === recipe.id);
          if (exists) {
              return prev.filter(r => r.id !== recipe.id);
          } else {
              return [recipe, ...prev];
          }
      });
  };

  const isRecipeFavorite = (recipeId: string) => favorites.some(r => r.id === recipeId);

  // --- Views ---

  const renderDashboard = () => {
    const today = getTodayDate();
    const todaysPlan = schedule[today];
    const expiringCount = getExpiringItems().length;

    return (
      <div className="pb-32 px-4 pt-32 max-w-lg mx-auto space-y-8">
        {/* Hero Section */}
        <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl shadow-rose-200/50 group transition-transform active:scale-[0.99] mt-2">
             {/* Gradient Background - Soft feminine gradient */}
             <div className="absolute inset-0 bg-gradient-to-bl from-rose-300 via-rose-400 to-orange-300 opacity-90"></div>
             
             {/* Abstract Glass Shapes */}
             <div className="absolute top-[-20%] right-[-10%] w-48 h-48 bg-white/20 rounded-full blur-2xl"></div>
             <div className="absolute bottom-[-10%] left-[-10%] w-32 h-32 bg-yellow-200/30 rounded-full blur-xl"></div>
             
             <div className="relative z-10 p-8 text-white">
                 <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-4xl font-bold mb-1 tracking-tight drop-shadow-sm">Good Day</h2>
                        <p className="text-white/90 font-medium text-lg tracking-wide">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                    </div>
                    {/* Decorative Icon */}
                    <div className="bg-white/20 p-3 rounded-full backdrop-blur-md">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-white">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                        </svg>
                    </div>
                 </div>
                 
                 <div className="mt-8 flex gap-3">
                    <button onClick={() => setView('generator')} className="bg-white/20 backdrop-blur-xl border border-white/40 px-6 py-3 rounded-2xl text-sm font-semibold hover:bg-white/30 transition-all active:scale-95 shadow-lg shadow-rose-900/10">
                        Discover
                    </button>
                    <button onClick={() => setView('planner')} className="bg-white text-rose-500 px-6 py-3 rounded-2xl text-sm font-bold shadow-lg shadow-rose-900/10 hover:bg-rose-50 transition-all active:scale-95">
                        My Plan
                    </button>
                 </div>
             </div>
        </div>
        
        {/* Auto Recommendation Section */}
        <div className="animate-fade-in">
           <div className="flex items-center justify-between mb-4 px-1">
             <div className="flex items-center gap-2">
                 <div className="bg-indigo-100 p-2 rounded-xl text-indigo-500">
                    <ChefIcon active={true} />
                 </div>
                 <h3 className="font-bold text-slate-800 text-xl">Chef's Picks</h3>
             </div>
           </div>
           
           {recLoading ? (
             <div className="h-64 bg-white/60 backdrop-blur-md rounded-[2rem] border border-white/40 shadow-sm flex items-center justify-center animate-pulse">
                <div className="flex flex-col items-center gap-3">
                   <div className="w-10 h-10 rounded-full border-4 border-slate-100 border-t-rose-400 animate-spin"></div>
                   <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Curating...</span>
                </div>
             </div>
           ) : dailyRecs.length > 0 ? (
             <div className="flex overflow-x-auto gap-5 pb-6 -mx-4 px-4 no-scrollbar snap-x snap-mandatory">
                 {dailyRecs.map((rec) => (
                    <div key={rec.id} className="min-w-[85%] sm:min-w-[320px] snap-center h-full">
                        <RecipeCard 
                          recipe={rec}
                          onSelect={setSelectedRecipe}
                          onAdd={addToSchedule}
                          isFavorite={isRecipeFavorite(rec.id)}
                          onToggleFavorite={toggleFavorite}
                        />
                    </div>
                 ))}
             </div>
           ) : (
             <div className="glass-card rounded-[2rem] p-8 text-center shadow-sm">
                <p className="text-sm text-slate-400 font-medium">Check back later for your daily recommendation!</p>
             </div>
           )}
        </div>

        {/* Expiring Alert */}
        {expiringCount > 0 && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 backdrop-blur-xl border border-amber-100 rounded-[2rem] p-6 flex items-center justify-between shadow-[0_8px_30px_rgb(251,191,36,0.15)] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-orange-200/20 rounded-full -mr-5 -mt-5 blur-xl"></div>
                
                <div className="flex items-center gap-4 relative z-10">
                    <div className="bg-white p-3 rounded-full text-orange-500 shadow-sm ring-4 ring-orange-100">
                         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                            <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div>
                        <p className="font-bold text-slate-800 text-lg">{expiringCount} Items</p>
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Expiring Soon</p>
                    </div>
                </div>
                <button 
                  onClick={() => setView('pantry')}
                  className="relative z-10 bg-white text-orange-600 px-5 py-2.5 rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all active:scale-95"
                >
                  Check Pantry
                </button>
            </div>
        )}

        {/* Today's Meals - Redesigned Layout */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
             <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600">
               <CalendarIcon active={true} />
             </div>
             <h3 className="font-bold text-slate-800 text-xl">On The Menu</h3>
          </div>
          
          <div className="space-y-5">
            {[MealType.Breakfast, MealType.Lunch, MealType.Dinner].map((type) => {
                const meal = todaysPlan?.meals?.[type];
                return (
                <div key={type} className="flex flex-col gap-2">
                     <div className="flex items-center gap-2 ml-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{type}</span>
                     </div>
                    
                    {/* Meal Content */}
                    <div className="flex-1">
                    {meal ? (
                        <div onClick={() => setSelectedRecipe(meal)} className="cursor-pointer hover:scale-[1.01] transition-transform duration-300 h-full">
                            <RecipeCard 
                                recipe={meal} 
                                compact 
                                isFavorite={isRecipeFavorite(meal.id)}
                                onToggleFavorite={toggleFavorite}
                            />
                        </div>
                    ) : (
                        <button 
                        onClick={() => {
                            setPlanTarget({ date: today, meal: type });
                            setView('generator');
                        }}
                        className="w-full h-[90px] bg-white/40 border-2 border-dashed border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 rounded-[1.5rem] flex items-center justify-center text-slate-400 hover:text-emerald-600 transition-all gap-3 group hover:shadow-lg hover:shadow-emerald-100/50"
                        >
                            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm text-inherit transition-colors group-hover:bg-emerald-100">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                            </div>
                            <span className="text-xs font-bold uppercase tracking-widest">Plan Meal</span>
                        </button>
                    )}
                    </div>
                </div>
                );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderPantry = () => {
    // Filter pantry items based on search
    const filteredPantry = pantry.filter(item => 
        fuzzyMatch(pantrySearchQuery, item.name)
    );

    const sortedPantry = [...filteredPantry].sort((a, b) => {
        if (!a.expirationDate) return 1;
        if (!b.expirationDate) return -1;
        return new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime();
    });
    
    const expiringCount = getExpiringItems().length;

    return (
        <div className="pb-32 px-4 pt-32 max-w-lg mx-auto">
            <h2 className="text-2xl font-bold text-slate-800 mb-2 px-1">My Pantry</h2>
            <p className="text-slate-500 text-sm mb-6 px-1">Keep track of your ingredients.</p>

            {/* Search Bar */}
            <div className="relative mb-6">
                <input 
                    type="text"
                    className="w-full bg-white/80 backdrop-blur-sm border-0 rounded-full py-4 pl-12 pr-4 text-slate-800 text-sm focus:ring-2 focus:ring-emerald-200 placeholder-slate-400 shadow-[0_8px_30px_rgb(0,0,0,0.04)] outline-none"
                    placeholder="Search pantry items..."
                    value={pantrySearchQuery}
                    onChange={(e) => setPantrySearchQuery(e.target.value)}
                />
                 <div className="absolute left-4 top-3.5 text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                        <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
                    </svg>
                </div>
            </div>

            {/* Cook with Expiring Button */}
            {expiringCount > 0 && !pantrySearchQuery && (
                 <button 
                    onClick={handleCookExpiring}
                    className="w-full mb-8 bg-gradient-to-r from-orange-400 to-rose-500 text-white p-5 rounded-3xl shadow-xl shadow-rose-200 flex items-center justify-between active:scale-[0.98] transition-transform"
                 >
                    <div className="flex items-center gap-4">
                         <div className="bg-white/20 p-2.5 rounded-full backdrop-blur-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                                <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                            </svg>
                         </div>
                         <div className="text-left">
                            <span className="block font-bold text-lg">Reduce Waste</span>
                            <span className="text-xs text-white/90 font-medium">Find recipes for {expiringCount} expiring items</span>
                         </div>
                    </div>
                    <div className="bg-white/10 p-2 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                    </div>
                 </button>
            )}

            {/* Add Item Form */}
            <div className="glass-card p-5 rounded-3xl mb-8">
                 <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 ml-1">Add New Item</h3>
                 <div className="flex flex-col gap-3">
                     <div className="flex gap-2">
                        <input 
                            type="text" 
                            placeholder="Item Name" 
                            className="flex-[2] bg-slate-50 border-0 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-emerald-200 outline-none"
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                        />
                        <input 
                            type="text" 
                            placeholder="Qty" 
                            className="flex-1 bg-slate-50 border-0 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-emerald-200 outline-none"
                            value={newItemQty}
                            onChange={(e) => setNewItemQty(e.target.value)}
                        />
                     </div>
                     <div className="flex gap-2">
                         <input 
                            type="date" 
                            className="flex-1 bg-slate-50 border-0 rounded-2xl p-4 text-sm text-slate-600 focus:ring-2 focus:ring-emerald-200 outline-none"
                            value={newItemDate}
                            onChange={(e) => setNewItemDate(e.target.value)}
                         />
                         <button 
                            onClick={handleAddToPantry}
                            className="bg-slate-900 text-white font-bold px-8 rounded-2xl hover:bg-slate-800 transition-colors shadow-lg shadow-slate-300"
                         >
                             Add
                         </button>
                     </div>
                 </div>
            </div>

            {/* Pantry List */}
            {sortedPantry.length === 0 ? (
                 <EmptyState 
                    message={pantrySearchQuery ? "No items found matching your search." : "Your pantry is empty."}
                    actionText={pantrySearchQuery ? "Clear Search" : ""}
                    onAction={() => setPantrySearchQuery("")}
                    icon={<PantryIcon active={false}/>}
                  />
            ) : (
                <div className="space-y-3">
                    {sortedPantry.map(item => (
                        <PantryItemRow key={item.id} item={item} onDelete={handleDeletePantryItem} />
                    ))}
                </div>
            )}
        </div>
    );
  };

  const renderPlanner = () => {
    const dates = getFutureDates(7);
    return (
      <div className="space-y-6 pb-32 px-4 pt-32 max-w-lg mx-auto">
         <h2 className="text-2xl font-bold text-slate-800 mb-4 px-1">Weekly Plan</h2>
         {dates.map(date => {
            const isToday = date === getTodayDate();
            return (
            <div key={date} className={`rounded-3xl border p-5 transition-all ${isToday ? 'bg-white shadow-xl shadow-emerald-100 border-emerald-100 ring-1 ring-emerald-50' : 'bg-white/60 border-white/50 hover:bg-white'}`}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className={`font-bold text-lg ${isToday ? 'text-emerald-600' : 'text-slate-700'}`}>
                        {getDayName(date)}
                    </h3>
                    {isToday && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-bold shadow-sm">TODAY</span>}
                </div>
                <div className="grid grid-cols-3 gap-3">
                    {[MealType.Breakfast, MealType.Lunch, MealType.Dinner].map(type => {
                        const meal = schedule[date]?.meals?.[type];
                        return (
                            <div 
                                key={type} 
                                onClick={() => {
                                    if (meal) setSelectedRecipe(meal);
                                    else {
                                        setPlanTarget({ date, meal: type });
                                        setView('generator');
                                    }
                                }}
                                className={`aspect-square rounded-2xl flex flex-col items-center justify-center p-2 text-center transition-all cursor-pointer relative overflow-hidden ${meal ? 'bg-emerald-50' : 'bg-slate-50 hover:bg-slate-100'}`}
                            >
                                {meal ? (
                                    <>
                                        <img src={`https://picsum.photos/seed/${meal.title.replace(/\s/g, '')}/100/100`} className="absolute inset-0 w-full h-full object-cover opacity-30" alt="" />
                                        <span className="relative z-10 text-[10px] text-emerald-800 font-bold leading-tight line-clamp-2 px-1">{meal.title}</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">{type.charAt(0)}</span>
                                        <span className="text-2xl text-slate-300 font-light">+</span>
                                    </>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
         )})}
      </div>
    );
  };

  const renderGenerator = () => {
    return (
      <div className="pb-32 px-4 pt-32 flex flex-col h-full max-w-lg mx-auto">
        {/* Input Area */}
        <div className="glass-card p-6 rounded-[2rem] mb-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Discover Recipes</h2>
            <p className="text-slate-500 text-sm mb-6">
              {planTarget ? `Finding a ${planTarget.meal} for ${getDayName(planTarget.date)}.` : "Search specifically or find recipes based on your ingredients."}
            </p>
            
            <div className="space-y-6">
                {/* Text Search */}
                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Craving</label>
                    <div className="relative">
                        <input 
                            type="text"
                            className="w-full bg-slate-50 border-0 rounded-2xl p-4 pl-12 text-slate-800 text-sm focus:ring-2 focus:ring-emerald-200 outline-none"
                            placeholder="e.g. Pasta Carbonara..."
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                        />
                        <div className="absolute left-4 top-4 text-slate-400">
                             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                                <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="relative flex py-1 items-center">
                    <div className="flex-grow border-t border-slate-200"></div>
                    <span className="flex-shrink-0 mx-4 text-slate-300 text-[10px] font-bold tracking-widest uppercase">OR WITH INGREDIENTS</span>
                    <div className="flex-grow border-t border-slate-200"></div>
                </div>

                {/* Ingredient Input */}
                <div>
                    <div className="flex gap-2 mb-3">
                        <input 
                            type="text"
                            className="flex-1 bg-slate-50 border-0 rounded-2xl p-4 text-slate-800 text-sm focus:ring-2 focus:ring-emerald-200 outline-none"
                            placeholder="Add ingredient..."
                            value={ingredientInput}
                            onChange={(e) => setIngredientInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddIngredient();
                                }
                            }}
                        />
                        <button 
                            onClick={handleAddIngredient}
                            className="bg-emerald-100 text-emerald-700 font-bold px-5 rounded-2xl hover:bg-emerald-200 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                            </svg>
                        </button>
                    </div>
                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 mb-2 min-h-[2rem]">
                        {ingredients.map((ing, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1 bg-white border border-slate-100 text-slate-700 px-3 py-1.5 rounded-full text-xs font-medium shadow-sm animate-fade-in">
                                {ing}
                                <button onClick={() => handleRemoveIngredient(idx)} className="text-slate-400 hover:text-rose-500 ml-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                        <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                                    </svg>
                                </button>
                            </span>
                        ))}
                    </div>
                </div>

                <button 
                    onClick={handleGenerate}
                    disabled={loading || (!prompt && ingredients.length === 0)}
                    className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl shadow-xl hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mt-4 text-lg active:scale-[0.98]"
                >
                    {loading ? (
                        <>
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Creating Magic...
                        </>
                    ) : (
                        "Generate Recipes"
                    )}
                </button>
            </div>
        </div>

        {/* Results */}
        {generatedRecipes.length > 0 && (
            <div className="space-y-6 animate-fade-in">
                <h3 className="text-xl font-bold text-slate-800 px-2">Found for you</h3>
                <div className="grid grid-cols-1 gap-6">
                    {generatedRecipes.map(recipe => (
                        <div key={recipe.id} className="h-auto">
                            <RecipeCard 
                                recipe={recipe} 
                                onSelect={setSelectedRecipe}
                                onAdd={addToSchedule}
                                isFavorite={isRecipeFavorite(recipe.id)}
                                onToggleFavorite={toggleFavorite}
                            />
                        </div>
                    ))}
                </div>
            </div>
        )}
      </div>
    );
  };

  const renderFavorites = () => {
      // Filter favorites based on fuzzy search query
      const filteredFavorites = favorites.filter(recipe => {
        return fuzzyMatch(favoritesSearchQuery, recipe.title) || 
               recipe.ingredients.some(ing => fuzzyMatch(favoritesSearchQuery, ing.name));
      });

      return (
          <div className="pb-32 px-4 pt-32 max-w-lg mx-auto">
              <h2 className="text-2xl font-bold text-slate-800 mb-2 px-1">Saved Recipes</h2>
              <p className="text-slate-500 text-sm mb-6 px-1">Your personal collection.</p>
              
              {/* Search Bar */}
              <div className="relative mb-8">
                  <input 
                      type="text"
                      className="w-full bg-white/80 backdrop-blur-sm border-0 rounded-full py-4 pl-12 pr-4 text-slate-800 text-sm focus:ring-2 focus:ring-emerald-200 outline-none shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
                      placeholder="Search saved recipes..."
                      value={favoritesSearchQuery}
                      onChange={(e) => setFavoritesSearchQuery(e.target.value)}
                  />
                  <div className="absolute left-4 top-3.5 text-slate-400">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                          <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
                      </svg>
                  </div>
              </div>

              {filteredFavorites.length === 0 ? (
                  <EmptyState 
                    message={favoritesSearchQuery ? "No recipes found matching your search." : "Build your collection by saving recipes you love."}
                    actionText={favoritesSearchQuery ? "Clear Search" : "Discover Recipes"}
                    onAction={() => favoritesSearchQuery ? setFavoritesSearchQuery("") : setView('generator')}
                    icon={(
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                        </svg>
                    )}
                  />
              ) : (
                  <div className="grid grid-cols-1 gap-6">
                      {filteredFavorites.map(recipe => (
                          <div key={recipe.id}>
                              <RecipeCard 
                                  recipe={recipe}
                                  onSelect={setSelectedRecipe}
                                  onAdd={addToSchedule}
                                  isFavorite={true}
                                  onToggleFavorite={toggleFavorite}
                              />
                          </div>
                      ))}
                  </div>
              )}
          </div>
      )
  }

  const renderProfile = () => {
    return (
      <div className="pb-32 px-4 pt-32 max-w-lg mx-auto">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 px-1">Settings & Profile</h2>
        
        {/* Google Cloud Sync Section */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 rounded-[2rem] shadow-xl shadow-blue-200 mb-8 text-white relative overflow-hidden">
           {/* Decor */}
           <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-xl"></div>

           <div className="relative z-10 flex justify-between items-start">
               <div>
                   <h3 className="text-lg font-bold">Cloud Sync</h3>
                   <p className="text-sm text-white/80 max-w-[200px] mb-4 font-light">Keep your recipes safe and synced across devices.</p>
                   
                    {isSignedIn && (
                        <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-medium border border-white/20">
                            <span className={`w-2 h-2 rounded-full ${syncState === 'synced' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`}></span>
                            {syncState === 'synced' ? 'Synced' : syncState === 'syncing' ? 'Syncing...' : 'Pending'}
                        </div>
                    )}
               </div>
               
               {isSignedIn ? (
                   <button onClick={handleSignOut} className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors">
                       Sign Out
                   </button>
               ) : (
                    <button 
                        onClick={handleSignIn}
                        className="bg-white text-blue-600 px-6 py-2.5 rounded-full text-sm font-bold shadow-lg hover:bg-blue-50 transition-colors"
                    >
                        Connect Google
                    </button>
               )}
           </div>
        </div>

        <div className="glass-card p-6 rounded-[2rem] space-y-8">
          
          {/* Region */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Cuisine Preference</label>
            <div className="flex gap-2 mb-3 overflow-x-auto pb-2 no-scrollbar">
                {REGIONS.map(region => (
                    <button
                        key={region}
                        onClick={() => setPreferences(p => ({...p, region}))}
                        className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-all ${
                            preferences.region === region 
                            ? 'bg-slate-900 text-white shadow-lg shadow-slate-300 transform scale-105' 
                            : 'bg-white border border-slate-100 text-slate-500 hover:bg-slate-50'
                        }`}
                    >
                        {region}
                    </button>
                ))}
            </div>
            <input 
              type="text"
              value={preferences.region}
              onChange={(e) => setPreferences(p => ({...p, region: e.target.value}))}
              className="w-full bg-slate-50 border-0 rounded-2xl p-4 text-slate-800 text-sm focus:ring-2 focus:ring-emerald-200 outline-none"
              placeholder="Or type custom (e.g. Fusion, Nordic...)"
            />
          </div>

          {/* Diet & Allergies */}
          <div className="grid grid-cols-1 gap-6">
            <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Dietary Mode</label>
                <input 
                type="text"
                value={preferences.dietaryRestrictions}
                onChange={(e) => setPreferences(p => ({...p, dietaryRestrictions: e.target.value}))}
                className="w-full bg-slate-50 border-0 rounded-2xl p-4 text-slate-800 text-sm focus:ring-2 focus:ring-emerald-200 outline-none"
                placeholder="e.g. Vegetarian, Keto..."
                />
            </div>

            <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Excluded Ingredients</label>
                <input 
                type="text"
                value={preferences.excludeIngredients}
                onChange={(e) => setPreferences(p => ({...p, excludeIngredients: e.target.value}))}
                className="w-full bg-slate-50 border-0 rounded-2xl p-4 text-slate-800 text-sm focus:ring-2 focus:ring-emerald-200 outline-none"
                placeholder="e.g. Peanuts, Shellfish..."
                />
            </div>
          </div>

          {/* Skill Level */}
          <div>
             <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Skill Level</label>
             <div className="grid grid-cols-3 gap-3">
               {(['Beginner', 'Intermediate', 'Advanced'] as CookingSkill[]).map((level) => (
                 <button
                  key={level}
                  onClick={() => setPreferences(p => ({...p, cookingSkill: level}))}
                  className={`py-3 rounded-2xl text-xs font-bold transition-all ${
                    preferences.cookingSkill === level 
                      ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-200' 
                      : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                  }`}
                 >
                   {level}
                 </button>
               ))}
             </div>
          </div>
          
          {/* Servings */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Default Servings</label>
            <div className="flex items-center gap-6 bg-slate-50 rounded-2xl p-2 w-fit">
              <button 
                onClick={() => setPreferences(p => ({...p, servings: Math.max(1, p.servings - 1)}))}
                className="w-10 h-10 rounded-xl bg-white text-slate-600 flex items-center justify-center font-bold shadow-sm hover:shadow-md transition-all"
              >
                -
              </button>
              <span className="text-xl font-bold text-slate-800 w-8 text-center">{preferences.servings}</span>
              <button 
                onClick={() => setPreferences(p => ({...p, servings: p.servings + 1}))}
                className="w-10 h-10 rounded-xl bg-white text-slate-600 flex items-center justify-center font-bold shadow-sm hover:shadow-md transition-all"
              >
                +
              </button>
            </div>
          </div>

        </div>
      </div>
    )
  }

  return (
    <div className="h-full w-full flex flex-col relative">
      <Header onProfileClick={() => setView('settings')} view={view} syncState={syncState} />

      <main className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar">
        <div className="min-h-full">
           {view === 'dashboard' && renderDashboard()}
           {view === 'planner' && renderPlanner()}
           {view === 'generator' && renderGenerator()}
           {view === 'favorites' && renderFavorites()}
           {view === 'settings' && renderProfile()}
           {view === 'pantry' && renderPantry()}
        </div>
      </main>

      {/* Floating Bottom Navigation */}
      <nav className="fixed bottom-6 left-1/2 transform -translate-x-1/2 w-[90%] max-w-sm z-40">
        <div className="bg-white/80 backdrop-blur-xl rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-white/50 flex justify-between items-center px-6 py-4 h-20">
          <button 
            onClick={() => setView('dashboard')}
            className={`flex flex-col items-center justify-center space-y-1 transition-all duration-300 ${view === 'dashboard' ? 'text-emerald-600 -translate-y-1' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <HomeIcon active={view === 'dashboard'} />
            <span className={`text-[10px] font-bold ${view === 'dashboard' ? 'opacity-100' : 'opacity-0 hidden'}`}>Home</span>
          </button>
          
          <button 
            onClick={() => setView('pantry')}
            className={`flex flex-col items-center justify-center space-y-1 transition-all duration-300 ${view === 'pantry' ? 'text-emerald-600 -translate-y-1' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <PantryIcon active={view === 'pantry'} />
             <span className={`text-[10px] font-bold ${view === 'pantry' ? 'opacity-100' : 'opacity-0 hidden'}`}>Pantry</span>
          </button>
          
          <button 
            onClick={() => setView('generator')}
            className={`relative -top-6 bg-slate-900 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-xl shadow-slate-400 transition-transform active:scale-95 border-4 border-[#f8fafc] ${view === 'generator' ? 'ring-2 ring-emerald-400' : ''}`}
          >
            <div className="w-6 h-6">
                <ChefIcon active={true} />
            </div>
          </button>

          <button 
            onClick={() => setView('planner')}
            className={`flex flex-col items-center justify-center space-y-1 transition-all duration-300 ${view === 'planner' ? 'text-emerald-600 -translate-y-1' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <CalendarIcon active={view === 'planner'} />
             <span className={`text-[10px] font-bold ${view === 'planner' ? 'opacity-100' : 'opacity-0 hidden'}`}>Plan</span>
          </button>

          <button 
            onClick={() => setView('favorites')}
            className={`flex flex-col items-center justify-center space-y-1 transition-all duration-300 ${view === 'favorites' ? 'text-emerald-600 -translate-y-1' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <HeartIcon active={view === 'favorites'} />
             <span className={`text-[10px] font-bold ${view === 'favorites' ? 'opacity-100' : 'opacity-0 hidden'}`}>Saved</span>
          </button>
        </div>
      </nav>

      {/* Detail Modal */}
      <RecipeDetailModal 
        recipe={selectedRecipe} 
        onClose={() => setSelectedRecipe(null)}
        onAddToPlan={addToSchedule}
        isFavorite={selectedRecipe ? isRecipeFavorite(selectedRecipe.id) : false}
        onToggleFavorite={toggleFavorite}
      />
    </div>
  );
}