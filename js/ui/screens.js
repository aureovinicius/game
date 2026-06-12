// Telas do jogo. Cada função monta o HTML no #app e liga os eventos, chamando
// métodos do controlador `app` (definido em app.js).
import { CLASSES, ORIGENS, TONS, ATRIBUTOS, montarAtributos } from '../rules.js';
import { CONQUISTAS, conquistaPorId } from '../achievements.js';
import { modificador } from '../dice.js';
import { nomeFase, proximoNivel } from '../state.js';
import { perkPorId, perksDaClasse, galhosDaClasse, estadoPerk } from '../perks.js';

const $app = () => document.getElementById('app');
export function setScreen(html) {
  const app = $app();
  app.innerHTML = html;
  app.scrollTop = 0;
  window.scrollTo(0, 0);
}

function escudo(time, cls = 'crest') {
  if (!time) return '';
  if (time.crest) return `<img class="${cls}" src="${time.crest}" alt="" loading="lazy" onerror="this.style.display='none'">`;
  const fs = cls.includes('grande') ? '30px' : '18px';
  return `<span class="${cls}" style="display:inline-flex;align-items:center;justify-content:center;font-size:${fs}">⚽</span>`;
}
function modTxt(v) { const m = modificador(v); return (m >= 0 ? '+' : '') + m; }

// Bloco de traços (perks) na ficha — lista os ganhos e avisa de pontos a gastar.
function fichaPerks(save) {
  const tidos = (save.perks || []).map((id) => perkPorId(id)).filter(Boolean);
  const pend = (save.pontosPerks || 0) > 0
    ? `<p class="perks-pend">⭐ ${save.pontosPerks} ponto${save.pontosPerks > 1 ? 's' : ''} de traço a gastar — volte ao hub.</p>` : '';
  const lista = tidos.length
    ? tidos.map((p) => `<div class="perk-mini" title="${p.desc}"><span>${p.emoji}</span> <b>${p.nome}</b><small>${p.desc}</small></div>`).join('')
    : '<p class="muted">Nenhum traço ainda. Suba de nível para escolher.</p>';
  return `<div class="bloco"><h3>Traços</h3>${pend}<div class="perks-lista">${lista}</div></div>`;
}

// --- HOME -------------------------------------------------------------------
export function renderHome(app) {
  const temSave = !!app.save;
  setScreen(`
    <section class="tela tela-home">
      <div class="brasao">🏆</div>
      <h1 class="titulo">Crônicas<br>da Copa</h1>
      <p class="subtitulo">um RPG de mesa da Copa do Mundo</p>
      <div class="menu">
        ${temSave ? `<button class="btn btn-grande" id="b-continuar">▶ Continuar carreira</button>` : ''}
        <button class="btn ${temSave ? '' : 'btn-grande'}" id="b-nova">＋ Nova carreira</button>
        ${temSave ? `<button class="btn btn-ghost" id="b-apagar">🗑 Apagar carreira</button>` : ''}
      </div>
      <p class="rodape">5 Copas, de 1934 a 2026 · jogável offline</p>
    </section>`);
  if (temSave) document.getElementById('b-continuar').onclick = () => app.irHub();
  document.getElementById('b-nova').onclick = () => app.novaCarreiraTela();
  if (temSave) document.getElementById('b-apagar').onclick = () => app.apagarCarreira();
}

// --- CRIAÇÃO ----------------------------------------------------------------
const NIVEL_NOME = { iniciante: 'Iniciante', facil: 'Fácil', intermediario: 'Intermediário', dificil: 'Difícil', pro: 'Pro' };

function opcoesSelecoes(d) {
  const semGrupos = !d.formato || !d.formato.grupos;
  if (semGrupos) {
    return d.teams.slice().sort((a, b) => b.elo - a.elo)
      .map((t) => `<option value="${t.id}">${t.name} (Elo ${t.elo})</option>`).join('');
  }
  return Object.keys(d.porGrupo).sort().map((g) => {
    const times = d.porGrupo[g].slice().sort((a, b) => a.name.localeCompare(b.name));
    return `<optgroup label="Grupo ${g}">${times.map((t) => `<option value="${t.id}">${t.name} (Elo ${t.elo})</option>`).join('')}</optgroup>`;
  }).join('');
}

export function renderCreate(app, eras, dados) {
  // estado de rascunho na própria função
  let dadosAtual = dados;
  const draft = { nome: '', selecaoId: null, classeId: 'centroavante', origemId: 'base', tom: 'epico', eraId: (dados.era && dados.era.id) || '2026' };

  const optsEras = eras.map((e) => `<option value="${e.id}" ${e.id === draft.eraId ? 'selected' : ''}>${e.nome} · ${NIVEL_NOME[e.nivel] || e.nivel}</option>`).join('');
  const optsSelecoes = opcoesSelecoes(dados);

  const cardClasses = CLASSES.map((c) => `
    <button type="button" class="card-opt" data-tipo="classe" data-id="${c.id}">
      <span class="card-emoji">${c.emoji}</span>
      <span class="card-nome">${c.nome}</span>
      <span class="card-sub">${c.arquetipo}</span>
    </button>`).join('');

  const cardOrigens = ORIGENS.map((o) => `
    <button type="button" class="card-opt" data-tipo="origem" data-id="${o.id}">
      <span class="card-emoji">${o.emoji}</span>
      <span class="card-nome">${o.nome}</span>
    </button>`).join('');

  const cardTons = TONS.map((t) => `
    <button type="button" class="card-opt" data-tipo="tom" data-id="${t.id}">
      <span class="card-emoji">${t.emoji}</span>
      <span class="card-nome">${t.nome}</span>
    </button>`).join('');

  setScreen(`
    <section class="tela tela-create">
      <header class="topo"><button class="btn-voltar" id="b-voltar">‹</button><h2>Novo personagem</h2></header>

      <label class="campo"><span>Seu nome</span>
        <input id="in-nome" type="text" maxlength="28" placeholder="ex.: Tião da Vila" autocomplete="off">
      </label>

      <label class="campo"><span>Nível (Copa)</span>
        <select id="in-era">${optsEras}</select>
      </label>
      <p class="dica" id="dica-era"></p>

      <label class="campo"><span>Sua seleção</span>
        <select id="in-selecao"><option value="">— escolha —</option>${optsSelecoes}</select>
      </label>

      <div class="bloco"><h3>Classe (posição)</h3><div class="grid-cards" id="g-classe">${cardClasses}</div>
        <p class="dica" id="dica-classe"></p></div>

      <div class="bloco"><h3>Origem</h3><div class="grid-cards" id="g-origem">${cardOrigens}</div>
        <p class="dica" id="dica-origem"></p></div>

      <div class="bloco"><h3>Tom da campanha</h3><div class="grid-cards grid-3" id="g-tom">${cardTons}</div></div>

      <div class="bloco"><h3>Atributos iniciais</h3><div class="attrs" id="attrs"></div></div>

      <button class="btn btn-grande" id="b-comecar" disabled>Entrar na Copa ⚽</button>
    </section>`);

  function pintarAttrs() {
    const a = montarAtributos(draft.classeId, draft.origemId);
    document.getElementById('attrs').innerHTML = ATRIBUTOS.map((at) => `
      <div class="attr">
        <span class="attr-id">${at.id}</span>
        <span class="attr-val">${a[at.id]}</span>
        <span class="attr-mod">${modTxt(a[at.id])}</span>
        <span class="attr-nome">${at.nome}</span>
      </div>`).join('');
  }
  function marcar(tipo, id) {
    document.querySelectorAll(`[data-tipo="${tipo}"]`).forEach((b) => b.classList.toggle('ativo', b.dataset.id === id));
  }
  function validar() {
    const ok = draft.nome.trim() && draft.selecaoId && draft.classeId && draft.origemId && draft.tom;
    document.getElementById('b-comecar').disabled = !ok;
  }

  document.getElementById('b-voltar').onclick = () => app.irHome();
  document.getElementById('in-nome').oninput = (e) => { draft.nome = e.target.value; validar(); };
  document.getElementById('in-selecao').onchange = (e) => {
    const v = e.target.value;
    const t = v ? dadosAtual.teams.find((x) => String(x.id) === v) : null;
    draft.selecaoId = t ? t.id : null;
    validar();
  };
  document.getElementById('in-era').onchange = async (e) => {
    draft.eraId = e.target.value;
    draft.selecaoId = null;
    dadosAtual = await app.carregarEra(draft.eraId);
    document.getElementById('in-selecao').innerHTML = `<option value="">— escolha —</option>${opcoesSelecoes(dadosAtual)}`;
    document.getElementById('dica-era').textContent = (dadosAtual.era && dadosAtual.era.desc) || '';
    validar();
  };

  document.querySelectorAll('.card-opt').forEach((btn) => {
    btn.onclick = () => {
      const { tipo, id } = btn.dataset;
      if (tipo === 'classe') draft.classeId = id;
      if (tipo === 'origem') draft.origemId = id;
      if (tipo === 'tom') draft.tom = id;
      marcar(tipo, id);
      if (tipo === 'classe') document.getElementById('dica-classe').textContent = CLASSES.find((c) => c.id === id).exito;
      if (tipo === 'origem') document.getElementById('dica-origem').textContent = ORIGENS.find((o) => o.id === id).desc;
      pintarAttrs();
      validar();
    };
  });

  // defaults marcados
  marcar('classe', draft.classeId); marcar('origem', draft.origemId); marcar('tom', draft.tom);
  document.getElementById('dica-classe').textContent = CLASSES.find((c) => c.id === draft.classeId).exito;
  document.getElementById('dica-origem').textContent = ORIGENS.find((o) => o.id === draft.origemId).desc;
  document.getElementById('dica-era').textContent = (dados.era && dados.era.desc) || '';
  pintarAttrs();

  document.getElementById('b-comecar').onclick = () => app.criarPersonagem(draft);
}

// --- HUB (centro da campanha) ----------------------------------------------
export function renderHub(app, dados) {
  const save = app.save;
  const meu = dados.porId.get(save.selecaoId);
  const camp = save.campanha;
  const classe = CLASSES.find((c) => c.id === save.classeId);
  const concluida = camp.concluida;

  let proximoHtml = '';
  if (!concluida) {
    const adv = app.advAtual || dados.porId.get(camp.proximoAdvId);
    proximoHtml = `
      <div class="confronto">
        <div class="time">${escudo(meu)}<span>${meu.tla}</span></div>
        <span class="vs">×</span>
        <div class="time">${escudo(adv)}<span>${adv ? adv.tla : '?'}</span></div>
      </div>
      <p class="prox-info">${nomeFase(camp.fase)}${camp.fase === 'grupos' ? ` · jogo ${camp.jogoIndex + 1} de ${camp.jogosGrupo}` : ''} · adversário Elo ${adv ? adv.elo : '?'}</p>
      <button class="btn btn-grande" id="b-jogar">Entrar em campo 🏟️</button>`;
  } else {
    proximoHtml = `<button class="btn btn-grande" id="b-legado">Ver seu legado 🏅</button>`;
  }

  const c = save.carreira;
  setScreen(`
    <section class="tela tela-hub">
      <header class="hub-topo">
        <div class="ident">
          ${escudo(meu, 'crest-grande')}
          <div>
            <h2>${save.nome}</h2>
            <p>${classe.emoji} ${classe.nome} · ${meu.name}</p>
          </div>
        </div>
        <div class="nivel" title="Nível">N${save.nivel}</div>
      </header>

      <div class="barra-xp"><div class="barra-xp-fill" style="width:${Math.min(100, (save.xp / proximoNivel(save.nivel)) * 100).toFixed(0)}%"></div></div>

      <div class="card-prox">${proximoHtml}</div>

      <div class="stats-linha">
        <div><b>${c.gols}</b><span>gols</span></div>
        <div><b>${c.assist}</b><span>assist.</span></div>
        <div><b>${c.jogos}</b><span>jogos</span></div>
        <div><b>${c.vitorias}</b><span>vitórias</span></div>
      </div>

      <nav class="hub-nav">
        <button class="btn btn-nav" id="b-cronica">📖 Crônica</button>
        <button class="btn btn-nav" id="b-ficha">🧬 Ficha</button>
        <button class="btn btn-nav" id="b-conq">🏅 Conquistas <small>(${save.conquistas.length}/${CONQUISTAS.length})</small></button>
        <button class="btn btn-nav btn-ghost" id="b-home">🏠 Início</button>
      </nav>
    </section>`);

  if (!concluida) document.getElementById('b-jogar').onclick = () => app.entrarEmCampo();
  else document.getElementById('b-legado').onclick = () => app.irLegado();
  document.getElementById('b-cronica').onclick = () => app.irCronica();
  document.getElementById('b-ficha').onclick = () => app.irFicha();
  document.getElementById('b-conq').onclick = () => app.irConquistas();
  document.getElementById('b-home').onclick = () => app.irHome();
}

// --- PERKS (árvore de traços; escolha ao subir de nível) --------------------
// Monta um "nó" da árvore com seu estado (tido/disponível/bloqueado).
function perkNo(p, save) {
  const st = estadoPerk(p, save.perks, save.nivel);
  const cap = p.tier === 3 ? ' perk-cap' : '';
  if (st.estado === 'tido') {
    return `<div class="perk-no tido${cap}"><div class="perk-cab"><span class="perk-emoji">${p.emoji}</span><b>${p.nome}</b><span class="perk-check">✓</span></div><p>${p.desc}</p></div>`;
  }
  if (st.estado === 'bloqueado') {
    const motivo = st.motivo === 'nivel' ? `🔒 nível ${st.alvo}` : `🔒 requer ${perkPorId(st.alvo)?.nome || ''}`;
    return `<div class="perk-no bloq${cap}"><div class="perk-cab"><span class="perk-emoji">${p.emoji}</span><b>${p.nome}</b><small class="perk-lock">${motivo}</small></div><p>${p.desc}</p></div>`;
  }
  return `<button class="perk-no disp${cap}" data-perk="${p.id}"><div class="perk-cab"><span class="perk-emoji">${p.emoji}</span><b>${p.nome}</b>${p.tier === 3 ? '<small class="perk-tag">capstone</small>' : ''}</div><p>${p.desc}</p></button>`;
}

export function renderPerks(app) {
  const save = app.save;
  const classe = CLASSES.find((c) => c.id === save.classeId);
  const universais = perksDaClasse(save.classeId).filter((p) => p.classe === 'geral');
  const galhos = galhosDaClasse(save.classeId);
  const universaisHtml = universais.map((p) => perkNo(p, save)).join('');
  const galhosHtml = galhos.map((g) => `
    <div class="perk-galho">
      <h3 class="galho-tit">${g.emoji} ${g.nome}</h3>
      <div class="galho-nos">${g.perks.map((p) => perkNo(p, save)).join('')}</div>
    </div>`).join('');
  setScreen(`
    <section class="tela tela-lista tela-perks">
      <header class="topo"><h2>⭐ Subiu de nível!</h2></header>
      <p class="perks-intro">N${save.nivel} · ${classe.emoji} ${classe.nome} — escolha um traço${save.pontosPerks > 1 ? ` <b>(${save.pontosPerks} pontos)</b>` : ''}.</p>
      <div class="perk-galho universais">
        <h3 class="galho-tit">🌐 Universais</h3>
        <div class="galho-nos">${universaisHtml}</div>
      </div>
      <div class="perk-arvore">${galhosHtml}</div>
    </section>`);
  for (const btn of document.querySelectorAll('[data-perk]')) {
    btn.onclick = () => app.escolherPerk(btn.dataset.perk);
  }
}

// --- CRÔNICA ----------------------------------------------------------------
export function renderCronica(app) {
  const save = app.save;
  const itens = save.cronica.slice().reverse().map((e) => `
    <article class="cronica-item ${e.tipo || ''}">
      ${e.titulo ? `<h4>${e.titulo}</h4>` : ''}
      <p>${e.texto}</p>
    </article>`).join('') || '<p class="vazio">Sua história ainda está em branco. Entre em campo!</p>';
  setScreen(`
    <section class="tela tela-lista">
      <header class="topo"><button class="btn-voltar" id="b-voltar">‹</button><h2>📖 Crônica</h2></header>
      <div class="cronica">${itens}</div>
    </section>`);
  document.getElementById('b-voltar').onclick = () => app.irHub();
}

// --- FICHA ------------------------------------------------------------------
export function renderFicha(app, dados) {
  const save = app.save;
  const meu = dados.porId.get(save.selecaoId);
  const classe = CLASSES.find((c) => c.id === save.classeId);
  const origem = ORIGENS.find((o) => o.id === save.origemId);
  const c = save.carreira;
  const attrs = ATRIBUTOS.map((at) => `
    <div class="attr">
      <span class="attr-id">${at.id}</span>
      <span class="attr-val">${save.attrs[at.id]}</span>
      <span class="attr-mod">${modTxt(save.attrs[at.id])}</span>
      <span class="attr-nome">${at.nome}</span>
    </div>`).join('');
  setScreen(`
    <section class="tela tela-lista">
      <header class="topo"><button class="btn-voltar" id="b-voltar">‹</button><h2>🧬 Ficha</h2></header>
      <div class="ficha-cab">${escudo(meu, 'crest-grande')}<div><h3>${save.nome}</h3>
        <p>${classe.emoji} ${classe.nome} — ${classe.arquetipo}</p>
        <p class="muted">${origem.emoji} ${origem.nome} · ${meu.name}</p></div></div>
      <div class="bloco"><h3>Atributos</h3><div class="attrs">${attrs}</div></div>
      ${fichaPerks(save)}
      <div class="bloco"><h3>Carreira</h3>
        <div class="ficha-stats">
          <div><b>${c.gols}</b><span>gols</span></div>
          <div><b>${c.assist}</b><span>assistências</span></div>
          <div><b>${c.jogos}</b><span>jogos</span></div>
          <div><b>${c.vitorias}-${c.empates}-${c.derrotas}</b><span>V-E-D</span></div>
          <div><b>${c.cleanSheets}</b><span>sem sofrer</span></div>
          <div><b>${c.melhorNota.toFixed(1)}</b><span>melhor nota</span></div>
        </div>
      </div>
    </section>`);
  document.getElementById('b-voltar').onclick = () => app.irHub();
}

// --- CONQUISTAS -------------------------------------------------------------
export function renderConquistas(app) {
  const save = app.save;
  const tem = new Set(save.conquistas);
  const grid = CONQUISTAS.map((q) => `
    <div class="conq ${tem.has(q.id) ? 'ativa' : 'bloq'}">
      <span class="conq-emoji">${tem.has(q.id) ? q.emoji : '🔒'}</span>
      <span class="conq-nome">${q.nome}</span>
      <span class="conq-desc">${q.desc}</span>
    </div>`).join('');
  setScreen(`
    <section class="tela tela-lista">
      <header class="topo"><button class="btn-voltar" id="b-voltar">‹</button><h2>🏅 Conquistas</h2></header>
      <p class="contador">${save.conquistas.length} de ${CONQUISTAS.length}</p>
      <div class="grid-conq">${grid}</div>
    </section>`);
  document.getElementById('b-voltar').onclick = () => app.irHub();
}

// --- RESULTADO DA PARTIDA ---------------------------------------------------
export function renderResultado(app, dados, resumo, novas, posCena) {
  const save = app.save;
  const meu = dados.porId.get(save.selecaoId);
  const adv = { name: resumo.advNome, tla: resumo.advTla };
  const cor = resumo.ganhou ? 'verde' : resumo.empate ? 'ambar' : 'vermelho';
  const titulo = resumo.ganhou ? 'VITÓRIA' : resumo.empate ? 'EMPATE' : 'DERROTA';
  const novasHtml = novas.length ? `
    <div class="novas-conq">
      <h3>🏅 Conquistas desbloqueadas</h3>
      ${novas.map((id) => { const q = conquistaPorId(id); return `<div class="toast-conq">${q.emoji} <b>${q.nome}</b> — ${q.desc}</div>`; }).join('')}
    </div>` : '';
  setScreen(`
    <section class="tela tela-resultado ${cor}">
      <h2 class="res-titulo">${titulo}</h2>
      <div class="res-placar">
        <div class="time">${escudo(meu)}<span>${meu.tla}</span></div>
        <div class="res-num">${resumo.golsMeu} <span>–</span> ${resumo.golsAdv}</div>
        <div class="time">${escudo(dados.porId.get(save.campanha.proximoAdvId))}<span>${adv.tla}</span></div>
      </div>
      ${resumo.penaltis ? `<p class="res-pen">${resumo.penaltis === 'venci' ? 'Classificado nos pênaltis!' : 'Eliminado nos pênaltis.'}</p>` : ''}
      <div class="res-jogador">
        <div><b>${resumo.golsJogador}</b><span>seus gols</span></div>
        <div><b>${resumo.assistJogador}</b><span>assist.</span></div>
        <div><b>${resumo.nota.toFixed(1)}</b><span>nota</span></div>
        <div><b>+${resumo.xp}</b><span>XP</span></div>
      </div>
      ${posCena ? `<blockquote class="res-cena">${posCena}</blockquote>` : ''}
      ${novasHtml}
      <button class="btn btn-grande" id="b-continuar">Continuar ›</button>
    </section>`);
  document.getElementById('b-continuar').onclick = () => app.aposResultado();
}

// --- LEGADO (fim da campanha) ----------------------------------------------
export function renderLegado(app, dados, epilogo) {
  const save = app.save;
  const meu = dados.porId.get(save.selecaoId);
  const c = save.carreira;
  let faixa = 'Sua jornada';
  if (c.campeao) faixa = '🏆 CAMPEÃO DO MUNDO';
  else if (c.vice) faixa = '🥈 Vice-campeão';
  else if (c.fase !== 'grupos') faixa = `Eliminado em ${nomeFase(c.fase)}`;
  else faixa = 'Eliminado na fase de grupos';

  setScreen(`
    <section class="tela tela-legado">
      <div class="brasao">${c.campeao ? '🏆' : c.vice ? '🥈' : '🎖️'}</div>
      <h2>${faixa}</h2>
      <div class="ficha-cab center">${escudo(meu, 'crest-grande')}<div><h3>${save.nome}</h3><p class="muted">${meu.name}</p></div></div>
      <blockquote class="epilogo">${epilogo}</blockquote>
      <div class="ficha-stats">
        <div><b>${c.gols}</b><span>gols</span></div>
        <div><b>${c.assist}</b><span>assist.</span></div>
        <div><b>${c.jogos}</b><span>jogos</span></div>
        <div><b>${c.vitorias}-${c.empates}-${c.derrotas}</b><span>V-E-D</span></div>
        <div><b>${save.conquistas.length}/${CONQUISTAS.length}</b><span>conquistas</span></div>
        <div><b>${c.melhorNota.toFixed(1)}</b><span>melhor nota</span></div>
      </div>
      <button class="btn btn-grande" id="b-nova">Nova carreira</button>
      <button class="btn btn-ghost" id="b-cronica">📖 Reler a crônica</button>
    </section>`);
  document.getElementById('b-nova').onclick = () => { app.apagarCarreira(true); };
  document.getElementById('b-cronica').onclick = () => app.irCronica();
}
