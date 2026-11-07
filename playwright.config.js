import { defineConfig, devices } from '@playwright/test'

// Testes de ponta a ponta: abrem o app gerado (o mesmo que vai pro GitHub Pages)
// num navegador de verdade, em tamanho de celular.
const PORTA = 4173
const ENDERECO = `http://localhost:${PORTA}/arara-do-online/`

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: ENDERECO,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'Android (Pixel 7)', use: { ...devices['Pixel 7'] } },
    { name: 'Tela pequena (iPhone SE)', use: { ...devices['iPhone SE'], browserName: 'chromium' } },
  ],
  webServer: {
    command: `npm run build && npx vite preview --port ${PORTA} --strictPort`,
    url: ENDERECO,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
