export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

export interface OverpassNode {
  type: 'node';
  id: number;
  lat: number;
  lon: number;
  tags?: Record<string, string>;
}

export interface OverpassWay {
  type: 'way';
  id: number;
  nodes: number[];
  tags?: Record<string, string>;
}

export interface OverpassRelation {
  type: 'relation';
  id: number;
  members: Array<{ type: string; ref: number; role: string }>;
  tags?: Record<string, string>;
}

export type OverpassElement = OverpassNode | OverpassWay | OverpassRelation;

export interface OverpassResponse {
  elements: OverpassElement[];
}

/**
 * Always calls our own /api/overpass proxy.
 * - On Vercel: handled by api/overpass.ts serverless function.
 * - In local dev: forwarded by the Vite dev-server proxy in vite.config.ts.
 * This avoids the CORS block that Overpass applies to direct browser requests.
 */
const PROXY_ENDPOINT = '/api/overpass';

function buildQuery(bbox: BoundingBox): string {
  const { minLat, minLon, maxLat, maxLon } = bbox;
  const b = `${minLat},${minLon},${maxLat},${maxLon}`;
  return `[out:json][timeout:25];
(
  way["highway"](${b});
  way["building"](${b});
  node["natural"="tree"](${b});
);
out body;
>;
out skel qt;`;
}

export async function fetchOSMData(bbox: BoundingBox): Promise<OverpassResponse> {
  const query = buildQuery(bbox);

  let response: Response;
  try {
    response = await fetch(PROXY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
  } catch (networkErr) {
    throw new Error(`Network error reaching proxy: ${networkErr instanceof Error ? networkErr.message : String(networkErr)}`);
  }

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = await response.json() as { error?: string; detail?: string };
      detail = body.error ?? body.detail ?? detail;
    } catch { /* non-JSON error body */ }
    throw new Error(`Proxy error ${response.status}: ${detail}`);
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new Error('Proxy returned non-JSON response. Check Vercel function logs.');
  }

  const result = data as OverpassResponse;
  if (!Array.isArray(result.elements)) {
    throw new Error('Unexpected response shape from proxy — missing "elements" array.');
  }

  return result;
}
