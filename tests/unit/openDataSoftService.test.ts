import { OpenDataSoftService } from "../../src/services/OpenDataSoftService";
import * as requestHelpers from "../../src/utils/requestHelpers";

describe("OpenDataSoftService.fetchWorldAdm0", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("transforms ODS records to a FeatureCollection and filters by geometry type", async () => {
    const sample = {
      results: [
        {
          iso3: "NZL",
          name: "New Zealand",
          geo_shape: {
            type: "Feature",
            properties: { name: "New Zealand" },
            geometry: { type: "MultiPolygon", coordinates: [[[[0,0],[1,0],[1,1],[0,1],[0,0]]]] }
          }
        },
        {
          iso3: "XXX",
          name: "Line Feature",
          geo_shape: {
            type: "Feature",
            properties: { name: "Line" },
            geometry: { type: "LineString", coordinates: [[0,0],[1,1]] }
          }
        }
      ]
    } as any;

    const fetchSpy = jest.spyOn(requestHelpers, "fetchWithTimeout").mockResolvedValue({
      ok: true,
      json: async () => sample
    } as any);

    const fc = await OpenDataSoftService.fetchWorldAdm0();
    expect(fc).toBeDefined();
    expect(fc.type).toBe("FeatureCollection");
    expect(Array.isArray(fc.features)).toBe(true);
    // Only 1 polygonal feature should remain
    expect(fc.features.length).toBe(1);
    expect(fc.features[0].properties.iso3).toBe("NZL");
    expect(fc.features[0].properties.name).toBe("New Zealand");

    fetchSpy.mockRestore();
  });
});
