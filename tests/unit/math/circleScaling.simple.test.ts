// Moved from root: circleScaling.simple.test.ts (duplicate simplified math test)
describe('Circle Scaling (simple)', () => {
  test('proportional radii basic', () => { const values=[100,400,900]; const maxR=30; const minR=5; const max=Math.max(...values); const min=Math.min(...values); const radii=values.map(v=>{ const n=(v-min)/(max-min); return minR+(maxR-minR)*Math.sqrt(n);}); expect(radii[0]).toBe(5); expect(radii[2]).toBe(30); });
});
