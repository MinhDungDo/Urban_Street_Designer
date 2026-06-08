import { fetchOSMData, type BoundingBox } from '../gis/OverpassService';
import { OSMImporter } from '../gis/OSMImporter';
import { computeOriginFromBbox } from '../utils/projection';
import { useUrbanStore } from '../store/UrbanDesignerStore';

export async function importArea(bbox: BoundingBox): Promise<void> {
  const store = useUrbanStore.getState();

  store.setStatus('loading', 'Fetching OpenStreetMap data...');
  store.setBbox(bbox);

  try {
    const rawData = await fetchOSMData(bbox);

    store.setStatus('loading', 'Parsing OSM data...');

    const origin = computeOriginFromBbox(bbox.minLat, bbox.maxLat, bbox.minLon, bbox.maxLon);
    store.setProjectionOrigin(origin);

    const importer = new OSMImporter();
    const { roads, buildings, trees } = importer.parse(rawData, origin);

    store.setSceneData(roads, buildings, trees);
    store.setStatus(
      'loaded',
      `Loaded ${roads.length} roads, ${buildings.length} buildings, ${trees.length} trees.`
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    store.setStatus('error', `Import failed: ${message}`);
    throw err;
  }
}
