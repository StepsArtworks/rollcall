import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    port: 3000,
    strictPort: true,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "X-Requested-With, content-type, Authorization"
    },
    host: true, // Listen on all addresses
    open: true  // Open browser automatically
  },
  base: '/rollcall/', // Set base path to /rollcall/ for deployment in that directory
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true, // Enable source maps for debugging
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor code into separate chunks
          'vendor': ['react', 'react-dom'],
          'msal': ['@azure/msal-browser', '@azure/msal-react'],
          'graph': ['@microsoft/microsoft-graph-client']
        }
      }
    }
  },
  // Add resolve alias for development
  resolve: {
    alias: {
      '@': '/src'
    }
  }
});