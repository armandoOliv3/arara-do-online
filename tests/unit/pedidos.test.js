import { describe, expect, it } from 'vitest'
import {
  ABAS,
  ACOES_DISPONIVEIS,
  PRAZO_PADRAO_MIN,
  STATUS,
  agruparPorPeca,
  aplicarAcao,
  contarPorAba,
  criarPedido,
  entrouEmConferir,
  novoId,
  pedidosDaAba,
} from '../../src/regras/pedidos'
import { INICIO, MIN, idFixo, umPedido } from '../ajudantes'

const dadosValidos = { cliente: '@ana.souza', peca: 'Blusa ciganinha', tam: 'M', cor: 'rosa', canal: 'insta' }

describe('Criação de pedido', () => {
  it('cria em Conferir com os dados informados e o horário de criação', () => {
    const p = criarPedido(dadosValidos, INICIO, idFixo)
    expect(p).toMatchObject({
      cliente: '@ana.souza',
      canal: 'insta',
      peca: 'Blusa ciganinha',
      tam: 'M',
      cor: 'rosa',
      obs: '',
      status: STATUS.CONFERIR,
      criadoEm: INICIO,
      atualizadoEm: INICIO,
    })
    expect(p).not.toHaveProperty('seguradoEm')
  })

  it('tira espaços sobrando de cliente, peça, cor e observação', () => {
    const p = criarPedido({ cliente: '  Ana Souza ', peca: ' Saia midi  ', cor: ' azul ', obs: '  embrulhar ' }, INICIO, idFixo)
    expect(p).toMatchObject({ cliente: 'Ana Souza', peca: 'Saia midi', cor: 'azul', obs: 'embrulhar' })
  })

  it.each([
    ['vazia', ''],
    ['só com espaços', '   '],
    ['ausente', undefined],
  ])('recusa cliente %s', (_, cliente) => {
    expect(() => criarPedido({ ...dadosValidos, cliente }, INICIO, idFixo)).toThrow('Informe a cliente')
  })

  it.each([
    ['vazia', ''],
    ['só com espaços', '   '],
    ['ausente', undefined],
  ])('recusa peça %s', (_, peca) => {
    expect(() => criarPedido({ ...dadosValidos, peca }, INICIO, idFixo)).toThrow('Informe a peça')
  })

  it('canal desconhecido vira Insta; "whats" é mantido', () => {
    expect(criarPedido({ ...dadosValidos, canal: 'tiktok' }, INICIO, idFixo).canal).toBe('insta')
    expect(criarPedido({ ...dadosValidos, canal: 'whats' }, INICIO, idFixo).canal).toBe('whats')
  })

  it('tamanho fora da lista fica vazio; "Único" é aceito', () => {
    expect(criarPedido({ ...dadosValidos, tam: 'XGG' }, INICIO, idFixo).tam).toBe('')
    expect(criarPedido({ ...dadosValidos, tam: '' }, INICIO, idFixo).tam).toBe('')
    expect(criarPedido({ ...dadosValidos, tam: 'Único' }, INICIO, idFixo).tam).toBe('Único')
  })

  it('"Já peguei a peça" cria direto em Segurando, com horário e prazo gravados', () => {
    const p = criarPedido({ ...dadosValidos, jaPeguei: true, prazoMin: 45 }, INICIO, idFixo)
    expect(p).toMatchObject({ status: STATUS.SEGURANDO, seguradoEm: INICIO, prazoMin: 45 })
  })

  it(`"Já peguei" sem prazo válido grava o prazo padrão de ${PRAZO_PADRAO_MIN} min`, () => {
    const p = criarPedido({ ...dadosValidos, jaPeguei: true, prazoMin: 'x' }, INICIO, idFixo)
    expect(p.prazoMin).toBe(PRAZO_PADRAO_MIN)
  })

  it('gera um id diferente para cada pedido', () => {
    const ids = new Set(Array.from({ length: 50 }, () => novoId(INICIO)))
    expect(ids.size).toBe(50)
    for (const id of ids) expect(id).toMatch(/^p[a-z0-9]+$/)
  })

  it('usa o horário atual quando nenhum é informado', () => {
    const antes = Date.now()
    const p = criarPedido(dadosValidos)
    expect(p.criadoEm).toBeGreaterThanOrEqual(antes)
    expect(p.id).toMatch(/^p/)
  })
})

describe('Fluxo de status', () => {
  const T = (min) => INICIO + min * MIN

  it('caminho feliz: conferir → segurando → pago → enviado', () => {
    let p = umPedido()
    p = aplicarAcao(p, 'pegar', T(1), { prazoMin: 30 })
    expect(p).toMatchObject({ status: STATUS.SEGURANDO, seguradoEm: T(1), prazoMin: 30, atualizadoEm: T(1) })
    p = aplicarAcao(p, 'pagar', T(10))
    expect(p).toMatchObject({ status: STATUS.PAGO, pagoEm: T(10) })
    p = aplicarAcao(p, 'enviar', T(60))
    expect(p).toMatchObject({ status: STATUS.ENVIADO, enviadoEm: T(60), atualizadoEm: T(60) })
  })

  it('"Não tem" leva o pedido de Conferir para o Histórico', () => {
    expect(aplicarAcao(umPedido(), 'naoTem', T(2)).status).toBe(STATUS.NAO_TEM)
  })

  it('"Devolver pra loja" tira a peça de Segurando', () => {
    const segurando = umPedido({ status: STATUS.SEGURANDO, seguradoEm: T(0) })
    expect(aplicarAcao(segurando, 'devolver', T(40)).status).toBe(STATUS.DEVOLVIDO)
  })

  it('"Voltar pra Segurando" desfaz o pagamento', () => {
    const pago = umPedido({ status: STATUS.PAGO, seguradoEm: T(0), pagoEm: T(5) })
    const p = aplicarAcao(pago, 'voltarSegurando', T(6))
    expect(p.status).toBe(STATUS.SEGURANDO)
    expect(p.pagoEm).toBeNull()
  })

  it('pegar sem prazo informado grava o prazo padrão', () => {
    expect(aplicarAcao(umPedido(), 'pegar', T(1)).prazoMin).toBe(PRAZO_PADRAO_MIN)
  })

  it('"Reabrir" mantém a data de criação original (bug #1)', () => {
    const enviado = umPedido({ status: STATUS.ENVIADO, criadoEm: T(0), seguradoEm: T(1), prazoMin: 30, pagoEm: T(5), enviadoEm: T(9) })
    const p = aplicarAcao(enviado, 'reabrir', T(120))
    expect(p.criadoEm).toBe(T(0))
    expect(p.reabertoEm).toBe(T(120))
    expect(p).toMatchObject({ status: STATUS.CONFERIR, seguradoEm: null, prazoMin: null, pagoEm: null, enviadoEm: null })
  })

  it.each([STATUS.ENVIADO, STATUS.DEVOLVIDO, STATUS.NAO_TEM])('pedido "%s" pode ser reaberto', (status) => {
    expect(aplicarAcao(umPedido({ status }), 'reabrir', T(1)).status).toBe(STATUS.CONFERIR)
  })

  it('pedido reaberto entra no fim da fila de Conferir', () => {
    const antigoReaberto = aplicarAcao(umPedido({ id: 'a', status: STATUS.NAO_TEM, criadoEm: T(0) }), 'reabrir', T(30))
    const novo = umPedido({ id: 'b', criadoEm: T(10) })
    expect(entrouEmConferir(antigoReaberto)).toBe(T(30))
    expect(pedidosDaAba([antigoReaberto, novo], 'conferir').map((p) => p.id)).toEqual(['b', 'a'])
  })

  it('não altera o pedido original (necessário para o Desfazer)', () => {
    const original = Object.freeze(umPedido())
    const novo = aplicarAcao(original, 'pegar', T(1))
    expect(novo).not.toBe(original)
    expect(original.status).toBe(STATUS.CONFERIR)
  })

  // Ações proibidas: cada uma só vale a partir de certos status
  it.each([
    ['pagar', STATUS.CONFERIR],
    ['enviar', STATUS.SEGURANDO],
    ['enviar', STATUS.CONFERIR],
    ['pegar', STATUS.SEGURANDO],
    ['naoTem', STATUS.PAGO],
    ['devolver', STATUS.PAGO],
    ['voltarSegurando', STATUS.SEGURANDO],
    ['reabrir', STATUS.CONFERIR],
    ['reabrir', STATUS.PAGO],
  ])('não deixa "%s" um pedido em "%s"', (acao, status) => {
    expect(() => aplicarAcao(umPedido({ status }), acao, T(1))).toThrow(`Não dá pra "${acao}"`)
  })

  it('recusa ação desconhecida', () => {
    expect(() => aplicarAcao(umPedido(), 'cancelar', T(1))).toThrow('Ação desconhecida: cancelar')
  })

  it('lista as ações disponíveis', () => {
    expect(ACOES_DISPONIVEIS).toEqual(['pegar', 'naoTem', 'pagar', 'devolver', 'enviar', 'voltarSegurando', 'reabrir'])
  })
})

describe('Abas, contagem e ordenação', () => {
  const T = (min) => INICIO + min * MIN

  it('cada status pertence a exatamente uma aba', () => {
    for (const status of Object.values(STATUS)) {
      expect(ABAS.filter((a) => a.status.includes(status))).toHaveLength(1)
    }
  })

  it('conta pedidos por aba e as peças vencidas', () => {
    const pedidos = [
      umPedido({ status: STATUS.CONFERIR }),
      umPedido({ status: STATUS.CONFERIR }),
      umPedido({ status: STATUS.SEGURANDO, seguradoEm: T(0), prazoMin: 30 }),
      umPedido({ status: STATUS.SEGURANDO, seguradoEm: T(25), prazoMin: 30 }),
      umPedido({ status: STATUS.PAGO }),
      umPedido({ status: STATUS.ENVIADO }),
      umPedido({ status: STATUS.DEVOLVIDO }),
      umPedido({ status: STATUS.NAO_TEM }),
      umPedido({ status: 'status-estranho' }),
    ]
    expect(contarPorAba(pedidos, 30, T(31))).toEqual({ conferir: 2, segurando: 2, enviar: 1, historico: 3, vencidos: 1 })
  })

  it('sem pedidos, tudo zerado', () => {
    expect(contarPorAba([], 30, T(0))).toEqual({ conferir: 0, segurando: 0, enviar: 0, historico: 0, vencidos: 0 })
  })

  it('Conferir: mais antigo primeiro', () => {
    const lista = [umPedido({ id: 'b', criadoEm: T(5) }), umPedido({ id: 'a', criadoEm: T(1) })]
    expect(pedidosDaAba(lista, 'conferir').map((p) => p.id)).toEqual(['a', 'b'])
  })

  it('Segurando: quem foi separado há mais tempo primeiro', () => {
    const lista = [
      umPedido({ id: 'b', status: STATUS.SEGURANDO, seguradoEm: T(9) }),
      umPedido({ id: 'a', status: STATUS.SEGURANDO, seguradoEm: T(2) }),
      umPedido({ id: 'c', status: STATUS.SEGURANDO, criadoEm: T(5) }),
    ]
    expect(pedidosDaAba(lista, 'segurando').map((p) => p.id)).toEqual(['a', 'c', 'b'])
  })

  it('Enviar: quem pagou primeiro aparece primeiro', () => {
    const lista = [
      umPedido({ id: 'b', status: STATUS.PAGO, pagoEm: T(20) }),
      umPedido({ id: 'a', status: STATUS.PAGO, pagoEm: T(3) }),
      umPedido({ id: 'z', status: STATUS.PAGO }),
    ]
    expect(pedidosDaAba(lista, 'enviar').map((p) => p.id)).toEqual(['z', 'a', 'b'])
  })

  it('Histórico: mais recente primeiro, juntando enviados, devolvidos e sem estoque', () => {
    const lista = [
      umPedido({ id: 'a', status: STATUS.ENVIADO, atualizadoEm: T(1) }),
      umPedido({ id: 'b', status: STATUS.NAO_TEM, atualizadoEm: T(8) }),
      umPedido({ id: 'c', status: STATUS.DEVOLVIDO, atualizadoEm: T(4) }),
      umPedido({ id: 'x', status: STATUS.CONFERIR }),
    ]
    expect(pedidosDaAba(lista, 'historico').map((p) => p.id)).toEqual(['b', 'c', 'a'])
  })

  it('aba desconhecida devolve lista vazia', () => {
    expect(pedidosDaAba([umPedido()], 'lixeira')).toEqual([])
  })
})

describe('Agrupamento por peça', () => {
  it('junta a mesma peça sem diferenciar maiúsculas e espaços', () => {
    const grupos = agruparPorPeca([
      umPedido({ id: '1', peca: 'Blusa ciganinha' }),
      umPedido({ id: '2', peca: '  BLUSA   Ciganinha ' }),
      umPedido({ id: '3', peca: 'Saia midi' }),
    ])
    expect(grupos).toHaveLength(2)
    expect(grupos[0]).toMatchObject({ chave: 'blusa ciganinha', nome: 'Blusa ciganinha' })
    expect(grupos[0].itens.map((p) => p.id)).toEqual(['1', '2'])
    expect(grupos[1].itens.map((p) => p.id)).toEqual(['3'])
  })

  it('mantém a ordem em que as peças aparecem', () => {
    const grupos = agruparPorPeca([umPedido({ peca: 'Saia' }), umPedido({ peca: 'Blusa' }), umPedido({ peca: 'saia' })])
    expect(grupos.map((g) => g.nome)).toEqual(['Saia', 'Blusa'])
  })

  it('lista vazia não gera grupos', () => {
    expect(agruparPorPeca([])).toEqual([])
  })
})
