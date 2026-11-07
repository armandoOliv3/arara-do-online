<script setup>
import { computed } from 'vue'

const ROTULO_STATUS = { enviado: 'Enviado', devolvido: 'Devolvido', nao_tem: 'Não tinha' }

const props = defineProps({
  pedido: { type: Object, required: true },
  aba: { type: String, required: true },
  // Só na aba Segurando: { minutos, prazo, nivel, percentual }
  prazo: { type: Object, default: null },
  mostrarPeca: { type: Boolean, default: true },
  confirmandoExclusao: { type: Boolean, default: false },
})
defineEmits(['acao'])

const hora = (t) => new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

function quando(t) {
  const d = new Date(t)
  const hoje = new Date()
  const ontem = new Date(hoje)
  ontem.setDate(hoje.getDate() - 1)
  if (d.toDateString() === hoje.toDateString()) return 'hoje ' + hora(t)
  if (d.toDateString() === ontem.toDateString()) return 'ontem ' + hora(t)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' + hora(t)
}

const classeNivel = computed(() => (props.prazo && props.prazo.nivel !== 'ok' ? props.prazo.nivel : ''))
</script>

<template>
  <article class="tag" :class="classeNivel" :data-id="pedido.id" data-testid="card-pedido">
    <div class="top">
      <div class="who">
        {{ pedido.cliente }}<span class="canal" :class="pedido.canal">{{ pedido.canal === 'whats' ? 'Whats' : 'Insta' }}</span>
      </div>

      <div v-if="aba === 'segurando' && prazo" class="timer" data-testid="timer">
        <b>{{ prazo.minutos }} min</b>{{ ' ' }}<small>{{ prazo.nivel === 'vencido' ? 'passou do prazo' : `de ${prazo.prazo} min` }}</small>
      </div>
      <span v-else-if="aba === 'conferir'" class="obs">{{ hora(pedido.reabertoEm ?? pedido.criadoEm) }}</span>
      <span v-else-if="aba === 'enviar'" class="obs">pagou {{ quando(pedido.pagoEm ?? pedido.atualizadoEm) }}</span>
      <span v-else-if="aba === 'historico'" class="state" :class="pedido.status">{{ ROTULO_STATUS[pedido.status] ?? pedido.status }}</span>
    </div>

    <div class="what" data-testid="descricao">
      <template v-if="pedido.tam"><span class="sz">{{ pedido.tam }}</span>{{ ' ' }}</template>
      <template v-if="mostrarPeca">{{ pedido.peca }}<template v-if="pedido.cor"> · </template></template>{{ pedido.cor }}
    </div>
    <div v-if="pedido.obs" class="obs">{{ pedido.obs }}</div>

    <div v-if="aba === 'segurando' && prazo" class="bar" aria-hidden="true">
      <i :style="{ width: prazo.percentual + '%' }"></i>
    </div>

    <div class="actions">
      <template v-if="aba === 'conferir'">
        <button type="button" class="btn ok" data-acao="pegar" @click="$emit('acao', 'pegar')">Peguei, tá comigo</button>
        <button type="button" class="btn no" data-acao="naoTem" @click="$emit('acao', 'naoTem')">Não tem</button>
      </template>
      <template v-else-if="aba === 'segurando'">
        <button type="button" class="btn ok" data-acao="pagar" @click="$emit('acao', 'pagar')">Pagou</button>
        <button type="button" class="btn" data-acao="devolver" @click="$emit('acao', 'devolver')">Devolver pra loja</button>
        <button v-if="classeNivel" type="button" class="btn" data-acao="cobrar" @click="$emit('acao', 'cobrar')">Cobrar</button>
      </template>
      <template v-else-if="aba === 'enviar'">
        <button type="button" class="btn ok" data-acao="enviar" @click="$emit('acao', 'enviar')">Enviado</button>
        <button type="button" class="btn ghost small" data-acao="voltarSegurando" @click="$emit('acao', 'voltarSegurando')">
          Voltar pra Segurando
        </button>
      </template>
      <template v-else-if="aba === 'historico'">
        <span class="obs" style="flex: 1 1 auto; align-self: center">{{ quando(pedido.atualizadoEm) }}</span>
        <button type="button" class="btn ghost small" data-acao="reabrir" @click="$emit('acao', 'reabrir')">Reabrir</button>
        <button
          type="button"
          class="btn small"
          :class="confirmandoExclusao ? 'no' : 'ghost'"
          data-acao="apagar"
          @click="$emit('acao', 'apagar')"
        >
          {{ confirmandoExclusao ? 'Toque de novo pra apagar' : 'Apagar' }}
        </button>
      </template>
    </div>
  </article>
</template>
