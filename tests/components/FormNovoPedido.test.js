import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import FormNovoPedido from '../../src/components/FormNovoPedido.vue'

const montar = (props = {}) => mount(FormNovoPedido, { props, attachTo: document.body })

async function preencher(w, { cliente = '@ana', peca = 'Blusa', cor = '', obs = '' } = {}) {
  await w.get('[data-testid="cliente"]').setValue(cliente)
  await w.get('[data-testid="peca"]').setValue(peca)
  if (cor) await w.get('[data-testid="cor"]').setValue(cor)
  if (obs) await w.get('[data-testid="obs"]').setValue(obs)
}

describe('Formulário de novo pedido', () => {
  it('envia os dados preenchidos, com tamanho M e canal padrão', async () => {
    const w = montar()
    await preencher(w, { cliente: '@ana.souza', peca: 'Blusa ciganinha', cor: 'rosa', obs: 'presente' })
    await w.get('form').trigger('submit')
    expect(w.emitted('adicionar')[0][0]).toEqual({
      cliente: '@ana.souza',
      canal: 'insta',
      peca: 'Blusa ciganinha',
      tam: 'M',
      cor: 'rosa',
      obs: 'presente',
      jaPeguei: false,
    })
    w.unmount()
  })

  it.each([
    ['sem cliente', { cliente: '' }],
    ['cliente só com espaços', { cliente: '   ' }],
    ['sem peça', { peca: '' }],
  ])('não envia %s e mostra o erro', async (_, campos) => {
    const w = montar()
    await preencher(w, campos)
    await w.get('form').trigger('submit')
    expect(w.emitted('adicionar')).toBeUndefined()
    expect(w.get('[role="alert"]').text()).toBe('Preencha a cliente e a peça.')
    w.unmount()
  })

  it('o erro some quando o pedido é enviado certo', async () => {
    const w = montar()
    await w.get('form').trigger('submit')
    expect(w.find('[role="alert"]').exists()).toBe(true)
    await preencher(w)
    await w.get('form').trigger('submit')
    expect(w.find('[role="alert"]').exists()).toBe(false)
    w.unmount()
  })

  it('depois de adicionar, limpa cliente e observação, mas mantém peça, cor e tamanho', async () => {
    const w = montar()
    await preencher(w, { cliente: '@ana', peca: 'Saia midi', cor: 'azul', obs: 'urgente' })
    await w.get('[data-tam="G"]').trigger('click')
    await w.get('[data-testid="ja-peguei"]').setValue(true)
    await w.get('form').trigger('submit')
    expect(w.get('[data-testid="cliente"]').element.value).toBe('')
    expect(w.get('[data-testid="obs"]').element.value).toBe('')
    expect(w.get('[data-testid="ja-peguei"]').element.checked).toBe(false)
    expect(w.get('[data-testid="peca"]').element.value).toBe('Saia midi')
    expect(w.get('[data-testid="cor"]').element.value).toBe('azul')
    expect(w.get('[data-tam="G"]').attributes('aria-pressed')).toBe('true')
    expect(document.activeElement).toBe(w.get('[data-testid="cliente"]').element)
    w.unmount()
  })

  it('escolher tamanho marca o chip; tocar de novo desmarca (peça sem tamanho)', async () => {
    const w = montar()
    await w.get('[data-tam="GG"]').trigger('click')
    expect(w.get('[data-tam="GG"]').attributes('aria-pressed')).toBe('true')
    expect(w.get('[data-tam="M"]').attributes('aria-pressed')).toBe('false')
    await w.get('[data-tam="GG"]').trigger('click')
    expect(w.findAll('[data-tam][aria-pressed="true"]')).toHaveLength(0)
    await preencher(w)
    await w.get('form').trigger('submit')
    expect(w.emitted('adicionar')[0][0].tam).toBe('')
    w.unmount()
  })

  it('mostra os seis tamanhos', () => {
    const w = montar()
    expect(w.findAll('[data-tam]').map((b) => b.text())).toEqual(['PP', 'P', 'M', 'G', 'GG', 'Único'])
    w.unmount()
  })

  it('começa com o canal padrão recebido', () => {
    const w = montar({ canalPadrao: 'whats' })
    expect(w.get('[data-canal="whats"]').attributes('aria-pressed')).toBe('true')
    expect(w.get('[data-canal="insta"]').attributes('aria-pressed')).toBe('false')
    w.unmount()
  })

  it('trocar o canal marca o chip e avisa para salvar a preferência', async () => {
    const w = montar()
    await w.get('[data-canal="whats"]').trigger('click')
    expect(w.get('[data-canal="whats"]').attributes('aria-pressed')).toBe('true')
    expect(w.emitted('trocar-canal')).toEqual([['whats']])
    await preencher(w)
    await w.get('form').trigger('submit')
    expect(w.emitted('adicionar')[0][0].canal).toBe('whats')
    w.unmount()
  })

  it('"Já peguei a peça" vai junto no pedido', async () => {
    const w = montar()
    await preencher(w)
    await w.get('[data-testid="ja-peguei"]').setValue(true)
    await w.get('form').trigger('submit')
    expect(w.emitted('adicionar')[0][0].jaPeguei).toBe(true)
    w.unmount()
  })

  it('sugere peças e cores já usadas', () => {
    const w = montar({ sugestoesPecas: ['Blusa', 'Saia'], sugestoesCores: ['rosa'] })
    expect(w.findAll('#pecasList option').map((o) => o.attributes('value'))).toEqual(['Blusa', 'Saia'])
    expect(w.findAll('#coresList option').map((o) => o.attributes('value'))).toEqual(['rosa'])
    w.unmount()
  })

  it('tem título "Novo pedido" e o botão Minimizar avisa para recolher o formulário', async () => {
    const w = montar()
    expect(w.get('#tituloNovoPedido').text()).toBe('Novo pedido')
    const minimizar = w.get('[data-testid="minimizar"]')
    expect(minimizar.attributes('aria-controls')).toBe('formNovoPedido')
    await minimizar.trigger('click')
    expect(w.emitted('fechar')).toHaveLength(1)
    expect(w.emitted('adicionar')).toBeUndefined()
    w.unmount()
  })
})
