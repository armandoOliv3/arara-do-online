// Regras de negócio dos pedidos. Tudo aqui é JavaScript puro (sem Vue),
// por isso dá pra testar cada regra isolada, rápido e sem navegador.

export const STATUS = Object.freeze({
  CONFERIR: 'conferir',
  SEGURANDO: 'segurando',
  PAGO: 'pago',
  ENVIADO: 'enviado',
  DEVOLVIDO: 'devolvido',
  NAO_TEM: 'nao_tem',
})

export const TAMANHOS = Object.freeze(['PP', 'P', 'M', 'G', 'GG', 'Único'])
export const PRAZOS_MIN = Object.freeze([15, 20, 30, 45, 60])
export const PRAZO_PADRAO_MIN = 30

export const ABAS = Object.freeze([
  { id: 'conferir', rotulo: 'Conferir', status: [STATUS.CONFERIR] },
  { id: 'segurando', rotulo: 'Segurando', status: [STATUS.SEGURANDO] },
  { id: 'enviar', rotulo: 'Enviar', status: [STATUS.PAGO] },
  { id: 'historico', rotulo: 'Histórico', status: [STATUS.ENVIADO, STATUS.DEVOLVIDO, STATUS.NAO_TEM] },
])

export const novoId = (agora = Date.now()) => 'p' + agora.toString(36) + Math.random().toString(36).slice(2, 6)

const texto = (v) => String(v ?? '').trim()

// Cria um pedido novo. Lança erro se faltar cliente ou peça.
export function criarPedido(dados, agora = Date.now(), gerarId = novoId) {
  const cliente = texto(dados.cliente)
  const peca = texto(dados.peca)
  if (!cliente) throw new Error('Informe a cliente')
  if (!peca) throw new Error('Informe a peça')

  const pedido = {
    id: gerarId(agora),
    cliente,
    canal: dados.canal === 'whats' ? 'whats' : 'insta',
    peca,
    tam: TAMANHOS.includes(dados.tam) ? dados.tam : '',
    cor: texto(dados.cor),
    obs: texto(dados.obs),
    status: dados.jaPeguei ? STATUS.SEGURANDO : STATUS.CONFERIR,
    criadoEm: agora,
    atualizadoEm: agora,
  }
  if (dados.jaPeguei) {
    pedido.seguradoEm = agora
    pedido.prazoMin = Number(dados.prazoMin) || PRAZO_PADRAO_MIN
  }
  return pedido
}

// Cada ação só vale a partir de certos status. Isso evita, por exemplo,
// marcar como "pago" um pedido que nem foi separado.
const ACOES = {
  pegar: {
    de: [STATUS.CONFERIR],
    aplicar: (p, agora, { prazoMin }) => ({
      status: STATUS.SEGURANDO,
      seguradoEm: agora,
      // O prazo fica gravado no pedido no momento em que a peça é separada,
      // porque é esse prazo que a cliente recebe na mensagem.
      prazoMin: Number(prazoMin) || PRAZO_PADRAO_MIN,
    }),
  },
  naoTem: { de: [STATUS.CONFERIR], aplicar: () => ({ status: STATUS.NAO_TEM }) },
  pagar: { de: [STATUS.SEGURANDO], aplicar: (p, agora) => ({ status: STATUS.PAGO, pagoEm: agora }) },
  devolver: { de: [STATUS.SEGURANDO], aplicar: () => ({ status: STATUS.DEVOLVIDO }) },
  enviar: { de: [STATUS.PAGO], aplicar: (p, agora) => ({ status: STATUS.ENVIADO, enviadoEm: agora }) },
  voltarSegurando: { de: [STATUS.PAGO], aplicar: () => ({ status: STATUS.SEGURANDO, pagoEm: null }) },
  reabrir: {
    de: [STATUS.ENVIADO, STATUS.DEVOLVIDO, STATUS.NAO_TEM],
    // Mantém a data de criação original e registra quando foi reaberto.
    aplicar: (p, agora) => ({
      status: STATUS.CONFERIR,
      reabertoEm: agora,
      seguradoEm: null,
      prazoMin: null,
      pagoEm: null,
      enviadoEm: null,
    }),
  },
}

export const ACOES_DISPONIVEIS = Object.freeze(Object.keys(ACOES))

// Aplica uma ação e devolve um pedido NOVO (o original não é alterado,
// o que permite o "Desfazer").
export function aplicarAcao(pedido, acao, agora = Date.now(), opcoes = {}) {
  const regra = ACOES[acao]
  if (!regra) throw new Error(`Ação desconhecida: ${acao}`)
  if (!regra.de.includes(pedido.status)) {
    throw new Error(`Não dá pra "${acao}" um pedido que está em "${pedido.status}"`)
  }
  return { ...pedido, ...regra.aplicar(pedido, agora, opcoes), atualizadoEm: agora }
}

// Quando o pedido entrou na aba Conferir (criação ou reabertura)
export const entrouEmConferir = (p) => p.reabertoEm ?? p.criadoEm

// Situação do prazo de pagamento de uma peça separada
export function estadoPrazo(pedido, prazoPadraoMin = PRAZO_PADRAO_MIN, agora = Date.now()) {
  const inicio = pedido.seguradoEm ?? pedido.criadoEm
  const minutos = Math.max(0, Math.floor((agora - inicio) / 60000))
  const prazo = Number(pedido.prazoMin) || Number(prazoPadraoMin) || PRAZO_PADRAO_MIN
  let nivel = 'ok'
  if (minutos >= prazo) nivel = 'vencido'
  else if (minutos >= (prazo * 2) / 3) nivel = 'atencao'
  const percentual = Math.min(100, Math.round((minutos / prazo) * 100))
  return { minutos, prazo, nivel, percentual }
}

export function contarPorAba(pedidos, prazoPadraoMin = PRAZO_PADRAO_MIN, agora = Date.now()) {
  const contagem = { conferir: 0, segurando: 0, enviar: 0, historico: 0, vencidos: 0 }
  for (const p of pedidos) {
    const aba = ABAS.find((a) => a.status.includes(p.status))
    if (!aba) continue
    contagem[aba.id]++
    if (p.status === STATUS.SEGURANDO && estadoPrazo(p, prazoPadraoMin, agora).nivel === 'vencido') {
      contagem.vencidos++
    }
  }
  return contagem
}

const ORDENACAO = {
  conferir: (a, b) => entrouEmConferir(a) - entrouEmConferir(b),
  segurando: (a, b) => (a.seguradoEm ?? a.criadoEm) - (b.seguradoEm ?? b.criadoEm),
  enviar: (a, b) => (a.pagoEm ?? 0) - (b.pagoEm ?? 0),
  historico: (a, b) => b.atualizadoEm - a.atualizadoEm,
}

export function pedidosDaAba(pedidos, abaId) {
  const aba = ABAS.find((a) => a.id === abaId)
  if (!aba) return []
  return pedidos.filter((p) => aba.status.includes(p.status)).sort(ORDENACAO[abaId])
}

// Agrupa por peça (sem diferenciar maiúsculas e espaços), para uma ida
// só à arara resolver todos os pedidos da mesma peça.
export function agruparPorPeca(pedidos) {
  const grupos = new Map()
  for (const p of pedidos) {
    const chave = texto(p.peca).toLowerCase().replace(/\s+/g, ' ')
    if (!grupos.has(chave)) grupos.set(chave, { chave, nome: texto(p.peca), itens: [] })
    grupos.get(chave).itens.push(p)
  }
  return [...grupos.values()]
}
