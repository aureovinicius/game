// O "Mestre" — narrador do jogo. Fala com a Claude API através do Cloudflare
// Worker (a chave fica no Worker). Se não houver Worker configurado, ou se a
// chamada falhar/estourar a cota, cai numa biblioteca de eventos pré-escritos
// (custo zero, jogo nunca trava).
//
// Princípio de custo/robustez: a IA gera só o SABOR (texto da situação e das
// opções). A MECÂNICA (atributo, CD, tipo de lance) vem do motor e nunca é
// decidida pela IA — barateia, evita exploits e mantém o balanceamento.
import { MESTRE_PROXY_URL, IDIOMA } from './config.js';
import { situacao, cena } from './narrador.js';

export function mestreOnline() { return !!MESTRE_PROXY_URL; }

async function chamarWorker(rota, payload, timeoutMs = 12000) {
  if (!MESTRE_PROXY_URL) throw new Error('offline');
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const resp = await fetch(`${MESTRE_PROXY_URL.replace(/\/$/, '')}/${rota}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...payload, idioma: IDIOMA }),
      signal: ctrl.signal,
    });
    if (!resp.ok) throw new Error(`worker ${resp.status}`);
    return await resp.json();
  } finally {
    clearTimeout(t);
  }
}

// Gera a narrativa de um Lance Decisivo. Recebe as opções "padrão" (com a
// mecânica) e devolve { narrativa, opcoes } — opcoes mantém id/stat/cd/tipo,
// só o texto pode ter sido reescrito pela IA.
export async function gerarLance({ contexto, tom, classe, opcoesPadrao, usarIA }) {
  if (usarIA) {
    try {
      const data = await chamarWorker('lance', { contexto, tom, classe, opcoes: opcoesPadrao });
      if (data && data.narrativa && Array.isArray(data.opcoes)) {
        // mescla o texto da IA sobre a mecânica do motor (por id)
        const mapa = new Map(opcoesPadrao.map((o) => [o.id, o]));
        const opcoes = data.opcoes
          .filter((o) => mapa.has(o.id))
          .map((o) => ({ ...mapa.get(o.id), texto: String(o.texto || mapa.get(o.id).texto).slice(0, 80) }));
        if (opcoes.length === opcoesPadrao.length) {
          return { narrativa: String(data.narrativa).slice(0, 400), opcoes, fonte: 'ia' };
        }
      }
    } catch { /* cai no offline */ }
  }
  const ctx = {
    minuto: contexto.minuto, placar: contexto.placar,
    meuTime: contexto.meuTime, advTime: contexto.advTime,
    meuTla: contexto.meuTla, advTla: contexto.advTla,
  };
  const narrativa = situacao({ zona: contexto.zona || 'meio', tom, ctx });
  return { narrativa, opcoes: opcoesPadrao, fonte: 'offline' };
}

// Gera uma cena narrativa (pré-jogo, pós-jogo, epílogo). Devolve string.
export async function gerarCena({ tipo, contexto, tom, personagem, usarIA }) {
  if (usarIA) {
    try {
      const data = await chamarWorker('cena', { tipo, contexto, tom, personagem });
      if (data && data.texto) return { texto: String(data.texto).slice(0, 700), fonte: 'ia' };
    } catch { /* offline */ }
  }
  const resultado = contexto.ganhou ? 'vitoria' : contexto.empate ? 'empate' : 'derrota';
  const ctx = {
    nome: personagem?.nome || 'você',
    meuTime: contexto.meuTime, advTime: contexto.advTime,
    placar: contexto.placar, fase: contexto.fase,
  };
  return { texto: cena({ tipo, tom, resultado, ctx }), fonte: 'offline' };
}
