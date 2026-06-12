// Perks (traços) — progressão de RPG entre jogos.
//
// Estrutura (fase 2a): além dos 3 traços UNIVERSAIS (pickáveis a qualquer hora),
// cada classe tem 2 GALHOS de 3 níveis (T1 → T2 → T3 capstone). Pegar um nível
// exige o anterior do mesmo galho (`requer`); o capstone ainda pede nível mínimo.
// Como os pontos são escassos (1 por nível), você escolhe um caminho — a build
// vira identidade e a mesma classe rejoga diferente.
//
// Ganchos de um perk (todos opcionais, todos PASSIVOS):
//   elo(attrs, classeId) -> número   bônus de Elo do time nesta partida
//   cd(opcao, estado)    -> número   delta na CD de um lance (negativo = mais fácil)
//   init(estado)         -> void     aplicado 1× no início (multMeu/multAdv…)
//   nota(estado)         -> número   bônus na nota final do jogador
//   xpMult                            multiplicador de XP por jogo (lido em state)
//
// Campos de estrutura:
//   classe   'geral' ou id de classe       galho  chave do galho (ou null p/ universal)
//   tier     1|2|3 (3 = capstone)          requer ids de pré-requisito (mesmo galho)
//   nivelMin nível mínimo p/ escolher (default 1; capstones usam 5)

const CAP = 5; // nível mínimo dos capstones (T3)

// Gancho de CD por tipo de lance (um ou vários tipos -> mesmo delta).
const cdTipo = (tipos, delta) => {
  const set = new Set(Array.isArray(tipos) ? tipos : [tipos]);
  return (o) => (set.has(o.tipo) ? delta : 0);
};
// Combina vários ganchos de CD num só (soma os deltas aplicáveis).
const cdMix = (...fns) => (o, e) => fns.reduce((s, f) => s + (f(o, e) || 0), 0);

// Galhos por classe (ordem de exibição). `key` casa com perk.galho.
export const GALHOS = {
  goleiro: [{ key: 'gk_paredao', nome: 'Paredão', emoji: '🧤' }, { key: 'gk_libero', nome: 'Líbero', emoji: '🦶' }],
  zagueiro: [{ key: 'zg_muralha', nome: 'Muralha', emoji: '🧱' }, { key: 'zg_construtor', nome: 'Construtor', emoji: '🎯' }],
  lateral: [{ key: 'lt_ala', nome: 'Ala moderno', emoji: '↗️' }, { key: 'lt_classico', nome: 'Lateral clássico', emoji: '🛡️' }],
  volante: [{ key: 'vl_trinco', nome: 'Trinco', emoji: '⚙️' }, { key: 'vl_construtor', nome: 'Construtor', emoji: '🎼' }],
  meia: [{ key: 'me_maestro', nome: 'Maestro', emoji: '🎩' }, { key: 'me_chegador', nome: 'Chegador', emoji: '⚽' }],
  ponta: [{ key: 'po_driblador', nome: 'Driblador', emoji: '🌀' }, { key: 'po_finalizador', nome: 'Finalizador', emoji: '🎯' }],
  centroavante: [{ key: 'ca_matador', nome: 'Matador', emoji: '🎯' }, { key: 'ca_pivo', nome: 'Pivô', emoji: '🛡️' }],
  tecnico: [{ key: 'tc_gestor', nome: 'Gestor', emoji: '📋' }, { key: 'tc_tatico', nome: 'Tático', emoji: '♟️' }],
};

export const PERKS = [
  // ===== Universais (qualquer classe; sem galho) =============================
  { id: 'lider_nato', nome: 'Líder nato', emoji: '🧭', classe: 'geral', galho: null,
    desc: '+6 de Elo ao time — o vestiário joga por você.', elo: () => 6 },
  { id: 'frieza_gelo', nome: 'Frieza de gelo', emoji: '❄️', classe: 'geral', galho: null,
    desc: '−2 na CD dos seus lances nos últimos 15 minutos.', cd: (o, e) => (e.minuto >= 75 ? -2 : 0) },
  { id: 'veterano_faro', nome: 'Faro de veterano', emoji: '🎖️', classe: 'geral', galho: null,
    desc: '+15% de XP em cada partida.', xpMult: 1.15 },

  // ===== Goleiro =============================================================
  // Galho Paredão (defesa)
  { id: 'reflexos', nome: 'Reflexos felinos', emoji: '🐈', classe: 'goleiro', galho: 'gk_paredao', tier: 1,
    desc: '−2 na CD das defesas.', cd: cdTipo('defesa', -2) },
  { id: 'paredao', nome: 'Muralha da meta', emoji: '🧱', classe: 'goleiro', galho: 'gk_paredao', tier: 2, requer: ['reflexos'],
    desc: 'O adversário finaliza com menos perigo (−10%).', init: (e) => { e.multAdv *= 0.90; } },
  { id: 'gato', nome: 'O Gato', emoji: '🐆', classe: 'goleiro', galho: 'gk_paredao', tier: 3, requer: ['paredao'], nivelMin: CAP,
    desc: 'Capstone: −3 na CD das defesas e adversário −12%.', cd: cdTipo('defesa', -3), init: (e) => { e.multAdv *= 0.88; } },
  // Galho Líbero (jogo de pés / liderança)
  { id: 'lider_da_area', nome: 'Líder da área', emoji: '📢', classe: 'goleiro', galho: 'gk_libero', tier: 1,
    desc: '+6 de Elo — organiza e comanda a defesa.', elo: () => 6 },
  { id: 'saida_de_bola', nome: 'Saída de bola', emoji: '🦶', classe: 'goleiro', galho: 'gk_libero', tier: 2, requer: ['lider_da_area'],
    desc: '−2 na CD ao construir (sair jogando).', cd: cdTipo('construir', -2) },
  { id: 'goleiro_linha', nome: 'Goleiro-linha', emoji: '🧤', classe: 'goleiro', galho: 'gk_libero', tier: 3, requer: ['saida_de_bola'], nivelMin: CAP,
    desc: 'Capstone: −2 na CD ao construir e +8 de Elo (11º jogador).', cd: cdTipo('construir', -2), elo: () => 8 },

  // ===== Zagueiro ============================================================
  // Galho Muralha
  { id: 'carrinho_preciso', nome: 'Carrinho preciso', emoji: '🦶', classe: 'zagueiro', galho: 'zg_muralha', tier: 1,
    desc: '−2 na CD dos desarmes.', cd: cdTipo('desarmar', -2) },
  { id: 'muralha', nome: 'Muralha', emoji: '🧱', classe: 'zagueiro', galho: 'zg_muralha', tier: 2, requer: ['carrinho_preciso'],
    desc: 'O adversário produz menos (−10%).', init: (e) => { e.multAdv *= 0.90; } },
  { id: 'xerife', nome: 'Xerife', emoji: '🤠', classe: 'zagueiro', galho: 'zg_muralha', tier: 3, requer: ['muralha'], nivelMin: CAP,
    desc: 'Capstone: −3 na CD dos desarmes e adversário −10%.', cd: cdTipo('desarmar', -3), init: (e) => { e.multAdv *= 0.90; } },
  // Galho Construtor (bola aérea + saída)
  { id: 'cabeceio_certeiro', nome: 'Cabeceio certeiro', emoji: '🎯', classe: 'zagueiro', galho: 'zg_construtor', tier: 1,
    desc: '−2 na CD em bola parada e finalização.', cd: cdTipo(['finalizar', 'bolaParada'], -2) },
  { id: 'saida_limpa', nome: 'Saída limpa', emoji: '🎼', classe: 'zagueiro', galho: 'zg_construtor', tier: 2, requer: ['cabeceio_certeiro'],
    desc: '−2 na CD ao construir de trás.', cd: cdTipo('construir', -2) },
  { id: 'libero_moderno', nome: 'Líbero moderno', emoji: '♟️', classe: 'zagueiro', galho: 'zg_construtor', tier: 3, requer: ['saida_limpa'], nivelMin: CAP,
    desc: 'Capstone: −2 ao construir, −2 em bola parada e +6 de Elo.', cd: cdMix(cdTipo('construir', -2), cdTipo('bolaParada', -2)), elo: () => 6 },

  // ===== Lateral =============================================================
  // Galho Ala moderno (ofensivo)
  { id: 'cruzador', nome: 'Cruzador', emoji: '🎯', classe: 'lateral', galho: 'lt_ala', tier: 1,
    desc: '−2 na CD ao criar (cruzamentos).', cd: cdTipo('criar', -2) },
  { id: 'ala_moderno', nome: 'Apoio constante', emoji: '↗️', classe: 'lateral', galho: 'lt_ala', tier: 2, requer: ['cruzador'],
    desc: '+6 de Elo — apoia o ataque sem abrir o lado.', elo: () => 6 },
  { id: 'ala_total', nome: 'Ala total', emoji: '🚀', classe: 'lateral', galho: 'lt_ala', tier: 3, requer: ['ala_moderno'], nivelMin: CAP,
    desc: 'Capstone: −2 ao criar, −1 no 2º tempo e +6 de Elo.', cd: cdMix(cdTipo('criar', -2), (o, e) => (e.minuto >= 46 ? -1 : 0)), elo: () => 6 },
  // Galho Lateral clássico (defensivo)
  { id: 'marcador_lateral', nome: 'Marcador', emoji: '🛡️', classe: 'lateral', galho: 'lt_classico', tier: 1,
    desc: '−2 na CD dos desarmes pelo lado.', cd: cdTipo('desarmar', -2) },
  { id: 'folego_infinito', nome: 'Fôlego infinito', emoji: '🫁', classe: 'lateral', galho: 'lt_classico', tier: 2, requer: ['marcador_lateral'],
    desc: '−1 na CD dos seus lances no segundo tempo.', cd: (o, e) => (e.minuto >= 46 ? -1 : 0) },
  { id: 'muralha_do_lado', nome: 'Muralha do lado', emoji: '🧱', classe: 'lateral', galho: 'lt_classico', tier: 3, requer: ['folego_infinito'], nivelMin: CAP,
    desc: 'Capstone: −2 nos desarmes e adversário −7% pelo seu lado.', cd: cdTipo('desarmar', -2), init: (e) => { e.multAdv *= 0.93; } },

  // ===== Volante =============================================================
  // Galho Trinco (destruidor)
  { id: 'desarme_seco', nome: 'Desarme seco', emoji: '🦶', classe: 'volante', galho: 'vl_trinco', tier: 1,
    desc: '−2 na CD dos desarmes.', cd: cdTipo('desarmar', -2) },
  { id: 'recomposicao', nome: 'Recomposição', emoji: '🔄', classe: 'volante', galho: 'vl_trinco', tier: 2, requer: ['desarme_seco'],
    desc: 'O adversário produz menos (−7%).', init: (e) => { e.multAdv *= 0.93; } },
  { id: 'trinco', nome: 'Trinco', emoji: '⚙️', classe: 'volante', galho: 'vl_trinco', tier: 3, requer: ['recomposicao'], nivelMin: CAP,
    desc: 'Capstone: −3 nos desarmes e adversário −8%.', cd: cdTipo('desarmar', -3), init: (e) => { e.multAdv *= 0.92; } },
  // Galho Construtor
  { id: 'primeiro_passe', nome: 'Primeiro passe', emoji: '🎯', classe: 'volante', galho: 'vl_construtor', tier: 1,
    desc: '−2 na CD ao construir de trás.', cd: cdTipo('construir', -2) },
  { id: 'motor_do_meio', nome: 'Motor do meio', emoji: '⚙️', classe: 'volante', galho: 'vl_construtor', tier: 2, requer: ['primeiro_passe'],
    desc: '+6 de Elo — equilibra marcação e construção.', elo: () => 6 },
  { id: 'cerebro', nome: 'Cérebro do time', emoji: '🧠', classe: 'volante', galho: 'vl_construtor', tier: 3, requer: ['motor_do_meio'], nivelMin: CAP,
    desc: 'Capstone: −2 ao construir, −2 ao criar e +6 de Elo.', cd: cdMix(cdTipo('construir', -2), cdTipo('criar', -2)), elo: () => 6 },

  // ===== Meia ================================================================
  // Galho Maestro (criação)
  { id: 'visao_de_jogo', nome: 'Visão de jogo', emoji: '👁️', classe: 'meia', galho: 'me_maestro', tier: 1,
    desc: '−2 na CD ao criar (o último passe).', cd: cdTipo('criar', -2) },
  { id: 'regente', nome: 'Regente', emoji: '🎼', classe: 'meia', galho: 'me_maestro', tier: 2, requer: ['visao_de_jogo'],
    desc: '+6 de Elo — dita o ritmo do time.', elo: () => 6 },
  { id: 'camisa_10', nome: 'Camisa 10', emoji: '🎩', classe: 'meia', galho: 'me_maestro', tier: 3, requer: ['regente'], nivelMin: CAP,
    desc: 'Capstone: −3 na CD ao criar e +6 de Elo.', cd: cdTipo('criar', -3), elo: () => 6 },
  // Galho Chegador (chute + bola parada)
  { id: 'cobranca_de_falta', nome: 'Cobrança de falta', emoji: '⚽', classe: 'meia', galho: 'me_chegador', tier: 1,
    desc: '−2 na CD em bola parada.', cd: cdTipo('bolaParada', -2) },
  { id: 'chute_de_fora', nome: 'Chute de fora', emoji: '🚀', classe: 'meia', galho: 'me_chegador', tier: 2, requer: ['cobranca_de_falta'],
    desc: '−2 na CD das finalizações.', cd: cdTipo('finalizar', -2) },
  { id: 'especialista_bp', nome: 'Especialista', emoji: '🎯', classe: 'meia', galho: 'me_chegador', tier: 3, requer: ['chute_de_fora'], nivelMin: CAP,
    desc: 'Capstone: −3 em bola parada e −2 nas finalizações.', cd: cdMix(cdTipo('bolaParada', -3), cdTipo('finalizar', -2)) },

  // ===== Ponta ===============================================================
  // Galho Driblador
  { id: 'drible_desconcertante', nome: 'Drible desconcertante', emoji: '🌀', classe: 'ponta', galho: 'po_driblador', tier: 1,
    desc: '−2 na CD ao progredir no drible.', cd: cdTipo('progredir', -2) },
  { id: 'velocista', nome: 'Velocista', emoji: '💨', classe: 'ponta', galho: 'po_driblador', tier: 2, requer: ['drible_desconcertante'],
    desc: '+6 de Elo — explode pelos lados.', elo: () => 6 },
  { id: 'ponta_figura', nome: 'Ponta-figura', emoji: '⭐', classe: 'ponta', galho: 'po_driblador', tier: 3, requer: ['velocista'], nivelMin: CAP,
    desc: 'Capstone: −3 ao progredir e −1 no 2º tempo.', cd: cdMix(cdTipo('progredir', -3), (o, e) => (e.minuto >= 46 ? -1 : 0)) },
  // Galho Finalizador
  { id: 'finalizador', nome: 'Finalizador', emoji: '🎯', classe: 'ponta', galho: 'po_finalizador', tier: 1,
    desc: '−2 na CD das finalizações.', cd: cdTipo('finalizar', -2) },
  { id: 'cruzamento_rasteiro', nome: 'Cruzamento rasteiro', emoji: '↘️', classe: 'ponta', galho: 'po_finalizador', tier: 2, requer: ['finalizador'],
    desc: '−2 na CD ao criar (rasteiro na área).', cd: cdTipo('criar', -2) },
  { id: 'atacante_de_area', nome: 'Atacante de área', emoji: '🥅', classe: 'ponta', galho: 'po_finalizador', tier: 3, requer: ['cruzamento_rasteiro'], nivelMin: CAP,
    desc: 'Capstone: −3 nas finalizações e +0,15 na nota por gol seu.', cd: cdTipo('finalizar', -3), nota: (e) => e.golsJogador * 0.15 },

  // ===== Centroavante ========================================================
  // Galho Matador
  { id: 'faro_de_gol', nome: 'Faro de gol', emoji: '🎯', classe: 'centroavante', galho: 'ca_matador', tier: 1,
    desc: '−2 na CD das finalizações.', cd: cdTipo('finalizar', -2) },
  { id: 'oportunista', nome: 'Oportunista', emoji: '⚡', classe: 'centroavante', galho: 'ca_matador', tier: 2, requer: ['faro_de_gol'],
    desc: '−2 na CD em bola parada (rebotes e escanteios).', cd: cdTipo('bolaParada', -2) },
  { id: 'predador', nome: 'Predador', emoji: '🦈', classe: 'centroavante', galho: 'ca_matador', tier: 3, requer: ['oportunista'], nivelMin: CAP,
    desc: 'Capstone: −3 ao finalizar (−5 quando atrás no placar) e +0,2 na nota por gol.',
    cd: (o, e) => (o.tipo === 'finalizar' ? (e.golsMeu < e.golsAdv ? -5 : -3) : 0), nota: (e) => e.golsJogador * 0.2 },
  // Galho Pivô
  { id: 'pivot', nome: 'Pivô', emoji: '🛡️', classe: 'centroavante', galho: 'ca_pivo', tier: 1,
    desc: '−2 na CD ao criar (segura e distribui).', cd: cdTipo('criar', -2) },
  { id: 'referencia', nome: 'Referência', emoji: '📌', classe: 'centroavante', galho: 'ca_pivo', tier: 2, requer: ['pivot'],
    desc: '+6 de Elo — fixa a defesa e abre espaço.', elo: () => 6 },
  { id: 'camisa_9', nome: 'Camisa 9 completo', emoji: '🏆', classe: 'centroavante', galho: 'ca_pivo', tier: 3, requer: ['referencia'], nivelMin: CAP,
    desc: 'Capstone: −2 ao criar, −2 ao finalizar e +6 de Elo.', cd: cdMix(cdTipo('criar', -2), cdTipo('finalizar', -2)), elo: () => 6 },

  // ===== Técnico =============================================================
  // Galho Gestor
  { id: 'leitura_de_jogo', nome: 'Leitura de jogo', emoji: '📖', classe: 'tecnico', galho: 'tc_gestor', tier: 1,
    desc: '−1 na CD de todas as decisões de banco.', cd: () => -1 },
  { id: 'motivador', nome: 'Motivador', emoji: '📣', classe: 'tecnico', galho: 'tc_gestor', tier: 2, requer: ['leitura_de_jogo'],
    desc: '−2 na CD em conversas e ajustes de postura.', cd: cdTipo(['conversa', 'postura'], -2) },
  { id: 'mentor', nome: 'Mentor', emoji: '🧠', classe: 'tecnico', galho: 'tc_gestor', tier: 3, requer: ['motivador'], nivelMin: CAP,
    desc: 'Capstone: −2 na CD de todas as decisões e +5% de produção do time.', cd: () => -2, init: (e) => { e.multMeu *= 1.05; } },
  // Galho Tático
  { id: 'tatico', nome: 'Tático', emoji: '♟️', classe: 'tecnico', galho: 'tc_tatico', tier: 1,
    desc: '−2 na CD das mudanças de esquema.', cd: cdTipo('esquema', -2) },
  { id: 'pressing_organizado', nome: 'Pressing organizado', emoji: '⏫', classe: 'tecnico', galho: 'tc_tatico', tier: 2, requer: ['tatico'],
    desc: '−2 na CD ao mandar pressionar.', cd: cdTipo('pressing', -2) },
  { id: 'estrategista', nome: 'Estrategista', emoji: '🎚️', classe: 'tecnico', galho: 'tc_tatico', tier: 3, requer: ['pressing_organizado'], nivelMin: CAP,
    desc: 'Capstone: −2 em esquema, pressing e recuo (domínio tático).', cd: cdMix(cdTipo('esquema', -2), cdTipo('pressing', -2), cdTipo('recuar', -2)) },
];

const POR_ID = new Map(PERKS.map((p) => [p.id, p]));
export function perkPorId(id) { return POR_ID.get(id) || null; }

// Perks que uma classe pode ter (universais + da própria classe).
export function perksDaClasse(classeId) {
  return PERKS.filter((p) => p.classe === 'geral' || p.classe === classeId);
}

// Estado de um perk para um personagem: 'tido' | 'disponivel' | 'bloqueado'.
// Bloqueado vem com `motivo` ('requer:<id>' ou 'nivel:<n>').
export function estadoPerk(perk, jaTem = [], nivel = 1) {
  const tem = new Set(jaTem);
  if (tem.has(perk.id)) return { estado: 'tido' };
  const falta = (perk.requer || []).find((r) => !tem.has(r));
  if (falta) return { estado: 'bloqueado', motivo: 'requer', alvo: falta };
  if (nivel < (perk.nivelMin || 1)) return { estado: 'bloqueado', motivo: 'nivel', alvo: perk.nivelMin };
  return { estado: 'disponivel' };
}

// Perks pickáveis agora (não tidos, pré-requisitos atendidos, nível ok).
export function perksDisponiveis(classeId, jaTem = [], nivel = 1) {
  return perksDaClasse(classeId).filter((p) => estadoPerk(p, jaTem, nivel).estado === 'disponivel');
}

// Galhos da classe com seus perks ordenados por tier (para a UI da árvore).
export function galhosDaClasse(classeId) {
  return (GALHOS[classeId] || []).map((g) => ({
    ...g,
    perks: PERKS.filter((p) => p.galho === g.key).sort((a, b) => (a.tier || 0) - (b.tier || 0)),
  }));
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
