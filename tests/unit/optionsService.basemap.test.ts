import { OptionsService } from "../../src/services/OptionsService";
import { BasemapNames } from "../../src/constants/strings";

// Build a minimal MaplumiVisualFormattingSettingsModel-like object for basemap only
function buildModel(overrides?: Partial<any>): any {
  const model: any = {
    BasemapVisualCardSettings: {
      basemapSelectSettingsGroup: {
        selectedBasemap: { value: { value: BasemapNames.OpenStreetMap } },
        customMapAttribution: { value: "© Custom" },
      },
      mapBoxSettingsGroup: {
        mapboxCustomStyleUrl: { value: "mapbox://styles/mapbox/streets-v12" },
        mapboxStyle: { value: { value: "mapbox://styles/mapbox/light-v10" } },
        mapboxAccessToken: { value: "pk.test" },
        declutterLabels: { value: true },
      },
      maptilerSettingsGroup: {
        maptilerApiKey: { value: "mt-test" },
        maptilerStyle: { value: { value: "dataviz" } },
      },
    },
  };
  return Object.assign({}, model, overrides);
}

describe("OptionsService.getBasemapOptions", () => {
  it("maps OpenStreetMap selections and attribution", () => {
    const model = buildModel();
    const opts = OptionsService.getBasemapOptions(model);
    expect(opts.selectedBasemap).toBe(BasemapNames.OpenStreetMap);
    expect(opts.customMapAttribution).toBe("© Custom");
    expect(opts.mapboxAccessToken).toBe("pk.test");
    expect(opts.maptilerStyle).toBe("dataviz");
  });

  it("supports Mapbox selected and custom style url", () => {
    const model = buildModel({
      BasemapVisualCardSettings: {
        basemapSelectSettingsGroup: {
          selectedBasemap: { value: { value: BasemapNames.Mapbox } },
          customMapAttribution: { value: "© ACME" },
        },
        mapBoxSettingsGroup: {
          mapboxCustomStyleUrl: { value: "mapbox://styles/acme/custom" },
          mapboxStyle: { value: { value: "custom" } },
          mapboxAccessToken: { value: "pk.custom" },
          declutterLabels: { value: false },
        },
        maptilerSettingsGroup: {
          maptilerApiKey: { value: "mt" },
          maptilerStyle: { value: { value: "basic" } },
        },
      },
    });

    const opts = OptionsService.getBasemapOptions(model);
    expect(opts.selectedBasemap).toBe(BasemapNames.Mapbox);
    expect(opts.mapboxCustomStyleUrl).toBe("mapbox://styles/acme/custom");
    expect(opts.mapboxStyle).toBe("custom");
    expect(opts.declutterLabels).toBe(false);
  });

  it("supports MapTiler selection mapping", () => {
    const model = buildModel({
      BasemapVisualCardSettings: {
        basemapSelectSettingsGroup: {
          selectedBasemap: { value: { value: BasemapNames.MapTiler } },
          customMapAttribution: { value: "" },
        },
        mapBoxSettingsGroup: {
          mapboxCustomStyleUrl: { value: "" },
          mapboxStyle: { value: { value: "mapbox://styles/mapbox/light-v10" } },
          mapboxAccessToken: { value: "" },
          declutterLabels: { value: true },
        },
        maptilerSettingsGroup: {
          maptilerApiKey: { value: "api-key" },
          maptilerStyle: { value: { value: "streets" } },
        },
      },
    });

    const opts = OptionsService.getBasemapOptions(model);
    expect(opts.selectedBasemap).toBe(BasemapNames.MapTiler);
    expect(opts.maptilerApiKey).toBe("api-key");
    expect(opts.maptilerStyle).toBe("streets");
  });
});
