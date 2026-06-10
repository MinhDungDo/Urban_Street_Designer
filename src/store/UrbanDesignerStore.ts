import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { RoadSegment } from '../domain/RoadSegment';
import type { Building } from '../domain/Building';
import type { Tree } from '../domain/Tree';
import type { BoundingBox } from '../gis/OverpassService';
import type { ProjectionOrigin } from '../utils/projection';

export type AppStatus = 'idle' | 'selecting' | 'loading' | 'loaded' | 'error';
export type AppTab = 'map' | 'editor';

export interface LogEntry {
  timestamp: string;
  status: AppStatus;
  message: string;
}

export interface PriceConfig {
  lanePerKm: number;        // € per lane-km
  bikeLanePerKm: number;    // € per bike-lane-km (one side)
  sidewalkPerKm: number;    // € per sidewalk-km (one side)
  treePerUnit: number;      // € per tree
  busStopPerUnit: number;   // € per bus stop (future)
}

export const DEFAULT_PRICES: PriceConfig = {
  lanePerKm: 120000,
  bikeLanePerKm: 45000,
  sidewalkPerKm: 30000,
  treePerUnit: 2500,
  busStopPerUnit: 15000,
};

export interface CostBreakdown {
  lanes: number;
  bikeLanes: number;
  sidewalks: number;
  trees: number;
  total: number;
}

export interface SavedDesign {
  id: string;
  name: string;
  savedAt: string;
  roads: RoadSegment[];
  buildings: Building[];
  trees: Tree[];
  prices: PriceConfig;
  bbox: BoundingBox | null;
}

export interface UrbanDesignerState {
  activeTab: AppTab;
  status: AppStatus;
  statusMessage: string;
  logs: LogEntry[];
  bbox: BoundingBox | null;
  projectionOrigin: ProjectionOrigin | null;

  roads: RoadSegment[];
  buildings: Building[];
  trees: Tree[];

  selectedRoadId: string | null;
  prices: PriceConfig;

  setActiveTab: (tab: AppTab) => void;
  setStatus: (status: AppStatus, message?: string) => void;
  setBbox: (bbox: BoundingBox) => void;
  setProjectionOrigin: (origin: ProjectionOrigin) => void;
  setSceneData: (roads: RoadSegment[], buildings: Building[], trees: Tree[]) => void;
  selectRoad: (id: string | null) => void;
  updateRoad: (id: string, partial: Partial<RoadSegment>) => void;
  updatePrices: (partial: Partial<PriceConfig>) => void;
  computeCost: () => CostBreakdown;
  reset: () => void;
  exportJSON: () => string;
  saveToLocalStorage: (name: string) => void;
  loadFromLocalStorage: (id: string) => boolean;
  listSavedDesigns: () => SavedDesign[];
  deleteSavedDesign: (id: string) => void;
}

function roadLengthKm(road: RoadSegment): number {
  const pts = road.centerLinePoints;
  let len = 0;
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x;
    const dz = pts[i].z - pts[i - 1].z;
    len += Math.sqrt(dx * dx + dz * dz);
  }
  return len / 1000;
}

const initialState = {
  activeTab: 'map' as AppTab,
  status: 'idle' as AppStatus,
  statusMessage: 'Draw a bounding box on the map to begin.',
  logs: [] as LogEntry[],
  bbox: null,
  projectionOrigin: null,
  roads: [] as RoadSegment[],
  buildings: [] as Building[],
  trees: [] as Tree[],
  selectedRoadId: null,
  prices: { ...DEFAULT_PRICES },
};

export const useUrbanStore = create<UrbanDesignerState>()(
  immer((set, get) => ({
    ...initialState,

    setActiveTab: (tab) => set((s) => { s.activeTab = tab; }),

    setStatus: (status, message) =>
      set((s) => {
        s.status = status;
        if (message) {
          s.statusMessage = message;
          s.logs.unshift({ timestamp: new Date().toISOString(), status, message });
          if (s.logs.length > 100) s.logs.length = 100;
        }
      }),

    setBbox: (bbox) => set((s) => { s.bbox = bbox; }),
    setProjectionOrigin: (origin) => set((s) => { s.projectionOrigin = origin; }),

    setSceneData: (roads, buildings, trees) =>
      set((s) => {
        s.roads = roads;
        s.buildings = buildings;
        s.trees = trees;
        s.selectedRoadId = null;
      }),

    selectRoad: (id) => set((s) => { s.selectedRoadId = id; }),

    updateRoad: (id, partial) =>
      set((s) => {
        const idx = s.roads.findIndex((r) => r.id === id);
        if (idx !== -1) Object.assign(s.roads[idx], partial);
      }),

    updatePrices: (partial) =>
      set((s) => { Object.assign(s.prices, partial); }),

    computeCost: () => {
      const { roads, trees, prices } = get();
      let lanesTotal = 0;
      let bikeTotal = 0;
      let sidewalkTotal = 0;

      for (const road of roads) {
        const km = roadLengthKm(road);
        lanesTotal += road.laneCount * km * prices.lanePerKm;
        if (road.bikeLaneEnabled) {
          bikeTotal += 2 * km * prices.bikeLanePerKm;
        }
        sidewalkTotal += km * prices.sidewalkPerKm * 2; // both sides
      }

      const treesTotal = trees.length * prices.treePerUnit;
      return {
        lanes: lanesTotal,
        bikeLanes: bikeTotal,
        sidewalks: sidewalkTotal,
        trees: treesTotal,
        total: lanesTotal + bikeTotal + sidewalkTotal + treesTotal,
      };
    },

    reset: () =>
      set((s) => {
        Object.assign(s, { ...initialState });
      }),

    exportJSON: () => {
      const { roads, buildings, trees, prices, bbox } = get();
      const cost = get().computeCost();
      return JSON.stringify({ roads, buildings, trees, prices, bbox, estimatedCost: cost }, null, 2);
    },

    saveToLocalStorage: (name) => {
      const { roads, buildings, trees, prices, bbox } = get();
      const design: SavedDesign = {
        id: `design_${Date.now()}`,
        name,
        savedAt: new Date().toISOString(),
        roads, buildings, trees, prices, bbox,
      };
      const existing = JSON.parse(localStorage.getItem('usd_saves') ?? '[]') as SavedDesign[];
      existing.unshift(design);
      localStorage.setItem('usd_saves', JSON.stringify(existing.slice(0, 10)));
    },

    loadFromLocalStorage: (id) => {
      const saves = JSON.parse(localStorage.getItem('usd_saves') ?? '[]') as SavedDesign[];
      const design = saves.find((d) => d.id === id);
      if (!design) return false;
      set((s) => {
        s.roads = design.roads;
        s.buildings = design.buildings;
        s.trees = design.trees;
        s.prices = design.prices;
        s.bbox = design.bbox;
        s.status = 'loaded';
        s.activeTab = 'editor';
        s.statusMessage = `Loaded design: ${design.name}`;
      });
      return true;
    },

    listSavedDesigns: () =>
      JSON.parse(localStorage.getItem('usd_saves') ?? '[]') as SavedDesign[],

    deleteSavedDesign: (id) => {
      const saves = JSON.parse(localStorage.getItem('usd_saves') ?? '[]') as SavedDesign[];
      localStorage.setItem('usd_saves', JSON.stringify(saves.filter((d) => d.id !== id)));
    },
  }))
);
