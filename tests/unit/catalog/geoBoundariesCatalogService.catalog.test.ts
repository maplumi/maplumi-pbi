import { describe, it, expect } from '@jest/globals';
// @ts-ignore
import { GeoBoundariesCatalogService } from '../../../src/services/GeoBoundariesCatalogService';
// @ts-ignore
import { VisualConfig } from '../../../src/config/VisualConfig';
function setCat(c:any){ (GeoBoundariesCatalogService as any).lastCatalog=c; }
describe('GeoBoundariesCatalogService', () => {
  it('default ADM0 when ALL', ()=>{ setCat(null); const items=GeoBoundariesCatalogService.getAdminLevelItemsSync('ALL'); expect(items[0].value).toBe('ADM0');});
  it('resolves url sync', ()=>{ const base=VisualConfig.GEOBOUNDARIES.MANIFEST_URL.replace(/index\.json$/i,''); setCat({ entries:[{release:'gbopen',iso3:'KEN',level:'admin1',relPath:'data/ken_admin1.json'}]}); const url=GeoBoundariesCatalogService.resolveTopoJsonUrlSync('gbOpen','KEN','ADM1'); expect(url).toContain(base);});
});