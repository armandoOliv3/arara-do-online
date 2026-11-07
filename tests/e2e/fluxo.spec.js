import { expect, test } from '@playwright/test'
import { aba, cards, novoPedido, separarPrimeiro, tituloAviso } from './ajudantes'

test.beforeEach(async ({ page }) => {
  await page.goto('./')
})

test('pedido do início ao fim: conferir, separar, pagar e enviar', async ({ page }) => {
  await expect(page.getByText('Nada pra conferir')).toBeVisible()

  await novoPedido(page)
  await expect(tituloAviso(page)).toHaveText('Adicionado em Conferir: Blusa ciganinha M rosa')
  await expect(aba(page, 'Conferir')).toContainText('1')

  await separarPrimeiro(page)
  await expect(page.getByTestId('timer')).toHaveText('0 min de 30 min')

  await cards(page).first().getByRole('button', { name: 'Pagou' }).click()
  await expect(tituloAviso(page)).toHaveText('Pago! Foi pra lista Enviar.')

  await aba(page, 'Enviar').click()
  await expect(cards(page).first()).toContainText('pagou hoje')
  await cards(page).first().getByRole('button', { name: 'Enviado' }).click()
  await expect(page.getByText('Nada pra enviar')).toBeVisible()

  await aba(page, 'Histórico').click()
  await expect(cards(page).first().locator('.state')).toHaveText('Enviado')
})

test('pedidos da mesma peça ficam agrupados em Conferir', async ({ page }) => {
  await novoPedido(page, { cliente: '@ana', peca: 'Saia midi' })
  await novoPedido(page, { cliente: '@bia', peca: 'saia MIDI' })
  await novoPedido(page, { cliente: '@carla', peca: 'Vestido longo' })

  const grupos = page.locator('.group')
  await expect(grupos).toHaveCount(2)
  await expect(grupos.first().locator('h2')).toContainText('2 pedidos')
})

test('"Não tem" gera a mensagem pra cliente e Desfazer traz o pedido de volta', async ({ page }) => {
  await novoPedido(page, { cliente: 'Carla Dias' })
  await cards(page).first().getByRole('button', { name: 'Não tem' }).click()
  await expect(page.getByTestId('aviso-mensagem')).toHaveValue(/^Oi, Carla! Infelizmente acabou/)
  await expect(page.getByText('Nada pra conferir')).toBeVisible()

  await page.getByTestId('desfazer').click()
  await expect(cards(page)).toHaveCount(1)
})

test('copia a mensagem pronta para mandar à cliente', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await novoPedido(page, { jaPeguei: true })
  await page.getByTestId('copiar').click()
  await expect(page.getByTestId('copiar')).toHaveText('Copiado ✓')
  const copiado = await page.evaluate(() => navigator.clipboard.readText())
  expect(copiado).toContain('Separei pra você: Blusa ciganinha, tam. M, rosa')
})

test('os pedidos continuam lá depois de recarregar a página', async ({ page }) => {
  await novoPedido(page, { cliente: '@joana', canal: 'Whats' })
  await aba(page, 'Segurando').click()
  await page.getByTestId('prazo').selectOption('45')

  await page.reload()

  await expect(aba(page, 'Segurando')).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByTestId('prazo')).toHaveValue('45')
  await aba(page, 'Conferir').click()
  await expect(cards(page).first()).toContainText('@joana')
  await expect(cards(page).first()).toContainText('Whats')
})

test('apagar do Histórico exige dois toques e pode ser desfeito', async ({ page }) => {
  await novoPedido(page)
  await cards(page).first().getByRole('button', { name: 'Não tem' }).click()
  await aba(page, 'Histórico').click()

  const apagar = cards(page).first().getByRole('button', { name: /Apagar|Toque de novo/ })
  await apagar.click()
  await expect(apagar).toHaveText('Toque de novo pra apagar')
  await expect(cards(page)).toHaveCount(1)

  await apagar.click()
  await expect(page.getByText('Histórico vazio')).toBeVisible()
  await page.getByTestId('desfazer').click()
  await expect(cards(page)).toHaveCount(1)
})

test('reabrir manda o pedido do Histórico de volta para Conferir', async ({ page }) => {
  await novoPedido(page)
  await cards(page).first().getByRole('button', { name: 'Não tem' }).click()
  await aba(page, 'Histórico').click()
  await cards(page).first().getByRole('button', { name: 'Reabrir' }).click()
  await aba(page, 'Conferir').click()
  await expect(cards(page)).toHaveCount(1)
})

// Compara com a largura real da tela do aparelho: no celular, window.innerWidth
// cresce junto com o conteúdo e esconderia o problema.
async function semRolagemLateral(page) {
  const tela = page.viewportSize().width
  const conteudo = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(conteudo, `conteúdo com ${conteudo}px numa tela de ${tela}px`).toBeLessThanOrEqual(tela)
}

test('a tela cabe no celular, sem rolagem para os lados, em todas as abas', async ({ page }) => {
  await semRolagemLateral(page)
  await novoPedido(page, { cliente: '@cliente.com.um.nome.de.usuario.bem.comprido', peca: 'Conjunto de linho com bordado artesanal' })
  await semRolagemLateral(page)
  for (const nome of ['Segurando', 'Enviar', 'Histórico']) {
    await aba(page, nome).click()
    await semRolagemLateral(page)
  }
})
