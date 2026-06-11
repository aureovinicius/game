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
  return preencher(tpl, ctx);
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
  return preencher(tpl, ctx);
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
