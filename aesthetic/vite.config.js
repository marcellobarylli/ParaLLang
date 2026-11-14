import { defineConfig } from 'vite';

export default defineConfig({
  server: { host: true, port: 5180 },
  preview: { port: 5181 },
});
