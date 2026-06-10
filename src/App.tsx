import React, { useState, useCallback, useRef } from 'react';
import { MapPanel } from './ui/MapPanel';
import { BabylonViewport } from './ui/BabylonViewport';
import { InspectorPanel } from './ui/InspectorPanel';
import { CostPanel } from './ui/CostPanel';
import { SavePanel } from './ui/SavePanel';
import { useUrbanStore } from './store/UrbanDesignerStore';
import { importArea } from './editor/ImportService';
import type { BoundingBox } from './gis/OverpassService';
import type { RoadSegment } from './domain/RoadSegment';
import { SceneManager } from './babylon/SceneManager';
import './App.css';

type RightTab = 'inspector' | 'cost' | 'save';

export const App: React.FC = () => {
  const { activeTab, setActiveTab, status, statusMessage, logs, reset } = useUrbanStore();
  const [showLogs, setShowLogs] = useState(false);
  const [pendingBbox, setPendingBbox] = useState<BoundingBox | null>(null);
  const [rebuildTrigger, setRebuildTrigger] = useState<{ roadId: string; road: RoadSegment } | null>(null);
  const [rightTab, setRightTab] = useState<RightTab>('inspector');
  const sceneManagerRef = useRef<SceneManager | null>(null);

  const handleBboxSelected = useCallback((bbox: BoundingBox) => {
    setPendingBbox(bbox);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!pendingBbox) return;
    try {
      await importArea(pendingBbox);
      setActiveTab('editor');
    } catch { /* error set in store */ }
  }, [pendingBbox, setActiveTab]);

  const handleRoadChanged = useCallback((road: RoadSegment) => {
    setRebuildTrigger({ roadId: road.id, road });
  }, []);

  const handleReset = useCallback(() => {
    reset();
    setPendingBbox(null);
    setRebuildTrigger(null);
    setActiveTab('map');
  }, [reset, setActiveTab]);

  const handleScreenshot = useCallback(async () => {
    if (!sceneManagerRef.current) return;
    const data = await sceneManagerRef.current.captureScreenshot();
    const a = document.createElement('a');
    a.href = data;
    a.download = `urban-design-${Date.now()}.png`;
    a.click();
  }, []);

  const handleLoadDesign = useCallback(() => {
    setActiveTab('editor');
  }, [setActiveTab]);

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="app-header">
        <div className="header-brand">
          <svg className="brand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
          </svg>
          <span className="brand-name">Urban Street Designer</span>
          <span className="brand-tag">MVP</span>
        </div>

        {/* Main tabs */}
        <nav className="main-tabs">
          <button
            className={`main-tab ${activeTab === 'map' ? 'active' : ''}`}
            onClick={() => setActiveTab('map')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
            Map Selection
          </button>
          <button
            className={`main-tab ${activeTab === 'editor' ? 'active' : ''}`}
            onClick={() => setActiveTab('editor')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
            3D Editor
            {status === 'loaded' && <span className="tab-dot" />}
          </button>
        </nav>

        <div className="header-actions">
          <button className="btn btn-ghost btn-sm" onClick={handleReset}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.49"/></svg>
            Reset
          </button>
        </div>
      </header>

      {/* ── Map Tab ── */}
      <div className={`tab-content ${activeTab === 'map' ? 'visible' : 'hidden'}`}>
        <MapPanel onBboxSelected={handleBboxSelected} onGenerate={handleGenerate} />
      </div>

      {/* ── Editor Tab ── */}
      <div className={`tab-content editor-layout ${activeTab === 'editor' ? 'visible' : 'hidden'}`}>
        <main className="editor-viewport">
          <BabylonViewport rebuildTrigger={rebuildTrigger} sceneManagerRef={sceneManagerRef} />
        </main>

        <aside className="editor-sidebar">
          <div className="sidebar-tabs">
            <button className={`sidebar-tab ${rightTab === 'inspector' ? 'active' : ''}`} onClick={() => setRightTab('inspector')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              Inspector
            </button>
            <button className={`sidebar-tab ${rightTab === 'cost' ? 'active' : ''}`} onClick={() => setRightTab('cost')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              Cost
            </button>
            <button className={`sidebar-tab ${rightTab === 'save' ? 'active' : ''}`} onClick={() => setRightTab('save')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              Save
            </button>
          </div>

          <div className="sidebar-body">
            {rightTab === 'inspector' && <InspectorPanel onRoadChanged={handleRoadChanged} />}
            {rightTab === 'cost' && <CostPanel />}
            {rightTab === 'save' && <SavePanel onLoad={handleLoadDesign} onExportScreenshot={handleScreenshot} />}
          </div>
        </aside>
      </div>

      {/* ── Status Bar ── */}
      <footer className="status-bar" onClick={() => setShowLogs(true)} title="Click to view logs">
        <div className={`status-dot status-${status}`} />
        <span className="status-msg">{statusMessage}</span>
        {status === 'loaded' && (
          <span className="status-extra">
            {useUrbanStore.getState().roads.length} roads ·{' '}
            {useUrbanStore.getState().buildings.length} buildings ·{' '}
            {useUrbanStore.getState().trees.length} trees
          </span>
        )}
        <span className="status-log-hint">View logs</span>
      </footer>

      {/* ── Log Drawer ── */}
      {showLogs && (
        <div className="log-overlay" onClick={() => setShowLogs(false)}>
          <div className="log-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="log-drawer-header">
              <span>Activity Log</span>
              <button className="btn btn-ghost btn-xs" onClick={() => setShowLogs(false)}>✕</button>
            </div>
            <div className="log-drawer-body">
              {logs.length === 0 ? (
                <div className="log-empty">No activity yet.</div>
              ) : (
                logs.map((entry, i) => (
                  <div key={i} className={`log-entry log-entry-${entry.status}`}>
                    <span className="log-time">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                    <div className={`log-dot status-${entry.status}`} />
                    <span className="log-msg">{entry.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
