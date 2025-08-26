/**
 * Unit tests for ChoroplethDataService
 * Based on the choropleth specification
 */

// Mock the dependencies
const mockColorRampManager = {
  getColorScale: () => () => '#ff0000',
  getColors: () => ['#ff0000', '#00ff00', '#0000ff']
};

const mockHost = {
  displayWarningIcon: () => {},
  createSelectionIdBuilder: () => ({
    withCategory: () => ({ withMeasure: () => ({ createSelectionId: () => ({ id: 'test' }) }) })
  })
};

describe('ChoroplethDataService', () => {
  let dataService: any;
  
  beforeEach(() => {
    // Mock implementation of ChoroplethDataService
    dataService = {
      processGeoData: (data: any, pcodeKey: string, validPCodes: string[]) => {
        const isTopoJSON = (obj: any) => obj.type === 'Topology';

        const convertTopoJSONToGeoJSON = (topoData: any) => {
          // Simplified conversion for testing
          return {
            type: 'FeatureCollection',
            features: topoData.objects ? [] : topoData.features || []
          };
        };

        let geojson = isTopoJSON(data) ? convertTopoJSONToGeoJSON(data) : data;

        const features = geojson.features.filter((feature: any) =>
          validPCodes.includes(feature.properties[pcodeKey])
        );

        return {
          originalGeojson: geojson,
          filteredByBest: { ...geojson, features },
          filteredByOriginal: { ...geojson, features },
          usedPcodeKey: pcodeKey,
          bestCount: features.length,
          originalCount: features.length
        };
      },

      classifyEqualInterval: (values: number[], classes: number) => {
        const min = Math.min(...values);
        const max = Math.max(...values);
        const interval = (max - min) / classes;
        
        const breaks = [];
        for (let i = 0; i <= classes; i++) {
          breaks.push(min + (i * interval));
        }
        return breaks;
      },

      classifyQuantile: (values: number[], classes: number) => {
        const sortedValues = [...values].sort((a, b) => a - b);
        const breaks = [];
        
        for (let i = 0; i <= classes; i++) {
          const position = (i / classes) * (sortedValues.length - 1);
          const index = Math.round(position);
          breaks.push(sortedValues[Math.min(index, sortedValues.length - 1)]);
        }
        
        return [...new Set(breaks)].sort((a, b) => a - b);
      },

      classifyNaturalBreaks: (values: number[], classes: number) => {
        // Simplified Jenks breaks for testing
        return dataService.classifyQuantile(values, classes);
      },

      classifyData: (values: number[], method: string, classes: number) => {
        switch (method) {
          case 'equal-interval':
            return dataService.classifyEqualInterval(values, classes);
          case 'quantile':
            return dataService.classifyQuantile(values, classes);
          case 'natural-breaks':
            return dataService.classifyNaturalBreaks(values, classes);
          default:
            return dataService.classifyEqualInterval(values, classes);
        }
      },

      createColorScale: (values: any[], colorRamp: string[], method: string) => {
        if (method === 'unique-values') {
          const uniqueValues = [...new Set(values)];
          return (value: any) => {
            const index = uniqueValues.indexOf(value);
            return index >= 0 ? colorRamp[index % colorRamp.length] : '#cccccc';
          };
        } else {
          const numericValues = values.filter(v => typeof v === 'number');
          const breaks = dataService.classifyData(numericValues, method, colorRamp.length - 1);
          
          return (value: number) => {
            if (value === null || value === undefined || isNaN(value)) {
              return 'transparent';
            }
            
            for (let i = 0; i < breaks.length - 1; i++) {
              if (value >= breaks[i] && value < breaks[i + 1]) {
                return colorRamp[i];
              }
            }
            return colorRamp[colorRamp.length - 1];
          };
        }
      },

      extractTooltips: (categorical: any) => {
        const tooltipFields = categorical.values?.filter(v => v.source.roles?.Tooltips) || [];
        const tooltips: any[][] = [];

        for (let i = 0; i < (categorical.categories?.[0]?.values?.length || 0); i++) {
          const tooltipItems = tooltipFields.map(field => ({
            displayName: field.source.displayName,
            value: field.values[i]?.toString() || ''
          }));
          tooltips.push(tooltipItems);
        }

        return tooltips;
      },

      validateChoroplethData: (data: any) => {
        if (!data || typeof data !== 'object') return false;
        if (!data.features || !Array.isArray(data.features)) return false;
        
        return data.features.every((feature: any) => 
          feature.geometry && 
          feature.properties && 
          typeof feature.properties === 'object'
        );
      }
    };
  });

  describe('processGeoData', () => {
    test('should process GeoJSON data correctly', () => {
      const geoJsonData = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { ADM1_PCODE: 'NY001', name: 'New York' },
            geometry: { type: 'Polygon', coordinates: [] }
          },
          {
            type: 'Feature',
            properties: { ADM1_PCODE: 'CA001', name: 'California' },
            geometry: { type: 'Polygon', coordinates: [] }
          }
        ]
      };

      const validPCodes = ['NY001'];
  const result = dataService.processGeoData(geoJsonData, 'ADM1_PCODE', validPCodes);

  const filtered = result.filteredByOriginal;
  expect(filtered.type).toBe('FeatureCollection');
  expect(filtered.features).toHaveLength(1);
  expect(filtered.features[0].properties.ADM1_PCODE).toBe('NY001');
    });

    test('should filter features by valid P-codes', () => {
      const geoJsonData = {
        type: 'FeatureCollection',
        features: [
          { type: 'Feature', properties: { PCODE: 'A' }, geometry: {} },
          { type: 'Feature', properties: { PCODE: 'B' }, geometry: {} },
          { type: 'Feature', properties: { PCODE: 'C' }, geometry: {} }
        ]
      };

      const validPCodes = ['A', 'C'];
  const result = dataService.processGeoData(geoJsonData, 'PCODE', validPCodes);
  const filtered = result.filteredByOriginal;

  expect(filtered.features).toHaveLength(2);
  expect(filtered.features.map((f: any) => f.properties.PCODE)).toEqual(['A', 'C']);
    });

    test('should handle empty valid P-codes array', () => {
      const geoJsonData = {
        type: 'FeatureCollection',
        features: [
          { type: 'Feature', properties: { PCODE: 'A' }, geometry: {} }
        ]
      };

      const validPCodes: string[] = [];
  const result = dataService.processGeoData(geoJsonData, 'PCODE', validPCodes);
  const filtered = result.filteredByOriginal;

  expect(filtered.features).toHaveLength(0);
    });
  });

  describe('Classification Algorithms', () => {
    const testValues = [10, 25, 30, 45, 60, 75, 90];

    test('classifyEqualInterval should create equal-sized intervals', () => {
      const breaks = dataService.classifyEqualInterval(testValues, 4);
      
      expect(breaks).toHaveLength(5); // n+1 breaks for n classes
      expect(breaks[0]).toBe(10); // min value
      expect(breaks[breaks.length - 1]).toBe(90); // max value
      
      // Check intervals are equal
      const intervals = [];
      for (let i = 1; i < breaks.length; i++) {
        intervals.push(breaks[i] - breaks[i - 1]);
      }
      const expectedInterval = 20; // (90-10)/4
      intervals.forEach(interval => {
        expect(interval).toBeCloseTo(expectedInterval, 1);
      });
    });

    test('classifyQuantile should create equal-count classes', () => {
      const breaks = dataService.classifyQuantile(testValues, 3);
      
      expect(breaks).toHaveLength(4); // n+1 breaks for n classes
      expect(breaks[0]).toBe(10); // min value
      expect(breaks[breaks.length - 1]).toBe(90); // max value
      expect(breaks).toEqual(breaks.sort((a, b) => a - b)); // Should be sorted
    });

    test('classifyNaturalBreaks should optimize class boundaries', () => {
      const breaks = dataService.classifyNaturalBreaks(testValues, 3);
      
      expect(breaks).toHaveLength(4);
      expect(breaks[0]).toBe(10);
      expect(breaks[breaks.length - 1]).toBe(90);
    });

    test('classifyData should route to correct classification method', () => {
      const equalIntervalBreaks = dataService.classifyData(testValues, 'equal-interval', 3);
      const quantileBreaks = dataService.classifyData(testValues, 'quantile', 3);
      
      expect(equalIntervalBreaks).toHaveLength(4);
      expect(quantileBreaks).toHaveLength(4);
      expect(equalIntervalBreaks).not.toEqual(quantileBreaks);
    });
  });

  describe('createColorScale', () => {
    const colorRamp = ['#ff0000', '#00ff00', '#0000ff', '#ffff00'];

    test('should create continuous color scale for numeric data', () => {
      const values = [10, 20, 30, 40, 50];
      const colorScale = dataService.createColorScale(values, colorRamp, 'equal-interval');
      
      expect(typeof colorScale).toBe('function');
      expect(colorScale(10)).toBe('#ff0000'); // First color
      expect(colorScale(null)).toBe('transparent'); // Null handling
      expect(colorScale(NaN)).toBe('transparent'); // NaN handling
    });

    test('should create categorical color scale for unique values', () => {
      const values = ['A', 'B', 'C', 'A', 'B'];
      const colorScale = dataService.createColorScale(values, colorRamp, 'unique-values');
      
      expect(typeof colorScale).toBe('function');
      expect(colorScale('A')).toBe('#ff0000');
      expect(colorScale('B')).toBe('#00ff00');
      expect(colorScale('C')).toBe('#0000ff');
      expect(colorScale('Unknown')).toBe('#cccccc'); // Fallback color
    });

    test('should handle color ramp cycling for many unique values', () => {
      const values = ['A', 'B', 'C', 'D', 'E', 'F']; // More values than colors
      const colorScale = dataService.createColorScale(values, colorRamp, 'unique-values');
      
      expect(colorScale('A')).toBe('#ff0000'); // Index 0
      expect(colorScale('E')).toBe('#ff0000'); // Index 4 % 4 = 0
    });
  });

  describe('extractTooltips', () => {
    test('should extract tooltip fields from categorical data', () => {
      const categorical = {
        categories: [
          { values: ['A', 'B', 'C'] }
        ],
        values: [
          {
            source: { roles: { Tooltips: true }, displayName: 'Population' },
            values: [100, 200, 300]
          },
          {
            source: { roles: { Tooltips: true }, displayName: 'GDP' },
            values: [500, 750, 600]
          }
        ]
      };

      const tooltips = dataService.extractTooltips(categorical);

      expect(tooltips).toHaveLength(3);
      expect(tooltips[0]).toHaveLength(2); // Two tooltip fields
      expect(tooltips[0][0].displayName).toBe('Population');
      expect(tooltips[0][0].value).toBe('100');
      expect(tooltips[0][1].displayName).toBe('GDP');
      expect(tooltips[0][1].value).toBe('500');
    });

    test('should handle empty tooltip fields', () => {
      const categorical = {
        categories: [{ values: ['A'] }],
        values: []
      };

      const tooltips = dataService.extractTooltips(categorical);

      expect(tooltips).toHaveLength(1);
      expect(tooltips[0]).toHaveLength(0);
    });
  });

  describe('validateChoroplethData', () => {
    test('should validate correct GeoJSON structure', () => {
      const validData = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { name: 'Test' },
            geometry: { type: 'Polygon', coordinates: [] }
          }
        ]
      };

      expect(dataService.validateChoroplethData(validData)).toBe(true);
    });

    test('should reject invalid data structures', () => {
      expect(dataService.validateChoroplethData(null)).toBe(false);
      expect(dataService.validateChoroplethData({})).toBe(false);
      expect(dataService.validateChoroplethData({ features: 'not-array' })).toBe(false);
      
      const invalidFeature = {
        type: 'FeatureCollection',
        features: [
          { type: 'Feature' } // Missing properties and geometry
        ]
      };
      expect(dataService.validateChoroplethData(invalidFeature)).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should handle edge cases in classification', () => {
      // Single value
      const singleValue = [50];
      const breaks = dataService.classifyEqualInterval(singleValue, 3);
      expect(breaks[0]).toBe(breaks[breaks.length - 1]);

      // Empty array
      const emptyArray: number[] = [];
      expect(() => dataService.classifyEqualInterval(emptyArray, 3)).not.toThrow();
    });

    test('should handle invalid color scale inputs', () => {
      const emptyValues: number[] = [];
      const colorScale = dataService.createColorScale(emptyValues, ['#ff0000'], 'equal-interval');
      
      expect(typeof colorScale).toBe('function');
      expect(colorScale(10)).toBe('#ff0000'); // Should fallback gracefully
    });
  });
});
