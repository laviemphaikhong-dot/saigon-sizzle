// Saigon Sizzle — the player's hands: pointer presses and keys, translated into
// the moves state.js offers. Hit-testing uses the very rects render.js draws by,
// so a click lands where the eye says it should.

import {
  AGAIN_BUTTON, MUTE_BUTTON, PAUSE_BUTTON, SERVE_BUTTON, START_BUTTON,
  TRASH_BUTTON, binRect, inside, shelfSlotRect, stationSlotRect, ticketRect,
} from './config.js';
import { INGREDIENTS } from './recipes.js';
import { pressIngredient, pressShelf, pressStationSlot, selectTicket, servePlate, startDay, trashPlate } from './state.js';

/**
 * Wire a canvas to a game. `sound` is the SoundKit to unlock and feed, and
 * `announce` receives a short line for the page's status element after big events.
 * Returns the handlers so main.js can detach them if it ever needs to.
 */
export function attachInput(canvas, state, sound, announce) {
  function toField(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  function onPointerDown(event) {
    sound.unlock();
    const { x, y } = toField(event);
    if (inside(MUTE_BUTTON, x, y)) {
      state.muted = sound.toggleMute();
      return;
    }
    if (state.screen === 'title') {
      if (inside(START_BUTTON, x, y)) {
        startDay(state);
        announce('The day begins. First orders are up.');
      }
      return;
    }
    if (state.screen === 'end') {
      if (inside(AGAIN_BUTTON, x, y)) {
        startDay(state);
        announce('A new day at the stall.');
      }
      return;
    }
    if (inside(PAUSE_BUTTON, x, y)) {
      state.paused = !state.paused;
      return;
    }
    if (state.paused) return;
    for (let index = 0; index < state.tickets.length; index += 1) {
      if (inside(ticketRect(index), x, y)) {
        selectTicket(state, state.tickets[index].id);
        return;
      }
    }
    for (const kind of ['grill', 'pot']) {
      for (let slot = 0; slot < 2; slot += 1) {
        if (inside(stationSlotRect(kind, slot), x, y)) {
          pressStationSlot(state, kind, slot);
          return;
        }
      }
    }
    for (let index = 0; index < 4; index += 1) {
      if (inside(shelfSlotRect(index), x, y)) {
        pressShelf(state, index);
        return;
      }
    }
    if (inside(SERVE_BUTTON, x, y)) {
      servePlate(state);
      return;
    }
    if (inside(TRASH_BUTTON, x, y)) {
      trashPlate(state);
      return;
    }
    for (let index = 0; index < INGREDIENTS.length; index += 1) {
      if (inside(binRect(index), x, y)) {
        pressIngredient(state, INGREDIENTS[index].id);
        return;
      }
    }
  }

  function onKeyDown(event) {
    if (event.repeat) return;
    sound.unlock();
    if (state.screen === 'title' && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      startDay(state);
      announce('The day begins. First orders are up.');
      return;
    }
    if (state.screen === 'end' && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      startDay(state);
      return;
    }
    if (state.screen !== 'play') return;
    if (event.key === 'p' || event.key === 'P') {
      state.paused = !state.paused;
    } else if (event.key === ' ') {
      event.preventDefault();
      servePlate(state);
    } else if (event.key === 't' || event.key === 'T') {
      trashPlate(state);
    } else if (event.key === 'm' || event.key === 'M') {
      state.muted = sound.toggleMute();
    }
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('keydown', onKeyDown);
  return { onPointerDown, onKeyDown };
}
