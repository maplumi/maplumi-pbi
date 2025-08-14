import { ChoroplethOrchestrator } from "../../src/orchestration/ChoroplethOrchestrator";
import { LegendService } from "../../src/services/LegendService";
import { ChoroplethDataService } from "../../src/services/ChoroplethDataService";
import { CacheService } from "../../src/services/cacheService";
// Avoid importing d3 ESM in tests; create a tiny stub selection instead
function createStubSelection() {
  return {
    select: (_: string) => ({
      selectAll: () => ({ remove: () => {} })
    }),
    append: (_: string) => ({ attr: () => ({}) }),
    attr: () => ({})
  } as any;
}

// Mock ChoroplethLayer to avoid importing OpenLayers ESM in unit tests
jest.mock("../../src/layers/choroplethLayer", () => ({
  ChoroplethLayer: jest.fn().mockImplementation(() => ({
    setSelectedIds: jest.fn(),
    setActive: jest.fn(),
    getFeaturesExtent: jest.fn().mockReturnValue([0, 0, 1, 1])
  }))
}));

const mockHost: any = {
  displayWarningIcon: jest.fn(),
  createSelectionIdBuilder: () => ({
    withCategory: () => ({
      withMeasure: () => ({ createSelectionId: () => ({}) })
    })
  })
};

const mockMap: any = { addLayer: jest.fn(), removeLayer: jest.fn(), getView: () => ({ fit: jest.fn() }) };
const mockSelMgr: any = { registerOnSelectCallback: jest.fn() };
const mockTooltip: any = {};

function makeOrchestrator() {
  const svgOverlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const svg = createStubSelection();
  const svgContainer = global.document.createElement('div');
  const legendService = new LegendService(svgContainer);
  const cacheService = new CacheService();
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
  });
}

describe("ChoroplethOrchestrator edge cases", () => {
  test("returns undefined and warns when measures missing", async () => {
    const orch = makeOrchestrator();
    const result = await orch.render(
      { categories: [], values: [] },
      { layerControl: true } as any,
      new ChoroplethDataService({} as any, mockHost),
      { lockMapExtent: false } as any
    );
    expect(result).toBeUndefined();
    expect(mockHost.displayWarningIcon).toHaveBeenCalled();
  });

  test("returns undefined and warns when PCodes empty", async () => {
    const orch = makeOrchestrator();
    const dataService = new ChoroplethDataService({} as any, mockHost);
    const categorical = {
      categories: [
        { values: [], source: { roles: { AdminPCodeNameID: true } } }
      ],
      values: [
        { values: [1, 2], source: { roles: { Color: true }, queryName: "m" } }
      ]
    };
    const options: any = { layerControl: true, classificationMethod: "q", classes: 5, strokeColor: "#000", strokeWidth: 1, layerOpacity: 1, locationPcodeNameId: "GID" };
    const res = await orch.render(categorical, options, dataService, { lockMapExtent: false } as any);
    expect(res).toBeUndefined();
    expect(mockHost.displayWarningIcon).toHaveBeenCalled();
  });
});
