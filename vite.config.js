import { defineConfig } from 'vite';

import { adminPlugin } from './scripts/admin-plugin.mjs';

export default defineConfig({
  base: '/missing-mar-portfolio/',
  plugins: [adminPlugin()],
  server: {
    host: '0.0.0.0',
    allowedHosts: ['localhost', 'terminal.local']
  }
});
