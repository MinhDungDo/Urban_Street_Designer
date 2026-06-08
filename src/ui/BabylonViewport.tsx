import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SceneManager } from '../babylon/SceneManager';
import { useUrbanStore } from '../store/UrbanDesignerStore';
import type { RoadSegment } from '../domain/RoadSegment';

interface BabylonViewportProps {
  rebuildTrigger: { roadId: string; road: RoadSegment } | null;
}

export const BabylonViewport: React.FC<BabylonViewportProps> = ({ rebuildTrigger }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<SceneManager | null>(null);
  const { roads, buildings, trees, status, selectRoad, selectedRoadId } = useUrbanStore();

  // Initialize SceneManager
  useEffect(() => {
    if (!canvasRef.current) return;
    const sm = new SceneManager(canvasRef.current);
    sceneRef.current = sm;

    sm.setOnRoadPicked((id) => {
      useUrbanStore.getState().selectRoad(id);
    });

    const handleResize = () => sm.handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      sm.dispose();
    };
  }, []);

  // Load scene when data arrives
  useEffect(() => {
    if (status === 'loaded' && sceneRef.current) {
      sceneRef.current.loadScene(roads, buildings, trees);
    }
    if (status === 'idle' && sceneRef.current) {
      sceneRef.current.clearScene();
    }
  }, [status, roads, buildings, trees]);

  // Handle selection
  useEffect(() => {
    sceneRef.current?.setSelectedRoad(selectedRoadId);
  }, [selectedRoadId]);

  // Handle road rebuild
  useEffect(() => {
    if (rebuildTrigger && sceneRef.current) {
      sceneRef.current.rebuildRoad(rebuildTrigger.road);
    }
  }, [rebuildTrigger]);

  return (
    <div className="babylon-viewport">
      <canvas ref={canvasRef} className="babylon-canvas" />

      {status === 'idle' && (
        <div className="viewport-overlay">
          <div className="overlay-content">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
              <line x1="8" y1="2" x2="8" y2="18"/>
              <line x1="16" y1="6" x2="16" y2="22"/>
            </svg>
            <p>Select an area on the map to generate the 3D scene</p>
          </div>
        </div>
      )}

      {status === 'loading' && (
        <div className="viewport-overlay">
          <div className="overlay-content">
            <div className="spinner" />
            <p>Loading OSM data...</p>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="viewport-overlay error">
          <div className="overlay-content">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p>Failed to load. Check the status bar for details.</p>
          </div>
        </div>
      )}

      <div className="viewport-controls-hint">
        <span>🖱 Orbit: drag</span>
        <span>🔍 Zoom: scroll</span>
        <span>✋ Pan: right-drag</span>
      </div>
    </div>
  );
};
