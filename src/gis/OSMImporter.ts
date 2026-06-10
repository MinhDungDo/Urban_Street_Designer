import type { OverpassResponse, OverpassNode, OverpassWay } from './OverpassService';
import { defaultRoadSegment, type RoadSegment, type RoadType, type LatLon } from '../domain/RoadSegment';
import type { Building } from '../domain/Building';
import type { Tree } from '../domain/Tree';
import { latLonArrayToVec2, type ProjectionOrigin } from '../utils/projection';

export interface ParsedOSMData {
  roads: RoadSegment[];
  buildings: Building[];
  trees: Tree[];
}

const HIGHWAY_TYPE_MAP: Record<string, RoadType> = {
  primary: 'primary',
  secondary: 'secondary',
  tertiary: 'tertiary',
  residential: 'residential',
  service: 'service',
  footway: 'footway',
  cycleway: 'cycleway',
  path: 'path',
};

const DEFAULT_LANE_CONFIG: Record<RoadType, { lanes: number; laneWidth: number }> = {
  primary: { lanes: 4, laneWidth: 3.75 },
  secondary: { lanes: 2, laneWidth: 3.5 },
  tertiary: { lanes: 2, laneWidth: 3.25 },
  residential: { lanes: 2, laneWidth: 3.0 },
  service: { lanes: 1, laneWidth: 2.5 },
  footway: { lanes: 1, laneWidth: 2.0 },
  cycleway: { lanes: 1, laneWidth: 1.5 },
  path: { lanes: 1, laneWidth: 1.5 },
  unclassified: { lanes: 2, laneWidth: 3.0 },
};

export class OSMImporter {
  private nodeMap = new Map<number, OverpassNode>();

  parse(data: OverpassResponse, origin: ProjectionOrigin): ParsedOSMData {
    // Build node lookup
    this.nodeMap.clear();
    for (const el of data.elements) {
      if (el.type === 'node') {
        this.nodeMap.set(el.id, el as OverpassNode);
      }
    }

    const roads: RoadSegment[] = [];
    const buildings: Building[] = [];
    const trees: Tree[] = [];

    for (const el of data.elements) {
      if (el.type === 'node') {
        const node = el as OverpassNode;
        if (node.tags?.natural === 'tree') {
          trees.push({
            id: `tree-${node.id}`,
            position: { x: 0, z: 0 }, // projected below
            species: node.tags?.species,
          });
          // Re-project
          const pos = latLonArrayToVec2([{ lat: node.lat, lon: node.lon }], origin)[0];
          trees[trees.length - 1].position = pos;
        }
      }

      if (el.type === 'way') {
        const way = el as OverpassWay;
        const tags = way.tags ?? {};

        if (tags.highway) {
          const road = this.parseRoad(way, origin);
          if (road) roads.push(road);
        } else if (tags.building) {
          const building = this.parseBuilding(way, origin, tags);
          if (building) buildings.push(building);
        }
      }
    }

    return { roads, buildings, trees };
  }

  private parseRoad(way: OverpassWay, origin: ProjectionOrigin): RoadSegment | null {
    const rawPoints: LatLon[] = [];

    for (const nodeId of way.nodes) {
      const node = this.nodeMap.get(nodeId);
      if (!node) continue;
      rawPoints.push({ lat: node.lat, lon: node.lon });
    }

    if (rawPoints.length < 2) return null;

    const tags = way.tags ?? {};
    const highwayTag = tags.highway ?? 'unclassified';
    const roadType = (HIGHWAY_TYPE_MAP[highwayTag] ?? 'unclassified') as RoadType;
    const laneConfig = DEFAULT_LANE_CONFIG[roadType];

    // Override with OSM lane count if present
    const osmLanes = tags.lanes ? parseInt(tags.lanes, 10) : undefined;

    const centerLinePoints = latLonArrayToVec2(rawPoints, origin);

    return defaultRoadSegment({
      id: `road-${way.id}`,
      name: tags.name ?? tags.highway ?? 'Road',
      centerLinePoints,
      rawPoints,
      roadType,
      laneCount: osmLanes ?? laneConfig.lanes,
      laneWidth: laneConfig.laneWidth,
    });
  }

  private parseBuilding(way: OverpassWay, origin: ProjectionOrigin, tags: Record<string, string>): Building | null {
    const rawPoints: LatLon[] = [];

    for (const nodeId of way.nodes) {
      const node = this.nodeMap.get(nodeId);
      if (!node) continue;
      rawPoints.push({ lat: node.lat, lon: node.lon });
    }

    if (rawPoints.length < 3) return null;

    const footprintPolygon = latLonArrayToVec2(rawPoints, origin);

    // Parse height: prefer height tag, fallback to levels * 3m, default 10m
    let height = 10;
    if (tags['height']) {
      const parsed = parseFloat(tags['height']);
      if (!isNaN(parsed)) height = parsed;
    } else if (tags['building:levels']) {
      const levels = parseInt(tags['building:levels'], 10);
      if (!isNaN(levels)) height = levels * 3;
    }

    return {
      id: `building-${way.id}`,
      footprintPolygon,
      height,
      buildingType: tags.building,
    };
  }
}
