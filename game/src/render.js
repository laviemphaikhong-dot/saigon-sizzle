// Saigon Sizzle — every pixel of the kitchen: the order board, the stations, the
// plate, the pass and the counter, drawn with canvas shapes alone. Nothing here
// changes the game; it reads state.js and paints it, and its ingredient icons are
// the one drawing every other surface (tickets, bins, plate, pass) shares.

import {
  AGAIN_BUTTON, CHECKLIST_PANEL, DAY_LENGTH, FIELD, HUD, INK, MUTE_BUTTON,
  PLATE_CENTRE, PLATE_PANEL, PAUSE_BUTTON, RUSH_END, RUSH_START, SERVE_BUTTON,
  SHELF_PANEL, START_BUTTON, TALLY_PANEL, TRASH_BUTTON, binRect, shelfSlotRect,
  stationRect, stationSlotRect, ticketRect,
} from './config.js';
import { INGREDIENTS, RECIPES, ingredientById, recipeById } from './recipes.js';
import { inRush, nextStep, plateComplete, plateRecipe, targetTicket, timeLeft } from './state.js';

/** A rounded rectangle path, the shape half the kitchen is built from. */
function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

/** One line of text with the kitchen's defaults: bold, warm, centred where asked. */
function label(ctx, text, x, y, { size = 16, colour = INK.cream, align = 'center', weight = 700 } = {}) {
  ctx.fillStyle = colour;
  ctx.font = `${weight} ${size}px "Avenir Next", "Segoe UI", system-ui, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

/** A soft-edged panel with a title tab, the kitchen's standard furniture. */
function panel(ctx, rect, title, accent = INK.gold) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
  roundRect(ctx, rect.x, rect.y, rect.width, rect.height, 14);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  roundRect(ctx, rect.x, rect.y, rect.width, rect.height, 14);
  ctx.stroke();
  if (title !== null) label(ctx, title, rect.x + 18, rect.y + 24, { size: 17, colour: accent, align: 'left' });
}

/** The wall and counter the kitchen stands on: tiles above, wood below. */
function drawRoom(ctx) {
  ctx.fillStyle = INK.wall;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.strokeStyle = INK.wallTile;
  ctx.lineWidth = 2;
  for (let x = 0; x <= FIELD.width; x += 64) {
    ctx.beginPath(); ctx.moveTo(x, 52); ctx.lineTo(x, 596); ctx.stroke();
  }
  for (let y = 52; y <= 596; y += 54) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(FIELD.width, y); ctx.stroke();
  }
  ctx.fillStyle = INK.counter;
  ctx.fillRect(0, 596, FIELD.width, FIELD.height - 596);
  ctx.fillStyle = INK.counterEdge;
  ctx.fillRect(0, 596, FIELD.width, 10);
}

/**
 * The one drawing of an ingredient, used on bins, tickets, the plate, the stations
 * and the pass. (cx, cy) is its centre and s its half-size.
 */
export function drawIngredientIcon(ctx, id, cx, cy, s) {
  const ingredient = ingredientById(id);
  if (ingredient === undefined) return;
  ctx.save();
  ctx.translate(cx, cy);
  switch (id) {
    case 'noodles':
      ctx.strokeStyle = ingredient.accent; ctx.lineWidth = s * 0.16;
      for (let i = -1; i <= 1; i += 1) {
        ctx.beginPath();
        ctx.moveTo(-s * 0.8, i * s * 0.34);
        ctx.bezierCurveTo(-s * 0.3, i * s * 0.34 - s * 0.3, s * 0.3, i * s * 0.34 + s * 0.3, s * 0.8, i * s * 0.34);
        ctx.stroke();
      }
      ctx.fillStyle = ingredient.colour;
      ctx.beginPath(); ctx.ellipse(0, -s * 0.1, s * 0.85, s * 0.5, 0, 0, Math.PI * 2); ctx.fill();
      break;
    case 'broth':
      ctx.fillStyle = ingredient.colour;
      ctx.beginPath(); ctx.arc(0, s * 0.15, s * 0.62, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = INK.steel; ctx.lineWidth = s * 0.18;
      ctx.beginPath(); ctx.moveTo(s * 0.4, -s * 0.2); ctx.lineTo(s * 0.95, -s * 0.8); ctx.stroke();
      ctx.fillStyle = INK.steel;
      ctx.beginPath(); ctx.arc(0, s * 0.15, s * 0.78, Math.PI * 0.15, Math.PI * 0.85, true); ctx.fill();
      break;
    case 'beef':
      ctx.fillStyle = ingredient.colour;
      for (let i = -1; i <= 1; i += 1) {
        roundRect(ctx, -s * 0.85 + i * s * 0.12, -s * 0.55 + i * s * 0.42, s * 1.5, s * 0.42, s * 0.2);
        ctx.fill();
      }
      ctx.strokeStyle = '#f3d9c8'; ctx.lineWidth = s * 0.09;
      ctx.beginPath(); ctx.moveTo(-s * 0.6, -s * 0.34); ctx.lineTo(s * 0.4, -s * 0.34); ctx.stroke();
      break;
    case 'baguette':
      ctx.save();
      ctx.rotate(-0.5);
      ctx.fillStyle = ingredient.colour;
      ctx.beginPath(); ctx.ellipse(0, 0, s * 1.05, s * 0.42, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = ingredient.accent; ctx.lineWidth = s * 0.11;
      for (let i = -1; i <= 1; i += 1) {
        ctx.beginPath(); ctx.moveTo(i * s * 0.45 - s * 0.14, -s * 0.22); ctx.lineTo(i * s * 0.45 + s * 0.14, s * 0.05); ctx.stroke();
      }
      ctx.restore();
      break;
    case 'pate':
      ctx.fillStyle = ingredient.colour;
      roundRect(ctx, -s * 0.8, -s * 0.5, s * 1.6, s, s * 0.18); ctx.fill();
      ctx.fillStyle = ingredient.accent;
      roundRect(ctx, -s * 0.8, -s * 0.5, s * 1.6, s * 0.34, s * 0.18); ctx.fill();
      break;
    case 'pork':
      ctx.fillStyle = ingredient.colour;
      ctx.beginPath(); ctx.ellipse(0, 0, s * 0.95, s * 0.68, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fdf6dd';
      ctx.beginPath(); ctx.arc(s * 0.34, 0, s * 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = ingredient.accent; ctx.lineWidth = s * 0.08;
      ctx.beginPath(); ctx.ellipse(0, 0, s * 0.95, s * 0.68, 0, 0, Math.PI * 2); ctx.stroke();
      break;
    case 'shrimp':
      ctx.strokeStyle = ingredient.colour; ctx.lineWidth = s * 0.52; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(0, 0, s * 0.55, Math.PI * 0.7, Math.PI * 1.95); ctx.stroke();
      ctx.strokeStyle = ingredient.accent; ctx.lineWidth = s * 0.1;
      ctx.beginPath(); ctx.arc(0, 0, s * 0.55, Math.PI * 0.95, Math.PI * 1.15); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, s * 0.55, Math.PI * 1.4, Math.PI * 1.6); ctx.stroke();
      break;
    case 'ricepaper':
      ctx.fillStyle = ingredient.colour;
      ctx.beginPath(); ctx.arc(0, 0, s * 0.92, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = ingredient.accent; ctx.lineWidth = s * 0.1;
      ctx.beginPath(); ctx.arc(0, 0, s * 0.92, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, s * 0.55, 0, Math.PI * 2); ctx.stroke();
      break;
    case 'rice':
      ctx.fillStyle = ingredient.colour;
      ctx.beginPath(); ctx.ellipse(0, s * 0.25, s * 0.95, s * 0.55, 0, Math.PI, Math.PI * 2); ctx.fill();
      ctx.fillStyle = ingredient.accent;
      for (const [dx, dy] of [[-0.4, -0.28], [0.05, -0.42], [0.45, -0.24], [-0.12, -0.14]]) {
        ctx.beginPath(); ctx.arc(dx * s, dy * s, s * 0.09, 0, Math.PI * 2); ctx.fill();
      }
      break;
    case 'egg':
      ctx.fillStyle = ingredient.colour;
      ctx.beginPath(); ctx.ellipse(0, 0, s * 0.95, s * 0.72, 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = ingredient.accent;
      ctx.beginPath(); ctx.arc(s * 0.08, 0, s * 0.38, 0, Math.PI * 2); ctx.fill();
      break;
    case 'herbs':
      ctx.fillStyle = ingredient.colour;
      for (const angle of [-0.6, 0, 0.6]) {
        ctx.save(); ctx.rotate(angle);
        ctx.beginPath(); ctx.ellipse(0, -s * 0.3, s * 0.3, s * 0.62, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      ctx.strokeStyle = ingredient.accent; ctx.lineWidth = s * 0.1;
      ctx.beginPath(); ctx.moveTo(0, s * 0.75); ctx.lineTo(0, s * 0.1); ctx.stroke();
      break;
    case 'pickles':
      ctx.fillStyle = ingredient.colour;
      for (let i = -1; i <= 1; i += 1) {
        roundRect(ctx, i * s * 0.5 - s * 0.13, -s * 0.7, s * 0.26, s * 1.3, s * 0.12); ctx.fill();
      }
      ctx.fillStyle = '#7fb069';
      ctx.beginPath(); ctx.arc(s * 0.55, s * 0.5, s * 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(-s * 0.58, s * 0.52, s * 0.26, 0, Math.PI * 2); ctx.fill();
      break;
    case 'sauce':
      ctx.fillStyle = INK.red;
      ctx.beginPath(); ctx.ellipse(0, s * 0.2, s * 0.9, s * 0.5, 0, 0, Math.PI); ctx.fill();
      ctx.fillStyle = ingredient.colour;
      ctx.beginPath(); ctx.ellipse(0, s * 0.18, s * 0.72, s * 0.3, 0, 0, Math.PI * 2); ctx.fill();
      break;
    case 'coffee':
      ctx.fillStyle = ingredient.colour;
      ctx.beginPath();
      ctx.moveTo(-s * 0.55, -s * 0.6); ctx.lineTo(s * 0.55, -s * 0.6);
      ctx.lineTo(s * 0.4, s * 0.75); ctx.lineTo(-s * 0.4, s * 0.75);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fdf6dd';
      ctx.beginPath(); ctx.ellipse(0, -s * 0.45, s * 0.42, s * 0.16, 0, 0, Math.PI * 2); ctx.fill();
      break;
    case 'milk':
      ctx.fillStyle = ingredient.colour;
      roundRect(ctx, -s * 0.5, -s * 0.8, s, s * 1.6, s * 0.14); ctx.fill();
      ctx.fillStyle = ingredient.accent;
      ctx.fillRect(-s * 0.5, -s * 0.18, s, s * 0.36);
      break;
    case 'ice':
      ctx.fillStyle = ingredient.colour;
      for (const [dx, dy, rot] of [[-0.35, -0.2, 0.4], [0.38, -0.3, 0.9], [0, 0.38, 0.2]]) {
        ctx.save(); ctx.translate(dx * s, dy * s); ctx.rotate(rot);
        roundRect(ctx, -s * 0.34, -s * 0.34, s * 0.68, s * 0.68, s * 0.12); ctx.fill();
        ctx.restore();
      }
      break;
    default:
      ctx.fillStyle = ingredient.colour;
      ctx.beginPath(); ctx.arc(0, 0, s * 0.8, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/** The head-up strip: name, the day clock, the till and the tallies. */
function drawHud(ctx, state) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(HUD.x, HUD.y, HUD.width, HUD.height);
  label(ctx, 'SAIGON SIZZLE', 20, 26, { size: 24, colour: INK.gold, align: 'left' });
  const left = timeLeft(state);
  const minutes = Math.floor(left / 60);
  const seconds = Math.floor(left % 60).toString().padStart(2, '0');
  label(ctx, `Day ends in ${minutes}:${seconds}`, 330, 26, { size: 20, align: 'left', colour: left < 20 ? '#e2574c' : INK.cream });
  const barX = 560;
  ctx.fillStyle = 'rgba(255, 248, 231, 0.18)';
  roundRect(ctx, barX, 18, 220, 16, 8); ctx.fill();
  ctx.fillStyle = inRush(state) ? INK.red : INK.leaf;
  roundRect(ctx, barX, 18, 220 * (state.elapsed / DAY_LENGTH), 16, 8); ctx.fill();
  label(ctx, inRush(state) ? 'RUSH HOUR' : 'service', barX + 110, 44, { size: 12, colour: inRush(state) ? '#e2574c' : INK.paperShade });
  label(ctx, `$${state.money}`, 830, 26, { size: 26, colour: INK.gold, align: 'left' });
  label(ctx, `served ${state.served}`, 950, 18, { size: 15, align: 'left' });
  label(ctx, `lost ${state.lost}`, 950, 38, { size: 15, align: 'left', colour: state.lost > 0 ? '#e2574c' : INK.cream });
  if (state.combo >= 2) label(ctx, `COMBO ×${state.combo}`, 1060, 26, { size: 18, colour: INK.gold, align: 'left' });
  drawPauseButton(ctx, state);
  drawMuteButton(ctx, state);
}

function drawPauseButton(ctx, state) {
  const rect = PAUSE_BUTTON;
  ctx.fillStyle = 'rgba(255, 248, 231, 0.14)';
  roundRect(ctx, rect.x, rect.y, rect.width, rect.height, 8); ctx.fill();
  ctx.fillStyle = INK.cream;
  if (state.paused) {
    ctx.beginPath();
    ctx.moveTo(rect.x + 20, rect.y + 9); ctx.lineTo(rect.x + 38, rect.y + 18); ctx.lineTo(rect.x + 20, rect.y + 27);
    ctx.closePath(); ctx.fill();
  } else {
    ctx.fillRect(rect.x + 17, rect.y + 9, 6, 18);
    ctx.fillRect(rect.x + 29, rect.y + 9, 6, 18);
  }
}

function drawMuteButton(ctx, state) {
  const rect = MUTE_BUTTON;
  ctx.fillStyle = 'rgba(255, 248, 231, 0.14)';
  roundRect(ctx, rect.x, rect.y, rect.width, rect.height, 8); ctx.fill();
  ctx.fillStyle = INK.cream;
  ctx.beginPath();
  ctx.moveTo(rect.x + 12, rect.y + 15);
  ctx.lineTo(rect.x + 20, rect.y + 15);
  ctx.lineTo(rect.x + 28, rect.y + 8);
  ctx.lineTo(rect.x + 28, rect.y + 28);
  ctx.lineTo(rect.x + 20, rect.y + 21);
  ctx.lineTo(rect.x + 12, rect.y + 21);
  ctx.closePath(); ctx.fill();
  if (state.muted) {
    ctx.strokeStyle = '#e2574c'; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(rect.x + 32, rect.y + 12); ctx.lineTo(rect.x + 44, rect.y + 24);
    ctx.moveTo(rect.x + 44, rect.y + 12); ctx.lineTo(rect.x + 32, rect.y + 24);
    ctx.stroke();
  } else {
    ctx.strokeStyle = INK.cream; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(rect.x + 32, rect.y + 18, 7, -0.9, 0.9); ctx.stroke();
    ctx.beginPath(); ctx.arc(rect.x + 32, rect.y + 18, 12, -0.9, 0.9); ctx.stroke();
  }
}

/** A customer's face, glad while patience lasts and grim as it runs out. */
function drawCustomerFace(ctx, cx, cy, s, patienceFraction) {
  ctx.fillStyle = patienceFraction > 0.5 ? '#f2c185' : patienceFraction > 0.25 ? '#e8a56b' : '#d97b5a';
  ctx.beginPath(); ctx.arc(cx, cy, s, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = INK.ink;
  ctx.beginPath(); ctx.arc(cx - s * 0.34, cy - s * 0.15, s * 0.09, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + s * 0.34, cy - s * 0.15, s * 0.09, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = INK.ink; ctx.lineWidth = s * 0.09;
  ctx.beginPath();
  if (patienceFraction > 0.5) ctx.arc(cx, cy + s * 0.18, s * 0.42, Math.PI * 0.15, Math.PI * 0.85);
  else if (patienceFraction > 0.25) { ctx.moveTo(cx - s * 0.3, cy + s * 0.42); ctx.lineTo(cx + s * 0.3, cy + s * 0.42); }
  else ctx.arc(cx, cy + s * 0.62, s * 0.34, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();
}

/** The order board: one paper ticket per waiting customer. */
function drawTickets(ctx, state, now) {
  for (let index = 0; index < 4; index += 1) {
    const rect = ticketRect(index);
    const ticket = state.tickets[index];
    if (ticket === undefined) {
      ctx.strokeStyle = 'rgba(253, 243, 216, 0.25)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 7]);
      roundRect(ctx, rect.x, rect.y, rect.width, rect.height, 12);
      ctx.stroke();
      ctx.setLineDash([]);
      label(ctx, 'waiting for a customer…', rect.x + rect.width / 2, rect.y + rect.height / 2, { size: 15, colour: 'rgba(253, 243, 216, 0.4)' });
      continue;
    }
    const recipe = recipeById(ticket.recipeId);
    const isTarget = ticket.id === state.targetId;
    ctx.fillStyle = INK.paper;
    roundRect(ctx, rect.x, rect.y, rect.width, rect.height, 12); ctx.fill();
    ctx.strokeStyle = isTarget ? INK.gold : 'rgba(44, 26, 14, 0.35)';
    ctx.lineWidth = isTarget ? 5 : 2;
    roundRect(ctx, rect.x, rect.y, rect.width, rect.height, 12); ctx.stroke();
    ctx.fillStyle = INK.red;
    ctx.beginPath(); ctx.arc(rect.x + rect.width / 2, rect.y + 9, 5, 0, Math.PI * 2); ctx.fill();
    const fraction = Math.max(0, ticket.patience / ticket.patienceMax);
    drawCustomerFace(ctx, rect.x + 34, rect.y + 42, 20, fraction);
    label(ctx, recipe.name, rect.x + 62, rect.y + 34, { size: 23, colour: INK.ink, align: 'left' });
    label(ctx, `$${recipe.price}`, rect.x + rect.width - 14, rect.y + 34, { size: 20, colour: INK.redDark, align: 'right' });
    if (isTarget) label(ctx, 'COOKING THIS', rect.x + 62, rect.y + 56, { size: 12, colour: INK.red, align: 'left' });
    const done = isTarget || state.plate.recipeId === ticket.recipeId ? state.plate.stepsDone.length : 0;
    recipe.steps.forEach((step, stepIndex) => {
      const cx = rect.x + 44 + stepIndex * 62;
      const cy = rect.y + 86;
      drawIngredientIcon(ctx, step.id, cx, cy, 19);
      if (stepIndex < done && state.plate.recipeId === ticket.recipeId) {
        ctx.fillStyle = INK.leaf;
        ctx.beginPath(); ctx.arc(cx + 15, cy - 15, 9, 0, Math.PI * 2); ctx.fill();
        label(ctx, '✓', cx + 15, cy - 14, { size: 12, colour: '#ffffff' });
      } else if (isTarget && stepIndex === done) {
        ctx.strokeStyle = INK.red;
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(cx, cy, 25 + Math.sin(now * 5) * 2, 0, Math.PI * 2); ctx.stroke();
      }
    });
    ctx.fillStyle = 'rgba(44, 26, 14, 0.15)';
    roundRect(ctx, rect.x + 12, rect.y + rect.height - 16, rect.width - 24, 8, 4); ctx.fill();
    ctx.fillStyle = fraction > 0.5 ? INK.leaf : fraction > 0.25 ? INK.gold : INK.red;
    roundRect(ctx, rect.x + 12, rect.y + rect.height - 16, (rect.width - 24) * fraction, 8, 4); ctx.fill();
  }
}

/** One cooking station: its slots, its fire, and the state of what cooks there. */
function drawStation(ctx, state, kind, now) {
  const rect = stationRect(kind);
  const isGrill = kind === 'grill';
  panel(ctx, rect, isGrill ? 'GRILL — pork & egg' : 'POT — beef & shrimp', isGrill ? '#e2703a' : INK.steel);
  for (let slotIndex = 0; slotIndex < 2; slotIndex += 1) {
    const slotRect = stationSlotRect(kind, slotIndex);
    const slot = state.stations[kind][slotIndex];
    ctx.fillStyle = isGrill ? '#241611' : '#39424a';
    roundRect(ctx, slotRect.x, slotRect.y, slotRect.width, slotRect.height, 12); ctx.fill();
    if (isGrill) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)'; ctx.lineWidth = 3;
      for (let line = 0; line < 4; line += 1) {
        ctx.beginPath();
        ctx.moveTo(slotRect.x + 12, slotRect.y + 26 + line * 24);
        ctx.lineTo(slotRect.x + slotRect.width - 12, slotRect.y + 26 + line * 24);
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = 'rgba(207, 232, 247, 0.25)';
      ctx.beginPath(); ctx.ellipse(slotRect.x + slotRect.width / 2, slotRect.y + 40, 44, 14, 0, 0, Math.PI * 2); ctx.fill();
    }
    if (slot === null) {
      label(ctx, 'empty', slotRect.x + slotRect.width / 2, slotRect.y + slotRect.height / 2, { size: 15, colour: 'rgba(255, 248, 231, 0.4)' });
      continue;
    }
    const ingredient = ingredientById(slot.ingredient);
    const cx = slotRect.x + slotRect.width / 2;
    if (slot.phase === 'burnt') {
      ctx.globalAlpha = 0.45;
      drawIngredientIcon(ctx, slot.ingredient, cx, slotRect.y + 52, 26);
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(120, 120, 120, 0.5)';
      ctx.beginPath(); ctx.arc(cx - 16, slotRect.y + 22, 10, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 12, slotRect.y + 14, 13, 0, Math.PI * 2); ctx.fill();
      label(ctx, 'BURNT — click to scrape', cx, slotRect.y + 96, { size: 13, colour: '#e2574c' });
      continue;
    }
    drawIngredientIcon(ctx, slot.ingredient, cx, slotRect.y + 52, 27);
    if (slot.phase === 'cooking') {
      const fraction = Math.min(1, slot.t / ingredient.cookSeconds);
      ctx.strokeStyle = 'rgba(255, 248, 231, 0.25)'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(cx, slotRect.y + 52, 40, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = INK.gold;
      ctx.beginPath(); ctx.arc(cx, slotRect.y + 52, 40, -Math.PI / 2, -Math.PI / 2 + fraction * Math.PI * 2); ctx.stroke();
      label(ctx, `${Math.ceil(ingredient.cookSeconds - slot.t)}s`, cx, slotRect.y + 100, { size: 14 });
    } else {
      const pulse = 0.6 + 0.4 * Math.sin(now * 6);
      ctx.strokeStyle = `rgba(242, 179, 61, ${pulse})`;
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(cx, slotRect.y + 52, 42, 0, Math.PI * 2); ctx.stroke();
      label(ctx, 'READY! click it', cx, slotRect.y + 100, { size: 15, colour: INK.gold });
      const left = Math.max(0, 1 - slot.t / 6);
      ctx.fillStyle = left > 0.35 ? INK.gold : INK.red;
      ctx.fillRect(slotRect.x + 14, slotRect.y + slotRect.height - 8, (slotRect.width - 28) * left, 4);
    }
  }
}

/** The plate on the counter and the dish it is becoming, layer by layer. */
function drawPlate(ctx, state, now) {
  panel(ctx, PLATE_PANEL, 'YOUR PLATE', INK.gold);
  const recipe = plateRecipe(state) ?? (targetTicket(state) === null ? null : recipeById(targetTicket(state).recipeId));
  const { x: cx, y: cy, radius } = PLATE_CENTRE;
  const shakeX = state.shake > 0 ? Math.sin(now * 70) * state.shake * 14 : 0;
  ctx.save();
  ctx.translate(shakeX, 0);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath(); ctx.ellipse(cx, cy + 10, radius + 12, radius * 0.92, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = INK.cream;
  ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#d9c9a3'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(cx, cy, radius - 12, 0, Math.PI * 2); ctx.stroke();
  const spots = [[-32, -20], [32, -20], [-32, 26], [32, 26], [0, 2]];
  state.plate.stepsDone.forEach((ingredientId, index) => {
    const [dx, dy] = spots[index % spots.length];
    drawIngredientIcon(ctx, ingredientId, cx + dx, cy + dy, 25);
  });
  if (state.plate.stepsDone.length === 0) {
    label(ctx, 'click a bin below', cx, cy - 8, { size: 16, colour: 'rgba(44, 26, 14, 0.45)' });
    label(ctx, 'to start the dish', cx, cy + 16, { size: 16, colour: 'rgba(44, 26, 14, 0.45)' });
  }
  ctx.restore();
  if (recipe !== null) {
    label(ctx, recipe.name, PLATE_PANEL.x + PLATE_PANEL.width - 18, PLATE_PANEL.y + 26, { size: 21, colour: INK.gold, align: 'right' });
    if (plateComplete(state)) {
      ctx.fillStyle = INK.leafDark;
      roundRect(ctx, cx - 86, cy + radius - 18, 172, 26, 13); ctx.fill();
      label(ctx, 'READY TO SERVE!', cx, cy + radius - 4, { size: 15, colour: '#ffffff' });
    }
  }
  const serve = SERVE_BUTTON;
  const ready = plateComplete(state);
  ctx.fillStyle = ready ? INK.leaf : 'rgba(77, 155, 71, 0.35)';
  roundRect(ctx, serve.x, serve.y, serve.width, serve.height, 10); ctx.fill();
  label(ctx, 'SERVE  (Space)', serve.x + serve.width / 2, serve.y + serve.height / 2, { size: 19, colour: '#ffffff' });
  const trash = TRASH_BUTTON;
  ctx.fillStyle = 'rgba(201, 58, 46, 0.75)';
  roundRect(ctx, trash.x, trash.y, trash.width, trash.height, 10); ctx.fill();
  label(ctx, 'TRASH PLATE', trash.x + trash.width / 2, trash.y + trash.height / 2, { size: 19, colour: '#ffffff' });
}

/** The checklist under the plate: every step of the dish, ticked as it lands. */
function drawChecklist(ctx, state, now) {
  panel(ctx, CHECKLIST_PANEL, null);
  const ticket = targetTicket(state);
  const recipe = plateRecipe(state) ?? (ticket === null ? null : recipeById(ticket.recipeId));
  if (recipe === null) {
    label(ctx, 'Pick an order ticket above, then build its dish step by step.', CHECKLIST_PANEL.x + CHECKLIST_PANEL.width / 2, CHECKLIST_PANEL.y + 44, { size: 17, colour: INK.paperShade });
    drawMessage(ctx, state);
    return;
  }
  label(ctx, `CHECKLIST — ${recipe.name}`, CHECKLIST_PANEL.x + 18, CHECKLIST_PANEL.y + 22, { size: 15, colour: INK.gold, align: 'left' });
  recipe.steps.forEach((step, index) => {
    const chipX = CHECKLIST_PANEL.x + 16 + index * 108;
    const chipY = CHECKLIST_PANEL.y + 38;
    const done = index < state.plate.stepsDone.length;
    const isNext = index === state.plate.stepsDone.length;
    ctx.fillStyle = done ? 'rgba(77, 155, 71, 0.4)' : 'rgba(255, 248, 231, 0.1)';
    roundRect(ctx, chipX, chipY, 100, 52, 9); ctx.fill();
    if (isNext) {
      ctx.strokeStyle = INK.gold; ctx.lineWidth = 2.5 + Math.sin(now * 5);
      roundRect(ctx, chipX, chipY, 100, 52, 9); ctx.stroke();
    }
    drawIngredientIcon(ctx, step.id, chipX + 24, chipY + 26, 15);
    label(ctx, done ? '✓ done' : step.via === 'bin' ? 'from bin' : step.via === 'grill' ? 'grill it' : 'pot it', chipX + 64, chipY + 26, { size: 13, colour: done ? '#bfe3ba' : INK.cream });
  });
  drawMessage(ctx, state, recipe);
}

/** The freshest line of kitchen talk, or the hint for the next step. */
function drawMessage(ctx, state, recipe = null) {
  const y = CHECKLIST_PANEL.y + CHECKLIST_PANEL.height - 18;
  if (state.messageAge < 2.4 && state.message !== '') {
    label(ctx, state.message, CHECKLIST_PANEL.x + CHECKLIST_PANEL.width / 2, y, { size: 16, colour: INK.gold });
    return;
  }
  if (recipe !== null && !plateComplete(state)) {
    const step = nextStep(state);
    if (step !== null) {
      const ingredient = ingredientById(step.id);
      const hint = step.via === 'bin'
        ? `Next: ${ingredient.name} — click its bin`
        : `Next: ${ingredient.name} — start it on the ${step.via}, click when it dings`;
      label(ctx, hint, CHECKLIST_PANEL.x + CHECKLIST_PANEL.width / 2, y, { size: 14, colour: INK.paperShade });
    }
  }
}

/** The pass: cooked items waiting for the plate that will call for them. */
function drawShelf(ctx, state) {
  panel(ctx, SHELF_PANEL, 'THE PASS — cooked & ready', INK.steel);
  for (let index = 0; index < 4; index += 1) {
    const rect = shelfSlotRect(index);
    const ingredientId = state.shelf[index];
    ctx.fillStyle = 'rgba(255, 248, 231, 0.07)';
    roundRect(ctx, rect.x, rect.y, rect.width, rect.height, 12); ctx.fill();
    if (ingredientId === undefined) {
      ctx.strokeStyle = 'rgba(255, 248, 231, 0.25)';
      ctx.setLineDash([6, 6]);
      roundRect(ctx, rect.x, rect.y, rect.width, rect.height, 12); ctx.stroke();
      ctx.setLineDash([]);
    } else {
      const ingredient = ingredientById(ingredientId);
      drawIngredientIcon(ctx, ingredientId, rect.x + rect.width / 2, rect.y + 38, 24);
      label(ctx, ingredient.name.split(' ')[0], rect.x + rect.width / 2, rect.y + 76, { size: 13 });
    }
  }
  label(ctx, 'cook ahead, then click a dish in when its step comes up', SHELF_PANEL.x + SHELF_PANEL.width / 2, SHELF_PANEL.y + SHELF_PANEL.height - 16, { size: 13, colour: INK.paperShade });
}

/** The day's book: money, tallies, best streak, and the day bar with its rush. */
function drawTally(ctx, state) {
  panel(ctx, TALLY_PANEL, 'TODAY AT THE STALL', INK.gold);
  const x = TALLY_PANEL.x + 22;
  label(ctx, `$${state.money} earned`, x, TALLY_PANEL.y + 62, { size: 30, colour: INK.gold, align: 'left' });
  label(ctx, `dishes served: ${state.served}`, x, TALLY_PANEL.y + 100, { size: 17, align: 'left' });
  label(ctx, `customers lost: ${state.lost}`, x + 220, TALLY_PANEL.y + 100, { size: 17, align: 'left', colour: state.lost > 0 ? '#e2574c' : INK.cream });
  label(ctx, `best combo: ×${state.bestCombo}`, x, TALLY_PANEL.y + 128, { size: 17, align: 'left' });
  const barX = x;
  const barW = TALLY_PANEL.width - 44;
  const barY = TALLY_PANEL.y + 152;
  ctx.fillStyle = 'rgba(255, 248, 231, 0.15)';
  roundRect(ctx, barX, barY, barW, 14, 7); ctx.fill();
  ctx.fillStyle = 'rgba(201, 58, 46, 0.55)';
  ctx.fillRect(barX + barW * (RUSH_START / DAY_LENGTH), barY, barW * ((RUSH_END - RUSH_START) / DAY_LENGTH), 14);
  ctx.fillStyle = INK.gold;
  roundRect(ctx, barX, barY, barW * Math.min(1, state.elapsed / DAY_LENGTH), 14, 7); ctx.fill();
  label(ctx, 'day', barX, barY + 26, { size: 12, align: 'left', colour: INK.paperShade });
  label(ctx, 'rush', barX + barW * ((RUSH_START + RUSH_END) / 2 / DAY_LENGTH), barY + 26, { size: 12, colour: '#e2574c' });
}

/** The counter of ingredient bins, each labelled, the wanted one lit. */
function drawBins(ctx, state, now) {
  const step = nextStep(state);
  INGREDIENTS.forEach((ingredient, index) => {
    const rect = binRect(index);
    const wanted = step !== null && step.id === ingredient.id;
    ctx.fillStyle = wanted ? 'rgba(242, 179, 61, 0.3)' : 'rgba(0, 0, 0, 0.32)';
    roundRect(ctx, rect.x, rect.y, rect.width, rect.height, 10); ctx.fill();
    ctx.strokeStyle = wanted ? INK.gold : 'rgba(255, 248, 231, 0.22)';
    ctx.lineWidth = wanted ? 3 : 1.5;
    roundRect(ctx, rect.x, rect.y, rect.width, rect.height, 10); ctx.stroke();
    drawIngredientIcon(ctx, ingredient.id, rect.x + 30, rect.y + 39, 21);
    label(ctx, ingredient.binName ?? ingredient.name, rect.x + 58, rect.y + 32, { size: 14.5, align: 'left' });
    if (ingredient.station !== null) {
      label(ctx, ingredient.station === 'grill' ? '→ GRILL' : '→ POT', rect.x + 58, rect.y + 54, { size: 12, colour: '#e8a56b', align: 'left' });
    } else if (wanted) {
      label(ctx, 'click me next!', rect.x + 58, rect.y + 54, { size: 12, colour: INK.gold, align: 'left' });
    }
  });
}

/** Floating score talk that rises off the order board and fades. */
function drawFloaters(ctx, state) {
  for (const floater of state.floaters) {
    const alpha = Math.max(0, 1 - floater.age / 1.4);
    ctx.globalAlpha = alpha;
    label(ctx, floater.text, floater.x, floater.y - floater.age * 34, { size: 24, colour: floater.colour });
    ctx.globalAlpha = 1;
  }
}

/** A five-pointed star, filled or hollow, for the end-of-day grade. */
function drawStar(ctx, cx, cy, s, filled) {
  ctx.beginPath();
  for (let point = 0; point < 10; point += 1) {
    const radius = point % 2 === 0 ? s : s * 0.45;
    const angle = -Math.PI / 2 + point * Math.PI / 5;
    const px = cx + Math.cos(angle) * radius;
    const py = cy + Math.sin(angle) * radius;
    if (point === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  if (filled) {
    ctx.fillStyle = INK.gold;
    ctx.fill();
  }
  ctx.strokeStyle = INK.gold;
  ctx.lineWidth = 2;
  ctx.stroke();
}

/** The title card: the menu, the rules of the rush, and the way in. */
function drawTitle(ctx, state) {
  ctx.fillStyle = 'rgba(24, 12, 4, 0.82)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  label(ctx, 'SAIGON SIZZLE', 640, 108, { size: 64, colour: INK.gold });
  label(ctx, 'a Vietnamese street-food kitchen rush', 640, 152, { size: 22, colour: INK.paperShade });
  label(ctx, 'ON THE MENU', 640, 208, { size: 17, colour: INK.red });
  RECIPES.forEach((recipe, index) => {
    const y = 244 + index * 40;
    label(ctx, `${recipe.name} — ${recipe.blurb}`, 440, y, { size: 19, align: 'left' });
    label(ctx, `$${recipe.price}`, 860, y, { size: 19, colour: INK.gold, align: 'right' });
  });
  label(ctx, 'HOW TO PLAY', 640, 472, { size: 17, colour: INK.red });
  const lines = [
    'Click an order ticket, then click ingredient bins in the recipe order to build the plate.',
    'Pork and egg cook on the grill, beef and shrimp in the pot — click them again when they ding,',
    'before they burn. Serve finished plates for the price plus a tip for happy customers.',
    'Keep the streak alive for combo bonuses. Space serves, T trashes the plate, P pauses.',
  ];
  lines.forEach((line, index) => label(ctx, line, 640, 502 + index * 26, { size: 17, colour: INK.cream, weight: 400 }));
  const button = START_BUTTON;
  ctx.fillStyle = INK.red;
  roundRect(ctx, button.x, button.y, button.width, button.height, 14); ctx.fill();
  label(ctx, 'START THE DAY', button.x + button.width / 2, button.y + button.height / 2, { size: 26, colour: '#ffffff' });
  void state;
}

/** The end-of-day card: the grade, the book, and the way back in. */
function drawEnd(ctx, state) {
  ctx.fillStyle = 'rgba(24, 12, 4, 0.88)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.fillStyle = INK.night;
  roundRect(ctx, 330, 66, 620, 640, 20); ctx.fill();
  ctx.strokeStyle = INK.gold; ctx.lineWidth = 2.5;
  roundRect(ctx, 330, 66, 620, 640, 20); ctx.stroke();
  label(ctx, 'DAY OVER', 640, 120, { size: 54, colour: INK.gold });
  for (let star = 0; star < 3; star += 1) drawStar(ctx, 560 + star * 80, 196, 34, star < state.stars);
  label(ctx, state.stars === 3 ? 'A legendary service!' : state.stars === 2 ? 'A solid day at the stall.' : 'The stall survives to cook again.', 640, 262, { size: 20, colour: INK.paperShade });
  const rows = [
    ['Money earned', `$${state.money}`],
    ['Dishes served', `${state.served}`],
    ['Customers lost', `${state.lost}`],
    ['Best combo', `×${state.bestCombo}`],
  ];
  rows.forEach(([name, value], index) => {
    const y = 330 + index * 52;
    label(ctx, name, 470, y, { size: 23, align: 'left' });
    label(ctx, value, 810, y, { size: 23, colour: INK.gold, align: 'right' });
  });
  const button = AGAIN_BUTTON;
  ctx.fillStyle = INK.red;
  roundRect(ctx, button.x, button.y, button.width, button.height, 14); ctx.fill();
  label(ctx, 'PLAY AGAIN', button.x + button.width / 2, button.y + button.height / 2, { size: 25, colour: '#ffffff' });
}

/** Paint the whole game for this instant: room, board, kitchen, talk, overlays. */
export function drawGame(ctx, state, now) {
  drawRoom(ctx);
  drawHud(ctx, state);
  drawTickets(ctx, state, now);
  drawStation(ctx, state, 'grill', now);
  drawStation(ctx, state, 'pot', now);
  drawPlate(ctx, state, now);
  drawChecklist(ctx, state, now);
  drawShelf(ctx, state);
  drawTally(ctx, state);
  drawBins(ctx, state, now);
  drawFloaters(ctx, state);
  if (state.screen === 'title') drawTitle(ctx, state);
  if (state.screen === 'end') drawEnd(ctx, state);
  if (state.paused && state.screen === 'play') {
    ctx.fillStyle = 'rgba(24, 12, 4, 0.6)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    label(ctx, 'PAUSED', 640, 380, { size: 52, colour: INK.gold });
    label(ctx, 'press P to get back to the fire', 640, 430, { size: 20, colour: INK.paperShade });
  }
}
