import { describe, expect, it } from 'vitest'
import {
  CHAVE_PEDIDOS,
  CHAVE_PREFERENCIAS,
  PREFERENCIAS_PADRAO,
  criarArmazenamento,
} from '../../src/regras/armazenamento'
import { erroDeCotaCheia, storageFalso, umPedido } from '../ajudantes'

describe('Armazenamento dos pedidos no navegador', () => {
  it('salva e carrega os pedidos', () => {
    const storage = storageFalso()
    const arm = criarArmazenamento(() => storage)
    const pedidos = [umPedido({ id: 'a' }), umPedido({ id: 'b', status: 'pago' })]
    expect(arm.salvarPedidos(pedidos)).toEqual({ ok: true })
    expect(arm.carregarPedidos()).toEqual(pedidos)
    expect(JSON.parse(storage.dados.get(CHAVE_PEDIDOS))).toHaveLength(2)
  })

  it('sem nada salvo, começa com a lista vazia', () => {
    expect(criarArmazenamento(() => storageFalso()).carregarPedidos()).toEqual([])
  })

  it('dado corrompido não quebra o app: começa com a lista vazia', () => {
    const storage = storageFalso()
    storage.dados.set(CHAVE_PEDIDOS, '{isso não é json')
    expect(criarArmazenamento(() => storage).carregarPedidos()).toEqual([])
  })

  it('dado salvo que não é lista é ignorado', () => {
    const storage = storageFalso()
    storage.dados.set(CHAVE_PEDIDOS, JSON.stringify({ id: 'a' }))
    expect(criarArmazenamento(() => storage).carregarPedidos()).toEqual([])
  })

  it('descarta itens inválidos e mantém os bons', () => {
    const storage = storageFalso()
    const bom = umPedido({ id: 'ok' })
    storage.dados.set(CHAVE_PEDIDOS, JSON.stringify([null, 42, { id: 7, status: 'conferir' }, { id: 'sem-status' }, bom]))
    expect(criarArmazenamento(() => storage).carregarPedidos()).toEqual([bom])
  })

  it('navegador cheio: avisa com o erro "cheio"', () => {
    const arm = criarArmazenamento(() => storageFalso({ falharCom: erroDeCotaCheia() }))
    expect(arm.salvarPedidos([umPedido()])).toEqual({ ok: false, erro: 'cheio' })
  })

  it('navegador cheio em navegadores antigos (código 22) também é reconhecido', () => {
    const erro = new Error('quota')
    erro.code = 22
    const arm = criarArmazenamento(() => storageFalso({ falharCom: erro }))
    expect(arm.salvarPedidos([umPedido()])).toEqual({ ok: false, erro: 'cheio' })
  })

  it('outro erro ao gravar vira "indisponivel"', () => {
    const arm = criarArmazenamento(() => storageFalso({ falharCom: new Error('SecurityError') }))
    expect(arm.salvarPedidos([umPedido()])).toEqual({ ok: false, erro: 'indisponivel' })
  })

  it('navegador bloqueado (aba anônima que lança erro ao acessar): não quebra', () => {
    const arm = criarArmazenamento(() => {
      throw new Error('bloqueado')
    })
    expect(arm.carregarPedidos()).toEqual([])
    expect(arm.salvarPedidos([umPedido()])).toEqual({ ok: false, erro: 'indisponivel' })
  })

  it('sem localStorage disponível: não quebra', () => {
    const arm = criarArmazenamento(() => undefined)
    expect(arm.carregarPedidos()).toEqual([])
    expect(arm.salvarPedidos([])).toEqual({ ok: false, erro: 'indisponivel' })
  })

  it('usa o localStorage do navegador por padrão', () => {
    localStorage.clear()
    const arm = criarArmazenamento()
    arm.salvarPedidos([umPedido({ id: 'real' })])
    expect(JSON.parse(localStorage.getItem(CHAVE_PEDIDOS))[0].id).toBe('real')
    localStorage.clear()
  })
})

describe('Preferências', () => {
  it('sem nada salvo, usa os padrões', () => {
    expect(criarArmazenamento(() => storageFalso()).carregarPreferencias()).toEqual(PREFERENCIAS_PADRAO)
  })

  it('salva e carrega preferências válidas', () => {
    const storage = storageFalso()
    const arm = criarArmazenamento(() => storage)
    arm.salvarPreferencias({ aba: 'enviar', prazo: 45, canal: 'whats' })
    expect(arm.carregarPreferencias()).toEqual({ aba: 'enviar', prazo: 45, canal: 'whats' })
  })

  it('prazo salvo como texto ("15") é aceito', () => {
    const storage = storageFalso()
    storage.dados.set(CHAVE_PREFERENCIAS, JSON.stringify({ prazo: '15' }))
    expect(criarArmazenamento(() => storage).carregarPreferencias().prazo).toBe(15)
  })

  it('preferências inválidas voltam para o padrão, campo a campo', () => {
    const storage = storageFalso()
    storage.dados.set(CHAVE_PREFERENCIAS, JSON.stringify({ aba: 'lixeira', prazo: 7, canal: 'tiktok' }))
    expect(criarArmazenamento(() => storage).carregarPreferencias()).toEqual(PREFERENCIAS_PADRAO)
  })

  it('preferências corrompidas voltam para o padrão', () => {
    const storage = storageFalso()
    storage.dados.set(CHAVE_PREFERENCIAS, 'nada{')
    expect(criarArmazenamento(() => storage).carregarPreferencias()).toEqual(PREFERENCIAS_PADRAO)
  })
})
