// Saigon Sizzle — the staged scenes behind ?shot=<name>&seed=<n>: real game states
// arranged by hand, the way a busy moment of play actually looks, so the maker's
// screenshots are honest renders of the game's own code. Time stands still in a
// scene; nothing here runs during normal play.

import { createGame } from './state.js';

/** One waiting ticket, with its patience set as a fraction of its full wait. */
function ticket(id, recipeId, patience, patienceMax) {
  return { id, recipeId, patience, patienceMax };
}

/** A slot mid-cook: the ingredient, its phase, and how long it has been there. */
function slot(ingredient, phase, t) {
  return { ingredient, phase, t };
}

/** The cover: mid-rush, three tickets up, a phở half-built, the grill busy. */
function stageCover(state) {
  state.screen = 'play';
  state.elapsed = 68;
  state.rushAnnounced = true;
  state.money = 86;
  state.served = 5;
  state.combo = 3;
  state.bestCombo = 4;
  state.tickets = [
    ticket(1, 'pho-bo', 41, 68),
    ticket(2, 'banh-mi', 19, 55),
    ticket(3, 'com-tam', 51, 64),
  ];
  state.nextTicketId = 4;
  state.targetId = 1;
  state.plate = { recipeId: 'pho-bo', stepsDone: ['noodles'] };
  state.stations.grill[0] = slot('pork', 'cooking', 3.3);
  state.stations.pot[0] = slot('beef', 'ready', 1.2);
  state.message = 'The beef is ready — click the pot!';
  state.messageAge = 0.4;
}

/** Assembly: a bánh mì half-built, its pork nearly done, shrimp waiting on the pass. */
function stageAssembly(state) {
  state.screen = 'play';
  state.elapsed = 34;
  state.money = 38;
  state.served = 2;
  state.combo = 1;
  state.bestCombo = 2;
  state.tickets = [
    ticket(1, 'banh-mi', 38, 55),
    ticket(2, 'goi-cuon', 30, 60),
  ];
  state.nextTicketId = 3;
  state.targetId = 1;
  state.plate = { recipeId: 'banh-mi', stepsDone: ['baguette', 'pate'] };
  state.stations.grill[0] = slot('pork', 'cooking', 4.2);
  state.shelf = ['shrimp'];
}

/** Service: a finished phở on the plate, the serve moment, more cooking behind it. */
function stageServe(state) {
  state.screen = 'play';
  state.elapsed = 88;
  state.rushAnnounced = true;
  state.money = 124;
  state.served = 7;
  state.lost = 1;
  state.combo = 4;
  state.bestCombo = 5;
  state.tickets = [
    ticket(1, 'pho-bo', 37, 68),
    ticket(2, 'ca-phe', 36, 40),
  ];
  state.nextTicketId = 3;
  state.targetId = 1;
  state.plate = { recipeId: 'pho-bo', stepsDone: ['noodles', 'beef', 'broth', 'herbs'] };
  state.stations.pot[0] = slot('shrimp', 'cooking', 2);
  state.stations.grill[1] = slot('egg', 'ready', 0.8);
  state.message = 'Plate complete — serve it!';
  state.messageAge = 0.4;
}

/** The end of a strong day: the grade card over a kitchen at rest. */
function stageEnd(state) {
  state.screen = 'end';
  state.elapsed = 150;
  state.money = 286;
  state.served = 14;
  state.lost = 2;
  state.combo = 0;
  state.bestCombo = 6;
  state.stars = 3;
  state.tickets = [ticket(1, 'com-tam', 30, 64)];
  state.nextTicketId = 2;
}

/** The scene builders, by the name the URL asks for. */
const SCENES = { cover: stageCover, assembly: stageAssembly, serve: stageServe, end: stageEnd };

/** Build the named scene's state; an unknown name stages the cover. */
export function stageScene(name, seed) {
  const state = createGame(seed);
  (SCENES[name] ?? stageCover)(state);
  return state;
}
