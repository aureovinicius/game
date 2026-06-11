// Motor de partida — simulação textual estilo Brasfoot, dirigível passo a passo.
//
// A UI chama `avancar()` em loop: o motor simula minutos e devolve os eventos
// narrados (incluindo flavor não-interativo) até bater num Lance Decisivo
// (pausa para a intervenção do jogador) ou no fim do jogo. O jogador resolve o
// Lance com o d20 e chama `resolverLance(...)`, e o loop continua.
//
// Novidades desta versão (ver docs/DESIGN-corpus-e-engine.md):
//   - Diretor de partida: de 4 a 8 lances, em quantidade/zona guiadas pela
//     PRESSÃO (placar, momentum, Elo, minuto). Sob pressão → lances defensivos;
//     pressionando → lances ofensivos.
//   - Tipos de lance ricos com `efeitos` (trade-offs): progredir, construir,
//     desarmar, criar, faltaTatica, simular, provocar, mental, etc.
//   - Sistema de cartões fiel ao IFAB (Lei 12): SPA→amarelo, DOGSO→vermelho,
//     DOGSO na área com tentativa de bola→amarelo+pênalti, sem tentativa→
//     vermelho+pênalti; simulação/provocação/reclamação→amarelo.
//   - Árbitro com `rigor` (-2..+2) que ajusta a dificuldade dos lances de "se
//     dar bem" (simular/provocar/reclamar).
//   - Eventos intermediários (trave, finalização perigosa, cartões de outros).
import { criarRng } from './dice.js';
import { conjuntosDeLance } from './mecanicas.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// Quanto o protagonista "puxa" o time, por classe (afeta ataque/defesa e a
// chance de o gol sair no pé dele).
const PESO_OFENSIVO = { goleiro: 0.1, zagueiro: 0.3, lateral: 0.4, volante: 0.5, meia: 0.7, ponta: 0.85, centroavante: 1.0 };
const PESO_DEFENSIVO = { goleiro: 1.0, zagueiro: 0.9, lateral: 0.7, volante: 0.7, meia: 0.4, ponta: 0.2, centroavante: 0.15 };

// Bônus de Elo que o protagonista dá ao time, a partir dos atributos.
export function bonusEloJogador(classeId, attrs) {
  if (classeId === 'tecnico') {
    // técnico não joga: o "bônus" vem de liderança/leitura (CAR/VIS/MEN).
    const lid = (attrs.CAR + attrs.VIS + attrs.MEN) / 3 - 12;
    return Math.round(lid * 6);
  }
  const ofe = (attrs.TEC + attrs.MEN + attrs.VIS) / 3 - 12;
  const def = (attrs.FIS + attrs.MEN + attrs.VIS) / 3 - 12;
  const po = PESO_OFENSIVO[classeId] ?? 0.5;
  const pd = PESO_DEFENSIVO[classeId] ?? 0.5;
  return Math.round((ofe * po + def * pd) * 9); // ~ -50..+90 de Elo
}

function expectativa(eloA, eloB) {
  return 1 / (1 + Math.pow(10, -(eloA - eloB) / 400));
}

// Sorteia N minutos de lance espalhados por [10, 88], crescentes e únicos.
function sortearAgenda(rng, n) {
  const min = 10, max = 88;
  const passo = (max - min) / n;
  const out = [];
  for (let i = 0; i < n; i++) {
    const base = min + passo * (i + 0.5);
    const jit = (rng() - 0.5) * passo * 0.8;
    out.push(Math.round(clamp(base + jit, min, max)));
  }
  for (let i = 1; i < out.length; i++) {
    if (out[i] <= out[i - 1]) out[i] = Math.min(max, out[i - 1] + 1);
  }
  return out;
}

export function criarPartida(cfg) {
  // cfg: { meuTime, advTime, classeId, attrs, fase, mando ('casa'|'fora'|'neutro'),
  //        mataMata, semente }
  const rng = criarRng(cfg.semente);
  const bonus = bonusEloJogador(cfg.classeId, cfg.attrs);
  const mando = cfg.mando === 'casa' ? 35 : cfg.mando === 'fora' ? -20 : 0;
  const meuElo = cfg.meuTime.elo + bonus + mando;
  const advElo = cfg.advTime.elo;
  const diff = meuElo - advElo;

  const lamMeuBase = clamp(1.35 + diff / 300, 0.35, 3.2);
  const lamAdvBase = clamp(1.35 - diff / 300, 0.35, 3.2);

  const modoTecnico = cfg.classeId === 'tecnico';
  // Quantidade de lances/decisões e quando ocorrem.
  const intensidade = clamp(1 - Math.abs(diff) / 320, 0, 1);
  const variacao = Math.floor(rng() * 3) - 1; // -1..+1
  const alvoLances = modoTecnico ? 5 : clamp(Math.round(4 + intensidade * 3) + (cfg.mataMata ? 1 : 0) + variacao, 4, 8);
  // Campo: agenda por pressão. Técnico: gatilhos (início, intervalo, reta) + eventos de gol.
  const agenda = modoTecnico ? [] : sortearAgenda(rng, alvoLances);
  const agendaSet = new Set(agenda);
  const agendaTecSet = modoTecnico ? new Set([1, 45, 76 + Math.floor(rng() * 8)]) : null;

  const estado = {
    meuTime: cfg.meuTime,
    advTime: cfg.advTime,
    classeId: cfg.classeId,
    fase: cfg.fase,
    mataMata: !!cfg.mataMata,
    minuto: 0,
    golsMeu: 0,
    golsAdv: 0,
    golsJogador: 0,
    assistJogador: 0,
    momentum: 0,        // -100..100 (+ a seu favor)
    alvoLances,
    lancesRestantes: alvoLances,
    lancesUsados: 0,
    log: [],
    encerrada: false,
    pendingLance: null,
    resultadoPenaltis: null,
    bonusElo: bonus,
    // novos
    arbitro: { rigor: Math.floor(rng() * 5) - 2 }, // -2..+2
    cartoes: { amareloJog: 0, vermelhoJog: false, amareloAdv: 0 },
    multMeu: 1,
    multAdv: 1,
    exposto: 0,         // "deixou espaço"; aumenta a chance adversária e decai
    advUmAMenos: false, // adversário já expulso (evita 2 vermelhos no mesmo time)
    // técnico (modo manager)
    janelasRestantes: 3,
    subsRestantes: 5,
    fadiga: 0,
    tecnicoExpulso: false,
    _gatEvt: null,      // gatilho de decisão agendado após um gol
    _beatUsado: false,
  };

  function fatorMomentum(sinal) {
    return clamp(1 + (sinal * estado.momentum) / 250, 0.6, 1.5);
  }
  const bump = (n) => { estado.momentum = clamp(estado.momentum + n, -100, 100); };

  function reg(minuto, texto, tipo = 'info') {
    estado.log.push({ minuto, texto, tipo });
  }
  function efx(minuto, texto) {
    reg(minuto, texto, 'rpg');
    return { tipo: 'rpg', texto, minuto };
  }

  // modo: 'jogador' (o protagonista marca), 'time' (companheiro marca),
  // 'fluxo' (sorteia pelo peso da classe).
  function golMeu(eventos, modo) {
    estado.golsMeu++;
    bump(14);
    const po = PESO_OFENSIVO[estado.classeId] ?? 0.5;
    let fezGol;
    if (estado.classeId === 'tecnico') fezGol = false; // técnico não marca
    else if (modo === 'jogador') fezGol = true;
    else if (modo === 'time') fezGol = false;
    else fezGol = rng() < po * 0.6;

    let texto;
    if (fezGol) {
      estado.golsJogador++;
      texto = `⚽ GOL DE ${estado.meuTime.tla}! Você marca! (${estado.golsMeu}–${estado.golsAdv})`;
    } else {
      let assistTxt = '';
      if (estado.classeId !== 'tecnico' && modo === 'fluxo' && rng() < 0.5) { estado.assistJogador++; assistTxt = ' Assistência sua!'; }
      texto = `⚽ GOL DE ${estado.meuTime.tla}!${assistTxt} (${estado.golsMeu}–${estado.golsAdv})`;
    }
    reg(estado.minuto, texto, 'gol-meu');
    eventos.push({ tipo: 'gol-meu', texto, minuto: estado.minuto });
  }

  function golAdv(eventos) {
    estado.golsAdv++;
    bump(-12);
    const texto = `💔 Gol do ${estado.advTime.tla}. (${estado.golsMeu}–${estado.golsAdv})`;
    reg(estado.minuto, texto, 'gol-adv');
    eventos.push({ tipo: 'gol-adv', texto, minuto: estado.minuto });
  }

  // --- Cartões (IFAB, Lei 12) ------------------------------------------------
  function cartaoJogador(eventos, cor, motivo) {
    if (cor === 'amarelo') {
      estado.cartoes.amareloJog++;
      if (estado.cartoes.amareloJog >= 2 && !estado.cartoes.vermelhoJog) {
        estado.cartoes.vermelhoJog = true;
        estado.multMeu *= 0.78; estado.multAdv *= 1.18; bump(-12);
        eventos.push(efx(estado.minuto, `🟨🟥 Segundo amarelo (${motivo}) — você está EXPULSO! ${estado.meuTime.tla} com um a menos.`));
      } else {
        eventos.push(efx(estado.minuto, `🟨 Amarelo — ${motivo}.`));
      }
    } else {
      estado.cartoes.vermelhoJog = true;
      estado.multMeu *= 0.72; estado.multAdv *= 1.22; bump(-16);
      eventos.push(efx(estado.minuto, `🟥 VERMELHO — ${motivo}. Você está EXPULSO! ${estado.meuTime.tla} com um a menos.`));
    }
  }
  function penaltiAdversario(eventos) {
    eventos.push(efx(estado.minuto, '⚠️ Pênalti para o adversário.'));
    if (rng() < 0.78) golAdv(eventos);
    else eventos.push(efx(estado.minuto, '🧤 Mas o goleiro defende o pênalti!'));
  }
  function penaltiMeu(eventos) {
    eventos.push(efx(estado.minuto, '⚽ Pênalti a favor!'));
    if (rng() < 0.78) golMeu(eventos, 'jogador');
    else eventos.push(efx(estado.minuto, '😣 Você perde o pênalti.'));
  }

  // Eventos intermediários (sem decisão), para dar ritmo de jogo.
  function flavor(eventos) {
    const r = rng();
    if (r < 0.25) eventos.push(efx(estado.minuto, `🎯 Finalização perigosa do ${estado.advTime.tla}, mas o goleiro espalma.`));
    else if (r < 0.45) eventos.push(efx(estado.minuto, `🪵 Na trave! ${estado.meuTime.tla} quase abre o placar.`));
    else if (r < 0.60) eventos.push(efx(estado.minuto, `💨 ${estado.meuTime.tla} chega com perigo pela ponta.`));
    else if (r < 0.82 || estado.advUmAMenos) eventos.push(efx(estado.minuto, `🟨 Amarelo para um jogador do ${estado.advTime.tla}.`));
    else {
      eventos.push(efx(estado.minuto, `🟥 Vermelho para o ${estado.advTime.tla}! Ficam com um a menos.`));
      estado.advUmAMenos = true;
      estado.multMeu *= 1.12; estado.multAdv *= 0.9; bump(8);
    }
  }

  // Zona do lance, derivada da pressão atual.
  function zonaDoLance() {
    const m = estado.momentum;
    const perdendo = estado.golsMeu < estado.golsAdv;
    const segurandoFim = estado.golsMeu > estado.golsAdv && estado.minuto >= 70;
    if (segurandoFim || m <= -25) return 'def';
    if (perdendo || m >= 25) return 'atk';
    return 'meio';
  }

  // Avança a simulação até o próximo Lance Decisivo ou o fim do jogo.
  function avancar() {
    if (estado.encerrada) return { tipo: 'fim', estado };
    const eventos = [];
    while (estado.minuto < 90) {
      estado.minuto++;

      if (modoTecnico) {
        if (estado.lancesUsados < 7) {
          if (estado._gatEvt && estado.minuto >= estado._gatEvt.min) {
            const g = estado._gatEvt.tipo; estado._gatEvt = null;
            estado.pendingLance = { minuto: estado.minuto, zona: g };
            return { tipo: 'lance', minuto: estado.minuto, eventos };
          }
          if (agendaTecSet.has(estado.minuto)) {
            const g = estado.minuto <= 1 ? 'inicio' : estado.minuto === 45 ? 'intervalo' : 'reta';
            estado.pendingLance = { minuto: estado.minuto, zona: g };
            return { tipo: 'lance', minuto: estado.minuto, eventos };
          }
          if (!estado._beatUsado && estado.minuto > 25 && estado.minuto < 78 && rng() < 0.03) {
            estado._beatUsado = true;
            estado.pendingLance = { minuto: estado.minuto, zona: 'disc' };
            return { tipo: 'lance', minuto: estado.minuto, eventos };
          }
        }
      } else if (agendaSet.has(estado.minuto) && estado.lancesRestantes > 0) {
        const disc = estado.lancesUsados > 0 && rng() < 0.08;
        estado.pendingLance = { minuto: estado.minuto, zona: disc ? 'disciplina' : zonaDoLance() };
        return { tipo: 'lance', minuto: estado.minuto, eventos };
      }

      if (rng() < 0.05) flavor(eventos);

      const antesMeu = estado.golsMeu, antesAdv = estado.golsAdv;
      const pMeu = (lamMeuBase / 90) * fatorMomentum(+1) * estado.multMeu;
      const pAdv = (lamAdvBase / 90) * fatorMomentum(-1) * estado.multAdv * (1 + 0.12 * estado.exposto);
      const r = rng();
      if (r < pMeu) golMeu(eventos, 'fluxo');
      else if (r < pMeu + pAdv) golAdv(eventos);

      // técnico: um gol (seu ou sofrido) agenda uma decisão de reação logo em seguida
      if (modoTecnico && !estado._gatEvt && estado.lancesUsados < 7 && estado.minuto < 88) {
        if (estado.golsMeu > antesMeu) estado._gatEvt = { min: estado.minuto + 1, tipo: 'fez' };
        else if (estado.golsAdv > antesAdv) estado._gatEvt = { min: estado.minuto + 1, tipo: 'sofreu' };
      }

      estado.momentum *= 0.985;
      estado.exposto *= 0.7;
      if (estado.exposto < 0.05) estado.exposto = 0;
    }
    return finalizar(eventos);
  }

  function finalizar(eventos = []) {
    estado.minuto = 90;
    estado.encerrada = true;
    if (estado.mataMata && estado.golsMeu === estado.golsAdv) {
      const chance = clamp(0.5 + (diff / 1200) + ((cfg.attrs.MEN - 12) * 0.03), 0.2, 0.8);
      const venci = rng() < chance;
      estado.resultadoPenaltis = venci ? 'venci' : 'perdi';
      const texto = `🥅 Nos pênaltis: ${venci ? 'classificação! ' + estado.meuTime.tla : 'eliminado — ' + estado.advTime.tla + ' avança'}.`;
      reg(90, texto, venci ? 'gol-meu' : 'gol-adv');
      eventos.push({ tipo: 'penaltis', texto, minuto: 90, venci });
    }
    return { tipo: 'fim', estado, eventos };
  }

  function normTipo(t) {
    if (t === 'passar') return 'criar';
    if (t === 'driblar') return 'progredir';
    if (t === 'defender') return 'defesa';
    return t;
  }

  // Resolve um Lance Decisivo já rolado no d20.
  // opcao: { id, texto, stat, cd, tipo, efeitos }   resultado: de dice.rolar(...)
  function resolverLance(opcao, resultado) {
    estado.pendingLance = null;
    estado.lancesRestantes = Math.max(0, estado.lancesRestantes - 1);
    estado.lancesUsados++;
    const eventos = [];
    const minuto = estado.minuto;
    const ef = opcao.efeitos || {};
    const sucesso = resultado.sucesso, crit = resultado.critico, critFail = resultado.falhaCritica;
    const tipo = normTipo(opcao.tipo);

    if (ef.exporContra) estado.exposto = Math.max(estado.exposto, ef.exporContra);

    switch (tipo) {
      case 'defesa': {
        if (critFail) { eventos.push(efx(minuto, '💥 Falha crítica na saída — o adversário aproveita.')); golAdv(eventos); bump(-10); }
        else if (!sucesso) { eventos.push(efx(minuto, '😬 Quase! A defesa segura no susto.')); bump(-4); }
        else if (crit) { eventos.push(efx(minuto, '🧤 DEFESAÇA! Você salva o que era gol certo e levanta a torcida.')); bump(16); }
        else { eventos.push(efx(minuto, '✋ Boa intervenção — perigo afastado.')); bump(8); }
        break;
      }
      case 'seguro': {
        if (sucesso) { bump(ef.momentum || 6); eventos.push(efx(minuto, '👍 Jogada de craque sem riscos — controle mantido.')); }
        else { eventos.push(efx(minuto, '➖ A jogada segura não rende muito, mas não custa nada.')); }
        if (ef.entregaPosse) bump(-3);
        break;
      }
      case 'construir': {
        if (critFail || (!sucesso && ef.riscoConcede === 'falha')) { eventos.push(efx(minuto, '💥 Erro na saída de bola, presente para o adversário!')); golAdv(eventos); bump(-8); }
        else if (!sucesso) { eventos.push(efx(minuto, '↩️ A saída trava; recomeça de trás.')); bump(-3); }
        else { eventos.push(efx(minuto, '🎯 Saiu jogando com categoria — posse mantida.')); bump(ef.momentum || 6); }
        break;
      }
      case 'desarmar': {
        if (critFail) { eventos.push(efx(minuto, '💥 Passou batido — contra-ataque!')); if (rng() < 0.5) golAdv(eventos); bump(-6); }
        else if (!sucesso) { eventos.push(efx(minuto, '😬 Chegou atrasado e cometeu a falta.')); bump(-2); if (ef.riscoConcede === 'falha' && rng() < 0.25) cartaoJogador(eventos, 'amarelo', 'falta temerária'); }
        else { eventos.push(efx(minuto, '🦶 Desarme limpo — bola recuperada.')); bump(ef.momentum || 6); }
        break;
      }
      case 'criar': {
        if (critFail) { eventos.push(efx(minuto, '💥 Passe errado feio — contra-ataque!')); if (rng() < 0.5) golAdv(eventos); }
        else if (!sucesso) { eventos.push(efx(minuto, '↩️ O passe não encontra ninguém. Recomeça.')); bump(-3); }
        else {
          estado.assistJogador++;
          if (crit || rng() < 0.8) { golMeu(eventos, 'time'); if (crit) eventos.push(efx(minuto, '✨ Assistência de placa!')); }
          else eventos.push(efx(minuto, '🅰️ Que passe! O finalizador, porém, manda por cima.'));
        }
        break;
      }
      case 'progredir': {
        if (critFail) { eventos.push(efx(minuto, '💥 Perde a bola e o adversário sai em velocidade.')); if (rng() < (ef.riscoConcede === 'falha' ? 0.6 : 0.4)) golAdv(eventos); bump(-8); }
        else if (!sucesso) { eventos.push(efx(minuto, '⛔ A marcação corta o drible.')); bump(-3); if (ef.riscoConcede === 'falha' && rng() < 0.4) golAdv(eventos); }
        else { eventos.push(efx(minuto, '🔥 Avança com perigo e ganha a frente!')); bump(ef.momentum || 8); }
        break;
      }
      case 'finalizar':
      case 'bolaParada': {
        if (critFail) { eventos.push(efx(minuto, '💥 Finalização desastrada — contra-ataque!')); if (rng() < 0.45) golAdv(eventos); bump(-8); }
        else if (!sucesso) { eventos.push(efx(minuto, '🧤 O goleiro defende! Faltou capricho.')); bump(-3); }
        else if (crit) { golMeu(eventos, 'jogador'); eventos.push(efx(minuto, '✨ GOLAÇO! Um lance para a história da Copa.')); bump(20); }
        else { golMeu(eventos, 'jogador'); }
        break;
      }
      case 'faltaTatica': {
        if (sucesso) {
          const d = ef.dogso || 'spa';
          if (d === 'spa') { eventos.push(efx(minuto, '🛑 Falta tática — ataque cortado a tempo.')); cartaoJogador(eventos, 'amarelo', 'parar um ataque promissor'); }
          else if (d === 'fora') { eventos.push(efx(minuto, '🛑 Última esperança: você derruba o atacante.')); cartaoJogador(eventos, 'vermelho', 'impedir uma chance clara de gol'); }
          else if (d === 'area_bola') { cartaoJogador(eventos, 'amarelo', 'pênalti tentando jogar a bola'); penaltiAdversario(eventos); }
          else { cartaoJogador(eventos, 'vermelho', 'derrubar na área sem disputar a bola'); penaltiAdversario(eventos); }
        } else { eventos.push(efx(minuto, '😖 Não chegou na falta — o adversário fica livre.')); golAdv(eventos); }
        break;
      }
      case 'simular': {
        if (sucesso) {
          if (ef.ganhaFalta === 'penalti') penaltiMeu(eventos);
          else { eventos.push(efx(minuto, '🎭 Cavou a falta — bola parada perigosa a favor.')); bump(4); }
        } else { eventos.push(efx(minuto, '🎭 O árbitro não comprou: ')); cartaoJogador(eventos, 'amarelo', 'simulação'); bump(-4); }
        break;
      }
      case 'provocar': {
        if (estado.classeId === 'tecnico') {
          if (sucesso) { eventos.push(efx(minuto, '🗣️ Você pressiona o árbitro da beira e impõe respeito.')); bump(4); }
          else { estado.tecnicoExpulso = true; bump(-6); eventos.push(efx(minuto, '🟥 Expulso da área técnica! Você vai pra arquibancada e a leitura do jogo piora.')); }
          break;
        }
        if (sucesso) {
          eventos.push(efx(minuto, '😤 O marcador cai na provocação e se complica.'));
          estado.cartoes.amareloAdv++;
          if (estado.cartoes.amareloAdv >= 2 && !estado.advUmAMenos) { eventos.push(efx(minuto, `🟥 Expulso o adversário! ${estado.advTime.tla} com um a menos.`)); estado.advUmAMenos = true; estado.multMeu *= 1.18; estado.multAdv *= 0.82; }
          else eventos.push(efx(minuto, `🟨 Amarelo para o ${estado.advTime.tla}.`));
          bump(6);
        } else { cartaoJogador(eventos, 'amarelo', 'conduta provocativa'); }
        break;
      }
      case 'mental': {
        if (estado.classeId === 'tecnico') {
          if (sucesso) { eventos.push(efx(minuto, '🧠 Você mantém a calma e orienta o time da beira.')); bump(6); }
          else { eventos.push(efx(minuto, '😤 A irritação contagia o banco; a concentração cai.')); bump(-3); }
        } else if (sucesso) { eventos.push(efx(minuto, '🧘 Você segura a cabeça e mantém o foco.')); bump(6); }
        else { cartaoJogador(eventos, ef.cartaoRisco === 'amarelo' ? 'amarelo' : 'vermelho', ef.cartaoRisco === 'amarelo' ? 'reclamação' : 'revide'); }
        break;
      }
      case 'postura': {
        const t = ef.tilt;
        if (sucesso) {
          if (t === 'ofensivo') { estado.multMeu *= 1.08; eventos.push(efx(minuto, '📋 O time entra ligado, buscando o jogo.')); }
          else if (t === 'cauteloso') { estado.multAdv *= 0.92; eventos.push(efx(minuto, '📋 O time entra fechado e bem postado.')); }
          else { bump(6); eventos.push(efx(minuto, '📋 O time entra equilibrado, sentindo o adversário.')); }
        } else { eventos.push(efx(minuto, '📋 O time não entra como o planejado.')); bump(-4); }
        break;
      }
      case 'substituir': {
        if (!ef.intervalo && estado.janelasRestantes <= 0) { eventos.push(efx(minuto, '🔁 Sem janelas de substituição — ajuste só na orientação.')); break; }
        if (!ef.intervalo) estado.janelasRestantes--;
        estado.subsRestantes = Math.max(0, estado.subsRestantes - 1);
        estado.fadiga = Math.max(0, estado.fadiga - 2);
        if (sucesso) {
          if (ef.alvo === 'ofensivo') { estado.multMeu *= 1.12; bump(8); eventos.push(efx(minuto, '🔁 Sangue novo no ataque — o time cresce de produção.')); }
          else { estado.multAdv *= 0.88; bump(4); eventos.push(efx(minuto, '🔁 Reforço defensivo entra e fecha o time.')); }
        } else { bump(-4); eventos.push(efx(minuto, '🔁 A mexida não pega bem e o time se desorganiza um pouco.')); }
        break;
      }
      case 'pressing': {
        if (sucesso) { estado.multMeu *= 1.10; estado.exposto = Math.max(estado.exposto, ef.exporContra || 1); estado.fadiga += 2; bump(8); eventos.push(efx(minuto, '⏫ Pressão na saída deles — o time sufoca o adversário.')); }
        else { estado.exposto = Math.max(estado.exposto, ef.exporContra || 1); estado.fadiga += 2; bump(-6); eventos.push(efx(minuto, '⏫ A pressão não funciona e deixa espaços nas costas.')); }
        break;
      }
      case 'recuar': {
        if (sucesso) { estado.multAdv *= 0.85; bump(-2); eventos.push(efx(minuto, '⏬ O time recua organizado e fecha os espaços.')); }
        else { estado.multAdv *= 0.96; bump(-6); eventos.push(efx(minuto, '⏬ O recuo sai mal feito e convida a pressão adversária.')); }
        break;
      }
      case 'esquema': {
        const perdendo = estado.golsMeu < estado.golsAdv;
        if (sucesso) { if (perdendo) estado.multMeu *= 1.08; else estado.multAdv *= 0.92; bump(6); eventos.push(efx(minuto, '♟️ A mudança de esquema pega o adversário de surpresa.')); }
        else { bump(-6); eventos.push(efx(minuto, '♟️ O time se perde por alguns minutos com a mudança.')); }
        break;
      }
      case 'conversa': {
        if (sucesso) { bump(18); estado.multMeu *= 1.05; eventos.push(efx(minuto, '🗣️ A conversa pega: o time volta inteiro pro segundo tempo.')); }
        else { bump(2); eventos.push(efx(minuto, '🗣️ A fala não muda muito o ânimo do grupo.')); }
        break;
      }
      default: {
        // tipo desconhecido: trata como jogada segura, para nunca travar.
        if (sucesso) bump(4);
        break;
      }
    }

    return { eventos, encerraApos: estado.minuto >= 90 };
  }

  // Opções do Lance pendente, conforme classe + zona, com o rigor do árbitro
  // aplicado aos lances de "se dar bem" (simular/provocar/reclamar).
  // "Encaixe": escolher a alavanca certa pro estado do jogo baixa a CD; errar a
  // leitura sobe a CD. -2 = ótimo encaixe, +3 = leitura ruim.
  function fitDeltaTec(o, e) {
    const ef = o.efeitos || {};
    const perdendo = e.golsMeu < e.golsAdv, ganhando = e.golsMeu > e.golsAdv, fim = e.minuto >= 70;
    const ofensivo = o.tipo === 'pressing' || (o.tipo === 'substituir' && ef.alvo === 'ofensivo') || (o.tipo === 'postura' && ef.tilt === 'ofensivo') || (o.tipo === 'esquema' && perdendo);
    const defensivo = o.tipo === 'recuar' || (o.tipo === 'substituir' && ef.alvo === 'defensivo') || (o.tipo === 'postura' && ef.tilt === 'cauteloso');
    if (ofensivo) return (perdendo || e.momentum >= 20) ? -2 : (ganhando && fim ? 3 : 0);
    if (defensivo) return (ganhando || e.momentum <= -20) ? -2 : (perdendo && fim ? 3 : 0);
    return 0;
  }

  function opcoesPadrao() {
    const zona = (estado.pendingLance && estado.pendingLance.zona) || (estado.classeId === 'tecnico' ? 'inicio' : zonaDoLance());
    const conjuntos = conjuntosDeLance(estado.classeId, zona);
    const set = conjuntos[Math.floor(rng() * conjuntos.length)] || conjuntos[0];
    if (estado.classeId === 'tecnico') {
      return set.map((o) => ({ ...o, cd: o.cd + fitDeltaTec(o, estado) + (estado.tecnicoExpulso ? 1 : 0), efeitos: o.efeitos || {} }));
    }
    return set.map((o) => {
      const ajuste = (o.tipo === 'simular' || o.tipo === 'provocar' || (o.tipo === 'mental' && (o.efeitos || {}).cartaoRisco)) ? estado.arbitro.rigor : 0;
      return { ...o, cd: o.cd + ajuste, efeitos: o.efeitos || {} };
    });
  }

  // Nota do jogador na partida (6.0 base + contribuições).
  function notaJogador() {
    if (estado.classeId === 'tecnico') {
      const ganhou = estado.golsMeu > estado.golsAdv || estado.resultadoPenaltis === 'venci';
      const empate = estado.golsMeu === estado.golsAdv && !estado.resultadoPenaltis;
      let n = 6.0;
      if (ganhou) n += 2.0; else if (empate) n += 0.3; else n -= 1.0;
      if (estado.golsAdv === 0 && (ganhou || empate)) n += 0.8;
      if (estado.golsMeu >= 3) n += 0.5;
      if (estado.tecnicoExpulso) n -= 0.5;
      return clamp(Math.round(n * 10) / 10, 3.0, 10.0);
    }
    let nota = 6.0;
    nota += estado.golsJogador * 1.1;
    nota += estado.assistJogador * 0.7;
    if (estado.golsMeu > estado.golsAdv) nota += 0.5;
    if (estado.classeId === 'goleiro' || estado.classeId === 'zagueiro') {
      if (estado.golsAdv === 0) nota += 1.0;
      nota -= estado.golsAdv * 0.3;
    }
    nota -= estado.cartoes.amareloJog * 0.2;
    if (estado.cartoes.vermelhoJog) nota -= 0.8;
    return clamp(Math.round(nota * 10) / 10, 3.0, 10.0);
  }

  return {
    estado,
    avancar,
    finalizar,
    resolverLance,
    opcoesPadrao,
    notaJogador,
    get contexto() {
      return {
        meuTime: estado.meuTime.name, advTime: estado.advTime.name,
        placar: `${estado.golsMeu}–${estado.golsAdv}`,
        minuto: estado.minuto, momentum: Math.round(estado.momentum),
        fase: estado.fase, classe: estado.classeId,
        zona: estado.pendingLance ? estado.pendingLance.zona : null,
      };
    },
  };
}
