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

const OVERPASS_ENDPOINT = '/api/overpass';

function buildQuery(bbox: BoundingBox): string {
  const { minLat, minLon, maxLat, maxLon } = bbox;
  const bboxStr = `${minLat},${minLon},${maxLat},${maxLon}`;

  return `
[out:json][timeout:30];
(
  way["highway"](${bboxStr});
  way["building"](${bboxStr});
  node["natural"="tree"](${bboxStr});
);
out body;
>;
out skel qt;
`.trim();
}

export async function fetchOSMData(bbox: BoundingBox): Promise<OverpassResponse> {
  const query = buildQuery(bbox);

  const response = await fetch(OVERPASS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<OverpassResponse>;
}
