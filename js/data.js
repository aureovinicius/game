// Carrega e indexa as 48 seleções da Copa 2026 (data/teams-2026.json).
// Usa Elo como "força" no motor de partida. Localiza os nomes das seleções
// conforme o idioma (data/selecoes-i18n.json), pronto para outros idiomas.
import { IDIOMA } from './config.js';

let _cache = null;

export async function carregarSelecoes() {
  if (_cache) return _cache;
  const [resp, respI18n] = await Promise.all([
    fetch('data/teams-2026.json', { cache: 'force-cache' }),
    fetch('data/selecoes-i18n.json', { cache: 'force-cache' }).catch(() => null),
  ]);
  if (!resp.ok) throw new Error('Falha ao carregar seleções');
  const json = await resp.json();
  const teams = json.teams || [];
  // localização dos nomes (ex.: "England" -> "Inglaterra")
  let loc = null;
  try { loc = respI18n && respI18n.ok ? (await respI18n.json())[IDIOMA] : null; } catch { loc = null; }
  if (loc) for (const t of teams) { if (loc[t.tla]) { t.nameEn = t.name; t.name = loc[t.tla]; } }
  const porId = new Map(teams.map((t) => [t.id, t]));
  const porGrupo = {};
  for (const t of teams) {
    (porGrupo[t.group] ||= []).push(t);
  }
  _cache = { teams, porId, porGrupo, edition: json.edition };
  return _cache;
}

export function selecaoPorId(dados, id) {
  return dados.porId.get(id) || null;
}

// As outras 3 seleções do grupo da sua seleção (seus adversários na fase de grupos).
export function adversariosDoGrupo(dados, selecaoId) {
  const eu = dados.porId.get(selecaoId);
  if (!eu) return [];
  return (dados.porGrupo[eu.group] || []).filter((t) => t.id !== selecaoId);
}

// Sorteia um adversário de mata-mata plausível por Elo (evita repetir e a si mesmo).
// Quanto mais avançada a fase, mais forte tende a ser o sorteado.
export function adversarioMataMata(dados, selecaoId, faseIdx, rng = Math.random, jaEnfrentados = []) {
  const eu = dados.porId.get(selecaoId);
  const evitar = new Set([selecaoId, ...jaEnfrentados]);
  // pool: times com Elo dentro de uma faixa que sobe conforme a fase
  const pisoElo = 1650 + faseIdx * 70;
  let pool = dados.teams.filter((t) => !evitar.has(t.id) && t.elo >= pisoElo);
  if (pool.length === 0) pool = dados.teams.filter((t) => !evitar.has(t.id));
  // viés para Elo alto nas fases finais
  pool.sort((a, b) => b.elo - a.elo);
  const topo = Math.max(1, Math.floor(pool.length * (0.3 + faseIdx * 0.1)));
  const recorte = pool.slice(0, topo);
  return recorte[Math.floor(rng() * recorte.length)] || pool[0] || (eu ? null : null);
}

// Probabilidade de vitória do mandante por diferença de Elo (curva logística).
export function expectativaElo(eloA, eloB) {
  return 1 / (1 + Math.pow(10, -(eloA - eloB) / 400));
}

// --- Eras / níveis de dificuldade (copas históricas) -----------------------
let _eras = null;

export async function carregarEras() {
  if (_eras) return _eras;
  const resp = await fetch('data/copas-historicas.json', { cache: 'force-cache' });
  if (!resp.ok) throw new Error('Falha ao carregar copas históricas');
  _eras = (await resp.json()).eras || [];
  return _eras;
}
export function listaEras() { return _eras || []; }
export function eraPorId(id) { return (_eras || []).find((e) => e.id === id) || null; }

// Indexa os dados (seleções + formato) de uma era. Para 2026, usa o dataset
// completo de teams-2026.json; para as históricas, os participantes reais.
export async function dadosDaEra(eraId) {
  const eras = await carregarEras();
  const era = eras.find((e) => e.id === eraId) || eras.find((e) => e.id === '2026') || eras[0];
  if (!era.teams) {
    const base = await carregarSelecoes();
    return { ...base, formato: era.formato, era };
  }
  const teams = era.teams;
  const porId = new Map(teams.map((t) => [t.id, t]));
  const porGrupo = {};
  for (const t of teams) { (porGrupo[t.group || '—'] ||= []).push(t); }
  return { teams, porId, porGrupo, formato: era.formato, era };
}
