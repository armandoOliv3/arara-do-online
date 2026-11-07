<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import AbasStatus from './components/AbasStatus.vue'
import FormNovoPedido from './components/FormNovoPedido.vue'
import CardPedido from './components/CardPedido.vue'
import AvisoToast from './components/AvisoToast.vue'
import { usePedidos } from './composables/usePedidos'
import { PRAZOS_MIN, agruparPorPeca, estadoPrazo, pedidosDaAba } from './regras/pedidos'
import { mensagens, resumoPeca } from './regras/mensagens'

const props = defineProps({
  // Permite os testes injetarem um armazenamento e um relógio falsos
  opcoes: { type: Object, default: () => ({}) },
})

const estado = usePedidos(props.opcoes)
const { preferencias, contagens, erroAoSalvar } = estado

const formAberto = ref(false)
const aviso = ref(null)
const confirmandoExclusao = ref(null)
let desfazerPendente = null
let timerAviso = null
let timerRelogio = null

const LIMITE_HISTORICO = 60

const lista = computed(() => pedidosDaAba(estado.pedidos.value, preferencias.aba))
const gruposConferir = computed(() => agruparPorPeca(lista.value))
const prazoDe = (p) => estadoPrazo(p, preferencias.prazo, estado.agora.value)
const vencidos = computed(() => lista.value.filter((p) => prazoDe(p).nivel === 'vencido').length)
const unicos = (campo) => [...new Set(estado.pedidos.value.map((p) => (p[campo] || '').trim()).filter(Boolean))].slice(-40)

function mostrarAviso(titulo, { mensagem = '', desfazer = null } = {}) {
  clearTimeout(timerAviso)
  desfazerPendente = desfazer
  aviso.value = { titulo, mensagem, podeDesfazer: Boolean(desfazer) }
  if (!mensagem) timerAviso = setTimeout(fecharAviso, 6000)
}
function fecharAviso() {
  clearTimeout(timerAviso)
  aviso.value = null
  desfazerPendente = null
}
function desfazer() {
  if (desfazerPendente) desfazerPendente()
  fecharAviso()
}

function trocarAba(id) {
  confirmandoExclusao.value = null
  estado.salvarPreferencias({ aba: id })
}

function adicionar(dados) {
  const p = estado.adicionar(dados)
  if (dados.jaPeguei) mostrarAviso('Adicionado em Segurando. Mande pra cliente:', { mensagem: mensagens.separei(p) })
  else mostrarAviso(`Adicionado em Conferir: ${resumoPeca(p)}`)
}

const TEXTOS_ACAO = {
  pegar: { titulo: 'Peça separada. Mande pra cliente:', mensagem: (p) => mensagens.separei(p, preferencias.prazo) },
  naoTem: { titulo: 'Marcado como sem estoque. Avise a cliente:', mensagem: mensagens.naoTem },
  pagar: { titulo: 'Pago! Foi pra lista Enviar.', mensagem: mensagens.pago },
  devolver: { titulo: 'Pode devolver a peça pra frente da loja.' },
  enviar: { titulo: 'Marcado como enviado.' },
  voltarSegurando: { titulo: 'Voltou pra Segurando.' },
  reabrir: { titulo: 'Reaberto em Conferir.' },
}

function executar(pedido, acao) {
  if (acao === 'cobrar') {
    mostrarAviso('Mensagem pra cobrar:', { mensagem: mensagens.cobrar(pedido) })
    return
  }
  if (acao === 'apagar') {
    if (confirmandoExclusao.value === pedido.id) {
      confirmandoExclusao.value = null
      estado.apagar(pedido.id)
      mostrarAviso('Pedido apagado.', { desfazer: () => estado.desfazer(pedido) })
    } else {
      confirmandoExclusao.value = pedido.id
    }
    return
  }
  const r = estado.executar(pedido.id, acao)
  if (!r) return
  const textos = TEXTOS_ACAO[acao]
  mostrarAviso(textos.titulo, {
    mensagem: textos.mensagem ? textos.mensagem(r.atualizado) : '',
    desfazer: () => estado.desfazer(r.anterior),
  })
}

onMounted(() => {
  timerRelogio = setInterval(estado.atualizarRelogio, 30000)
})
onBeforeUnmount(() => {
  clearInterval(timerRelogio)
  clearTimeout(timerAviso)
})
</script>

<template>
  <div class="wrap">
    <header>
      <div class="brand">
        <h1>Arara do Online</h1>
        <label class="prazo" for="prazoSel">
          Prazo pra pagar
          <select
            id="prazoSel"
            data-testid="prazo"
            :value="preferencias.prazo"
            @change="estado.salvarPreferencias({ prazo: Number($event.target.value) })"
          >
            <option v-for="m in PRAZOS_MIN" :key="m" :value="m">{{ m === 60 ? '1 hora' : `${m} min` }}</option>
          </select>
        </label>
      </div>
      <AbasStatus :aba-atual="preferencias.aba" :contagens="contagens" @trocar="trocarAba" />
    </header>

    <!-- Novo pedido: só na aba Conferir. Usa v-show (e não v-if) para o rascunho
         não se perder ao minimizar ou ao trocar de aba. -->
    <div v-show="preferencias.aba === 'conferir'" data-testid="area-novo-pedido">
      <button
        v-show="!formAberto"
        type="button"
        class="btn primary new-toggle"
        data-testid="novo-pedido"
        aria-controls="formNovoPedido"
        :aria-expanded="String(formAberto)"
        @click="formAberto = true"
      >
        + Novo pedido
      </button>
      <FormNovoPedido
        v-show="formAberto"
        :canal-padrao="preferencias.canal"
        :sugestoes-pecas="unicos('peca')"
        :sugestoes-cores="unicos('cor')"
        @adicionar="adicionar"
        @fechar="formAberto = false"
        @trocar-canal="(canal) => estado.salvarPreferencias({ canal })"
      />
    </div>

    <main data-testid="lista">
      <div v-if="erroAoSalvar" class="banner" role="alert">{{ erroAoSalvar }}</div>

      <!-- Conferir -->
      <template v-if="preferencias.aba === 'conferir'">
        <div v-if="!lista.length" class="empty">
          <strong>Nada pra conferir</strong>
          <span>Quando uma cliente perguntar se tem, toque em “+ Novo pedido”. Depois confira tudo de uma vez na arara.</span>
        </div>
        <template v-else>
          <p class="hint">Agrupado por peça: uma ida à arara resolve todos os pedidos da mesma peça.</p>
          <section v-for="g in gruposConferir" :key="g.chave" class="group">
            <h2>{{ g.nome }} <small>{{ g.itens.length }} {{ g.itens.length > 1 ? 'pedidos' : 'pedido' }}</small></h2>
            <CardPedido v-for="p in g.itens" :key="p.id" :pedido="p" aba="conferir" :mostrar-peca="false" @acao="(a) => executar(p, a)" />
          </section>
        </template>
      </template>

      <!-- Segurando -->
      <template v-else-if="preferencias.aba === 'segurando'">
        <div v-if="!lista.length" class="empty">
          <strong>Nenhuma peça com você</strong>
          <span>Peças que você pegou na arara aparecem aqui com o tempo correndo até o prazo de pagamento.</span>
        </div>
        <template v-else>
          <p v-if="vencidos" class="hint">
            <strong style="color: var(--late)">{{ vencidos }} {{ vencidos > 1 ? 'peças passaram' : 'peça passou' }} do prazo.</strong>
            Cobre a cliente ou devolva pra loja.
          </p>
          <p v-else class="hint">Cada peça tem o prazo que valia quando foi separada.</p>
          <CardPedido v-for="p in lista" :key="p.id" :pedido="p" aba="segurando" :prazo="prazoDe(p)" @acao="(a) => executar(p, a)" />
        </template>
      </template>

      <!-- Enviar -->
      <template v-else-if="preferencias.aba === 'enviar'">
        <div v-if="!lista.length" class="empty">
          <strong>Nada pra enviar</strong>
          <span>Quando a cliente pagar, a peça vem pra cá até você despachar.</span>
        </div>
        <CardPedido v-for="p in lista" v-else :key="p.id" :pedido="p" aba="enviar" @acao="(a) => executar(p, a)" />
      </template>

      <!-- Histórico -->
      <template v-else>
        <div v-if="!lista.length" class="empty">
          <strong>Histórico vazio</strong>
          <span>Pedidos enviados, devolvidos ou sem estoque ficam aqui.</span>
        </div>
        <template v-else>
          <p class="hint">
            Mostrando os últimos {{ lista.length > LIMITE_HISTORICO ? `${LIMITE_HISTORICO} de ${lista.length}` : lista.length }}.
            “Reabrir” manda de volta pra Conferir.
          </p>
          <CardPedido
            v-for="p in lista.slice(0, LIMITE_HISTORICO)"
            :key="p.id"
            :pedido="p"
            aba="historico"
            :confirmando-exclusao="confirmandoExclusao === p.id"
            @acao="(a) => executar(p, a)"
          />
        </template>
      </template>
    </main>

    <footer>Pedidos salvos neste aparelho e navegador. Use sempre o mesmo celular.</footer>
  </div>

  <AvisoToast :aviso="aviso" @fechar="fecharAviso" @desfazer="desfazer" />
</template>
