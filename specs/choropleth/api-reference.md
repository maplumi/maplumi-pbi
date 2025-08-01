# Choropleth API Reference

## Overview

This document provides comprehensive API reference for the choropleth visualization component of the Maplumi Power BI visual. It covers all public methods, interfaces, configuration options, and integration patterns for developers working with or extending the choropleth functionality.

## Table of Contents

1. [Core Classes](#core-classes)
2. [Data Service APIs](#data-service-apis)
3. [Configuration Interfaces](#configuration-interfaces)
4. [External API Integration](#external-api-integration)
5. [Event Handling](#event-handling)
6. [Utility Methods](#utility-methods)

---

## Core Classes

### ChoroplethLayer

Main rendering layer class extending OpenLayers Layer.

#### Constructor
```typescript
constructor(options: ChoroplethLayerOptions)
```

**Parameters:**
- `options: ChoroplethLayerOptions` - Configuration object for layer initialization

#### Public Methods

##### `render(frameState: FrameState): HTMLElement`
Renders the choropleth layer for the current map view.

**Parameters:**
- `frameState: FrameState` - OpenLayers frame state containing view information

**Returns:**
- `HTMLElement` - SVG container element

**Example:**
```typescript
const layer = new ChoroplethLayer(options);
const renderedElement = layer.render(frameState);
```

##### `setSelectedIds(selectionIds: ISelectionId[]): void`
Updates the visual selection state for choropleth features.

**Parameters:**
- `selectionIds: ISelectionId[]` - Array of Power BI selection identifiers

##### `setActive(active: boolean): void`
Controls layer visibility and interaction.

**Parameters:**
- `active: boolean` - Layer active state

##### `getFeaturesExtent(): Extent`
Calculates the geographic extent of all features.

**Returns:**
- `Extent` - OpenLayers extent array `[minX, minY, maxX, maxY]`

##### `getSpatialIndex(): RBush`
Provides access to the spatial index for custom hit-testing.

**Returns:**
- `RBush` - Spatial index instance

#### Properties

##### `options: ChoroplethLayerOptions` (readonly)
Layer configuration options.

##### `valueLookup: { [key: string]: number }` (readonly)
Administrative code to value mapping.

---

## Data Service APIs

### ChoroplethDataService

Service class for data processing and transformation.

#### Constructor
```typescript
constructor(colorRampManager: ColorRampManager, host: IVisualHost)
```

#### Public Methods

##### `processGeoData(data: any, pcodeKey: string, validPCodes: string[]): FeatureCollection`
Processes raw geographic data into rendering-ready format.

**Parameters:**
- `data: any` - Raw GeoJSON or TopoJSON data
- `pcodeKey: string` - Property key for administrative codes
- `validPCodes: string[]` - Array of valid administrative codes to include

**Returns:**
- `FeatureCollection` - Processed GeoJSON feature collection

**Example:**
```typescript
const processedData = dataService.processGeoData(
    rawBoundaryData,
    'ADM1_PCODE',
    ['AF001', 'AF002', 'AF003']
);
```

##### `extractTooltips(categorical: any): VisualTooltipDataItem[][]`
Extracts tooltip information from Power BI categorical data.

**Parameters:**
- `categorical: any` - Power BI categorical data structure

**Returns:**
- `VisualTooltipDataItem[][]` - Array of tooltip item arrays

##### `classifyData(values: number[], method: string, classes: number): number[]`
Applies statistical classification to data values.

**Parameters:**
- `values: number[]` - Numeric values to classify
- `method: string` - Classification method ('equal-interval', 'quantile', 'natural-breaks')
- `classes: number` - Number of classes (2-9)

**Returns:**
- `number[]` - Array of class break values

**Example:**
```typescript
const breaks = dataService.classifyData(
    [10, 25, 30, 45, 60, 75, 90],
    'quantile',
    5
);
// Returns: [10, 25, 45, 75, 90]
```

##### `createColorScale(values: any[], colorRamp: string[], method: string): Function`
Creates a color mapping function for data values.

**Parameters:**
- `values: any[]` - Data values (numeric or categorical)
- `colorRamp: string[]` - Array of hex color values
- `method: string` - Classification method or 'unique-values'

**Returns:**
- `Function` - Color mapping function `(value) => color`

**Example:**
```typescript
const colorScale = dataService.createColorScale(
    [10, 20, 30, 40, 50],
    ['#fee5d9', '#fcae91', '#fb6a4a', '#cb181d'],
    'equal-interval'
);
const color = colorScale(25); // Returns: '#fcae91'
```

#### Classification Methods

##### `classifyEqualInterval(values: number[], classes: number): number[]`
Equal interval classification implementation.

##### `classifyQuantile(values: number[], classes: number): number[]`
Quantile classification implementation.

##### `classifyNaturalBreaks(values: number[], classes: number): number[]`
Natural breaks (Jenks) classification implementation.

---

## Configuration Interfaces

### ChoroplethLayerOptions

Main configuration interface for choropleth layer.

```typescript
interface ChoroplethLayerOptions extends LayerOptions {
    // Rendering context
    svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;
    svgContainer: HTMLElement;
    
    // Geographic data
    geojson: FeatureCollection;
    dataKey: string;
    
    // Data mapping
    categoryValues: string[];
    measureValues: number[];
    dataPoints?: ChoroplethDataPoint[];
    
    // Styling
    colorScale: (value: any) => string;
    strokeColor: string;
    strokeWidth: number;
    fillOpacity: number;
    
    // Interaction
    selectionManager: ISelectionManager;
    tooltipServiceWrapper: ITooltipServiceWrapper;
    
    // Performance
    zIndex?: number;
}
```

### ChoroplethOptions

User configuration options from Power BI settings.

```typescript
interface ChoroplethOptions {
    // Layer control
    layerControl: boolean;
    
    // Data source
    apiEndpoint: string;
    locationLevel: string;
    pcodeColumn: string;
    mapDataKey: string;
    
    // Classification
    classificationMethod: string;
    numberOfClasses: number;
    
    // Visual styling
    colorRamp: string;
    customColorRamp: string;
    reverseColorRamp: boolean;
    strokeColor: string;
    strokeWidth: number;
    fillOpacity: number;
    
    // Legend
    showLegend: boolean;
    legendTitle: string;
    legendTitleColor: string;
    legendPosition: string;
    legendOrientation: string;
    labelFormat: string;
}
```

### ChoroplethDataPoint

Data point structure for Power BI integration.

```typescript
interface ChoroplethDataPoint {
    pcode: string;
    value: number;
    selectionId: ISelectionId;
    tooltip: VisualTooltipDataItem[];
}
```

---

## External API Integration

### Boundary Data APIs

#### Standard Endpoint Structure
```typescript
// Base URL pattern
const API_BASE = 'https://api.example.com/boundaries';

// Administrative levels
const ENDPOINTS = {
    country: `${API_BASE}/countries`,
    region: `${API_BASE}/admin1`,
    district: `${API_BASE}/admin2`,
    subdistrict: `${API_BASE}/admin3`
};
```

#### Fetch Boundary Data
```typescript
async function fetchChoroplethData(
    endpoint: string,
    locationLevel: string,
    signal?: AbortSignal
): Promise<FeatureCollection> {
    const response = await fetch(`${endpoint}/${locationLevel}`, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        signal
    });
    
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
}
```

#### Expected Data Format
```typescript
// GeoJSON FeatureCollection
{
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "properties": {
                "ADM1_PCODE": "AF001",
                "ADM1_NAME": "Kabul",
                "ISO_A3": "AFG"
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[...coordinates...]]]
            }
        }
    ]
}
```

### Cache Integration

#### Cache Service Methods
```typescript
interface CacheService {
    get(key: string): any;
    set(key: string, value: any, ttl?: number): void;
    has(key: string): boolean;
    delete(key: string): void;
    clear(): void;
}
```

#### Usage Example
```typescript
const cacheKey = `boundaries_${endpoint}_${locationLevel}`;
let boundaryData = cacheService.get(cacheKey);

if (!boundaryData) {
    boundaryData = await fetchChoroplethData(endpoint, locationLevel);
    cacheService.set(cacheKey, boundaryData, 3600000); // 1 hour TTL
}
```

---

## Event Handling

### Selection Events

#### Selection Change Handler
```typescript
// Register selection callback
selectionManager.registerOnSelectCallback(() => {
    const selectionIds = selectionManager.getSelectionIds();
    choroplethLayer.setSelectedIds(selectionIds);
    choroplethLayer.changed();
});
```

#### Click Event Handler
```typescript
// Feature click handling
path.on('click', (event: MouseEvent) => {
    const dataPoint = getDataPointForFeature(feature);
    if (!dataPoint?.selectionId) return;
    
    const isMultiSelect = event.ctrlKey || event.metaKey;
    selectionManager.select(dataPoint.selectionId, isMultiSelect)
        .then((selectedIds: ISelectionId[]) => {
            // Handle selection change
            updateSelectionVisuals(selectedIds);
        });
});
```

### Tooltip Events

#### Tooltip Registration
```typescript
// Add Power BI tooltip to feature
tooltipServiceWrapper.addTooltip(
    svgElement,
    () => dataPoint.tooltip,        // Tooltip data provider
    () => dataPoint.selectionId,    // Selection ID provider
    true                            // Reposition on scroll
);
```

### Rendering Events

#### Layer Change Events
```typescript
// Trigger layer re-render
layer.changed();

// Listen for rendering events
host.eventService.renderingStarted(options);
// ... perform rendering ...
host.eventService.renderingFinished(options);
```

---

## Utility Methods

### Geometry Processing

#### Feature Simplification
```typescript
function getSimplificationTolerance(resolution: number): number {
    const baselineResolution = 1000;
    const baseTolerance = 0.001;
    return baseTolerance * (resolution / baselineResolution);
}

// Apply simplification
import { simplify } from '@turf/turf';
const tolerance = getSimplificationTolerance(frameState.viewState.resolution);
const simplified = simplify(geojson, { tolerance, highQuality: false });
```

#### Spatial Indexing
```typescript
import rbush from 'rbush';

function buildSpatialIndex(features: GeoJSONFeature[]): RBush<any> {
    const index = new rbush();
    const indexItems = features.map(feature => {
        const bounds = geoBounds(feature);
        return {
            minX: bounds[0][0],
            minY: bounds[0][1],
            maxX: bounds[1][0],
            maxY: bounds[1][1],
            feature: feature
        };
    });
    index.load(indexItems);
    return index;
}
```

### Data Validation

#### Validate Geographic Data
```typescript
function validateChoroplethData(data: any): boolean {
    if (!data || typeof data !== 'object') return false;
    if (!data.features || !Array.isArray(data.features)) return false;
    
    return data.features.every(feature => 
        feature.geometry && 
        feature.properties && 
        typeof feature.properties === 'object'
    );
}
```

#### Validate Power BI Data
```typescript
function validateDataView(dataView: powerbi.DataView): boolean {
    if (!dataView || !dataView.categorical) return false;
    
    const categorical = dataView.categorical;
    const hasLocation = categorical.categories?.some(cat => 
        cat.source.roles['Location']
    );
    const hasChoroplethValue = categorical.values?.some(val => 
        val.source.roles['ChoroplethValue']
    );
    
    return hasLocation && hasChoroplethValue;
}
```

### Color Management

#### Color Ramp Validation
```typescript
function validateColorRamp(colors: string[]): boolean {
    const hexPattern = /^#([0-9A-Fa-f]{3}){1,2}$/;
    return colors.length >= 2 && colors.every(color => hexPattern.test(color));
}
```

#### Color Interpolation
```typescript
import * as chroma from 'chroma-js';

function createColorInterpolator(colorRamp: string[]): (t: number) => string {
    return chroma.scale(colorRamp).mode('lab');
}
```

---

## Error Handling

### Error Types

#### `ChoroplethDataError`
```typescript
class ChoroplethDataError extends Error {
    constructor(message: string, public readonly code: string) {
        super(message);
        this.name = 'ChoroplethDataError';
    }
}
```

#### `BoundaryAPIError`
```typescript
class BoundaryAPIError extends Error {
    constructor(
        message: string, 
        public readonly status?: number,
        public readonly endpoint?: string
    ) {
        super(message);
        this.name = 'BoundaryAPIError';
    }
}
```

### Error Handling Patterns

#### Network Request Errors
```typescript
try {
    const data = await fetchChoroplethData(endpoint, level, abortSignal);
    return processGeoData(data, pcodeKey, validPCodes);
} catch (error) {
    if (error.name === 'AbortError') {
        console.log('Request cancelled');
        return null;
    }
    
    throw new BoundaryAPIError(
        `Failed to fetch boundary data: ${error.message}`,
        error.status,
        endpoint
    );
}
```

#### Data Processing Errors
```typescript
try {
    const processedData = dataService.processGeoData(rawData, key, codes);
    return processedData;
} catch (error) {
    throw new ChoroplethDataError(
        `Invalid geographic data format: ${error.message}`,
        'INVALID_GEODATA'
    );
}
```

---

## Performance Considerations

### Optimization Strategies

1. **Spatial Indexing**: Use RBush for O(log n) hit-testing
2. **Geometry Simplification**: Dynamic simplification based on zoom level
3. **Data Caching**: Cache boundary data to reduce API calls
4. **Conditional Rendering**: Only re-render when necessary

### Memory Management

```typescript
// Clean up resources
function dispose(): void {
    if (spatialIndex) {
        spatialIndex.clear();
    }
    if (abortController) {
        abortController.abort();
    }
    svg.selectAll('*').remove();
}
```

### Performance Monitoring

```typescript
// Monitor rendering performance
const startTime = performance.now();
layer.render(frameState);
const renderTime = performance.now() - startTime;
console.log(`Choropleth render time: ${renderTime.toFixed(2)}ms`);
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-01 | Initial API implementation |
| 1.1 | 2025-01 | Added spatial indexing support |
| 1.2 | 2025-01 | Enhanced error handling and validation |

---

*This API reference documents the current choropleth implementation and should be updated when new features or breaking changes are introduced.*
