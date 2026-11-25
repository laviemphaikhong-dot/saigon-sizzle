// Saigon Sizzle — every pixel of the kitchen: the order board, the stations, the
// plate, the pass and the counter, drawn with canvas shapes alone. The look is a
// bright, glossy cartoon kitchen in the spirit of a co-op cooking game: cream and
// terracotta tiles under a warm light, chunky wooden counters, paper tickets held
// by red pins, and food drawn with shade, shine and steam. Nothing here changes
// the game; it reads state.js and paints it, and its ingredient icons are the one
// drawing every other surface (tickets, bins, plate, pass) shares.

import {
  AGAIN_BUTTON, CHECKLIST_PANEL, DAY_LENGTH, FIELD, HUD, INK, MUTE_BUTTON,
  PLATE_CENTRE, PLATE_PANEL, PAUSE_BUTTON, RUSH_END, RUSH_START, SERVE_BUTTON,
  SHELF_PANEL, START_BUTTON, TALLY_PANEL, TRASH_BUTTON, binRect, shelfSlotRect,
  stationRect, stationSlotRect, ticketRect,
} from './config.js';
import { INGREDIENTS, RECIPES, ingredientById, recipeById } from './recipes.js';
import { inRush, nextStep, plateComplete, plateRecipe, targetTicket, timeLeft } from './state.js';

/* The style system: one deep warm-brown outline for everything, a saturated warm
   palette, soft drop shadows, and a glossy highlight wherever light would catch. */
const OUTLINE = '#4a2410';
const PAPER = '#fff6dc';
const PAPER_DEEP = '#f6df9f';
const WOOD_LIGHT = '#c07f3e';
const WOOD = '#9c6227';
const WOOD_DEEP = '#77481a';
const GOLD = '#f6b93b';
const GOLD_DEEP = '#dd8f16';
const RED = '#e0483a';
const RED_DEEP = '#b02a1e';
const LEAF = '#5cb84e';
const LEAF_DEEP = '#3c7a34';
const SKIN = '#ffc98f';
const FONT = '"Avenir Next", "Segoe UI", system-ui, sans-serif';

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

/** Fill a rounded rectangle in one call. */
function fillRound(ctx, x, y, width, height, radius, style) {
  ctx.fillStyle = style;
  roundRect(ctx, x, y, width, height, radius);
  ctx.fill();
}

/** Stroke a rounded rectangle in one call. */
function strokeRound(ctx, x, y, width, height, radius, style, lineWidth) {
  ctx.strokeStyle = style;
  ctx.lineWidth = lineWidth;
  roundRect(ctx, x, y, width, height, radius);
  ctx.stroke();
}

/** A vertical gradient from (y) to (y + height) through [at, colour] stops. */
function vGrad(ctx, y, height, stops) {
  const gradient = ctx.createLinearGradient(0, y, 0, y + height);
  for (const [at, colour] of stops) gradient.addColorStop(at, colour);
  return gradient;
}

/** Run a drawing step under a soft warm drop shadow, then put the shadow away. */
function shadowed(ctx, blur, drop, draw) {
  ctx.save();
  ctx.shadowColor = 'rgba(46, 20, 2, 0.42)';
  ctx.shadowBlur = blur;
  ctx.shadowOffsetY = drop;
  draw();
  ctx.restore();
}

/** A deterministic 0..1 hash, so decoration never flickers between frames. */
function hash01(n) {
  const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
}

/** One line of text with the kitchen's defaults: bold, warm, centred where asked. */
function label(ctx, text, x, y, { size = 16, colour = INK.cream, align = 'center', weight = 700, shadow = false } = {}) {
  ctx.save();
  if (shadow) {
    ctx.shadowColor = 'rgba(40, 18, 0, 0.5)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetY = 2;
  }
  ctx.fillStyle = colour;
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
  ctx.restore();
}

/** A four-point sparkle star, the kitchen's smallest celebration. */
function drawSparkle(ctx, x, y, s, colour, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(x, y - s);
  ctx.quadraticCurveTo(x, y, x + s, y);
  ctx.quadraticCurveTo(x, y, x, y + s);
  ctx.quadraticCurveTo(x, y, x - s, y);
  ctx.quadraticCurveTo(x, y, x, y - s);
  ctx.fill();
  ctx.restore();
}

/** A small white gloss blob, the shine on yolks, broth, glass and steel. */
function gloss(ctx, x, y, rx, ry, alpha = 0.5) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Rising steam: three soft curls that sway as they climb. */
function drawSteam(ctx, x, y, scale, phase) {
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i += 1) {
    const bx = x + (i - 1) * 14 * scale;
    const sway = Math.sin(phase + i * 1.9) * 4 * scale;
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.34 + 0.14 * Math.sin(phase * 1.3 + i * 2.2)})`;
    ctx.lineWidth = 3.4 * scale;
    ctx.beginPath();
    ctx.moveTo(bx, y);
    ctx.bezierCurveTo(bx + sway, y - 11 * scale, bx - sway, y - 22 * scale, bx + sway * 0.6, y - 33 * scale);
    ctx.stroke();
  }
  ctx.restore();
}

/** One gold coin with a darker rim and a bright face. */
function drawCoin(ctx, x, y, r) {
  ctx.fillStyle = GOLD_DEEP;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = GOLD;
  ctx.beginPath(); ctx.arc(x, y, r * 0.74, 0, Math.PI * 2); ctx.fill();
  gloss(ctx, x - r * 0.3, y - r * 0.34, r * 0.26, r * 0.15, 0.65);
}

/**
 * A chunky game button: a dark bottom edge the face sits on, a glossy top half,
 * the kitchen outline, and bold text. `rect` is the same rect input hit-tests.
 */
function chunkyButton(ctx, rect, faceTop, faceBottom, text, { size = 19, dim = false } = {}) {
  ctx.save();
  if (dim) ctx.globalAlpha = 0.55;
  fillRound(ctx, rect.x, rect.y + 5, rect.width, rect.height, 12, 'rgba(30, 14, 2, 0.55)');
  fillRound(ctx, rect.x, rect.y, rect.width, rect.height, 12, vGrad(ctx, rect.y, rect.height, [[0, faceTop], [1, faceBottom]]));
  fillRound(ctx, rect.x + 4, rect.y + 4, rect.width - 8, rect.height * 0.42, 9, 'rgba(255, 255, 255, 0.22)');
  strokeRound(ctx, rect.x, rect.y, rect.width, rect.height, 12, OUTLINE, 3);
  label(ctx, text, rect.x + rect.width / 2, rect.y + rect.height / 2 + 1, { size, colour: '#ffffff', shadow: true });
  ctx.restore();
}

/**
 * A wooden counter block, the kitchen's standard furniture: warm planks with a
 * lit top edge, the one outline, a soft shadow, and a title in the top corner.
 */
function counterPanel(ctx, rect, title, accent = GOLD) {
  shadowed(ctx, 12, 5, () => {
    fillRound(ctx, rect.x, rect.y, rect.width, rect.height, 16, vGrad(ctx, rect.y, rect.height, [[0, WOOD_LIGHT], [0.5, WOOD], [1, WOOD_DEEP]]));
  });
  ctx.save();
  roundRect(ctx, rect.x, rect.y, rect.width, rect.height, 16);
  ctx.clip();
  ctx.fillStyle = 'rgba(255, 226, 170, 0.20)';
  ctx.fillRect(rect.x, rect.y, rect.width, 7);
  ctx.strokeStyle = 'rgba(60, 30, 6, 0.25)';
  ctx.lineWidth = 2;
  for (let px = rect.x + 64; px < rect.x + rect.width - 8; px += 128) {
    ctx.beginPath(); ctx.moveTo(px, rect.y + 6); ctx.lineTo(px, rect.y + rect.height - 6); ctx.stroke();
  }
  ctx.restore();
  strokeRound(ctx, rect.x, rect.y, rect.width, rect.height, 16, OUTLINE, 3);
  if (title !== null) {
    label(ctx, title, rect.x + 18, rect.y + 24, { size: 17, colour: '#ffe9b0', align: 'left', shadow: true });
    ctx.fillStyle = accent;
    ctx.fillRect(rect.x + 18, rect.y + 36, 44, 4);
  }
}

/** The room itself: a checkered tile floor under warm light, a wooden counter front. */
function drawRoom(ctx) {
  const tile = 64;
  for (let row = 0; row * tile < FIELD.height; row += 1) {
    for (let col = 0; col * tile < FIELD.width; col += 1) {
      ctx.fillStyle = (row + col) % 2 === 0 ? '#f6ddab' : '#eda96f';
      ctx.fillRect(col * tile, row * tile, tile, tile);
    }
  }
  ctx.fillStyle = vGrad(ctx, 596, FIELD.height - 596, [[0, WOOD_LIGHT], [0.25, WOOD], [1, WOOD_DEEP]]);
  ctx.fillRect(0, 596, FIELD.width, FIELD.height - 596);
  ctx.fillStyle = 'rgba(255, 226, 170, 0.5)';
  ctx.fillRect(0, 596, FIELD.width, 5);
  ctx.strokeStyle = 'rgba(60, 30, 6, 0.3)';
  ctx.lineWidth = 2;
  for (let px = 96; px < FIELD.width; px += 160) {
    ctx.beginPath(); ctx.moveTo(px, 604); ctx.lineTo(px, FIELD.height); ctx.stroke();
  }
  const light = ctx.createRadialGradient(640, 340, 120, 640, 340, 760);
  light.addColorStop(0, 'rgba(255, 196, 96, 0.20)');
  light.addColorStop(0.65, 'rgba(255, 170, 80, 0.05)');
  light.addColorStop(1, 'rgba(84, 34, 4, 0.30)');
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
}

/**
 * The one drawing of an ingredient, used on bins, tickets, the plate, the stations
 * and the pass. (cx, cy) is its centre and s its half-size. Every icon is shaded,
 * outlined in the one brown, and given a gloss where light would catch it.
 */
export function drawIngredientIcon(ctx, id, cx, cy, s) {
  const ingredient = ingredientById(id);
  if (ingredient === undefined) return;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.lineJoin = 'round';
  switch (id) {
    case 'noodles': {
      // A phở bowl: red lacquer outside, golden broth, a swirled noodle mound.
      ctx.beginPath();
      ctx.moveTo(-s * 0.98, -s * 0.08);
      ctx.quadraticCurveTo(0, s * 0.95, s * 0.98, -s * 0.08);
      ctx.closePath();
      ctx.fillStyle = vGrad(ctx, -s * 0.1, s, [[0, '#e0483a'], [1, '#a8231a']]);
      ctx.fill();
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = s * 0.07; ctx.stroke();
      ctx.fillStyle = '#fff6dc';
      ctx.beginPath(); ctx.ellipse(0, -s * 0.08, s * 0.98, s * 0.2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e8a54b';
      ctx.beginPath(); ctx.ellipse(0, -s * 0.1, s * 0.86, s * 0.16, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f9efc6';
      ctx.beginPath(); ctx.ellipse(0, -s * 0.24, s * 0.68, s * 0.3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#dfc384'; ctx.lineWidth = s * 0.09;
      for (const [ox, oy, r] of [[-0.3, -0.26, 0.2], [0.22, -0.3, 0.24], [0, -0.14, 0.18]]) {
        ctx.beginPath(); ctx.arc(ox * s, oy * s, r * s, Math.PI * 0.15, Math.PI * 1.5); ctx.stroke();
      }
      ctx.fillStyle = LEAF;
      ctx.beginPath(); ctx.ellipse(-s * 0.42, -s * 0.3, s * 0.14, s * 0.07, 0.6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(s * 0.44, -s * 0.2, s * 0.12, s * 0.06, -0.5, 0, Math.PI * 2); ctx.fill();
      gloss(ctx, -s * 0.5, s * 0.3, s * 0.22, s * 0.1, 0.35);
      break;
    }
    case 'broth': {
      // A steel ladle brimming with amber broth.
      ctx.strokeStyle = '#7d8891'; ctx.lineWidth = s * 0.2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(s * 0.34, -s * 0.24); ctx.lineTo(s * 0.92, -s * 0.82); ctx.stroke();
      ctx.strokeStyle = '#c3ccd2'; ctx.lineWidth = s * 0.09;
      ctx.beginPath(); ctx.moveTo(s * 0.38, -s * 0.3); ctx.lineTo(s * 0.86, -s * 0.78); ctx.stroke();
      ctx.fillStyle = vGrad(ctx, -s * 0.5, s * 1.2, [[0, '#cfd8de'], [1, '#8d99a3']]);
      ctx.beginPath(); ctx.arc(0, s * 0.14, s * 0.64, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = s * 0.06;
      ctx.beginPath(); ctx.arc(0, s * 0.14, s * 0.64, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#e09a44';
      ctx.beginPath(); ctx.ellipse(0, s * 0.02, s * 0.47, s * 0.34, 0, 0, Math.PI * 2); ctx.fill();
      gloss(ctx, -s * 0.16, -s * 0.06, s * 0.16, s * 0.08, 0.55);
      break;
    }
    case 'beef': {
      // Three beef slices with sear marks, a fat streak and a glisten.
      for (let i = -1; i <= 1; i += 1) {
        const y = -s * 0.55 + i * s * 0.44;
        fillRound(ctx, -s * 0.85 + i * s * 0.1, y, s * 1.55, s * 0.44, s * 0.2,
          vGrad(ctx, y, s * 0.44, [[0, '#cd5a4a'], [1, '#a03428']]));
        strokeRound(ctx, -s * 0.85 + i * s * 0.1, y, s * 1.55, s * 0.44, s * 0.2, 'rgba(74, 36, 16, 0.6)', s * 0.05);
        ctx.strokeStyle = '#6e1f16'; ctx.lineWidth = s * 0.08; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-s * 0.5 + i * s * 0.1, y + s * 0.13); ctx.lineTo(-s * 0.28 + i * s * 0.1, y + s * 0.31);
        ctx.moveTo(s * 0.05 + i * s * 0.1, y + s * 0.13); ctx.lineTo(s * 0.27 + i * s * 0.1, y + s * 0.31);
        ctx.stroke();
      }
      ctx.strokeStyle = '#f3d9c8'; ctx.lineWidth = s * 0.09;
      ctx.beginPath(); ctx.moveTo(-s * 0.62, -s * 0.34); ctx.lineTo(s * 0.42, -s * 0.34); ctx.stroke();
      gloss(ctx, -s * 0.3, -s * 0.42, s * 0.26, s * 0.08, 0.4);
      break;
    }
    case 'baguette': {
      // A golden baguette with pale score slashes across the crust.
      ctx.save();
      ctx.rotate(-0.5);
      ctx.fillStyle = vGrad(ctx, -s * 0.45, s * 0.9, [[0, '#f0c078'], [0.55, '#dfa050'], [1, '#b97a2e']]);
      ctx.beginPath(); ctx.ellipse(0, 0, s * 1.06, s * 0.44, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(122, 72, 20, 0.75)'; ctx.lineWidth = s * 0.06;
      ctx.beginPath(); ctx.ellipse(0, 0, s * 1.06, s * 0.44, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#fbe3ae'; ctx.lineWidth = s * 0.13; ctx.lineCap = 'round';
      for (let i = -1; i <= 1; i += 1) {
        ctx.beginPath(); ctx.moveTo(i * s * 0.46 - s * 0.15, -s * 0.2); ctx.lineTo(i * s * 0.46 + s * 0.15, s * 0.04); ctx.stroke();
      }
      gloss(ctx, -s * 0.3, -s * 0.24, s * 0.3, s * 0.09, 0.4);
      ctx.restore();
      break;
    }
    case 'pate': {
      // A pâté block with a lighter top face and a glossy cut side.
      fillRound(ctx, -s * 0.82, -s * 0.48, s * 1.64, s * 0.98, s * 0.16,
        vGrad(ctx, -s * 0.48, s, [[0, '#a4714a'], [1, '#7c4f2c']]));
      fillRound(ctx, -s * 0.82, -s * 0.48, s * 1.64, s * 0.34, s * 0.16, '#c08b58');
      strokeRound(ctx, -s * 0.82, -s * 0.48, s * 1.64, s * 0.98, s * 0.16, OUTLINE, s * 0.06);
      gloss(ctx, -s * 0.35, s * 0.12, s * 0.3, s * 0.09, 0.3);
      break;
    }
    case 'pork': {
      // A grilled pork cut: pink shading, char lines and a glisten of fat.
      ctx.fillStyle = vGrad(ctx, -s * 0.7, s * 1.4, [[0, '#f2a7ba'], [0.6, '#e58aa0'], [1, '#cf6d8a']]);
      ctx.beginPath(); ctx.ellipse(0, 0, s * 0.96, s * 0.7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = s * 0.06;
      ctx.beginPath(); ctx.ellipse(0, 0, s * 0.96, s * 0.7, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = 'rgba(94, 40, 18, 0.8)'; ctx.lineWidth = s * 0.1; ctx.lineCap = 'round';
      for (const dx of [-0.45, 0, 0.45]) {
        ctx.beginPath(); ctx.moveTo(dx * s - s * 0.12, -s * 0.42); ctx.lineTo(dx * s + s * 0.12, s * 0.42); ctx.stroke();
      }
      ctx.fillStyle = '#fdf6dd';
      ctx.beginPath(); ctx.arc(s * 0.36, -s * 0.05, s * 0.19, 0, Math.PI * 2); ctx.fill();
      gloss(ctx, -s * 0.34, -s * 0.36, s * 0.26, s * 0.11, 0.55);
      break;
    }
    case 'shrimp': {
      // A curled shrimp with segment bands, a tail fan and one dark eye.
      ctx.strokeStyle = ingredient.colour; ctx.lineWidth = s * 0.54; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(0, 0, s * 0.55, Math.PI * 0.7, Math.PI * 1.95); ctx.stroke();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'; ctx.lineWidth = s * 0.16;
      ctx.beginPath(); ctx.arc(0, 0, s * 0.62, Math.PI * 0.85, Math.PI * 1.3); ctx.stroke();
      ctx.strokeStyle = ingredient.accent; ctx.lineWidth = s * 0.1;
      for (const a of [0.98, 1.38, 1.78]) {
        ctx.beginPath(); ctx.arc(0, 0, s * 0.55, Math.PI * a, Math.PI * (a + 0.14)); ctx.stroke();
      }
      ctx.strokeStyle = ingredient.accent; ctx.lineWidth = s * 0.12;
      ctx.beginPath();
      ctx.moveTo(s * 0.5, s * 0.42); ctx.lineTo(s * 0.86, s * 0.62);
      ctx.moveTo(s * 0.5, s * 0.42); ctx.lineTo(s * 0.62, s * 0.78);
      ctx.stroke();
      ctx.fillStyle = OUTLINE;
      ctx.beginPath(); ctx.arc(-s * 0.52, s * 0.18, s * 0.09, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'ricepaper': {
      // A translucent rice-paper disc with its woven rings.
      ctx.fillStyle = 'rgba(250, 246, 233, 0.92)';
      ctx.beginPath(); ctx.arc(0, 0, s * 0.92, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = ingredient.accent; ctx.lineWidth = s * 0.07;
      ctx.beginPath(); ctx.arc(0, 0, s * 0.92, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, s * 0.58, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, s * 0.26, 0, Math.PI * 2); ctx.stroke();
      gloss(ctx, -s * 0.3, -s * 0.38, s * 0.3, s * 0.12, 0.6);
      break;
    }
    case 'rice': {
      // A mound of broken rice on a little plate, grains picked out on top.
      ctx.fillStyle = '#ddd3ba';
      ctx.beginPath(); ctx.ellipse(0, s * 0.44, s * 0.98, s * 0.26, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = vGrad(ctx, -s * 0.5, s, [[0, '#ffffff'], [1, '#e9e2cd']]);
      ctx.beginPath(); ctx.ellipse(0, s * 0.28, s * 0.92, s * 0.62, 0, Math.PI, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, s * 0.28, s * 0.92, s * 0.3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = 'rgba(120, 105, 70, 0.35)'; ctx.lineWidth = s * 0.04;
      for (const [dx, dy, rot] of [[-0.4, -0.2, 0.5], [0.08, -0.36, 1.2], [0.46, -0.16, 0.2], [-0.1, -0.08, 0.9], [0.3, 0.08, 0.4]]) {
        ctx.save(); ctx.translate(dx * s, dy * s); ctx.rotate(rot);
        ctx.beginPath(); ctx.ellipse(0, 0, s * 0.13, s * 0.06, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.restore();
      }
      break;
    }
    case 'egg': {
      // A fried egg: a wavy white and a yolk with a big glossy highlight.
      ctx.fillStyle = '#fffef8';
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.97, s * 0.74, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ddd2b2'; ctx.lineWidth = s * 0.06;
      ctx.beginPath(); ctx.ellipse(0, 0, s * 0.97, s * 0.74, 0.3, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = GOLD;
      ctx.beginPath(); ctx.arc(s * 0.08, 0, s * 0.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffc95e';
      ctx.beginPath(); ctx.arc(s * 0.02, -s * 0.06, s * 0.27, 0, Math.PI * 2); ctx.fill();
      gloss(ctx, -s * 0.04, -s * 0.16, s * 0.13, s * 0.08, 0.9);
      break;
    }
    case 'herbs': {
      // Three herb leaves with centre veins on one stem.
      ctx.strokeStyle = ingredient.accent; ctx.lineWidth = s * 0.1; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, s * 0.78); ctx.lineTo(0, s * 0.05); ctx.stroke();
      for (const angle of [-0.6, 0, 0.6]) {
        ctx.save(); ctx.rotate(angle);
        ctx.fillStyle = vGrad(ctx, -s * 0.95, s * 1.1, [[0, '#6cc263'], [1, '#43913c']]);
        ctx.beginPath(); ctx.ellipse(0, -s * 0.32, s * 0.3, s * 0.62, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = LEAF_DEEP; ctx.lineWidth = s * 0.05;
        ctx.beginPath(); ctx.ellipse(0, -s * 0.32, s * 0.3, s * 0.62, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = '#9ad68f'; ctx.lineWidth = s * 0.06;
        ctx.beginPath(); ctx.moveTo(0, s * 0.22); ctx.lineTo(0, -s * 0.82); ctx.stroke();
        ctx.restore();
      }
      break;
    }
    case 'pickles': {
      // Carrot sticks with ridges, and two cucumber rounds with seeds.
      ctx.fillStyle = vGrad(ctx, -s * 0.7, s * 1.4, [[0, '#f59a4e'], [1, '#dd742a']]);
      for (let i = -1; i <= 1; i += 1) {
        fillRound(ctx, i * s * 0.5 - s * 0.13, -s * 0.7, s * 0.26, s * 1.3, s * 0.12, ctx.fillStyle);
        ctx.strokeStyle = 'rgba(150, 70, 10, 0.5)'; ctx.lineWidth = s * 0.05;
        ctx.beginPath(); ctx.moveTo(i * s * 0.5 - s * 0.08, -s * 0.3); ctx.lineTo(i * s * 0.5 + s * 0.08, -s * 0.3); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(i * s * 0.5 - s * 0.08, s * 0.15); ctx.lineTo(i * s * 0.5 + s * 0.08, s * 0.15); ctx.stroke();
      }
      for (const [dx, dy, r] of [[0.58, 0.52, 0.3], [-0.6, 0.55, 0.26]]) {
        ctx.fillStyle = '#4d9b47';
        ctx.beginPath(); ctx.arc(dx * s, dy * s, r * s, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#cdeabd';
        ctx.beginPath(); ctx.arc(dx * s, dy * s, r * s * 0.68, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#8fbf7a';
        ctx.beginPath(); ctx.arc(dx * s - r * s * 0.25, dy * s, r * s * 0.13, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(dx * s + r * s * 0.25, dy * s, r * s * 0.13, 0, Math.PI * 2); ctx.fill();
      }
      break;
    }
    case 'sauce': {
      // A little sauce bowl with a glossy swirl of fish sauce.
      ctx.beginPath();
      ctx.moveTo(-s * 0.92, -s * 0.05);
      ctx.quadraticCurveTo(0, s * 0.85, s * 0.92, -s * 0.05);
      ctx.closePath();
      ctx.fillStyle = vGrad(ctx, 0, s * 0.8, [[0, '#c93a2e'], [1, '#8f2318']]);
      ctx.fill();
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = s * 0.06; ctx.stroke();
      ctx.fillStyle = '#c46a35';
      ctx.beginPath(); ctx.ellipse(0, -s * 0.05, s * 0.92, s * 0.24, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#e59a5f'; ctx.lineWidth = s * 0.09; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(0, -s * 0.05, s * 0.45, Math.PI * 0.3, Math.PI * 1.5); ctx.stroke();
      gloss(ctx, -s * 0.4, s * 0.25, s * 0.2, s * 0.08, 0.35);
      break;
    }
    case 'coffee': {
      // A phin-coffee glass: condensed milk below, dark coffee above, ice on top.
      const glassPath = () => {
        ctx.beginPath();
        ctx.moveTo(-s * 0.58, -s * 0.62); ctx.lineTo(s * 0.58, -s * 0.62);
        ctx.lineTo(s * 0.42, s * 0.78); ctx.lineTo(-s * 0.42, s * 0.78);
        ctx.closePath();
      };
      glassPath();
      ctx.fillStyle = '#4a2a16'; ctx.fill();
      ctx.save();
      glassPath(); ctx.clip();
      ctx.fillStyle = vGrad(ctx, -s * 0.62, s * 1.1, [[0, '#6b4020'], [1, '#2e1a0c']]);
      ctx.fillRect(-s * 0.6, -s * 0.62, s * 1.2, s * 1.05);
      ctx.fillStyle = '#fdf6dd';
      ctx.fillRect(-s * 0.6, s * 0.38, s * 1.2, s * 0.45);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.20)';
      ctx.fillRect(-s * 0.44, -s * 0.62, s * 0.16, s * 1.4);
      ctx.restore();
      for (const [dx, dy, rot] of [[-0.2, -0.52, 0.4], [0.24, -0.58, 0.95]]) {
        ctx.save(); ctx.translate(dx * s, dy * s); ctx.rotate(rot);
        fillRound(ctx, -s * 0.21, -s * 0.21, s * 0.42, s * 0.42, s * 0.09, '#dff2fc');
        strokeRound(ctx, -s * 0.21, -s * 0.21, s * 0.42, s * 0.42, s * 0.09, '#9cc8e4', s * 0.05);
        ctx.restore();
      }
      glassPath();
      ctx.strokeStyle = 'rgba(230, 245, 255, 0.9)'; ctx.lineWidth = s * 0.06; ctx.stroke();
      drawSparkle(ctx, s * 0.62, -s * 0.3, s * 0.2, '#ffffff', 0.9);
      break;
    }
    case 'milk': {
      // A condensed-milk tin with a red label band and a steel rim.
      fillRound(ctx, -s * 0.52, -s * 0.8, s * 1.04, s * 1.6, s * 0.13,
        vGrad(ctx, -s * 0.8, s * 1.6, [[0, '#fffbe9'], [1, '#f0dfae']]));
      ctx.fillStyle = '#c3ccd2';
      ctx.beginPath(); ctx.ellipse(0, -s * 0.78, s * 0.52, s * 0.15, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = RED;
      ctx.fillRect(-s * 0.52, -s * 0.16, s * 1.04, s * 0.38);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-s * 0.52, -s * 0.03, s * 1.04, s * 0.1);
      strokeRound(ctx, -s * 0.52, -s * 0.8, s * 1.04, s * 1.6, s * 0.13, OUTLINE, s * 0.06);
      gloss(ctx, -s * 0.3, -s * 0.4, s * 0.09, s * 0.3, 0.5);
      break;
    }
    case 'ice': {
      // Three crushed-ice cubes, pale blue with bright top edges.
      for (const [dx, dy, rot] of [[-0.35, -0.2, 0.4], [0.38, -0.3, 0.9], [0, 0.38, 0.2]]) {
        ctx.save(); ctx.translate(dx * s, dy * s); ctx.rotate(rot);
        fillRound(ctx, -s * 0.34, -s * 0.34, s * 0.68, s * 0.68, s * 0.13,
          vGrad(ctx, -s * 0.34, s * 0.68, [[0, '#eef9ff'], [1, '#a8d4ee']]));
        strokeRound(ctx, -s * 0.34, -s * 0.34, s * 0.68, s * 0.68, s * 0.13, '#8fc3e0', s * 0.05);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)'; ctx.lineWidth = s * 0.06; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-s * 0.2, -s * 0.2); ctx.lineTo(s * 0.05, -s * 0.2); ctx.stroke();
        ctx.restore();
      }
      drawSparkle(ctx, s * 0.55, -s * 0.55, s * 0.18, '#ffffff', 0.85);
      break;
    }
    default:
      ctx.fillStyle = ingredient.colour;
      ctx.beginPath(); ctx.arc(0, 0, s * 0.8, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/** The head-up strip: name, the day clock, the till and the tallies. */
function drawHud(ctx, state) {
  ctx.fillStyle = vGrad(ctx, HUD.y, HUD.height, [[0, '#8a3418'], [1, '#5d1f0e']]);
  ctx.fillRect(HUD.x, HUD.y, HUD.width, HUD.height);
  ctx.fillStyle = GOLD;
  ctx.fillRect(0, HUD.height - 3, HUD.width, 3);
  ctx.save();
  ctx.font = `800 24px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 5;
  ctx.strokeText('SAIGON SIZZLE', 20, 27);
  const titleGrad = vGrad(ctx, 12, 28, [[0, '#ffd968'], [1, '#ff9435']]);
  ctx.fillStyle = titleGrad;
  ctx.fillText('SAIGON SIZZLE', 20, 27);
  ctx.restore();
  const left = timeLeft(state);
  const minutes = Math.floor(left / 60);
  const seconds = Math.floor(left % 60).toString().padStart(2, '0');
  label(ctx, `Day ends in ${minutes}:${seconds}`, 330, 26, { size: 20, align: 'left', colour: left < 20 ? '#ff9a86' : INK.cream, shadow: true });
  const barX = 560;
  fillRound(ctx, barX, 18, 220, 16, 8, 'rgba(30, 12, 2, 0.55)');
  fillRound(ctx, barX, 18, Math.max(16, 220 * (state.elapsed / DAY_LENGTH)), 16, 8,
    inRush(state) ? vGrad(ctx, 18, 16, [[0, '#ff7a5c'], [1, '#d63c2f']]) : vGrad(ctx, 18, 16, [[0, '#7ed473'], [1, '#43913c']]));
  strokeRound(ctx, barX, 18, 220, 16, 8, 'rgba(255, 248, 231, 0.4)', 1.5);
  label(ctx, inRush(state) ? 'RUSH HOUR' : 'service', barX + 110, 44, { size: 12, colour: inRush(state) ? '#ff9a86' : '#f3e3b8' });
  drawCoin(ctx, 814, 26, 11);
  label(ctx, `$${state.money}`, 830, 26, { size: 26, colour: GOLD, align: 'left', shadow: true });
  label(ctx, `served ${state.served}`, 950, 18, { size: 15, align: 'left' });
  label(ctx, `lost ${state.lost}`, 950, 38, { size: 15, align: 'left', colour: state.lost > 0 ? '#ff9a86' : INK.cream });
  if (state.combo >= 2) label(ctx, `COMBO ×${state.combo}`, 1060, 26, { size: 18, colour: GOLD, align: 'left', shadow: true });
  drawPauseButton(ctx, state);
  drawMuteButton(ctx, state);
}

/** A chunky little HUD button: dark seat, pale face, the kitchen outline. */
function hudButtonSeat(ctx, rect) {
  fillRound(ctx, rect.x, rect.y + 3, rect.width, rect.height, 9, 'rgba(30, 14, 2, 0.5)');
  fillRound(ctx, rect.x, rect.y, rect.width, rect.height, 9, 'rgba(255, 248, 231, 0.22)');
  strokeRound(ctx, rect.x, rect.y, rect.width, rect.height, 9, 'rgba(255, 248, 231, 0.55)', 2);
}

function drawPauseButton(ctx, state) {
  const rect = PAUSE_BUTTON;
  hudButtonSeat(ctx, rect);
  ctx.fillStyle = INK.cream;
  if (state.paused) {
    ctx.beginPath();
    ctx.moveTo(rect.x + 20, rect.y + 9); ctx.lineTo(rect.x + 38, rect.y + 18); ctx.lineTo(rect.x + 20, rect.y + 27);
    ctx.closePath(); ctx.fill();
  } else {
    fillRound(ctx, rect.x + 17, rect.y + 9, 6, 18, 2, INK.cream);
    fillRound(ctx, rect.x + 29, rect.y + 9, 6, 18, 2, INK.cream);
  }
}

function drawMuteButton(ctx, state) {
  const rect = MUTE_BUTTON;
  hudButtonSeat(ctx, rect);
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
    ctx.strokeStyle = '#ff9a86'; ctx.lineWidth = 3; ctx.lineCap = 'round';
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

/**
 * A customer's face, big and round: glad with rosy cheeks while patience lasts,
 * flat as it drains, and cross with a sweat drop when it is nearly gone.
 */
function drawCustomerFace(ctx, cx, cy, s, patienceFraction) {
  ctx.fillStyle = vGrad(ctx, cy - s, s * 2, [[0, '#ffd9a3'], [1, '#f0af72']]);
  ctx.beginPath(); ctx.arc(cx, cy, s, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = s * 0.09;
  ctx.beginPath(); ctx.arc(cx, cy, s, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#8a5a2e';
  ctx.beginPath(); ctx.ellipse(cx, cy - s * 0.92, s * 0.55, s * 0.24, 0, Math.PI, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(244, 114, 96, 0.55)';
  ctx.beginPath(); ctx.arc(cx - s * 0.58, cy + s * 0.28, s * 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + s * 0.58, cy + s * 0.28, s * 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = INK.ink;
  ctx.beginPath(); ctx.arc(cx - s * 0.34, cy - s * 0.12, s * 0.1, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + s * 0.34, cy - s * 0.12, s * 0.1, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(cx - s * 0.3, cy - s * 0.17, s * 0.04, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + s * 0.38, cy - s * 0.17, s * 0.04, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = INK.ink; ctx.lineWidth = s * 0.1; ctx.lineCap = 'round';
  ctx.beginPath();
  if (patienceFraction > 0.5) {
    ctx.arc(cx, cy + s * 0.16, s * 0.44, Math.PI * 0.15, Math.PI * 0.85);
  } else if (patienceFraction > 0.25) {
    ctx.moveTo(cx - s * 0.3, cy + s * 0.44); ctx.lineTo(cx + s * 0.3, cy + s * 0.44);
  } else {
    ctx.arc(cx, cy + s * 0.66, s * 0.36, Math.PI * 1.15, Math.PI * 1.85);
    ctx.moveTo(cx - s * 0.52, cy - s * 0.42); ctx.lineTo(cx - s * 0.18, cy - s * 0.3);
    ctx.moveTo(cx + s * 0.52, cy - s * 0.42); ctx.lineTo(cx + s * 0.18, cy - s * 0.3);
  }
  ctx.stroke();
  if (patienceFraction <= 0.25) {
    ctx.fillStyle = '#7ec8f2';
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.92, cy - s * 0.3);
    ctx.quadraticCurveTo(cx + s * 1.14, cy + s * 0.05, cx + s * 0.92, cy + s * 0.12);
    ctx.quadraticCurveTo(cx + s * 0.7, cy + s * 0.05, cx + s * 0.92, cy - s * 0.3);
    ctx.fill();
  }
}

/** The order board: one paper ticket per waiting customer, pinned to the board. */
function drawTickets(ctx, state, now) {
  for (let index = 0; index < 4; index += 1) {
    const rect = ticketRect(index);
    const ticket = state.tickets[index];
    if (ticket === undefined) {
      ctx.strokeStyle = 'rgba(122, 62, 20, 0.4)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([8, 7]);
      roundRect(ctx, rect.x, rect.y, rect.width, rect.height, 12);
      ctx.stroke();
      ctx.setLineDash([]);
      label(ctx, 'waiting for a customer…', rect.x + rect.width / 2, rect.y + rect.height / 2, { size: 15, colour: 'rgba(122, 62, 20, 0.55)' });
      continue;
    }
    const recipe = recipeById(ticket.recipeId);
    const isTarget = ticket.id === state.targetId;
    shadowed(ctx, 10, 4, () => {
      fillRound(ctx, rect.x, rect.y, rect.width, rect.height, 14,
        vGrad(ctx, rect.y, rect.height, [[0, '#fffbe9'], [1, PAPER_DEEP]]));
    });
    if (isTarget) {
      ctx.save();
      ctx.shadowColor = 'rgba(246, 185, 59, 0.85)';
      ctx.shadowBlur = 14 + 5 * Math.sin(now * 4);
      strokeRound(ctx, rect.x - 2, rect.y - 2, rect.width + 4, rect.height + 4, 16, GOLD, 5);
      ctx.restore();
    }
    strokeRound(ctx, rect.x, rect.y, rect.width, rect.height, 14, OUTLINE, 2.5);
    // The red push-pin through the top of the ticket.
    ctx.save();
    ctx.shadowColor = 'rgba(46, 20, 2, 0.4)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = vGrad(ctx, rect.y + 2, 14, [[0, '#ff7a5c'], [1, RED_DEEP]]);
    ctx.beginPath(); ctx.arc(rect.x + rect.width / 2, rect.y + 9, 7, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    gloss(ctx, rect.x + rect.width / 2 - 2, rect.y + 6, 2.4, 1.6, 0.8);
    const fraction = Math.max(0, ticket.patience / ticket.patienceMax);
    drawCustomerFace(ctx, rect.x + 38, rect.y + 44, 23, fraction);
    label(ctx, recipe.name, rect.x + 70, rect.y + 34, { size: 23, colour: INK.ink, align: 'left' });
    label(ctx, `$${recipe.price}`, rect.x + rect.width - 14, rect.y + 34, { size: 20, colour: RED_DEEP, align: 'right' });
    if (isTarget) label(ctx, 'COOKING THIS', rect.x + 70, rect.y + 57, { size: 12, colour: RED, align: 'left' });
    const done = isTarget || state.plate.recipeId === ticket.recipeId ? state.plate.stepsDone.length : 0;
    recipe.steps.forEach((step, stepIndex) => {
      const cx = rect.x + 44 + stepIndex * 62;
      const cy = rect.y + 88;
      drawIngredientIcon(ctx, step.id, cx, cy, 20);
      if (stepIndex < done && state.plate.recipeId === ticket.recipeId) {
        ctx.fillStyle = LEAF;
        ctx.beginPath(); ctx.arc(cx + 16, cy - 16, 10, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(cx + 16, cy - 16, 10, 0, Math.PI * 2); ctx.stroke();
        label(ctx, '✓', cx + 16, cy - 15, { size: 12, colour: '#ffffff' });
      } else if (isTarget && stepIndex === done) {
        ctx.strokeStyle = RED;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(cx, cy, 26 + Math.sin(now * 5) * 2, 0, Math.PI * 2); ctx.stroke();
      }
    });
    const barY = rect.y + rect.height - 17;
    fillRound(ctx, rect.x + 12, barY, rect.width - 24, 9, 4.5, 'rgba(74, 36, 16, 0.22)');
    if (fraction > 0) {
      fillRound(ctx, rect.x + 12, barY, Math.max(9, (rect.width - 24) * fraction), 9, 4.5,
        fraction > 0.5 ? vGrad(ctx, barY, 9, [[0, '#7ed473'], [1, '#43913c']])
          : fraction > 0.25 ? vGrad(ctx, barY, 9, [[0, '#ffd968'], [1, GOLD_DEEP]])
            : vGrad(ctx, barY, 9, [[0, '#ff7a5c'], [1, '#d63c2f']]));
    }
    strokeRound(ctx, rect.x + 12, barY, rect.width - 24, 9, 4.5, 'rgba(74, 36, 16, 0.35)', 1.5);
  }
}

/** Little flames that lick up under whatever is on the grill, flickering. */
function drawFlames(ctx, cx, baseY, now, seed) {
  for (let i = -1; i <= 1; i += 1) {
    const fx = cx + i * 17;
    const h = 15 + 5 * Math.sin(now * 11 + seed + i * 2.3) + 3 * Math.sin(now * 23 + i);
    ctx.fillStyle = '#e2703a';
    ctx.beginPath();
    ctx.moveTo(fx - 8, baseY);
    ctx.quadraticCurveTo(fx - 7, baseY - h * 0.6, fx, baseY - h);
    ctx.quadraticCurveTo(fx + 7, baseY - h * 0.6, fx + 8, baseY);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f6b93b';
    ctx.beginPath();
    ctx.moveTo(fx - 4.5, baseY);
    ctx.quadraticCurveTo(fx - 4, baseY - h * 0.35, fx, baseY - h * 0.58);
    ctx.quadraticCurveTo(fx + 4, baseY - h * 0.35, fx + 4.5, baseY);
    ctx.closePath(); ctx.fill();
  }
}

/** The bouncy gold badge a finished slot wears until it is clicked off. */
function drawReadyBadge(ctx, cx, y, now) {
  const bounce = -Math.abs(Math.sin(now * 5.5)) * 5;
  const bx = cx - 39;
  const by = y + bounce;
  shadowed(ctx, 6, 3, () => {
    fillRound(ctx, bx, by, 78, 24, 12, vGrad(ctx, by, 24, [[0, '#ffd968'], [1, GOLD_DEEP]]));
  });
  strokeRound(ctx, bx, by, 78, 24, 12, OUTLINE, 2.5);
  label(ctx, 'READY!', cx, by + 13, { size: 15, colour: RED_DEEP });
}

/** One cooking station: its slots, its fire, and the state of what cooks there. */
function drawStation(ctx, state, kind, now) {
  const rect = stationRect(kind);
  const isGrill = kind === 'grill';
  counterPanel(ctx, rect, isGrill ? 'GRILL — pork & egg' : 'POT — beef & shrimp', isGrill ? '#ff9a5c' : '#bfe0f2');
  for (let slotIndex = 0; slotIndex < 2; slotIndex += 1) {
    const slotRect = stationSlotRect(kind, slotIndex);
    const slot = state.stations[kind][slotIndex];
    const cx = slotRect.x + slotRect.width / 2;
    if (isGrill) {
      fillRound(ctx, slotRect.x, slotRect.y, slotRect.width, slotRect.height, 12,
        vGrad(ctx, slotRect.y, slotRect.height, [[0, '#3a2115'], [1, '#20100a']]));
      // Glowing embers under the grate, flickering at their own rates.
      for (let ember = 0; ember < 9; ember += 1) {
        const ex = slotRect.x + 16 + hash01(slotIndex * 31 + ember * 7) * (slotRect.width - 32);
        const ey = slotRect.y + slotRect.height - 14 - hash01(slotIndex * 17 + ember * 3) * 16;
        const glow = 0.45 + 0.4 * Math.sin(now * 7 + ember * 1.7 + slotIndex * 3);
        ctx.fillStyle = `rgba(255, ${110 + Math.round(60 * glow)}, 40, ${glow})`;
        ctx.beginPath(); ctx.arc(ex, ey, 3.2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.strokeStyle = 'rgba(230, 200, 170, 0.35)'; ctx.lineWidth = 3;
      for (let line = 0; line < 4; line += 1) {
        ctx.beginPath();
        ctx.moveTo(slotRect.x + 12, slotRect.y + 26 + line * 24);
        ctx.lineTo(slotRect.x + slotRect.width - 12, slotRect.y + 26 + line * 24);
        ctx.stroke();
      }
    } else {
      // A steel pot: shaded body, side handles, a rim of bubbling broth.
      fillRound(ctx, slotRect.x, slotRect.y + 16, slotRect.width, slotRect.height - 16, 12,
        vGrad(ctx, slotRect.y, slotRect.height, [[0, '#c3ccd2'], [0.4, '#97a5ae'], [1, '#6e7c86']]));
      ctx.fillStyle = '#7d8891';
      ctx.beginPath(); ctx.ellipse(slotRect.x + 8, slotRect.y + 52, 9, 14, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(slotRect.x + slotRect.width - 8, slotRect.y + 52, 9, 14, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#aeb9c1';
      ctx.beginPath(); ctx.ellipse(cx, slotRect.y + 34, slotRect.width / 2 - 8, 17, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = vGrad(ctx, slotRect.y + 20, 28, [[0, '#eda34f'], [1, '#c97b2d']]);
      ctx.beginPath(); ctx.ellipse(cx, slotRect.y + 34, slotRect.width / 2 - 15, 13, 0, 0, Math.PI * 2); ctx.fill();
      for (let bubble = 0; bubble < 6; bubble += 1) {
        const bx = cx + (hash01(slotIndex * 13 + bubble * 11) - 0.5) * (slotRect.width - 60);
        const br = 2 + 1.6 * (0.5 + 0.5 * Math.sin(now * 4 + bubble * 2.1 + slotIndex));
        ctx.fillStyle = 'rgba(255, 226, 170, 0.75)';
        ctx.beginPath(); ctx.arc(bx, slotRect.y + 32 + hash01(bubble * 5 + slotIndex) * 6, br, 0, Math.PI * 2); ctx.fill();
      }
      strokeRound(ctx, slotRect.x, slotRect.y + 16, slotRect.width, slotRect.height - 16, 12, OUTLINE, 2.5);
    }
    if (slot === null) {
      label(ctx, 'empty', cx, slotRect.y + (isGrill ? slotRect.height / 2 : 78), { size: 15, colour: isGrill ? 'rgba(255, 248, 231, 0.45)' : 'rgba(38, 30, 22, 0.55)' });
      continue;
    }
    const ingredient = ingredientById(slot.ingredient);
    if (slot.phase === 'burnt') {
      ctx.globalAlpha = 0.45;
      drawIngredientIcon(ctx, slot.ingredient, cx, slotRect.y + 52, 26);
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(20, 12, 8, 0.45)';
      ctx.beginPath(); ctx.ellipse(cx, slotRect.y + 56, 34, 22, 0, 0, Math.PI * 2); ctx.fill();
      for (let puff = 0; puff < 3; puff += 1) {
        const rise = ((now * 13 + puff * 11 + slotIndex * 7) % 24);
        ctx.fillStyle = `rgba(105, 98, 94, ${0.5 - rise / 55})`;
        ctx.beginPath(); ctx.arc(cx - 14 + puff * 13, slotRect.y + 26 - rise, 8 + rise * 0.3, 0, Math.PI * 2); ctx.fill();
      }
      label(ctx, 'BURNT — click to scrape', cx, slotRect.y + 96, { size: 13, colour: '#ff9a86' });
      continue;
    }
    if (isGrill && slot.phase === 'cooking') drawFlames(ctx, cx, slotRect.y + 88, now, slotIndex * 3.1);
    if (!isGrill) drawSteam(ctx, cx, slotRect.y + 14, 0.8, now * 1.6 + slotIndex * 2);
    drawIngredientIcon(ctx, slot.ingredient, cx, slotRect.y + 52, 27);
    if (slot.phase === 'cooking') {
      const fraction = Math.min(1, slot.t / ingredient.cookSeconds);
      ctx.strokeStyle = 'rgba(255, 248, 231, 0.3)'; ctx.lineWidth = 7; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(cx, slotRect.y + 52, 40, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = vGrad(ctx, slotRect.y + 12, 80, [[0, '#ffd968'], [1, '#f08a1d']]);
      ctx.beginPath(); ctx.arc(cx, slotRect.y + 52, 40, -Math.PI / 2, -Math.PI / 2 + fraction * Math.PI * 2); ctx.stroke();
      label(ctx, `${Math.ceil(ingredient.cookSeconds - slot.t)}s`, cx, slotRect.y + 102, { size: 14, shadow: true });
    } else {
      ctx.save();
      ctx.shadowColor = 'rgba(246, 185, 59, 0.9)';
      ctx.shadowBlur = 12 + 5 * Math.sin(now * 6);
      ctx.strokeStyle = GOLD; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(cx, slotRect.y + 52, 42, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      for (let spark = 0; spark < 4; spark += 1) {
        const angle = spark * Math.PI / 2 + 0.6;
        drawSparkle(ctx, cx + Math.cos(angle) * 48, slotRect.y + 52 + Math.sin(angle) * 48,
          6 + 2.5 * Math.sin(now * 6 + spark * 1.8), '#ffe9a0', 0.75);
      }
      drawReadyBadge(ctx, cx, slotRect.y - 4, now);
      label(ctx, 'click it', cx, slotRect.y + 102, { size: 13, colour: '#ffe9b0' });
      const left = Math.max(0, 1 - slot.t / 6);
      fillRound(ctx, slotRect.x + 14, slotRect.y + slotRect.height - 9, slotRect.width - 28, 5, 2.5, 'rgba(30, 14, 2, 0.5)');
      fillRound(ctx, slotRect.x + 14, slotRect.y + slotRect.height - 9, (slotRect.width - 28) * left, 5, 2.5, left > 0.35 ? GOLD : RED);
    }
  }
}

/**
 * The stall's chef, standing by the plate: white hat and apron, a red neckerchief,
 * an idle bob, and a happy bounce with arms up while a fresh "+$" floater rises.
 * (cx, feetY) is where the shoes land; scale 1 is the in-kitchen size.
 */
function drawChef(ctx, cx, feetY, scale, now, celebrate) {
  const bob = celebrate ? -Math.abs(Math.sin(now * 7)) * 7 : Math.sin(now * 2.1) * 2;
  ctx.save();
  ctx.translate(cx, feetY + bob * scale);
  ctx.scale(scale, scale);
  ctx.fillStyle = 'rgba(46, 20, 2, 0.25)';
  ctx.beginPath(); ctx.ellipse(0, 2 - bob, 30, 6, 0, 0, Math.PI * 2); ctx.fill();
  // Body: a white apron over a warm shirt, with the outline everywhere.
  fillRound(ctx, -27, -62, 54, 62, 14, vGrad(ctx, -62, 62, [[0, '#ffffff'], [1, '#f0e4c8']]));
  ctx.fillStyle = RED;
  ctx.beginPath();
  ctx.moveTo(-27, -62); ctx.lineTo(27, -62); ctx.lineTo(0, -34);
  ctx.closePath(); ctx.fill();
  strokeRound(ctx, -27, -62, 54, 62, 14, OUTLINE, 3);
  ctx.strokeStyle = '#d9c9a3'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-14, -30); ctx.lineTo(-14, -6); ctx.moveTo(14, -30); ctx.lineTo(14, -6); ctx.stroke();
  // Arms: resting at the sides, or thrown up when a plate sells.
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 9; ctx.lineCap = 'round';
  ctx.beginPath();
  if (celebrate) {
    ctx.moveTo(-24, -52); ctx.lineTo(-38, -78);
    ctx.moveTo(24, -52); ctx.lineTo(38, -78);
  } else {
    ctx.moveTo(-24, -52); ctx.lineTo(-33, -22);
    ctx.moveTo(24, -52); ctx.lineTo(33, -22);
  }
  ctx.stroke();
  ctx.strokeStyle = SKIN; ctx.lineWidth = 5.5;
  ctx.beginPath();
  if (celebrate) {
    ctx.moveTo(-24, -52); ctx.lineTo(-38, -78);
    ctx.moveTo(24, -52); ctx.lineTo(38, -78);
  } else {
    ctx.moveTo(-24, -52); ctx.lineTo(-33, -22);
    ctx.moveTo(24, -52); ctx.lineTo(33, -22);
  }
  ctx.stroke();
  // Head and the tall white hat.
  ctx.fillStyle = vGrad(ctx, -96, 34, [[0, '#ffd9a3'], [1, '#f0af72']]);
  ctx.beginPath(); ctx.arc(0, -79, 17, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(0, -79, 17, 0, Math.PI * 2); ctx.stroke();
  fillRound(ctx, -16, -106, 32, 16, 7, '#ffffff');
  fillRound(ctx, -18, -94, 36, 9, 4, '#ffffff');
  strokeRound(ctx, -16, -106, 32, 16, 7, OUTLINE, 2.5);
  strokeRound(ctx, -18, -94, 36, 9, 4, OUTLINE, 2.5);
  ctx.fillStyle = INK.ink;
  ctx.beginPath(); ctx.arc(-6, -80, 1.9, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(6, -80, 1.9, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(244, 114, 96, 0.55)';
  ctx.beginPath(); ctx.arc(-10, -73, 3.6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(10, -73, 3.6, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = INK.ink; ctx.lineWidth = 2; ctx.lineCap = 'round';
  ctx.beginPath();
  if (celebrate) ctx.arc(0, -74, 6, Math.PI * 0.1, Math.PI * 0.9);
  else ctx.arc(0, -76, 5, Math.PI * 0.2, Math.PI * 0.8);
  ctx.stroke();
  ctx.restore();
}

/** The plate on the counter and the dish it is becoming, layer by layer. */
function drawPlate(ctx, state, now) {
  counterPanel(ctx, PLATE_PANEL, 'YOUR PLATE', GOLD);
  const recipe = plateRecipe(state) ?? (targetTicket(state) === null ? null : recipeById(targetTicket(state).recipeId));
  const { x: cx, y: cy, radius } = PLATE_CENTRE;
  const shakeX = state.shake > 0 ? Math.sin(now * 70) * state.shake * 14 : 0;
  ctx.save();
  ctx.translate(shakeX, 0);
  ctx.fillStyle = 'rgba(46, 20, 2, 0.35)';
  ctx.beginPath(); ctx.ellipse(cx, cy + 10, radius + 12, radius * 0.92, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = vGrad(ctx, cy - radius, radius * 2, [[0, '#ffffff'], [0.75, '#fdf6dc'], [1, '#ecdcae']]);
  ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#d9c08a'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(cx, cy, radius - 2, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(120, 90, 40, 0.18)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, radius - 14, 0, Math.PI * 2); ctx.stroke();
  gloss(ctx, cx - radius * 0.4, cy - radius * 0.45, radius * 0.3, radius * 0.13, 0.5);
  const spots = [[-32, -20], [32, -20], [-32, 26], [32, 26], [0, 2]];
  state.plate.stepsDone.forEach((ingredientId, index) => {
    const [dx, dy] = spots[index % spots.length];
    ctx.fillStyle = 'rgba(46, 20, 2, 0.16)';
    ctx.beginPath(); ctx.ellipse(cx + dx, cy + dy + 17, 19, 5.5, 0, 0, Math.PI * 2); ctx.fill();
    drawIngredientIcon(ctx, ingredientId, cx + dx, cy + dy, 25);
  });
  if (state.plate.stepsDone.length === 0) {
    label(ctx, 'click a bin below', cx, cy - 8, { size: 16, colour: 'rgba(44, 26, 14, 0.45)' });
    label(ctx, 'to start the dish', cx, cy + 16, { size: 16, colour: 'rgba(44, 26, 14, 0.45)' });
  }
  if (plateComplete(state)) {
    for (let spark = 0; spark < 6; spark += 1) {
      const angle = spark * Math.PI / 3 + now * 0.7;
      drawSparkle(ctx, cx + Math.cos(angle) * (radius + 6), cy + Math.sin(angle) * (radius + 6) * 0.92,
        6 + 2.5 * Math.sin(now * 5 + spark * 1.7), '#fff3b0', 0.85);
    }
    drawSteam(ctx, cx - 12, cy - radius + 6, 0.85, now * 1.8);
  }
  ctx.restore();
  const celebrating = state.floaters.some((floater) => floater.text.startsWith('+$') && floater.age < 0.9);
  drawChef(ctx, 712, 394, 1, now, celebrating);
  if (recipe !== null) {
    label(ctx, recipe.name, PLATE_PANEL.x + PLATE_PANEL.width - 18, PLATE_PANEL.y + 26, { size: 21, colour: '#ffe9b0', align: 'right', shadow: true });
    if (plateComplete(state)) {
      shadowed(ctx, 6, 3, () => {
        fillRound(ctx, cx - 86, cy + radius - 18, 172, 26, 13, vGrad(ctx, cy + radius - 18, 26, [[0, '#7ed473'], [1, LEAF_DEEP]]));
      });
      strokeRound(ctx, cx - 86, cy + radius - 18, 172, 26, 13, OUTLINE, 2.5);
      label(ctx, 'READY TO SERVE!', cx, cy + radius - 4, { size: 15, colour: '#ffffff', shadow: true });
    }
  }
  chunkyButton(ctx, SERVE_BUTTON, '#7ed473', LEAF_DEEP, 'SERVE  (Space)', { size: 19, dim: !plateComplete(state) });
  chunkyButton(ctx, TRASH_BUTTON, '#ff7a5c', RED_DEEP, 'TRASH PLATE', { size: 19 });
}

/** The checklist under the plate: every step of the dish, ticked as it lands. */
function drawChecklist(ctx, state, now) {
  counterPanel(ctx, CHECKLIST_PANEL, null);
  const ticket = targetTicket(state);
  const recipe = plateRecipe(state) ?? (ticket === null ? null : recipeById(ticket.recipeId));
  if (recipe === null) {
    label(ctx, 'Pick an order ticket above, then build its dish step by step.', CHECKLIST_PANEL.x + CHECKLIST_PANEL.width / 2, CHECKLIST_PANEL.y + 44, { size: 17, colour: '#ffe9b0' });
    drawMessage(ctx, state);
    return;
  }
  label(ctx, `CHECKLIST — ${recipe.name}`, CHECKLIST_PANEL.x + 18, CHECKLIST_PANEL.y + 22, { size: 15, colour: '#ffe9b0', align: 'left', shadow: true });
  recipe.steps.forEach((step, index) => {
    const chipX = CHECKLIST_PANEL.x + 16 + index * 108;
    const chipY = CHECKLIST_PANEL.y + 38;
    const done = index < state.plate.stepsDone.length;
    const isNext = index === state.plate.stepsDone.length;
    shadowed(ctx, 4, 2, () => {
      fillRound(ctx, chipX, chipY, 100, 52, 10,
        done ? vGrad(ctx, chipY, 52, [[0, '#dcf2cd'], [1, '#aed69b']]) : vGrad(ctx, chipY, 52, [[0, '#fffbe9'], [1, '#f3e0ac']]));
    });
    strokeRound(ctx, chipX, chipY, 100, 52, 10, done ? LEAF_DEEP : OUTLINE, 2);
    if (isNext) {
      ctx.save();
      ctx.globalAlpha = 0.65 + 0.35 * Math.sin(now * 5);
      strokeRound(ctx, chipX - 2, chipY - 2, 104, 56, 12, GOLD, 3.5);
      ctx.restore();
    }
    drawIngredientIcon(ctx, step.id, chipX + 24, chipY + 26, 15);
    label(ctx, done ? '✓ done' : step.via === 'bin' ? 'from bin' : step.via === 'grill' ? 'grill it' : 'pot it', chipX + 64, chipY + 26, { size: 13, colour: done ? LEAF_DEEP : INK.ink });
  });
  drawMessage(ctx, state, recipe);
}

/** The freshest line of kitchen talk, or the hint for the next step. */
function drawMessage(ctx, state, recipe = null) {
  const y = CHECKLIST_PANEL.y + CHECKLIST_PANEL.height - 18;
  if (state.messageAge < 2.4 && state.message !== '') {
    label(ctx, state.message, CHECKLIST_PANEL.x + CHECKLIST_PANEL.width / 2, y, { size: 16, colour: GOLD, shadow: true });
    return;
  }
  if (recipe !== null && !plateComplete(state)) {
    const step = nextStep(state);
    if (step !== null) {
      const ingredient = ingredientById(step.id);
      const hint = step.via === 'bin'
        ? `Next: ${ingredient.name} — click its bin`
        : `Next: ${ingredient.name} — start it on the ${step.via}, click when it dings`;
      label(ctx, hint, CHECKLIST_PANEL.x + CHECKLIST_PANEL.width / 2, y, { size: 14, colour: '#f3e3b8' });
    }
  }
}

/** The pass: cooked items waiting on little wooden boards for their plate. */
function drawShelf(ctx, state) {
  counterPanel(ctx, SHELF_PANEL, 'THE PASS — cooked & ready', '#bfe0f2');
  for (let index = 0; index < 4; index += 1) {
    const rect = shelfSlotRect(index);
    const ingredientId = state.shelf[index];
    shadowed(ctx, 5, 3, () => {
      fillRound(ctx, rect.x, rect.y, rect.width, rect.height, 12,
        vGrad(ctx, rect.y, rect.height, [[0, '#d99a55'], [1, '#a5662a']]));
    });
    strokeRound(ctx, rect.x, rect.y, rect.width, rect.height, 12, OUTLINE, 2.5);
    if (ingredientId === undefined) {
      ctx.strokeStyle = 'rgba(255, 246, 220, 0.5)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      roundRect(ctx, rect.x + 9, rect.y + 9, rect.width - 18, rect.height - 18, 9); ctx.stroke();
      ctx.setLineDash([]);
    } else {
      const ingredient = ingredientById(ingredientId);
      ctx.fillStyle = 'rgba(46, 20, 2, 0.18)';
      ctx.beginPath(); ctx.ellipse(rect.x + rect.width / 2, rect.y + 58, 26, 6, 0, 0, Math.PI * 2); ctx.fill();
      drawIngredientIcon(ctx, ingredientId, rect.x + rect.width / 2, rect.y + 38, 24);
      label(ctx, ingredient.name.split(' ')[0], rect.x + rect.width / 2, rect.y + 78, { size: 13, colour: '#fff6dc', shadow: true });
    }
  }
  label(ctx, 'cook ahead, then click a dish in when its step comes up', SHELF_PANEL.x + SHELF_PANEL.width / 2, SHELF_PANEL.y + SHELF_PANEL.height - 16, { size: 13, colour: '#f3e3b8' });
}

/** The day's book: money, tallies, best streak, and the day bar with its rush. */
function drawTally(ctx, state) {
  counterPanel(ctx, TALLY_PANEL, 'TODAY AT THE STALL', GOLD);
  const x = TALLY_PANEL.x + 22;
  drawCoin(ctx, x + 12, TALLY_PANEL.y + 62, 13);
  label(ctx, `$${state.money} earned`, x + 32, TALLY_PANEL.y + 62, { size: 30, colour: GOLD, align: 'left', shadow: true });
  label(ctx, `dishes served: ${state.served}`, x, TALLY_PANEL.y + 100, { size: 17, align: 'left' });
  label(ctx, `customers lost: ${state.lost}`, x + 220, TALLY_PANEL.y + 100, { size: 17, align: 'left', colour: state.lost > 0 ? '#ff9a86' : INK.cream });
  label(ctx, `best combo: ×${state.bestCombo}`, x, TALLY_PANEL.y + 128, { size: 17, align: 'left' });
  const barX = x;
  const barW = TALLY_PANEL.width - 44;
  const barY = TALLY_PANEL.y + 152;
  fillRound(ctx, barX, barY, barW, 14, 7, 'rgba(30, 14, 2, 0.5)');
  ctx.save();
  roundRect(ctx, barX, barY, barW, 14, 7);
  ctx.clip();
  ctx.fillStyle = 'rgba(224, 72, 58, 0.6)';
  ctx.fillRect(barX + barW * (RUSH_START / DAY_LENGTH), barY, barW * ((RUSH_END - RUSH_START) / DAY_LENGTH), 14);
  ctx.fillStyle = vGrad(ctx, barY, 14, [[0, '#ffd968'], [1, GOLD_DEEP]]);
  ctx.fillRect(barX, barY, barW * Math.min(1, state.elapsed / DAY_LENGTH), 14);
  ctx.restore();
  strokeRound(ctx, barX, barY, barW, 14, 7, 'rgba(255, 248, 231, 0.4)', 1.5);
  label(ctx, 'day', barX, barY + 26, { size: 12, align: 'left', colour: '#f3e3b8' });
  label(ctx, 'rush', barX + barW * ((RUSH_START + RUSH_END) / 2 / DAY_LENGTH), barY + 26, { size: 12, colour: '#ff9a86' });
}

/** The counter of ingredient bins: wooden crates, the wanted one lit gold. */
function drawBins(ctx, state, now) {
  const step = nextStep(state);
  INGREDIENTS.forEach((ingredient, index) => {
    const rect = binRect(index);
    const wanted = step !== null && step.id === ingredient.id;
    shadowed(ctx, 5, 3, () => {
      fillRound(ctx, rect.x, rect.y, rect.width, rect.height, 11,
        vGrad(ctx, rect.y, rect.height, [[0, wanted ? '#e09a4e' : '#c07f3e'], [1, wanted ? '#a5662a' : '#8a5522']]));
    });
    if (wanted) {
      ctx.save();
      ctx.shadowColor = 'rgba(246, 185, 59, 0.9)';
      ctx.shadowBlur = 10 + 4 * Math.sin(now * 5);
      strokeRound(ctx, rect.x, rect.y, rect.width, rect.height, 11, GOLD, 3.5);
      ctx.restore();
    }
    strokeRound(ctx, rect.x, rect.y, rect.width, rect.height, 11, OUTLINE, 2);
    ctx.fillStyle = 'rgba(255, 226, 170, 0.28)';
    ctx.fillRect(rect.x + 8, rect.y + 4, rect.width - 16, 4);
    // The ingredient sits on a little round cream board inside its crate.
    ctx.fillStyle = vGrad(ctx, rect.y + 15, 48, [[0, '#fffbe9'], [1, PAPER_DEEP]]);
    ctx.beginPath(); ctx.arc(rect.x + 30, rect.y + 39, 24, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(74, 36, 16, 0.5)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(rect.x + 30, rect.y + 39, 24, 0, Math.PI * 2); ctx.stroke();
    drawIngredientIcon(ctx, ingredient.id, rect.x + 30, rect.y + 39, 19);
    label(ctx, ingredient.binName ?? ingredient.name, rect.x + 58, rect.y + 32, { size: 14.5, align: 'left', colour: '#fff6dc', shadow: true });
    if (ingredient.station !== null) {
      label(ctx, ingredient.station === 'grill' ? '→ GRILL' : '→ POT', rect.x + 58, rect.y + 54, { size: 12, colour: '#ffd9a3', align: 'left' });
    } else if (wanted) {
      label(ctx, 'click me next!', rect.x + 58, rect.y + 54, { size: 12, colour: GOLD, align: 'left' });
    }
  });
}

/** Floating score talk that rises off the order board; a sale bursts into coins. */
function drawFloaters(ctx, state, now) {
  for (const floater of state.floaters) {
    const alpha = Math.max(0, 1 - floater.age / 1.4);
    const riseY = floater.y - floater.age * 34;
    ctx.save();
    ctx.globalAlpha = alpha;
    if (floater.text.startsWith('+$')) {
      for (let coin = 0; coin < 6; coin += 1) {
        const angle = -Math.PI / 2 + (coin - 2.5) * 0.42;
        const spread = 12 + floater.age * 46;
        const coinX = floater.x + Math.cos(angle) * spread;
        const coinY = riseY + 6 + Math.sin(angle) * spread * 0.55 + floater.age * floater.age * 26;
        drawCoin(ctx, coinX, coinY, 7.5 - floater.age * 2);
      }
      drawSparkle(ctx, floater.x - 34, riseY - 8, 7, '#fff3b0', 0.9);
      drawSparkle(ctx, floater.x + 36, riseY - 2, 5.5, '#fff3b0', 0.8);
    }
    ctx.font = `800 24px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 5;
    ctx.strokeText(floater.text, floater.x, riseY);
    ctx.fillStyle = floater.colour;
    ctx.fillText(floater.text, floater.x, riseY);
    ctx.restore();
  }
  void now;
}

/** A five-pointed star, filled with a glow or hollow, for the end-of-day grade. */
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
    ctx.save();
    ctx.shadowColor = 'rgba(246, 185, 59, 0.8)';
    ctx.shadowBlur = 14;
    ctx.fillStyle = vGrad(ctx, cy - s, s * 2, [[0, '#ffd968'], [1, GOLD_DEEP]]);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = OUTLINE;
  } else {
    ctx.fillStyle = '#e8d5a0';
    ctx.fill();
    ctx.strokeStyle = GOLD_DEEP;
  }
  ctx.lineWidth = 2.5;
  ctx.stroke();
}

/** A red paper lantern on a string, the night market's own lamp. */
function drawLantern(ctx, x, topY, now, seed) {
  const sway = Math.sin(now * 1.3 + seed) * 3;
  ctx.strokeStyle = 'rgba(255, 246, 220, 0.5)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x, topY); ctx.lineTo(x + sway, topY + 26); ctx.stroke();
  const cx = x + sway;
  const cy = topY + 48;
  ctx.fillStyle = vGrad(ctx, cy - 22, 44, [[0, '#ff8a5c'], [0.5, '#e0483a'], [1, '#b02a1e']]);
  ctx.beginPath(); ctx.ellipse(cx, cy, 21, 22, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(cx, cy, 21, 22, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(122, 30, 16, 0.6)'; ctx.lineWidth = 1.5;
  for (const dx of [-11, 0, 11]) {
    ctx.beginPath(); ctx.ellipse(cx + dx * 0.4, cy, Math.abs(21 - Math.abs(dx)) * 0.55, 22, 0, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.fillStyle = GOLD;
  ctx.fillRect(cx - 8, cy - 27, 16, 5);
  ctx.fillRect(cx - 8, cy + 22, 16, 5);
  ctx.strokeStyle = GOLD; ctx.lineWidth = 2;
  for (const dx of [-5, 0, 5]) {
    ctx.beginPath(); ctx.moveTo(cx + dx, cy + 27); ctx.lineTo(cx + dx, cy + 38); ctx.stroke();
  }
}

/** The title card: the menu, the rules of the rush, and the way in. */
function drawTitle(ctx, state, now) {
  const shade = ctx.createLinearGradient(0, 0, 0, FIELD.height);
  shade.addColorStop(0, 'rgba(46, 20, 4, 0.86)');
  shade.addColorStop(1, 'rgba(22, 9, 1, 0.93)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  drawLantern(ctx, 108, 0, now, 0.5);
  drawLantern(ctx, 1172, 0, now, 2.4);
  ctx.save();
  ctx.font = `800 64px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(20, 8, 0, 0.6)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 5;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 12;
  ctx.strokeText('SAIGON SIZZLE', 640, 110);
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = vGrad(ctx, 76, 68, [[0, '#ffd968'], [0.6, '#ffb03a'], [1, '#ff7a2e']]);
  ctx.fillText('SAIGON SIZZLE', 640, 110);
  ctx.restore();
  shadowed(ctx, 6, 3, () => {
    fillRound(ctx, 640 - 218, 137, 436, 31, 15, vGrad(ctx, 137, 31, [[0, '#ff7a5c'], [1, RED_DEEP]]));
  });
  strokeRound(ctx, 640 - 218, 137, 436, 31, 15, OUTLINE, 2.5);
  label(ctx, 'a Vietnamese street-food kitchen rush', 640, 153, { size: 20, colour: '#ffffff', shadow: true });
  label(ctx, 'ON THE MENU', 640, 208, { size: 17, colour: '#ff9d5c' });
  RECIPES.forEach((recipe, index) => {
    const y = 240 + index * 41;
    label(ctx, recipe.name, 440, y, { size: 19, align: 'left' });
    label(ctx, `$${recipe.price}`, 860, y, { size: 19, colour: GOLD, align: 'right' });
    label(ctx, recipe.blurb, 440, y + 17, { size: 14, colour: INK.paperShade, align: 'left', weight: 400 });
  });
  label(ctx, 'HOW TO PLAY', 640, 472, { size: 17, colour: '#ff9d5c' });
  const lines = [
    'Click an order ticket, then click ingredient bins in the recipe order to build the plate.',
    'Pork and egg cook on the grill, beef and shrimp in the pot — click them again when they ding,',
    'before they burn. Serve finished plates for the price plus a tip for happy customers.',
    'Keep the streak alive for combo bonuses. Space serves, T trashes the plate, P pauses.',
  ];
  lines.forEach((line, index) => label(ctx, line, 640, 502 + index * 26, { size: 17, colour: INK.cream, weight: 400 }));
  drawChef(ctx, 168, 726, 1.3, now, false);
  chunkyButton(ctx, START_BUTTON, '#ff7a5c', RED_DEEP, 'START THE DAY', { size: 26 });
  void state;
}

/** The end-of-day card: confetti, the grade, the book, and the way back in. */
function drawEnd(ctx, state, now) {
  const shade = ctx.createLinearGradient(0, 0, 0, FIELD.height);
  shade.addColorStop(0, 'rgba(46, 20, 4, 0.88)');
  shade.addColorStop(1, 'rgba(22, 9, 1, 0.94)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  shadowed(ctx, 16, 7, () => {
    fillRound(ctx, 330, 66, 620, 640, 22, vGrad(ctx, 66, 640, [[0, '#fffbe9'], [1, '#f6df9f']]));
  });
  strokeRound(ctx, 330, 66, 620, 640, 22, OUTLINE, 3.5);
  // Confetti over the card: bright paper scraps at hashed spots, mid-fall.
  const confettiColours = ['#e0483a', '#f6b93b', '#5cb84e', '#4aa3df', '#ff8ac2'];
  for (let piece = 0; piece < 42; piece += 1) {
    const px = 330 + hash01(piece * 3 + 1) * 620;
    const fall = (hash01(piece * 7 + 2) * 640 + now * 14 * (0.5 + hash01(piece))) % 660;
    const py = 66 - 20 + fall;
    if (py > 700) continue;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(hash01(piece * 11) * Math.PI + now * 0.4);
    ctx.fillStyle = confettiColours[piece % confettiColours.length];
    ctx.globalAlpha = 0.85;
    ctx.fillRect(-5, -2.5, 10, 5);
    ctx.restore();
  }
  ctx.save();
  ctx.font = `800 54px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 9;
  ctx.strokeText('DAY OVER', 640, 122);
  ctx.fillStyle = vGrad(ctx, 92, 60, [[0, '#ffb03a'], [1, '#ff7a2e']]);
  ctx.fillText('DAY OVER', 640, 122);
  ctx.restore();
  for (let star = 0; star < 3; star += 1) drawStar(ctx, 560 + star * 80, 196, 34, star < state.stars);
  label(ctx, state.stars === 3 ? 'A legendary service!' : state.stars === 2 ? 'A solid day at the stall.' : 'The stall survives to cook again.', 640, 262, { size: 20, colour: 'rgba(44, 26, 14, 0.65)' });
  const rows = [
    ['Money earned', `$${state.money}`],
    ['Dishes served', `${state.served}`],
    ['Customers lost', `${state.lost}`],
    ['Best combo', `×${state.bestCombo}`],
  ];
  rows.forEach(([name, value], index) => {
    const y = 330 + index * 52;
    if (index > 0) {
      ctx.strokeStyle = 'rgba(122, 72, 20, 0.25)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(430, y - 27); ctx.lineTo(850, y - 27); ctx.stroke();
    }
    label(ctx, name, 470, y, { size: 23, align: 'left', colour: INK.ink });
    label(ctx, value, 810, y, { size: 23, colour: GOLD_DEEP, align: 'right' });
  });
  chunkyButton(ctx, AGAIN_BUTTON, '#ff7a5c', RED_DEEP, 'PLAY AGAIN', { size: 25 });
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
  drawFloaters(ctx, state, now);
  if (state.screen === 'title') drawTitle(ctx, state, now);
  if (state.screen === 'end') drawEnd(ctx, state, now);
  if (state.paused && state.screen === 'play') {
    ctx.fillStyle = 'rgba(24, 12, 4, 0.6)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    label(ctx, 'PAUSED', 640, 380, { size: 52, colour: GOLD, shadow: true });
    label(ctx, 'press P to get back to the fire', 640, 430, { size: 20, colour: INK.paperShade });
  }
}
