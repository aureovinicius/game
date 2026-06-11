// Catálogo de mecânica dos lances — por classe e zona de jogo.
// Separa os NÚMEROS (tipo/stat/cd/efeitos) do TEXTO de sabor (dicionário/corpus).
// O `texto` aqui é o fallback offline; `acao` é o slug que liga a opção às
// variantes de texto por tom em data/narrativa.json (seção "opcoes").
//
// tipos:  finalizar, criar, progredir, construir, desarmar, defesa, seguro,
//         faltaTatica, simular, provocar, mental, bolaParada,
//         postura, substituir, pressing, recuar, esquema, conversa (técnico)
// zonas:  'def' (sob pressão), 'meio', 'atk' (pressionando), 'disciplina'
//         (técnico: inicio/sofreu/fez/intervalo/reta/disc)
// efeitos: exporContra (0–2), entregaPosse, riscoConcede ('falha'|'falhaCritica'),
//          dogso ('spa'|'fora'|'area_bola'|'area_sem'), ganhaFalta ('falta'|'penalti'),
//          cartaoRisco ('amarelo'|'vermelho'), tilt, alvo, intervalo, momentum (±n)

const O = (id, texto, tipo, stat, cd, efeitos = {}, acao = '') => ({ id, texto, tipo, stat, cd, efeitos, acao });

export const MECANICAS = {
  goleiro: {
    def: [
      [O('A', 'Sair de cara e abafar', 'defesa', 'MEN', 15, {}, 'gk_sair'),
       O('B', 'Esperar na linha e ler o lance', 'defesa', 'VIS', 11, {}, 'gk_ficar'),
       O('C', 'Espalmar pro escanteio', 'defesa', 'FIS', 13, {}, 'gk_espalmar')],
      [O('A', 'Dar o chutão e aliviar', 'seguro', 'FIS', 11, { entregaPosse: true }, 'chutao'),
       O('B', 'Sair jogando curto', 'construir', 'VIS', 14, { riscoConcede: 'falhaCritica', momentum: 6 }, 'sair_jogando'),
       O('C', 'Driblar o atacante na área', 'progredir', 'MEN', 17, { riscoConcede: 'falha', momentum: 12 }, 'gk_driblar')],
    ],
    atk: [
      [O('A', 'Lançar rápido pro contra-ataque', 'criar', 'VIS', 13, { exporContra: 1 }, 'lancar_contra'),
       O('B', 'Segurar e reorganizar', 'seguro', 'MEN', 10, {}, 'segurar')],
    ],
  },
  zagueiro: {
    def: [
      [O('A', 'Dividir firme', 'desarmar', 'FIS', 14, { riscoConcede: 'falha' }, 'dividida'),
       O('B', 'Dar o bote no tempo certo', 'desarmar', 'VIS', 13, {}, 'bote'),
       O('C', 'Fazer a falta tática', 'faltaTatica', 'VIS', 13, { dogso: 'spa' }, 'falta_spa')],
      [O('A', 'Segurar o atacante (último homem)', 'faltaTatica', 'FIS', 15, { dogso: 'fora' }, 'falta_dogso'),
       O('B', 'Tentar a dividida limpa', 'desarmar', 'VIS', 16, { riscoConcede: 'falha' }, 'dividida')],
    ],
    meio: [
      [O('A', 'Sair jogando', 'construir', 'VIS', 13, { riscoConcede: 'falhaCritica' }, 'sair_jogando'),
       O('B', 'Tocar no goleiro e recomeçar', 'seguro', 'MEN', 10, { entregaPosse: true }, 'recuar_posse')],
    ],
    atk: [
      [O('A', 'Subir e cabecear na bola parada', 'finalizar', 'FIS', 16, {}, 'cabecear'),
       O('B', 'Ficar na marcação', 'seguro', 'MEN', 10, {}, 'segurar')],
    ],
  },
  lateral: {
    def: [
      [O('A', 'Fechar o lado e dividir', 'desarmar', 'FIS', 14, { riscoConcede: 'falha' }, 'dividida'),
       O('B', 'Dar o bote', 'desarmar', 'VIS', 13, {}, 'bote')],
    ],
    meio: [
      [O('A', 'Apoiar subindo (deixa espaço)', 'progredir', 'FIS', 14, { exporContra: 1, momentum: 6 }, 'apoiar_subir'),
       O('B', 'Segurar a posição', 'seguro', 'VIS', 10, { exporContra: 0 }, 'segurar_posicao')],
    ],
    atk: [
      [O('A', 'Cruzar na área', 'criar', 'TEC', 14, {}, 'cruzar'),
       O('B', 'Cortar pro meio e arriscar', 'finalizar', 'TEC', 16, { exporContra: 1 }, 'cortar_finalizar'),
       O('C', 'Recuar e dar a bola', 'seguro', 'VIS', 10, {}, 'recuar_posse')],
    ],
  },
  volante: {
    def: [
      [O('A', 'Desarmar no meio', 'desarmar', 'FIS', 14, { riscoConcede: 'falha' }, 'dividida'),
       O('B', 'Falta tática pra cortar o contra-ataque', 'faltaTatica', 'VIS', 13, { dogso: 'spa' }, 'falta_spa'),
       O('C', 'Recompor e marcar', 'seguro', 'VIS', 11, {}, 'segurar')],
    ],
    meio: [
      [O('A', 'Primeiro passe pro ataque', 'criar', 'VIS', 14, {}, 'primeiro_passe'),
       O('B', 'Conduzir e progredir (deixa espaço)', 'progredir', 'TEC', 15, { exporContra: 1, momentum: 6 }, 'conduzir'),
       O('C', 'Tocar de lado e manter', 'seguro', 'TEC', 10, {}, 'tocar_manter')],
    ],
    atk: [
      [O('A', 'Chutar de fora', 'finalizar', 'TEC', 16, {}, 'chute_fora'),
       O('B', 'Lançar na medida', 'criar', 'VIS', 14, {}, 'lancar_assistencia')],
    ],
  },
  meia: {
    meio: [
      [O('A', 'Lançar nas costas da defesa', 'criar', 'VIS', 14, {}, 'lancar_assistencia'),
       O('B', 'Arriscar o chute de fora', 'finalizar', 'TEC', 16, {}, 'chute_fora'),
       O('C', 'Tocar curto e manter a posse', 'seguro', 'TEC', 10, {}, 'tocar_manter')],
      [O('A', 'Conduzir e encarar a marcação (deixa espaço)', 'progredir', 'TEC', 15, { exporContra: 2, momentum: 8 }, 'conduzir'),
       O('B', 'Tabelar e tentar o passe', 'criar', 'VIS', 13, { exporContra: 1 }, 'tabelar'),
       O('C', 'Segurar a posição e dar a bola', 'seguro', 'TEC', 10, { exporContra: 0 }, 'segurar_posicao')],
    ],
    atk: [
      [O('A', 'Achar o último passe', 'criar', 'VIS', 14, {}, 'ultimo_passe'),
       O('B', 'Bater de primeira', 'finalizar', 'TEC', 16, {}, 'finalizar_primeira'),
       O('C', 'Cobrar a falta no ângulo', 'bolaParada', 'TEC', 16, {}, 'falta_cobranca')],
    ],
    def: [
      [O('A', 'Voltar e ajudar na marcação', 'desarmar', 'VIS', 13, {}, 'ajudar_marcacao'),
       O('B', 'Segurar a bola pra aliviar', 'seguro', 'TEC', 11, {}, 'tocar_manter')],
    ],
  },
  ponta: {
    atk: [
      [O('A', 'Partir pra cima e driblar', 'progredir', 'TEC', 15, { momentum: 8 }, 'driblar'),
       O('B', 'Cruzar rasteiro', 'criar', 'VIS', 13, {}, 'cruzar'),
       O('C', 'Cortar pro meio e finalizar', 'finalizar', 'TEC', 16, {}, 'cortar_finalizar')],
      [O('A', 'Cavar a falta na ponta', 'simular', 'CAR', 14, { ganhaFalta: 'falta' }, 'cavar_falta'),
       O('B', 'Encarar o lateral no drible', 'progredir', 'TEC', 15, {}, 'driblar')],
    ],
    meio: [
      [O('A', 'Conduzir e progredir', 'progredir', 'TEC', 15, { exporContra: 1, momentum: 6 }, 'conduzir'),
       O('B', 'Tocar e manter', 'seguro', 'TEC', 10, {}, 'tocar_manter')],
    ],
    def: [
      [O('A', 'Voltar pra ajudar o lateral', 'desarmar', 'FIS', 14, {}, 'ajudar_marcacao'),
       O('B', 'Ficar no contra-ataque', 'seguro', 'FIS', 11, { exporContra: 0 }, 'segurar_posicao')],
    ],
  },
  centroavante: {
    atk: [
      [O('A', 'Finalizar de primeira', 'finalizar', 'MEN', 16, {}, 'finalizar_primeira'),
       O('B', 'Girar sobre o zagueiro', 'progredir', 'TEC', 15, { exporContra: 1 }, 'girar_zagueiro'),
       O('C', 'Tocar pro companheiro melhor posto', 'criar', 'VIS', 11, {}, 'tocar_companheiro')],
      [O('A', 'Cabecear pro gol', 'finalizar', 'FIS', 16, {}, 'cabecear'),
       O('B', 'Fazer o pivô e segurar', 'seguro', 'MEN', 11, {}, 'pivo'),
       O('C', 'Cavar o pênalti', 'simular', 'CAR', 15, { ganhaFalta: 'penalti' }, 'cavar_penalti')],
    ],
    meio: [
      [O('A', 'Buscar a bola e tabelar', 'criar', 'VIS', 13, {}, 'tabelar'),
       O('B', 'Receber de costas e girar', 'progredir', 'TEC', 15, { exporContra: 1 }, 'girar_zagueiro')],
    ],
    def: [
      [O('A', 'Pressionar a saída de bola', 'desarmar', 'FIS', 15, { exporContra: 1 }, 'pressionar_saida'),
       O('B', 'Segurar a referência no ataque', 'seguro', 'MEN', 11, { exporContra: 0 }, 'segurar_posicao')],
    ],
  },
  // Técnico: decisões macro do banco, por gatilho.
  tecnico: {
    inicio: [
      [O('A', 'Entrar pra cima, postura ofensiva', 'postura', 'CAR', 13, { tilt: 'ofensivo' }, 'tec_ofensivo'),
       O('B', 'Equilíbrio: sentir o jogo primeiro', 'postura', 'VIS', 11, { tilt: 'equilibrio' }, 'tec_equilibrio'),
       O('C', 'Entrar cauteloso e fechar os espaços', 'postura', 'MEN', 13, { tilt: 'cauteloso' }, 'tec_cauteloso')],
    ],
    sofreu: [
      [O('A', 'Mexer já: sangue novo no ataque', 'substituir', 'VIS', 15, { alvo: 'ofensivo' }, 'tec_sub_ofensivo'),
       O('B', 'Manter e ajustar na orientação', 'seguro', 'MEN', 10, {}, 'tec_manter'),
       O('C', 'Mandar pressionar a saída deles', 'pressing', 'CAR', 14, { exporContra: 1 }, 'tec_pressing')],
    ],
    fez: [
      [O('A', 'Administrar a vantagem', 'recuar', 'MEN', 12, {}, 'tec_administrar'),
       O('B', 'Ir pra cima e ampliar', 'pressing', 'CAR', 14, { exporContra: 1 }, 'tec_pressing'),
       O('C', 'Segurar a posse e baixar o ritmo', 'seguro', 'VIS', 11, {}, 'tec_baixar_ritmo')],
    ],
    intervalo: [
      [O('A', 'Trocar e assumir o jogo (sangue novo)', 'substituir', 'VIS', 14, { alvo: 'ofensivo', intervalo: true }, 'tec_sub_ofensivo'),
       O('B', 'Reforçar o meio e segurar', 'recuar', 'MEN', 13, { intervalo: true }, 'tec_reforcar'),
       O('C', 'Bronca e ajuste motivacional', 'conversa', 'CAR', 13, {}, 'tec_conversa')],
    ],
    reta: [
      [O('A', 'All-in: tudo no ataque', 'pressing', 'CAR', 15, { exporContra: 2 }, 'tec_allin'),
       O('B', 'Trancar e segurar o resultado', 'recuar', 'MEN', 12, {}, 'tec_trancar'),
       O('C', 'Mudar o esquema pra surpreender', 'esquema', 'VIS', 15, {}, 'tec_esquema')],
    ],
    disc: [
      [O('A', 'Segurar a cabeça e orientar da beira', 'mental', 'MEN', 12, {}, 'tec_segurar'),
       O('B', 'Encarar o árbitro pela marcação', 'provocar', 'CAR', 16, { cartaoRisco: 'amarelo' }, 'tec_encarar')],
    ],
  },
};

export const DISCIPLINA = [
  [O('A', 'Segurar a cabeça e seguir o jogo', 'mental', 'MEN', 12, {}, 'segurar_cabeca'),
   O('B', 'Provocar o marcador pra tirá-lo do sério', 'provocar', 'CAR', 15, { cartaoRisco: 'amarelo' }, 'provocar'),
   O('C', 'Ir reclamar com o árbitro', 'mental', 'CAR', 17, { cartaoRisco: 'amarelo' }, 'reclamar')],
];

export function conjuntosDeLance(classe, zona) {
  const c = MECANICAS[classe] || MECANICAS.meia;
  if (zona === 'disciplina') return DISCIPLINA;
  return c[zona] || c.meio || c.atk || c.def || Object.values(c)[0];
}
