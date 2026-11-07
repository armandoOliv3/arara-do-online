# Arara do Online

[![Testes e publicação](https://github.com/armandoOliv3/arara-do-online/actions/workflows/ci.yml/badge.svg)](https://github.com/armandoOliv3/arara-do-online/actions/workflows/ci.yml)

App de celular para loja que vende roupa pelo Instagram e pelo WhatsApp. Feito em **Vue 3** e testado com **Vitest** e **Vue Test Utils**.

**Abrir o app:** https://armandooliv3.github.io/arara-do-online/

## Como funciona

A cliente pergunta "tem essa blusa no M?". A lojista registra o pedido e o app acompanha a peça até o envio:

| Aba | O que acontece |
|---|---|
| **Conferir** | Pedidos agrupados por peça, para uma ida só à arara resolver todos |
| **Segurando** | Peça separada, com cronômetro até o prazo de pagamento: verde, amarelo em 2/3 do prazo e vermelho quando vence |
| **Enviar** | Peças pagas esperando despacho |
| **Histórico** | Enviados, devolvidos e sem estoque, com opção de reabrir ou apagar |

Em cada passo, o app gera a mensagem pronta para copiar e mandar à cliente ("Separei pra você…", "Acabou…", "Tudo certo com o pagamento?"). Toda ação tem **Desfazer**.

## Testes

**193 testes** e cobertura acima de **95%**. Se a cobertura cair abaixo do mínimo configurado, o GitHub Actions falha.

| Tipo | Arquivo | O que cobre |
|---|---|---|
| Unidade | `tests/unit/prazo.test.js` | Cronômetro com relógio falso (`vi.useFakeTimers`): limites de 2/3 e 100% do prazo para 15, 30, 45 e 60 min, relógio do celular voltando, barra limitada a 100% |
| Unidade | `tests/unit/pedidos.test.js` | Criação e validação de pedidos, fluxo completo de status, ações proibidas (ex.: pagar um pedido que nem foi separado), imutabilidade para o Desfazer, ordenação e agrupamento |
| Unidade | `tests/unit/mensagens.test.js` | Mensagens prontas: @usuário x nome completo, tamanho "Único", prazo da peça |
| Unidade | `tests/unit/armazenamento.test.js` | Navegador cheio, bloqueado (aba anônima), dado corrompido, preferências inválidas |
| Unidade | `tests/unit/usePedidos.test.js` | Estado do app: adicionar, executar, desfazer, apagar, aviso de erro ao salvar |
| Componente | `tests/components/*.test.js` | Formulário (campos obrigatórios, tamanho e canal), card em cada aba e cor do prazo, texto da cliente sem executar HTML, copiar mensagem com e sem permissão |
| Integração | `tests/components/App.test.js` | O app inteiro: pedido do início ao fim, cronômetro mudando de cor com o tempo, Desfazer, apagar com dois toques, dados mantidos ao reabrir |

## Bugs encontrados e corrigidos

Este app começou como um protótipo. Ao separar as regras de negócio e escrever os testes, encontrei dois bugs. Cada um ganhou um teste que falhava antes da correção e passa depois.

**#1: "Reabrir" apagava a data original do pedido.** Ao reabrir um pedido do Histórico, a data de criação era substituída pela data atual, e o registro de quando a cliente pediu se perdia.
Correção: a data de criação é mantida e o app grava a data da reabertura à parte. O pedido reaberto vai para o fim da fila de Conferir.
Testes: `"Reabrir" mantém a data de criação original (bug #1)` e `pedido reaberto entra no fim da fila de Conferir`.

**#2: Mudar o prazo de pagamento afetava peças já separadas.** A cliente recebia "a reserva vale por 30 minutos". Se a lojista mudasse o prazo para 15 minutos, a peça daquela cliente passava a aparecer como vencida antes da hora combinada.
Correção: o prazo fica gravado na peça no momento em que ela é separada. Mudar o prazo só vale para as próximas.
Testes: `usa o prazo gravado na peça, mesmo que o prazo padrão mude depois (bug #2)` e `mudar o prazo padrão não afeta peça já separada (bug #2)`.

## Como rodar

Pré-requisito: [Node.js](https://nodejs.org/) 20 ou mais novo.

```bash
npm install
npm run dev             # abre o app no navegador
npm test                # roda os testes
npm run test:watch      # roda os testes a cada alteração
npm run test:coverage   # testes com relatório de cobertura (em coverage/index.html)
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
```

Os pedidos ficam salvos no próprio navegador (localStorage). Use sempre o mesmo celular.

---

Feito por Armando Oliveira, Analista de QA.
