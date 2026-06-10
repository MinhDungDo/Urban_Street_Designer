import React from 'react';
import { useUrbanStore } from '../store/UrbanDesignerStore';

interface ToolbarProps {
  onReset: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ onReset }) => {
  const { status, roads, buildings, trees, exportJSON } = useUrbanStore();

  const handleExport = () => {
    const json = exportJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'urban-design-proposal.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <header className="toolbar">
      <div className="toolbar-brand">
        <svg className="brand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <path d="M9 22V12h6v10"/>
          <line x1="3" y1="9" x2="21" y2="9"/>
        </svg>
        <span className="brand-name">Urban Street Designer</span>
        <span className="brand-badge">MVP</span>
      </div>

      <div className="toolbar-stats">
        {status === 'loaded' && (
          <>
            <span className="stat"><strong>{roads.length}</strong> roads</span>
            <span className="stat"><strong>{buildings.length}</strong> buildings</span>
            <span className="stat"><strong>{trees.length}</strong> trees</span>
          </>
        )}
      </div>

      <div className="toolbar-actions">
        <button
          className="btn btn-ghost"
          onClick={onReset}
          disabled={status === 'loading'}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="1 4 1 10 7 10"/>
            <path d="M3.51 15a9 9 0 1 0 .49-3.49"/>
          </svg>
          Reset
        </button>

        <button
          className="btn btn-primary"
          onClick={handleExport}
          disabled={status !== 'loaded'}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Export JSON
        </button>
      </div>
    </header>
  );
};
