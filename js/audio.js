// Áudio 100% procedural — sem arquivos, offline.
//   - SFX, ambiente de torcida e trilha de menu: Web Audio API.
//   - Narração: Web Speech API (vozes do sistema), ritmo/altura por tom.
// Naturalidade: um barramento de REVERB (impulso gerado) deixa o som menos
// "seco"/sintético; os tons usam camadas levemente desafinadas (mais quentes)
// e envelopes suaves. Tudo degrada em silêncio se a API faltar.

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

// --- Grafo de áudio ---------------------------------------------------------
let _ctx = null, _master = null, _wet = null, _conv = null, _bgmGain = null, _comp = null, _out = null;

function ctx() {
  if (_ctx) return _ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  _ctx = new AC();

  // Limiter + ganho de compensação no fim da cadeia: sobe o volume percebido
  // sem estourar (essencial no celular, onde o alto-falante é fraco).
  _comp = _ctx.createDynamicsCompressor();
  _comp.threshold.value = -18; _comp.knee.value = 6; _comp.ratio.value = 8;
  _comp.attack.value = 0.003; _comp.release.value = 0.25;
  _out = _ctx.createGain();
  _out.gain.value = 1.9; // makeup
  _comp.connect(_out); _out.connect(_ctx.destination);

  _master = _ctx.createGain();
  _master.gain.value = prefs.som ? 1 : 0;
  _master.connect(_comp);

  // reverb em paralelo (deixa tudo mais espacial/natural)
  _conv = _ctx.createConvolver();
  _conv.buffer = impulso(1.7, 2.6);
  _wet = _ctx.createGain();
  _wet.gain.value = 0.22;
  _master.connect(_conv); _conv.connect(_wet); _wet.connect(_comp);

  // barramento da trilha (mais baixo que os SFX)
  _bgmGain = _ctx.createGain();
  _bgmGain.gain.value = 0.5;
  _bgmGain.connect(_master);

  return _ctx;
}
function destravar() {
  const c = ctx();
  if (c && c.state === 'suspended') c.resume().then(retomarBgmSeDesejado).catch(() => {});
  else retomarBgmSeDesejado();
}

// Impulso de reverb: ruído decaindo exponencialmente.
function impulso(seg, decay) {
  const c = _ctx, len = Math.floor(c.sampleRate * seg);
  const b = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return b;
}

// Tom com envelope suave (ataque/decaimento) — alvo opcional (ex.: _bgmGain).
function tom(freq, t0, dur, { tipo = 'sine', gain = 0.2, glideTo = null, target = null, detune = 0 } = {}) {
  const c = ctx(); if (!c) return;
  const o = c.createOscillator(), g = c.createGain();
  o.type = tipo; o.frequency.setValueAtTime(freq, t0);
  if (detune) o.detune.value = detune;
  if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);
  const atk = Math.min(0.03, dur * 0.25);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + atk);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(target || _master);
  o.start(t0); o.stop(t0 + dur + 0.05);
}

// Nota "quente": duas camadas levemente desafinadas (triangle + sine).
function nota(freq, t0, dur, gain = 0.18, target = null) {
  tom(freq, t0, dur, { tipo: 'triangle', gain, target });
  tom(freq, t0, dur, { tipo: 'sine', gain: gain * 0.55, detune: 7, target });
}

function bufferRuido(seg = 2) {
  const c = ctx(); if (!c) return null;
  const b = c.createBuffer(1, Math.floor(c.sampleRate * seg), c.sampleRate);
  const d = b.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2; }
  return b;
}
function clique(t0, freqBase = 1200, gain = 0.16) {
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
  const blast = (start, dur) => {
    const o = c.createOscillator(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
    o.type = 'square'; o.frequency.value = 2050;
    lfo.frequency.value = 16; lg.gain.value = 55; lfo.connect(lg); lg.connect(o.frequency);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(0.14, start + 0.02);
    g.gain.setValueAtTime(0.14, start + dur - 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g); g.connect(_master);
    lfo.start(start); o.start(start); o.stop(start + dur + 0.02); lfo.stop(start + dur + 0.02);
  };
  blast(t, 0.2); blast(t + 0.28, 0.2);
}

export function gol() {
  const c = ctx(); if (!c) return; const t = c.currentTime;
  const seq = [[523.25, 0], [659.25, 0.11], [783.99, 0.22], [1046.5, 0.36]]; // C E G C, leve síncope
  seq.forEach(([f, dt]) => nota(f, t + dt, 0.2, 0.2));
  [523.25, 659.25, 783.99, 1046.5].forEach((f) => nota(f, t + 0.52, 0.7, 0.1)); // acorde sustentado
}

export function golAdv() {
  const c = ctx(); if (!c) return; const t = c.currentTime;
  [440, 349.23, 261.63].forEach((f, i) => nota(f, t + i * 0.13, 0.3, 0.14)); // descendente, abafado
}

export function dado() {
  const c = ctx(); if (!c) return; const t = c.currentTime;
  // dado assentando: cliques desacelerando + última batida
  [0, 0.06, 0.13, 0.22].forEach((dt, i) => clique(t + dt, 1500 - i * 160, 0.15));
  clique(t + 0.34, 820, 0.18);
}

export function vitoria() {
  const c = ctx(); if (!c) return; const t = c.currentTime;
  const seq = [[392, 0], [523.25, 0.14], [659.25, 0.28], [783.99, 0.46], [1046.5, 0.62]]; // G C E G C
  seq.forEach(([f, dt]) => nota(f, t + dt, 0.26, 0.18));
  [523.25, 659.25, 783.99, 1046.5].forEach((f) => nota(f, t + 0.86, 1.0, 0.1));
}

export function derrota() {
  const c = ctx(); if (!c) return; const t = c.currentTime;
  [392, 349.23, 311.13, 261.63].forEach((f, i) => nota(f, t + i * 0.26, 0.55, 0.14)); // cadência menor lenta
}

export function empate() {
  const c = ctx(); if (!c) return; const t = c.currentTime;
  nota(440, t, 0.32, 0.14); nota(415.3, t + 0.24, 0.45, 0.14);
}

// Apito curto e seco — para quando o árbitro mostra um cartão.
export function apitoCurto() {
  const c = ctx(); if (!c) return; const t = c.currentTime;
  const o = c.createOscillator(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
  o.type = 'square'; o.frequency.value = 2150;
  lfo.frequency.value = 18; lg.gain.value = 50; lfo.connect(lg); lg.connect(o.frequency);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.13, t + 0.015);
  g.gain.setValueAtTime(0.13, t + 0.1);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
  o.connect(g); g.connect(_master);
  lfo.start(t); o.start(t); o.stop(t + 0.16); lfo.stop(t + 0.16);
}

// Veredito do d20: crítico, sucesso, falha ou falha crítica.
export function dadoVeredito(resultado) {
  const c = ctx(); if (!c || !resultado) return; const t = c.currentTime;
  if (resultado.critico) {
    [783.99, 1046.5, 1318.5].forEach((f, i) => nota(f, t + i * 0.07, 0.18, 0.18)); // brilho ascendente
  } else if (resultado.falhaCritica) {
    tom(160, t, 0.45, { tipo: 'sawtooth', gain: 0.18, glideTo: 80 }); // baque grave descendente
  } else if (resultado.sucesso) {
    nota(659.25, t, 0.14, 0.17); nota(987.77, t + 0.1, 0.22, 0.17); // E5 -> B5 (sobe)
  } else {
    nota(440, t, 0.16, 0.14); nota(329.63, t + 0.11, 0.26, 0.14); // A4 -> E4 (desce)
  }
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
    lfo.type = 'sine'; lfo.frequency.value = 0.12; lg.gain.value = 0.03;
    lfo.connect(lg); lg.connect(g.gain);
    src.connect(lp); lp.connect(g); g.connect(_master);
    src.start(); lfo.start();
    _amb = { src, lfo };
  } else if (_amb) {
    try { _amb.src.stop(); _amb.lfo.stop(); } catch { /* já parado */ }
    _amb = null;
  }
}

// --- Trilha de menu (procedural, loop) -------------------------------------
// Progressão I–V–vi–IV em Dó (clássica, esperançosa), pad suave + arpejo leve.
const BGM_PROG = [
  [130.81, 164.81, 196.00], // C3  E3  G3
  [196.00, 246.94, 293.66], // G3  B3  D4
  [220.00, 261.63, 329.63], // A3  C4  E4
  [174.61, 220.00, 261.63], // F3  A3  C4
];
const BGM_BAR = 2.6;
let _bgmTimer = null, _bgmStep = 0, _bgmOn = false, _bgmDesejado = false;

function tocarCompasso() {
  const c = ctx(); if (!c) return;
  const t = c.currentTime + 0.05;
  const acorde = BGM_PROG[_bgmStep % BGM_PROG.length];
  acorde.forEach((f) => nota(f, t, BGM_BAR * 0.95, 0.05, _bgmGain));          // pad
  acorde.forEach((f, i) => tom(f * 2, t + i * 0.5, 0.5, { tipo: 'sine', gain: 0.035, target: _bgmGain })); // arpejo
  tom(acorde[0] * 2, t + BGM_BAR * 0.5, 0.4, { tipo: 'sine', gain: 0.03, target: _bgmGain }); // contratempo
  _bgmStep++;
}
function iniciarBgm() {
  if (_bgmOn) return;
  _bgmOn = true; _bgmStep = 0;
  tocarCompasso();
  _bgmTimer = setInterval(tocarCompasso, BGM_BAR * 1000);
}
function pararBgm() {
  _bgmOn = false;
  if (_bgmTimer) { clearInterval(_bgmTimer); _bgmTimer = null; }
}
function retomarBgmSeDesejado() {
  const c = _ctx;
  if (_bgmDesejado && !_bgmOn && c && c.state === 'running') iniciarBgm();
}
export function bgmMenu(on) {
  _bgmDesejado = !!on;
  const c = ctx(); if (!c) return;
  if (on) { if (c.state === 'running') iniciarBgm(); /* senão, começa no 1º gesto */ }
  else pararBgm();
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
  if (_master) _master.gain.value = prefs.som ? 1 : 0;
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
  const unlock = () => { destravar(); window.removeEventListener('pointerdown', unlock); };
  if (typeof window !== 'undefined') window.addEventListener('pointerdown', unlock, { once: true });
}

export function estado() { return { ...prefs }; }
