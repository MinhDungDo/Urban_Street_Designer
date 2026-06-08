import React from 'react';
import { useUrbanStore } from '../store/UrbanDesignerStore';
import type { RoadSegment } from '../domain/RoadSegment';
import { computeRoadTotalWidth } from '../domain/RoadSegment';

interface FieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  unit?: string;
}

const NumericField: React.FC<FieldProps> = ({ label, value, min, max, step, onChange, unit = 'm' }) => (
  <div className="field">
    <div className="field-header">
      <span className="field-label">{label}</span>
      <span className="field-value">{value.toFixed(1)}{unit}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
    />
  </div>
);

interface InspectorPanelProps {
  onRoadChanged: (road: RoadSegment) => void;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({ onRoadChanged }) => {
  const { roads, selectedRoadId, updateRoad } = useUrbanStore();
  const road = roads.find((r) => r.id === selectedRoadId) ?? null;

  const update = (partial: Partial<RoadSegment>) => {
    if (!road) return;
    updateRoad(road.id, partial);
    // Notify parent that rebuild is needed
    const updated = { ...road, ...partial };
    onRoadChanged(updated);
  };

  if (!road) {
    return (
      <div className="inspector-empty">
        <div className="inspector-hint">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9 20H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4"/>
            <path d="m13 13 4 4m0 0 4-4m-4 4V11"/>
          </svg>
          <p>Click a road in the 3D view to inspect and edit its properties</p>
        </div>
      </div>
    );
  }

  const totalWidth = computeRoadTotalWidth(road);

  return (
    <div className="inspector">
      <div className="inspector-header">
        <div className="road-type-badge">{road.roadType}</div>
        <h3 className="road-name">{road.name}</h3>
        <div className="road-total-width">Total width: {totalWidth.toFixed(1)}m</div>
      </div>

      <div className="inspector-section">
        <div className="section-title">Lanes</div>
        <div className="field">
          <div className="field-header">
            <span className="field-label">Lane Count</span>
            <span className="field-value">{road.laneCount}</span>
          </div>
          <input
            type="range"
            min={1}
            max={8}
            step={1}
            value={road.laneCount}
            onChange={(e) => update({ laneCount: parseInt(e.target.value) })}
          />
          <div className="lane-dots">
            {Array.from({ length: road.laneCount }).map((_, i) => (
              <div key={i} className="lane-dot" />
            ))}
          </div>
        </div>

        <NumericField
          label="Lane Width"
          value={road.laneWidth}
          min={2.0}
          max={5.0}
          step={0.25}
          onChange={(v) => update({ laneWidth: v })}
        />
      </div>

      <div className="inspector-section">
        <div className="section-title">Bike Infrastructure</div>
        <div className="toggle-row">
          <span className="field-label">Bike Lanes</span>
          <button
            className={`toggle ${road.bikeLaneEnabled ? 'on' : 'off'}`}
            onClick={() => update({ bikeLaneEnabled: !road.bikeLaneEnabled })}
          >
            {road.bikeLaneEnabled ? 'ON' : 'OFF'}
          </button>
        </div>
        {road.bikeLaneEnabled && (
          <NumericField
            label="Bike Lane Width"
            value={road.bikeLaneWidth}
            min={0.5}
            max={3.0}
            step={0.25}
            onChange={(v) => update({ bikeLaneWidth: v })}
          />
        )}
      </div>

      <div className="inspector-section">
        <div className="section-title">Sidewalks</div>
        <NumericField
          label="Left Sidewalk"
          value={road.sidewalkLeftWidth}
          min={0}
          max={8}
          step={0.5}
          onChange={(v) => update({ sidewalkLeftWidth: v })}
        />
        <NumericField
          label="Right Sidewalk"
          value={road.sidewalkRightWidth}
          min={0}
          max={8}
          step={0.5}
          onChange={(v) => update({ sidewalkRightWidth: v })}
        />
      </div>

      <div className="inspector-section">
        <div className="section-title">Width Breakdown</div>
        <div className="width-bar">
          <div className="wb-seg wb-sidewalk" style={{ flex: road.sidewalkLeftWidth }}>
            <span>{road.sidewalkLeftWidth}m</span>
          </div>
          {road.bikeLaneEnabled && (
            <div className="wb-seg wb-bike" style={{ flex: road.bikeLaneWidth }}>
              <span>{road.bikeLaneWidth}m</span>
            </div>
          )}
          <div className="wb-seg wb-road" style={{ flex: road.laneCount * road.laneWidth }}>
            <span>{(road.laneCount * road.laneWidth).toFixed(1)}m</span>
          </div>
          {road.bikeLaneEnabled && (
            <div className="wb-seg wb-bike" style={{ flex: road.bikeLaneWidth }}>
              <span>{road.bikeLaneWidth}m</span>
            </div>
          )}
          <div className="wb-seg wb-sidewalk" style={{ flex: road.sidewalkRightWidth }}>
            <span>{road.sidewalkRightWidth}m</span>
          </div>
        </div>
        <div className="width-labels">
          <span>SW</span>
          {road.bikeLaneEnabled && <span>Bike</span>}
          <span>Road</span>
          {road.bikeLaneEnabled && <span>Bike</span>}
          <span>SW</span>
        </div>
      </div>
    </div>
  );
};
