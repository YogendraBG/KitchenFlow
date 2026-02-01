import { GoogleGenAI, Type } from "@google/genai";
import { Recipe, UserPreferences } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const generateRecipes = async (
  searchQuery: string,
  ingredients: string[],
  preferences: UserPreferences,
  count: number = 5
): Promise<Recipe[]> => {
  if (!apiKey) {
    console.error("API Key is missing");
    return [];
  }

  const model = "gemini-3-flash-preview";

  // Strengthened instruction for ingredients to support pantry waste reduction
  const ingredientsContext = ingredients.length > 0 
    ? `The user has these ingredients available: ${ingredients.join(', ')}. It is HIGHLY PREFERRED to suggest recipes that use these specific ingredients to help the user reduce food waste.` 
    : '';
    
  const searchContext = searchQuery 
    ? `The user is searching for: "${searchQuery}".` 
    : 'Suggest popular and diverse recipes.';

  const skillContext = preferences.cookingSkill 
    ? `Target cooking skill level: ${preferences.cookingSkill}.` 
    : 'Target cooking skill level: Intermediate.';
    
  const allergyContext = preferences.excludeIngredients 
    ? `STRICTLY EXCLUDE recipes containing these ingredients/allergens: ${preferences.excludeIngredients}.` 
    : '';
    
  const dietContext = preferences.dietaryRestrictions 
    ? `Dietary preferences (strict): "${preferences.dietaryRestrictions}".` 
    : '';

  const regionContext = preferences.region 
    ? `User's Regional Preference: "${preferences.region}". HEAVILY PRIORITIZE authentic recipes from this specific region/cuisine.` 
    : 'User has no specific regional preference set in profile.';

  const finalPrompt = `
    Act as a global recipe database with deep expertise in world cuisines. Find and return ${count} distinct recipes based on the following criteria:
    
    1. ${searchContext}
    2. ${ingredientsContext}
    3. ${regionContext}
    4. ${dietContext}
    5. ${allergyContext}
    6. ${skillContext}
    
    If specific ingredients are listed, try to match them.
    If a specific dish name is provided in the search, return that exact recipe and variants.
    
    CRITICAL INSTRUCTION ON CUISINE:
    ${preferences.region ? `Since the user has set their region to "${preferences.region}", the majority of suggestions MUST be from this region.` : 'Since no region is specified, ensure the results frequently include Indian and South Indian dishes (such as Dosas, Idlis, Curries, Biryanis, Paneer dishes, Thorans, etc.) alongside other global options.'}
    
    For each recipe, include a valid and relevant YouTube video URL that demonstrates how to cook this dish.
    Ensure the recipes are practical for home cooking.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: finalPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: "Unique UUID" },
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              ingredients: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    amount: { type: Type.STRING },
                  },
                },
              },
              instructions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              calories: { type: Type.NUMBER },
              prepTimeMinutes: { type: Type.NUMBER },
              tags: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING } 
              },
              videoUrl: { type: Type.STRING, description: "A valid YouTube URL for a video recipe" },
            },
            required: ["title", "description", "ingredients", "instructions", "prepTimeMinutes"],
          },
        },
      },
    });

    const text = response.text;
    if (!text) return [];
    
    const recipes = JSON.parse(text) as Recipe[];
    
    // Ensure IDs are unique
    return recipes.map((r, index) => ({
        ...r,
        id: r.id || `recipe-${Date.now()}-${index}`
    }));

  } catch (error) {
    console.error("Error generating recipes:", error);
    return [];
  }
};