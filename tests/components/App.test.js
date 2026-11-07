import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import App from '../../src/App.vue'
import { CHAVE_PEDIDOS, CHAVE_PREFERENCIAS, criarArmazenamento } from '../../src/regras/armazenamento'
import { INICIO, MIN, erroDeCotaCheia, storageFalso, umPedido } from '../ajudantes'

// Monta o app inteiro com armazenamento e relógio falsos.
let agora
let montados = []
function montarApp({ storage = storageFalso(), pedidos = null, preferencias = null } = {}) {
  if (pedidos) storage.dados.set(CHAVE_PEDIDOS, JSON.stringify(pedidos))
  if (preferencias) storage.dados.set(CHAVE_PREFERENCIAS, JSON.stringify(preferencias))
  const w = mount(App, {
    props: { opcoes: { armazenamento: criarArmazenamento(() => storage), relogio: () => agora } },
    attachTo: document.body,
  })
  montados.push(w)
  return { w, storage }
}

// Avança o relógio do app; o cronômetro da tela atualiza a cada 30 s
async function passarMinutos(w, minutos) {
  agora += minutos * MIN
  vi.advanceTimersByTime(30000)
  await flushPromises()
}

const abrirAba = (w, id) => w.get(`[data-aba="${id}"]`).trigger('click')
const cards = (w) => w.findAll('[data-testid="card-pedido"]')
const tituloAviso = (w) => w.find('[data-testid="aviso-titulo"]')
const clicarAcao = (card, acao) => card.get(`[data-acao="${acao}"]`).trigger('click')

async function novoPedido(w, { cliente = '@ana.souza', peca = 'Blusa ciganinha', cor = 'rosa', jaPeguei = false } = {}) {
  if (w.find('[data-testid="novo-pedido"]').exists()) await w.get('[data-testid="novo-pedido"]').trigger('click')
  await w.get('[data-testid="cliente"]').setValue(cliente)
  await w.get('[data-testid="peca"]').setValue(peca)
  await w.get('[data-testid="cor"]').setValue(cor)
  if (jaPeguei) await w.get('[data-testid="ja-peguei"]').setValue(true)
  await w.get('form').trigger('submit')
}

describe('App inteiro', () => {
  beforeEach(() => {
    agora = INICIO
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] })
  })
  afterEach(() => {
    montados.forEach((w) => w.unmount())
    montados = []
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('começa vazio, na aba Conferir', () => {
    const { w } = montarApp()
    expect(w.get('[data-aba="conferir"]').attributes('aria-selected')).toBe('true')
    expect(w.text()).toContain('Nada pra conferir')
  })

  it('pedido do início ao fim: conferir, separar, pagar e enviar', async () => {
    const { w, storage } = montarApp()

    await novoPedido(w)
    expect(tituloAviso(w).text()).toBe('Adicionado em Conferir: Blusa ciganinha M rosa')
    expect(w.get('.group h2').text()).toContain('Blusa ciganinha')
    expect(w.get('[data-aba="conferir"]').text()).toContain('1')

    await clicarAcao(cards(w)[0], 'pegar')
    expect(tituloAviso(w).text()).toBe('Peça separada. Mande pra cliente:')
    expect(w.get('[data-testid="aviso-mensagem"]').element.value).toContain('A reserva vale por 30 minutos')

    await abrirAba(w, 'segurando')
    expect(cards(w)).toHaveLength(1)
    expect(w.get('[data-testid="timer"]').text()).toBe('0 min de 30 min')

    await passarMinutos(w, 5)
    await clicarAcao(cards(w)[0], 'pagar')
    expect(tituloAviso(w).text()).toBe('Pago! Foi pra lista Enviar.')
    expect(w.get('[data-testid="aviso-mensagem"]').element.value).toBe(
      'Pagamento recebido, @ana.souza! Obrigada 💕 Já vou preparar o envio.',
    )

    await abrirAba(w, 'enviar')
    expect(cards(w)[0].text()).toContain('pagou')
    await clicarAcao(cards(w)[0], 'enviar')
    expect(w.text()).toContain('Nada pra enviar')

    await abrirAba(w, 'historico')
    expect(cards(w)[0].get('.state').text()).toBe('Enviado')
    expect(JSON.parse(storage.dados.get(CHAVE_PEDIDOS))[0].status).toBe('enviado')
  })

  it('agrupa pedidos da mesma peça em Conferir', async () => {
    const { w } = montarApp()
    await novoPedido(w, { cliente: '@ana', peca: 'Saia midi' })
    await novoPedido(w, { cliente: '@bia', peca: 'saia  MIDI' })
    await novoPedido(w, { cliente: '@carla', peca: 'Vestido' })
    const grupos = w.findAll('.group')
    expect(grupos).toHaveLength(2)
    expect(grupos[0].get('h2').text()).toContain('2 pedidos')
    expect(grupos[1].get('h2').text()).toContain('1 pedido')
  })

  it('"Já peguei" manda direto para Segurando com a mensagem pronta', async () => {
    const { w } = montarApp()
    await novoPedido(w, { cliente: 'Ana Souza', jaPeguei: true })
    expect(tituloAviso(w).text()).toBe('Adicionado em Segurando. Mande pra cliente:')
    expect(w.get('[data-testid="aviso-mensagem"]').element.value).toContain('Oi, Ana!')
    expect(w.get('[data-aba="segurando"]').text()).toContain('1')
  })

  it('o cronômetro muda de cor com o tempo e a aba avisa o vencimento', async () => {
    const { w } = montarApp({
      pedidos: [umPedido({ id: 'a', status: 'segurando', seguradoEm: INICIO, prazoMin: 30 })],
      preferencias: { aba: 'segurando' },
    })
    expect(cards(w)[0].classes()).not.toContain('atencao')
    expect(w.text()).toContain('Cada peça tem o prazo que valia quando foi separada.')

    await passarMinutos(w, 20)
    expect(cards(w)[0].classes()).toContain('atencao')
    expect(cards(w)[0].find('[data-acao="cobrar"]').exists()).toBe(true)

    await passarMinutos(w, 10)
    expect(cards(w)[0].classes()).toContain('vencido')
    expect(w.get('[data-aba="segurando"]').classes()).toContain('has-late')
    expect(w.text()).toContain('1 peça passou do prazo.')

    await clicarAcao(cards(w)[0], 'cobrar')
    expect(tituloAviso(w).text()).toBe('Mensagem pra cobrar:')
  })

  it('conta várias peças vencidas no plural', async () => {
    const { w } = montarApp({
      pedidos: [
        umPedido({ id: 'a', status: 'segurando', seguradoEm: INICIO, prazoMin: 15 }),
        umPedido({ id: 'b', status: 'segurando', seguradoEm: INICIO, prazoMin: 15 }),
      ],
      preferencias: { aba: 'segurando' },
    })
    await passarMinutos(w, 16)
    expect(w.text()).toContain('2 peças passaram do prazo.')
  })

  it('mudar o prazo padrão não afeta peça já separada (bug #2)', async () => {
    const { w } = montarApp({ pedidos: [umPedido({ id: 'a' })] })
    await clicarAcao(cards(w)[0], 'pegar')
    await w.get('[data-testid="prazo"]').setValue('15')
    await abrirAba(w, 'segurando')
    await passarMinutos(w, 20)
    expect(cards(w)[0].classes()).toContain('atencao')
    expect(w.get('[data-testid="timer"]').text()).toBe('20 min de 30 min')
  })

  it('Desfazer volta o pedido para onde estava', async () => {
    const { w } = montarApp({ pedidos: [umPedido({ id: 'a' })] })
    await clicarAcao(cards(w)[0], 'naoTem')
    expect(w.text()).toContain('Nada pra conferir')
    await w.get('[data-testid="desfazer"]').trigger('click')
    expect(cards(w)).toHaveLength(1)
    expect(tituloAviso(w).exists()).toBe(false)
  })

  it('apagar exige dois toques e pode ser desfeito', async () => {
    const { w } = montarApp({
      pedidos: [umPedido({ id: 'a', status: 'enviado' }), umPedido({ id: 'b', status: 'devolvido' })],
      preferencias: { aba: 'historico' },
    })
    await clicarAcao(cards(w)[0], 'apagar')
    expect(cards(w)).toHaveLength(2)
    expect(cards(w)[0].get('[data-acao="apagar"]').text()).toBe('Toque de novo pra apagar')

    await clicarAcao(cards(w)[0], 'apagar')
    expect(cards(w)).toHaveLength(1)
    expect(tituloAviso(w).text()).toBe('Pedido apagado.')

    await w.get('[data-testid="desfazer"]').trigger('click')
    expect(cards(w)).toHaveLength(2)
  })

  it('trocar de aba cancela a confirmação de exclusão', async () => {
    const { w } = montarApp({ pedidos: [umPedido({ status: 'enviado' })], preferencias: { aba: 'historico' } })
    await clicarAcao(cards(w)[0], 'apagar')
    await abrirAba(w, 'conferir')
    await abrirAba(w, 'historico')
    expect(cards(w)[0].get('[data-acao="apagar"]').text()).toBe('Apagar')
  })

  it('reabrir manda de volta para Conferir', async () => {
    const { w } = montarApp({ pedidos: [umPedido({ id: 'a', status: 'nao_tem' })], preferencias: { aba: 'historico' } })
    await clicarAcao(cards(w)[0], 'reabrir')
    expect(tituloAviso(w).text()).toBe('Reaberto em Conferir.')
    await abrirAba(w, 'conferir')
    expect(cards(w)).toHaveLength(1)
  })

  it('"Devolver pra loja" e "Voltar pra Segurando" funcionam', async () => {
    const { w } = montarApp({
      pedidos: [
        umPedido({ id: 'a', status: 'segurando', seguradoEm: INICIO, prazoMin: 30 }),
        umPedido({ id: 'b', status: 'pago', seguradoEm: INICIO, prazoMin: 30, pagoEm: INICIO }),
      ],
      preferencias: { aba: 'segurando' },
    })
    await clicarAcao(cards(w)[0], 'devolver')
    expect(tituloAviso(w).text()).toBe('Pode devolver a peça pra frente da loja.')
    await abrirAba(w, 'enviar')
    await clicarAcao(cards(w)[0], 'voltarSegurando')
    expect(tituloAviso(w).text()).toBe('Voltou pra Segurando.')
    expect(w.get('[data-aba="segurando"]').text()).toContain('1')
  })

  it('aviso sem mensagem fecha sozinho em 6 segundos; com mensagem fica aberto', async () => {
    const { w } = montarApp({ pedidos: [umPedido({ id: 'a' }), umPedido({ id: 'b', peca: 'Saia' })] })
    await novoPedido(w, { peca: 'Vestido' })
    expect(tituloAviso(w).exists()).toBe(true)
    vi.advanceTimersByTime(6000)
    await flushPromises()
    expect(tituloAviso(w).exists()).toBe(false)

    await clicarAcao(cards(w)[0], 'pegar')
    vi.advanceTimersByTime(60000)
    await flushPromises()
    expect(tituloAviso(w).exists()).toBe(true)

    await w.get('[aria-label="Fechar"]').trigger('click')
    expect(tituloAviso(w).exists()).toBe(false)
  })

  it('os dados continuam lá ao reabrir o app', async () => {
    const storage = storageFalso()
    const primeiro = montarApp({ storage }).w
    await novoPedido(primeiro, { cliente: '@joana' })
    await primeiro.get('[data-canal="whats"]').trigger('click')
    await abrirAba(primeiro, 'segurando')
    await primeiro.get('[data-testid="prazo"]').setValue('45')
    primeiro.unmount()
    montados = []

    const { w } = montarApp({ storage })
    expect(w.get('[data-aba="segurando"]').attributes('aria-selected')).toBe('true')
    expect(w.get('[data-testid="prazo"]').element.value).toBe('45')
    expect(w.get('[data-aba="conferir"]').text()).toContain('1')
    await abrirAba(w, 'conferir')
    expect(cards(w)[0].text()).toContain('@joana')
    await w.get('[data-testid="novo-pedido"]').trigger('click')
    expect(w.get('[data-canal="whats"]').attributes('aria-pressed')).toBe('true')
  })

  it('formulário: "Fechar" volta para o botão de novo pedido', async () => {
    const { w } = montarApp()
    await w.get('[data-testid="novo-pedido"]').trigger('click')
    expect(w.find('form').exists()).toBe(true)
    await w.findAll('button').find((b) => b.text() === 'Fechar').trigger('click')
    expect(w.find('form').exists()).toBe(false)
    expect(w.find('[data-testid="novo-pedido"]').exists()).toBe(true)
  })

  it('sugere no formulário as peças e cores já usadas', async () => {
    const { w } = montarApp({ pedidos: [umPedido({ peca: 'Saia midi', cor: 'azul' })] })
    await w.get('[data-testid="novo-pedido"]').trigger('click')
    expect(w.findAll('#pecasList option').map((o) => o.attributes('value'))).toContain('Saia midi')
    expect(w.findAll('#coresList option').map((o) => o.attributes('value'))).toContain('azul')
  })

  it('navegador cheio: mostra o aviso de erro no topo da lista', async () => {
    const { w } = montarApp({ storage: storageFalso({ falharCom: erroDeCotaCheia() }) })
    await novoPedido(w)
    expect(w.get('[role="alert"]').text()).toContain('O espaço do navegador encheu')
    expect(cards(w)).toHaveLength(1)
  })

  it('Histórico mostra no máximo 60 pedidos e avisa o total', () => {
    const pedidos = Array.from({ length: 65 }, (_, i) => umPedido({ id: `h${i}`, status: 'enviado', atualizadoEm: INICIO + i }))
    const { w } = montarApp({ pedidos, preferencias: { aba: 'historico' } })
    expect(cards(w)).toHaveLength(60)
    expect(w.text()).toContain('Mostrando os últimos 60 de 65.')
  })

  it.each([
    ['segurando', 'Nenhuma peça com você'],
    ['enviar', 'Nada pra enviar'],
    ['historico', 'Histórico vazio'],
  ])('aba %s vazia explica o que aparece ali', async (aba, texto) => {
    const { w } = montarApp()
    await abrirAba(w, aba)
    expect(w.text()).toContain(texto)
  })

  it('o prazo "1 hora" aparece com esse nome no seletor', () => {
    const { w } = montarApp()
    expect(w.findAll('[data-testid="prazo"] option').map((o) => o.text())).toEqual(['15 min', '20 min', '30 min', '45 min', '1 hora'])
  })

  it('para o cronômetro ao fechar o app', async () => {
    const { w } = montarApp()
    const limpar = vi.spyOn(globalThis, 'clearInterval')
    w.unmount()
    montados = []
    expect(limpar).toHaveBeenCalled()
  })
})
