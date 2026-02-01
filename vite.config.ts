import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react()],
    define: {
      // Pass the API_KEY from the environment to the client
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      // Pass the GOOGLE_CLIENT_ID from the environment to the client
      'process.env.GOOGLE_CLIENT_ID': JSON.stringify(env.GOOGLE_CLIENT_ID),
      // Prevent crash if other process.env props are accessed (but don't overwrite the ones above)
      'process.env': {}
    },
    build: {
        // Ensure the build output is standard
        outDir: 'dist',
    }
  };
});