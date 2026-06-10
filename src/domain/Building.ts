import type { Vec2 } from './RoadSegment';

export interface Building {
  id: string;
  /** Footprint polygon vertices in local metric space */
  footprintPolygon: Vec2[];
  height: number; // meters
  /** OSM building type tag if present */
  buildingType?: string;
}
