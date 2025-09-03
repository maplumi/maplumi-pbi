// Moved from root: circleScaling.test.ts (pure math helpers)
// Original content unchanged
describe('Circle Scaling', () => {
  test('should calculate proportional circle radii', () => {
    const values = [100, 400, 900];
    const maxRadius = 30; const minRadius = 5;
    const maxValue = Math.max(...values); const minValue = Math.min(...values);
    const radii = values.map(v => { const norm=(v-minValue)/(maxValue-minValue); return minRadius + (maxRadius-minRadius)*Math.sqrt(norm); });
    expect(radii[0]).toBe(5); expect(radii[2]).toBe(30); expect(radii[1]).toBeGreaterThan(radii[0]); expect(radii[1]).toBeLessThan(radii[2]);
  });
  test('should handle identical values', () => { const values=[100,100,100]; const maxRadius=30; const minRadius=5; const maxValue=Math.max(...values); const minValue=Math.min(...values); const radii=values.map(v=>{ if(maxValue===minValue) return maxRadius; const norm=(v-minValue)/(maxValue-minValue); return minRadius+(maxRadius-minRadius)*Math.sqrt(norm);}); radii.forEach(r=>expect(r).toBe(30)); });
  test('should filter out invalid values', () => { const values:any=[100,null,undefined,NaN,200,-50]; const valid=values.filter((v:number)=> typeof v==='number' && !isNaN(v) && v>0); expect(valid).toEqual([100,200]); });
});
