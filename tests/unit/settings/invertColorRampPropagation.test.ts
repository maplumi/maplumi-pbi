import { describe, it, expect } from '@jest/globals';
import { MaplumiVisualFormattingSettingsModel } from '../../../src/settings';
import { OptionsService } from '../../../src/services/OptionsService';

// This test ensures that invertColorRamp flag in settings flows into choropleth options

describe('Settings -> choropleth invertColorRamp propagation', () => {
  it('propagates invertColorRamp true', () => {
    const model = new MaplumiVisualFormattingSettingsModel();
    const group: any = model.ChoroplethVisualCardSettings.choroplethDisplaySettingsGroup;
    group.invertColorRamp.value = true;
    const opts = OptionsService.getChoroplethOptions(model);
    expect(opts.invertColorRamp).toBe(true);
    group.invertColorRamp.value = false;
    const opts2 = OptionsService.getChoroplethOptions(model);
    expect(opts2.invertColorRamp).toBe(false);
  });
});
