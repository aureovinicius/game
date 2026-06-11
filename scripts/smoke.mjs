// Smoke test do núcleo (sem navegador): simula partidas completas usando o
// motor, o dado e as regras, e checa invariantes. Uso: node scripts/smoke.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { montarAtributos } from '../js/rules.js';
import { criarPartida, bonusEloJogador } from '../js/engine.js';
import { rolar, modificador, criarRng } from '../js/dice.js';
import { novasConquistas } from '../js/achievements.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(resolve(__dirname, '..', 'data', 'teams-2026.json'), 'utf8'));
const teams = data.teams;

let falhas = 0;
function ok(cond, msg) { if (!cond) { falhas++; console.error('  ✗', msg); } }

function jogarUma(classeId, semente) {
  const attrs = montarAtributos(classeId, 'base');
  const meu = teams[semente % teams.length];
  const adv = teams[(semente * 7 + 3) % teams.length];
  if (adv.id === meu.id) return jogarUma(classeId, semente + 1);
  const eng = criarPartida({
    meuTime: meu, advTime: adv, classeId, attrs,
    fase: 'grupos', mataMata: false, mando: 'neutro', semente,
  });
  const rng = criarRng(semente + 99);
  let guard = 0;
  while (!eng.estado.encerrada && guard++ < 50) {
    const passo = eng.avancar();
    if (passo.tipo === 'lance') {
      const opcoes = eng.opcoesPadrao();
      const op = opcoes[Math.floor(rng() * opcoes.length)];
      const r = rolar(modificador(attrs[op.stat]), op.cd, { rng });
      eng.resolverLance(op, r);
    }
  }
  const e = eng.estado;
  ok(e.encerrada, 'partida encerra');
  ok(e.minuto === 90, `minuto final = 90 (foi ${e.minuto})`);
  ok(e.golsMeu >= 0 && e.golsAdv >= 0, 'placar não-negativo');
  ok(e.golsJogador <= e.golsMeu, `gols do jogador (${e.golsJogador}) <= gols do time (${e.golsMeu})`);
  ok(e.lancesUsados >= 4 && e.lancesUsados <= 8, `lances usados 4..8 (foram ${e.lancesUsados})`);
  ok(e.lancesRestantes >= 0, 'lances restantes >= 0');
  ok(e.arbitro.rigor >= -2 && e.arbitro.rigor <= 2, 'rigor do árbitro -2..2');
  ok(eng.notaJogador() >= 3 && eng.notaJogador() <= 10, 'nota 3..10');
  return { meu, adv, e, nota: eng.notaJogador(), bonus: bonusEloJogador(classeId, attrs) };
}

console.log('Smoke test — Crônicas da Copa');
const classes = ['goleiro', 'zagueiro', 'lateral', 'volante', 'meia', 'ponta', 'centroavante'];
let golsCA = 0, golsGK = 0;
for (let s = 1; s <= 200; s++) {
  const classe = classes[s % classes.length];
  const r = jogarUma(classe, s);
  if (classe === 'centroavante') golsCA += r.e.golsJogador;
  if (classe === 'goleiro') golsGK += r.e.golsJogador;
}
console.log('Exemplo de partida:');
const ex = jogarUma('centroavante', 42);
console.log(`  ${ex.meu.tla} ${ex.e.golsMeu}–${ex.e.golsAdv} ${ex.adv.tla} | seus gols: ${ex.e.golsJogador}, assist: ${ex.e.assistJogador}, nota: ${ex.nota}, bônus Elo: ${ex.bonus}`);

ok(golsCA > golsGK, `centroavantes marcam mais que goleiros (CA=${golsCA}, GK=${golsGK})`);

// Técnico (modo manager): decide nos gatilhos e nunca marca gol próprio.
let decTec = 0, partidasTec = 0;
for (let s = 300; s <= 340; s++) {
  const attrs = montarAtributos('tecnico', 'base');
  const meu = teams[s % teams.length];
  let adv = teams[(s * 7 + 3) % teams.length];
  if (adv.id === meu.id) adv = teams[(s + 1) % teams.length];
  const eng = criarPartida({ meuTime: meu, advTime: adv, classeId: 'tecnico', attrs, fase: 'semi', mataMata: true, mando: 'neutro', semente: s });
  const rng = criarRng(s + 7);
  let g = 0;
  while (!eng.estado.encerrada && g++ < 80) {
    const passo = eng.avancar();
    if (passo.tipo === 'lance') {
      const ops = eng.opcoesPadrao();
      const op = ops[Math.floor(rng() * ops.length)];
      eng.resolverLance(op, rolar(modificador(attrs[op.stat]), op.cd, { rng }));
    }
  }
  const e = eng.estado;
  ok(e.encerrada && e.minuto === 90, 'técnico: partida encerra em 90');
  ok(e.golsJogador === 0, `técnico não marca gol próprio (foi ${e.golsJogador})`);
  ok(eng.notaJogador() >= 3 && eng.notaJogador() <= 10, 'técnico: nota 3..10');
  decTec += e.lancesUsados; partidasTec++;
}
ok(decTec / partidasTec >= 3, `técnico decide em média >= 3 vezes (média ${(decTec / partidasTec).toFixed(1)})`);

// conquistas: primeiro gol dispara quando há gol
const ctx = { classe: 'centroavante', carreira: { gols: 1, assist: 0, jogos: 1, vitorias: 1, golsSofridos: 0, cleanSheets: 0, maiorGoleada: 1, hatTricks: 0, zebras: 0, fase: 'grupos', campeao: false, vice: false }, ultimaPartida: {} };
const novas = novasConquistas(ctx, []);
ok(novas.includes('primeiro_gol'), 'conquista "primeiro_gol" dispara com 1 gol');

console.log(falhas === 0 ? '\n✅ Todos os invariantes passaram.' : `\n❌ ${falhas} falha(s).`);
process.exit(falhas ? 1 : 0);
