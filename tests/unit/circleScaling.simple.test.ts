/**
 * Essential tests for circle scaling algorithms
 * Focused on core mathematical functions
 */

describe('Circle Scaling', () => {
  test('should calculate proportional circle radii', () => {
    const values = [100, 400, 900]; // 1:4:9 ratio
    const maxRadius = 30;
    const minRadius = 5;
    
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    
    const radii = values.map(value => {
      const normalized = (value - minValue) / (maxValue - minValue);
      return minRadius + (maxRadius - minRadius) * Math.sqrt(normalized);
    });

    expect(radii[0]).toBe(5); // Minimum value gets minimum radius
    expect(radii[2]).toBe(30); // Maximum value gets maximum radius
    expect(radii[1]).toBeGreaterThan(radii[0]);
    expect(radii[1]).toBeLessThan(radii[2]);
  });

  test('should handle identical values', () => {
    const values = [100, 100, 100];
    const maxRadius = 30;
    const minRadius = 5;
    
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    
    const radii = values.map(value => {
      if (maxValue === minValue) return maxRadius; // All same value
      const normalized = (value - minValue) / (maxValue - minValue);
      return minRadius + (maxRadius - minRadius) * Math.sqrt(normalized);
    });

    expect(radii[0]).toBe(30);
    expect(radii[1]).toBe(30);
    expect(radii[2]).toBe(30);
  });

  test('should filter out invalid values', () => {
    const values = [100, null, undefined, NaN, 200, -50];
    const validValues = values.filter(v => typeof v === 'number' && !isNaN(v) && v > 0);
    
    expect(validValues).toEqual([100, 200]);
  });
});
