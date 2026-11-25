// Saigon Sizzle — the kitchen's memory and rules: tickets, the plate, the stations,
// the pass, the clock and the till. Nothing here draws or listens; render.js reads
// this state, input.js calls these moves, and every move answers with a sound cue
// name in state.cues for audio.js to play.

import {
  BURNT_LINGER, COMBO_BONUS_CAP, DAY_LENGTH, MAX_TICKETS, READY_WINDOW,
  RUSH_END, RUSH_START, SHELF_MAX, SPAWN_EVERY_CALM, SPAWN_EVERY_RUSH,
  TIP_FRACTION, WRONG_INGREDIENT_TIME_COST, ticketRect,
} from './config.js';
import { RECIPES, ingredientById, recipeById } from './recipes.js';

/** A small deterministic random source, so a seed always deals the same day. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A fresh game on its title screen; startDay opens the kitchen. */
export function createGame(seed) {
  return {
    screen: 'title',
    paused: false,
    muted: false,
    rng: mulberry32(seed),
    elapsed: 0,
    money: 0,
    served: 0,
    lost: 0,
    combo: 0,
    bestCombo: 0,
    stars: 0,
    tickets: [],
    nextTicketId: 1,
    spawnIn: 0,
    rushAnnounced: false,
    targetId: null,
    plate: { recipeId: null, stepsDone: [] },
    stations: { grill: [null, null], pot: [null, null] },
    shelf: [],
    floaters: [],
    cues: [],
    message: '',
    messageAge: 99,
    shake: 0,
  };
}

/** Open the kitchen: a clean counter, two first orders, the clock running. */
export function startDay(state) {
  state.screen = 'play';
  state.paused = false;
  state.elapsed = 0;
  state.money = 0;
  state.served = 0;
  state.lost = 0;
  state.combo = 0;
  state.bestCombo = 0;
  state.tickets = [];
  state.spawnIn = 3;
  state.rushAnnounced = false;
  state.targetId = null;
  state.plate = { recipeId: null, stepsDone: [] };
  state.stations = { grill: [null, null], pot: [null, null] };
  state.shelf = [];
  state.floaters = [];
  state.message = '';
  state.messageAge = 99;
  addTicket(state);
  addTicket(state);
}

/** Seconds left in the day. */
export function timeLeft(state) {
  return Math.max(0, DAY_LENGTH - state.elapsed);
}

/** True during the midday rush wave, when tickets arrive faster. */
export function inRush(state) {
  return state.elapsed >= RUSH_START && state.elapsed < RUSH_END;
}

/** The ticket the player is cooking for, or null. */
export function targetTicket(state) {
  return state.tickets.find((ticket) => ticket.id === state.targetId) ?? null;
}

/** The recipe the plate on the counter is becoming, or null while it is empty. */
export function plateRecipe(state) {
  return state.plate.recipeId === null ? null : recipeById(state.plate.recipeId);
}

/**
 * The next step the target ticket asks for, or null when there is no target or the
 * plate already holds the whole dish. The plate's dish, once started, rules: a
 * plate of phở steps is finished against a phở ticket, whichever one is picked.
 */
export function nextStep(state) {
  const recipe = plateRecipe(state) ?? targetTicketRecipe(state);
  if (recipe === null) return null;
  const index = state.plate.stepsDone.length;
  return index < recipe.steps.length ? recipe.steps[index] : null;
}

function targetTicketRecipe(state) {
  const ticket = targetTicket(state);
  return ticket === null ? null : recipeById(ticket.recipeId);
}

/** True when the plate holds every step of its dish, ready to serve. */
export function plateComplete(state) {
  const recipe = plateRecipe(state);
  return recipe !== null && state.plate.stepsDone.length === recipe.steps.length;
}

/** Deal a new ticket onto the order board. */
export function addTicket(state) {
  const roll = state.rng();
  const recipe = RECIPES[Math.min(RECIPES.length - 1, Math.floor(roll * RECIPES.length))];
  const patience = recipe.patience * (0.9 + state.rng() * 0.25);
  const ticket = { id: state.nextTicketId, recipeId: recipe.id, patience, patienceMax: patience };
  state.nextTicketId += 1;
  state.tickets.push(ticket);
  if (state.targetId === null && state.plate.stepsDone.length === 0) {
    state.targetId = ticket.id;
    state.plate.recipeId = ticket.recipeId;
  }
  return ticket;
}

/** Aim the kitchen at a ticket; a plate already started for another dish refuses. */
export function selectTicket(state, ticketId) {
  const ticket = state.tickets.find((entry) => entry.id === ticketId);
  if (ticket === undefined) return;
  if (state.plate.stepsDone.length > 0 && state.plate.recipeId !== ticket.recipeId) {
    say(state, 'Finish or trash the current plate first');
    state.cues.push('error');
    return;
  }
  state.targetId = ticket.id;
  state.plate.recipeId = ticket.recipeId;
  state.cues.push('click');
}

/**
 * A click on an ingredient bin. A raw ingredient used as it is goes to the plate
 * when it is the next step, and costs time when it is not; one that must cook
 * first goes onto its station instead.
 */
export function pressIngredient(state, ingredientId) {
  const ingredient = ingredientById(ingredientId);
  if (ingredient === undefined || state.screen !== 'play' || state.paused) return;
  if (ingredient.station !== null) {
    startCooking(state, ingredient);
    return;
  }
  const step = nextStep(state);
  if (step !== null && step.id === ingredientId && step.via === 'bin') {
    addToPlate(state, ingredientId);
  } else {
    wrongIngredient(state);
  }
}

/** Send a raw ingredient onto its station, if a slot is free there. */
function startCooking(state, ingredient) {
  const slots = state.stations[ingredient.station];
  const free = slots.indexOf(null);
  if (free === -1) {
    say(state, ingredient.station === 'grill' ? 'The grill is full!' : 'The pot is full!');
    state.cues.push('error');
    return;
  }
  slots[free] = { ingredient: ingredient.id, phase: 'cooking', t: 0 };
  state.cues.push('click');
}

/** A click on a station slot: a ready item is plated or passed; a burnt one scraped off. */
export function pressStationSlot(state, kind, slotIndex) {
  if (state.screen !== 'play' || state.paused) return;
  const slot = state.stations[kind][slotIndex];
  if (slot === null || slot === undefined) return;
  if (slot.phase === 'ready') {
    state.stations[kind][slotIndex] = null;
    deliverCooked(state, slot.ingredient);
  } else if (slot.phase === 'burnt') {
    state.stations[kind][slotIndex] = null;
    state.cues.push('trash');
  } else {
    say(state, 'Still cooking…');
  }
}

/** A click on a cooked item waiting on the pass: plate it when it is the next step. */
export function pressShelf(state, index) {
  if (state.screen !== 'play' || state.paused) return;
  const ingredientId = state.shelf[index];
  if (ingredientId === undefined) return;
  const step = nextStep(state);
  if (step !== null && step.id === ingredientId) {
    state.shelf.splice(index, 1);
    addToPlate(state, ingredientId);
  } else {
    say(state, 'That is not the next step');
    state.cues.push('error');
  }
}

/** Put an ingredient on the plate and note when the dish is whole. */
function addToPlate(state, ingredientId) {
  if (state.plate.recipeId === null) {
    const ticket = targetTicket(state);
    if (ticket !== null) state.plate.recipeId = ticket.recipeId;
  }
  state.plate.stepsDone.push(ingredientId);
  state.cues.push('add');
  if (plateComplete(state)) say(state, 'Plate complete — serve it!');
}

/** A cooked item leaves its station: onto the plate if called for, else to the pass. */
function deliverCooked(state, ingredientId) {
  const step = nextStep(state);
  if (step !== null && step.id === ingredientId) {
    addToPlate(state, ingredientId);
  } else if (state.shelf.length < SHELF_MAX) {
    state.shelf.push(ingredientId);
    state.cues.push('click');
    say(state, `${ingredientById(ingredientId).name} waits on the pass`);
  } else {
    say(state, 'The pass is full!');
    state.cues.push('error');
  }
}

/** The wrong bin: the plate shakes and the day loses a little time. */
function wrongIngredient(state) {
  state.shake = 0.35;
  state.elapsed = Math.min(DAY_LENGTH - 0.5, state.elapsed + WRONG_INGREDIENT_TIME_COST);
  say(state, `Wrong ingredient! −${WRONG_INGREDIENT_TIME_COST}s`);
  state.cues.push('error');
}

/** Hand the finished plate to its ticket and ring up price, tip and combo bonus. */
export function servePlate(state) {
  if (state.screen !== 'play' || state.paused) return;
  const ticket = targetTicket(state);
  if (ticket === null) {
    say(state, 'Pick an order first');
    state.cues.push('error');
    return;
  }
  if (state.plate.recipeId !== ticket.recipeId || !plateComplete(state)) {
    say(state, 'The plate is not finished');
    state.cues.push('error');
    return;
  }
  const recipe = recipeById(ticket.recipeId);
  const tip = Math.round(recipe.price * TIP_FRACTION * (ticket.patience / ticket.patienceMax));
  const bonus = Math.min(state.combo, COMBO_BONUS_CAP);
  const total = recipe.price + tip + bonus;
  state.money += total;
  state.served += 1;
  state.combo += 1;
  state.bestCombo = Math.max(state.bestCombo, state.combo);
  const at = ticketRect(state.tickets.indexOf(ticket));
  state.floaters.push({ x: at.x + at.width / 2, y: at.y + at.height - 26, text: `+$${total}`, colour: '#f2b33d', age: 0 });
  state.tickets = state.tickets.filter((entry) => entry.id !== ticket.id);
  state.plate = { recipeId: null, stepsDone: [] };
  state.targetId = null;
  const next = state.tickets[0];
  if (next !== undefined) {
    state.targetId = next.id;
    state.plate.recipeId = next.recipeId;
  }
  say(state, `Served ${recipe.name}! +$${total}`);
  state.cues.push('serve');
}

/** Scrape the plate clean so another dish can start. */
export function trashPlate(state) {
  if (state.screen !== 'play' || state.paused) return;
  if (state.plate.stepsDone.length === 0) {
    say(state, 'The plate is already empty');
    return;
  }
  const ticket = targetTicket(state);
  state.plate = { recipeId: ticket === null ? null : ticket.recipeId, stepsDone: [] };
  state.cues.push('trash');
  say(state, 'Plate cleared');
}

/** Show a line of kitchen talk under the order board for a couple of seconds. */
export function say(state, text) {
  state.message = text;
  state.messageAge = 0;
}

/** Advance the whole kitchen by dt seconds: clock, tickets, stations, talk. */
export function updateGame(state, dt) {
  if (state.screen !== 'play' || state.paused) return;
  state.elapsed += dt;
  if (state.elapsed >= DAY_LENGTH) {
    finishDay(state);
    return;
  }
  if (inRush(state) && !state.rushAnnounced) {
    state.rushAnnounced = true;
    say(state, 'RUSH HOUR! Orders are flying in!');
    state.cues.push('ding');
  }
  state.spawnIn -= dt;
  if (state.spawnIn <= 0) {
    if (state.tickets.length < MAX_TICKETS) {
      addTicket(state);
      const base = inRush(state) ? SPAWN_EVERY_RUSH : SPAWN_EVERY_CALM;
      state.spawnIn = base * (0.75 + state.rng() * 0.5);
    } else {
      state.spawnIn = 0.5;
    }
  }
  for (const ticket of [...state.tickets]) {
    ticket.patience -= dt;
    if (ticket.patience <= 0) loseTicket(state, ticket);
  }
  for (const kind of ['grill', 'pot']) {
    const slots = state.stations[kind];
    for (let index = 0; index < slots.length; index += 1) {
      const slot = slots[index];
      if (slot !== null) slots[index] = advanceSlot(state, slot, dt);
    }
  }
  for (const floater of state.floaters) floater.age += dt;
  state.floaters = state.floaters.filter((floater) => floater.age < 1.4);
  state.messageAge += dt;
  state.shake = Math.max(0, state.shake - dt * 1.6);
}

/** A customer gives up and leaves: the streak ends and the tally grows. */
function loseTicket(state, ticket) {
  state.tickets = state.tickets.filter((entry) => entry.id !== ticket.id);
  state.lost += 1;
  state.combo = 0;
  const at = ticketRect(state.tickets.indexOf(ticket));
  state.floaters.push({ x: at.x + at.width / 2, y: at.y + at.height - 26, text: 'Left angry!', colour: '#e2574c', age: 0 });
  if (state.targetId === ticket.id) state.targetId = null;
  state.cues.push('angry');
}

/** Move one cooking slot through cooking, its ready window, and burning. */
function advanceSlot(state, slot, dt) {
  const ingredient = ingredientById(slot.ingredient);
  slot.t += dt;
  if (slot.phase === 'cooking' && slot.t >= ingredient.cookSeconds) {
    state.cues.push('ding');
    return { ingredient: slot.ingredient, phase: 'ready', t: 0 };
  }
  if (slot.phase === 'ready' && slot.t >= READY_WINDOW) {
    state.cues.push('burn');
    say(state, `The ${ingredient.name.toLowerCase()} burned!`);
    return { ingredient: slot.ingredient, phase: 'burnt', t: 0 };
  }
  if (slot.phase === 'burnt' && slot.t >= BURNT_LINGER) return null;
  return slot;
}

/** Close the day and grade it: three stars for a rich, careful service. */
function finishDay(state) {
  state.screen = 'end';
  state.stars = state.money >= 230 && state.lost <= 2 ? 3 : state.money >= 140 ? 2 : 1;
}
