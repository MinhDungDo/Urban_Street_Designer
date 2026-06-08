export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).end('Method Not Allowed');
    return;
  }

  const { query } = req.body as { query: string };
  if (!query) {
    res.status(400).json({ error: 'Missing query' });
    return;
  }

  const upstream = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!upstream.ok) {
    res.status(upstream.status).end(upstream.statusText);
    return;
  }

  const data = await upstream.text();
  res.setHeader('Content-Type', 'application/json');
  res.status(200).send(data);
}
