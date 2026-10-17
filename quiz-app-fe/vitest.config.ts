import path from 'node:path'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

// Vitest config kept separate from vite.config so the Tailwind plugin (not
// needed for unit tests) doesn't run during tests.
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.{test,spec}.ts'],
    setupFiles: ['src/test-setup.ts'],
    // Dummy client env so modules that construct the Supabase client at import
    // (via the auth store) don't throw during tests.
    env: {
      VITE_SUPABASE_URL: 'http://localhost:54321',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
      VITE_API_BASE_URL: 'http://localhost:3000/api/v1',
    },
  },
})
