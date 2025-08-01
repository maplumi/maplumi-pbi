// Mock data for Power BI visual tests

export const mockPowerBIHost = {
  createSelectionIdBuilder: jest.fn(() => ({
    withCategory: jest.fn().mockReturnThis(),
    withMeasure: jest.fn().mockReturnThis(),
    createSelectionId: jest.fn(() => ({ id: 'mock-selection-id' })),
  })),
  createSelectionManager: jest.fn(() => ({
    select: jest.fn(),
    getSelectionIds: jest.fn(() => []),
    registerOnSelectCallback: jest.fn(),
  })),
  tooltipService: {
    enabled: true,
    show: jest.fn(),
    hide: jest.fn(),
  },
  displayWarningIcon: jest.fn(),
  persistProperties: jest.fn(),
  eventService: {
    renderingStarted: jest.fn(),
    renderingFinished: jest.fn(),
  },
};

export const mockDataView = {
  categorical: {
    categories: [
      {
        source: {
          roles: { Longitude: true },
          displayName: 'Longitude',
        },
        values: [3.3792, 31.2357, 28.0473],
      },
      {
        source: {
          roles: { Latitude: true },
          displayName: 'Latitude',
        },
        values: [6.5244, 30.0444, -26.2041],
      },
      {
        source: {
          roles: { AdminPCodeNameID: true },
          displayName: 'Location',
        },
        values: ['NG001', 'EG001', 'ZA001'],
      },
    ],
    values: [
      {
        source: {
          roles: { Size: true },
          displayName: 'Population',
          queryName: 'population',
        },
        values: [15000000, 10000000, 5000000],
      },
      {
        source: {
          roles: { Color: true },
          displayName: 'GDP',
          queryName: 'gdp',
        },
        values: [75000, 70000, 65000],
      },
    ],
  },
};

export const mockGeoJsonData = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        ADM1_PCODE: 'NG001',
        ADM1_NAME: 'Lagos State',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [3.3792, 6.5244],
          [3.3792, 6.7244],
          [3.5792, 6.7244],
          [3.5792, 6.5244],
          [3.3792, 6.5244],
        ]],
      },
    },
    {
      type: 'Feature',
      properties: {
        ADM1_PCODE: 'EG001',
        ADM1_NAME: 'Cairo Governorate',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [31.2357, 30.0444],
          [31.2357, 30.2444],
          [31.4357, 30.2444],
          [31.4357, 30.0444],
          [31.2357, 30.0444],
        ]],
      },
    },
    {
      type: 'Feature',
      properties: {
        ADM1_PCODE: 'ZA001',
        ADM1_NAME: 'Gauteng Province',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [28.0473, -26.2041],
          [28.0473, -26.0041],
          [28.2473, -26.0041],
          [28.2473, -26.2041],
          [28.0473, -26.2041],
        ]],
      },
    },
  ],
};

export const mockCircleOptions = {
  layerControl: true,
  color1: '#ff0000',
  color2: '#00ff00',
  minRadius: 3,
  maxRadius: 25,
  strokeColor: '#000000',
  strokeWidth: 1,
  layer1Opacity: 0.8,
  layer2Opacity: 0.6,
  showLegend: true,
  legendTitle: 'Population',
  chartType: 'nested-circles',
  scalingMethod: 'square-root',
};

export const mockChoroplethOptions = {
  layerControl: true,
  locationPcodeNameId: 'ADM1_PCODE',
  topoJSON_geoJSON_FileUrl: 'https://example.com/african-boundaries.json',
  colorRamp: 'blues',
  customColorRamp: '',
  classes: 5,
  classificationMethod: 'natural-breaks',
  strokeColor: '#ffffff',
  strokeWidth: 1,
  layerOpacity: 0.7,
  showLegend: true,
  legendTitle: 'GDP per Capita (USD)',
};
