import { expect, test } from '@playwright/test'
import { aba, cards, novoPedido } from './ajudantes'

test.beforeEach(async ({ page }) => {
  await page.goto('./')
})

test('o formulário começa minimizado e abre pelo botão "+ Novo pedido"', async ({ page }) => {
  const botao = page.getByTestId('novo-pedido')
  const form = page.getByRole('form', { name: 'Novo pedido' })
  await expect(botao).toBeVisible()
  await expect(form).toBeHidden()

  await botao.click()
  await expect(form).toBeVisible()
  await expect(botao).toBeHidden()
})

test('"Minimizar" recolhe o formulário e mantém o rascunho', async ({ page }) => {
  await page.getByTestId('novo-pedido').click()
  await page.getByTestId('cliente').fill('@rascunho')
  await page.getByTestId('minimizar').click()

  await expect(page.getByRole('form', { name: 'Novo pedido' })).toBeHidden()
  await page.getByTestId('novo-pedido').click()
  await expect(page.getByTestId('cliente')).toHaveValue('@rascunho')
})

for (const nome of ['Segurando', 'Enviar', 'Histórico']) {
  test(`o formulário e o botão de novo pedido não aparecem na aba ${nome}`, async ({ page }) => {
    await page.getByTestId('novo-pedido').click()
    await aba(page, nome).click()
    await expect(page.getByTestId('novo-pedido')).toBeHidden()
    await expect(page.getByRole('form', { name: 'Novo pedido' })).toBeHidden()
  })
}

test('não deixa adicionar sem cliente ou sem peça', async ({ page }) => {
  await page.getByTestId('novo-pedido').click()
  await page.getByTestId('peca').fill('Blusa')
  await page.getByTestId('adicionar').click()
  await expect(page.getByRole('alert')).toHaveText('Preencha a cliente e a peça.')
  await expect(cards(page)).toHaveCount(0)
})

test('depois de adicionar, o formulário fica pronto para o próximo pedido da mesma peça', async ({ page }) => {
  await novoPedido(page, { cliente: '@ana', peca: 'Saia midi', tam: 'G', cor: 'azul' })
  await expect(page.getByTestId('cliente')).toHaveValue('')
  await expect(page.getByTestId('cliente')).toBeFocused()
  await expect(page.getByTestId('peca')).toHaveValue('Saia midi')
  await expect(page.locator('[data-tam="G"]')).toHaveAttribute('aria-pressed', 'true')
})

test('nome da cliente com HTML aparece como texto e não executa nada', async ({ page }) => {
  let abriuAlerta = false
  page.on('dialog', async (d) => {
    abriuAlerta = true
    await d.dismiss()
  })
  const malicioso = '<img src=x onerror="alert(1)">'
  await novoPedido(page, { cliente: malicioso })

  await expect(cards(page).first().locator('.who')).toContainText(malicioso)
  await expect(cards(page).first().locator('img')).toHaveCount(0)
  expect(abriuAlerta).toBe(false)
})
