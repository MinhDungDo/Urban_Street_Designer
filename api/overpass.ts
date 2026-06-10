import type { VercelRequest, VercelResponse } from '@vercel/node';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow preflight (CORS safety for browsers)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Body parsing: Vercel parses JSON bodies automatically when Content-Type is application/json
  const body = req.body as { query?: string } | undefined;
  const query = body?.query;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Request body must be JSON with a "query" string field.' });
  }

  // Abort controller so we don't exceed Vercel's function timeout (set to 30s in vercel.json)
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const upstream = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => upstream.statusText);
      console.error(`[overpass proxy] upstream error ${upstream.status}:`, text.slice(0, 300));
      return res.status(502).json({
        error: `Overpass API returned ${upstream.status}`,
        detail: text.slice(0, 500),
      });
    }

    const data = await upstream.json();
    return res.status(200).json(data);

  } catch (err) {
    clearTimeout(timeout);
    const isAbort = err instanceof Error && err.name === 'AbortError';
    const message = isAbort ? 'Overpass API timed out (>25s). Try a smaller area.' : (err instanceof Error ? err.message : 'Proxy error');
    console.error('[overpass proxy] error:', message);
    return res.status(504).json({ error: message });
  }
}
