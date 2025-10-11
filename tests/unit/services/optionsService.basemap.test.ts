// Moved from root: optionsService.basemap.test.ts
import { OptionsService } from '../../../src/services/OptionsService';

describe('OptionsService basemap mapping', () => {
  it('maps basemap branch when provided', () => {
  // Basemap options require formatting model; create minimal stub
  const model: any = { BasemapVisualCardSettings: { basemapSelectSettingsGroup: { selectedBasemap: { value: { value: 'light' } }, customMapAttribution:{ value:''}}, mapBoxSettingsGroup:{ mapboxCustomStyleUrl:{ value:''}, mapboxStyle:{ value:{ value:'streets'}}, mapboxAccessToken:{ value:''}, declutterLabels:{ value:false}}, maptilerSettingsGroup:{ maptilerApiKey:{ value:''}, maptilerStyle:{ value:{ value:'basic'} } } } };
  const opts = OptionsService.getBasemapOptions(model);
  expect(opts.selectedBasemap).toBe('light');
  });
});
