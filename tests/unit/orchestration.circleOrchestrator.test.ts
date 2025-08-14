import { CircleOrchestrator } from "../../src/orchestration/CircleOrchestrator";
import { LegendService } from "../../src/services/LegendService";
import { ChoroplethDataService } from "../../src/services/ChoroplethDataService";
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

// Mock CircleLayer to avoid importing OpenLayers ESM in unit tests
jest.mock("../../src/layers/circleLayer", () => ({
  CircleLayer: jest.fn().mockImplementation(() => ({
    setSelectedIds: jest.fn(),
    setActive: jest.fn(),
    getFeaturesExtent: jest.fn().mockReturnValue([0, 0, 1, 1])
  }))
}));

// Minimal stubs/mocks
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

const legendContainer = global.document.createElement("div");
const legendService = new LegendService(legendContainer);

function makeOrchestrator() {
  const svgOverlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const svg = createStubSelection();
  const svgContainer = global.document.createElement('div');
  return new CircleOrchestrator({
    svg,
    svgOverlay,
    svgContainer,
    legendService,
    host: mockHost,
    map: mockMap,
    selectionManager: mockSelMgr,
    tooltipServiceWrapper: mockTooltip
  });
}

describe("CircleOrchestrator edge cases", () => {
  test("returns undefined and warns when layer disabled", () => {
    const orch = makeOrchestrator();
    const result = orch.render(
      { categories: [], values: [] },
      { layerControl: false } as any,
      new ChoroplethDataService({} as any, mockHost),
      { lockMapExtent: false } as any,
      false
    );
    expect(result).toBeUndefined();
  });

  test("warns and returns undefined when Longitude/Latitude missing", () => {
    const orch = makeOrchestrator();
    const dataService = new ChoroplethDataService({} as any, mockHost);
    const categorical = { categories: [], values: [] };
    const options: any = { layerControl: true, minRadius: 3, maxRadius: 30, showLegend: false };
    const res = orch.render(categorical, options, dataService, { lockMapExtent: false } as any, false);
    expect(res).toBeUndefined();
    expect(mockHost.displayWarningIcon).toHaveBeenCalled();
  });
});
