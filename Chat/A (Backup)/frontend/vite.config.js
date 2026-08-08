import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CHAT_API = 'http://localhost:3001'

export default defineConfig({
  // Relative base so Capacitor / Android WebView resolve assets correctly
  base: './',
  plugins: [
    react(),
    // Polyfills + legacy chunks for older Android WebViews (avoids white screen)
    legacy({
      targets: ['defaults', 'Android >= 5', 'Chrome >= 49', 'not IE 11'],
      modernPolyfills: true,
      renderLegacyChunks: true,
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@features': path.resolve(__dirname, './src/features'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@services': path.resolve(__dirname, './src/services'),
      '@context': path.resolve(__dirname, './src/context'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@constants': path.resolve(__dirname, './src/constants'),
      '@routes': path.resolve(__dirname, './src/routes'),
      '@lib': path.resolve(__dirname, './src/lib'),
    },
  },
  build: {
    cssCodeSplit: true,
    // terser is required for @vitejs/plugin-legacy chunks
    minify: 'terser',
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/auth': {
        target: CHAT_API,
        changeOrigin: true,
      },
      '/chats': {
        target: CHAT_API,
        changeOrigin: true,
      },
      '/chat': {
        target: CHAT_API,
        changeOrigin: true,
      },
      '/messages': {
        target: CHAT_API,
        changeOrigin: true,
      },
      '/users': {
        target: CHAT_API,
        changeOrigin: true,
      },
      '/contacts': {
        target: CHAT_API,
        changeOrigin: true,
      },
      '/notifications': {
        target: CHAT_API,
        changeOrigin: true,
      },
      '/socket.io': {
        target: CHAT_API,
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
