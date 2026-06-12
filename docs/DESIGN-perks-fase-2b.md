# Design — Perks fase 2b: traços GATILHADOS (ativos)

> Status: **proposta**. A fase 1 (passivos) e a fase 2a (árvore com galhos +
> capstone) já estão implementadas. Este doc projeta a fase 2b — os perks que o
> jogador **ativa** durante a partida, com trade-off. É a parte que mexe no
> *coração* do turno de lance, por isso vem isolada e depois da base assentada.

## 1. O que muda em relação ao que existe

Hoje todo perk é **passivo**: o motor lê os ganchos (`elo`, `cd`, `init`, `nota`,
`xpMult`) sozinho, sem interação. Ver [perks.js](../js/perks.js) e
[DESIGN-corpus-e-engine.md](DESIGN-corpus-e-engine.md).

Um perk **gatilhado** é uma carta que o jogador decide *quando queimar*, em
geral 1×/jogo, sempre com um custo ou risco. Isso exige três coisas novas que a
fase 1/2a não têm:

1. **Carga por partida** — estado efêmero no motor, resetado a cada jogo
   (ex.: `cargas: { lideranca: 1 }`).
2. **Ponto de decisão extra na UI** — entre o resultado do d20 e a aplicação do
   efeito, um momento de "usar o traço? (resta 1)".
3. **Ganchos novos no engine** que interceptam o fluxo do lance — hoje não
   existem porque nada precisa interromper a resolução.

## 2. Catálogo proposto (lean: ~6 gatilhados)

| id | nome | classe | efeito | custo/risco | carga |
|---|---|---|---|---|---|
| `lideranca` | Liderança 🧭 | geral | rerrola um d20 ruim (seu ou de companheiro) | — | 1/jogo |
| `caca_niquel` | Caça-níquel 🍀 | geral | converte um fracasso em "quase" (falta perigosa em vez de perda de posse) | — | 1/jogo |
| `sangue_nos_olhos` | Sangue nos olhos 🔥 | atacantes | força uma interação **extra** de ataque | +`exporContra` no lance seguinte do adversário | 1/jogo |
| `muralha_humana` | Muralha humana 🧱 | def | anula um gol sofrido iminente (bloqueio heroico) | −fadiga / −momentum depois | 1/jogo |
| `cera` | Cera ⏱️ | geral | segura o resultado: reduz nº de lances restantes do adversário | só com vantagem no placar; risco de amarelo | 1/jogo |
| `tabela_ensaiada` | Tabela ensaiada 🎯 | meia/ponta | garante assistência num lance de criação bem-sucedido | só 1×, gasta a carga mesmo se falhar | 1/jogo |

Cada um desses entraria como um **capstone alternativo** ou um 4º nó nos galhos
da fase 2a — assim o jogador escolhe entre um capstone passivo forte e um
gatilhado situacional. (Decisão de balanceamento a validar.)

## 3. Modelo de dados (perks.js)

Estender o objeto perk com um bloco `ativo`:

```js
{
  id: 'lideranca', nome: 'Liderança', emoji: '🧭', classe: 'geral',
  galho: null, tier: 3, nivelMin: 5,
  desc: '1×/jogo: rerrola um d20 ruim seu ou de um companheiro.',
  ativo: {
    cargas: 1,                 // usos por partida
    quando: 'pos-rolagem',     // gancho onde pode ser oferecido
    rotulo: 'Refazer a jogada',
    // condição de oferta (recebe resultado + estado); se false, nem aparece
    oferecer: (res, e) => !res.sucesso && !res.falhaCritica,
    // aplica o efeito; devolve {resultado?, eventos?} para o motor seguir
    aplicar: (ctx) => ({ rerrolar: true }),
  },
}
```

`quando` (ganchos possíveis):
- `pos-rolagem` — depois do d20, antes de `resolverLance` aplicar (Liderança, Caça-níquel, Tabela ensaiada).
- `pre-lance` — quando o motor vai pausar num lance (Sangue nos olhos cria um lance a mais).
- `gol-adv-iminente` — quando o motor sortear um gol sofrido (Muralha humana).
- `entre-lances` — a qualquer pausa (Cera).

## 4. Mudanças no engine ([engine.js](../js/engine.js))

1. **Estado de cargas.** Em `criarPartida`, inicializar
   `estado.cargas = {}` somando `ativo.cargas` dos perks que o jogador tem.
   Resetado naturalmente porque `criarPartida` roda por partida.

2. **Hook `pos-rolagem`.** Hoje o fluxo é: UI rola o d20 → chama
   `resolverLance(opcao, resultado)`. Inserir um passo intermediário:
   `gatilhosPosRolagem(opcao, resultado)` devolve a lista de perks ofertáveis
   (carga > 0 e `oferecer(res, estado)` true). A UI mostra os botões; se o
   jogador aceitar, o motor:
   - decrementa `estado.cargas[id]`;
   - aplica (`rerrolar` → roda novo d20 via `dice.rolar`; ou muta `resultado`);
   - segue com `resolverLance` usando o resultado final.

3. **Hook `gerarLanceExtra` (Sangue nos olhos).** Após resolver um lance, se a
   carga estiver ativa e ofertada/aceita, empurrar um lance extra na agenda
   (`estado.lancesRestantes++` + marcar `exporContra` no próximo do adversário).

4. **Hook `gol-adv-iminente` (Muralha humana).** Em `golAdv`, antes de
   incrementar, checar se há carga ofertável; se aceita, cancela o gol e aplica
   o custo (`estado.fadiga += k` ou `bump(-n)`).

5. **`resolverLance` permanece a fonte da verdade** da mecânica — os gatilhos só
   alteram *o resultado que entra* nele ou *eventos ao redor*, nunca duplicam a
   lógica de cada `tipo`.

> Princípio mantido: a IA/aleatório nunca decide a mecânica; o jogador decide
> *quando* gastar a carga, o motor decide o efeito. 100% offline.

## 5. Mudanças na UI ([app.js](../js/app.js) + dice-anim)

O fluxo do lance hoje (`app._lance` → `animarDado` → `resolverLance`) ganha um
estágio entre o dado e a aplicação:

```
mostra opções → jogador escolhe → anima d20 → [RESULTADO]
   → se há gatilho ofertável: mostra card "⚡ <rótulo>? (resta N) / Seguir"
       → escolheu usar → motor reprocessa → novo RESULTADO (loop 1×)
       → escolheu seguir → segue
   → resolverLance(resultado final) → renderiza eventos
```

Detalhes:
- Card de gatilho com áudio próprio (um `whoosh`/charge curto, procedural).
- HUD da partida ganha um indicador das cargas restantes (ex.: `🧭1`), análogo
  ao `🎲 lances`.
- Acessibilidade: o card tem um botão "Seguir" default e timeout curto não-
  obrigatório (sem pressa; o jogo já é por turnos).

## 6. Persistência

Sem mudança de formato do save: os ids dos gatilhados moram no mesmo
`save.perks[]`. As **cargas** são efêmeras (só no `estado` do motor), então não
entram no save. `SAVE_VERSION` **não** muda por causa da 2b.

## 7. Balanceamento e riscos

- **Carga por jogo** evita spam; o trade-off evita "escolha óbvia".
- Gatilhados são naturalmente mais fortes que passivos → entram como capstone
  alternativo (custo de oportunidade alto) ou com `nivelMin` mais alto.
- **Maior risco do projeto inteiro**: mexe no loop de lance e na UI da partida.
  Por isso: feature-flag (`MODO_GATILHOS`) para ligar/desligar sem quebrar o
  fluxo base; testes de fumaça cobrindo "usar carga", "recusar", "carga zerada".
- O modo **suspenso** (jogador assistindo) zera todas as cargas — já coberto
  pelo guard de `suspenso` que existe.

## 8. Ordem de implementação sugerida

1. `ativo` no modelo + `estado.cargas` no motor (sem UI ainda; testável por node).
2. Hook `pos-rolagem` + **Liderança** (o caso mais simples: só rerrola).
3. Card de gatilho na UI + áudio + indicador no HUD.
4. Demais gatilhados (`gerarLanceExtra`, `gol-adv-iminente`, `cera`).
5. Smoke: usar/recusar/zerada; integração com cartões e suspensão.
