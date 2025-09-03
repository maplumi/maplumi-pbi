import { describe, it, expect } from '@jest/globals';
// @ts-ignore internal import
import { GeoBoundariesCatalogService } from '../../src/services/GeoBoundariesCatalogService';
// @ts-ignore internal import
import { VisualConfig } from '../../src/config/VisualConfig';

// Monkey patch private lastCatalog for sync methods
function setCatalog(data:any) {
  (GeoBoundariesCatalogService as any).lastCatalog = data;
}

describe('GeoBoundariesCatalogService admin level & URL resolution', () => {
  it('returns default ADM0 for ALL country sync', () => {
    setCatalog(null);
    const items = GeoBoundariesCatalogService.getAdminLevelItemsSync('ALL');
    expect(items[0].value).toBe('ADM0');
  });

  it('filters out ADM0 for single country with levels and builds label map', () => {
    setCatalog({ countries: [{ iso3:'KEN', name:'Kenya', levels:['ADM0','ADM1','ADM2'] }] });
    const items = GeoBoundariesCatalogService.getAdminLevelItemsSync('KEN');
    expect(items.find(i=>i.value==='ADM0')).toBeFalsy();
    expect(items.some(i=>i.value==='ADM1')).toBe(true);
  });

  it('resolves topojson URL sync from catalog entries', () => {
    const base = VisualConfig.GEOBOUNDARIES.MANIFEST_URL.replace(/index\.json$/i,'');
    setCatalog({ entries:[{ release:'gbopen', iso3:'KEN', level:'admin1', relPath:'data/ken_admin1.json' }] });
    const url = GeoBoundariesCatalogService.resolveTopoJsonUrlSync('gbOpen','KEN','ADM1');
    expect(url).toContain('ken_admin1.json');
    expect(url).toContain(base);
  });
});
