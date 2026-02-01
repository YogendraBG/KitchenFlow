import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  // FIX: Use '.' instead of process.cwd() to avoid TS error about 'cwd' not existing on 'Process'
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react()],
    define: {
      // This is critical: it replaces `process.env.API_KEY` in your code 
      // with the actual value from Vercel during the build.
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      // Prevent crash if other process.env props are accessed
      'process.env': {}
    },
    build: {
        // Ensure the build output is standard
        outDir: 'dist',
    }
  };
});