import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  // Endereço do app no GitHub Pages: https://<usuario>.github.io/arara-do-online/
  base: '/arara-do-online/',
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,vue}'],
      exclude: ['src/main.js'],
      reporter: ['text', 'html'],
      // Se a cobertura cair abaixo disso, o teste falha (inclusive no GitHub Actions)
      thresholds: { lines: 90, branches: 85, functions: 85, statements: 90 },
    },
  },
})
