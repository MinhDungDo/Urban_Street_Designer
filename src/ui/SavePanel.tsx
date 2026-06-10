import React, { useState } from 'react';
import { useUrbanStore } from '../store/UrbanDesignerStore';
import type { SavedDesign } from '../store/UrbanDesignerStore';

interface SavePanelProps {
  onLoad: () => void;
  onExportScreenshot: () => void;
}

export const SavePanel: React.FC<SavePanelProps> = ({ onLoad, onExportScreenshot }) => {
  const { status, exportJSON, saveToLocalStorage, loadFromLocalStorage, listSavedDesigns, deleteSavedDesign } = useUrbanStore();
  const [name, setName] = useState('');
  const [saves, setSaves] = useState<SavedDesign[]>(() => listSavedDesigns());

  const refresh = () => setSaves(listSavedDesigns());

  const handleSave = () => {
    const trimmed = name.trim() || `Design ${new Date().toLocaleString()}`;
    saveToLocalStorage(trimmed);
    setName('');
    refresh();
  };

  const handleLoad = (id: string) => {
    loadFromLocalStorage(id);
    onLoad();
  };

  const handleDelete = (id: string) => {
    deleteSavedDesign(id);
    refresh();
  };

  const handleExportJSON = () => {
    const json = exportJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `urban-design-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="inspector">
      <div className="inspector-section">
        <div className="section-title">Save Design</div>
        <div className="field">
          <input
            className="text-input"
            type="text"
            placeholder="Design name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={handleSave}
          disabled={status !== 'loaded'}
        >
          Save to browser
        </button>
      </div>

      <div className="inspector-section">
        <div className="section-title">Export</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={handleExportJSON} disabled={status !== 'loaded'}>
            Export JSON
          </button>
          <button className="btn btn-ghost btn-sm" onClick={onExportScreenshot} disabled={status !== 'loaded'}>
            Export Screenshot
          </button>
        </div>
      </div>

      {saves.length > 0 && (
        <div className="inspector-section">
          <div className="section-title">Saved Designs</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {saves.map((d) => (
              <div key={d.id} className="save-item">
                <div className="save-item-info">
                  <span className="save-item-name">{d.name}</span>
                  <span className="save-item-date">{new Date(d.savedAt).toLocaleDateString()}</span>
                </div>
                <div className="save-item-actions">
                  <button className="btn btn-ghost btn-xs" onClick={() => handleLoad(d.id)}>Load</button>
                  <button className="btn btn-ghost btn-xs btn-danger" onClick={() => handleDelete(d.id)}>✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
