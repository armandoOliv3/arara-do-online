import { computed, reactive, ref } from 'vue'
import { aplicarAcao, contarPorAba, criarPedido } from '../regras/pedidos'
import { criarArmazenamento } from '../regras/armazenamento'

const AVISO_ERRO = {
  cheio: 'O espaço do navegador encheu. Apague alguns pedidos do Histórico.',
  indisponivel: 'Não consegui salvar neste navegador. Os pedidos podem sumir ao fechar a página.',
}

// Estado do app: lista de pedidos, preferências e as ações sobre eles.
export function usePedidos({ armazenamento = criarArmazenamento(), relogio = () => Date.now() } = {}) {
  const pedidos = ref(armazenamento.carregarPedidos())
  const preferencias = reactive(armazenamento.carregarPreferencias())
  const erroAoSalvar = ref('')
  const agora = ref(relogio())

  function persistir() {
    const r = armazenamento.salvarPedidos(pedidos.value)
    erroAoSalvar.value = r.ok ? '' : AVISO_ERRO[r.erro]
    return r
  }

  function substituir(atualizado) {
    pedidos.value = pedidos.value.map((p) => (p.id === atualizado.id ? atualizado : p))
    persistir()
  }

  const buscar = (id) => pedidos.value.find((p) => p.id === id)

  function adicionar(dados) {
    const pedido = criarPedido({ ...dados, prazoMin: preferencias.prazo }, relogio())
    pedidos.value = [...pedidos.value, pedido]
    persistir()
    return pedido
  }

  // Executa uma ação e devolve o pedido antes e depois (o "antes" serve pro Desfazer)
  function executar(id, acao) {
    const anterior = buscar(id)
    if (!anterior) return null
    const atualizado = aplicarAcao(anterior, acao, relogio(), { prazoMin: preferencias.prazo })
    substituir(atualizado)
    return { anterior, atualizado }
  }

  function desfazer(anterior) {
    if (buscar(anterior.id)) substituir(anterior)
    else {
      pedidos.value = [...pedidos.value, anterior]
      persistir()
    }
  }

  function apagar(id) {
    pedidos.value = pedidos.value.filter((p) => p.id !== id)
    persistir()
  }

  function salvarPreferencias(mudancas) {
    Object.assign(preferencias, mudancas)
    armazenamento.salvarPreferencias({ ...preferencias })
  }

  const atualizarRelogio = () => {
    agora.value = relogio()
  }

  const contagens = computed(() => contarPorAba(pedidos.value, preferencias.prazo, agora.value))

  return {
    pedidos,
    preferencias,
    erroAoSalvar,
    agora,
    contagens,
    buscar,
    adicionar,
    executar,
    desfazer,
    apagar,
    salvarPreferencias,
    atualizarRelogio,
  }
}
