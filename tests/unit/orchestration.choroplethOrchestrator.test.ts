import { ChoroplethOrchestrator } from "../../src/orchestration/ChoroplethOrchestrator";
import { LegendService } from "../../src/services/LegendService";
import { ChoroplethDataService } from "../../src/services/ChoroplethDataService";
import { CacheService } from "../../src/services/CacheService";
import * as GeoBoundariesServiceModule from "../../src/services/GeoBoundariesService";
import * as requestHelpers from "../../src/utils/requestHelpers";
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
  } as any);
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
    const mockColorRampManager = {
      generateColorRamp: jest.fn().mockReturnValue([
        "#111111", "#222222", "#333333", "#444444", "#555555", "#666666", "#777777"
      ]),
      invertRamp: jest.fn(),
      getColorRamp: jest.fn().mockReturnValue([
        "#009edb", "#64beeb", "#c7e1f5", "#e1eef9", "#00529c", "#0074b7", "#002e6e"
      ])
    } as any;
    const dataService = new ChoroplethDataService(mockColorRampManager, mockHost as any);
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

describe("ChoroplethOrchestrator geoboundaries fallback", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("falls back to gbOpen when selected release has no data, warns user, and uses fallback URL", async () => {
    const orch = makeOrchestrator();

    // Build a minimal categorical with IDs and a color measure
    const categorical: any = {
      categories: [
        { values: ["KEN", "UGA"], source: { roles: { AdminPCodeNameID: true } } }
      ],
      values: [
        { values: [10, 20], source: { roles: { Color: true }, queryName: "m" } }
      ]
    };

    // Spy on fetchMetadata to simulate no URLs for selected release then URLs for gbOpen
    const mdNoUrls: GeoBoundariesServiceModule.GeoBoundariesMetadata = {
      boundaryID: "X", boundaryName: "All Countries", boundaryISO: "ALL", boundaryYearRepresented: "2024",
      boundaryType: "ADM0", boundaryCanonical: "", boundarySource: "", boundaryLicense: "",
      licenseDetail: "", licenseSource: "", sourceDataUpdateDate: "", buildDate: "", Continent: "",
      "UNSDG-region": "", "UNSDG-subregion": "", worldBankIncomeGroup: "", admUnitCount: "",
      meanVertices: "", minVertices: "", maxVertices: "", meanPerimeterLengthKM: "", minPerimeterLengthKM: "",
      maxPerimeterLengthKM: "", meanAreaSqKM: "", minAreaSqKM: "", maxAreaSqKM: "", staticDownloadLink: "",
      gjDownloadURL: "", tjDownloadURL: "", imagePreview: "", simplifiedGeometryGeoJSON: "",
    };
    const fallbackUrl = "https://example.com/fallback.topo.json";
    const mdWithUrls: GeoBoundariesServiceModule.GeoBoundariesMetadata = {
      ...mdNoUrls,
      tjDownloadURL: fallbackUrl
    } as any;

    const fetchMdSpy = jest.spyOn(GeoBoundariesServiceModule.GeoBoundariesService, "fetchMetadata");
    fetchMdSpy.mockResolvedValueOnce({ data: mdNoUrls, response: {} as any });
    fetchMdSpy.mockResolvedValueOnce({ data: mdWithUrls, response: {} as any });

    // Mock network fetch of boundary data to return a minimal valid GeoJSON
    const geojson = {
      type: "FeatureCollection",
      features: [
        { type: "Feature", properties: { shapeISO: "KEN" }, geometry: { type: "Polygon", coordinates: [[[0,0],[1,0],[1,1],[0,1],[0,0]]] } },
        { type: "Feature", properties: { shapeISO: "UGA" }, geometry: { type: "Polygon", coordinates: [[[2,2],[3,2],[3,3],[2,3],[2,2]]] } }
      ]
    };
    const fetchWithTimeoutSpy = jest.spyOn(requestHelpers, "fetchWithTimeout").mockResolvedValue({
      ok: true,
      json: async () => geojson
    } as any);

    // Provide a proper ColorRampManager mock required by ChoroplethDataService
    const mockColorRampManager = {
      generateColorRamp: jest.fn().mockReturnValue([
        "#111111", "#222222", "#333333", "#444444", "#555555", "#666666", "#777777"
      ]),
      invertRamp: jest.fn(),
      getColorRamp: jest.fn().mockReturnValue([
        "#009edb", "#64beeb", "#c7e1f5", "#e1eef9", "#00529c", "#0074b7", "#002e6e"
      ])
    } as any;
    const dataService = new ChoroplethDataService(mockColorRampManager, mockHost);
    const options: any = {
      layerControl: true,
      boundaryDataSource: "geoboundaries",
      geoBoundariesReleaseType: "gbAuthoritative",
      geoBoundariesCountry: "ALL",
      geoBoundariesAdminLevel: "ADM0",
      sourceFieldID: "shapeISO",
      locationPcodeNameId: "shapeISO",
      classificationMethod: "q", classes: 5,
      strokeColor: "#000", strokeWidth: 1, layerOpacity: 1,
      showLegend: false
    };

    const result = await orch.render(categorical, options, dataService, { lockMapExtent: false } as any);

    expect(result).toBeDefined();
    // Warning shown for fallback
    expect(mockHost.displayWarningIcon).toHaveBeenCalledWith(
      "GeoBoundaries Fallback",
      expect.stringContaining("falling back to gbOpen")
    );
    // Network fetch used the fallback URL (now may prefer a simplified topojson variant)
    // Accept either the exact fallback URL or its simplified topojson derivation
    expect(fetchWithTimeoutSpy).toHaveBeenCalledWith(
      expect.stringMatching(/fallback\.topo(_simplified)?\.topojson|fallback\.topo\.json/),
      expect.any(Number)
    );

    fetchWithTimeoutSpy.mockRestore();
    fetchMdSpy.mockRestore();
  });
});
