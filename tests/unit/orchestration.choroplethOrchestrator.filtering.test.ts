import { ChoroplethOrchestrator } from "../../src/orchestration/ChoroplethOrchestrator";
import { LegendService } from "../../src/services/LegendService";
import { ChoroplethDataService } from "../../src/services/ChoroplethDataService";
import { CacheService } from "../../src/services/CacheService";

// Minimal stubs to run orchestrator without OL/D3
function createStubSelection() {
  return {
    select: (_: string) => ({
      selectAll: () => ({ remove: () => ({}) })
    }),
  } as any;
}

// Mock layers to avoid OpenLayers imports
jest.mock("../../src/layers/choroplethLayer", () => ({
  ChoroplethLayer: jest.fn().mockImplementation(() => ({
    setSelectedIds: jest.fn(),
    getFeaturesExtent: jest.fn().mockReturnValue([0,0,1,1])
  }))
}));
jest.mock("../../src/layers/canvas/choroplethCanvasLayer", () => ({
  ChoroplethCanvasLayer: jest.fn().mockImplementation(() => ({
    getFeaturesExtent: jest.fn().mockReturnValue([0,0,1,1])
  }))
}));
jest.mock("../../src/layers/webgl/choroplethWebGLLayer", () => ({
  ChoroplethWebGLLayer: jest.fn().mockImplementation(() => ({
    getFeaturesExtent: jest.fn().mockReturnValue([0,0,1,1])
  }))
}));

const mockHost: any = {
  displayWarningIcon: jest.fn(),
  createSelectionIdBuilder: () => ({
    withCategory: () => ({ withMeasure: () => ({ createSelectionId: () => ({}) }) })
  })
};
const mockMap: any = { addLayer: jest.fn(), removeLayer: jest.fn(), getView: () => ({ fit: jest.fn() }) };
const mockSelMgr: any = { registerOnSelectCallback: jest.fn() };
const mockTooltip: any = {};

// We'll mock the instance method in each test to assert arguments

function makeOrchestrator(cacheServiceOverride?: any) {
  const svgOverlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const svg = createStubSelection();
  const svgContainer = document.createElement('div');
  const legendService = new LegendService(svgContainer);
  const cacheService = cacheServiceOverride || new CacheService();
  return new ChoroplethOrchestrator({
    svg,
    svgOverlay,
    svgContainer,
    legendService,
    host: mockHost,
    map: mockMap,
    selectionManager: mockSelMgr,
    tooltipServiceWrapper: mockTooltip,
    cacheService
  } as any);
}

describe('ChoroplethOrchestrator filtering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes validPCodes to processGeoData (filters out empty codes)', async () => {
    // Mock fetch to return simple GeoJSON
  (global as any).fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({
      type: 'FeatureCollection', features: [
        { type: 'Feature', properties: { GID: 'A' }, geometry: { type: 'Polygon', coordinates: [] } },
        { type: 'Feature', properties: { GID: '' }, geometry: { type: 'Polygon', coordinates: [] } },
      ]
    })});

    const cacheStub = { getOrFetch: jest.fn().mockResolvedValue({ type: 'FeatureCollection', features: [
      { type: 'Feature', properties: { GID: 'A' }, geometry: { type: 'Polygon', coordinates: [] } },
      { type: 'Feature', properties: { GID: '' }, geometry: { type: 'Polygon', coordinates: [] } },
    ] }) };
    const orch = makeOrchestrator(cacheStub as any);
  const ds = new ChoroplethDataService({
      getColorRamp: () => ['#000'], generateColorRamp: () => ['#000'], invertRamp: () => {}
    } as any, mockHost);
  const pgMock = jest.fn().mockImplementation((data: any, key: string, valid: string[]) => ({
    originalGeojson: { type: 'FeatureCollection', features: [] },
    filteredByBest: { type: 'FeatureCollection', features: [] },
    filteredByOriginal: { type: 'FeatureCollection', features: [] },
    usedPcodeKey: null,
    bestCount: 0,
    originalCount: 0
  }));
  // Override instance method to capture args
  (ds as any).processGeoData = pgMock;

    const categorical = {
      categories: [ { values: ['A', '', null], source: { roles: { AdminPCodeNameID: true } } } ],
      values: [ { values: [1,2,3], source: { roles: { Color: true }, queryName: 'm' } } ]
    };

    const options: any = {
      layerControl: true,
      boundaryDataSource: 'custom',
      topoJSON_geoJSON_FileUrl: 'https://example.com/bounds.geo.json',
      locationPcodeNameId: 'GID',
      classificationMethod: 'q', classes: 5, strokeColor: '#000', strokeWidth: 1, layerOpacity: 1
    };

    await orch.render(categorical as any, options as any, ds as any, { lockMapExtent: true } as any);

    // Expect processGeoData to have received validPCodes without empty/null
  expect(pgMock).toHaveBeenCalled();
  const passedValid = pgMock.mock.calls[0][2];
    expect(passedValid).toEqual(['A']);
  });

  it('blocks custom URL with open redirect parameter', async () => {
    const origFetch = (global as any).fetch;
    (global as any).fetch = jest.fn();

    const orch = makeOrchestrator();
    const ds = new ChoroplethDataService({
      getColorRamp: () => ['#000'], generateColorRamp: () => ['#000'], invertRamp: () => {}
    } as any, mockHost);

    const categorical = {
      categories: [ { values: ['A'], source: { roles: { AdminPCodeNameID: true } } } ],
      values: [ { values: [1], source: { roles: { Color: true }, queryName: 'm' } } ]
    };
    const options: any = {
      layerControl: true,
      boundaryDataSource: 'custom',
      topoJSON_geoJSON_FileUrl: 'https://example.com/a?redirect=https://evil.com',
      locationPcodeNameId: 'GID',
      classificationMethod: 'q', classes: 5, strokeColor: '#000', strokeWidth: 1, layerOpacity: 1
    };
    await orch.render(categorical as any, options as any, ds as any, { lockMapExtent: true } as any);
    expect(mockHost.displayWarningIcon).toHaveBeenCalled();
    expect((global as any).fetch).not.toHaveBeenCalled();
    (global as any).fetch = origFetch;
  });
});
