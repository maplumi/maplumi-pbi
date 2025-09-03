// Moved from root: legendService.test.ts
/**
 * Unit tests for LegendService (legacy mock-based suite)
 */
describe('LegendService', () => {
  let legendService: any;
  let mockContainer: HTMLElement;

  beforeEach(() => {
    mockContainer = document.createElement('div');
    mockContainer.id = 'test-legend-container';
    document.body.appendChild(mockContainer);

    legendService = {
      container: mockContainer,
      createProportionalCircleLegend: (values: number[], radii: number[], categories: number, options: any) => {
        while (mockContainer.firstChild) { mockContainer.removeChild(mockContainer.firstChild); }
        const legend = document.createElement('div');
        legend.className = 'circle-legend';
        if (options.legendTitle) {
          const title = document.createElement('h3');
          title.textContent = options.legendTitle;
          title.style.color = options.legendTitleColor || '#000000';
          legend.appendChild(title);
        }
        values.forEach((value, index) => {
          const item = document.createElement('div'); item.className = 'legend-item';
          const circle = document.createElement('div'); circle.className = 'legend-circle';
          circle.style.width = `${radii[index] * 2}px`; circle.style.height = `${radii[index] * 2}px`;
          circle.style.borderRadius = '50%'; circle.style.border = `${options.legendItemStrokeWidth || 1}px solid ${options.legendItemStrokeColor || '#000000'}`;
          circle.style.backgroundColor = options.color1 || '#ff0000';
          const label = document.createElement('span'); label.textContent = legendService.formatLegendValue(value);
          label.style.color = options.labelTextColor || '#000000';
          item.appendChild(circle); item.appendChild(label); legend.appendChild(item);
        });
        mockContainer.appendChild(legend); return legend;
      },
      createChoroplethLegend: (values: number[], classBreaks: number[], colorScale: Function, options: any) => {
        while (mockContainer.firstChild) { mockContainer.removeChild(mockContainer.firstChild); }
        const legend = document.createElement('div'); legend.className = 'choropleth-legend';
        if (options.legendTitle) { const title = document.createElement('h3'); title.textContent = options.legendTitle; title.style.color = options.legendTitleColor || '#000000'; legend.appendChild(title); }
        for (let i = 0; i < classBreaks.length - 1; i++) {
          const item = document.createElement('div'); item.className = 'legend-item';
          const swatch = document.createElement('div'); swatch.className = 'color-swatch'; swatch.style.width = '20px'; swatch.style.height = '20px'; swatch.style.backgroundColor = colorScale(classBreaks[i]); swatch.style.border = `1px solid ${options.strokeColor || '#000000'}`;
          const label = document.createElement('span'); const min = legendService.formatLegendValue(classBreaks[i]); const max = legendService.formatLegendValue(classBreaks[i + 1]);
          label.textContent = `${min} - ${max}`; label.style.color = options.legendLabelsColor || '#000000';
          item.appendChild(swatch); item.appendChild(label); legend.appendChild(item);
        }
        mockContainer.appendChild(legend); return legend;
      },
      formatLegendValue: (value: number) => {
        if (value >= 1000000) return `${Math.round(value / 1000000)}M`;
        if (value >= 1000) return `${Math.round(value / 1000)}K`;
        return Math.round(value).toString();
      },
      showLegend: (type: string) => { mockContainer.style.display = 'block'; mockContainer.setAttribute('data-legend-type', type); },
      hideLegend: (type: string) => { const currentType = mockContainer.getAttribute('data-legend-type'); if (currentType === type) mockContainer.style.display = 'none'; },
      hexToRgba: (hex: string, opacity: number) => { const r = parseInt(hex.slice(1, 3), 16); const g = parseInt(hex.slice(3, 5), 16); const b = parseInt(hex.slice(5, 7), 16); return `rgba(${r}, ${g}, ${b}, ${opacity})`; }
    };
  });

  afterEach(() => { mockContainer.parentNode?.removeChild(mockContainer); });

  describe('createProportionalCircleLegend', () => {
    test('should create legend with correct proportional sizes', () => {
      const values = [100, 500, 1000]; const radii = [5, 12, 20];
      const options = { legendTitle: 'Population', legendTitleColor: '#333333', color1: '#ff0000', legendItemStrokeColor: '#000000', legendItemStrokeWidth: 1, labelTextColor: '#000000' };
      const legend = legendService.createProportionalCircleLegend(values, radii, 1, options);
      expect(legend).toBeDefined(); expect(legend.className).toBe('circle-legend');
      const title = legend.querySelector('h3'); expect(title?.textContent).toBe('Population'); expect(title?.style.color).toBe('rgb(51, 51, 51)');
      const circles = legend.querySelectorAll('.legend-circle'); expect(circles).toHaveLength(3);
      expect(circles[0].style.width).toBe('10px'); expect(circles[1].style.width).toBe('24px'); expect(circles[2].style.width).toBe('40px');
      const labels = legend.querySelectorAll('span'); expect(labels[0].textContent).toBe('100'); expect(labels[1].textContent).toBe('500'); expect(labels[2].textContent).toBe('1K');
    });
  });
});
// Moved from root: legendService.test.ts
/**
 * Unit tests for LegendService (logic + formatting)
 * Original content migrated from root. No direct imports because tests used a mock implementation.
 */

describe('LegendService (mock implementation)', () => {
	let legendService: any;
	let mockContainer: HTMLElement;

	beforeEach(() => {
		mockContainer = document.createElement('div');
		mockContainer.id = 'test-legend-container';
		document.body.appendChild(mockContainer);

		legendService = {
			container: mockContainer,
			createProportionalCircleLegend: (values: number[], radii: number[], _categories: number, options: any) => {
				while (mockContainer.firstChild) mockContainer.removeChild(mockContainer.firstChild);
				const legend = document.createElement('div');
				legend.className = 'circle-legend';
				if (options.legendTitle) {
					const title = document.createElement('h3');
					title.textContent = options.legendTitle;
					title.style.color = options.legendTitleColor || '#000000';
					legend.appendChild(title);
				}
				values.forEach((value, i) => {
					const item = document.createElement('div'); item.className = 'legend-item';
					const circle = document.createElement('div'); circle.className = 'legend-circle';
					circle.style.width = `${radii[i] * 2}px`; circle.style.height = `${radii[i] * 2}px`; circle.style.borderRadius = '50%';
					circle.style.border = `${options.legendItemStrokeWidth || 1}px solid ${options.legendItemStrokeColor || '#000000'}`;
					circle.style.backgroundColor = options.color1 || '#ff0000';
					const label = document.createElement('span'); label.textContent = legendService.formatLegendValue(value); label.style.color = options.labelTextColor || '#000000';
					item.appendChild(circle); item.appendChild(label); legend.appendChild(item);
				});
				mockContainer.appendChild(legend); return legend;
			},
			createChoroplethLegend: (values: number[], classBreaks: number[], colorScale: Function, options: any) => {
				while (mockContainer.firstChild) mockContainer.removeChild(mockContainer.firstChild);
				const legend = document.createElement('div'); legend.className = 'choropleth-legend';
				if (options.legendTitle) { const title = document.createElement('h3'); title.textContent = options.legendTitle; title.style.color = options.legendTitleColor || '#000000'; legend.appendChild(title); }
				for (let i = 0; i < classBreaks.length - 1; i++) {
					const item = document.createElement('div'); item.className = 'legend-item';
					const swatch = document.createElement('div'); swatch.className = 'color-swatch'; swatch.style.width = '20px'; swatch.style.height = '20px'; swatch.style.backgroundColor = colorScale(classBreaks[i]); swatch.style.border = `1px solid ${options.strokeColor || '#000000'}`;
					const label = document.createElement('span'); const min = legendService.formatLegendValue(classBreaks[i]); const max = legendService.formatLegendValue(classBreaks[i + 1]); label.textContent = `${min} - ${max}`; label.style.color = options.legendLabelsColor || '#000000';
					item.appendChild(swatch); item.appendChild(label); legend.appendChild(item);
				}
				mockContainer.appendChild(legend); return legend;
			},
			formatLegendValue: (value: number) => {
				if (value >= 1000000) return `${Math.round(value / 1000000)}M`;
				if (value >= 1000) return `${Math.round(value / 1000)}K`;
				return Math.round(value).toString();
			},
			showLegend: (type: string) => { mockContainer.style.display = 'block'; mockContainer.setAttribute('data-legend-type', type); },
			hideLegend: (type: string) => { const t = mockContainer.getAttribute('data-legend-type'); if (t === type) mockContainer.style.display = 'none'; },
			hexToRgba: (hex: string, opacity: number) => {
				const r = parseInt(hex.slice(1, 3), 16); const g = parseInt(hex.slice(3, 5), 16); const b = parseInt(hex.slice(5, 7), 16); return `rgba(${r}, ${g}, ${b}, ${opacity})`;
			}
		};
	});

	afterEach(() => { mockContainer.remove(); });

	describe('createProportionalCircleLegend', () => {
		test('creates legend with proportional sizes', () => {
			const legend = legendService.createProportionalCircleLegend([100, 500, 1000], [5, 12, 20], 1, { legendTitle: 'Population', legendTitleColor: '#333333', color1: '#ff0000', legendItemStrokeColor: '#000', legendItemStrokeWidth: 1, labelTextColor: '#000' });
			expect(legend.querySelectorAll('.legend-circle')).toHaveLength(3);
		});
	});

	describe('formatLegendValue', () => {
		test('formats K/M', () => {
			expect(legendService.formatLegendValue(1500)).toBe('2K');
			expect(legendService.formatLegendValue(1500000)).toBe('2M');
		});
	});
});
