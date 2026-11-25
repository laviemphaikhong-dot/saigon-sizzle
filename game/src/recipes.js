// Saigon Sizzle — the menu: every ingredient bin on the counter, and the five dishes
// built from them. A recipe is an ordered list of steps; a step names an ingredient
// and how it reaches the plate: straight from its bin, or cooked first on the grill
// or in the pot. Order matters — the plate takes the steps in the order listed.

export const VIA_BIN = 'bin';
export const VIA_GRILL = 'grill';
export const VIA_POT = 'pot';

/**
 * Every ingredient, in the order its bin stands on the counter. `station` is null for
 * an ingredient used as it is, or the station it must cook on first; `cookSeconds`
 * is its time on that station. `colour` and `accent` drive its drawing everywhere.
 */
export const INGREDIENTS = [
  { id: 'noodles', name: 'Rice Noodles', station: null, cookSeconds: 0, colour: '#f5e6b8', accent: '#d9b95c' },
  { id: 'broth', name: 'Broth Ladle', station: null, cookSeconds: 0, colour: '#c97b2d', accent: '#8f4f14' },
  { id: 'beef', name: 'Beef Slices', station: VIA_POT, cookSeconds: 5, colour: '#b8433a', accent: '#7e2721' },
  { id: 'baguette', name: 'Baguette', station: null, cookSeconds: 0, colour: '#e0aa5e', accent: '#a8742c' },
  { id: 'pate', name: 'Pâté', station: null, cookSeconds: 0, colour: '#8a5a3b', accent: '#5d3a22' },
  { id: 'pork', name: 'Pork Cut', station: VIA_GRILL, cookSeconds: 6, colour: '#e58aa0', accent: '#b4536e' },
  { id: 'shrimp', name: 'Shrimp', station: VIA_POT, cookSeconds: 4, colour: '#f08a4b', accent: '#c25e22' },
  { id: 'ricepaper', name: 'Rice Paper', station: null, cookSeconds: 0, colour: '#f7f3e6', accent: '#cfc7a8' },
  { id: 'rice', name: 'Broken Rice', station: null, cookSeconds: 0, colour: '#ffffff', accent: '#d8d2c0' },
  { id: 'egg', name: 'Egg', station: VIA_GRILL, cookSeconds: 3.5, colour: '#fdfdf6', accent: '#f2b33d' },
  { id: 'herbs', name: 'Herb Basket', station: null, cookSeconds: 0, colour: '#4d9b47', accent: '#2f662b' },
  { id: 'pickles', name: 'Pickles', station: null, cookSeconds: 0, colour: '#e8873a', accent: '#7fb069' },
  { id: 'sauce', name: 'Sauce Bowl', station: null, cookSeconds: 0, colour: '#a8542c', accent: '#6e3315' },
  { id: 'coffee', name: 'Phin Coffee', station: null, cookSeconds: 0, colour: '#3a2415', accent: '#1f120a' },
  { id: 'milk', name: 'Condensed Milk', binName: 'Cond. Milk', station: null, cookSeconds: 0, colour: '#fdf6dd', accent: '#d9b95c' },
  { id: 'ice', name: 'Crushed Ice', station: null, cookSeconds: 0, colour: '#cfe8f7', accent: '#8fc3e0' },
];

const INGREDIENT_BY_ID = new Map(INGREDIENTS.map((ingredient) => [ingredient.id, ingredient]));

/** The ingredient record for an id, or undefined when the id names nothing. */
export function ingredientById(id) {
  return INGREDIENT_BY_ID.get(id);
}

/** One step of a recipe: the ingredient, and the road it takes to the plate. */
function step(id) {
  const ingredient = ingredientById(id);
  return { id, via: ingredient.station ?? VIA_BIN };
}

/**
 * The five dishes of the house. `price` is what the dish earns before its tip;
 * `patience` is how long, in seconds, its customer will wait happily.
 */
export const RECIPES = [
  {
    id: 'pho-bo', name: 'Phở Bò', short: 'Phở', price: 18, patience: 68,
    blurb: 'Noodles, blanched beef, broth, herbs',
    steps: [step('noodles'), step('beef'), step('broth'), step('herbs')],
  },
  {
    id: 'banh-mi', name: 'Bánh Mì', short: 'Bánh Mì', price: 12, patience: 55,
    blurb: 'Baguette, pâté, grilled pork, pickles',
    steps: [step('baguette'), step('pate'), step('pork'), step('pickles')],
  },
  {
    id: 'goi-cuon', name: 'Gỏi Cuốn', short: 'Gỏi Cuốn', price: 14, patience: 60,
    blurb: 'Rice paper, boiled shrimp, herbs, sauce',
    steps: [step('ricepaper'), step('shrimp'), step('herbs'), step('sauce')],
  },
  {
    id: 'com-tam', name: 'Cơm Tấm', short: 'Cơm Tấm', price: 16, patience: 64,
    blurb: 'Broken rice, grilled pork, fried egg, sauce',
    steps: [step('rice'), step('pork'), step('egg'), step('sauce')],
  },
  {
    id: 'ca-phe', name: 'Cà Phê Sữa Đá', short: 'Cà Phê', price: 8, patience: 40,
    blurb: 'Phin coffee, condensed milk, ice',
    steps: [step('coffee'), step('milk'), step('ice')],
  },
];

const RECIPE_BY_ID = new Map(RECIPES.map((recipe) => [recipe.id, recipe]));

/** The recipe record for an id, or undefined when the id names nothing. */
export function recipeById(id) {
  return RECIPE_BY_ID.get(id);
}
