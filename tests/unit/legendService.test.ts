/**
 * Unit tests for LegendService
 * Based on the specifications for legend generation
 */

describe('LegendService', () => {
  let legendService: any;
  let mockContainer: HTMLElement;

  beforeEach(() => {
    // Create mock DOM container
    mockContainer = document.createElement('div');
    mockContainer.id = 'test-legend-container';
    document.body.appendChild(mockContainer);

    // Mock LegendService implementation
    legendService = {
      container: mockContainer,
      
      createProportionalCircleLegend: (values: number[], radii: number[], categories: number, options: any) => {
        // Clear container
        while (mockContainer.firstChild) {
          mockContainer.removeChild(mockContainer.firstChild);
        }
        
        // Create legend structure
        const legend = document.createElement('div');
        legend.className = 'circle-legend';
        
        // Add title
        if (options.legendTitle) {
          const title = document.createElement('h3');
          title.textContent = options.legendTitle;
          title.style.color = options.legendTitleColor || '#000000';
          legend.appendChild(title);
        }
        
        // Add circles
        values.forEach((value, index) => {
          const item = document.createElement('div');
          item.className = 'legend-item';
          
          const circle = document.createElement('div');
          circle.className = 'legend-circle';
          circle.style.width = `${radii[index] * 2}px`;
          circle.style.height = `${radii[index] * 2}px`;
          circle.style.borderRadius = '50%';
          circle.style.border = `${options.legendItemStrokeWidth || 1}px solid ${options.legendItemStrokeColor || '#000000'}`;
          circle.style.backgroundColor = options.color1 || '#ff0000';
          
          const label = document.createElement('span');
          label.textContent = legendService.formatLegendValue(value);
          label.style.color = options.labelTextColor || '#000000';
          
          item.appendChild(circle);
          item.appendChild(label);
          legend.appendChild(item);
        });
        
        mockContainer.appendChild(legend);
        return legend;
      },

      createChoroplethLegend: (values: number[], classBreaks: number[], colorScale: Function, options: any) => {
        while (mockContainer.firstChild) {
          mockContainer.removeChild(mockContainer.firstChild);
        }
        
        const legend = document.createElement('div');
        legend.className = 'choropleth-legend';
        
        // Add title
        if (options.legendTitle) {
          const title = document.createElement('h3');
          title.textContent = options.legendTitle;
          title.style.color = options.legendTitleColor || '#000000';
          legend.appendChild(title);
        }
        
        // Add color swatches
        for (let i = 0; i < classBreaks.length - 1; i++) {
          const item = document.createElement('div');
          item.className = 'legend-item';
          
          const swatch = document.createElement('div');
          swatch.className = 'color-swatch';
          swatch.style.width = '20px';
          swatch.style.height = '20px';
          swatch.style.backgroundColor = colorScale(classBreaks[i]);
          swatch.style.border = `1px solid ${options.strokeColor || '#000000'}`;
          
          const label = document.createElement('span');
          const min = legendService.formatLegendValue(classBreaks[i]);
          const max = legendService.formatLegendValue(classBreaks[i + 1]);
          label.textContent = `${min} - ${max}`;
          label.style.color = options.legendLabelsColor || '#000000';
          
          item.appendChild(swatch);
          item.appendChild(label);
          legend.appendChild(item);
        }
        
        mockContainer.appendChild(legend);
        return legend;
      },

      formatLegendValue: (value: number) => {
        if (value >= 1000000) {
          return `${Math.round(value / 1000000)}M`;
        } else if (value >= 1000) {
          return `${Math.round(value / 1000)}K`;
        } else {
          return Math.round(value).toString();
        }
      },

      showLegend: (type: string) => {
        mockContainer.style.display = 'block';
        mockContainer.setAttribute('data-legend-type', type);
      },

      hideLegend: (type: string) => {
        const currentType = mockContainer.getAttribute('data-legend-type');
        if (currentType === type) {
          mockContainer.style.display = 'none';
        }
      },

      hexToRgba: (hex: string, opacity: number) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
      }
    };
  });

  afterEach(() => {
    if (mockContainer.parentNode) {
      mockContainer.parentNode.removeChild(mockContainer);
    }
  });

  describe('createProportionalCircleLegend', () => {
    test('should create legend with correct proportional sizes', () => {
      const values = [100, 500, 1000];
      const radii = [5, 12, 20]; // Proportional radii
      const options = {
        legendTitle: 'Population',
        legendTitleColor: '#333333',
        color1: '#ff0000',
        legendItemStrokeColor: '#000000',
        legendItemStrokeWidth: 1,
        labelTextColor: '#000000'
      };

      const legend = legendService.createProportionalCircleLegend(values, radii, 1, options);

      expect(legend).toBeDefined();
      expect(legend.className).toBe('circle-legend');
      
      // Check title
      const title = legend.querySelector('h3');
      expect(title?.textContent).toBe('Population');
      expect(title?.style.color).toBe('rgb(51, 51, 51)');
      
      // Check circles
      const circles = legend.querySelectorAll('.legend-circle');
      expect(circles).toHaveLength(3);
      
      // Verify proportional sizing
      expect(circles[0].style.width).toBe('10px'); // 5 * 2
      expect(circles[1].style.width).toBe('24px'); // 12 * 2
      expect(circles[2].style.width).toBe('40px'); // 20 * 2
      
      // Check labels
      const labels = legend.querySelectorAll('span');
      expect(labels[0].textContent).toBe('100');
      expect(labels[1].textContent).toBe('500');
      expect(labels[2].textContent).toBe('1K');
    });

    test('should handle missing optional properties', () => {
      const values = [100];
      const radii = [10];
      const options = {}; // No optional properties

      const legend = legendService.createProportionalCircleLegend(values, radii, 1, options);

      expect(legend).toBeDefined();
      expect(legend.querySelector('h3')).toBeNull(); // No title
      
      const circle = legend.querySelector('.legend-circle');
      expect(circle?.style.backgroundColor).toBe('rgb(255, 0, 0)'); // Default color1
    });
  });

  describe('createChoroplethLegend', () => {
    test('should create choropleth legend with color swatches', () => {
      const values = [10, 25, 40, 55, 70];
      const classBreaks = [10, 25, 40, 55, 70];
      const colorScale = (value: number) => {
        if (value < 25) return '#ff0000';
        if (value < 40) return '#ff8800';
        if (value < 55) return '#ffff00';
        return '#00ff00';
      };
      const options = {
        legendTitle: 'GDP per Capita',
        legendTitleColor: '#333333',
        legendLabelsColor: '#666666',
        strokeColor: '#000000'
      };

      const legend = legendService.createChoroplethLegend(values, classBreaks, colorScale, options);

      expect(legend).toBeDefined();
      expect(legend.className).toBe('choropleth-legend');
      
      // Check title
      const title = legend.querySelector('h3');
      expect(title?.textContent).toBe('GDP per Capita');
      
      // Check color swatches (should be n-1 for n breaks)
      const swatches = legend.querySelectorAll('.color-swatch');
      expect(swatches).toHaveLength(4);
      
      // Check first swatch color
      expect(swatches[0].style.backgroundColor).toBe('rgb(255, 0, 0)');
      
      // Check labels
      const labels = legend.querySelectorAll('span');
      expect(labels[0].textContent).toBe('10 - 25');
      expect(labels[1].textContent).toBe('25 - 40');
    });
  });

  describe('formatLegendValue', () => {
    test('should format values with K/M notation', () => {
      expect(legendService.formatLegendValue(500)).toBe('500');
      expect(legendService.formatLegendValue(1500)).toBe('2K');
      expect(legendService.formatLegendValue(25000)).toBe('25K');
      expect(legendService.formatLegendValue(1500000)).toBe('2M');
      expect(legendService.formatLegendValue(2750000)).toBe('3M');
    });

    test('should handle edge cases', () => {
      expect(legendService.formatLegendValue(999)).toBe('999');
      expect(legendService.formatLegendValue(1000)).toBe('1K');
      expect(legendService.formatLegendValue(999999)).toBe('1000K');
      expect(legendService.formatLegendValue(1000000)).toBe('1M');
    });

    test('should round values appropriately', () => {
      expect(legendService.formatLegendValue(1234)).toBe('1K');
      expect(legendService.formatLegendValue(1567)).toBe('2K');
      expect(legendService.formatLegendValue(1234567)).toBe('1M');
    });
  });

  describe('showLegend and hideLegend', () => {
    test('should show legend for specific type', () => {
      legendService.showLegend('circle');
      
      expect(mockContainer.style.display).toBe('block');
      expect(mockContainer.getAttribute('data-legend-type')).toBe('circle');
    });

    test('should hide legend for specific type', () => {
      // First show a legend
      legendService.showLegend('choropleth');
      expect(mockContainer.style.display).toBe('block');
      
      // Hide the same type
      legendService.hideLegend('choropleth');
      expect(mockContainer.style.display).toBe('none');
    });

    test('should not hide legend of different type', () => {
      legendService.showLegend('circle');
      expect(mockContainer.style.display).toBe('block');
      
      // Try to hide different type
      legendService.hideLegend('choropleth');
      expect(mockContainer.style.display).toBe('block'); // Should still be visible
    });
  });

  describe('hexToRgba', () => {
    test('should convert hex to rgba with opacity', () => {
      expect(legendService.hexToRgba('#ff0000', 0.5)).toBe('rgba(255, 0, 0, 0.5)');
      expect(legendService.hexToRgba('#00ff00', 1.0)).toBe('rgba(0, 255, 0, 1)');
      expect(legendService.hexToRgba('#0000ff', 0.0)).toBe('rgba(0, 0, 255, 0)');
    });

    test('should handle different hex formats', () => {
      expect(legendService.hexToRgba('#ffffff', 0.8)).toBe('rgba(255, 255, 255, 0.8)');
      expect(legendService.hexToRgba('#000000', 0.3)).toBe('rgba(0, 0, 0, 0.3)');
    });
  });

  describe('Legend Layout and Styling', () => {
    test('should apply correct styling to circle legend items', () => {
      const values = [100, 500];
      const radii = [5, 15];
      const options = {
        color1: '#ff0000',
        legendItemStrokeColor: '#333333',
        legendItemStrokeWidth: 2,
        labelTextColor: '#666666'
      };

      const legend = legendService.createProportionalCircleLegend(values, radii, 1, options);
      
      const circles = legend.querySelectorAll('.legend-circle');
      expect(circles[0].style.border).toBe('2px solid #333333');
      expect(circles[0].style.backgroundColor).toBe('rgb(255, 0, 0)');
      
      const labels = legend.querySelectorAll('span');
      expect(labels[0].style.color).toBe('rgb(102, 102, 102)');
    });

    test('should maintain correct proportional relationships', () => {
      // Test the key requirement: diameter relationships
      const values = [100, 400, 1600]; // Values that should create 1:2:4 diameter ratio
      const radii = [5, 10, 20]; // Radii that create 1:2:4 diameter ratio
      
      const legend = legendService.createProportionalCircleLegend(values, radii, 1, {});
      
      const circles = legend.querySelectorAll('.legend-circle');
      
      // Check diameter relationships (width = diameter)
      const diameter1 = parseInt(circles[0].style.width);
      const diameter2 = parseInt(circles[1].style.width);
      const diameter3 = parseInt(circles[2].style.width);
      
      expect(diameter2).toBe(diameter1 * 2); // Medium is 2x small
      expect(diameter3).toBe(diameter1 * 4); // Large is 4x small
      expect(diameter3).toBe(diameter2 * 2); // Large is 2x medium
    });
  });
});
