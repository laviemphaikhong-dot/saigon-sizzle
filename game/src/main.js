// Saigon Sizzle — the door of the stall: size the canvas, read the URL, run the
// fixed-step clock, drain the sound cues the logic leaves, and paint every frame.
// With ?shot=<name>&seed=<n> it stages one of scenes.js instead of opening play,
// so the maker can photograph the game exactly as it renders.

import { FIELD } from './config.js';
import { SoundKit } from './audio.js';
import { attachInput } from './input.js';
import { drawGame } from './render.js';
import { stageScene } from './scenes.js';
import { createGame, updateGame } from './state.js';

const STEP = 1 / 60;
const canvas = document.getElementById('game');
const status = document.getElementById('status');
const ctx = canvas.getContext('2d');
canvas.width = FIELD.width;
canvas.height = FIELD.height;

const params = new URLSearchParams(window.location.search);
const seedParam = Number(params.get('seed'));
const seed = Number.isInteger(seedParam) && seedParam > 0 ? seedParam : Date.now() % 2147483647;
const shotName = params.get('shot');
const state = shotName === null ? createGame(seed) : stageScene(shotName, seed);
const sound = new SoundKit();
state.muted = sound.muted;

let lastAnnounced = '';
function announce(text) {
  status.textContent = text;
}

/** Speak the game's freshest line to the status element when it changes. */
function announceMessages() {
  if (state.message !== '' && state.messageAge < STEP * 2 && state.message !== lastAnnounced) {
    lastAnnounced = state.message;
    announce(state.message);
  }
}

attachInput(canvas, state, sound, announce);

// The maker's own handle for play-testing from a console or a test script.
window.__saigonSizzle = { state };

let previous = performance.now();
let accumulator = 0;
function frame(nowMs) {
  const now = nowMs / 1000;
  if (shotName === null) {
    accumulator += Math.min(0.1, (nowMs - previous) / 1000);
    while (accumulator >= STEP) {
      updateGame(state, STEP);
      accumulator -= STEP;
    }
    for (const cue of state.cues) sound.play(cue);
    state.cues.length = 0;
    announceMessages();
    drawGame(ctx, state, now);
  } else {
    drawGame(ctx, state, 1.25);
  }
  previous = nowMs;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
