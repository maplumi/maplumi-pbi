import { describe, it, expect } from '@jest/globals';
// @ts-ignore
import { MaplumiVisualFormattingSettingsModel } from '../../../src/settings';
// @ts-ignore
import { OptionsService } from '../../../src/services/OptionsService';

describe('OptionsService.getChoroplethOptions', () => {
  it('switches boundary field based on source', () => {
    const model = new MaplumiVisualFormattingSettingsModel();
    model.ChoroplethVisualCardSettings.choroplethLocationBoundarySettingsGroup.boundaryDataSource.value = { value: 'geoboundaries', displayName: 'g' };
    model.ChoroplethVisualCardSettings.choroplethLocationBoundarySettingsGroup.boundaryIdField.value = { value: 'shapeID' } as any;
    let o = OptionsService.getChoroplethOptions(model);
    expect(o.locationPcodeNameId).toBe('shapeID');
    model.ChoroplethVisualCardSettings.choroplethLocationBoundarySettingsGroup.boundaryDataSource.value = { value: 'custom', displayName: 'c' };
    model.ChoroplethVisualCardSettings.choroplethLocationBoundarySettingsGroup.customBoundaryIdField.value = 'customKey';
    o = OptionsService.getChoroplethOptions(model);
    expect(o.locationPcodeNameId).toBe('customKey');
  });
});