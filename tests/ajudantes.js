// Utilitários compartilhados pelos testes

export const MIN = 60 * 1000
export const INICIO = new Date('2026-11-07T10:00:00-03:00').getTime()

let contador = 0
export const idFixo = () => `p${++contador}`

// Pedido pronto para os testes, com valores padrão sobrescrevíveis
export function umPedido(campos = {}) {
  return {
    id: `p-${Math.random().toString(36).slice(2, 8)}`,
    cliente: '@ana.souza',
    canal: 'insta',
    peca: 'Blusa ciganinha',
    tam: 'M',
    cor: 'rosa',
    obs: '',
    status: 'conferir',
    criadoEm: INICIO,
    atualizadoEm: INICIO,
    ...campos,
  }
}

// localStorage falso, com opção de simular navegador cheio ou bloqueado
export function storageFalso({ falharCom = null } = {}) {
  const dados = new Map()
  return {
    dados,
    getItem: (k) => (dados.has(k) ? dados.get(k) : null),
    setItem: (k, v) => {
      if (falharCom) throw falharCom
      dados.set(k, String(v))
    },
    removeItem: (k) => dados.delete(k),
  }
}

export function erroDeCotaCheia() {
  const e = new Error('cheio')
  e.name = 'QuotaExceededError'
  return e
}
