import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import type { Plugin, ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';

// Dev-only: reads { query } JSON body, forwards to Overpass as form-encoded.
// On Vercel this is handled by api/overpass.ts instead.
function overpassDevProxy(): Plugin {
  return {
    name: 'overpass-dev-proxy',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/api/overpass', (req: IncomingMessage, res: ServerResponse) => {
        if (req.method !== 'POST') {
          res.writeHead(405).end();
          return;
        }

        const chunks: Buffer[] = [];
        req.on('data', (chunk: Buffer | string) => {
          chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
        });
        req.on('error', () => {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Request stream error' }));
        });
        req.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');

          let query: string;
          try {
            const parsed = JSON.parse(raw) as { query?: unknown };
            if (typeof parsed.query !== 'string' || !parsed.query.trim()) {
              throw new Error('empty');
            }
            query = parsed.query;
          } catch {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Request body must be JSON with a "query" string field.' }));
            return;
          }

          fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            body: new URLSearchParams({ data: query }),
          })
            .then(async (upstream) => {
              const text = await upstream.text();
              if (!upstream.ok) {
                res.writeHead(502, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                  error: `Overpass API returned ${upstream.status}`,
                  detail: text.slice(0, 500),
                }));
                return;
              }
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(text);
            })
            .catch((err: unknown) => {
              res.writeHead(502, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: String(err) }));
            });
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), overpassDevProxy()],
});
