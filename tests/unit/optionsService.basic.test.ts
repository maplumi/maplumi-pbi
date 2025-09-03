import { describe, it, expect } from '@jest/globals';
// @ts-ignore internal import
import { MaplumiVisualFormattingSettingsModel } from '../../src/settings';
// @ts-ignore internal import
import { OptionsService } from '../../src/services/OptionsService';

describe('OptionsService.getChoroplethOptions basic mapping & custom boundary switch', () => {
  it('uses boundaryIdField for geoboundaries and customBoundaryIdField for custom', () => {
    const model = new MaplumiVisualFormattingSettingsModel();
    // GeoBoundaries path
    model.ChoroplethVisualCardSettings.choroplethLocationBoundarySettingsGroup.boundaryDataSource.value = { value: 'geoboundaries', displayName:'Geo' };
    model.ChoroplethVisualCardSettings.choroplethLocationBoundarySettingsGroup.boundaryIdField.value = { value: 'shapeID', displayName:'shapeID' } as any;
    let opts = OptionsService.getChoroplethOptions(model);
    expect(opts.locationPcodeNameId).toBe('shapeID');

    // Custom path
    model.ChoroplethVisualCardSettings.choroplethLocationBoundarySettingsGroup.boundaryDataSource.value = { value: 'custom', displayName:'Custom' };
    model.ChoroplethVisualCardSettings.choroplethLocationBoundarySettingsGroup.customBoundaryIdField.value = 'myCustomField';
    opts = OptionsService.getChoroplethOptions(model);
    expect(opts.locationPcodeNameId).toBe('myCustomField');
  });
});
