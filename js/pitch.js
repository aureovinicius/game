// Radar 2D animado da partida — "caminho B cosmético".
//
// Roda uma mini-simulação contínua (jogadores com física simples: busca-alvo,
// inércia e separação; bola com posse e passes) só para dar VIDA à tela. O
// PLACAR é do motor (cabeçalho do jogo), não daqui — então a rede só balança
// quando o motor manda (`evento({tipo:'gol-meu'})`). Os chutes da mini-sim
// nunca viram gol sozinhos; o fluxo (ataque/defesa) é enviesado pela zona do
// lance e pelo momentum. Tudo offline, sem custo.
//
//   Pitch.montar(host, { cores });   // cores: { meu:{fill,borda}, adv:{fill,borda} }
//   Pitch.evento(ev, estado);        // reage aos eventos do motor
//   Pitch.destruir();                // para o rAF ao sair da partida

// Coordenadas em 0–100 nos dois eixos (mesmo espaço das marcações, que usam
// preserveAspectRatio="none" — por isso bolinhas e linhas sempre se alinham).
const BASE_MEU = [[6, 50], [22, 20], [22, 40], [22, 60], [22, 80], [42, 30], [42, 50], [42, 70], [60, 25], [60, 50], [60, 75]];
const BASE_ADV = [[94, 50], [78, 20], [78, 40], [78, 60], [78, 80], [58, 30], [58, 50], [58, 70], [40, 25], [40, 50], [40, 75]];

const MARCACOES = `<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
  <g fill="none" stroke="rgba(255,255,255,.55)" stroke-width="1" vector-effect="non-scaling-stroke">
    <rect x="1.5" y="2" width="97" height="96"/>
    <line x1="50" y1="2" x2="50" y2="98"/>
    <ellipse cx="50" cy="50" rx="7" ry="11"/>
    <rect x="1.5" y="24" width="14" height="52"/><rect x="84.5" y="24" width="14" height="52"/>
    <rect x="1.5" y="38" width="5" height="24"/><rect x="93.5" y="38" width="5" height="24"/>
  </g>
  <g fill="rgba(255,255,255,.7)" stroke="none">
    <ellipse cx="50" cy="50" rx="0.7" ry="1.1"/><ellipse cx="10" cy="50" rx="0.6" ry="0.9"/><ellipse cx="90" cy="50" rx="0.6" ry="0.9"/>
  </g>
  <g fill="rgba(255,255,255,.25)" stroke="none">
    <rect x="-0.5" y="42" width="2" height="16"/><rect x="98.5" y="42" width="2" height="16"/>
  </g>
</svg>`;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const D = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

let R = null; // estado do radar atual (um por vez)

export function montar(host, cfg = {}) {
  destruir();
  const cores = cfg.cores || { meu: { fill: '#f2c14e', borda: '#8a6a16' }, adv: { fill: '#e5564b', borda: '#7a201a' } };
  host.innerHTML = `<div class="pitch-radar" id="pitch-radar">${MARCACOES}
    <div class="pitch-flash" id="pitch-flash"></div><div class="pitch-big" id="pitch-big"></div></div>`;
  const campo = host.querySelector('#pitch-radar');

  const players = [];
  const mk = (cor) => {
    const d = document.createElement('div');
    d.className = 'pitch-dot';
    d.style.background = cor.fill; d.style.borderColor = cor.borda;
    campo.appendChild(d); return d;
  };
  BASE_MEU.forEach((p, i) => players.push({ team: 'm', idx: i, bx: p[0], by: p[1], x: p[0], y: p[1], vx: 0, vy: 0, gk: i === 0, el: mk(cores.meu) }));
  BASE_ADV.forEach((p, i) => players.push({ team: 'a', idx: i, bx: p[0], by: p[1], x: p[0], y: p[1], vx: 0, vy: 0, gk: i === 0, el: mk(cores.adv) }));
  const ballEl = document.createElement('div'); ballEl.className = 'pitch-ball'; campo.appendChild(ballEl);

  R = {
    host, campo, players, ballEl,
    ball: { x: 50, y: 50, owner: null, state: 'held', tx: 50, ty: 50, shot: false },
    flash: host.querySelector('#pitch-flash'), big: host.querySelector('#pitch-big'),
    flowBias: 0,            // -1 defendo / +1 ataco (vem da zona/momentum)
    actionAt: 0, t: 0, last: 0, raf: null, lock: false,
  };
  saque(R, 'm');
  R.raf = requestAnimationFrame(passo);
}

const team = (t) => R.players.filter((p) => p.team === t);
function nearestOpp(t, x, y) { let best = null, bd = 1e9; team(t === 'm' ? 'a' : 'm').forEach((p) => { const d = D(p.x, p.y, x, y); if (d < bd) { bd = d; best = p; } }); return { p: best, d: bd }; }

function saque(r, toTeam) {
  r.players.forEach((p) => { p.x = p.bx; p.y = p.by; p.vx = p.vy = 0; });
  const mid = r.players.find((p) => p.team === toTeam && p.idx === 6);
  r.ball.owner = mid; r.ball.state = 'held'; r.ball.x = mid.x; r.ball.y = mid.y; r.ball.shot = false;
  r.actionAt = r.t + 0.8; r.lock = false;
}

function step(dt) {
  const r = R;
  const b = r.ball;
  const dir = b.owner ? (b.owner.team === 'm' ? 1 : -1) : 0;
  const flow = (b.x - 50) + r.flowBias * 14;
  const presser = b.owner ? nearestOpp(b.owner.team, b.x, b.y).p : null;

  r.players.forEach((p) => {
    let tx, ty;
    if (p === b.owner) { tx = b.x + dir * 1.2; ty = b.y; }
    else if (p.gk) { tx = p.bx; ty = clamp(50 + (b.y - 50) * 0.35, 38, 62); }
    else if (p === presser) { tx = b.x; ty = b.y; }
    else { tx = clamp(p.bx + flow * 0.4, 3, 97); ty = clamp(p.by + (b.y - 50) * 0.12, 5, 95); }
    let sx = 0, sy = 0;
    team(p.team).forEach((q) => { if (q !== p) { const d = D(p.x, p.y, q.x, q.y); if (d < 5 && d > 0.01) { sx += (p.x - q.x) / d; sy += (p.y - q.y) / d; } } });
    const k = p === b.owner ? 3.4 : 2.6;
    p.vx += ((tx - p.x) * k + sx * 6 - p.vx * 4) * dt;
    p.vy += ((ty - p.y) * k + sy * 6 - p.vy * 4) * dt;
    const sp = Math.hypot(p.vx, p.vy), mx = p.gk ? 14 : 26; if (sp > mx) { p.vx *= mx / sp; p.vy *= mx / sp; }
    p.x = clamp(p.x + p.vx * dt, 2, 98); p.y = clamp(p.y + p.vy * dt, 3, 97);
  });

  if (r.lock) return; // gol em andamento: bola controlada pela animação

  if (b.state === 'held' && b.owner) {
    b.x = b.owner.x + dir * 1.2; b.y = b.owner.y;
    if (r.t >= r.actionAt) decide();
  } else if (b.state === 'travel') {
    const d = D(b.x, b.y, b.tx, b.ty), spd = b.shot ? 95 : 62, mv = spd * dt;
    if (d <= mv) { b.x = b.tx; b.y = b.ty; arrive(); }
    else { b.x += (b.tx - b.x) / d * mv; b.y += (b.ty - b.y) / d * mv; }
  }
}

function decide() {
  const r = R, o = r.ball.owner, dir = o.team === 'm' ? 1 : -1, goalX = o.team === 'm' ? 98 : 2;
  const finalThird = o.team === 'm' ? o.x > 70 : o.x < 30;
  // chute ambiente: NUNCA vira gol — é sempre afastado/defendido (placar é do motor)
  if (finalThird && D(o.x, o.y, goalX, 50) < 34 && Math.random() < 0.4) {
    r.ball.state = 'travel'; r.ball.shot = true; r.ball.tx = goalX; r.ball.ty = clamp(50 + (Math.random() - 0.5) * 24, 32, 68);
    r.ball.owner = null; return;
  }
  const mates = team(o.team).filter((p) => p !== o && !p.gk)
    .map((p) => ({ p, fwd: (p.x - o.x) * dir, d: D(o.x, o.y, p.x, p.y) }))
    .filter((m) => m.d < 42).sort((a, b) => b.fwd - a.fwd);
  const target = (mates[Math.floor(Math.random() * Math.min(4, mates.length))] || { p: o }).p;
  r.ball.shot = false;
  const mx = (o.x + target.x) / 2, my = (o.y + target.y) / 2, opp = nearestOpp(o.team, mx, my);
  const pend = (opp.d < 6 || Math.random() < 0.12) ? opp.p : target; // interceptação / perda
  r.ball.state = 'travel'; r.ball.tx = target.x; r.ball.ty = target.y; r.ball._to = pend; r.ball.owner = null;
}

function arrive() {
  const r = R, b = r.ball;
  if (b.shot) { // chute ambiente afastado (sem gol)
    const def = b.tx > 50 ? 'a' : 'm', gk = r.players.find((p) => p.team === def && p.gk);
    b.state = 'held'; b.owner = gk; b.shot = false; r.actionAt = r.t + 0.7; return;
  }
  b.owner = b._to; b.state = 'held'; r.actionAt = r.t + (0.7 + Math.random() * 0.7);
}

function flashBig(txt, ms) {
  R.big.textContent = txt; R.big.style.opacity = '1'; R.big.style.transform = 'translate(-50%,-50%) scale(1)';
  setTimeout(() => { R.big.style.opacity = '0'; R.big.style.transform = 'translate(-50%,-50%) scale(.6)'; }, ms);
}

function draw() {
  R.players.forEach((p) => { p.el.style.left = p.x + '%'; p.el.style.top = p.y + '%'; });
  R.ballEl.style.left = R.ball.x + '%'; R.ballEl.style.top = R.ball.y + '%';
}

function passo(ts) {
  if (!R) return;
  const dt = Math.min(0.05, ((ts - R.last) || 16) / 1000); R.last = ts; R.t += dt;
  step(dt); draw();
  R.raf = requestAnimationFrame(passo);
}

// Reage a um evento do motor (cosmético).
export function evento(ev, estado) {
  if (!R || !ev) return;
  const tipo = ev.tipo;
  const zona = (estado && estado.pendingLance && estado.pendingLance.zona) || ev.zona;
  if (tipo === 'gol-meu') return golForcado('m');
  if (tipo === 'gol-adv') return golForcado('a');
  // viés de fluxo pela zona do lance / momentum
  if (zona === 'atk') R.flowBias = 1;
  else if (zona === 'def') R.flowBias = -1;
  else if (zona === 'meio') R.flowBias = 0;
  if (estado && typeof estado.momentum === 'number') R.flowBias = clamp(R.flowBias + estado.momentum / 200, -1.4, 1.4);
  // cartão: pisca o campo de leve
  if (typeof ev.texto === 'string' && /🟥/.test(ev.texto)) { R.flash.style.opacity = '0.3'; setTimeout(() => { if (R) R.flash.style.opacity = '0'; }, 200); }
}

// Gol de verdade: leva a bola até a rede certa, comemora e recomeça do meio.
function golForcado(quem) {
  const r = R; r.lock = true; r.ball.owner = null; r.ball.shot = false;
  const goalX = quem === 'm' ? 99 : 1;
  r.ball.state = 'held';
  r.ball.tx = goalX; r.ball.ty = 50;
  const anim = setInterval(() => { if (!R) { clearInterval(anim); return; } const b = r.ball; b.x += (goalX - b.x) * 0.35; b.y += (50 - b.y) * 0.35; }, 16);
  setTimeout(() => { clearInterval(anim); }, 420);
  r.flash.style.opacity = '0.55'; setTimeout(() => { if (R) R.flash.style.opacity = '0'; }, 450);
  flashBig('G O L !', 1300);
  setTimeout(() => { if (R) saque(R, quem === 'm' ? 'a' : 'm'); }, 1500);
}

export function destruir() {
  if (R && R.raf) cancelAnimationFrame(R.raf);
  R = null;
}

export function montado() { return !!R; }

// Hook de teste: avança a simulação um quadro manualmente (rAF não roda em
// preview headless). Não usado em produção — o rAF é o motor real.
export function _tick(dt = 0.05) { if (!R) return null; R.t += dt; step(dt); draw(); return { ball: { ...R.ball, owner: R.ball.owner ? R.ball.owner.team + R.ball.owner.idx : null } }; }
