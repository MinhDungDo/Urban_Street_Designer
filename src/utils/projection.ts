import type { LatLon, Vec2 } from '../domain/RoadSegment';

/**
 * Simple equirectangular projection centered on origin.
 * Good enough for city-block-scale areas (< 5km).
 * Returns coordinates in meters.
 */

export interface ProjectionOrigin {
  lat: number;
  lon: number;
}

const EARTH_RADIUS_M = 6_371_000;
const DEG_TO_RAD = Math.PI / 180;

export function projectLatLon(point: LatLon, origin: ProjectionOrigin): Vec2 {
  const dLat = (point.lat - origin.lat) * DEG_TO_RAD;
  const dLon = (point.lon - origin.lon) * DEG_TO_RAD;
  const avgLat = ((point.lat + origin.lat) / 2) * DEG_TO_RAD;

  return {
    x: dLon * EARTH_RADIUS_M * Math.cos(avgLat),
    z: -dLat * EARTH_RADIUS_M, // negate so north = +Z in Babylon
  };
}

export function computeOriginFromBbox(minLat: number, maxLat: number, minLon: number, maxLon: number): ProjectionOrigin {
  return {
    lat: (minLat + maxLat) / 2,
    lon: (minLon + maxLon) / 2,
  };
}

export function latLonArrayToVec2(points: LatLon[], origin: ProjectionOrigin): Vec2[] {
  return points.map((p) => projectLatLon(p, origin));
}
