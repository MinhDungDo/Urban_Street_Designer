import React, { useState, useCallback } from 'react';
import { Toolbar } from './ui/Toolbar';
import { MapPanel } from './ui/MapPanel';
import { BabylonViewport } from './ui/BabylonViewport';
import { InspectorPanel } from './ui/InspectorPanel';
import { useUrbanStore } from './store/UrbanDesignerStore';
import { importArea } from './editor/ImportService';
import type { BoundingBox } from './gis/OverpassService';
import type { RoadSegment } from './domain/RoadSegment';
import './App.css';

export const App: React.FC = () => {
  const { status, statusMessage, reset } = useUrbanStore();
  const [rebuildTrigger, setRebuildTrigger] = useState<{ roadId: string; road: RoadSegment } | null>(null);

  const handleBboxSelected = useCallback(async (bbox: BoundingBox) => {
    try {
      await importArea(bbox);
    } catch {
      // Error is set in store
    }
  }, []);

  const handleRoadChanged = useCallback((road: RoadSegment) => {
    setRebuildTrigger({ roadId: road.id, road });
  }, []);

  const handleReset = useCallback(() => {
    reset();
    setRebuildTrigger(null);
  }, [reset]);

  return (
    <div className="app">
      <Toolbar onReset={handleReset} />
      <div className="workspace">
        <aside className="left-panel">
          <MapPanel
            onBboxSelected={handleBboxSelected}
            isLoading={status === 'loading'}
          />
        </aside>
        <main className="center-panel">
          <BabylonViewport rebuildTrigger={rebuildTrigger} />
        </main>
        <aside className="right-panel">
          <div className="panel-header">
            <span className="panel-title">Properties</span>
          </div>
          <InspectorPanel onRoadChanged={handleRoadChanged} />
        </aside>
      </div>
      <footer className="status-bar">
        <div className={`status-indicator status-${status}`} />
        <span className="status-message">{statusMessage}</span>
      </footer>
    </div>
  );
};

export default App;
