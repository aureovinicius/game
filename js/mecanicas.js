// Catálogo de mecânica dos lances — por classe e zona de jogo.
// Separa os NÚMEROS (tipo/stat/cd/efeitos) do TEXTO de sabor (dicionário/corpus).
// O `texto` aqui é o fallback offline enquanto o corpus não existe.
//
// tipos:  finalizar, criar, progredir, construir, desarmar, defesa, seguro,
//         faltaTatica, simular, provocar, mental, bolaParada
// zonas:  'def' (time sob pressão), 'meio', 'atk' (time pressionando), 'disciplina'
// efeitos: exporContra (0–2), entregaPosse, riscoConcede ('falha'|'falhaCritica'),
//          dogso ('spa'|'fora'|'area_bola'|'area_sem'), ganhaFalta ('falta'|'penalti'),
//          cartaoRisco ('amarelo'|'vermelho'), momentum (±n)

const O = (id, texto, tipo, stat, cd, efeitos = {}) => ({ id, texto, tipo, stat, cd, efeitos });

export const MECANICAS = {
  goleiro: {
    def: [
      [O('A', 'Sair de cara e abafar', 'defesa', 'MEN', 15),
       O('B', 'Esperar na linha e ler o lance', 'defesa', 'VIS', 11),
       O('C', 'Espalmar pro escanteio', 'defesa', 'FIS', 13)],
      [O('A', 'Dar o chutão e aliviar', 'seguro', 'FIS', 11, { entregaPosse: true }),
       O('B', 'Sair jogando curto', 'construir', 'VIS', 14, { riscoConcede: 'falhaCritica', momentum: 6 }),
       O('C', 'Driblar o atacante na área', 'progredir', 'MEN', 17, { riscoConcede: 'falha', momentum: 12 })],
    ],
    atk: [
      [O('A', 'Lançar rápido pro contra-ataque', 'criar', 'VIS', 13, { exporContra: 1 }),
       O('B', 'Segurar e reorganizar', 'seguro', 'MEN', 10)],
    ],
  },
  zagueiro: {
    def: [
      [O('A', 'Dividir firme', 'desarmar', 'FIS', 14, { riscoConcede: 'falha' }),
       O('B', 'Dar o bote no tempo certo', 'desarmar', 'VIS', 13),
       O('C', 'Fazer a falta tática', 'faltaTatica', 'VIS', 13, { dogso: 'spa' })],
      [O('A', 'Segurar o atacante (último homem)', 'faltaTatica', 'FIS', 15, { dogso: 'fora' }),
       O('B', 'Tentar a dividida limpa', 'desarmar', 'VIS', 16, { riscoConcede: 'falha' })],
    ],
    meio: [
      [O('A', 'Sair jogando', 'construir', 'VIS', 13, { riscoConcede: 'falhaCritica' }),
       O('B', 'Tocar no goleiro e recomeçar', 'seguro', 'MEN', 10, { entregaPosse: true })],
    ],
    atk: [
      [O('A', 'Subir e cabecear na bola parada', 'finalizar', 'FIS', 16),
       O('B', 'Ficar na marcação', 'seguro', 'MEN', 10)],
    ],
  },
  lateral: {
    def: [
      [O('A', 'Fechar o lado e dividir', 'desarmar', 'FIS', 14, { riscoConcede: 'falha' }),
       O('B', 'Dar o bote', 'desarmar', 'VIS', 13)],
    ],
    meio: [
      [O('A', 'Apoiar subindo (deixa espaço)', 'progredir', 'FIS', 14, { exporContra: 1, momentum: 6 }),
       O('B', 'Segurar a posição', 'seguro', 'VIS', 10, { exporContra: 0 })],
    ],
    atk: [
      [O('A', 'Cruzar na área', 'criar', 'TEC', 14),
       O('B', 'Cortar pro meio e arriscar', 'finalizar', 'TEC', 16, { exporContra: 1 }),
       O('C', 'Recuar e dar a bola', 'seguro', 'VIS', 10)],
    ],
  },
  volante: {
    def: [
      [O('A', 'Desarmar no meio', 'desarmar', 'FIS', 14, { riscoConcede: 'falha' }),
       O('B', 'Falta tática pra cortar o contra-ataque', 'faltaTatica', 'VIS', 13, { dogso: 'spa' }),
       O('C', 'Recompor e marcar', 'seguro', 'VIS', 11)],
    ],
    meio: [
      [O('A', 'Primeiro passe pro ataque', 'criar', 'VIS', 14),
       O('B', 'Conduzir e progredir (deixa espaço)', 'progredir', 'TEC', 15, { exporContra: 1, momentum: 6 }),
       O('C', 'Tocar de lado e manter', 'seguro', 'TEC', 10)],
    ],
    atk: [
      [O('A', 'Chutar de fora', 'finalizar', 'TEC', 16),
       O('B', 'Lançar na medida', 'criar', 'VIS', 14)],
    ],
  },
  meia: {
    meio: [
      [O('A', 'Lançar nas costas da defesa', 'criar', 'VIS', 14),
       O('B', 'Arriscar o chute de fora', 'finalizar', 'TEC', 16),
       O('C', 'Tocar curto e manter a posse', 'seguro', 'TEC', 10)],
      [O('A', 'Conduzir e encarar a marcação (deixa espaço)', 'progredir', 'TEC', 15, { exporContra: 2, momentum: 8 }),
       O('B', 'Tabelar e tentar o passe', 'criar', 'VIS', 13, { exporContra: 1 }),
       O('C', 'Segurar a posição e dar a bola', 'seguro', 'TEC', 10, { exporContra: 0 })],
    ],
    atk: [
      [O('A', 'Achar o último passe', 'criar', 'VIS', 14),
       O('B', 'Bater de primeira', 'finalizar', 'TEC', 16),
       O('C', 'Cobrar a falta no ângulo', 'bolaParada', 'TEC', 16)],
    ],
    def: [
      [O('A', 'Voltar e ajudar na marcação', 'desarmar', 'VIS', 13),
       O('B', 'Segurar a bola pra aliviar', 'seguro', 'TEC', 11)],
    ],
  },
  ponta: {
    atk: [
      [O('A', 'Partir pra cima e driblar', 'progredir', 'TEC', 15, { momentum: 8 }),
       O('B', 'Cruzar rasteiro', 'criar', 'VIS', 13),
       O('C', 'Cortar pro meio e finalizar', 'finalizar', 'TEC', 16)],
      [O('A', 'Cavar a falta na ponta', 'simular', 'CAR', 14, { ganhaFalta: 'falta' }),
       O('B', 'Encarar o lateral no drible', 'progredir', 'TEC', 15)],
    ],
    meio: [
      [O('A', 'Conduzir e progredir', 'progredir', 'TEC', 15, { exporContra: 1, momentum: 6 }),
       O('B', 'Tocar e manter', 'seguro', 'TEC', 10)],
    ],
    def: [
      [O('A', 'Voltar pra ajudar o lateral', 'desarmar', 'FIS', 14),
       O('B', 'Ficar no contra-ataque', 'seguro', 'FIS', 11, { exporContra: 0 })],
    ],
  },
  centroavante: {
    atk: [
      [O('A', 'Finalizar de primeira', 'finalizar', 'MEN', 16),
       O('B', 'Girar sobre o zagueiro', 'progredir', 'TEC', 15, { exporContra: 1 }),
       O('C', 'Tocar pro companheiro melhor posto', 'criar', 'VIS', 11)],
      [O('A', 'Cabecear pro gol', 'finalizar', 'FIS', 16),
       O('B', 'Fazer o pivô e segurar', 'seguro', 'MEN', 11),
       O('C', 'Cavar o pênalti', 'simular', 'CAR', 15, { ganhaFalta: 'penalti' })],
    ],
    meio: [
      [O('A', 'Buscar a bola e tabelar', 'criar', 'VIS', 13),
       O('B', 'Receber de costas e girar', 'progredir', 'TEC', 15, { exporContra: 1 })],
    ],
    def: [
      [O('A', 'Pressionar a saída de bola', 'desarmar', 'FIS', 15, { exporContra: 1 }),
       O('B', 'Segurar a referência no ataque', 'seguro', 'MEN', 11, { exporContra: 0 })],
    ],
  },
  // Técnico: decisões macro do banco, por gatilho. tipos próprios
  // (postura/substituir/pressing/recuar/esquema/conversa) + beats (mental/provocar).
  tecnico: {
    inicio: [
      [O('A', 'Entrar pra cima, postura ofensiva', 'postura', 'CAR', 13, { tilt: 'ofensivo' }),
       O('B', 'Equilíbrio: sentir o jogo primeiro', 'postura', 'VIS', 11, { tilt: 'equilibrio' }),
       O('C', 'Entrar cauteloso e fechar os espaços', 'postura', 'MEN', 13, { tilt: 'cauteloso' })],
    ],
    sofreu: [
      [O('A', 'Mexer já: sangue novo no ataque', 'substituir', 'VIS', 15, { alvo: 'ofensivo' }),
       O('B', 'Manter e ajustar na orientação', 'seguro', 'MEN', 10),
       O('C', 'Mandar pressionar a saída deles', 'pressing', 'CAR', 14, { exporContra: 1 })],
    ],
    fez: [
      [O('A', 'Administrar a vantagem', 'recuar', 'MEN', 12),
       O('B', 'Ir pra cima e ampliar', 'pressing', 'CAR', 14, { exporContra: 1 }),
       O('C', 'Segurar a posse e baixar o ritmo', 'seguro', 'VIS', 11)],
    ],
    intervalo: [
      [O('A', 'Trocar e assumir o jogo (sangue novo)', 'substituir', 'VIS', 14, { alvo: 'ofensivo', intervalo: true }),
       O('B', 'Reforçar o meio e segurar', 'recuar', 'MEN', 13, { intervalo: true }),
       O('C', 'Bronca e ajuste motivacional', 'conversa', 'CAR', 13)],
    ],
    reta: [
      [O('A', 'All-in: tudo no ataque', 'pressing', 'CAR', 15, { exporContra: 2 }),
       O('B', 'Trancar e segurar o resultado', 'recuar', 'MEN', 12),
       O('C', 'Mudar o esquema pra surpreender', 'esquema', 'VIS', 15)],
    ],
    disc: [
      [O('A', 'Segurar a cabeça e orientar da beira', 'mental', 'MEN', 12),
       O('B', 'Encarar o árbitro pela marcação', 'provocar', 'CAR', 16, { cartaoRisco: 'amarelo' })],
    ],
  },
};

// Lances de disciplina/cabeça — podem surgir em qualquer posição, em momentos quentes.
export const DISCIPLINA = [
  [O('A', 'Segurar a cabeça e seguir o jogo', 'mental', 'MEN', 12),
   O('B', 'Provocar o marcador pra tirá-lo do sério', 'provocar', 'CAR', 15, { cartaoRisco: 'amarelo' }),
   O('C', 'Ir reclamar com o árbitro', 'mental', 'CAR', 17, { cartaoRisco: 'amarelo' })],
];

// Devolve a lista de CONJUNTOS de opções disponíveis para (classe, zona),
// com fallback gracioso para classes/zonas sem entrada própria.
export function conjuntosDeLance(classe, zona) {
  const c = MECANICAS[classe] || MECANICAS.meia;
  if (zona === 'disciplina') return DISCIPLINA;
  return c[zona] || c.meio || c.atk || c.def || Object.values(c)[0];
}
