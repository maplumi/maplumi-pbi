import { BaseOrchestrator } from "../../src/orchestration/BaseOrchestrator";
import { LegendService } from "../../src/services/LegendService";
import { VisualConfig } from "../../src/config/VisualConfig";

// Mock OL Map module to avoid importing heavy ESM implementation
jest.mock("ol/Map", () => ({ __esModule: true, default: jest.fn() }));

// Minimal stubs/mocks
const mockHost: any = { displayWarningIcon: jest.fn() };
const mockSelMgr: any = { registerOnSelectCallback: jest.fn() };
const mockTooltip: any = {};

function createStubSelection(removeMock: jest.Mock) {
  return {
    select: (_: string) => ({
      selectAll: () => ({ remove: removeMock })
    })
  } as any;
}

class TestOrchestrator extends BaseOrchestrator {
  public callClearGroup(id: string) { this.clearGroup(id); }
  public callRemoveLayerIfPresent(layer: any, remover: (l: any) => void) { this.removeLayerIfPresent(layer, remover); }
  public callFitExtentIfUnlocked(extent: number[] | undefined, lock: boolean | undefined) { this.fitExtentIfUnlocked(extent, lock); }
}

function makeOrchestrator(opts?: { map?: any; removeMock?: jest.Mock }) {
  const svgOverlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const removeMock = opts?.removeMock ?? jest.fn();
  const svg = createStubSelection(removeMock);
  const svgContainer = global.document.createElement('div');
  const legendContainer = global.document.createElement("div");
  const legendService = new LegendService(legendContainer);

  const fit = jest.fn();
  const map = opts?.map ?? { addLayer: jest.fn(), removeLayer: jest.fn(), getView: () => ({ fit }) };

  const orch = new TestOrchestrator({
    svg,
    svgOverlay,
    svgContainer,
    legendService,
    host: mockHost,
    map: map as any,
    selectionManager: mockSelMgr,
    tooltipServiceWrapper: mockTooltip
  });

  return { orch, fit, removeMock };
}

describe("BaseOrchestrator utilities", () => {
  test("clearGroup removes all elements in the group", () => {
    const { orch, removeMock } = makeOrchestrator();
    orch.callClearGroup('#test');
    expect(removeMock).toHaveBeenCalled();
  });

  test("removeLayerIfPresent calls remover with the layer when present", () => {
    const { orch } = makeOrchestrator();
    const layer = { id: 1 };
    const remover = jest.fn();
    orch.callRemoveLayerIfPresent(layer, remover);
    expect(remover).toHaveBeenCalledWith(layer);
  });

  test("removeLayerIfPresent does nothing when layer is undefined", () => {
    const { orch } = makeOrchestrator();
    const remover = jest.fn();
    orch.callRemoveLayerIfPresent(undefined as any, remover);
    expect(remover).not.toHaveBeenCalled();
  });

  test("removeLayerIfPresent swallows remover errors", () => {
    const { orch } = makeOrchestrator();
    const remover = jest.fn(() => { throw new Error('boom'); });
    expect(() => orch.callRemoveLayerIfPresent({ id: 2 }, remover)).not.toThrow();
  });

  test("fitExtentIfUnlocked calls map view fit when unlocked and extent provided", () => {
    const { orch, fit } = makeOrchestrator();
    const extent = [0, 0, 10, 10];
    orch.callFitExtentIfUnlocked(extent, false);
    expect(fit).toHaveBeenCalledWith(extent, VisualConfig.MAP.FIT_OPTIONS);
  });

  test("fitExtentIfUnlocked does nothing when locked", () => {
    const { orch, fit } = makeOrchestrator();
    orch.callFitExtentIfUnlocked([0, 0, 1, 1], true);
    expect(fit).not.toHaveBeenCalled();
  });

  test("fitExtentIfUnlocked does nothing when extent is undefined", () => {
    const { orch, fit } = makeOrchestrator();
    orch.callFitExtentIfUnlocked(undefined, false);
    expect(fit).not.toHaveBeenCalled();
  });
});
