import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/auth': 'http://localhost:5000',
        '/user': 'http://localhost:5000',
        '/research': 'http://localhost:5000',
        '/chat': 'http://localhost:5000',
        '/events': 'http://localhost:5000',
        '/agents': 'http://localhost:5000',
        '/memories': 'http://localhost:5000',
        '/export': 'http://localhost:5000',
        '/usage': 'http://localhost:5000',
        '/generated_images': 'http://localhost:5000',
      }
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
