/**
 * Test fixtures for Power BI visual testing
 * Contains sample data that matches the expected Power BI data structures
 */

export const sampleDataViews = {
  choropleth: {
    metadata: {
      columns: [
        {
          displayName: "Region",
          roles: { "category": true },
          type: { text: true }
        },
        {
          displayName: "GDP per Capita",
          roles: { "measure": true },
          type: { numeric: true }
        }
      ]
    },
    categorical: {
      categories: [
        {
          source: {
            displayName: "Region",
            roles: { "category": true }
          },
          values: ["Nigeria", "South Africa", "Egypt", "Kenya", "Ghana"],
          identity: [
            { key: "Nigeria" },
            { key: "South Africa" },
            { key: "Egypt" },
            { key: "Kenya" },
            { key: "Ghana" }
          ]
        }
      ],
      values: [
        {
          source: {
            displayName: "GDP per Capita",
            roles: { "measure": true }
          },
          values: [75000, 65000, 70000, 55000, 68000]
        }
      ]
    }
  },

  scaledCircles: {
    metadata: {
      columns: [
        {
          displayName: "City",
          roles: { "category": true },
          type: { text: true }
        },
        {
          displayName: "Latitude",
          roles: { "latitude": true },
          type: { numeric: true }
        },
        {
          displayName: "Longitude",
          roles: { "longitude": true },
          type: { numeric: true }
        },
        {
          displayName: "Population",
          roles: { "size": true },
          type: { numeric: true }
        }
      ]
    },
    categorical: {
      categories: [
        {
          source: {
            displayName: "City",
            roles: { "category": true }
          },
          values: ["Lagos", "Cairo", "Johannesburg", "Nairobi", "Accra"],
          identity: [
            { key: "Lagos" },
            { key: "Cairo" },
            { key: "Johannesburg" },
            { key: "Nairobi" },
            { key: "Accra" }
          ]
        }
      ],
      values: [
        {
          source: {
            displayName: "Latitude",
            roles: { "latitude": true }
          },
          values: [6.5244, 30.0444, -26.2041, -1.2921, 5.6037]
        },
        {
          source: {
            displayName: "Longitude",
            roles: { "longitude": true }
          },
          values: [3.3792, 31.2357, 28.0473, 36.8219, -0.1870]
        },
        {
          source: {
            displayName: "Population",
            roles: { "size": true }
          },
          values: [15368000, 10440000, 5635127, 4397073, 2291352]
        }
      ]
    }
  }
};

export const sampleGeoData = {
  africanCountries: {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {
          name: "Nigeria",
          code: "NG",
          iso: "NGA"
        },
        geometry: {
          type: "Polygon",
          coordinates: [[
            [2.691702, 6.258316],
            [14.577478, 4.199715],
            [14.415379, 13.572949],
            [2.691702, 13.885645],
            [2.691702, 6.258316]
          ]]
        }
      },
      {
        type: "Feature",
        properties: {
          name: "South Africa",
          code: "ZA",
          iso: "ZAF"
        },
        geometry: {
          type: "Polygon",
          coordinates: [[
            [16.344976, -28.576705],
            [32.830120, -26.742208],
            [32.071384, -22.407922],
            [16.344976, -22.125598],
            [16.344976, -28.576705]
          ]]
        }
      },
      {
        type: "Feature",
        properties: {
          name: "Egypt",
          code: "EG",
          iso: "EGY"
        },
        geometry: {
          type: "Polygon",
          coordinates: [[
            [24.696166, 22.000000],
            [36.248115, 22.000000],
            [34.266110, 31.588061],
            [25.164792, 31.588061],
            [24.696166, 22.000000]
          ]]
        }
      },
      {
        type: "Feature",
        properties: {
          name: "Kenya",
          code: "KE",
          iso: "KEN"
        },
        geometry: {
          type: "Polygon",
          coordinates: [[
            [33.909859, -4.677419],
            [41.899078, -1.684245],
            [41.899078, 5.506540],
            [33.909859, 4.624040],
            [33.909859, -4.677419]
          ]]
        }
      },
      {
        type: "Feature",
        properties: {
          name: "Ghana",
          code: "GH",
          iso: "GHA"
        },
        geometry: {
          type: "Polygon",
          coordinates: [[
            [-3.261120, 4.736723],
            [1.191781, 5.928837],
            [1.060122, 11.173835],
            [-2.940050, 11.173835],
            [-3.261120, 4.736723]
          ]]
        }
      }
    ]
  }
};

export const sampleVisualOptions = {
  choropleth: {
    dataColors: {
      diverging: false,
      fillNullValueColor: { value: "#CCCCCC" }
    },
    legend: {
      show: true,
      position: "Right",
      showTitle: true,
      titleText: "GDP per Capita (USD)",
      labelColor: { value: "#000000" },
      fontSize: 10
    },
    dataPoint: {
      fill: { value: "#ff0000" },
      strokeWidth: { value: 1 },
      strokeColor: { value: "#ffffff" }
    },
    categoryAxis: {
      show: true,
      axisType: "Categorical",
      axisScale: "linear",
      start: null,
      end: null,
      axisStyle: "showTitleOnly",
      fontSize: 11,
      fontFamily: "Segoe UI",
      labelColor: { value: "#000000" }
    }
  },

  scaledCircles: {
    dataColors: {
      diverging: false,
      fillNullValueColor: { value: "#CCCCCC" }
    },
    legend: {
      show: true,
      position: "Bottom",
      showTitle: true,
      titleText: "Population",
      labelColor: { value: "#000000" },
      fontSize: 10
    },
    dataPoint: {
      fill: { value: "#0066cc" },
      strokeWidth: { value: 2 },
      strokeColor: { value: "#ffffff" },
      transparency: { value: 20 }
    },
    categoryAxis: {
      show: true,
      fontSize: 11,
      fontFamily: "Segoe UI",
      labelColor: { value: "#000000" }
    },
    circles: {
      minRadius: { value: 5 },
      maxRadius: { value: 50 },
      scalingMethod: "sqrt"
    }
  }
};

export const sampleClassificationResults = {
  quantile: {
    method: "quantile",
    classes: [55000, 65000, 68000, 70000, 75000],
    counts: [1, 1, 1, 1, 1]
  },
  
  equal: {
    method: "equal",
    classes: [55000, 60000, 65000, 70000, 75000],
    counts: [1, 1, 1, 1, 1]
  },
  
  jenks: {
    method: "jenks",
    classes: [55000, 65000, 68000, 70000, 75000],
    counts: [1, 1, 1, 1, 1]
  }
};

export const sampleColorSchemes = {
  sequential: ["#ffffcc", "#ffeda0", "#fed976", "#feb24c", "#fd8d3c", "#fc4e2a", "#e31a1c", "#bd0026", "#800026"],
  diverging: ["#d73027", "#f46d43", "#fdae61", "#fee08b", "#ffffbf", "#e6f598", "#abdda4", "#66c2a5", "#3288bd"],
  qualitative: ["#e41a1c", "#377eb8", "#4daf4a", "#984ea3", "#ff7f00", "#ffff33", "#a65628", "#f781bf", "#999999"]
};

export const samplePowerBIHost = {
  createSelectionIdBuilder: () => ({
    withCategory: () => ({ createSelectionId: () => ({ key: "test" }) }),
    withMeasure: () => ({ createSelectionId: () => ({ key: "test" }) }),
    createSelectionId: () => ({ key: "test" })
  }),
  createSelectionManager: () => ({
    select: jest.fn(),
    clear: jest.fn(),
    getSelectionIds: jest.fn().mockReturnValue([])
  }),
  colorPalette: {
    getColor: (index: number) => ({
      value: sampleColorSchemes.qualitative[index % sampleColorSchemes.qualitative.length]
    })
  },
  tooltipService: {
    enabled: () => true,
    show: jest.fn(),
    hide: jest.fn(),
    move: jest.fn()
  },
  allowInteractions: true,
  locale: "en-US"
};

export const sampleUpdateOptions = {
  viewport: {
    width: 800,
    height: 600
  },
  dataViews: [sampleDataViews.choropleth],
  type: 2, // VisualUpdateType.Data
  operationKind: 0,
  jsonFilters: []
};

export const createMockElement = (id: string, width = 800, height = 600): HTMLElement => {
  const element = document.createElement('div');
  element.id = id;
  element.style.width = `${width}px`;
  element.style.height = `${height}px`;
  element.style.position = 'relative';
  
  // Mock getBoundingClientRect
  element.getBoundingClientRect = () => ({
    width,
    height,
    top: 0,
    left: 0,
    bottom: height,
    right: width,
    x: 0,
    y: 0,
    toJSON: () => ({})
  });
  
  return element;
};

export const createMockDataView = (type: 'choropleth' | 'scaledCircles') => {
  return sampleDataViews[type];
};

export const createMockUpdateOptions = (overrides: any = {}) => {
  return {
    ...sampleUpdateOptions,
    ...overrides
  };
};
