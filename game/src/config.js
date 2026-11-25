// Saigon Sizzle — table of constants: the field, the day, and the geometry every other
// module agrees on. Render draws by these rects and input hit-tests by the same rects,
// so what a player sees is exactly what a click lands on.

/** The logical field the game is drawn on; main.js scales it to the window. */
export const FIELD = { width: 1280, height: 800 };

/** One full day of service, in seconds, and the rush wave inside it. */
export const DAY_LENGTH = 150;
export const RUSH_START = 55;
export const RUSH_END = 95;

/** Ticket flow: how many wait at once, and how often a new one arrives. */
export const MAX_TICKETS = 4;
export const SPAWN_EVERY_CALM = 6.5;
export const SPAWN_EVERY_RUSH = 3.1;

/** Money and streaks. */
export const TIP_FRACTION = 0.6;
export const COMBO_BONUS_CAP = 8;
export const WRONG_INGREDIENT_TIME_COST = 2;

/** How long a cooked item stays perfect on its station before it burns. */
export const READY_WINDOW = 6;
export const BURNT_LINGER = 1.2;
export const SHELF_MAX = 4;

/** Palette: a warm night-market kitchen — lacquer red, turmeric, banana leaf, steel. */
export const INK = {
  wall: '#3a2317',
  wallTile: '#4a2d1c',
  counter: '#7a4a26',
  counterEdge: '#96602f',
  paper: '#fdf3d8',
  paperShade: '#f3e3b8',
  ink: '#2c1a0e',
  red: '#c93a2e',
  redDark: '#9c271e',
  gold: '#f2b33d',
  leaf: '#4d9b47',
  leafDark: '#35702f',
  steel: '#b9c2c9',
  steelDark: '#7d8891',
  cream: '#fff8e7',
  night: '#201409',
};

/** The head-up strip: title, day clock, money, tallies, pause and mute. */
export const HUD = { x: 0, y: 0, width: FIELD.width, height: 52 };
export const PAUSE_BUTTON = { x: 1152, y: 8, width: 52, height: 36 };
export const MUTE_BUTTON = { x: 1212, y: 8, width: 52, height: 36 };
export const START_BUTTON = { x: 490, y: 596, width: 300, height: 64 };
export const AGAIN_BUTTON = { x: 490, y: 618, width: 300, height: 60 };

/** Order tickets across the top of the kitchen. */
export function ticketRect(index) {
  return { x: 16 + index * 313, y: 60, width: 300, height: 128 };
}

/** The two cooking stations down the left side, each with two slots. */
export function stationRect(kind) {
  return kind === 'grill'
    ? { x: 16, y: 198, width: 300, height: 192 }
    : { x: 16, y: 398, width: 300, height: 192 };
}
export function stationSlotRect(kind, slot) {
  const base = stationRect(kind);
  return { x: base.x + 18 + slot * 140, y: base.y + 52, width: 124, height: 118 };
}

/** The plate the player is building, its checklist, and its two buttons. */
export const PLATE_PANEL = { x: 332, y: 198, width: 452, height: 256 };
export const PLATE_CENTRE = { x: 558, y: 306, radius: 88 };
export const SERVE_BUTTON = { x: 348, y: 398, width: 200, height: 44 };
export const TRASH_BUTTON = { x: 564, y: 398, width: 204, height: 44 };
export const CHECKLIST_PANEL = { x: 332, y: 462, width: 452, height: 128 };

/** The pass: cooked items waiting to be plated, and the day's tallies under it. */
export const SHELF_PANEL = { x: 800, y: 198, width: 464, height: 192 };
export function shelfSlotRect(index) {
  return { x: 822 + index * 110, y: 248, width: 96, height: 96 };
}
export const TALLY_PANEL = { x: 800, y: 398, width: 464, height: 192 };

/** Ingredient bins along the counter: two rows of eight. */
export const BIN_COLS = 8;
export function binRect(index) {
  const col = index % BIN_COLS;
  const row = Math.floor(index / BIN_COLS);
  return { x: 16 + col * 156, y: 616 + row * 86, width: 148, height: 78 };
}

/** True when (x, y) falls inside a rect of the shape these helpers hand out. */
export function inside(rect, x, y) {
  return x >= rect.x && x < rect.x + rect.width && y >= rect.y && y < rect.y + rect.height;
}
