import { expect, test } from '@playwright/test'
import { INICIO, aba, cards, novoPedido, separarPrimeiro } from './ajudantes'

// Estes testes controlam o relógio do navegador (page.clock):
// 30 minutos de prazo passam em milissegundos.
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: INICIO })
  await page.goto('./')
})

test('o cronômetro muda de cor com o tempo e a aba avisa o vencimento', async ({ page }) => {
  await novoPedido(page)
  await separarPrimeiro(page)
  const card = cards(page).first()
  await expect(card).not.toHaveClass(/atencao|vencido/)
  await expect(card.getByRole('button', { name: 'Cobrar' })).toHaveCount(0)

  await page.clock.fastForward('20:00')
  await expect(page.getByTestId('timer')).toHaveText('20 min de 30 min')
  await expect(card).toHaveClass(/atencao/)
  await expect(card.getByRole('button', { name: 'Cobrar' })).toBeVisible()

  await page.clock.fastForward('10:00')
  await expect(card).toHaveClass(/vencido/)
  await expect(page.getByTestId('timer')).toHaveText('30 min passou do prazo')
  await expect(aba(page, 'Segurando')).toHaveClass(/has-late/)
  await expect(page.getByText('1 peça passou do prazo.')).toBeVisible()

  await card.getByRole('button', { name: 'Cobrar' }).click()
  await expect(page.getByTestId('aviso-mensagem')).toHaveValue(/Tudo certo com o pagamento\?/)
})

test('"Voltar pra Segurando" reinicia o cronômetro (bug #3)', async ({ page }) => {
  await novoPedido(page)
  await separarPrimeiro(page)
  await page.clock.fastForward('25:00')
  await expect(page.getByTestId('timer')).toHaveText('25 min de 30 min')

  await cards(page).first().getByRole('button', { name: 'Pagou' }).click()
  await aba(page, 'Enviar').click()
  await cards(page).first().getByRole('button', { name: 'Voltar pra Segurando' }).click()
  await aba(page, 'Segurando').click()

  await expect(page.getByTestId('timer')).toHaveText('0 min de 30 min')
  await expect(cards(page).first()).not.toHaveClass(/atencao|vencido/)
})

test('mudar o prazo padrão não afeta peça já separada (bug #2)', async ({ page }) => {
  await novoPedido(page)
  await separarPrimeiro(page)
  await page.getByTestId('prazo').selectOption('15')

  await page.clock.fastForward('20:00')
  await expect(page.getByTestId('timer')).toHaveText('20 min de 30 min')
  await expect(cards(page).first()).toHaveClass(/atencao/)
})

test('o cronômetro continua certo depois de recarregar a página', async ({ page }) => {
  await novoPedido(page)
  await separarPrimeiro(page)
  await page.clock.fastForward('12:00')
  await page.reload()
  await expect(page.getByTestId('timer')).toHaveText('12 min de 30 min')
})
