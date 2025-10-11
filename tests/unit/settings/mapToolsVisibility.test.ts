import { describe, it, expect, beforeEach } from '@jest/globals';
// @ts-ignore internal import
import { MaplumiVisualFormattingSettingsModel } from '../../../src/settings';

describe('mapToolsSettingsGroup.applyConditionalDisplayRules', () => {
  let group: any;
  beforeEach(() => {
    const model = new MaplumiVisualFormattingSettingsModel();
    group = model.mapControlsVisualCardSettings.mapToolsSettingsGroup;
  });

  it('hides locked extent & zoom', () => {
    group.lockMapExtent.value = false;
    group.applyConditionalDisplayRules();
    expect(group.lockedMapExtent.visible).toBe(false);
    expect(group.lockedMapZoom.visible).toBe(false);
  });

  it('disables zoom control when lock extent', () => {
    group.lockMapExtent.value = true;
    group.showZoomControl.value = true;
    group.applyConditionalDisplayRules();
    expect(group.showZoomControl.visible).toBe(false);
    expect(group.showZoomControl.value).toBe(false);
  });
});
