// Cores de uniforme por seleção (data/kits.json). Decide a cor da bolinha de
// cada time no radar e resolve o conflito de cores: o protagonista veste o 1º
// uniforme; o adversário troca para o 2º (ou um neutro) se a cor bater.
//
//   await carregarKits();
//   resolverCores(meuTla, advTla) -> { meu:{fill,borda}, adv:{fill,borda} }

let KITS = null;

export async function carregarKits() {
  if (KITS) return KITS;
  try {
    const r = await fetch('data/kits.json', { cache: 'force-cache' });
    if (r.ok) { const j = await r.json(); KITS = j.kits || j; }
  } catch { /* usa fallback */ }
  if (!KITS) KITS = {};
  return KITS;
}
export function setKits(obj) { KITS = obj && (obj.kits || obj); }

// --- utilidades de cor ------------------------------------------------------
function hexRgb(h) {
  const s = String(h || '').replace('#', '');
  const n = s.length === 3 ? s.split('').map((c) => c + c).join('') : s;
  const v = parseInt(n || '888888', 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}
function rgbHex([r, g, b]) {
  const c = (x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}
function lum([r, g, b]) { return (0.299 * r + 0.587 * g + 0.114 * b) / 255; }
function mix(a, b, t) { return a.map((x, i) => x + (b[i] - x) * t); }
function dist(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); }

// Borda da bolinha: escurece cores claras, clareia cores escuras (sempre
// contrastando com o preenchimento e visível sobre o gramado).
export function borda(fill) {
  const rgb = hexRgb(fill);
  return rgbHex(lum(rgb) < 0.3 ? mix(rgb, [255, 255, 255], 0.45) : mix(rgb, [0, 0, 0], 0.42));
}

function kit(tla) { return (KITS && KITS[tla]) || { p: '#8a8a8a', s: '#dddddd' }; }
const LIMIAR = 112; // distância mínima entre as cores dos dois times

// Decide as cores do meu time (protagonista, 1º uniforme) e do adversário,
// trocando o adversário para o 2º uniforme — ou um neutro — se houver conflito.
export function resolverCores(meuTla, advTla) {
  const meuFill = kit(meuTla).p;
  const a = kit(advTla);
  let advFill = a.p;
  if (dist(hexRgb(advFill), hexRgb(meuFill)) < LIMIAR) advFill = a.s;
  if (dist(hexRgb(advFill), hexRgb(meuFill)) < LIMIAR) {
    advFill = lum(hexRgb(meuFill)) > 0.5 ? '#1f2a44' : '#f2f2f2'; // neutro contrastante
  }
  return {
    meu: { fill: meuFill, borda: borda(meuFill) },
    adv: { fill: advFill, borda: borda(advFill) },
  };
}
