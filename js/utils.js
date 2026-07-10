'use strict';
// ─── Genel yardımcılar ───────────────────────────────────────
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = arr => arr[(Math.random() * arr.length) | 0];
const dist2 = (x1, y1, x2, y2) => { const dx = x2 - x1, dy = y2 - y1; return dx * dx + dy * dy; };

// Deterministik 2B hash (zemin/dekor yerleşimi için)
function hash2(x, y, s) {
  s = s || 0;
  let h = (x * 374761393 + y * 668265263 + s * 1442695041) | 0;
  h = ((h ^ (h >>> 13)) * 1274126177) | 0;
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}

// Tam ekran: mobilde adres çubuğunu gizler, ekran kaymasını bitirir.
// Kullanıcı dokunuşundan çağrılmalı (tarayıcı şartı).
function goFullscreen() {
  try {
    if (typeof Game !== 'undefined') Game.fsT = Game.uiT;   // blur-mola koruması
    const el = document.documentElement;
    if (document.fullscreenElement || document.webkitFullscreenElement) return;
    const fn = el.requestFullscreen || el.webkitRequestFullscreen;
    if (fn) {
      const r = fn.call(el);
      if (r && r.catch) r.catch(() => {});
    }
    // Android: yatay kilitle (tam ekranda çalışır)
    if (screen.orientation && screen.orientation.lock) {
      screen.orientation.lock('landscape').catch(() => {});
    }
  } catch (e) { /* iOS gibi desteklemeyenlerde sessizce geç */ }
}

function isFullscreen() {
  return !!(document.fullscreenElement || document.webkitFullscreenElement);
}

function exitFullscreen() {
  try {
    const fn = document.exitFullscreen || document.webkitExitFullscreen;
    if (fn) { const r = fn.call(document); if (r && r.catch) r.catch(() => {}); }
  } catch (e) {}
}

function fmtTime(t) {
  t = Math.max(0, Math.floor(t));
  const s = t % 60;
  if (t >= 3600) {
    const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60);
    return h + ':' + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }
  const m = Math.floor(t / 60);
  return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
}

// Monospace piksel font için satır sarma (karakter sayısına göre)
function wrapText(txt, maxChars) {
  const words = String(txt).split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    if (cur.length === 0) cur = w;
    else if (cur.length + 1 + w.length <= maxChars) cur += ' ' + w;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}

// ─── Renk paleti (Endesga-32 temelli, tutarlı piksel art paleti) ───
const COL = {
  outline:   '#181425',
  navyDark:  '#262b44',
  navy:      '#3a4466',
  greyDark:  '#5a6988',
  grey:      '#8b9bb4',
  greyLight: '#c0cbdc',
  white:     '#f4f4f8',
  skin:      '#f2c088',
  skinShade: '#cf8f5e',
  skinAlt:   '#e4a672',
  brown:     '#b86f50',
  brownDark: '#743f39',
  hairDark:  '#3e2731',
  red:       '#e43b44',
  redDark:   '#9e2835',
  pink:      '#f6757a',
  orange:    '#f77622',
  orangeDark:'#cf5410',
  gold:      '#feae34',
  yellow:    '#fee761',
  green:     '#63c74d',
  greenDark: '#3e8948',
  greenDeep: '#265c42',
  teal:      '#2ce8f5',
  cyan:      '#0099db',
  blueDark:  '#124e89',
  purple:    '#b55088',
  purpleDark:'#68386c'
};
