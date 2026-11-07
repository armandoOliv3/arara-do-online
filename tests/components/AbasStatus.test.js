import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AbasStatus from '../../src/components/AbasStatus.vue'

const contagens = { conferir: 3, segurando: 2, enviar: 1, historico: 9, vencidos: 0 }
const montar = (props = {}) => mount(AbasStatus, { props: { abaAtual: 'conferir', contagens, ...props } })
const aba = (w, id) => w.get(`[data-aba="${id}"]`)

describe('Abas de status', () => {
  it('mostra as quatro abas com a contagem; Histórico mostra só o ícone', () => {
    const w = montar()
    expect(w.findAll('[role="tab"]')).toHaveLength(4)
    expect(aba(w, 'conferir').text()).toContain('3')
    expect(aba(w, 'segurando').text()).toContain('2')
    expect(aba(w, 'enviar').text()).toContain('1')
    expect(aba(w, 'historico').text()).toContain('↺')
    expect(aba(w, 'historico').text()).not.toContain('9')
  })

  it('marca a aba atual como selecionada', () => {
    const w = montar({ abaAtual: 'enviar' })
    expect(aba(w, 'enviar').attributes('aria-selected')).toBe('true')
    expect(aba(w, 'conferir').attributes('aria-selected')).toBe('false')
  })

  it('avisa a troca de aba ao tocar', async () => {
    const w = montar()
    await aba(w, 'segurando').trigger('click')
    expect(w.emitted('trocar')).toEqual([['segurando']])
  })

  it('destaca Segurando quando há peça vencida', () => {
    const w = montar({ contagens: { ...contagens, vencidos: 1 } })
    expect(aba(w, 'segurando').classes()).toContain('has-late')
    expect(aba(w, 'segurando').find('[aria-label="prazo vencido"]').exists()).toBe(true)
  })

  it('sem peça vencida, não há destaque', () => {
    const w = montar()
    expect(aba(w, 'segurando').classes()).not.toContain('has-late')
    expect(w.find('[aria-label="prazo vencido"]').exists()).toBe(false)
  })
})
