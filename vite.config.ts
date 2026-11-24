import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Em desenvolvimento, /api é encaminhado para a API (npm run dev:api). Em produção, o Nginx faz o proxy.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { '/api': process.env.API_URL ?? 'http://localhost:3000' },
  },
});
