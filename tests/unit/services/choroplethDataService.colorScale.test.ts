import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ChoroplethDataService } from '../../../src/services/ChoroplethDataService';
import { ColorRampManager } from '../../../src/services/ColorRampManager';
import { ClassificationMethods } from '../../../src/constants/strings';

const mockHost: any = { locale: 'en-US' };

describe('ChoroplethDataService getColorScale / getColorFromClassBreaks', () => {
  let mgr: ColorRampManager;
  let svc: ChoroplethDataService;
  beforeEach(() => {
    mgr = new ColorRampManager(['#c1','#c2','#c3','#c4','#c5','#c6','#c7']);
    svc = new ChoroplethDataService(mgr, mockHost);
  });

  it('unique classification returns 8th overflow slot black and pads ramp', () => {
    const breaks = ['A','B','C','D','E','F','G','H'];
    const colors = svc.getColorScale(breaks, { classificationMethod: ClassificationMethods.Unique, invertColorRamp: false, classes: 8, colorMode: 'lab' } as any);
    expect(colors).toHaveLength(8); // 7 + overflow
    expect(colors[7]).toBe('#000000');
  });

  it('getColorFromClassBreaks maps only first 7 uniques and blacks others', () => {
    const breaks = ['A','B','C','D','E','F','G','H'];
    const colors = svc.getColorScale(breaks, { classificationMethod: ClassificationMethods.Unique, invertColorRamp: false, classes: 8, colorMode: 'lab' } as any);
    expect(svc.getColorFromClassBreaks('A', breaks, colors, ClassificationMethods.Unique)).toBe(colors[0]);
    expect(svc.getColorFromClassBreaks('G', breaks, colors, ClassificationMethods.Unique)).toBe(colors[6]);
    expect(svc.getColorFromClassBreaks('H', breaks, colors, ClassificationMethods.Unique)).toBe('#000000');
  });

  it('invertColorRamp true causes manager invert call for numeric classification', () => {
    const invSpy = jest.spyOn(mgr, 'invertRamp');
    const classBreaks = [0,10,20];
    svc.getColorScale(classBreaks, { classificationMethod: 'q', invertColorRamp: true, classes: 3, colorMode: 'lab' } as any);
    expect(invSpy).toHaveBeenCalled();
  });
});
