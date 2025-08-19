// Define mocks first to avoid hoisting/TDZ issues
jest.mock("../../src/layers/webgl/circleWebGLLayer", () => {
  const ctor = jest.fn().mockImplementation(() => ({
    setSelectedIds: jest.fn(),
    setActive: jest.fn(),
    getFeaturesExtent: jest.fn().mockReturnValue([0, 0, 1, 1]),
    dispose: jest.fn()
  }));
  return { CircleWebGLLayer: ctor };
});

jest.mock("../../src/layers/canvas/choroplethCanvasLayer", () => {
  const ctor = jest.fn().mockImplementation(() => ({
    setSelectedIds: jest.fn(),
    setActive: jest.fn(),
    getFeaturesExtent: jest.fn().mockReturnValue([0, 0, 1, 1]),
    dispose: jest.fn()
  }));
  return { ChoroplethCanvasLayer: ctor };
});

import { CircleOrchestrator } from "../../src/orchestration/CircleOrchestrator";
import { ChoroplethOrchestrator } from "../../src/orchestration/ChoroplethOrchestrator";
import { LegendService } from "../../src/services/LegendService";
import { CacheService } from "../../src/services/CacheService";

// Stub d3 selection for constructor wiring
function createStubSelection() {
  return {
    select: (_: string) => ({ selectAll: () => ({ remove: () => {} }) }),
    append: (_: string) => ({ attr: () => ({}) }),
    attr: () => ({})
  } as any;
}

// Grab the mocked constructors for assertions
const { CircleWebGLLayer: MockCircleWebGLLayer } = require("../../src/layers/webgl/circleWebGLLayer");
const { ChoroplethCanvasLayer: MockChoroplethCanvasLayer } = require("../../src/layers/canvas/choroplethCanvasLayer");

// Common test doubles
const mockHost: any = {
  displayWarningIcon: jest.fn(),
  createSelectionIdBuilder: () => ({
    withCategory: () => ({ withMeasure: () => ({ createSelectionId: () => ({}) }) })
  })
};
const mockMap: any = {
  addLayer: jest.fn(),
  removeLayer: jest.fn(),
  getView: () => ({ fit: jest.fn() })
};
const mockSelMgr: any = { registerOnSelectCallback: jest.fn() };
const mockTooltip: any = {};

describe("Engine selection behavior", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("CircleOrchestrator uses WebGL layer when renderEngine=webgl", () => {
    const svgOverlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const svg = createStubSelection();
    const svgContainer = global.document.createElement('div');
    const legendService = new LegendService(svgContainer);

    const orch = new CircleOrchestrator({
      svg,
      svgOverlay,
      svgContainer,
      legendService,
      host: mockHost,
      map: mockMap,
      selectionManager: mockSelMgr,
      tooltipServiceWrapper: mockTooltip
    } as any);

    // Call the private method through indexer to avoid full data pipeline
    (orch as any)["renderCircleLayerOnMap"]({} as any, { renderEngine: 'webgl', lockMapExtent: false } as any, false);

  expect(MockCircleWebGLLayer).toHaveBeenCalledTimes(1);
    expect(mockMap.addLayer).toHaveBeenCalled();
  });

  test("ChoroplethOrchestrator falls back to Canvas when renderEngine=webgl", () => {
    const svgOverlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const svg = createStubSelection();
    const svgContainer = global.document.createElement('div');
    const legendService = new LegendService(svgContainer);
    const cacheService = new CacheService();

    const orch = new ChoroplethOrchestrator({
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

    (orch as any)["renderChoroplethLayerOnMap"]({} as any, { renderEngine: 'webgl', lockMapExtent: false } as any);

  expect(MockChoroplethCanvasLayer).toHaveBeenCalledTimes(1);
    expect(mockMap.addLayer).toHaveBeenCalled();
  });
});
