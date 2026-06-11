// Áudio 100% procedural — sem arquivos, offline.
//   - SFX e ambiente de torcida: Web Audio API (osciladores + ruído).
//   - Narração: Web Speech API (vozes do sistema), ritmo/altura por tom.
// Tudo degrada em silêncio se a API não existir. Preferências (som/narração)
// ficam no localStorage e há um controle flutuante (🔊 / 🗣️).

const PREFS_KEY = 'cronicas-da-copa:audio:v1';
const prefs = carregarPrefs();

function carregarPrefs() {
  const base = { som: true, narracao: true, volume: 0.8 };
  try { return { ...base, ...(JSON.parse(localStorage.getItem(PREFS_KEY)) || {}) }; }
  catch { return base; }
}
function salvarPrefs() {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch { /* quota */ }
}

// --- Web Audio --------------------------------------------------------------
let _ctx = null, _master = null;
function ctx() {
  if (_ctx) return _ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  _ctx = new AC();
  _master = _ctx.createGain();
  _master.gain.value = prefs.som ? prefs.volume : 0;
  _master.connect(_ctx.destination);
  return _ctx;
}
function destravar() {
  const c = ctx();
  if (c && c.state === 'suspended') c.resume().catch(() => {});
}

// Tom simples com envelope (ataque rápido, decaimento exponencial).
function tom(freq, t0, dur, { tipo = 'sine', gain = 0.2, glideTo = null } = {}) {
  const c = ctx(); if (!c) return;
  const o = c.createOscillator(), g = c.createGain();
  o.type = tipo;
  o.frequency.setValueAtTime(freq, t0);
  if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(_master);
  o.start(t0); o.stop(t0 + dur + 0.03);
}

// Ruído "marrom" (grave, tipo torcida) reutilizável.
function bufferRuido(seg = 2) {
  const c = ctx(); if (!c) return null;
  const b = c.createBuffer(1, Math.floor(c.sampleRate * seg), c.sampleRate);
  const d = b.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) {
    const w = Math.random() * 2 - 1;
    last = (last + 0.02 * w) / 1.02;
    d[i] = last * 3.2;
  }
  return b;
}
function clique(t0, freqBase = 1200, gain = 0.18) {
  const c = ctx(); if (!c) return;
  const src = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain();
  src.buffer = bufferRuido(0.05);
  bp.type = 'bandpass'; bp.frequency.value = freqBase; bp.Q.value = 1.2;
  g.gain.setValueAtTime(gain, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.06);
  src.connect(bp); bp.connect(g); g.connect(_master);
  src.start(t0); src.stop(t0 + 0.07);
}

// --- SFX --------------------------------------------------------------------
export function apito() {
  const c = ctx(); if (!c) return; const t = c.currentTime;
  const blast = (start) => {
    const o = c.createOscillator(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
    o.type = 'square'; o.frequency.value = 2050;
    lfo.frequency.value = 16; lg.gain.value = 55; lfo.connect(lg); lg.connect(o.frequency);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(0.16, start + 0.02);
    g.gain.setValueAtTime(0.16, start + 0.16);
    g.gain.exponentialRampToValueAtTime(0.0001, start + 0.2);
    o.connect(g); g.connect(_master);
    lfo.start(start); o.start(start); o.stop(start + 0.22); lfo.stop(start + 0.22);
  };
  blast(t); blast(t + 0.28);
}

export function gol() {
  const c = ctx(); if (!c) return; const t = c.currentTime;
  const notas = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
  notas.forEach((f, i) => tom(f, t + i * 0.09, 0.18, { tipo: 'triangle', gain: 0.22 }));
  // acorde sustentado de comemoração
  [523.25, 659.25, 783.99].forEach((f) => tom(f, t + 0.42, 0.5, { tipo: 'sawtooth', gain: 0.12 }));
}

export function golAdv() {
  const c = ctx(); if (!c) return; const t = c.currentTime;
  const notas = [440, 349.23, 261.63]; // A4 F4 C4 (descendente)
  notas.forEach((f, i) => tom(f, t + i * 0.12, 0.26, { tipo: 'sine', gain: 0.16 }));
}

export function dado() {
  const c = ctx(); if (!c) return; const t = c.currentTime;
  clique(t, 1400); clique(t + 0.08, 1100); clique(t + 0.17, 900); // dado assentando
}

export function vitoria() {
  const c = ctx(); if (!c) return; const t = c.currentTime;
  const fanfarra = [523.25, 659.25, 783.99, 1046.5, 1318.5]; // C E G C E
  fanfarra.forEach((f, i) => tom(f, t + i * 0.12, 0.24, { tipo: 'triangle', gain: 0.2 }));
  [523.25, 659.25, 783.99, 1046.5].forEach((f) => tom(f, t + 0.7, 0.9, { tipo: 'sawtooth', gain: 0.12 }));
}

export function derrota() {
  const c = ctx(); if (!c) return; const t = c.currentTime;
  const notas = [392, 349.23, 311.13, 261.63]; // G F D#? cadência menor descendente
  notas.forEach((f, i) => tom(f, t + i * 0.22, 0.5, { tipo: 'sine', gain: 0.16 }));
}

export function empate() {
  const c = ctx(); if (!c) return; const t = c.currentTime;
  tom(440, t, 0.3, { tipo: 'sine', gain: 0.16 });
  tom(415.3, t + 0.22, 0.4, { tipo: 'sine', gain: 0.16 });
}

// --- Ambiente de torcida (loop) --------------------------------------------
let _amb = null;
export function ambiente(ligar) {
  const c = ctx(); if (!c) return;
  if (ligar) {
    if (_amb) return;
    const src = c.createBufferSource(), lp = c.createBiquadFilter(), g = c.createGain();
    const lfo = c.createOscillator(), lg = c.createGain();
    src.buffer = bufferRuido(3); src.loop = true;
    lp.type = 'lowpass'; lp.frequency.value = 760;
    g.gain.value = 0.06;
    lfo.type = 'sine'; lfo.frequency.value = 0.12; lg.gain.value = 0.03; // swell lento
    lfo.connect(lg); lg.connect(g.gain);
    src.connect(lp); lp.connect(g); g.connect(_master);
    src.start(); lfo.start();
    _amb = { src, lfo };
  } else if (_amb) {
    try { _amb.src.stop(); _amb.lfo.stop(); } catch { /* já parado */ }
    _amb = null;
  }
}

// --- Narração (Web Speech) --------------------------------------------------
let _voz = null;
function escolherVoz() {
  if (!('speechSynthesis' in window)) return;
  const vs = speechSynthesis.getVoices();
  _voz = vs.find((v) => /pt[-_]br/i.test(v.lang)) || vs.find((v) => /^pt/i.test(v.lang)) || null;
}
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  escolherVoz();
  speechSynthesis.onvoiceschanged = escolherVoz;
}
export function narrar(texto, { tom: t = 'realista' } = {}) {
  if (!prefs.narracao || !('speechSynthesis' in window) || !texto) return;
  const u = new SpeechSynthesisUtterance(String(texto));
  u.lang = 'pt-BR';
  if (_voz) u.voice = _voz;
  u.rate = t === 'epico' ? 0.94 : t === 'comico' ? 1.1 : 1.0;
  u.pitch = t === 'epico' ? 0.9 : t === 'comico' ? 1.12 : 1.0;
  try { speechSynthesis.cancel(); speechSynthesis.speak(u); } catch { /* ignore */ }
}
export function pararNarracao() {
  if ('speechSynthesis' in window) { try { speechSynthesis.cancel(); } catch { /* ignore */ } }
}

// --- Preferências + controles flutuantes ------------------------------------
export function setSom(v) {
  prefs.som = !!v; salvarPrefs();
  if (_master) _master.gain.value = prefs.som ? prefs.volume : 0;
  atualizarControles();
}
export function setNarracao(v) {
  prefs.narracao = !!v; salvarPrefs();
  if (!prefs.narracao) pararNarracao();
  atualizarControles();
}

function atualizarControles() {
  const s = document.getElementById('ac-som');
  const n = document.getElementById('ac-narr');
  if (s) { s.textContent = prefs.som ? '🔊' : '🔇'; s.setAttribute('aria-pressed', String(prefs.som)); s.title = prefs.som ? 'Som ligado' : 'Som desligado'; }
  if (n) { n.textContent = prefs.narracao ? '🗣️' : '🤐'; n.setAttribute('aria-pressed', String(prefs.narracao)); n.title = prefs.narracao ? 'Narração ligada' : 'Narração desligada'; }
}

function montarControles() {
  if (typeof document === 'undefined' || document.getElementById('audio-ctrl')) return;
  const bar = document.createElement('div');
  bar.id = 'audio-ctrl';
  bar.style.cssText = 'position:fixed;right:10px;bottom:10px;z-index:9999;display:flex;gap:6px;';
  const botao = (id, onClick) => {
    const b = document.createElement('button');
    b.id = id; b.type = 'button';
    b.style.cssText = 'width:40px;height:40px;border-radius:50%;border:1px solid rgba(255,255,255,.25);background:rgba(20,24,34,.85);color:#fff;font-size:18px;cursor:pointer;line-height:1;';
    b.addEventListener('click', () => { destravar(); onClick(); });
    return b;
  };
  bar.appendChild(botao('ac-som', () => setSom(!prefs.som)));
  bar.appendChild(botao('ac-narr', () => setNarracao(!prefs.narracao)));
  document.body.appendChild(bar);
  atualizarControles();
}

export function init() {
  montarControles();
  // destrava o áudio no primeiro gesto (exigência de iOS/navegadores)
  const unlock = () => { destravar(); window.removeEventListener('pointerdown', unlock); };
  if (typeof window !== 'undefined') window.addEventListener('pointerdown', unlock, { once: true });
}

export function estado() { return { ...prefs }; }
