<script setup>
import { reactive, ref } from 'vue'
import { TAMANHOS } from '../regras/pedidos'

const props = defineProps({
  canalPadrao: { type: String, default: 'insta' },
  sugestoesPecas: { type: Array, default: () => [] },
  sugestoesCores: { type: Array, default: () => [] },
})
const emit = defineEmits(['adicionar', 'fechar', 'trocar-canal'])

const form = reactive({ cliente: '', canal: props.canalPadrao, peca: '', tam: 'M', cor: '', obs: '', jaPeguei: false })
const erro = ref('')
const campoCliente = ref(null)

function escolherCanal(canal) {
  form.canal = canal
  emit('trocar-canal', canal)
}

// Tocar de novo no tamanho escolhido desmarca (peça sem tamanho)
function escolherTamanho(tam) {
  form.tam = form.tam === tam ? '' : tam
}

function enviar() {
  if (!form.cliente.trim() || !form.peca.trim()) {
    erro.value = 'Preencha a cliente e a peça.'
    return
  }
  erro.value = ''
  emit('adicionar', { ...form })
  // Mantém peça, cor e tamanho: é comum vários pedidos da mesma peça seguidos
  form.cliente = ''
  form.obs = ''
  form.jaPeguei = false
  campoCliente.value?.focus()
}

defineExpose({ form })
</script>

<template>
  <form class="new" autocomplete="off" novalidate @submit.prevent="enviar">
    <div class="row2">
      <div class="field">
        <label for="fCliente">Cliente</label>
        <input id="fCliente" ref="campoCliente" v-model="form.cliente" data-testid="cliente" placeholder="@ana.souza ou nome" required />
      </div>
      <div class="field">
        <span id="canalLbl" class="lbl">Canal</span>
        <div class="chips" role="group" aria-labelledby="canalLbl">
          <button type="button" class="chip" data-canal="insta" :aria-pressed="String(form.canal === 'insta')" @click="escolherCanal('insta')">Insta</button>
          <button type="button" class="chip" data-canal="whats" :aria-pressed="String(form.canal === 'whats')" @click="escolherCanal('whats')">Whats</button>
        </div>
      </div>
    </div>

    <div class="field">
      <label for="fPeca">Peça</label>
      <input id="fPeca" v-model="form.peca" data-testid="peca" list="pecasList" placeholder="Blusa ciganinha lese" required />
      <datalist id="pecasList">
        <option v-for="p in sugestoesPecas" :key="p" :value="p"></option>
      </datalist>
    </div>

    <div class="field">
      <span id="tamLbl" class="lbl">Tamanho</span>
      <div class="chips" role="group" aria-labelledby="tamLbl">
        <button
          v-for="t in TAMANHOS"
          :key="t"
          type="button"
          class="chip"
          :data-tam="t"
          :aria-pressed="String(form.tam === t)"
          @click="escolherTamanho(t)"
        >
          {{ t }}
        </button>
      </div>
    </div>

    <div class="row2">
      <div class="field">
        <label for="fCor">Cor</label>
        <input id="fCor" v-model="form.cor" data-testid="cor" list="coresList" placeholder="rosa" />
        <datalist id="coresList">
          <option v-for="c in sugestoesCores" :key="c" :value="c"></option>
        </datalist>
      </div>
      <div class="field">
        <label for="fObs">Obs.</label>
        <input id="fObs" v-model="form.obs" data-testid="obs" placeholder="opcional" />
      </div>
    </div>

    <label class="check" for="fJa">
      <input id="fJa" v-model="form.jaPeguei" type="checkbox" data-testid="ja-peguei" />
      Já peguei a peça (vai direto pra Segurando)
    </label>

    <p v-if="erro" class="erro-form" role="alert">{{ erro }}</p>

    <div class="form-actions">
      <button type="button" class="btn ghost" @click="$emit('fechar')">Fechar</button>
      <button type="submit" class="btn primary" data-testid="adicionar">Adicionar</button>
    </div>
  </form>
</template>
