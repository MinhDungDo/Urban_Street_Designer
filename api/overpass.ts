import type { IncomingMessage, ServerResponse } from 'node:http';

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.writeHead(405).end('Method Not Allowed');
    return;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string));
  }
  const rawBody = Buffer.concat(chunks).toString();

  const upstream = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: rawBody,
  });

  if (!upstream.ok) {
    res.writeHead(upstream.status).end(upstream.statusText);
    return;
  }

  const data = await upstream.text();
  res.writeHead(200, { 'Content-Type': 'application/json' }).end(data);
}
