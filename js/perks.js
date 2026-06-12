// Perks (traços) — progressão de RPG entre jogos. Versão enxuta: traços
// PASSIVOS escolhidos ao subir de nível, que mexem direto nos números do motor.
//
// Cada perk pode ter os ganchos (todos opcionais):
//   elo(attrs, classeId) -> número   bônus de Elo do time nesta partida
//   cd(opcao, estado)    -> número   delta na CD de um lance (negativo = mais fácil)
//   init(estado)         -> void     aplicado 1× no início (multMeu/multAdv…)
//   nota(estado)         -> número   bônus na nota final do jogador
//   xpMult                            multiplicador de XP por jogo (lido em state)
//
// `classe`: 'geral' (qualquer classe) ou o id de uma classe específica.
// Os tipos de lance batem com mecanicas.js (finalizar, criar, desarmar, …).

// Helpers de gancho de CD por tipo de lance.
const cdTipo = (tipos, delta) => {
  const set = new Set(Array.isArray(tipos) ? tipos : [tipos]);
  return (o) => (set.has(o.tipo) ? delta : 0);
};

export const PERKS = [
  // --- Universais (qualquer classe) -----------------------------------------
  { id: 'lider_nato', nome: 'Líder nato', emoji: '🧭', classe: 'geral',
    desc: '+6 de Elo ao time — o vestiário joga por você.',
    elo: () => 6 },
  { id: 'frieza_gelo', nome: 'Frieza de gelo', emoji: '❄️', classe: 'geral',
    desc: '−2 na CD dos seus lances nos últimos 15 minutos.',
    cd: (o, e) => (e.minuto >= 75 ? -2 : 0) },
  { id: 'veterano_faro', nome: 'Faro de veterano', emoji: '🎖️', classe: 'geral',
    desc: '+15% de XP em cada partida.',
    xpMult: 1.15 },

  // --- Goleiro --------------------------------------------------------------
  { id: 'reflexos', nome: 'Reflexos felinos', emoji: '🐈', classe: 'goleiro',
    desc: '−2 na CD das defesas.', cd: cdTipo('defesa', -2) },
  { id: 'paredao', nome: 'Paredão', emoji: '🧱', classe: 'goleiro',
    desc: 'O adversário finaliza com menos perigo (−8%).',
    init: (e) => { e.multAdv *= 0.92; } },
  { id: 'lider_da_area', nome: 'Líder da área', emoji: '📢', classe: 'goleiro',
    desc: '+6 de Elo — organiza e comanda a defesa.', elo: () => 6 },

  // --- Zagueiro -------------------------------------------------------------
  { id: 'carrinho_preciso', nome: 'Carrinho preciso', emoji: '🦶', classe: 'zagueiro',
    desc: '−2 na CD dos desarmes.', cd: cdTipo('desarmar', -2) },
  { id: 'muralha', nome: 'Muralha', emoji: '🧱', classe: 'zagueiro',
    desc: 'O adversário produz menos (−10%).',
    init: (e) => { e.multAdv *= 0.90; } },
  { id: 'cabeceio_certeiro', nome: 'Cabeceio certeiro', emoji: '🎯', classe: 'zagueiro',
    desc: '−2 na CD em bola parada e finalização (gols de cabeça).',
    cd: cdTipo(['finalizar', 'bolaParada'], -2) },

  // --- Lateral --------------------------------------------------------------
  { id: 'cruzador', nome: 'Cruzador', emoji: '🎯', classe: 'lateral',
    desc: '−2 na CD ao criar (cruzamentos viram assistência).',
    cd: cdTipo('criar', -2) },
  { id: 'folego_infinito', nome: 'Fôlego infinito', emoji: '🫁', classe: 'lateral',
    desc: '−1 na CD dos seus lances no segundo tempo.',
    cd: (o, e) => (e.minuto >= 46 ? -1 : 0) },
  { id: 'ala_moderno', nome: 'Ala moderno', emoji: '↗️', classe: 'lateral',
    desc: '+6 de Elo — apoia o ataque sem deixar o lado aberto.', elo: () => 6 },

  // --- Volante --------------------------------------------------------------
  { id: 'primeiro_passe', nome: 'Primeiro passe', emoji: '🎯', classe: 'volante',
    desc: '−2 na CD ao construir a partir de trás.',
    cd: cdTipo('construir', -2) },
  { id: 'desarme_seco', nome: 'Desarme seco', emoji: '🦶', classe: 'volante',
    desc: '−2 na CD dos desarmes.', cd: cdTipo('desarmar', -2) },
  { id: 'motor_do_meio', nome: 'Motor do meio', emoji: '⚙️', classe: 'volante',
    desc: '+6 de Elo — equilibra marcação e construção.', elo: () => 6 },

  // --- Meia -----------------------------------------------------------------
  { id: 'visao_de_jogo', nome: 'Visão de jogo', emoji: '👁️', classe: 'meia',
    desc: '−2 na CD ao criar (o último passe).', cd: cdTipo('criar', -2) },
  { id: 'cobranca_de_falta', nome: 'Cobrança de falta', emoji: '⚽', classe: 'meia',
    desc: '−2 na CD em bola parada.', cd: cdTipo('bolaParada', -2) },
  { id: 'regente', nome: 'Regente', emoji: '🎼', classe: 'meia',
    desc: '+6 de Elo — dita o ritmo do time.', elo: () => 6 },

  // --- Ponta ----------------------------------------------------------------
  { id: 'drible_desconcertante', nome: 'Drible desconcertante', emoji: '🌀', classe: 'ponta',
    desc: '−2 na CD ao progredir no drible.', cd: cdTipo('progredir', -2) },
  { id: 'finalizador', nome: 'Finalizador', emoji: '🎯', classe: 'ponta',
    desc: '−2 na CD das finalizações.', cd: cdTipo('finalizar', -2) },
  { id: 'velocista', nome: 'Velocista', emoji: '💨', classe: 'ponta',
    desc: '+6 de Elo — explode pelos lados.', elo: () => 6 },

  // --- Centroavante ---------------------------------------------------------
  { id: 'faro_de_gol', nome: 'Faro de gol', emoji: '🎯', classe: 'centroavante',
    desc: '−2 na CD das finalizações.', cd: cdTipo('finalizar', -2) },
  { id: 'pivot', nome: 'Pivô', emoji: '🛡️', classe: 'centroavante',
    desc: '−2 na CD ao criar (segura e distribui).', cd: cdTipo('criar', -2) },
  { id: 'artilheiro_nato', nome: 'Artilheiro nato', emoji: '🏆', classe: 'centroavante',
    desc: '+0,2 na nota por gol seu na partida.',
    nota: (e) => e.golsJogador * 0.2 },

  // --- Técnico --------------------------------------------------------------
  { id: 'leitura_de_jogo', nome: 'Leitura de jogo', emoji: '📖', classe: 'tecnico',
    desc: '−1 na CD de todas as decisões de banco.',
    cd: () => -1 },
  { id: 'motivador', nome: 'Motivador', emoji: '📣', classe: 'tecnico',
    desc: '−2 na CD em conversas e ajustes de postura.',
    cd: cdTipo(['conversa', 'postura'], -2) },
  { id: 'tatico', nome: 'Tático', emoji: '♟️', classe: 'tecnico',
    desc: '−2 na CD das mudanças de esquema.', cd: cdTipo('esquema', -2) },
];

const POR_ID = new Map(PERKS.map((p) => [p.id, p]));
export function perkPorId(id) { return POR_ID.get(id) || null; }

// Perks que uma classe pode escolher (universais + da própria classe).
export function perksDaClasse(classeId) {
  return PERKS.filter((p) => p.classe === 'geral' || p.classe === classeId);
}

// Perks ainda disponíveis (não escolhidos).
export function perksDisponiveis(classeId, jaTem = []) {
  const tem = new Set(jaTem);
  return perksDaClasse(classeId).filter((p) => !tem.has(p.id));
}

// Resolve uma lista de ids em objetos de perk (ignora ids inválidos).
export function resolverPerks(ids = []) {
  return ids.map((id) => POR_ID.get(id)).filter(Boolean);
}

// Soma o bônus de Elo de todos os perks ativos.
export function eloDosPerks(perks, attrs, classeId) {
  return perks.reduce((s, p) => s + (p.elo ? p.elo(attrs, classeId) : 0), 0);
}

// Multiplicador de XP combinado dos perks (produto dos xpMult).
export function xpMultDosPerks(perks) {
  return perks.reduce((m, p) => m * (p.xpMult || 1), 1);
}
