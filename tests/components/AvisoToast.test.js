import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import AvisoToast from '../../src/components/AvisoToast.vue'

const montar = (aviso) => mount(AvisoToast, { props: { aviso }, attachTo: document.body })

function mockClipboard(writeText) {
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
}

describe('Aviso com mensagem e desfazer', () => {
  afterEach(() => {
    delete navigator.clipboard
    document.body.innerHTML = ''
  })

  it('sem aviso, não mostra nada', () => {
    expect(montar(null).find('[data-testid="aviso"]').exists()).toBe(false)
  })

  it('aviso simples mostra só o título, sem botões', () => {
    const w = montar({ titulo: 'Marcado como enviado.' })
    expect(w.get('[data-testid="aviso-titulo"]').text()).toBe('Marcado como enviado.')
    expect(w.find('[data-testid="aviso-mensagem"]').exists()).toBe(false)
    expect(w.find('.actions').exists()).toBe(false)
  })

  it('mostra a mensagem pra cliente em um campo editável', async () => {
    const w = montar({ titulo: 'Peça separada', mensagem: 'Oi, Ana!' })
    const campo = w.get('[data-testid="aviso-mensagem"]')
    expect(campo.element.value).toBe('Oi, Ana!')
    await campo.setValue('Oi, Ana! Tudo bem?')
    expect(campo.element.value).toBe('Oi, Ana! Tudo bem?')
  })

  it('copia a mensagem (já editada) e confirma no botão', async () => {
    const writeText = vi.fn().mockResolvedValue()
    mockClipboard(writeText)
    const w = montar({ titulo: 'Peça separada', mensagem: 'Oi, Ana!' })
    await w.get('[data-testid="aviso-mensagem"]').setValue('Oi, Ana! 💕')
    await w.get('[data-testid="copiar"]').trigger('click')
    await flushPromises()
    expect(writeText).toHaveBeenCalledWith('Oi, Ana! 💕')
    expect(w.get('[data-testid="copiar"]').text()).toBe('Copiado ✓')
  })

  it('sem permissão de copiar: seleciona o texto para copiar na mão', async () => {
    mockClipboard(vi.fn().mockRejectedValue(new Error('negado')))
    const w = montar({ titulo: 'Peça separada', mensagem: 'Oi, Ana!' })
    await w.get('[data-testid="copiar"]').trigger('click')
    await flushPromises()
    const campo = w.get('[data-testid="aviso-mensagem"]').element
    expect(w.get('[data-testid="copiar"]').text()).toBe('Texto selecionado: copie')
    expect(document.activeElement).toBe(campo)
    expect(campo.selectionEnd - campo.selectionStart).toBe('Oi, Ana!'.length)
  })

  it('um aviso novo volta o botão para "Copiar mensagem" e troca o texto', async () => {
    mockClipboard(vi.fn().mockResolvedValue())
    const w = montar({ titulo: 'A', mensagem: 'primeira' })
    await w.get('[data-testid="copiar"]').trigger('click')
    await flushPromises()
    await w.setProps({ aviso: { titulo: 'B', mensagem: 'segunda' } })
    expect(w.get('[data-testid="copiar"]').text()).toBe('Copiar mensagem')
    expect(w.get('[data-testid="aviso-mensagem"]').element.value).toBe('segunda')
  })

  it('mostra Desfazer quando a ação pode ser desfeita e avisa ao tocar', async () => {
    const w = montar({ titulo: 'Pedido apagado.', podeDesfazer: true })
    await w.get('[data-testid="desfazer"]').trigger('click')
    expect(w.emitted('desfazer')).toHaveLength(1)
    expect(w.find('[data-testid="copiar"]').exists()).toBe(false)
  })

  it('o × avisa para fechar', async () => {
    const w = montar({ titulo: 'Oi' })
    await w.get('[aria-label="Fechar"]').trigger('click')
    expect(w.emitted('fechar')).toHaveLength(1)
  })
})
