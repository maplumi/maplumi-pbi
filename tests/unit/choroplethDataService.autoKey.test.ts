import { describe, it, expect } from '@jest/globals';
// @ts-ignore internal import
import { ChoroplethDataService } from '../../src/services/ChoroplethDataService';

// Minimal stubs for constructor deps
const dummyColorRampManager: any = {};
const dummyHost: any = {};

function fc(features: any[]) {
  return { type: 'FeatureCollection', features } as any;
}

describe('ChoroplethDataService.processGeoData auto key detection', () => {
  it('selects better matching key than original pcodeKey', () => {
    const svc = new ChoroplethDataService(dummyColorRampManager, dummyHost);
    // valid codes match shapeID more than provided wrongKey
    const valid = ['A1','A2','A3'];
    const data = fc([
      { type: 'Feature', properties: { shapeID: 'A1', wrongKey: 'x1' } },
      { type: 'Feature', properties: { shapeID: 'A2', wrongKey: 'x2' } },
      { type: 'Feature', properties: { shapeID: 'A3', wrongKey: 'x3' } },
    ]);

    const res = svc.processGeoData(data, 'wrongKey', valid);
    expect(res.usedPcodeKey).toBe('shapeID');
    expect(res.bestCount).toBe(3);
    expect(res.originalCount).toBe(0);
    // filteredByBest should retain all 3; filteredByOriginal should have 0
    expect(res.filteredByBest.features.length).toBe(3);
    expect(res.filteredByOriginal.features.length).toBe(0);
  });

  it('retains original key when tie in match counts', () => {
    const svc = new ChoroplethDataService(dummyColorRampManager, dummyHost);
    // Both wrongKey and shapeName match 2 each; since original comes first it should remain
    const valid = ['K1','K2'];
    const data = fc([
      { type: 'Feature', properties: { wrongKey: 'K1', shapeName: 'K1' } },
      { type: 'Feature', properties: { wrongKey: 'K2', shapeName: 'K2' } },
    ]);
    const res = svc.processGeoData(data, 'wrongKey', valid);
    expect(res.usedPcodeKey).toBe('wrongKey');
    expect(res.bestCount).toBe(2);
    expect(res.originalCount).toBe(2);
  });
});
