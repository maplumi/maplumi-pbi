// Moved from root: orchestration.choroplethOrchestrator.filtering.test.ts
import { ChoroplethOrchestrator } from "../../../src/orchestration/ChoroplethOrchestrator";
import { LegendService } from "../../../src/services/LegendService";
import { ChoroplethDataService } from "../../../src/services/ChoroplethDataService";
import { CacheService } from "../../../src/services/CacheService";
import { ClassificationMethods } from "../../../src/constants/strings";

function createStubSelection() {
  return { select: (_: string) => ({ selectAll: () => ({ remove: () => ({}) }) }) } as any;
}

jest.mock("../../../src/layers/choroplethLayer", () => ({
  ChoroplethLayer: jest.fn().mockImplementation(() => ({ setSelectedIds: jest.fn(), getFeaturesExtent: jest.fn().mockReturnValue([0,0,1,1]) }))
}));
jest.mock("../../../src/layers/canvas/choroplethCanvasLayer", () => ({
  ChoroplethCanvasLayer: jest.fn().mockImplementation(() => ({ getFeaturesExtent: jest.fn().mockReturnValue([0,0,1,1]) }))
}));
jest.mock("../../../src/layers/webgl/choroplethWebGLLayer", () => ({
  ChoroplethWebGLLayer: jest.fn().mockImplementation(() => ({ getFeaturesExtent: jest.fn().mockReturnValue([0,0,1,1]) }))
}));

const mockHost: any = { displayWarningIcon: jest.fn(), createSelectionIdBuilder: () => ({ withCategory: () => ({ withMeasure: () => ({ createSelectionId: () => ({}) }) }) }) };
const mockMap: any = { addLayer: jest.fn(), removeLayer: jest.fn(), getView: () => ({ fit: jest.fn() }) };
const mockSelMgr: any = { registerOnSelectCallback: jest.fn() };
const mockTooltip: any = {};

function makeOrchestrator(cacheServiceOverride?: any) {
  const svgOverlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const svg = createStubSelection();
  const svgContainer = document.createElement('div');
  const legendService = new LegendService(svgContainer);
  const cacheService = cacheServiceOverride || new CacheService();
  return new ChoroplethOrchestrator({ svg, svgOverlay, svgContainer, legendService, host: mockHost, map: mockMap, selectionManager: mockSelMgr, tooltipServiceWrapper: mockTooltip, cacheService } as any);
}

describe('ChoroplethOrchestrator filtering', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('passes validPCodes to processGeoData (filters out empty codes)', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ type: 'FeatureCollection', features: [ { type: 'Feature', properties: { GID: 'A' }, geometry: { type: 'Polygon', coordinates: [] } }, { type: 'Feature', properties: { GID: '' }, geometry: { type: 'Polygon', coordinates: [] } } ] }) });
    const cacheStub = { getOrFetch: jest.fn().mockResolvedValue({ type: 'FeatureCollection', features: [ { type: 'Feature', properties: { GID: 'A' }, geometry: { type: 'Polygon', coordinates: [] } }, { type: 'Feature', properties: { GID: '' }, geometry: { type: 'Polygon', coordinates: [] } } ] }) };
    const orch = makeOrchestrator(cacheStub as any);
    const ds = new ChoroplethDataService({ getColorRamp: () => ['#000'], generateColorRamp: () => ['#000'], invertRamp: () => {} } as any, mockHost);
    const pgMock = jest.fn().mockImplementation(() => ({ originalGeojson: { type: 'FeatureCollection', features: [] }, filteredByBest: { type: 'FeatureCollection', features: [] }, filteredByOriginal: { type: 'FeatureCollection', features: [] }, usedPcodeKey: null, bestCount: 0, originalCount: 0 }));
    (ds as any).processGeoData = pgMock;
    const categorical = { categories: [ { values: ['A', '', null], source: { roles: { AdminPCodeNameID: true } } } ], values: [ { values: [1,2,3], source: { roles: { Color: true }, queryName: 'm' } } ] };
    const options: any = { layerControl: true, boundaryDataSource: 'custom', topoJSON_geoJSON_FileUrl: 'https://example.com/bounds.geo.json', locationPcodeNameId: 'GID', classificationMethod: 'q', classes: 5, strokeColor: '#000', strokeWidth: 1, layerOpacity: 1 };
    await orch.render(categorical as any, options as any, ds as any, { lockMapExtent: true } as any);
    expect(pgMock).toHaveBeenCalled();
    const passedValid = pgMock.mock.calls[0][2];
    expect(passedValid).toEqual(['A']);
  });

  it('blocks custom URL with open redirect parameter', async () => {
    const origFetch = (global as any).fetch; (global as any).fetch = jest.fn();
    const orch = makeOrchestrator();
    const ds = new ChoroplethDataService({ getColorRamp: () => ['#000'], generateColorRamp: () => ['#000'], invertRamp: () => {} } as any, mockHost);
    const categorical = { categories: [ { values: ['A'], source: { roles: { AdminPCodeNameID: true } } } ], values: [ { values: [1], source: { roles: { Color: true }, queryName: 'm' } } ] };
    const options: any = { layerControl: true, boundaryDataSource: 'custom', topoJSON_geoJSON_FileUrl: 'https://example.com/a?redirect=https://evil.com', locationPcodeNameId: 'GID', classificationMethod: 'q', classes: 5, strokeColor: '#000', strokeWidth: 1, layerOpacity: 1 };
    await orch.render(categorical as any, options as any, ds as any, { lockMapExtent: true } as any);
    expect(mockHost.displayWarningIcon).toHaveBeenCalled();
    expect((global as any).fetch).not.toHaveBeenCalled();
    (global as any).fetch = origFetch;
  });
});

describe('ChoroplethOrchestrator unique classification palette handling', () => {
  const palette = ["#c1", "#c2", "#c3", "#c4", "#c5", "#c6", "#c7"];

  function buildCategorical(values: number[]) {
    return {
      categories: [
        {
          values: ["A", "B", "C", "D", "E"].slice(0, values.length),
          source: { roles: { AdminPCodeNameID: true } },
        },
      ],
      values: [
        {
          values,
          source: { roles: { Color: true }, queryName: "measure" },
        },
      ],
    };
  }

  function buildOptions(classes = 5): any {
    return {
      classificationMethod: ClassificationMethods.Unique,
      classes,
      showLegend: true,
      layerOpacity: 1,
      locationPcodeNameId: "GID",
    };
  }

  function buildDataService() {
    return {
      getClassBreaks: jest.fn((vals: number[]) => vals),
      getColorScale: jest.fn(() => palette.slice()),
      extractTooltips: jest.fn((categorical: any) => (categorical.categories[0].values as any[]).map(() => [])),
    } as any;
  }

  function prepareUniquePalette(
    orchestrator: ChoroplethOrchestrator,
    values: number[],
    dataService: any,
    classes = 5
  ) {
    const categorical: any = buildCategorical(values);
    const options = buildOptions(classes);
    const category = categorical.categories[0];
    const colorMeasure = categorical.values[0];
    const pCodes = category.values as string[];
    return (orchestrator as any).prepareChoroplethData(
      categorical,
      options,
      category,
      colorMeasure,
      pCodes,
      dataService
    );
  }

  it('reserves placeholder colors across initial numeric range', () => {
    const orchestrator = makeOrchestrator();
    const dataService = buildDataService();
    const result = prepareUniquePalette(orchestrator, [3, 4, 5], dataService, 5);

    expect(result.classBreaks).toEqual([3, 4, 5]);
    expect(result.colorScale).toEqual([palette[0], palette[1], palette[2]]);

    const stableOrder = (orchestrator as any).categoricalStableOrder;
    expect(stableOrder).toEqual([3, 4, 5, 6, 7]);

    const colorMap: Map<number, string> = (orchestrator as any).categoricalColorMap;
    expect(colorMap.get(3)).toBe(palette[0]);
    expect(colorMap.get(4)).toBe(palette[1]);
    expect(colorMap.get(5)).toBe(palette[2]);

    const numericRange = (orchestrator as any).numericPlaceholderRange;
    expect(numericRange).toEqual({ start: 3, slots: 5 });
  });

  it('reuses reserved color when a missing value appears inside the range', () => {
    const orchestrator = makeOrchestrator();
    const dataService = buildDataService();
    prepareUniquePalette(orchestrator, [3, 4, 5], dataService, 5);
    const result = prepareUniquePalette(orchestrator, [3, 4, 5, 6], dataService, 5);

    expect(result.classBreaks).toEqual([3, 4, 5, 6]);
    expect(result.colorScale).toEqual([palette[0], palette[1], palette[2], palette[3]]);

    const colorMap: Map<number, string> = (orchestrator as any).categoricalColorMap;
    expect(colorMap.get(6)).toBe(palette[3]);

    const numericRange = (orchestrator as any).numericPlaceholderRange;
    expect(numericRange).toEqual({ start: 3, slots: 5 });
  });

  it('recomputes palette window when new values extend outside reserved range', () => {
    const orchestrator = makeOrchestrator();
    const dataService = buildDataService();
    prepareUniquePalette(orchestrator, [3, 4, 5], dataService, 5);
    const result = prepareUniquePalette(orchestrator, [2, 3, 4, 5, 6], dataService, 5);

    expect(result.classBreaks).toEqual([2, 3, 4, 5, 6]);
    expect(result.colorScale).toEqual([palette[0], palette[1], palette[2], palette[3], palette[4]]);

    const stableOrder = (orchestrator as any).categoricalStableOrder;
    expect(stableOrder).toEqual([2, 3, 4, 5, 6]);

    const numericRange = (orchestrator as any).numericPlaceholderRange;
    expect(numericRange).toEqual({ start: 2, slots: 5 });
  });
});
