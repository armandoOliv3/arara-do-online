import { describe, expect, it } from 'vitest'
import { descricaoPeca, mensagens, nomeCliente, resumoPeca } from '../../src/regras/mensagens'
import { umPedido } from '../ajudantes'

describe('Nome da cliente nas mensagens', () => {
  it('mantém o @usuário do Instagram', () => {
    expect(nomeCliente('@ana.souza')).toBe('@ana.souza')
  })

  it('usa só o primeiro nome quando é nome completo', () => {
    expect(nomeCliente('Ana Maria Souza')).toBe('Ana')
  })

  it('ignora espaços nas pontas', () => {
    expect(nomeCliente('   Bia   ')).toBe('Bia')
  })

  it.each([undefined, null, '', '   '])('cliente vazia (%s) vira texto vazio', (c) => {
    expect(nomeCliente(c)).toBe('')
  })
})

describe('Descrição da peça', () => {
  it('monta peça, tamanho e cor', () => {
    expect(descricaoPeca(umPedido())).toBe('Blusa ciganinha, tam. M, rosa')
    expect(resumoPeca(umPedido())).toBe('Blusa ciganinha M rosa')
  })

  it('tamanho "Único" não aparece', () => {
    const p = umPedido({ tam: 'Único' })
    expect(descricaoPeca(p)).toBe('Blusa ciganinha, rosa')
    expect(resumoPeca(p)).toBe('Blusa ciganinha rosa')
  })

  it('sem tamanho e sem cor fica só a peça', () => {
    const p = umPedido({ tam: '', cor: '' })
    expect(descricaoPeca(p)).toBe('Blusa ciganinha')
    expect(resumoPeca(p)).toBe('Blusa ciganinha')
  })
})

describe('Mensagens prontas', () => {
  it('"Separei" usa o prazo gravado na peça', () => {
    const texto = mensagens.separei(umPedido({ prazoMin: 45 }), 30)
    expect(texto).toBe(
      'Oi, @ana.souza! Separei pra você: Blusa ciganinha, tam. M, rosa 💕 A reserva vale por 45 minutos. ' +
        'Assim que fizer o pagamento, me manda o comprovante?',
    )
  })

  it('"Separei" usa o prazo padrão quando a peça não tem prazo gravado', () => {
    expect(mensagens.separei(umPedido(), 20)).toContain('vale por 20 minutos')
    expect(mensagens.separei(umPedido())).toContain('vale por 30 minutos')
  })

  it('"Não tem" oferece outro tamanho ou cor', () => {
    expect(mensagens.naoTem(umPedido({ cliente: 'Carla Dias' }))).toBe(
      'Oi, Carla! Infelizmente acabou: Blusa ciganinha, tam. M, rosa 😕 Quer que eu veja outro tamanho ou outra cor pra você?',
    )
  })

  it('"Cobrar" lembra que a peça está separada', () => {
    expect(mensagens.cobrar(umPedido({ tam: 'Único' }))).toBe(
      'Oi, @ana.souza! Tudo certo com o pagamento? Sua peça (Blusa ciganinha, rosa) está separada aqui, ' +
        'mas só consigo segurar mais um pouquinho.',
    )
  })

  it('"Pago" agradece pelo primeiro nome', () => {
    expect(mensagens.pago(umPedido({ cliente: 'Joana Lima' }))).toBe(
      'Pagamento recebido, Joana! Obrigada 💕 Já vou preparar o envio.',
    )
  })
})
