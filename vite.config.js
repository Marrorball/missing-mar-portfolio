import { defineConfig } from 'vite';

export default defineConfig({
  base: '/missing-mar-portfolio/',
  server: {
    host: '0.0.0.0',
    allowedHosts: ['localhost', 'terminal.local']
  }
});

