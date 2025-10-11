import { describe, it, expect, beforeEach } from '@jest/globals';
// @ts-ignore internal import
import { MaplumiVisualFormattingSettingsModel } from '../../../src/settings';

describe('choroplethDisplaySettingsGroup.applyConditionalDisplayRules', () => {
  let group: any;
  beforeEach(() => {
    const model = new MaplumiVisualFormattingSettingsModel();
    group = model.ChoroplethVisualCardSettings.choroplethDisplaySettingsGroup;
  });

  it('hides customColorRamp when colorRamp != custom', () => {
    group.colorRamp.value = { value: 'viridis', displayName: 'Viridis' };
    group.applyConditionalDisplayRules();
    expect(group.customColorRamp.visible).toBe(false);
  });

  it('shows customColorRamp when colorRamp == custom', () => {
    group.colorRamp.value = { value: 'custom', displayName: 'Custom' };
    group.applyConditionalDisplayRules();
    expect(group.customColorRamp.visible).toBe(true);
  });
});
