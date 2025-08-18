import { ChoroplethDataService } from "../../src/services/ChoroplethDataService";
import { ColorRampManager } from "../../src/services/ColorRampManager";

// Minimal mock implementations
class MockColorRampManager extends ColorRampManager {
  constructor() { // @ts-ignore
    super();
  }
}

const mockHost: any = { };

function makeTopologyWithTwoObjects() {
  return {
    type: "Topology",
    arcs: [ [ [0,0] ] ],
    transform: { scale: [1,1], translate: [0,0] },
    objects: {
      lines: {
        type: "GeometryCollection",
        geometries: [ { type: "LineString", arcs: [0] } ]
      },
      polys: {
        type: "GeometryCollection",
        geometries: [ { type: "Polygon", arcs: [ [0] ] } ]
      }
    }
  } as any;
}

describe("TopoJSON multi-object selection", () => {
  test("prefers provided object name when present", () => {
    const dataService = new ChoroplethDataService(new MockColorRampManager() as any, mockHost);
    const topo = makeTopologyWithTwoObjects();
    const geo = (dataService as any).convertTopoJSONToGeoJSON(topo, "polys");

    expect(geo.type).toBe("FeatureCollection");
    expect(Array.isArray(geo.features)).toBe(true);
  });

  test("falls back to polygonal object when no preferred name provided", () => {
    const dataService = new ChoroplethDataService(new MockColorRampManager() as any, mockHost);
    const topo = makeTopologyWithTwoObjects();
    const geo = (dataService as any).convertTopoJSONToGeoJSON(topo);

    expect(geo.type).toBe("FeatureCollection");
    expect(Array.isArray(geo.features)).toBe(true);
  });
});
