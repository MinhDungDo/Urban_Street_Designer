import type { Vec2 } from './RoadSegment';

export interface Tree {
  id: string;
  position: Vec2;
  /** Optional species from OSM natural:tree tag */
  species?: string;
}
