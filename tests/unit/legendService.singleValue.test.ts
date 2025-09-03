import { describe, it, expect } from '@jest/globals';
// @ts-ignore internal import
import { LegendService } from '../../src/services/LegendService';

function setupContainer() {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

describe('LegendService.createChoroplethLegend single-value collapse', () => {
  it('renders exactly one swatch when breaks are identical pair', () => {
    const container = setupContainer();
    const svc = new LegendService(container);
    const options: any = {
      legendTitle: 'Legend',
      legendTitleColor: '#000',
      classificationMethod: 'Quantile',
      classes: 5,
      layerOpacity: 1,
      legendLabelsColor: '#111',
      legendLabelPosition: 'right',
      legendOrientation: 'vertical'
    };
    svc.createChoroplethLegend([10], [5,5], ['#ff0000'], options);
    const swatches = container.querySelectorAll('svg rect');
    // Fallback: if rects not used, count colored divs; fallback to any element containing fill style
    if (swatches.length === 0) {
      const fills = Array.from(container.querySelectorAll('*')).filter(e => (e as HTMLElement).style.backgroundColor || (e as HTMLElement).style.fill);
      expect(fills.length).toBe(1);
    } else {
      expect(swatches.length).toBe(1);
    }
  });
});
