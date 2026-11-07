import { expect } from '@playwright/test'

// Horário fixo usado pelos testes que controlam o relógio
export const INICIO = new Date('2026-11-07T10:00:00-03:00')

export const aba = (page, nome) => page.getByRole('tab', { name: new RegExp(nome) })
export const cards = (page) => page.getByTestId('card-pedido')
export const tituloAviso = (page) => page.getByTestId('aviso-titulo')

// Registra um pedido pelo formulário, como a lojista faria
export async function novoPedido(page, { cliente = '@ana.souza', peca = 'Blusa ciganinha', tam = 'M', cor = 'rosa', canal, jaPeguei = false } = {}) {
  const botao = page.getByTestId('novo-pedido')
  if (await botao.isVisible()) await botao.click()
  await page.getByTestId('cliente').fill(cliente)
  if (canal) await page.getByRole('button', { name: canal, exact: true }).click()
  await page.getByTestId('peca').fill(peca)
  const chip = page.locator(`[data-tam="${tam}"]`)
  if ((await chip.getAttribute('aria-pressed')) !== 'true') await chip.click()
  await page.getByTestId('cor').fill(cor)
  if (jaPeguei) await page.getByTestId('ja-peguei').check()
  await page.getByTestId('adicionar').click()
}

// Separa a peça do primeiro pedido em Conferir e vai para a aba Segurando
export async function separarPrimeiro(page) {
  await cards(page).first().getByRole('button', { name: 'Peguei, tá comigo' }).click()
  await expect(tituloAviso(page)).toHaveText('Peça separada. Mande pra cliente:')
  await aba(page, 'Segurando').click()
}
