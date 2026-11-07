<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  // { titulo, mensagem?, podeDesfazer? }
  aviso: { type: Object, default: null },
})
const emit = defineEmits(['fechar', 'desfazer'])

const texto = ref('')
const rotuloCopiar = ref('Copiar mensagem')
const campo = ref(null)

watch(
  () => props.aviso,
  (a) => {
    texto.value = a?.mensagem ?? ''
    rotuloCopiar.value = 'Copiar mensagem'
  },
  { immediate: true },
)

async function copiar() {
  try {
    await navigator.clipboard.writeText(texto.value)
    rotuloCopiar.value = 'Copiado ✓'
  } catch {
    // Sem permissão de área de transferência: seleciona o texto pra copiar na mão
    campo.value?.focus()
    campo.value?.select()
    rotuloCopiar.value = 'Texto selecionado: copie'
  }
}
</script>

<template>
  <div v-if="aviso" class="toast" role="status" data-testid="aviso">
    <div class="toast-in">
      <div class="toast-head">
        <span data-testid="aviso-titulo">{{ aviso.titulo }}</span>
        <button type="button" class="x" aria-label="Fechar" @click="emit('fechar')">×</button>
      </div>
      <textarea v-if="aviso.mensagem" ref="campo" v-model="texto" aria-label="Mensagem pra cliente" data-testid="aviso-mensagem"></textarea>
      <div v-if="aviso.mensagem || aviso.podeDesfazer" class="actions">
        <button v-if="aviso.mensagem" type="button" class="btn primary" data-testid="copiar" @click="copiar">{{ rotuloCopiar }}</button>
        <button v-if="aviso.podeDesfazer" type="button" class="btn" data-testid="desfazer" @click="emit('desfazer')">Desfazer</button>
      </div>
    </div>
  </div>
</template>
