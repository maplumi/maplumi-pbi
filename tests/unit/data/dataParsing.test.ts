// Moved from root: dataParsing.test.ts
import { parseChoroplethCategorical, validateChoroplethInput, filterValidPCodes } from '../../../src/data/choropleth';
import { parseCircleCategorical } from '../../../src/data/circle';
import { calculateCircleScale, applyScaling, findClosestValue } from '../../../src/math/circles';

describe('data parsing helpers', () => {
  test('validateChoroplethInput fails without values', () => {
    const res = validateChoroplethInput({ values: [] });
    expect(res.ok).toBe(false);
  });
  test('parseChoroplethCategorical extracts roles', () => {
    const categorical: any = { categories: [{ source: { roles: { AdminPCodeNameID: true } }, values: ['P1','P2']}], values: [{ source:{ roles:{ Color:true }, queryName:'m'}, values:[1,2]}]};
    const res = parseChoroplethCategorical(categorical);
    expect(res.AdminPCodeNameIDCategory).toBeTruthy();
    expect(res.colorMeasure).toBeTruthy();
    expect(res.pCodes).toEqual(['P1','P2']);
    expect(filterValidPCodes(res.pCodes)).toEqual(['P1','P2']);
  });
  test('parseCircleCategorical extracts coords and sizes', () => {
    const categorical: any = { categories:[{ source:{ roles:{ Longitude:true }}, values:[10,20]},{ source:{ roles:{ Latitude:true }}, values:[30,40]}], values:[{ source:{ roles:{ Size:true }, queryName:'s1'}, values:[5,10]},{ source:{ roles:{ Size:true }, queryName:'s2'}, values:[2,3]}]};
    const res = parseCircleCategorical(categorical);
    expect(res.hasLon).toBe(true);
    expect(res.hasLat).toBe(true);
    expect(res.longitudes).toEqual([10,20]);
    expect(res.latitudes).toEqual([30,40]);
    expect(res.circleSizeValuesObjects.length).toBe(2);
  });
});

describe('circle math helpers', () => {
  const circleOptions: any = { minRadius:4, maxRadius:20 };
  test('calculateCircleScale handles empty', () => { const res = calculateCircleScale([], circleOptions); expect(res.circleScale).toBe(1); });
  test('applyScaling clamps and scales', () => { const { minCircleSizeValue, maxCircleSizeValue, circleScale } = calculateCircleScale([1,2,3,4,100], circleOptions); const r = applyScaling(3,minCircleSizeValue,maxCircleSizeValue,circleScale,circleOptions,[1,2,3,4,100]); expect(r).toBeGreaterThan(0); });
  test('findClosestValue returns nearest', () => { const v = findClosestValue([1,5,10],6); expect(v).toBe(5); });
});
