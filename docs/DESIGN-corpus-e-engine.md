# Design — Corpus offline + Engine rica (Crônicas da Copa)

> **Passo 1 do redesign.** Define o formato do dicionário/templates, a taxonomia
> de lances, as novas classes, o sistema de cartões (baseado nas Regras do
> Futebol do IFAB) e o "diretor de partida" que gera de 4 a 8 lances por jogo.
> A geração do corpus em si (passo 2) usa este documento como especificação.

## Princípio central: molde × variável

A IA, quando consultada, só recebia `{minuto, placar, meuTime, advTime, fase, momentum, classe}` — **nenhuma informação que o jogo já não tenha**. Logo, todo texto pode ser um **molde com encaixes** preenchidos em runtime:

```
"Aos {minuto}', {advFuncao} afasta o cruzamento e a bola sobra na entrada da área. {meuTime} está a um toque da {fase}."
```

- **Encaixe (variável):** `{minuto}`, `{advFuncao}`, `{meuTime}`, `{fase}`, `{placar}` — vêm do estado da partida.
- **Molde (criativo):** varia por `tipo de lance × tom × situação` — é o que se escreve/gera e se cura.

Tudo offline, instantâneo, revisável, sem dependência de rede. A IA volta a ser **ferramenta de autoria no build** (gera moldes em lote), nunca dependência de runtime.

---

## 1. Classes (8)

Os seis atributos seguem iguais (TEC, FIS, VIS, MEN, CAR, SOR). Soma da base = 72 para todas, para manter o balanceamento. As 3 novas classes:

| Classe | Arquétipo | Principal / Sec. | TEC | FIS | VIS | MEN | CAR | SOR | Papel tático |
|---|---|---|---|---|---|---|---|---|---|
| Goleiro | O Guardião 🧤 | MEN / VIS | 10 | 12 | 13 | 14 | 11 | 12 | Defesa, saída de bola, pênaltis |
| Zagueiro | A Muralha 🧱 | FIS / MEN | 10 | 14 | 12 | 13 | 12 | 11 | Marcação, divididas, bola parada |
| **Lateral** | **O Corredor** 🏃 | **FIS / TEC** | **12** | **14** | **12** | **11** | **11** | **12** | **Dupla função: defende e apoia o ataque; cruzamentos, fôlego** |
| **Volante** | **O Cabeça-de-área** 🛡️ | **VIS / FIS** | **11** | **13** | **14** | **13** | **11** | **10** | **Desarme + recomposição + início da construção; protege a zaga** |
| Meia | O Maestro 🎩 | VIS / TEC | 14 | 11 | 14 | 11 | 12 | 10 | Criação, último passe, bola parada |
| Ponta | O Flâmula ⚡ | TEC / FIS | 14 | 13 | 11 | 11 | 12 | 11 | Drible, velocidade, jogadas pelos lados |
| Centroavante | O Artilheiro 🎯 | MEN / TEC | 14 | 12 | 11 | 14 | 11 | 10 | Finalização, pivô, faro de gol |
| **Técnico** | **O Comandante** 🎙️ | **CAR / VIS** | **8** | **8** | **15** | **14** | **16** | **11** | **Banco: tática, substituições, gestão do grupo (lances próprios — ver §4)** |

> **Lateral** = mistura de zagueiro + ponta (defende e cruza). **Volante** = mistura de meia + zagueiro (desarma e constrói). Fontes táticas no fim do documento.
> O **Técnico** quase não usa TEC/FIS (não está em campo); seu jogo é CAR (vestiário/imprensa), VIS (leitura) e MEN (frieza). Tem um **modelo de lance próprio** (§4).

---

## 2. Taxonomia de lances interativos (jogadores de linha + goleiro)

Cada lance é uma **decisão com 2–3 opções**. Toda opção carrega:
`{ id, tipo, stat, cd, efeitos }`. O texto (situação + opções) vem do dicionário; a **mecânica** vem do catálogo por `tipo × classe`. A grande novidade pedida: **opções com consequências além do dado** (`efeitos`), criando trade-offs reais.

### 2.1 Tipos de lance (resolução no motor)

| `tipo` | O que é | Sucesso | Falha / Falha crítica |
|---|---|---|---|
| `finalizar` | Chute/cabeçada ao gol | Gol seu (crítico = golaço) | Defesa do goleiro / perde a bola |
| `criar` | Passe, lançamento, cruzamento | Assistência → gol do time | Passe perdido / contra-ataque (crit. falha) |
| `progredir` | Drible, condução, tabela que **avança** o time | Avança e gera chance | Perde a bola **e expõe** (ver `exporContra`) |
| `construir` | **Sair jogando sob pressão** (curto) | Mantém posse + momentum | Erro fatal → gol adversário (falha crítica) |
| `desarmar` | Bote, dividida, carrinho, interceptação | Recupera a bola | Falta (risco de cartão se `cartaoRisco`) |
| `defesa` | Lances de goleiro (sair/ficar/espalmar) | Perigo afastado (crít. = defesaça) | "Segura no susto"; falha crít. = gol |
| `seguro` | Jogada de baixo risco (toque, chutão) | Mantém controle, pouco ganho | Pouca perda |
| `faltaTatica` | Falta proposital p/ parar o ataque | Para o ataque adversário | **Custo: cartão** (ver §3) |
| `simular` | Cavar falta / simulação | Ganha falta/pênalti | **Amarelo por simulação** (§3) |
| `provocar` | Forçar cartão no adversário | Adversário se irrita e leva cartão | **Você leva amarelo** (conduta provocativa) |
| `mental` | Segurar a cabeça / não revidar | Mantém a calma, momentum | Revida → cartão / expulsão |
| `bolaParada` | Cobrança de falta/escanteio/pênalti | `finalizar` ou `criar` conforme escolha | idem |

### 2.2 Campo `efeitos` (o trade-off)

Chaves declarativas que o motor entende, aplicadas no resultado:

| Efeito | Significado |
|---|---|
| `momentum: ±n` | Empurra/derruba o momento do jogo |
| `exporContra: 0–2` | Mesmo no **sucesso**, abre espaço: agenda um lance/risco de **contra-ataque adversário** (intensidade 0–2) |
| `entregaPosse: true` | Resolve o perigo imediato mas devolve a bola ao adversário (ex.: chutão) |
| `riscoConcede: 'falha'\|'falhaCritica'` | Em que grau de fracasso pode sair gol adversário |
| `cartaoRisco: 'amarelo'\|'vermelho'\|'condicional'` | Submete o lance ao teste de disciplina (§3) |
| `ganhaFalta: 'falta'\|'penalti'` | Resultado de `simular`/sofrer falta |
| `fadiga: ±n` | Desgaste (alimenta decisões do técnico e fim de jogo) |

**Exemplos pedidos pelo usuário, modelados:**

- **Meia/Volante — "ir ao ataque deixando espaço":**
  - A `progredir` (TEC, CD 15, `exporContra: 2`, `momentum:+8`) — "Avançar e puxar o contra-ataque" → no sucesso cria chance, **mas habilita um lance perigoso do adversário**.
  - B `criar` (VIS, CD 13, `exporContra: 1`) — "Tabelar e tentar o passe"
  - C `seguro` (TEC, CD 10, `exporContra: 0`) — "Segurar a posição e dar a bola" → zero risco, zero chance.

- **Goleiro pressionado — chutão / sair jogando / driblar:**
  - A `seguro` (FIS, CD 11, `entregaPosse:true`) — "Dar o chutão e aliviar"
  - B `construir` (VIS, CD 14, `riscoConcede:'falhaCritica'`, `momentum:+6`) — "Sair jogando curto"
  - C `progredir` (MEN, CD 17, `riscoConcede:'falha'`, `momentum:+12`) — "Driblar o atacante na área" → alto risco, alta recompensa.

### 2.3 Lances por classe (catálogo de mecânica)

Cada classe tem um conjunto de arquétipos de lance que o diretor pode sortear, conforme a zona de pressão (§5). Resumo (a mecânica completa vai no `mecanicas.json`):

- **Goleiro:** `defesa` (sair/ficar/espalmar), `construir`/`seguro` (saída de bola sob pressão), `defesa` de pênalti, `criar` (lançar o contra-ataque).
- **Zagueiro:** `desarmar` (dividir/bote), `faltaTatica` (cortar o ataque — DOGSO/SPA), `finalizar`/`bolaParada` (subir na bola parada), `construir` (sair jogando).
- **Lateral:** `desarmar` (fechar o lado), `progredir` (apoiar subindo), `criar` (cruzar), trade-off **subir × ficar** (`exporContra`).
- **Volante:** `desarmar`, `faltaTatica`, `criar` (primeiro passe), `progredir` (conduzir), `finalizar` (chute de fora).
- **Meia:** `criar` (último passe), `finalizar` (chute de fora), `progredir` (drible no meio), `bolaParada`.
- **Ponta:** `progredir` (drible na linha), `criar` (cruzar), `finalizar` (cortar e bater), `simular` (cavar falta na ponta).
- **Centroavante:** `finalizar` (de primeira, cabeçada, pivô), `progredir` (girar sobre o zagueiro), `criar` (tabela), `simular` (cavar pênalti).
- **Disciplina/mental (qualquer classe):** `provocar`, `mental`, `reclamar` — disparados sobretudo em contexto quente (§3).

---

## 3. Sistema de disciplina (cartões) — baseado no IFAB, Lei 12

Fonte: **IFAB, Laws of the Game, Lei 12 (Fouls and Misconduct)** — ver Fontes. Modelado fielmente.

### 3.1 Tabela de infrações

**Cartão AMARELO (advertência):**
- Conduta antidesportiva — inclui **simulação** ("fingir falta/lesão"), **falta para parar um ataque promissor (SPA)**, falta temerária (*reckless*), mão para parar ataque promissor, "drible" combinado com o goleiro, **celebração/atitude provocativa, debochada ou inflamatória**.
- **Dissent** (reclamar com o árbitro por palavra/ato).
- Infrações persistentes; retardar o reinício; não respeitar a distância; entrar/sair sem permissão.

**Cartão VERMELHO (expulsão):**
- **Jogo brusco grave** (*serious foul play*): entrada/dividida com força excessiva ou que põe em risco a segurança.
- **Conduta violenta** (*violent conduct*): agressão fora da disputa de bola.
- Cuspir/morder; linguagem/gestos ofensivos, insultuosos ou abusivos.
- **Impedir um gol ou uma oportunidade clara de gol (DOGSO)** — por mão (deliberada, ou não-deliberada fora da própria área) ou por falta.
- **Segundo amarelo** no mesmo jogo.

### 3.2 DOGSO × SPA (a distinção que rege os lances `faltaTatica`)

- **DOGSO** = impedir oportunidade **clara** ("seria gol"). **SPA** = parar ataque **promissor** ("poderia virar gol").
- Critérios do DOGSO (todos pesam): **distância ao gol, direção do jogo, nº de defensores, controle da bola**.
- **Regra especial na grande área (anti-tríplice punição):** falta de DOGSO dentro da própria área **com tentativa genuína de jogar a bola** → **amarelo + pênalti** (não vermelho). Sem tentativa (segurar/empurrar/puxar) → **vermelho + pênalti**.

### 3.3 Como vira lance no jogo

O lance de disciplina submete a escolha a um **teste de árbitro**: `d20 + stat` vs `CD` ajustado pelo **rigor do árbitro daquela partida** (novo parâmetro, ver §6).

| Lance | Opção | Sucesso | Falha |
|---|---|---|---|
| Zagueiro, gol iminente | "Fazer a falta tática" (`faltaTatica`) | Para o lance; cartão conforme contexto: **SPA→amarelo**, **DOGSO fora→vermelho**, **DOGSO na área c/ bola→amarelo+pênalti**, **DOGSO na área s/ bola→vermelho+pênalti** | Não chega na falta → gol adversário |
| Atacante na área | "Cavar o pênalti" (`simular`, CAR) | Pênalti marcado | **Amarelo por simulação** |
| Após pisão do marcador | "Provocar pra tirar do sério" (`provocar`, CAR) | Adversário revida e **leva cartão** | **Você leva amarelo** (provocação) |
| Após decisão polêmica | "Ir tirar satisfação" (`reclamar`) | (raro) árbitro releva | **Amarelo por dissent** |
| Levou pancada / foi provocado | "Segurar a cabeça" (`mental`, MEN) | Mantém a calma + momentum | **Revida → expulsão (conduta violenta)** |

Consequência mecânica: **jogar com um a menos** (após vermelho do protagonista ou de um companheiro) aumenta `lamAdv` e reduz `lamMeu`; vermelho do adversário faz o inverso. Amarelo do protagonista liga um flag de "pendurado" — o segundo amarelo expulsa, então lances de disciplina seguintes ficam mais tensos.

---

## 4. Lances do Técnico (modelo próprio)

O técnico não disputa bola: seus lances são **decisões de banco** que alteram parâmetros do time (`lamMeu`, `lamAdv`, `momentum`, `fadiga`), resolvidas por `d20 + (CAR/VIS/MEN)`. Disparam em **gatilhos**: intervalo, após sofrer/fazer gol, últimos 15', expulsão, jogador desgastado.

| Lance | Stat | Efeito no sucesso | Risco na falha |
|---|---|---|---|
| **Substituir** (sangue novo / reforço defensivo) | VIS | Rebalanceia ataque↔defesa; repõe `fadiga` | Mexe no time errado → momentum− |
| **Pressing alto** (pressionar a saída de bola) | CAR | `lamMeu+` e chance de recuperar no campo adversário | `exporContra` global: contra-ataques mais perigosos + `fadiga` |
| **Recuar / reforçar a defesa** | MEN | `lamAdv−` (segura o resultado) | Convida pressão; momentum− se mal lido |
| **Mudar o esquema** | VIS | Ajuste fino conforme o placar/fase | Time se perde por uns minutos |
| **Conversa / bronca no vestiário** (intervalo) | CAR | `momentum+` e bônus de MEN coletivo no 2º tempo | Não pega → sem efeito ou pior |

O sucesso do técnico se traduz na narração via os mesmos moldes (cena de banco/beira-campo) e nos números do motor. A campanha do técnico foca em **gestão e leitura**, não em gols próprios — uma experiência de jogo distinta das classes de linha.

---

## 5. Diretor de partida — 4 a 8 lances variáveis por pressão

Hoje a agenda é fixa (3 lances em janelas fixas). Novo modelo: a quantidade **e** o tipo dos lances **emergem da pressão**, dentro de `[4, 8]`.

### 5.1 Acumulador de pressão

A cada minuto simulado, calcula-se a **pressão** (quem está apertando quem) a partir de:
- `momentum` (já existe no motor),
- **situação de placar** (perdendo → você ataca mais; segurando vantagem no fim → você defende mais),
- **diferença de Elo** (jogo fácil → você domina; difícil → você sofre),
- **minuto/fase** (fim de jogo intensifica).

A pressão alimenta um **acumulador**; ao cruzar um limiar, **dispara um lance na zona de quem está pressionando** e zera. Mais oscilação de pressão → mais lances (até o teto 8); jogo controlado → menos (piso 4).

### 5.2 Zona do lance × posição do protagonista

A **zona** (defesa / meio / ataque) de cada lance sai da pressão; o **tipo** concreto é filtrado pela classe do protagonista:

- **Time sob pressão** (você defendendo) → zona **defesa/meio**: goleiro, zagueiro, lateral e volante "trabalham mais" (`defesa`, `desarmar`, `construir`, `faltaTatica`). Atacantes pegam lances de **contra-ataque** (mais raros, mais decisivos).
- **Time pressionando** (precisa de gol / jogo fácil) → zona **ataque/meio**: centroavante, ponta e meia "trabalham mais" (`finalizar`, `progredir`, `criar`); defensores pegam lances de **apoio/saída**.

Assim, **um goleiro num jogo difícil joga ~8 lances** (muita defesa), e **um centroavante num jogo dominado também joga ~8** (muito ataque) — exatamente o comportamento pedido. Posições "do meio" (volante, lateral, meia) recebem a mistura mais equilibrada.

### 5.3 Eventos intermediários (não-interativos)

Entre os lances de decisão, o diretor injeta **flavor** (texto, sem escolha) puxado do dicionário e templado:
- finalização perigosa (sua ou do adversário) que não vira gol;
- **bola na trave**;
- defesa do goleiro (sua ou adversária);
- falta, escanteio, lateral perigoso;
- **cartão amarelo/vermelho** para outro jogador (companheiro/adversário) — vermelho altera os parâmetros do time;
- substituição do adversário, lesão, desgaste.

Esses eventos dão ritmo de jogo de verdade e tornam cada partida mais densa sem exigir interação a cada toque.

---

## 6. Formato do dicionário/templates (o entregável do passo 1)

Quatro arquivos de dados estáticos (em `data/`), mais um parâmetro novo de partida.

### 6.1 `mecanicas.json` — a mecânica dos lances (estável, balanceável)

Separa **o que o lance faz** (números) de **como ele é narrado** (texto). Indexado por `tipoEvento × classe`.

```jsonc
{
  "finalizacao": {
    "centroavante": [
      { "id": "A", "tipo": "finalizar", "stat": "MEN", "cd": 16, "efeitos": {} },
      { "id": "B", "tipo": "progredir",  "stat": "TEC", "cd": 15, "efeitos": { "exporContra": 1 } },
      { "id": "C", "tipo": "criar",      "stat": "VIS", "cd": 11, "efeitos": {} }
    ]
  },
  "construcao_sob_pressao": {
    "goleiro": [
      { "id": "A", "tipo": "seguro",     "stat": "FIS", "cd": 11, "efeitos": { "entregaPosse": true } },
      { "id": "B", "tipo": "construir",  "stat": "VIS", "cd": 14, "efeitos": { "riscoConcede": "falhaCritica", "momentum": 6 } },
      { "id": "C", "tipo": "progredir",  "stat": "MEN", "cd": 17, "efeitos": { "riscoConcede": "falha", "momentum": 12 } }
    ]
  },
  "falta_tatica": {
    "zagueiro": [
      { "id": "A", "tipo": "faltaTatica", "stat": "VIS", "cd": 13, "efeitos": { "cartaoRisco": "condicional" } },
      { "id": "B", "tipo": "desarmar",    "stat": "FIS", "cd": 16, "efeitos": { "riscoConcede": "falha" } }
    ]
  }
}
```

### 6.2 `situacoes.json` — flavor dos lances (variado, curável)

Indexado por `tipoEvento × tom`, com filtros opcionais (`classe`, `zonaPlacar`, `faixaMinuto`). Cada variante traz a **situação** e os **textos das opções por id** (encaixam na mecânica acima). Muitas variantes por célula = baixa repetição.

```jsonc
{
  "finalizacao": {
    "epico": [
      {
        "filtro": { "zonaPlacar": "empate", "faixaMinuto": "fim" },
        "situacao": "Aos {minuto}', a bola sobra viva na pequena área depois que {advFuncaoDef} afasta o cruzamento. O estádio prende o ar — {meuTime} está a um toque da {fase}.",
        "opcoes": { "A": "Bater de primeira, sem deixar fechar", "B": "Girar sobre o zagueiro {advAdj}", "C": "Rolar pro companheiro que vem de trás" }
      }
    ],
    "comico": [ /* ... */ ],
    "realista": [ /* ... */ ]
  }
}
```

### 6.3 `narracao.json` — eventos não-interativos e linhas de resultado

Indexado por `tipoResultado × tom` (ex.: `gol_meu`, `gol_adv`, `defesa`, `trave`, `finalizacao_perigosa`, `cartao_amarelo`, `cartao_vermelho`, `penalti`). Listas de variantes templadas.

```jsonc
{
  "trave": {
    "epico": ["Aos {minuto}', o chute de {meuTime} explode na trave e o estádio inteiro leva a mão à cabeça."],
    "comico": ["A bola bate na trave e sai. {meuTime} já tava comemorando — quase um vexame."]
  },
  "cartao_vermelho_adv": {
    "realista": ["{advFuncaoDef} chega atrasado e o árbitro não perdoa: vermelho direto. {advTime} fica com um a menos."]
  }
}
```

### 6.4 `cenas.json` — pré/pós-jogo e epílogo

Indexado por `tipoCena × tom`, e o pós por `resultado` (vitória/empate/derrota). Já temos exemplos validados na Bíblia — migram para cá.

### 6.5 Bancos de encaixe (slots)

Para os encaixes que precisam de variedade natural (e para nunca cair no "o inglês"):
- `advFuncaoDef` → "o goleiro {adjNac}", "o zagueiro {adjNac}", "a zaga {adjNac}", "o lateral {adjNac}".
- `adjNac` → adjetivo pátrio do adversário ("inglês", "espanhola", "francês"…), derivado dos dados das 48 seleções.
- `fase`, `meuTime`, `advTime`, `minuto`, `placar` → direto do estado.

A regra "nomear a função + nacionalidade" do trabalho de calibração vira **estrutura de dados**, não depende mais de o gerador lembrar.

### 6.6 Novo parâmetro de partida: `arbitro`

Cada partida sorteia um árbitro com `rigor` (-2 a +2), que ajusta a CD dos testes de disciplina (§3.3). Um árbitro rigoroso pune simulação/reclamação mais fácil e perdoa menos a falta tática — adiciona realismo e replay.

---

## 7. Próximos passos

1. **(este doc)** Validar o formato e as decisões de design. ✅ entregável do passo 1.
2. Implementar a leitura dos `*.json` e o **diretor de partida** no motor (engine.js), mantendo o fallback atual durante a transição.
3. **Gerar o corpus em lote** (passo 2): usar a Bíblia calibrada como prompt de geração offline, produzir centenas de variantes por célula, **curar** e salvar nos `*.json`.
4. Telas/criação: adicionar as 3 novas classes (incl. fluxo próprio do Técnico).
5. Aposentar (ou tornar opcional) o Worker de IA ao vivo — manter só para o epílogo / futuras decisões de bastidor de entrada aberta.

---

## Fontes

- **IFAB — Laws of the Game, Lei 12 (Fouls and Misconduct):** https://www.theifab.com/laws/latest/fouls-and-misconduct/
- **DOGSO × SPA (critérios e sanções):** https://www.refereepov.com/blogs/blog/what-is-dogso · https://360tft.co.uk/blog/what-is-dogso-football/
- **Cartão amarelo no Brasil (simulação, reclamação, conduta) — ESPN "Regra 18":** http://www.espn.com.br/blogs/salviospinola/634570_sete-situacoes-sao-advertidas-com-cartao-amarelo-regra-18-destrincha-a-regra-12
- **Posições e funções (volante, lateral, ala, zagueiro):** https://www.nike.com.br/guia-de-produtos-nike/posicoes-do-futebol · https://pt.wikipedia.org/wiki/Posi%C3%A7%C3%B5es_no_futebol
