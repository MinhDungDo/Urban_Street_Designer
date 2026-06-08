# Urban Street Designer

A browser-based tool for visualizing and editing real-world street layouts in 3D. Draw a bounding box on any part of the world, and the app fetches live OpenStreetMap data to generate an interactive 3D scene where you can inspect and modify road properties.

## Features

- Select any area on a world map to import real streets, buildings, and trees
- 3D scene rendered with Babylon.js — orbit, pan, and zoom freely
- Click any road to edit its lane count, lane width, bike lanes, and sidewalk widths
- Export the modified layout as JSON

## Tech Stack

| Layer | Library |
|---|---|
| UI framework | React 19 + TypeScript |
| 3D engine | Babylon.js 9 |
| 2D map | MapLibre GL |
| State | Zustand + Immer |
| Build | Vite |

## Architecture

The codebase is organized into vertical layers with a clear data flow:

```
Map selection (bbox)
       │
       ▼
┌─────────────┐
│  gis/       │  Fetches raw OSM data from the Overpass API and parses
│             │  nodes/ways into typed domain objects
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  domain/    │  Plain data models: RoadSegment, Building, Tree
│             │  RoadSegment carries lane geometry, bike lanes, sidewalks
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ generators/ │  Converts domain models into Babylon.js meshes
│             │  RoadGenerator, BuildingGenerator, TreeGenerator
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  babylon/   │  SceneManager owns the Babylon engine and scene lifecycle
└──────┬──────┘
       │
  ┌────┴─────────────────────────┐
  │         store/               │
  │  Zustand store (single       │
  │  source of truth for roads,  │
  │  buildings, trees, status)   │
  └────┬─────────────────────────┘
       │
       ▼
┌─────────────┐
│    ui/      │  React components
│             │  MapPanel · BabylonViewport · InspectorPanel · Toolbar
└─────────────┘
```

### Key directories

| Path | Responsibility |
|---|---|
| `src/gis/` | Overpass API client and OSM-to-domain parser |
| `src/domain/` | TypeScript interfaces and defaults for scene objects |
| `src/generators/` | Procedural mesh generation from domain models |
| `src/babylon/` | Babylon.js scene setup and management |
| `src/store/` | Global app state (Zustand) |
| `src/editor/` | Import orchestration — wires GIS → store → scene |
| `src/ui/` | All React components |
| `src/utils/` | Lat/lon → local metric coordinate projection |

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:5173`, draw a box on the map, and the 3D scene will load automatically.

```bash
npm run build   # production build
npm run lint    # ESLint
```
