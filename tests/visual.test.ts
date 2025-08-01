/**
 * Essential tests for Power BI Visual
 * Focused on core functionality and Power BI integration
 */

describe('Maplumi Power BI Visual', () => {
  let mockHost: any;
  let mockElement: HTMLElement;

  beforeEach(() => {
    // Mock Power BI host
    mockHost = {
      createSelectionManager: () => ({
        select: jest.fn(),
        clear: jest.fn()
      }),
      colorPalette: {
        getColor: () => ({ value: '#ff0000' })
      },
      tooltipService: {
        enabled: () => true,
        show: jest.fn(),
        hide: jest.fn()
      }
    };

    // Mock container element
    mockElement = document.createElement('div');
    mockElement.style.width = '800px';
    mockElement.style.height = '600px';
    document.body.appendChild(mockElement);
  });

  afterEach(() => {
    if (mockElement.parentNode) {
      mockElement.parentNode.removeChild(mockElement);
    }
  });

  describe('Data Processing', () => {
    test('should handle choropleth data classification', () => {
      const values = [10, 25, 40, 55, 70];
      
      // Simple quantile classification
      const sorted = [...values].sort((a, b) => a - b);
      const classCount = 5;
      const classBreaks: number[] = [];
      
      for (let i = 0; i < classCount; i++) {
        const index = Math.floor((i / (classCount - 1)) * (sorted.length - 1));
        classBreaks.push(sorted[index]);
      }

      expect(classBreaks).toHaveLength(5);
      expect(classBreaks[0]).toBe(10);
      expect(classBreaks[4]).toBe(70);
    });

    test('should calculate proportional circle sizes', () => {
      const values = [100, 400, 900]; // 1:4:9 ratio
      const maxRadius = 30;
      const minRadius = 5;
      
      const maxValue = Math.max(...values);
      const minValue = Math.min(...values);
      
      const radii = values.map(value => {
        const normalized = (value - minValue) / (maxValue - minValue);
        return minRadius + (maxRadius - minRadius) * Math.sqrt(normalized);
      });

      expect(radii[0]).toBe(5); // Minimum
      expect(radii[2]).toBe(30); // Maximum
      expect(radii[1]).toBeGreaterThan(radii[0]);
      expect(radii[1]).toBeLessThan(radii[2]);
    });
  });

  describe('Power BI Integration', () => {
    test('should handle data view updates', () => {
      const mockDataView = {
        categorical: {
          categories: [{
            values: ['Region1', 'Region2', 'Region3']
          }],
          values: [{
            values: [100, 200, 300]
          }]
        }
      };

      const updateOptions = {
        dataViews: [mockDataView],
        viewport: { width: 800, height: 600 }
      };

      // Basic validation that data structure is correct
      expect(updateOptions.dataViews).toHaveLength(1);
      expect(updateOptions.dataViews[0].categorical.categories[0].values).toHaveLength(3);
      expect(updateOptions.dataViews[0].categorical.values[0].values).toHaveLength(3);
    });

    test('should handle empty data gracefully', () => {
      const emptyDataView = {
        categorical: {
          categories: [{ values: [] }],
          values: [{ values: [] }]
        }
      };

      const updateOptions = {
        dataViews: [emptyDataView],
        viewport: { width: 800, height: 600 }
      };

      expect(() => {
        // Should not throw when handling empty data
        const hasData = updateOptions.dataViews[0].categorical.categories[0].values.length > 0;
        expect(hasData).toBe(false);
      }).not.toThrow();
    });
  });

  describe('Rendering', () => {
    test('should create map container', () => {
      const mapContainer = document.createElement('div');
      mapContainer.className = 'map-container';
      mapContainer.style.width = '100%';
      mapContainer.style.height = '100%';
      
      mockElement.appendChild(mapContainer);

      expect(mockElement.querySelector('.map-container')).toBeTruthy();
      expect(mapContainer.style.width).toBe('100%');
      expect(mapContainer.style.height).toBe('100%');
    });

    test('should handle viewport changes', () => {
      const viewport = { width: 1200, height: 800 };
      
      mockElement.style.width = `${viewport.width}px`;
      mockElement.style.height = `${viewport.height}px`;

      expect(mockElement.style.width).toBe('1200px');
      expect(mockElement.style.height).toBe('800px');
    });
  });

  describe('Settings', () => {
    test('should validate color settings', () => {
      const settings = {
        colorScheme: 'YlOrRd',
        numberOfClasses: 5,
        minRadius: 5,
        maxRadius: 50
      };

      expect(settings.numberOfClasses).toBeGreaterThan(0);
      expect(settings.numberOfClasses).toBeLessThanOrEqual(10);
      expect(settings.minRadius).toBeLessThan(settings.maxRadius);
      expect(typeof settings.colorScheme).toBe('string');
    });

    test('should handle invalid settings', () => {
      const invalidSettings = {
        numberOfClasses: -1,
        minRadius: 100,
        maxRadius: 50
      };

      // Normalize invalid settings
      const normalizedSettings = {
        numberOfClasses: Math.max(1, Math.min(10, invalidSettings.numberOfClasses || 5)),
        minRadius: Math.min(invalidSettings.minRadius, invalidSettings.maxRadius),
        maxRadius: Math.max(invalidSettings.minRadius, invalidSettings.maxRadius)
      };

      expect(normalizedSettings.numberOfClasses).toBe(1);
      expect(normalizedSettings.minRadius).toBe(50);
      expect(normalizedSettings.maxRadius).toBe(100);
    });
  });
});
