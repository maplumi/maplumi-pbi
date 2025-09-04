import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ColorRampManager } from '../../../src/services/ColorRampManager';

// Mock chroma-js scale behaviour
jest.mock('chroma-js', () => ({
  scale: jest.fn(() => ({
    mode: jest.fn(() => ({
      domain: jest.fn(() => ({
        colors: jest.fn(() => ['#111111', '#222222', '#333333'])
      }))
    }))
  }))
}));

describe('ColorRampManager', () => {
  const baseRamp = ['#ff0000', '#00ff00', '#0000ff', '#ffff00'];
  let mgr: ColorRampManager;

  beforeEach(() => {
    mgr = new ColorRampManager(baseRamp);
  });

  it('returns original ramp when not inverted', () => {
    expect(mgr.getColorRamp()).toEqual(baseRamp);
  });

  it('inverts ramp after invertRamp call and toggles back', () => {
    mgr.invertRamp();
    expect(mgr.getColorRamp()).toEqual([...baseRamp].reverse());
    mgr.invertRamp();
    expect(mgr.getColorRamp()).toEqual(baseRamp); // back to original
  });

  it('generateColorRamp pads when ramp shorter than classes (classBreaks length matches classes)', () => {
    const shortMgr = new ColorRampManager(['#a','#b']);
    const res = shortMgr.generateColorRamp([0,1,2], 3, 'lab');
    expect(res).toHaveLength(3);
    expect(res[0]).toBe('#a');
    expect(res[2]).toBe('#000000'); // padded
  });

  it('generateColorRamp delegates to chroma scale when interpolation needed', () => {
  const res = mgr.generateColorRamp([0,50,100], 4, 'lab');
    expect(res).toEqual(['#111111', '#222222', '#333333']);
  });
});
