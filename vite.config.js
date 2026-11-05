import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import tmdbHandler from './api/tmdb.js';

// Reuse the Vercel handler locally instead of putting the token in browser code.
function localMovieApi() {
  function installMiddleware(server) {
    const env = loadEnv(server.config.mode, process.cwd(), 'TMDB_');
    if (!process.env.TMDB_READ_ACCESS_TOKEN && env.TMDB_READ_ACCESS_TOKEN) {
      process.env.TMDB_READ_ACCESS_TOKEN = env.TMDB_READ_ACCESS_TOKEN;
    }
    server.middlewares.use((req, res, next) => {
      if (req.url?.split('?')[0].startsWith('/api/')) {
        tmdbHandler(req, res).catch(() => {
          if (!res.writableEnded) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: { message: 'The movie service is unavailable.' } }));
          }
        });
        return;
      }
      next();
    });
  }
  return {
    name: 'local-movie-api',
    configureServer: installMiddleware,
    configurePreviewServer: installMiddleware,
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), localMovieApi()],
  test: {
    pool: 'threads',
    maxWorkers: 1,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    clearMocks: true,
  },
});
