// Jest setup file for Maplumi Power BI Visual tests

// Mock Power BI APIs
global.powerbi = {
  visuals: {
    ISelectionId: {} as any,
  },
  extensibility: {
    visual: {
      IVisual: {} as any,
    },
    ISelectionId: {} as any,
    ISelectionManager: {} as any,
    IVisualHost: {} as any,
  },
  DataView: {} as any,
  DataViewTable: {} as any,
  DataViewCategorical: {} as any,
} as any;

// Mock DOM APIs for OpenLayers
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock fetch for API calls
global.fetch = jest.fn();

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock SVG creation for D3
Object.defineProperty(document, 'createElementNS', {
  writable: true,
  value: jest.fn().mockImplementation((namespace, tagName) => {
    const element = document.createElement(tagName);
    return element;
  }),
});

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn();

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});
