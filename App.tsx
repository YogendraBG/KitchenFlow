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
  <div className="bg-white px-6 pt-12 pb-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
    <div>
      <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
          KitchenFlow
          {/* Sync Status Dot */}
          {syncState === 'syncing' && <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" title="Syncing..."></span>}
          {syncState === 'synced' && <span className="w-2 h-2 rounded-full bg-emerald-500" title="Synced"></span>}
      </h1>
      <p className="text-xs text-slate-500 font-medium">Your Daily Culinary Assistant</p>
    </div>
    <button 
      onClick={onProfileClick}
      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 shadow-sm transition-colors ${view === 'settings' ? 'bg-slate-800 text-white border-slate-800' : 'bg-emerald-100 text-emerald-700 border-white'}`}
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
  <div className="flex flex-col items-center justify-center py-12 px-4 text-center h-full">
    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-300">
      {icon || (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )}
    </div>
    <h3 className="text-lg font-medium text-slate-900 mb-2">Nothing here yet</h3>
    <p className="text-slate-500 text-sm mb-6 max-w-xs">{message}</p>
    <button onClick={onAction} className="text-emerald-600 font-semibold hover:text-emerald-700">
      {actionText} &rarr;
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
      // Polling or listener would be better, but for now we rely on the GAPI callback reloading the page or we re-check manually.
      // In this specific simple flow, the popup handles it.
      // We'll set a visual cue
      setSyncState('syncing');
      setTimeout(() => {
          // Re-check auth status after a delay for user interaction
          // Ideally pass a callback to signIn
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
      <div className="space-y-6 pb-24">
        {/* Hero Section */}
        <div className="bg-emerald-600 text-white p-6 rounded-3xl shadow-lg shadow-emerald-200 mx-4 mt-2 relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-3xl font-bold mb-1">Today's Menu</h2>
            <p className="text-emerald-100 opacity-90">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          </div>
          <div className="absolute -right-6 -bottom-10 w-32 h-32 bg-emerald-500 rounded-full opacity-50 blur-2xl"></div>
        </div>
        
        {/* Auto Recommendation Section */}
        <div className="animate-fade-in pl-4">
           <div className="flex items-center gap-2 mb-3 pr-4">
             <div className="bg-amber-100 p-1.5 rounded-full text-amber-600">
               <ChefIcon active={true} />
             </div>
             <h3 className="font-bold text-slate-800">Chef's Recommendations</h3>
           </div>
           
           {recLoading ? (
             <div className="h-40 mr-4 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center justify-center animate-pulse">
                <div className="flex flex-col items-center gap-2">
                   <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-emerald-500 animate-spin"></div>
                   <span className="text-xs text-slate-400 font-medium">Curating your menu...</span>
                </div>
             </div>
           ) : dailyRecs.length > 0 ? (
             <div className="flex overflow-x-auto gap-4 pb-4 pr-4 no-scrollbar snap-x snap-mandatory">
                 {dailyRecs.map((rec) => (
                    <div key={rec.id} className="min-w-[85%] sm:min-w-[300px] snap-center">
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
             <div className="bg-white rounded-2xl border border-slate-100 p-6 text-center shadow-sm mr-4">
                <p className="text-sm text-slate-500">Check back later for your daily recommendation!</p>
             </div>
           )}
        </div>

        {/* Expiring Alert */}
        {expiringCount > 0 && (
            <div className="mx-4 bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="bg-orange-100 p-2 rounded-full text-orange-600">
                         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-sm font-bold text-orange-900">{expiringCount} items expiring soon</p>
                        <p className="text-xs text-orange-700">Check your pantry</p>
                    </div>
                </div>
                <button 
                  onClick={() => setView('pantry')}
                  className="bg-white text-orange-600 px-3 py-1.5 rounded-lg text-xs font-bold border border-orange-100 shadow-sm"
                >
                  View
                </button>
            </div>
        )}

        {/* Today's Meals */}
        <div className="px-4 space-y-4">
          <h3 className="font-bold text-slate-800">Planned Meals</h3>
          {[MealType.Breakfast, MealType.Lunch, MealType.Dinner].map((type) => {
            const meal = todaysPlan?.meals?.[type];
            return (
              <div key={type} className="flex gap-4 items-start">
                <div className="w-16 pt-2 text-right text-slate-400 text-xs font-bold uppercase tracking-wider">{type}</div>
                <div className="flex-1">
                  {meal ? (
                    <div onClick={() => setSelectedRecipe(meal)} className="cursor-pointer hover:opacity-90 transition-opacity">
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
                      className="w-full h-24 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50 transition-all gap-2"
                    >
                      <span className="text-sm font-medium">+ Plan {type}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
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
        <div className="pb-24 px-4 pt-2">
            <h2 className="text-xl font-bold text-slate-800 mb-2 px-2">My Pantry</h2>
            <p className="text-slate-500 text-sm mb-6 px-2">Track ingredients and expiration dates.</p>

            {/* Search Bar */}
            <div className="relative mb-6">
                <input 
                    type="text"
                    className="w-full bg-white border border-slate-200 rounded-xl p-3 pl-10 text-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm"
                    placeholder="Search pantry items..."
                    value={pantrySearchQuery}
                    onChange={(e) => setPantrySearchQuery(e.target.value)}
                />
                 <div className="absolute left-3 top-3 text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                        <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
                    </svg>
                </div>
            </div>

            {/* Cook with Expiring Button */}
            {expiringCount > 0 && !pantrySearchQuery && (
                 <button 
                    onClick={handleCookExpiring}
                    className="w-full mb-6 bg-gradient-to-r from-orange-400 to-red-500 text-white p-4 rounded-2xl shadow-lg shadow-orange-100 flex items-center justify-between"
                 >
                    <div className="flex items-center gap-3">
                         <div className="bg-white/20 p-2 rounded-full">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                                <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                            </svg>
                         </div>
                         <div className="text-left">
                            <span className="block font-bold">Reduce Waste</span>
                            <span className="text-xs opacity-90">Find recipes for {expiringCount} expiring items</span>
                         </div>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                         <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                 </button>
            )}

            {/* Add Item Form */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6">
                 <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Add Item</h3>
                 <div className="flex flex-col gap-3">
                     <div className="flex gap-2">
                        <input 
                            type="text" 
                            placeholder="Item Name (e.g. Milk)" 
                            className="flex-[2] bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                        />
                        <input 
                            type="text" 
                            placeholder="Qty" 
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                            value={newItemQty}
                            onChange={(e) => setNewItemQty(e.target.value)}
                        />
                     </div>
                     <div className="flex gap-2">
                         <input 
                            type="date" 
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-600 focus:ring-2 focus:ring-emerald-500 outline-none"
                            value={newItemDate}
                            onChange={(e) => setNewItemDate(e.target.value)}
                         />
                         <button 
                            onClick={handleAddToPantry}
                            className="bg-emerald-600 text-white font-bold px-6 rounded-xl hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-200"
                         >
                             Add
                         </button>
                     </div>
                 </div>
            </div>

            {/* Pantry List */}
            {sortedPantry.length === 0 ? (
                 <EmptyState 
                    message={pantrySearchQuery ? "No items found matching your search." : "Your pantry is empty. Add items to track freshness."}
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
      <div className="space-y-4 pb-24 px-4 pt-2">
         <h2 className="text-xl font-bold text-slate-800 mb-4 px-2">Weekly Plan</h2>
         {dates.map(date => (
            <div key={date} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
                <div className="flex justify-between items-center mb-3">
                    <h3 className={`font-bold ${date === getTodayDate() ? 'text-emerald-600' : 'text-slate-700'}`}>
                        {getDayName(date)}
                    </h3>
                    {date === getTodayDate() && <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">TODAY</span>}
                </div>
                <div className="grid grid-cols-3 gap-2">
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
                                className={`h-20 rounded-xl flex flex-col items-center justify-center p-1 text-center border transition-colors cursor-pointer ${meal ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100 hover:bg-slate-100'}`}
                            >
                                <span className="text-[10px] text-slate-400 mb-1">{type.charAt(0)}</span>
                                {meal ? (
                                    <span className="text-xs font-medium text-emerald-800 line-clamp-2 leading-tight">{meal.title}</span>
                                ) : (
                                    <span className="text-xl text-slate-300">+</span>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
         ))}
      </div>
    );
  };

  const renderGenerator = () => {
    return (
      <div className="pb-24 px-4 pt-2 flex flex-col h-full">
        {/* Input Area */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mb-6">
            <h2 className="text-xl font-bold text-slate-800 mb-2">Recipe Search</h2>
            <p className="text-slate-500 text-sm mb-4">
              {planTarget ? `Finding a ${planTarget.meal} for ${getDayName(planTarget.date)}.` : "Search specifically or find recipes based on your ingredients."}
            </p>
            
            <div className="space-y-4">
                {/* Text Search */}
                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Search by Name or Craving</label>
                    <div className="relative">
                        <input 
                            type="text"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 pl-10 text-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                            placeholder="e.g. Pasta Carbonara, Spicy Thai..."
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                        />
                        <div className="absolute left-3 top-3 text-slate-400">
                             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                                <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="relative flex py-1 items-center">
                    <div className="flex-grow border-t border-slate-200"></div>
                    <span className="flex-shrink-0 mx-4 text-slate-300 text-xs font-bold">AND / OR</span>
                    <div className="flex-grow border-t border-slate-200"></div>
                </div>

                {/* Ingredient Input */}
                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Your Ingredients</label>
                    <div className="flex gap-2 mb-2">
                        <input 
                            type="text"
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                            placeholder="e.g. Chicken, Rice, Tomatoes"
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
                            className="bg-emerald-100 text-emerald-700 font-bold px-4 rounded-xl hover:bg-emerald-200 transition-colors"
                        >
                            +
                        </button>
                    </div>
                    {/* Tags */}
                    {ingredients.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                            {ingredients.map((ing, idx) => (
                                <span key={idx} className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-medium border border-slate-200">
                                    {ing}
                                    <button onClick={() => handleRemoveIngredient(idx)} className="text-slate-400 hover:text-red-500">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                                        </svg>
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                <button 
                    onClick={handleGenerate}
                    disabled={loading || (!prompt && ingredients.length === 0)}
                    className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mt-2"
                >
                    {loading ? (
                        <>
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Searching...
                        </>
                    ) : (
                        "Find Recipes"
                    )}
                </button>
                
                {/* Active Preferences Hint */}
                {(preferences.dietaryRestrictions || preferences.excludeIngredients || preferences.region) && (
                   <div className="flex flex-wrap justify-center gap-1 mt-2">
                     {preferences.region && (
                        <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100">
                          Region: {preferences.region}
                        </span>
                     )}
                     {preferences.dietaryRestrictions && (
                        <span className="text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full border border-green-100">
                          Diet: {preferences.dietaryRestrictions}
                        </span>
                     )}
                     {preferences.excludeIngredients && (
                        <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full border border-red-100">
                          No {preferences.excludeIngredients}
                        </span>
                     )}
                   </div>
                )}
            </div>
        </div>

        {/* Results */}
        {generatedRecipes.length > 0 && (
            <div className="space-y-4 animate-fade-in">
                <h3 className="text-lg font-bold text-slate-800 px-2">Results</h3>
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
          <div className="pb-24 px-4 pt-2">
              <h2 className="text-xl font-bold text-slate-800 mb-4 px-2">Saved Recipes</h2>
              
              {/* Search Bar */}
              <div className="relative mb-6">
                  <input 
                      type="text"
                      className="w-full bg-white border border-slate-200 rounded-xl p-3 pl-10 text-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm"
                      placeholder="Search saved recipes or ingredients..."
                      value={favoritesSearchQuery}
                      onChange={(e) => setFavoritesSearchQuery(e.target.value)}
                  />
                  <div className="absolute left-3 top-3 text-slate-400">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                          <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
                      </svg>
                  </div>
              </div>

              {filteredFavorites.length === 0 ? (
                  <EmptyState 
                    message={favoritesSearchQuery ? "No recipes found matching your search." : "You haven't saved any recipes yet. Generate some ideas or browse to add favorites."}
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
      <div className="pb-24 px-4 pt-2">
        <h2 className="text-xl font-bold text-slate-800 mb-6 px-2">User Profile</h2>
        
        {/* Google Cloud Sync Section */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4 mb-6 relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-500"></div>
           <div className="flex justify-between items-start">
               <div>
                   <h3 className="text-lg font-bold text-slate-800">Cloud Backup</h3>
                   <p className="text-xs text-slate-500 max-w-[200px]">Sync your data to Google Sheets to keep it safe and accessible.</p>
               </div>
               {isSignedIn ? (
                    <div className="flex flex-col items-end gap-1">
                        <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                            </svg>
                            Connected
                        </span>
                        <button onClick={handleSignOut} className="text-xs text-slate-400 underline hover:text-red-500">Sign Out</button>
                    </div>
               ) : (
                    <button 
                        onClick={handleSignIn}
                        className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md hover:bg-blue-700 transition-colors"
                    >
                        Sign In
                    </button>
               )}
           </div>
           
           {isSignedIn && (
               <div className="bg-slate-50 rounded-xl p-3 flex items-center justify-between text-xs">
                   <span className="text-slate-500 font-medium">Status</span>
                   <span className={`font-bold ${syncState === 'synced' ? 'text-emerald-600' : syncState === 'syncing' ? 'text-blue-600' : 'text-slate-400'}`}>
                       {syncState === 'synced' ? 'All data saved' : syncState === 'syncing' ? 'Syncing...' : 'Waiting...'}
                   </span>
               </div>
           )}
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-6">
          
          {/* Region */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Regional Preference</label>
            <div className="flex gap-2 mb-2 overflow-x-auto pb-2 no-scrollbar">
                {REGIONS.map(region => (
                    <button
                        key={region}
                        onClick={() => setPreferences(p => ({...p, region}))}
                        className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                            preferences.region === region 
                            ? 'bg-blue-100 text-blue-700 border-blue-200 ring-1 ring-blue-400' 
                            : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
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
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="Or type custom (e.g. South Indian, Mediterranean...)"
            />
            <p className="text-[10px] text-slate-400 mt-1 ml-1">We will suggest more recipes from this region.</p>
          </div>

          {/* Diet */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Dietary Preferences</label>
            <input 
              type="text"
              value={preferences.dietaryRestrictions}
              onChange={(e) => setPreferences(p => ({...p, dietaryRestrictions: e.target.value}))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="e.g. Vegetarian, Keto, Gluten-free"
            />
            <p className="text-[10px] text-slate-400 mt-1 ml-1">Results will prioritize these diets.</p>
          </div>

          {/* Allergies */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Allergies & Exclusions</label>
             <input 
              type="text"
              value={preferences.excludeIngredients}
              onChange={(e) => setPreferences(p => ({...p, excludeIngredients: e.target.value}))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="e.g. Peanuts, Shellfish, Mushrooms"
            />
             <p className="text-[10px] text-slate-400 mt-1 ml-1">Results will strictly avoid these ingredients.</p>
          </div>

          {/* Skill Level */}
          <div>
             <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Cooking Skill Level</label>
             <div className="grid grid-cols-3 gap-2">
               {(['Beginner', 'Intermediate', 'Advanced'] as CookingSkill[]).map((level) => (
                 <button
                  key={level}
                  onClick={() => setPreferences(p => ({...p, cookingSkill: level}))}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                    preferences.cookingSkill === level 
                      ? 'bg-emerald-100 text-emerald-700 border-emerald-200 ring-1 ring-emerald-500' 
                      : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                  }`}
                 >
                   {level}
                 </button>
               ))}
             </div>
          </div>
          
          {/* Servings */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Default Servings</label>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setPreferences(p => ({...p, servings: Math.max(1, p.servings - 1)}))}
                className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold hover:bg-slate-200 transition-colors"
              >
                -
              </button>
              <span className="text-xl font-bold text-slate-800 w-8 text-center">{preferences.servings}</span>
              <button 
                onClick={() => setPreferences(p => ({...p, servings: p.servings + 1}))}
                className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold hover:bg-slate-200 transition-colors"
              >
                +
              </button>
            </div>
          </div>

        </div>
        
        <div className="mt-6 bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex gap-3 items-start">
           <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-emerald-600 mt-0.5">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
            </svg>
           <div>
             <h4 className="text-sm font-bold text-emerald-800">Preferences Saved</h4>
             <p className="text-xs text-emerald-600">Your profile settings are automatically saved and will apply to all new recipe searches.</p>
           </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full w-full flex flex-col bg-slate-50">
      <Header onProfileClick={() => setView('settings')} view={view} syncState={syncState} />

      <main className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar">
        <div className="max-w-md mx-auto min-h-full">
           {view === 'dashboard' && renderDashboard()}
           {view === 'planner' && renderPlanner()}
           {view === 'generator' && renderGenerator()}
           {view === 'favorites' && renderFavorites()}
           {view === 'settings' && renderProfile()}
           {view === 'pantry' && renderPantry()}
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-white border-t border-slate-100 fixed bottom-0 w-full z-20 pb-safe">
        <div className="max-w-md mx-auto flex justify-between items-center h-16 px-2">
          <button 
            onClick={() => setView('dashboard')}
            className={`flex flex-col items-center justify-center w-[20%] h-full space-y-1 ${view === 'dashboard' ? 'text-emerald-600' : 'text-slate-400'}`}
          >
            <HomeIcon active={view === 'dashboard'} />
            <span className="text-[9px] font-medium">Home</span>
          </button>
          
          <button 
            onClick={() => setView('pantry')}
            className={`flex flex-col items-center justify-center w-[20%] h-full space-y-1 ${view === 'pantry' ? 'text-emerald-600' : 'text-slate-400'}`}
          >
            <PantryIcon active={view === 'pantry'} />
             <span className="text-[9px] font-medium">Pantry</span>
          </button>
          
          <button 
            onClick={() => setView('generator')}
            className={`flex flex-col items-center justify-center w-[20%] h-full space-y-1 ${view === 'generator' ? 'text-emerald-600' : 'text-slate-400'}`}
          >
            <ChefIcon active={view === 'generator'} />
             <span className="text-[9px] font-medium">Chef</span>
          </button>

          <button 
            onClick={() => setView('planner')}
            className={`flex flex-col items-center justify-center w-[20%] h-full space-y-1 ${view === 'planner' ? 'text-emerald-600' : 'text-slate-400'}`}
          >
            <CalendarIcon active={view === 'planner'} />
             <span className="text-[9px] font-medium">Plan</span>
          </button>

          <button 
            onClick={() => setView('favorites')}
            className={`flex flex-col items-center justify-center w-[20%] h-full space-y-1 ${view === 'favorites' ? 'text-emerald-600' : 'text-slate-400'}`}
          >
            <HeartIcon active={view === 'favorites'} />
             <span className="text-[9px] font-medium">Saved</span>
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