// Jest setup file for Maplumi Power BI Visual tests
import { jest, afterEach } from '@jest/globals';

// Mock Power BI APIs
global.powerbi = {
  visuals: {
    ISelectionId: {} as any,
    ValidatorType: {
      Max: 'Max',
      Min: 'Min',
    } as any,
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
  value: jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })) as any,
});

// Mock fetch for API calls
(global as any).fetch = jest.fn();

// Mock ResizeObserver
(global as any).ResizeObserver = class {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
} as any;

// Mock SVG creation for D3
Object.defineProperty(document, 'createElementNS', {
  writable: true,
  value: (jest.fn().mockImplementation((namespace: string, tagName: string) => {
    const element = document.createElement(tagName as string);
    return element as any;
  })) as any,
});

// Mock URL.createObjectURL
(global as any).URL.createObjectURL = jest.fn() as any;

// Mock canvas 2D context for jsdom
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: jest.fn().mockImplementation(() => ({
    canvas: document.createElement('canvas'),
    // Minimal subset used in our code
    setTransform: jest.fn(),
    clearRect: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    closePath: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(),
    stroke: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    translate: jest.fn(),
  } as unknown as CanvasRenderingContext2D)),
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// No deprecation suppression needed; Jest maps 'punycode' to userland implementation.

// Ensure this file is treated as a module to avoid polluting the global scope
export {};
