# Choropleth API Reference (Concise)

Practical reference for classes, options, and common flows used by the choropleth layer.

## Core classes

### ChoroplethLayer

Constructor
```typescript
constructor(options: ChoroplethLayerOptions)
```

Key methods
- `render(frameState): HTMLElement` — render current view
- `setSelectedIds(ids: ISelectionId[])` — update selection
- `getFeaturesExtent(): Extent` — computed extent
- `getSpatialIndex(): RBush` — RBush instance

### GeoBoundariesService
- `buildApiUrl(options): string`
- `fetchMetadata(options): Promise<GeoBoundariesMetadata | GeoBoundariesMetadata[] | null>`
- `getBoundaryFieldName(options): 'shapeISO'|'shapeName'|'shapeID'|'shapeGroup'`
- `validateOptions(options): { isValid: boolean; message?: string }`
- `isAllCountriesRequest(options): boolean`
- `getAllCountriesUrl(): string`
- `getDownloadUrl(metadata, preferTopoJSON = true): string`

### ChoroplethDataService
- `processGeoData(data, pcodeKey, validPCodes, topojsonObjectName?): FeatureCollection`
- `extractTooltips(categorical): VisualTooltipDataItem[][]`
- `classifyData(values, method, classes): number[]`
- `createColorScale(values, colorRamp, method): (v:any)=>string`

## Options and interfaces

```typescript
interface ChoroplethLayerOptions extends LayerOptions {
    svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;
    svgContainer: HTMLElement;
    geojson: FeatureCollection;
    dataKey: string; // property used to join values
    categoryValues: string[];
    measureValues: number[];
    dataPoints?: ChoroplethDataPoint[];
    colorScale: (value: any) => string;
    strokeColor: string;
    strokeWidth: number;
    fillOpacity: number;
    selectionManager: ISelectionManager;
    tooltipServiceWrapper: ITooltipServiceWrapper;
    zIndex?: number;
    simplificationStrength?: number; // 0-100
}

interface ChoroplethOptions {
    boundaryDataSource: 'geoboundaries' | 'custom';
    geoBoundariesReleaseType?: 'gbOpen' | 'gbHumanitarian' | 'gbAuthoritative';
    geoBoundariesCountry?: string; // ISO or 'ALL'
    geoBoundariesAdminLevel?: 'ADM0'|'ADM1'|'ADM2'|'ADM3';
    sourceFieldID?: 'shapeISO'|'shapeName'|'shapeID'|'shapeGroup';
    topoJSON_geoJSON_FileUrl?: string;
    locationPcodeNameId?: string;
    topojsonObjectName?: string;
    classificationMethod: 'equal-interval' | 'quantile' | 'natural-breaks' | 'unique-values';
    classes: number;
    colorRamp: string[] | string; // array or CSV
    invertColorRamp?: boolean;
    strokeColor: string;
    strokeWidth: number;
    layerOpacity: number; // 0-1
    simplificationStrength?: number;
    showLegend: boolean;
    legendTitle?: string;
}

interface GeoBoundariesMetadata {
    boundaryID: string;
    boundaryName: string;
    boundaryISO?: string;
    boundaryType?: string;
    gjDownloadURL?: string;
    tjDownloadURL?: string;
    staticDownloadLink?: string;
}

interface ChoroplethDataPoint {
    pcode: string;
    value: number;
    selectionId: ISelectionId;
    tooltip: VisualTooltipDataItem[];
}
```

## External data

GeoBoundaries base
```typescript
const API = 'https://www.geoboundaries.org/api/current';
const url = `${API}/${releaseType}/${country}/${adminLevel}/`;
```

TopoJSON with multiple objects
1) Use `topojsonObjectName` if set
2) Else pick object with most polygonal geometries
3) Else use first object

Custom URL requirements
- HTTPS only; direct URL (no redirects)
- FeatureCollection with a join field matching your data (e.g., shapeISO, ADM*_PCODE)

## Events and tooltips

Selection
```typescript
selectionManager.registerOnSelectCallback(() => {
    choroplethLayer.setSelectedIds(selectionManager.getSelectionIds());
    choroplethLayer.changed();
});
```

Tooltip
```typescript
tooltipServiceWrapper.addTooltip(
    svgElement,
    () => dataPoint.tooltip,
    () => dataPoint.selectionId,
    true
);
```

## Validation helpers

```typescript
function validateChoroplethData(data: any): boolean {
    return !!(data && Array.isArray(data.features));
}

function validateColorRamp(colors: string[]): boolean {
    return colors.length >= 2 && colors.every(c => /^#([0-9A-Fa-f]{3}){1,2}$/.test(c));
}
```

## Performance notes
- RBush spatial index for hit-testing
- Zoom-level topology-preserving simplification
- Cache boundary payloads with sensible TTL

---

Keep this reference aligned with the code when public API shapes change.
