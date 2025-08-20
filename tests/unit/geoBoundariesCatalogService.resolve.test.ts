import { GeoBoundariesCatalogService } from "../../src/services/GeoBoundariesCatalogService";

// Minimal in-memory catalog snapshot to simulate lastCatalog
const sampleCatalog = {
  countries: [
    { iso3: 'KEN', name: 'Kenya', levels: ['ADM0', 'ADM1', 'ADM2'] },
  ],
  // entries array under a nonstandard key to exercise extractor logic
  files: [
    { release: 'gbopen', iso3: 'KEN', level: 'admin1', relPath: 'KEN/ADM1/file.topojson' },
    { release: 'gbopen', iso3: 'KEN', level: 'admin2', relPath: 'KEN/ADM2/file.topojson' },
  ]
} as any;

const manifestBase = 'https://cdn.jsdelivr.net/gh/maplumi/geoboundaries-lite@v2025-08/data/';

describe('GeoBoundariesCatalogService.resolveTopoJsonUrlSync', () => {
  beforeAll(() => {
    // @ts-ignore – inject the snapshot directly for tests
    GeoBoundariesCatalogService["lastCatalog"] = sampleCatalog;
  });

  it('resolves URL for given release/iso3/admin level', () => {
    const url = GeoBoundariesCatalogService.resolveTopoJsonUrlSync('gbOpen', 'KEN', 'ADM1');
    expect(url).toBe(`${manifestBase}KEN/ADM1/file.topojson`);
  });

  it('returns null when entry not found', () => {
    const url = GeoBoundariesCatalogService.resolveTopoJsonUrlSync('gbOpen', 'KEN', 'ADM3');
    expect(url).toBeNull();
  });

  it('accepts already absolute relPath', () => {
    // @ts-ignore
    const original = GeoBoundariesCatalogService["lastCatalog"]; 
    // Provide an absolute URL entry
    const absoluteCatalog = { ...sampleCatalog, files: [ { release: 'gbopen', iso3: 'KEN', level: 'admin1', relPath: 'https://example.com/x.topojson' } ] } as any;
    // @ts-ignore
    GeoBoundariesCatalogService["lastCatalog"] = absoluteCatalog;

    const url = GeoBoundariesCatalogService.resolveTopoJsonUrlSync('gbOpen', 'KEN', 'ADM1');
    expect(url).toBe('https://example.com/x.topojson');

    // restore
    // @ts-ignore
    GeoBoundariesCatalogService["lastCatalog"] = original;
  });
});
