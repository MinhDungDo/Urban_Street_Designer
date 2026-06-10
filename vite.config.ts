import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import type { Plugin, ViteDevServer, Connect } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';

// Dev-only middleware: receives { query } JSON, forwards to Overpass as form-encoded.
// On Vercel this is handled by api/overpass.ts instead.
function overpassDevProxy(): Plugin {
  return {
    name: 'overpass-dev-proxy',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(
        '/api/overpass',
        async (req: IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
          if (req.method !== 'POST') { next(); return; }

          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk as Buffer);
          const body = Buffer.concat(chunks).toString();

          let query: string;
          try {
            query = (JSON.parse(body) as { query: string }).query;
            if (!query) throw new Error('empty');
          } catch {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing query field' }));
            return;
          }

          try {
            const upstream = await fetch('https://overpass-api.de/api/interpreter', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: `data=${encodeURIComponent(query)}`,
            });

            const data = await upstream.text();
            res.writeHead(upstream.status, { 'Content-Type': 'application/json' });
            res.end(data);
          } catch (err) {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: String(err) }));
          }
        }
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), overpassDevProxy()],
});
