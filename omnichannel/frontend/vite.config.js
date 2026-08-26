import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react({
        include: /\.(mdx|js|jsx|ts|tsx)$/
      })
    ],
    css: {
      postcss: {
        plugins: [
          tailwindcss,
          autoprefixer,
        ],
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    define: {
      'process.env': env
    },
    esbuild: {
      loader: "jsx",
      include: /\.(js|jsx|ts|tsx)$/,
      exclude: []
    },
    optimizeDeps: {
      include: ['react-quill'],
      esbuildOptions: {
        loader: {
          '.js': 'jsx',
        },
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      commonjsOptions: {
        transformMixedEsModules: true,
      }
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      proxy: {
        '/api': {
          target: 'http://backend:8998',
          changeOrigin: true,
          secure: false,
        },
        '/socket.io': {
          target: 'http://backend:8998',
          ws: true,
          changeOrigin: true
        }
      }
    }
  };
});
