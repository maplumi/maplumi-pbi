import { DataRoleService } from "../../src/services/DataRoleService";

function makeCategorical(roles: Record<string, any[]>) {
  const categories = Object.entries(roles).map(([role, values]) => ({
    source: { roles: { [role]: true } },
    values,
  }));
  return { categories } as any;
}

describe("DataRoleService.computeAutoToggles", () => {
  it("circle on when Lat & Lon present with values", () => {
    const cat = makeCategorical({ Latitude: [1, 2], Longitude: [3, 4] });
    const res = DataRoleService.computeAutoToggles(cat);
    expect(res.circle).toBe(true);
    expect(res.choropleth).toBe(false);
  });

  it("choropleth on when AdminPCodeNameID has values", () => {
    const cat = makeCategorical({ AdminPCodeNameID: ["A", "B"] });
    const res = DataRoleService.computeAutoToggles(cat);
    expect(res.circle).toBe(false);
    expect(res.choropleth).toBe(true);
  });

  it("treats empty strings as missing", () => {
    const cat = makeCategorical({ Latitude: [" ", null], Longitude: [5], AdminPCodeNameID: [""] });
    const res = DataRoleService.computeAutoToggles(cat);
    expect(res.circle).toBe(false);
    expect(res.choropleth).toBe(false);
  });
});
