// Moved from root: optionsService.basemap.test.ts
import { OptionsService } from '../../../src/services/OptionsService';

const createFormattingModel = (tokens?: { mapbox?: string; maptiler?: string }) => ({
  BasemapVisualCardSettings: {
    basemapSelectSettingsGroup: {
      selectedBasemap: { value: { value: 'light' } },
      customMapAttribution: { value: '' }
    },
    mapBoxSettingsGroup: {
      mapboxCustomStyleUrl: { value: '' },
      mapboxStyle: { value: { value: 'streets' } },
      mapboxAccessToken: { value: tokens?.mapbox ?? 'format-token' },
      declutterLabels: { value: false }
    },
    maptilerSettingsGroup: {
      maptilerApiKey: { value: tokens?.maptiler ?? 'format-key' },
      maptilerStyle: { value: { value: 'basic' } }
    }
  }
});

describe('OptionsService basemap mapping', () => {
  it('maps basemap branch when provided', () => {
    const model: any = createFormattingModel();
    const opts = OptionsService.getBasemapOptions(model);
    expect(opts.selectedBasemap).toBe('light');
  });

  it('prefers data role credentials over format pane values', () => {
    const model: any = createFormattingModel({ mapbox: 'format-token', maptiler: 'format-key' });
    const opts = OptionsService.getBasemapOptions(model, {
      mapboxAccessToken: '  override-from-role  ',
      maptilerApiKey: 'override-key'
    });
    expect(opts.mapboxAccessToken).toBe('override-from-role');
    expect(opts.maptilerApiKey).toBe('override-key');
  });

  it('falls back to format pane credential when no data role value', () => {
    const model: any = createFormattingModel({ mapbox: '   format-token  ', maptiler: 'format-key' });
    const opts = OptionsService.getBasemapOptions(model, {
      mapboxAccessToken: undefined,
      maptilerApiKey: ''
    });
    expect(opts.mapboxAccessToken).toBe('format-token');
    expect(opts.maptilerApiKey).toBe('format-key');
  });
});
