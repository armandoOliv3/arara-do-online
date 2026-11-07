import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import CardPedido from '../../src/components/CardPedido.vue'
import { umPedido } from '../ajudantes'

const montar = (props) => mount(CardPedido, { props: { pedido: umPedido(), aba: 'conferir', ...props } })
const acoes = (w) => w.findAll('[data-acao]').map((b) => b.attributes('data-acao'))
const prazo = (nivel, minutos = 10) => ({ minutos, prazo: 30, nivel, percentual: Math.min(100, Math.round((minutos / 30) * 100)) })

describe('Card do pedido', () => {
  it('mostra cliente, canal, tamanho, peça e cor', () => {
    const w = montar()
    expect(w.text()).toContain('@ana.souza')
    expect(w.get('.canal').text()).toBe('Insta')
    expect(w.get('[data-testid="descricao"]').text()).toBe('M Blusa ciganinha · rosa')
  })

  it('canal WhatsApp aparece como "Whats"', () => {
    expect(montar({ pedido: umPedido({ canal: 'whats' }) }).get('.canal').text()).toBe('Whats')
  })

  it('em Conferir pode esconder a peça (ela já está no título do grupo)', () => {
    const w = montar({ mostrarPeca: false })
    expect(w.get('[data-testid="descricao"]').text()).toBe('M rosa')
  })

  it('sem tamanho e sem cor mostra só a peça', () => {
    const w = montar({ pedido: umPedido({ tam: '', cor: '' }) })
    expect(w.get('[data-testid="descricao"]').text()).toBe('Blusa ciganinha')
    expect(w.find('.sz').exists()).toBe(false)
  })

  it('mostra a observação quando existe', () => {
    expect(montar({ pedido: umPedido({ obs: 'embrulhar pra presente' }) }).text()).toContain('embrulhar pra presente')
  })

  it('texto da cliente com HTML aparece como texto, sem executar nada', () => {
    const malicioso = '<img src=x onerror="alert(1)"><b>Ana</b>'
    const w = montar({ pedido: umPedido({ cliente: malicioso, obs: '<script>alert(2)</script>' }) })
    expect(w.find('img').exists()).toBe(false)
    expect(w.find('.who b').exists()).toBe(false)
    expect(w.find('script').exists()).toBe(false)
    expect(w.get('.who').text()).toContain(malicioso)
  })

  it.each([
    ['conferir', ['pegar', 'naoTem']],
    ['enviar', ['enviar', 'voltarSegurando']],
    ['historico', ['reabrir', 'apagar']],
  ])('aba %s mostra as ações certas', (aba, esperadas) => {
    expect(acoes(montar({ aba }))).toEqual(esperadas)
  })

  it('cada botão avisa a ação escolhida', async () => {
    const w = montar()
    await w.get('[data-acao="pegar"]').trigger('click')
    await w.get('[data-acao="naoTem"]').trigger('click')
    expect(w.emitted('acao')).toEqual([['pegar'], ['naoTem']])
  })

  describe('aba Segurando', () => {
    it('prazo ok: cronômetro, barra verde e sem botão Cobrar', () => {
      const w = montar({ aba: 'segurando', prazo: prazo('ok', 10) })
      expect(w.get('[data-testid="timer"]').text()).toBe('10 min de 30 min')
      expect(w.classes()).not.toContain('atencao')
      expect(w.get('.bar i').attributes('style')).toContain('width: 33%')
      expect(acoes(w)).toEqual(['pagar', 'devolver'])
    })

    it('prazo em atenção: card amarelo e botão Cobrar', () => {
      const w = montar({ aba: 'segurando', prazo: prazo('atencao', 22) })
      expect(w.classes()).toContain('atencao')
      expect(acoes(w)).toEqual(['pagar', 'devolver', 'cobrar'])
    })

    it('prazo vencido: card vermelho, "passou do prazo" e botão Cobrar', () => {
      const w = montar({ aba: 'segurando', prazo: prazo('vencido', 41) })
      expect(w.classes()).toContain('vencido')
      expect(w.get('[data-testid="timer"]').text()).toBe('41 min passou do prazo')
      expect(w.get('.bar i').attributes('style')).toContain('width: 100%')
      expect(acoes(w)).toContain('cobrar')
    })

    it('sem dados de prazo não mostra cronômetro nem barra', () => {
      const w = montar({ aba: 'segurando' })
      expect(w.find('[data-testid="timer"]').exists()).toBe(false)
      expect(w.find('.bar').exists()).toBe(false)
    })
  })

  describe('datas', () => {
    const hoje = new Date()
    hoje.setHours(9, 30, 0, 0)
    const ontem = new Date(hoje)
    ontem.setDate(hoje.getDate() - 1)
    const antiga = new Date(2026, 0, 15, 14, 5)

    it('Enviar mostra quando a cliente pagou: hoje, ontem ou dia/mês', () => {
      expect(montar({ aba: 'enviar', pedido: umPedido({ status: 'pago', pagoEm: hoje.getTime() }) }).text()).toContain('pagou hoje 09:30')
      expect(montar({ aba: 'enviar', pedido: umPedido({ status: 'pago', pagoEm: ontem.getTime() }) }).text()).toContain('pagou ontem 09:30')
      expect(montar({ aba: 'enviar', pedido: umPedido({ status: 'pago', pagoEm: antiga.getTime() }) }).text()).toContain('pagou 15/01 14:05')
    })

    it('Enviar sem data de pagamento usa a última atualização', () => {
      const w = montar({ aba: 'enviar', pedido: umPedido({ status: 'pago', atualizadoEm: hoje.getTime() }) })
      expect(w.text()).toContain('pagou hoje 09:30')
    })

    it('Conferir mostra o horário de entrada; pedido reaberto mostra o da reabertura', () => {
      const criado = new Date(2026, 10, 7, 8, 15).getTime()
      const reaberto = new Date(2026, 10, 7, 16, 40).getTime()
      expect(montar({ pedido: umPedido({ criadoEm: criado }) }).get('.top .obs').text()).toBe('08:15')
      expect(montar({ pedido: umPedido({ criadoEm: criado, reabertoEm: reaberto }) }).get('.top .obs').text()).toBe('16:40')
    })
  })

  describe('aba Histórico', () => {
    it.each([
      ['enviado', 'Enviado'],
      ['devolvido', 'Devolvido'],
      ['nao_tem', 'Não tinha'],
      ['outro', 'outro'],
    ])('status "%s" aparece como "%s"', (status, rotulo) => {
      const w = montar({ aba: 'historico', pedido: umPedido({ status }) })
      expect(w.get('.state').text()).toBe(rotulo)
    })

    it('apagar pede confirmação com um segundo toque', () => {
      expect(montar({ aba: 'historico' }).get('[data-acao="apagar"]').text()).toBe('Apagar')
      const confirmando = montar({ aba: 'historico', confirmandoExclusao: true })
      expect(confirmando.get('[data-acao="apagar"]').text()).toBe('Toque de novo pra apagar')
      expect(confirmando.get('[data-acao="apagar"]').classes()).toContain('no')
    })
  })
})
