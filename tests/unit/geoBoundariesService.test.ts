import { GeoBoundariesService, GeoBoundariesMetadata } from "../../src/services/GeoBoundariesService";
import { VisualConfig } from "../../src/config/VisualConfig";
import { ChoroplethOptions } from "../../src/types";

describe("GeoBoundariesService", () => {
  const baseOptions: ChoroplethOptions = {
    layerControl: true,
    boundaryDataSource: "GeoBoundaries",
    geoBoundariesReleaseType: "gbOpen",
    geoBoundariesCountry: "KEN",
    geoBoundariesAdminLevel: "ADM1",
    sourceFieldID: "shapeISO",
    locationPcodeNameId: "shapeISO",
    topoJSON_geoJSON_FileUrl: "",
    invertColorRamp: false,
    colorMode: "sequential",
    colorRamp: "Blues",
    customColorRamp: "",
    classes: 5,
    classificationMethod: "Quantile" as any,
    strokeColor: "#000",
    strokeWidth: 1,
    layerOpacity: 0.9,
    showLegend: true,
    legendLabelPosition: "Right" as any,
    legendOrientation: "Vertical" as any,
    legendTitle: "Legend",
    legendTitleAlignment: "left",
    legendTitleColor: "#000",
    legendLabelsColor: "#000",
    legendItemMargin: 4,
  };

  it("builds API url for a normal country", () => {
    const url = GeoBoundariesService.buildApiUrl(baseOptions);
    expect(url).toBe(`${VisualConfig.GEOBOUNDARIES.BASE_URL}/${baseOptions.geoBoundariesReleaseType}/${baseOptions.geoBoundariesCountry}/${baseOptions.geoBoundariesAdminLevel}/`);
  });

  it("returns ALL countries URL when country is ALL", () => {
    const opts = { ...baseOptions, geoBoundariesCountry: "ALL", geoBoundariesAdminLevel: "ADM0" };
    const url = GeoBoundariesService.buildApiUrl(opts);
    expect(url).toBe(VisualConfig.GEOBOUNDARIES.ALL_COUNTRIES_URL);
    expect(GeoBoundariesService.isAllCountriesRequest(opts)).toBe(true);
    expect(GeoBoundariesService.getAllCountriesUrl()).toBe(VisualConfig.GEOBOUNDARIES.ALL_COUNTRIES_URL);
  });

  it("maps boundary field names correctly", () => {
    expect(GeoBoundariesService.getBoundaryFieldName({ ...baseOptions, sourceFieldID: "shapeISO" })).toBe("shapeISO");
    expect(GeoBoundariesService.getBoundaryFieldName({ ...baseOptions, sourceFieldID: "shapeName" })).toBe("shapeName");
    expect(GeoBoundariesService.getBoundaryFieldName({ ...baseOptions, sourceFieldID: "shapeID" })).toBe("shapeID");
    expect(GeoBoundariesService.getBoundaryFieldName({ ...baseOptions, sourceFieldID: "shapeGroup" })).toBe("shapeGroup");
    // default fallback
    expect(GeoBoundariesService.getBoundaryFieldName({ ...baseOptions, sourceFieldID: "unknown" })).toBe("shapeISO");
  });

  it("validates options and returns helpful messages", () => {
    expect(GeoBoundariesService.validateOptions({ ...baseOptions, geoBoundariesReleaseType: "" as any }).isValid).toBe(false);
    expect(GeoBoundariesService.validateOptions({ ...baseOptions, geoBoundariesCountry: "" as any }).isValid).toBe(false);
    expect(GeoBoundariesService.validateOptions({ ...baseOptions, geoBoundariesAdminLevel: "" as any }).isValid).toBe(false);

    const invalidRelease = GeoBoundariesService.validateOptions({ ...baseOptions, geoBoundariesReleaseType: "bad" });
    expect(invalidRelease.isValid).toBe(false);

    const invalidLevel = GeoBoundariesService.validateOptions({ ...baseOptions, geoBoundariesAdminLevel: "ADM9" });
    expect(invalidLevel.isValid).toBe(false);

    const allNotAdm0 = GeoBoundariesService.validateOptions({ ...baseOptions, geoBoundariesCountry: "ALL", geoBoundariesAdminLevel: "ADM1" });
    expect(allNotAdm0.isValid).toBe(false);

    expect(GeoBoundariesService.validateOptions(baseOptions).isValid).toBe(true);
  });

  it("prefers TopoJSON when available", () => {
    const md: GeoBoundariesMetadata = {
      boundaryID: "X",
      boundaryName: "Kenya",
      boundaryISO: "KEN",
      boundaryYearRepresented: "2022",
      boundaryType: "ADM1",
      boundaryCanonical: "",
      boundarySource: "",
      boundaryLicense: "",
      licenseDetail: "",
      licenseSource: "",
      sourceDataUpdateDate: "",
      buildDate: "",
      Continent: "",
      "UNSDG-region": "",
      "UNSDG-subregion": "",
      worldBankIncomeGroup: "",
      admUnitCount: "47",
      meanVertices: "",
      minVertices: "",
      maxVertices: "",
      meanPerimeterLengthKM: "",
      minPerimeterLengthKM: "",
      maxPerimeterLengthKM: "",
      meanAreaSqKM: "",
      minAreaSqKM: "",
      maxAreaSqKM: "",
      staticDownloadLink: "",
      gjDownloadURL: "https://example.com/file.geo.json",
      tjDownloadURL: "https://example.com/file.topo.json",
      imagePreview: "",
      simplifiedGeometryGeoJSON: "",
    };
    expect(GeoBoundariesService.getDownloadUrl(md, true)).toBe(md.tjDownloadURL);
    expect(GeoBoundariesService.getDownloadUrl(md, false)).toBe(md.gjDownloadURL);
  });

  it("formats a helpful data description", () => {
    const md: GeoBoundariesMetadata = {
      boundaryID: "X",
      boundaryName: "Kenya",
      boundaryISO: "KEN",
      boundaryYearRepresented: "2022",
      boundaryType: "ADM1",
      boundaryCanonical: "",
      boundarySource: "",
      boundaryLicense: "",
      licenseDetail: "",
      licenseSource: "",
      sourceDataUpdateDate: "",
      buildDate: "",
      Continent: "",
      "UNSDG-region": "",
      "UNSDG-subregion": "",
      worldBankIncomeGroup: "",
      admUnitCount: "47",
      meanVertices: "",
      minVertices: "",
      maxVertices: "",
      meanPerimeterLengthKM: "",
      minPerimeterLengthKM: "",
      maxPerimeterLengthKM: "",
      meanAreaSqKM: "",
      minAreaSqKM: "",
      maxAreaSqKM: "",
      staticDownloadLink: "",
      gjDownloadURL: "",
      tjDownloadURL: "",
      imagePreview: "",
      simplifiedGeometryGeoJSON: "",
    };
    expect(GeoBoundariesService.getDataDescription(md)).toContain("Kenya ADM1 boundaries (2022) - 47 units");
  });

  describe("fetchMetadata", () => {
    const realFetch = global.fetch as any;

    beforeEach(() => {
      // Reset fetch before each test
      // @ts-ignore
      global.fetch = realFetch;
    });

    afterAll(() => {
      // @ts-ignore
      global.fetch = realFetch;
    });

    it("returns mock metadata for ALL countries without calling fetch", async () => {
      const spy = jest.spyOn(global as any, "fetch");
      const { data, response } = await GeoBoundariesService.fetchMetadata({ ...baseOptions, geoBoundariesCountry: "ALL", geoBoundariesAdminLevel: "ADM0" });
      expect(spy).not.toHaveBeenCalled();
      expect(data).not.toBeNull();
      expect(response).toBeNull();
      expect(data!.boundaryISO).toBe("ALL");
    });

    it("returns data and response on successful fetch with required URLs", async () => {
      const fake: Partial<Response> = {
        ok: true,
        json: async () => ({
          boundaryName: "Kenya",
          boundaryType: "ADM1",
          boundaryYearRepresented: "2022",
          admUnitCount: "47",
          gjDownloadURL: "https://example.com/file.geo.json"
        }) as any,
      };
      // @ts-ignore
      global.fetch = jest.fn().mockResolvedValue(fake);

      const { data, response } = await GeoBoundariesService.fetchMetadata(baseOptions);
      expect(global.fetch).toHaveBeenCalled();
      expect(response).toBeDefined();
      expect(data).toBeDefined();
      expect(data!.boundaryName).toBe("Kenya");
      expect((data as any).gjDownloadURL).toBeTruthy();
    });

    it("selects first valid entry from array payload", async () => {
      const fake: Partial<Response> = {
        ok: true,
        json: async () => ([
          { boundaryName: "Kenya", boundaryType: "ADM1" },
          { boundaryName: "Kenya", boundaryType: "ADM1", tjDownloadURL: "https://example.com/file.topo.json" }
        ]) as any,
      };
      // @ts-ignore
      global.fetch = jest.fn().mockResolvedValue(fake);
      const { data, response } = await GeoBoundariesService.fetchMetadata(baseOptions);
      expect(response).toBeDefined();
      expect(data).toBeDefined();
      expect((data as any).tjDownloadURL).toBe("https://example.com/file.topo.json");
    });

    it("returns null data when payload lacks download URLs", async () => {
      const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const fake: Partial<Response> = {
        ok: true,
        json: async () => ({ boundaryName: "Kenya", boundaryType: "ADM1" }) as any,
      };
      // @ts-ignore
      global.fetch = jest.fn().mockResolvedValue(fake);
      const { data, response } = await GeoBoundariesService.fetchMetadata(baseOptions);
      expect(response).toBeDefined();
      expect(data).toBeNull();
      expect(errSpy).toHaveBeenCalled();
      errSpy.mockRestore();
    });

    it("handles non-ok responses gracefully", async () => {
      const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const fake: Partial<Response> = { ok: false, status: 500, statusText: "Server Error" };
      // @ts-ignore
      global.fetch = jest.fn().mockResolvedValue(fake);

      const { data, response } = await GeoBoundariesService.fetchMetadata(baseOptions);
      expect(data).toBeNull();
      expect(response).toBeDefined();
      expect(errSpy).toHaveBeenCalled();
      errSpy.mockRestore();
    });

    it("handles thrown errors and returns nulls", async () => {
      const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      // @ts-ignore
      global.fetch = jest.fn().mockRejectedValue(new Error("network"));
      const { data, response } = await GeoBoundariesService.fetchMetadata(baseOptions);
      expect(data).toBeNull();
      expect(response).toBeNull();
      expect(errSpy).toHaveBeenCalled();
      errSpy.mockRestore();
    });
  });
});
