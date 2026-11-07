<script setup>
import { ABAS } from '../regras/pedidos'

defineProps({
  abaAtual: { type: String, required: true },
  contagens: { type: Object, required: true },
})
defineEmits(['trocar'])
</script>

<template>
  <nav class="tabs" role="tablist" aria-label="Situação dos pedidos">
    <button
      v-for="aba in ABAS"
      :key="aba.id"
      type="button"
      role="tab"
      class="tab"
      :class="{ 'has-late': aba.id === 'segurando' && contagens.vencidos > 0 }"
      :data-aba="aba.id"
      :aria-selected="String(abaAtual === aba.id)"
      @click="$emit('trocar', aba.id)"
    >
      <b>{{ aba.id === 'historico' ? '↺' : contagens[aba.id] }}</b>
      <span>
        {{ aba.rotulo }}
        <i v-if="aba.id === 'segurando' && contagens.vencidos > 0" class="dot" aria-label="prazo vencido"></i>
      </span>
    </button>
  </nav>
</template>
