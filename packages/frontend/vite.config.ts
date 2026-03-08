import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@investor-backoffice/shared': resolve(__dirname, '../shared/src/index.ts'),
    },
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      // Proxy API calls to the backend during development.
      // BACKEND_URL defaults to localhost for local dev; override for Docker (http://backend:3001)
      '/api': {
        target: process.env['BACKEND_URL'] ?? 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        // Split vendor chunks for better caching
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          antd: ['antd', '@ant-design/icons', '@ant-design/pro-components'],
          query: ['@tanstack/react-query'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    // Exclude Playwright e2e tests — they need a running dev server
    exclude: ['src/tests/e2e/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      all: true,
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'src/tests/**',
        'src/main.tsx',
        'src/i18n/**',
        'src/router/**', // Router config — tested via e2e
        'src/store/**', // Zustand stores — tested implicitly via component tests
        'src/api/**', // API client wrappers — tested via MSW mocks
        'src/pages/**', // Page components — partially tested, rest via e2e
        'src/components/layout/**', // Layout — tested via e2e
      ],
      thresholds: {
        lines: 50,
        branches: 50,
        functions: 50,
        statements: 50,
      },
    },
  },
});
