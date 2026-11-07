import { ABAS, PRAZOS_MIN, PRAZO_PADRAO_MIN } from './pedidos'

export const CHAVE_PEDIDOS = 'arara-online-itens-v1'
export const CHAVE_PREFERENCIAS = 'arara-online-prefs-v1'

export const PREFERENCIAS_PADRAO = Object.freeze({ aba: 'conferir', prazo: PRAZO_PADRAO_MIN, canal: 'insta' })

const ehCheio = (e) => e && (e.name === 'QuotaExceededError' || e.code === 22)

// Guarda os pedidos no navegador (localStorage). Recebe o "storage" por
// parâmetro para os testes poderem simular navegador cheio ou bloqueado.
export function criarArmazenamento(obterStorage = () => globalThis.localStorage) {
  const storage = () => {
    try {
      return obterStorage() ?? null
    } catch {
      return null
    }
  }

  function ler(chave) {
    try {
      const bruto = storage()?.getItem(chave)
      return bruto ? JSON.parse(bruto) : null
    } catch {
      return null
    }
  }

  function gravar(chave, valor) {
    const s = storage()
    if (!s) return { ok: false, erro: 'indisponivel' }
    try {
      s.setItem(chave, JSON.stringify(valor))
      return { ok: true }
    } catch (e) {
      return { ok: false, erro: ehCheio(e) ? 'cheio' : 'indisponivel' }
    }
  }

  return {
    carregarPedidos() {
      const lista = ler(CHAVE_PEDIDOS)
      if (!Array.isArray(lista)) return []
      return lista.filter((p) => p && typeof p.id === 'string' && p.status)
    },
    salvarPedidos(pedidos) {
      return gravar(CHAVE_PEDIDOS, pedidos)
    },
    carregarPreferencias() {
      const salvas = ler(CHAVE_PREFERENCIAS) ?? {}
      return {
        aba: ABAS.some((a) => a.id === salvas.aba) ? salvas.aba : PREFERENCIAS_PADRAO.aba,
        prazo: PRAZOS_MIN.includes(Number(salvas.prazo)) ? Number(salvas.prazo) : PREFERENCIAS_PADRAO.prazo,
        canal: salvas.canal === 'whats' ? 'whats' : 'insta',
      }
    },
    salvarPreferencias(preferencias) {
      return gravar(CHAVE_PREFERENCIAS, preferencias)
    },
  }
}
