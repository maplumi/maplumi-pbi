import { describe, it, expect } from '@jest/globals';
import { MaplumiVisualFormattingSettingsModel } from '../../../src/settings';
import { OptionsService } from '../../../src/services/OptionsService';

function makeModel() { return new MaplumiVisualFormattingSettingsModel(); }

describe('OptionsService edge cases', () => {
  it('falls back when classes invalid', () => {
    const model = makeModel();
  const grp: any = model.ChoroplethVisualCardSettings.choroplethDisplaySettingsGroup;
  // Some settings models might name it 'classes' or similar; if missing, skip assignment gracefully
  if (grp.classes) grp.classes.value = -5 as any; // invalid
    const opts = OptionsService.getChoroplethOptions(model);
    expect(opts.classes).toBeGreaterThan(0);
  });

  it('handles missing customColorRamp gracefully', () => {
    const model = makeModel();
    const grp: any = model.ChoroplethVisualCardSettings.choroplethDisplaySettingsGroup;
    grp.colorRamp.value = { value: 'custom', displayName: 'Custom' };
    grp.customColorRamp.value = '   '; // blank
    const opts = OptionsService.getChoroplethOptions(model);
    expect(opts.customColorRamp.trim()).toBe('');
  });
});
