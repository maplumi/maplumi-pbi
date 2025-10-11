// Mock problematic dependency before importing visual
jest.mock('ol-mapbox-style', () => ({ MapboxVectorLayer: class MockMapboxVectorLayer {} }));

import { describe, it, expect, beforeEach } from '@jest/globals';
import { MaplumiVisual } from '../../../src/visual';
import { MaplumiVisualFormattingSettingsModel } from '../../../src/settings';
import { DomIds } from '../../../src/constants/strings';

function makeHost() {
  const selectionIds: any[] = [];
  return {
    eventService: { renderingStarted: jest.fn(), renderingFinished: jest.fn() },
    tooltipService: { },
    createSelectionManager: () => ({
      select: jest.fn().mockResolvedValue(selectionIds),
      clear: jest.fn(),
      getSelectionIds: () => selectionIds,
      registerOnSelectCallback: (_cb: any) => { /* ignore */ }
    }),
    persistProperties: jest.fn(),
    displayWarningIcon: jest.fn(),
    colorPalette: { getColor: () => ({ value: '#000' }) }
  } as any;
}

describe('MaplumiVisual core', () => {
  let container: HTMLElement; let host: any; let visual: MaplumiVisual;
  beforeEach(() => { container = document.createElement('div'); container.style.width='400px'; container.style.height='300px'; document.body.appendChild(container); host = makeHost(); visual = new MaplumiVisual({ element: container, host } as any); });
  afterEach(() => { container.remove(); });

  it('constructs with initial formatting model', () => {
    const model = (visual as any).visualFormattingSettingsModel as MaplumiVisualFormattingSettingsModel;
    expect(model).toBeTruthy();
    const legend = container.querySelector(`#${DomIds.LegendContainer}`);
    expect(legend).toBeTruthy();
  });

  it('update with empty dataview shows no legend & does not throw', () => {
    expect(() => visual.update({ dataViews: [ { categorical: undefined } as any], viewport: { width: 400, height: 300 } } as any)).not.toThrow();
    const legend = container.querySelector(`#${DomIds.LegendContainer}`) as HTMLElement;
    expect(legend.style.display).toBe('none');
  });

  it('getFormattingModel returns model structure', () => {
    const fm = visual.getFormattingModel();
    expect(fm).toBeTruthy();
  });

  it('persists map extent via private method', () => {
    (visual as any).persistCurrentExtentAsLocked('1,2,3,4', 7);
    expect(host.persistProperties).toHaveBeenCalled();
  });
});
