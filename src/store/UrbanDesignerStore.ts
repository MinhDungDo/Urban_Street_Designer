import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { RoadSegment } from '../domain/RoadSegment';
import type { Building } from '../domain/Building';
import type { Tree } from '../domain/Tree';
import type { BoundingBox } from '../gis/OverpassService';
import type { ProjectionOrigin } from '../utils/projection';

export type AppStatus =
  | 'idle'
  | 'selecting'
  | 'loading'
  | 'loaded'
  | 'error';

export interface UrbanDesignerState {
  // Import state
  status: AppStatus;
  statusMessage: string;
  bbox: BoundingBox | null;
  projectionOrigin: ProjectionOrigin | null;

  // Domain models
  roads: RoadSegment[];
  buildings: Building[];
  trees: Tree[];

  // Editor state
  selectedRoadId: string | null;

  // Actions
  setStatus: (status: AppStatus, message?: string) => void;
  setBbox: (bbox: BoundingBox) => void;
  setProjectionOrigin: (origin: ProjectionOrigin) => void;
  setSceneData: (roads: RoadSegment[], buildings: Building[], trees: Tree[]) => void;

  selectRoad: (id: string | null) => void;
  updateRoad: (id: string, partial: Partial<RoadSegment>) => void;

  reset: () => void;
  exportJSON: () => string;
}

const initialState = {
  status: 'idle' as AppStatus,
  statusMessage: 'Draw a bounding box on the map to begin.',
  bbox: null,
  projectionOrigin: null,
  roads: [] as RoadSegment[],
  buildings: [] as Building[],
  trees: [] as Tree[],
  selectedRoadId: null,
};

export const useUrbanStore = create<UrbanDesignerState>()(
  immer((set, get) => ({
    ...initialState,

    setStatus: (status, message) =>
      set((state) => {
        state.status = status;
        if (message) state.statusMessage = message;
      }),

    setBbox: (bbox) =>
      set((state) => {
        state.bbox = bbox;
      }),

    setProjectionOrigin: (origin) =>
      set((state) => {
        state.projectionOrigin = origin;
      }),

    setSceneData: (roads, buildings, trees) =>
      set((state) => {
        state.roads = roads;
        state.buildings = buildings;
        state.trees = trees;
        state.selectedRoadId = null;
      }),

    selectRoad: (id) =>
      set((state) => {
        state.selectedRoadId = id;
      }),

    updateRoad: (id, partial) =>
      set((state) => {
        const idx = state.roads.findIndex((r) => r.id === id);
        if (idx !== -1) {
          Object.assign(state.roads[idx], partial);
        }
      }),

    reset: () =>
      set((state) => {
        Object.assign(state, {
          ...initialState,
          status: 'idle',
          statusMessage: 'Draw a bounding box on the map to begin.',
        });
      }),

    exportJSON: () => {
      const { roads, buildings, trees } = get();
      return JSON.stringify({ roads, buildings, trees }, null, 2);
    },
  }))
);
