import { LegendService } from '../../../src/services/LegendService';

function createLegendService() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  return { container, service: new LegendService(container) };
}

describe('LegendService choropleth legend decimal formatting', () => {
  it('preserves decimal boundaries without rounding to integers', () => {
    const { container, service } = createLegendService();
    const options: any = {
      legendTitle: 'Legend',
      legendTitleColor: '#000000',
      classificationMethod: 'Quantile',
      classes: 3,
      layerOpacity: 1,
      legendLabelsColor: '#111111',
      legendLabelPosition: 'right',
      legendOrientation: 'vertical',
      legendItemMargin: 4,
    };

    service.createChoroplethLegend(
      [0.75, 1.5, 2.25],
      [0.75, 1.5, 2.25, 3.5],
      ['#ff0000', '#00ff00', '#0000ff'],
      options,
      undefined,
      '#,0.00',
      'en-US'
    );

    const labels = Array.from(container.querySelectorAll('div'))
      .map(el => el.textContent?.trim())
      .filter(Boolean);

    expect(labels).toContain('0.75 - 1.50');
    expect(labels).toContain('1.50 - 2.25');
  });
});