import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ChoroplethDataService } from '../../../src/services/ChoroplethDataService';
import { ColorRampManager } from '../../../src/services/ColorRampManager';
import { ClassificationMethods } from '../../../src/constants/strings';

const mockHost: any = { locale: 'en-US', displayWarningIcon: jest.fn() };

describe('ChoroplethDataService getColorScale / getColorFromClassBreaks', () => {
  let mgr: ColorRampManager;
  let svc: ChoroplethDataService;
  beforeEach(() => {
    mockHost.displayWarningIcon = jest.fn();
    mgr = new ColorRampManager(['#c1','#c2','#c3','#c4','#c5','#c6','#c7']);
    svc = new ChoroplethDataService(mgr, mockHost);
  });

  it('unique classification caps to 7 classes and pads missing colors', () => {
    const breaks = ['A','B','C','D','E','F','G','H'];
    const colors = svc.getColorScale(breaks, { classificationMethod: ClassificationMethods.Unique, invertColorRamp: false, classes: 8, colorMode: 'lab' } as any);
    expect(colors).toHaveLength(7);
    expect(colors[6]).toBe('#c7');
  });

  it('getColorFromClassBreaks maps only first 7 uniques and blacks others', () => {
    const breaks = ['A','B','C','D','E','F','G','H'];
    const colors = svc.getColorScale(breaks, { classificationMethod: ClassificationMethods.Unique, invertColorRamp: false, classes: 8, colorMode: 'lab' } as any);
    expect(svc.getColorFromClassBreaks('A', breaks, colors, ClassificationMethods.Unique)).toBe(colors[0]);
    expect(svc.getColorFromClassBreaks('G', breaks, colors, ClassificationMethods.Unique)).toBe(colors[6]);
    expect(svc.getColorFromClassBreaks('H', breaks, colors, ClassificationMethods.Unique)).toBe('#000000');
  });

  it('warns and pads when custom ramp provides fewer colors than classes', () => {
    const hostSpy = jest.spyOn(mockHost, 'displayWarningIcon');
    mgr = new ColorRampManager(['#ff0000', '#00ff00']);
    svc = new ChoroplethDataService(mgr, mockHost);
    const breaks = [1, 2, 3, 4, 5];
    const colors = svc.getColorScale(breaks, {
      classificationMethod: ClassificationMethods.Unique,
      invertColorRamp: false,
      classes: 5,
      colorMode: 'lab',
      colorRamp: 'custom'
    } as any);

    expect(colors).toHaveLength(5);
    expect(colors.slice(0, 2)).toEqual(['#ff0000', '#00ff00']);
    expect(colors.slice(2)).toEqual(['#000000', '#000000', '#000000']);
    expect(hostSpy).toHaveBeenCalled();
  });

  it('invertColorRamp true causes manager invert call for numeric classification', () => {
    const invSpy = jest.spyOn(mgr, 'invertRamp');
    const classBreaks = [0,10,20];
    svc.getColorScale(classBreaks, { classificationMethod: 'q', invertColorRamp: true, classes: 3, colorMode: 'lab' } as any);
    expect(invSpy).toHaveBeenCalled();
  });
});
