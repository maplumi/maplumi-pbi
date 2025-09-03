import { describe, it, expect, beforeEach } from '@jest/globals';
// @ts-ignore internal import (visual formatting settings model not exported publicly)
import { MaplumiVisualFormattingSettingsModel } from '../../../src/settings';

function createChoroplethLocationBoundaryGroup() {
  const model = new MaplumiVisualFormattingSettingsModel();
  return model.ChoroplethVisualCardSettings.choroplethLocationBoundarySettingsGroup;
}

describe('choroplethLocationBoundarySettingsGroup.applyConditionalDisplayRules', () => {
  let group: any;
  beforeEach(() => { group = createChoroplethLocationBoundaryGroup(); });
  function setSource(source: 'geoboundaries' | 'custom') { group.boundaryDataSource.value = { value: source, displayName: source }; }

  it('shows geoboundaries controls and hides custom when source = geoboundaries', () => {
    setSource('geoboundaries'); group.applyConditionalDisplayRules();
    expect(group.geoBoundariesCountry.visible).toBe(true);
    expect(group.topoJSON_geoJSON_FileUrl.visible).toBe(false);
    expect(group.boundaryIdField.visible).toBe(true);
    expect(group.customBoundaryIdField.visible).toBe(false);
    const sliceNames = group.slices.map((s: any) => s.name);
    expect(sliceNames).toContain('geoBoundariesCountry');
    expect(sliceNames).toContain('boundaryIdField');
    expect(sliceNames).not.toContain('topoJSON_geoJSON_FileUrl');
  });

  it('shows custom controls and hides geoboundaries specific ones when source = custom', () => {
    setSource('custom'); group.applyConditionalDisplayRules();
    expect(group.topoJSON_geoJSON_FileUrl.visible).toBe(true);
    expect(group.geoBoundariesCountry.visible).toBe(false);
    expect(group.boundaryIdField.visible).toBe(false);
    expect(group.customBoundaryIdField.visible).toBe(true);
  });

  it('ensures exclusive boundary id field visibility', () => {
    setSource('geoboundaries'); group.applyConditionalDisplayRules();
    setSource('custom'); group.applyConditionalDisplayRules();
    expect(group.boundaryIdField.visible).toBe(false);
    expect(group.customBoundaryIdField.visible).toBe(true);
  });

  it('hides release/admin level when country = ALL', () => {
    setSource('geoboundaries');
    group.geoBoundariesCountry.value = { value: 'ALL', displayName: 'All Countries' };
    group.applyConditionalDisplayRules();
    expect(group.geoBoundariesReleaseType.visible).toBe(false);
    expect(group.geoBoundariesAdminLevel.visible).toBe(false);
  });
});
