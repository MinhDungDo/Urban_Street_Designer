import React, { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { BoundingBox } from '../gis/OverpassService';
import { useUrbanStore } from '../store/UrbanDesignerStore';

interface MapPanelProps {
  onBboxSelected: (bbox: BoundingBox) => void;
  onGenerate: () => void;
}

export const MapPanel: React.FC<MapPanelProps> = ({ onBboxSelected, onGenerate }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [pendingBbox, setPendingBbox] = useState<BoundingBox | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const startPixel = useRef<[number, number] | null>(null);
  const startLngLat = useRef<[number, number] | null>(null);
  const { status } = useUrbanStore();
  const isLoading = status === 'loading';

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: { osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, attribution: '© OpenStreetMap contributors' } },
        layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
      },
      center: [8.8017, 53.0793],
      zoom: 14,
      // Default MapLibre controls: left-drag = pan, scroll = zoom, right-drag = rotate
    });
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    mapRef.current = map;
    return () => map.remove();
  }, []);

  const startDraw = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!mapRef.current || isLoading || !e.ctrlKey) return;
    e.preventDefault();
    const rect = containerRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const lngLat = mapRef.current.unproject([x, y]);
    startLngLat.current = [lngLat.lng, lngLat.lat];
    startPixel.current = [x, y];
    setIsDrawing(true);
    setPendingBbox(null);
    clearMapBbox();

    const box = document.createElement('div');
    box.style.cssText = 'position:absolute;border:2px solid #00d4ff;background:rgba(0,212,255,0.08);pointer-events:none;box-sizing:border-box;z-index:10;border-radius:2px;';
    containerRef.current!.appendChild(box);
    boxRef.current = box;
  }, [isLoading]);

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !startPixel.current || !boxRef.current) return;
    const rect = containerRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const [sx, sy] = startPixel.current;
    boxRef.current.style.left = `${Math.min(sx, x)}px`;
    boxRef.current.style.top = `${Math.min(sy, y)}px`;
    boxRef.current.style.width = `${Math.abs(x - sx)}px`;
    boxRef.current.style.height = `${Math.abs(y - sy)}px`;
  }, [isDrawing]);

  const clearMapBbox = () => {
    const map = mapRef.current;
    if (!map) return;
    if (map.getLayer('bbox-fill')) map.removeLayer('bbox-fill');
    if (map.getLayer('bbox-line')) map.removeLayer('bbox-line');
    if (map.getSource('bbox')) map.removeSource('bbox');
  };

  const endDraw = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !mapRef.current || !startLngLat.current || !startPixel.current) return;
    const map = mapRef.current;
    const rect = containerRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const endLngLat = map.unproject([x, y]);
    boxRef.current?.remove();
    boxRef.current = null;
    setIsDrawing(false);

    const minLon = Math.min(startLngLat.current[0], endLngLat.lng);
    const maxLon = Math.max(startLngLat.current[0], endLngLat.lng);
    const minLat = Math.min(startLngLat.current[1], endLngLat.lat);
    const maxLat = Math.max(startLngLat.current[1], endLngLat.lat);

    if ((maxLon - minLon) * (maxLat - minLat) < 0.000001) return;
    const approxKm2 = ((maxLon - minLon) * 111) * ((maxLat - minLat) * 111);
    if (approxKm2 > 4) { alert('Area too large — please select under ~2km × 2km.'); return; }

    const bbox: BoundingBox = { minLat, maxLat, minLon, maxLon };
    setPendingBbox(bbox);
    onBboxSelected(bbox);

    clearMapBbox();
    map.addSource('bbox', {
      type: 'geojson',
      data: { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[minLon, minLat], [maxLon, minLat], [maxLon, maxLat], [minLon, maxLat], [minLon, minLat]]] }, properties: {} },
    });
    map.addLayer({ id: 'bbox-fill', type: 'fill', source: 'bbox', paint: { 'fill-color': '#00d4ff', 'fill-opacity': 0.1 } });
    map.addLayer({ id: 'bbox-line', type: 'line', source: 'bbox', paint: { 'line-color': '#00d4ff', 'line-width': 2, 'line-dasharray': [4, 2] } });
  }, [isDrawing, onBboxSelected]);

  const handleReset = () => {
    setPendingBbox(null);
    clearMapBbox();
  };

  return (
    <div className="map-tab">
      <div className="map-instructions">
        <div className="inst-item">
          <kbd>Left drag</kbd>
          <span>Pan map</span>
        </div>
        <div className="inst-item">
          <kbd>Scroll</kbd>
          <span>Zoom</span>
        </div>
        <div className="inst-item">
          <kbd>Ctrl + drag</kbd>
          <span>Draw bounding box</span>
        </div>
        <div className="inst-item">
          <kbd>Right drag</kbd>
          <span>Rotate map</span>
        </div>
      </div>

      <div
        ref={containerRef}
        className="map-container"
        style={{ cursor: isLoading ? 'wait' : isDrawing ? 'crosshair' : (typeof window !== 'undefined' ? undefined : 'grab') }}
        onMouseDown={startDraw}
        onMouseMove={onMouseMove}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
      />

      <div className="map-actions">
        <button className="btn btn-ghost" onClick={handleReset} disabled={!pendingBbox || isLoading}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.49"/></svg>
          Clear Selection
        </button>
        <button
          className="btn btn-primary btn-generate"
          onClick={onGenerate}
          disabled={!pendingBbox || isLoading}
        >
          {isLoading ? (
            <><span className="btn-spinner" /> Generating...</>
          ) : (
            <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg> Generate 3D Scene</>
          )}
        </button>
      </div>

      {pendingBbox && !isLoading && (
        <div className="bbox-info">
          <span className="bbox-coords">
            {pendingBbox.minLat.toFixed(4)}°N, {pendingBbox.minLon.toFixed(4)}°E
            {' → '}
            {pendingBbox.maxLat.toFixed(4)}°N, {pendingBbox.maxLon.toFixed(4)}°E
          </span>
        </div>
      )}
    </div>
  );
};
