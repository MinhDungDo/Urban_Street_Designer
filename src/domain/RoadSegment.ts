export type RoadType =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'residential'
  | 'service'
  | 'footway'
  | 'cycleway'
  | 'path'
  | 'unclassified';

export interface LatLon {
  lat: number;
  lon: number;
}

export interface Vec2 {
  x: number;
  z: number;
}

export interface RoadSegment {
  id: string;
  name: string;
  /** Center-line points in local metric space (meters from origin) */
  centerLinePoints: Vec2[];
  /** Original OSM coordinates for reference */
  rawPoints: LatLon[];

  laneCount: number;
  laneWidth: number; // meters

  bikeLaneEnabled: boolean;
  bikeLaneWidth: number; // meters

  sidewalkLeftWidth: number; // meters
  sidewalkRightWidth: number; // meters

  roadType: RoadType;
}

export function computeRoadTotalWidth(road: RoadSegment): number {
  const lanes = road.laneCount * road.laneWidth;
  const bike = road.bikeLaneEnabled ? road.bikeLaneWidth * 2 : 0;
  return lanes + bike + road.sidewalkLeftWidth + road.sidewalkRightWidth;
}

export function defaultRoadSegment(partial: Partial<RoadSegment> & Pick<RoadSegment, 'id' | 'centerLinePoints' | 'rawPoints'>): RoadSegment {
  return {
    name: 'Unnamed Road',
    laneCount: 2,
    laneWidth: 3.5,
    bikeLaneEnabled: false,
    bikeLaneWidth: 1.5,
    sidewalkLeftWidth: 2.0,
    sidewalkRightWidth: 2.0,
    roadType: 'residential',
    ...partial,
  };
}
