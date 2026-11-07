import { describe, expect, it } from 'vitest'
import { usePedidos } from '../../src/composables/usePedidos'
import { CHAVE_PEDIDOS, CHAVE_PREFERENCIAS, criarArmazenamento } from '../../src/regras/armazenamento'
import { INICIO, MIN, erroDeCotaCheia, storageFalso, umPedido } from '../ajudantes'

// Estado do app com armazenamento e relógio controlados pelo teste
function montar({ pedidos = [], preferencias = null, storage = storageFalso() } = {}) {
  if (pedidos.length) storage.dados.set(CHAVE_PEDIDOS, JSON.stringify(pedidos))
  if (preferencias) storage.dados.set(CHAVE_PREFERENCIAS, JSON.stringify(preferencias))
  let agora = INICIO
  const relogio = () => agora
  const estado = usePedidos({ armazenamento: criarArmazenamento(() => storage), relogio })
  const avancar = (min) => {
    agora += min * MIN
  }
  const salvos = () => JSON.parse(storage.dados.get(CHAVE_PEDIDOS) ?? '[]')
  return { estado, storage, avancar, salvos }
}

const dados = { cliente: '@bia', peca: 'Vestido', tam: 'P', cor: 'preto', canal: 'whats' }

describe('Estado do app', () => {
  it('carrega os pedidos e as preferências salvos', () => {
    const { estado } = montar({ pedidos: [umPedido({ id: 'a' })], preferencias: { aba: 'enviar', prazo: 15, canal: 'whats' } })
    expect(estado.pedidos.value.map((p) => p.id)).toEqual(['a'])
    expect(estado.preferencias).toMatchObject({ aba: 'enviar', prazo: 15, canal: 'whats' })
  })

  it('adicionar cria o pedido, salva e atualiza a contagem', () => {
    const { estado, salvos } = montar()
    const p = estado.adicionar(dados)
    expect(p).toMatchObject({ cliente: '@bia', status: 'conferir', criadoEm: INICIO })
    expect(salvos()).toHaveLength(1)
    expect(estado.contagens.value.conferir).toBe(1)
  })

  it('"Já peguei" grava o prazo atual das preferências na peça', () => {
    const { estado } = montar({ preferencias: { prazo: 45 } })
    expect(estado.adicionar({ ...dados, jaPeguei: true })).toMatchObject({ status: 'segurando', prazoMin: 45 })
  })

  it('adicionar sem cliente lança erro e não salva nada', () => {
    const { estado, salvos } = montar()
    expect(() => estado.adicionar({ ...dados, cliente: ' ' })).toThrow('Informe a cliente')
    expect(salvos()).toEqual([])
  })

  it('executar devolve o pedido antes e depois, e salva o novo status', () => {
    const { estado, avancar, salvos } = montar({ pedidos: [umPedido({ id: 'a' })] })
    avancar(3)
    const r = estado.executar('a', 'pegar')
    expect(r.anterior.status).toBe('conferir')
    expect(r.atualizado).toMatchObject({ status: 'segurando', seguradoEm: INICIO + 3 * MIN, prazoMin: 30 })
    expect(salvos()[0].status).toBe('segurando')
  })

  it('executar em pedido que não existe não faz nada', () => {
    const { estado } = montar()
    expect(estado.executar('fantasma', 'pegar')).toBeNull()
  })

  it('mudar o prazo padrão não afeta peça já separada (bug #2)', () => {
    const { estado, avancar } = montar({ pedidos: [umPedido({ id: 'a' })] })
    estado.executar('a', 'pegar') // separada com 30 min
    estado.salvarPreferencias({ prazo: 15 })
    avancar(20)
    estado.atualizarRelogio()
    expect(estado.contagens.value.vencidos).toBe(0)
    expect(estado.buscar('a').prazoMin).toBe(30)
  })

  it('peça separada depois da mudança usa o novo prazo', () => {
    const { estado } = montar({ pedidos: [umPedido({ id: 'a' })] })
    estado.salvarPreferencias({ prazo: 15 })
    expect(estado.executar('a', 'pegar').atualizado.prazoMin).toBe(15)
  })

  it('desfazer volta o pedido exatamente como era', () => {
    const original = umPedido({ id: 'a' })
    const { estado, salvos } = montar({ pedidos: [original] })
    const r = estado.executar('a', 'naoTem')
    estado.desfazer(r.anterior)
    expect(estado.buscar('a')).toEqual(original)
    expect(salvos()[0]).toEqual(original)
  })

  it('apagar remove o pedido; desfazer traz de volta', () => {
    const p = umPedido({ id: 'a', status: 'enviado' })
    const { estado, salvos } = montar({ pedidos: [p] })
    estado.apagar('a')
    expect(estado.pedidos.value).toEqual([])
    expect(salvos()).toEqual([])
    estado.desfazer(p)
    expect(estado.buscar('a')).toEqual(p)
    expect(salvos()).toHaveLength(1)
  })

  it('a contagem de vencidos acompanha o relógio', () => {
    const { estado, avancar } = montar({ pedidos: [umPedido({ id: 'a', status: 'segurando', seguradoEm: INICIO, prazoMin: 15 })] })
    expect(estado.contagens.value.vencidos).toBe(0)
    avancar(15)
    estado.atualizarRelogio()
    expect(estado.contagens.value.vencidos).toBe(1)
  })

  it('salvarPreferencias atualiza e grava as preferências', () => {
    const { estado, storage } = montar()
    estado.salvarPreferencias({ aba: 'historico', canal: 'whats' })
    expect(estado.preferencias).toMatchObject({ aba: 'historico', canal: 'whats', prazo: 30 })
    expect(JSON.parse(storage.dados.get(CHAVE_PREFERENCIAS))).toEqual({ aba: 'historico', canal: 'whats', prazo: 30 })
  })

  it('navegador cheio: mostra aviso de erro, mas mantém o pedido na tela', () => {
    const { estado } = montar({ storage: storageFalso({ falharCom: erroDeCotaCheia() }) })
    estado.adicionar(dados)
    expect(estado.pedidos.value).toHaveLength(1)
    expect(estado.erroAoSalvar.value).toMatch('O espaço do navegador encheu')
  })

  it('navegador bloqueado: avisa que os pedidos podem sumir', () => {
    const { estado } = montar({ storage: storageFalso({ falharCom: new Error('bloqueado') }) })
    estado.adicionar(dados)
    expect(estado.erroAoSalvar.value).toMatch('Não consegui salvar neste navegador')
  })

  it('o aviso de erro some quando volta a salvar', () => {
    const storage = storageFalso({ falharCom: erroDeCotaCheia() })
    const { estado } = montar({ storage })
    estado.adicionar(dados)
    expect(estado.erroAoSalvar.value).not.toBe('')
    storage.setItem = (k, v) => storage.dados.set(k, String(v))
    estado.adicionar(dados)
    expect(estado.erroAoSalvar.value).toBe('')
  })

  it('funciona com as opções padrão (localStorage e relógio real)', () => {
    localStorage.clear()
    const estado = usePedidos()
    const p = estado.adicionar(dados)
    expect(Math.abs(p.criadoEm - Date.now())).toBeLessThan(5000)
    expect(JSON.parse(localStorage.getItem(CHAVE_PEDIDOS))).toHaveLength(1)
    localStorage.clear()
  })
})
