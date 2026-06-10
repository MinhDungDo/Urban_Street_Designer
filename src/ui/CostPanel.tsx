import React from 'react';
import { useUrbanStore, DEFAULT_PRICES } from '../store/UrbanDesignerStore';

function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

export const CostPanel: React.FC = () => {
  const { roads, trees, prices, updatePrices, computeCost } = useUrbanStore();

  if (roads.length === 0) {
    return (
      <div className="inspector-empty">
        <div className="inspector-hint">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <line x1="12" y1="1" x2="12" y2="23"/>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
          <p>Load an area to see cost estimates</p>
        </div>
      </div>
    );
  }

  const cost = computeCost();

  return (
    <div className="inspector">
      <div className="inspector-section">
        <div className="section-title">Cost Estimate</div>

        <div className="cost-row">
          <span className="field-label">Road Lanes</span>
          <span className="field-value">{fmt(cost.lanes)}</span>
        </div>
        <div className="cost-row">
          <span className="field-label">Bike Lanes</span>
          <span className="field-value">{fmt(cost.bikeLanes)}</span>
        </div>
        <div className="cost-row">
          <span className="field-label">Sidewalks</span>
          <span className="field-value">{fmt(cost.sidewalks)}</span>
        </div>
        <div className="cost-row">
          <span className="field-label">Trees ({trees.length})</span>
          <span className="field-value">{fmt(cost.trees)}</span>
        </div>
        <div className="cost-row cost-total">
          <span className="field-label">Total</span>
          <span className="field-value">{fmt(cost.total)}</span>
        </div>
      </div>

      <div className="inspector-section">
        <div className="section-title">Unit Prices</div>

        {(
          [
            { key: 'lanePerKm', label: 'Lane (per km)', min: 10000, max: 500000, step: 5000 },
            { key: 'bikeLanePerKm', label: 'Bike lane (per km)', min: 5000, max: 200000, step: 2500 },
            { key: 'sidewalkPerKm', label: 'Sidewalk (per km)', min: 5000, max: 150000, step: 2500 },
            { key: 'treePerUnit', label: 'Tree (per unit)', min: 500, max: 20000, step: 500 },
          ] as const
        ).map(({ key, label, min, max, step }) => (
          <div className="field" key={key}>
            <div className="field-header">
              <span className="field-label">{label}</span>
              <span className="field-value">{fmt(prices[key])}</span>
            </div>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={prices[key]}
              onChange={(e) => updatePrices({ [key]: parseFloat(e.target.value) })}
            />
          </div>
        ))}

        <button
          className="btn btn-ghost btn-sm"
          style={{ marginTop: '0.5rem' }}
          onClick={() => updatePrices({ ...DEFAULT_PRICES })}
        >
          Reset to defaults
        </button>
      </div>
    </div>
  );
};
