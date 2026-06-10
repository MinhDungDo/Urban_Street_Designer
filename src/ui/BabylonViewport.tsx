import React, { useEffect, useRef } from 'react';
import { SceneManager } from '../babylon/SceneManager';
import { useUrbanStore } from '../store/UrbanDesignerStore';
import type { RoadSegment } from '../domain/RoadSegment';

interface BabylonViewportProps {
  rebuildTrigger: { roadId: string; road: RoadSegment } | null;
  sceneManagerRef: React.MutableRefObject<SceneManager | null>;
}

export const BabylonViewport: React.FC<BabylonViewportProps> = ({ rebuildTrigger, sceneManagerRef }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { roads, buildings, trees, status, selectedRoadId } = useUrbanStore();

  useEffect(() => {
    if (!canvasRef.current) return;
    const sm = new SceneManager(canvasRef.current);
    sceneManagerRef.current = sm;
    sm.setOnRoadPicked((id) => { useUrbanStore.getState().selectRoad(id); });
    const handleResize = () => sm.handleResize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      sm.dispose();
      sceneManagerRef.current = null;
    };
  }, [sceneManagerRef]);

  useEffect(() => {
    if (status === 'loaded' && sceneManagerRef.current) {
      sceneManagerRef.current.loadScene(roads, buildings, trees);
    }
    if (status === 'idle' && sceneManagerRef.current) {
      sceneManagerRef.current.clearScene();
    }
  }, [status, roads, buildings, trees, sceneManagerRef]);

  useEffect(() => {
    sceneManagerRef.current?.setSelectedRoad(selectedRoadId);
  }, [selectedRoadId, sceneManagerRef]);

  useEffect(() => {
    if (rebuildTrigger && sceneManagerRef.current) {
      sceneManagerRef.current.rebuildRoad(rebuildTrigger.road);
    }
  }, [rebuildTrigger, sceneManagerRef]);

  return (
    <div className="babylon-viewport">
      <canvas ref={canvasRef} className="babylon-canvas" />

      {status === 'idle' && (
        <div className="viewport-overlay">
          <div className="overlay-content">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
              <line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
            </svg>
            <p>Go to the <strong>Map</strong> tab, draw a bounding box, then click <em>Generate 3D Scene</em></p>
          </div>
        </div>
      )}

      {status === 'loading' && (
        <div className="viewport-overlay">
          <div className="overlay-content">
            <div className="spinner" />
            <p>Fetching & processing OSM data...</p>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="viewport-overlay overlay-error">
          <div className="overlay-content">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <p>Import failed. Check the status bar and try again.</p>
          </div>
        </div>
      )}

      <div className="viewport-controls-hint">
        <span>🖱 Left click — select road</span>
        <span>Right drag — orbit</span>
        <span>Scroll — zoom</span>
        <span>Middle drag — pan</span>
      </div>
    </div>
  );
};
