# Arara do Online

[![Testes e publicação](https://github.com/armandoOliv3/arara-do-online/actions/workflows/ci.yml/badge.svg)](https://github.com/armandoOliv3/arara-do-online/actions/workflows/ci.yml)

App de celular para loja que vende roupa pelo Instagram e pelo WhatsApp. Feito em **Vue 3**, testado com **Vitest**, **Vue Test Utils** e **Playwright**.

**Abrir o app:** https://armandooliv3.github.io/arara-do-online/

## Como funciona

A cliente pergunta "tem essa blusa no M?". A lojista registra o pedido e o app acompanha a peça até o envio:

| Aba | O que acontece |
|---|---|
| **Conferir** | Onde se registra o pedido novo. Os pedidos ficam agrupados por peça, para uma ida só à arara resolver todos |
| **Segurando** | Peça separada, com cronômetro até o prazo de pagamento: verde, amarelo em 2/3 do prazo e vermelho quando vence |
| **Enviar** | Peças pagas esperando despacho |
| **Histórico** | Enviados, devolvidos e sem estoque, com opção de reabrir ou apagar |

O formulário de novo pedido aparece só na aba Conferir e pode ser minimizado. O que já foi digitado continua lá ao minimizar ou trocar de aba.

Em cada passo, o app gera a mensagem pronta para copiar e mandar à cliente ("Separei pra você…", "Acabou…", "Tudo certo com o pagamento?"). Toda ação tem **Desfazer**.

## Testes

Três camadas, todas rodando no GitHub Actions a cada envio. **O app só é publicado se todas passarem.**

| Camada | Ferramenta | Quantidade |
|---|---|---|
| Unidade, componente e integração | Vitest + Vue Test Utils | 201 testes, cobertura acima de 95% (o Actions falha se cair abaixo do mínimo) |
| Ponta a ponta | Playwright | 20 cenários, cada um rodando em duas telas de celular (Pixel 7 e iPhone SE, 320 px) |

### Vitest

| Tipo | Arquivo | O que cobre |
|---|---|---|
| Unidade | `tests/unit/prazo.test.js` | Cronômetro com relógio falso (`vi.useFakeTimers`): limites de 2/3 e 100% do prazo para 15, 30, 45 e 60 min, relógio do celular voltando, barra limitada a 100% |
| Unidade | `tests/unit/pedidos.test.js` | Criação e validação de pedidos, fluxo completo de status, ações proibidas (ex.: pagar um pedido que nem foi separado), imutabilidade para o Desfazer, ordenação e agrupamento |
| Unidade | `tests/unit/mensagens.test.js` | Mensagens prontas: @usuário x nome completo, tamanho "Único", prazo da peça |
| Unidade | `tests/unit/armazenamento.test.js` | Navegador cheio, bloqueado (aba anônima), dado corrompido, preferências inválidas |
| Unidade | `tests/unit/usePedidos.test.js` | Estado do app: adicionar, executar, desfazer, apagar, aviso de erro ao salvar |
| Componente | `tests/components/*.test.js` | Formulário (campos obrigatórios, tamanho, canal, minimizar), card em cada aba e cor do prazo, texto da cliente sem executar HTML, copiar mensagem com e sem permissão |
| Integração | `tests/components/App.test.js` | O app inteiro: pedido do início ao fim, cronômetro mudando de cor com o tempo, formulário só em Conferir, Desfazer, apagar com dois toques, dados mantidos ao reabrir |

### Playwright

Abre o app gerado (o mesmo que vai para o GitHub Pages) num navegador de verdade, em tamanho de celular. Nos testes de prazo, o relógio do navegador é controlado com `page.clock`, então 30 minutos passam em milissegundos.

| Arquivo | O que cobre |
|---|---|
| `tests/e2e/fluxo.spec.js` | Pedido do início ao fim, agrupamento por peça, Desfazer, copiar a mensagem para a área de transferência, dados mantidos ao recarregar a página, apagar com dois toques, reabrir, tela sem rolagem para os lados em todas as abas |
| `tests/e2e/prazo.spec.js` | Cronômetro mudando de cor e botão Cobrar, aviso de vencimento na aba, bugs #2 e #3 no navegador, cronômetro certo depois de recarregar |
| `tests/e2e/formulario.spec.js` | Formulário só em Conferir, minimizar mantendo o rascunho, campos obrigatórios, formulário pronto para o próximo pedido, HTML no nome da cliente sem executar nada |

## Bugs encontrados e corrigidos

Este app começou como um protótipo. Cada bug ganhou um teste que falhava antes da correção e passa depois.

**#1: "Reabrir" apagava a data original do pedido.** Ao reabrir um pedido do Histórico, a data de criação era substituída pela data atual, e o registro de quando a cliente pediu se perdia.
Correção: a data de criação é mantida e o app grava a data da reabertura à parte. O pedido reaberto vai para o fim da fila de Conferir.
Testes: `"Reabrir" mantém a data de criação original (bug #1)` e `pedido reaberto entra no fim da fila de Conferir`.

**#2: Mudar o prazo de pagamento afetava peças já separadas.** A cliente recebia "a reserva vale por 30 minutos". Se a lojista mudasse o prazo para 15 minutos, a peça daquela cliente passava a aparecer como vencida antes da hora combinada.
Correção: o prazo fica gravado na peça no momento em que ela é separada. Mudar o prazo só vale para as próximas.
Testes: `usa o prazo gravado na peça, mesmo que o prazo padrão mude depois (bug #2)` e `mudar o prazo padrão não afeta peça já separada (bug #2)`.

**#3: "Voltar pra Segurando" não reiniciava o cronômetro.** Se a cliente pagava depois de 25 minutos e a lojista desfazia o pagamento, a peça voltava para Segurando já marcando 25 minutos, quase vencida.
Correção: ao voltar para Segurando, o cronômetro recomeça do zero, com o mesmo prazo combinado com a cliente.
Testes: `"Voltar pra Segurando" reinicia o cronômetro a partir de agora (bug #3)` (unidade), `"Voltar pra Segurando" reinicia o cronômetro na tela (bug #3)` (integração) e `"Voltar pra Segurando" reinicia o cronômetro (bug #3)` (Playwright).

**#4: Em celulares de tela pequena, o topo empurrava a página para o lado.** Achado pelos testes de ponta a ponta na tela de 320 px (iPhone SE): o nome do app e o seletor de prazo não cabiam na mesma linha, a página ficava com 375 px e as abas eram parcialmente cobertas.
Correção: o seletor de prazo desce para a linha de baixo quando falta espaço.
Teste: `a tela cabe no celular, sem rolagem para os lados, em todas as abas` (Playwright).

## Como rodar

Pré-requisito: [Node.js](https://nodejs.org/) 20 ou mais novo.

```bash
npm install
npm run dev                          # abre o app no navegador
npm test                             # testes do Vitest
npm run test:watch                   # testes do Vitest a cada alteração
npm run test:coverage                # Vitest com relatório de cobertura (em coverage/index.html)
npx playwright install chromium      # só na primeira vez
npm run test:e2e                     # testes de ponta a ponta com Playwright
```

## Estrutura

```
src/
  regras/        regras de negócio em JavaScript puro (testáveis sem navegador)
    pedidos.js       status, ações permitidas, prazo, abas e agrupamento
    mensagens.js     mensagens prontas para a cliente
    armazenamento.js salvar e carregar no navegador
  composables/
    usePedidos.js    estado do app
  components/      AbasStatus, FormNovoPedido, CardPedido, AvisoToast
  App.vue
tests/
  unit/          testes das regras
  components/    testes dos componentes e do app inteiro
  e2e/           testes de ponta a ponta com Playwright
playwright.config.js
```

Os pedidos ficam salvos no próprio navegador (localStorage). Use sempre o mesmo celular.

---

Feito por Armando Oliveira, Analista de QA.
