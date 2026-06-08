import React, { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { BoundingBox } from '../gis/OverpassService';

interface MapPanelProps {
  onBboxSelected: (bbox: BoundingBox) => void;
  isLoading: boolean;
}

export const MapPanel: React.FC<MapPanelProps> = ({ onBboxSelected, isLoading }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [startLngLat, setStartLngLat] = useState<[number, number] | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const startPixel = useRef<[number, number] | null>(null);
  const [hasSelection, setHasSelection] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
          },
        },
        layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
      },
      center: [8.8017, 53.0793], // Bremen
      zoom: 14,
    });

    mapRef.current = map;

    return () => map.remove();
  }, []);

  const startDraw = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!mapRef.current || isLoading) return;
      const map = mapRef.current;
      const rect = containerRef.current!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const lngLat = map.unproject([x, y]);
      setStartLngLat([lngLat.lng, lngLat.lat]);
      startPixel.current = [x, y];
      setDrawing(true);
      setHasSelection(false);

      // Create rubber-band box
      const box = document.createElement('div');
      box.style.cssText = `
        position:absolute;border:2px dashed #00e5ff;background:rgba(0,229,255,0.08);
        pointer-events:none;box-sizing:border-box;z-index:10;
      `;
      containerRef.current!.appendChild(box);
      boxRef.current = box;
    },
    [isLoading]
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!drawing || !startPixel.current || !boxRef.current) return;
      const rect = containerRef.current!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const [sx, sy] = startPixel.current;

      boxRef.current.style.left = `${Math.min(sx, x)}px`;
      boxRef.current.style.top = `${Math.min(sy, y)}px`;
      boxRef.current.style.width = `${Math.abs(x - sx)}px`;
      boxRef.current.style.height = `${Math.abs(y - sy)}px`;
    },
    [drawing]
  );

  const endDraw = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!drawing || !mapRef.current || !startLngLat || !startPixel.current) return;

      const map = mapRef.current;
      const rect = containerRef.current!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const endLngLat = map.unproject([x, y]);

      // Clean up box
      boxRef.current?.remove();
      boxRef.current = null;
      setDrawing(false);

      const minLon = Math.min(startLngLat[0], endLngLat.lng);
      const maxLon = Math.max(startLngLat[0], endLngLat.lng);
      const minLat = Math.min(startLngLat[1], endLngLat.lat);
      const maxLat = Math.max(startLngLat[1], endLngLat.lat);

      const size = (maxLon - minLon) * (maxLat - minLat);
      if (size < 0.000001) return; // too small, ignore

      // Check area isn't too large (rough 5km² limit)
      const approxKm2 = ((maxLon - minLon) * 111) * ((maxLat - minLat) * 111);
      if (approxKm2 > 4) {
        alert('Selected area is too large. Please select a smaller area (< ~2km × 2km).');
        return;
      }

      setHasSelection(true);

      // Draw bbox on map
      if (map.getLayer('bbox-fill')) map.removeLayer('bbox-fill');
      if (map.getLayer('bbox-line')) map.removeLayer('bbox-line');
      if (map.getSource('bbox')) map.removeSource('bbox');

      map.addSource('bbox', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [minLon, minLat], [maxLon, minLat],
              [maxLon, maxLat], [minLon, maxLat], [minLon, minLat],
            ]],
          },
          properties: {},
        },
      });
      map.addLayer({ id: 'bbox-fill', type: 'fill', source: 'bbox', paint: { 'fill-color': '#00e5ff', 'fill-opacity': 0.1 } });
      map.addLayer({ id: 'bbox-line', type: 'line', source: 'bbox', paint: { 'line-color': '#00e5ff', 'line-width': 2 } });

      onBboxSelected({ minLat, maxLat, minLon, maxLon });
    },
    [drawing, startLngLat, onBboxSelected]
  );

  return (
    <div className="map-panel">
      <div className="map-header">
        <span className="panel-title">Map Selection</span>
        <span className="map-hint">
          {isLoading ? '⏳ Loading...' : drawing ? 'Release to select area' : 'Drag to select an area'}
        </span>
      </div>
      <div
        ref={containerRef}
        className="map-container"
        style={{ cursor: isLoading ? 'wait' : drawing ? 'crosshair' : 'crosshair' }}
        onMouseDown={startDraw}
        onMouseMove={onMouseMove}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
      />
    </div>
  );
};
