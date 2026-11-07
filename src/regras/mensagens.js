import { PRAZO_PADRAO_MIN } from './pedidos'

// "@ana.souza" continua "@ana.souza"; "Ana Souza" vira "Ana"
export function nomeCliente(cliente) {
  const c = String(cliente ?? '').trim()
  if (!c) return ''
  return c.startsWith('@') ? c : c.split(/\s+/)[0]
}

const tamanhoVisivel = (tam) => (tam && tam !== 'Único' ? tam : '')

// Texto usado nas mensagens: "Blusa ciganinha, tam. M, rosa"
export function descricaoPeca(p) {
  const tam = tamanhoVisivel(p.tam)
  return [p.peca, tam ? `tam. ${tam}` : '', p.cor].filter(Boolean).join(', ')
}

// Texto curto usado nos avisos: "Blusa ciganinha M rosa"
export function resumoPeca(p) {
  return [p.peca, tamanhoVisivel(p.tam), p.cor].filter(Boolean).join(' ')
}

export const mensagens = {
  separei: (p, prazoPadraoMin = PRAZO_PADRAO_MIN) =>
    `Oi, ${nomeCliente(p.cliente)}! Separei pra você: ${descricaoPeca(p)} 💕 ` +
    `A reserva vale por ${p.prazoMin || prazoPadraoMin} minutos. Assim que fizer o pagamento, me manda o comprovante?`,
  naoTem: (p) =>
    `Oi, ${nomeCliente(p.cliente)}! Infelizmente acabou: ${descricaoPeca(p)} 😕 ` +
    `Quer que eu veja outro tamanho ou outra cor pra você?`,
  cobrar: (p) =>
    `Oi, ${nomeCliente(p.cliente)}! Tudo certo com o pagamento? Sua peça (${descricaoPeca(p)}) ` +
    `está separada aqui, mas só consigo segurar mais um pouquinho.`,
  pago: (p) => `Pagamento recebido, ${nomeCliente(p.cliente)}! Obrigada 💕 Já vou preparar o envio.`,
}
