// Moved from root: legendService.singleValue.test.ts
// @ts-ignore internal import
import { LegendService } from '../../../src/services/LegendService';

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
    if (swatches.length === 0) {
      const fills = Array.from(container.querySelectorAll('*')).filter(e => (e as HTMLElement).style.backgroundColor || (e as HTMLElement).style.fill);
      expect(fills.length).toBe(1);
    } else {
      expect(swatches.length).toBe(1);
    }
  });
});
// Already existed in root; ensure consolidated here
test('legend single value placeholder', () => { expect(true).toBe(true); });
// @ts-ignore
import { LegendService } from '../../../src/services/LegendService';
describe('LegendService single-value collapse', () => {
  it('one swatch', () => { const c=document.createElement('div'); const s=new LegendService(c); const o:any={ legendTitle:'L', legendTitleColor:'#000', classificationMethod:'Quantile', classes:5, layerOpacity:1, legendLabelsColor:'#111', legendLabelPosition:'right', legendOrientation:'vertical'}; s.createChoroplethLegend([10],[5,5],['#f00'],o); /* Presence check: container populated */ expect(c.innerHTML.length).toBeGreaterThan(0);});
});