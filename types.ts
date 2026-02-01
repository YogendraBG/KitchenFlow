export enum MealType {
  Breakfast = 'Breakfast',
  Lunch = 'Lunch',
  Dinner = 'Dinner',
  Snack = 'Snack',
}

export interface Ingredient {
  name: string;
  amount: string;
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  ingredients: Ingredient[];
  instructions: string[];
  calories?: number;
  prepTimeMinutes: number;
  tags: string[];
  videoUrl?: string;
}

export interface DayPlan {
  date: string; // ISO String YYYY-MM-DD
  meals: {
    [key in MealType]?: Recipe;
  };
}

export type ViewState = 'dashboard' | 'planner' | 'generator' | 'favorites' | 'settings' | 'pantry';

export type CookingSkill = 'Beginner' | 'Intermediate' | 'Advanced';

export interface UserPreferences {
  dietaryRestrictions: string;
  excludeIngredients: string; // Allergies
  servings: number;
  cookingSkill: CookingSkill;
  region: string;
}

export interface PantryItem {
  id: string;
  name: string;
  quantity: string;
  expirationDate: string; // YYYY-MM-DD
}

export type SyncState = 'offline' | 'synced' | 'syncing' | 'error' | 'auth_required';