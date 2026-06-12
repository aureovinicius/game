// Narrador offline — consome o corpus (data/narrativa.json) e devolve texto
// pronto, preenchendo os slots ({minuto}, {advTime}, ...) com o estado da
// partida. É o que dá variedade ao jogo SEM chamar a IA: molde + encaixe.
//
// Uso:
//   await carregarNarrativa();                 // uma vez, no início do app
//   situacao({ zona, tom, ctx });              // texto da situação do lance
//   cena({ tipo, tom, resultado, ctx });       // pré/pós/epílogo
//
// Em Node (testes) dá pra injetar o corpus com setNarrativa(obj).

let DB = null;

export async function carregarNarrativa() {
  if (DB) return DB;
  const resp = await fetch('data/narrativa.json', { cache: 'force-cache' });
  if (!resp.ok) throw new Error('Falha ao carregar narrativa');
  DB = await resp.json();
  return DB;
}

export function setNarrativa(obj) { DB = obj; }
export function narrativaCarregada() { return !!DB; }

// Nomes dos jogadores por seleção (data/nomes.json), citados nos lances.
let NOMES = null;
export async function carregarNomes() {
  if (NOMES) return NOMES;
  const r = await fetch('data/nomes.json', { cache: 'force-cache' });
  if (r.ok) NOMES = await r.json();
  return NOMES;
}
export function setNomes(obj) { NOMES = obj; }
function nomeDoTime(id) {
  const lista = NOMES && (NOMES[id] || NOMES[String(id)]);
  if (!lista || !lista.length) return null;
  return lista[Math.floor(Math.random() * lista.length)];
}

// Concordância de artigo/gênero do país (art: 'o'|'a'|'os'|'as'|'').
const DE = { o: 'do', a: 'da', os: 'dos', as: 'das' };
function comArtigo(nome, art) { return nome ? (art ? `${art} ${nome}` : nome) : ''; }
function comDe(nome, art) { return nome ? (art ? `${DE[art]} ${nome}` : `de ${nome}`) : ''; }
function capitalizar(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }
export function artNome(time) { return time ? comArtigo(time.name, time.art) : ''; }
export function deNome(time) { return time ? comDe(time.name, time.art) : ''; }

// Enriquece o ctx com nomes de jogadores e os slots de seleção com artigo
// ({oAdv}/{doAdv}/{oMeu}/{doMeu}), preservando o que já vier preenchido.
function enriquecer(ctx) {
  const c = { ...ctx };
  if (c.companheiro == null) c.companheiro = nomeDoTime(c.meuTimeId) || 'um companheiro';
  if (c.advJogador == null) c.advJogador = nomeDoTime(c.advTimeId) || 'um adversário';
  if (c.oAdv == null) c.oAdv = comArtigo(c.advTime, c.advTimeArt);
  if (c.doAdv == null) c.doAdv = comDe(c.advTime, c.advTimeArt);
  if (c.oMeu == null) c.oMeu = comArtigo(c.meuTime, c.meuTimeArt);
  if (c.doMeu == null) c.doMeu = comDe(c.meuTime, c.meuTimeArt);
  // Versões capitalizadas para início de frase ("A Áustria espera...").
  if (c.OAdv == null) c.OAdv = capitalizar(c.oAdv);
  if (c.OMeu == null) c.OMeu = capitalizar(c.oMeu);
  return c;
}

// Sorteio com anti-repetição: evita devolver o mesmo molde da mesma célula
// duas vezes seguidas (memória por chave), pra a variedade do corpus render.
const _recente = new Map();
function pick(arr, chave) {
  if (!arr || !arr.length) return null;
  if (arr.length === 1) return arr[0];
  const ultimo = chave ? _recente.get(chave) : null;
  let cand = arr[Math.floor(Math.random() * arr.length)];
  for (let i = 0; i < 4 && cand === ultimo; i++) cand = arr[Math.floor(Math.random() * arr.length)];
  if (chave) _recente.set(chave, cand);
  return cand;
}

// Preenche {slots} a partir do ctx; slots ausentes viram '' e a frase é limpa.
function preencher(tpl, ctx) {
  if (!tpl) return '';
  return tpl
    .replace(/\{(\w+)\}/g, (_, k) => (ctx && ctx[k] != null ? String(ctx[k]) : ''))
    .replace(/\s+([.,!?'])/g, '$1')   // tira espaço antes de pontuação
    .replace(/\(\s*\)/g, '')          // remove parênteses vazios ("()")
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// Situação do Lance Decisivo, por zona (def/meio/atk/disciplina) e tom.
export function situacao({ zona = 'meio', tom = 'realista', ctx = {} } = {}) {
  const grupo = DB && DB.situacoes && DB.situacoes[zona];
  const lista = grupo ? (grupo[tom] || grupo.realista) : null;
  const tpl = pick(lista, `s:${zona}:${tom}`);
  if (!tpl) return fallbackSituacao(ctx);
  return preencher(tpl, enriquecer(ctx));
}

// Texto da opção de um lance, variado por tom, ligado pelo slug `acao`.
// Devolve null quando não há variante no corpus (o chamador mantém o texto fixo).
export function textoOpcao({ acao, tom = 'realista' } = {}) {
  const grupo = acao && DB && DB.opcoes && DB.opcoes[acao];
  if (!grupo) return null;
  const lista = grupo[tom] || grupo.realista;
  return pick(lista, `o:${acao}:${tom}`);
}

// Cena de pré/pós-jogo ou epílogo. Para 'pos', usa `resultado`
// ('vitoria'|'empate'|'derrota').
export function cena({ tipo = 'pre', tom = 'realista', resultado = 'vitoria', ctx = {} } = {}) {
  const raiz = DB && DB.cenas && DB.cenas[tipo];
  let lista = null;
  if (tipo === 'pos') {
    const porResultado = raiz && raiz[resultado];
    lista = porResultado ? (porResultado[tom] || porResultado.realista) : null;
  } else {
    lista = raiz ? (raiz[tom] || raiz.realista) : null;
  }
  const tpl = pick(lista, `c:${tipo}:${tom}:${tipo === 'pos' ? resultado : ''}`);
  if (!tpl) return fallbackCena(tipo, ctx);
  return preencher(tpl, enriquecer(ctx));
}

// Fallbacks mínimos caso o corpus não tenha carregado (rede off no 1º acesso).
function fallbackSituacao(ctx) {
  const m = ctx.minuto || '';
  return `Aos ${m}', a jogada se desenha e a decisão é sua.`.replace(" Aos '", " A jogada");
}
function fallbackCena(tipo, ctx) {
  const nome = ctx.nome || 'você';
  if (tipo === 'pre') return `${nome} entra em campo. É hora de jogar.`;
  if (tipo === 'epilogo') return `A história de ${nome} nesta Copa fica para sempre.`;
  return `Fim de jogo: ${ctx.placar || ''}.`.trim();
}
