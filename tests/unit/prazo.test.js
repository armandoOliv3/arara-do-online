import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PRAZO_PADRAO_MIN, estadoPrazo } from '../../src/regras/pedidos'
import { INICIO, MIN, umPedido } from '../ajudantes'

// Peça separada no INICIO, com o prazo informado
const separada = (prazoMin) => umPedido({ status: 'segurando', seguradoEm: INICIO, prazoMin })

describe('Prazo de pagamento da peça separada', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(INICIO)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('começa em 0 minutos, no nível ok e com a barra vazia', () => {
    expect(estadoPrazo(separada(30))).toEqual({ minutos: 0, prazo: 30, nivel: 'ok', percentual: 0 })
  })

  it('conta o tempo pelo relógio do aparelho quando nenhum horário é passado', () => {
    vi.advanceTimersByTime(12 * MIN)
    expect(estadoPrazo(separada(30)).minutos).toBe(12)
  })

  it('arredonda para baixo: 59 segundos ainda são 0 minutos', () => {
    vi.advanceTimersByTime(59 * 1000)
    expect(estadoPrazo(separada(30)).minutos).toBe(0)
  })

  // Limites de 2/3 (atenção) e 100% (vencido) para cada prazo disponível
  describe.each([
    { prazo: 15, atencao: 10 },
    { prazo: 30, atencao: 20 },
    { prazo: 45, atencao: 30 },
    { prazo: 60, atencao: 40 },
  ])('prazo de $prazo min', ({ prazo, atencao }) => {
    it(`continua ok com ${atencao - 1} min`, () => {
      vi.advanceTimersByTime((atencao - 1) * MIN)
      expect(estadoPrazo(separada(prazo)).nivel).toBe('ok')
    })

    it(`entra em atenção com ${atencao} min (2/3 do prazo)`, () => {
      vi.advanceTimersByTime(atencao * MIN)
      expect(estadoPrazo(separada(prazo)).nivel).toBe('atencao')
    })

    it(`continua em atenção com ${prazo - 1} min`, () => {
      vi.advanceTimersByTime((prazo - 1) * MIN)
      expect(estadoPrazo(separada(prazo)).nivel).toBe('atencao')
    })

    it(`vence com exatamente ${prazo} min`, () => {
      vi.advanceTimersByTime(prazo * MIN)
      const estado = estadoPrazo(separada(prazo))
      expect(estado.nivel).toBe('vencido')
      expect(estado.percentual).toBe(100)
    })
  })

  it('prazo de 20 min: 2/3 é 13,3 min, então 13 min ainda é ok e 14 min é atenção', () => {
    vi.advanceTimersByTime(13 * MIN)
    expect(estadoPrazo(separada(20)).nivel).toBe('ok')
    vi.advanceTimersByTime(1 * MIN)
    expect(estadoPrazo(separada(20)).nivel).toBe('atencao')
  })

  it('a barra fica limitada a 100% mesmo muito depois do prazo', () => {
    vi.advanceTimersByTime(5 * 60 * MIN)
    const estado = estadoPrazo(separada(30))
    expect(estado.minutos).toBe(300)
    expect(estado.percentual).toBe(100)
  })

  it('calcula o percentual da barra proporcional ao prazo', () => {
    vi.advanceTimersByTime(15 * MIN)
    expect(estadoPrazo(separada(60)).percentual).toBe(25)
  })

  it('relógio do celular voltando no tempo não gera minutos negativos', () => {
    vi.setSystemTime(INICIO - 10 * MIN)
    const estado = estadoPrazo(separada(30))
    expect(estado.minutos).toBe(0)
    expect(estado.nivel).toBe('ok')
    expect(estado.percentual).toBe(0)
  })

  it('usa o prazo gravado na peça, mesmo que o prazo padrão mude depois (bug #2)', () => {
    vi.advanceTimersByTime(20 * MIN)
    // A cliente recebeu "vale por 30 minutos"; a lojista mudou o padrão para 15
    const estado = estadoPrazo(separada(30), 15)
    expect(estado.prazo).toBe(30)
    expect(estado.nivel).toBe('atencao')
  })

  it('peça antiga, sem prazo gravado, usa o prazo padrão informado', () => {
    vi.advanceTimersByTime(20 * MIN)
    const antiga = umPedido({ status: 'segurando', seguradoEm: INICIO })
    expect(estadoPrazo(antiga, 20).nivel).toBe('vencido')
  })

  it(`sem prazo gravado nem padrão válido, usa ${PRAZO_PADRAO_MIN} min`, () => {
    const antiga = umPedido({ status: 'segurando', seguradoEm: INICIO })
    expect(estadoPrazo(antiga, 0).prazo).toBe(PRAZO_PADRAO_MIN)
    expect(estadoPrazo(antiga, 'abc').prazo).toBe(PRAZO_PADRAO_MIN)
  })

  it('sem horário de separação, conta a partir da criação do pedido', () => {
    vi.advanceTimersByTime(25 * MIN)
    const semSeparacao = umPedido({ status: 'segurando', prazoMin: 30 })
    expect(estadoPrazo(semSeparacao).minutos).toBe(25)
  })

  it('aceita o horário atual por parâmetro, sem depender do relógio', () => {
    vi.useRealTimers()
    expect(estadoPrazo(separada(30), 30, INICIO + 31 * MIN).nivel).toBe('vencido')
  })
})
