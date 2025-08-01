# Technical API Reference - Scaled Circles

## Core Functions Reference

### `calculateCircleScale(combinedCircleSizeValues, circleOptions)`

Calculates the scaling parameters for circle rendering with adaptive outlier handling.

**Parameters:**
- `combinedCircleSizeValues: number[]` - Array of all data values to be scaled
- `circleOptions: CircleOptions` - Configuration object with min/max radius settings

**Returns:**
```typescript
{
    minCircleSizeValue: number;    // Minimum scaling value (5th percentile or actual min)
    maxCircleSizeValue: number;    // Maximum scaling value (95th percentile or compressed max)
    circleScale: number;           // Scaling factor for radius calculation
    selectedScalingMethod: string; // Always "square-root"
}
```

**Algorithm Details:**
1. Filters invalid values (NaN, infinite, null)
2. Calculates 5th and 95th percentiles for robust scaling
3. Detects outliers using gap ratio analysis
4. Applies adaptive scaling strategy when outliers exceed 20% threshold
5. Computes scaling factor for square-root transformation

---

### `applyScaling(value, minValue, maxValue, scaleFactor, scalingMethod, circleOptions, allDataValues?)`

Converts a data value to a circle radius using the scaling algorithm.

**Parameters:**
- `value: number` - Data value to scale
- `minValue: number` - Minimum scaling range value
- `maxValue: number` - Maximum scaling range value  
- `scaleFactor: number` - Precomputed scaling coefficient
- `scalingMethod: string` - Scaling method (always "square-root")
- `circleOptions: CircleOptions` - Circle configuration
- `allDataValues?: number[]` - Optional full dataset for outlier handling

**Returns:**
- `number` - Calculated circle radius in pixels

**Edge Cases:**
- Values beyond `maxValue` trigger compressed outlier scaling
- Values below `minValue` are clamped to minimum
- Invalid values return minimum radius

---

### `renderCircleLegend(combinedCircleSizeValues, numberofCircleCategories, minCircleSizeValue, maxCircleSizeValue, circleScale, selectedScalingMethod, circleOptions)`

Generates proportional circle legend with exact visual hierarchy.

**Parameters:**
- `combinedCircleSizeValues: number[]` - All data values
- `numberofCircleCategories: number` - Number of data categories
- `minCircleSizeValue: number` - Scaling minimum
- `maxCircleSizeValue: number` - Scaling maximum
- `circleScale: number` - Scaling factor
- `selectedScalingMethod: string` - Scaling method
- `circleOptions: CircleOptions` - Circle configuration

**Legend Generation Process:**
1. Calculate maximum map circle radius
2. Define proportional radii (100%, 50%, 25% diameters)
3. Find data values that produce target radii
4. Map to closest actual data values
5. Generate final radii using scaling function
6. Create legend with proportional circles

---

## Data Structures

### `CircleOptions` Interface

Complete configuration object for circle rendering:

```typescript
interface CircleOptions {
    // Layer Control
    layerControl: boolean;                    // Enable/disable circle layer
    
    // Visual Properties
    color1: string;                          // Primary circle color (#hex)
    color2: string;                          // Secondary circle color (#hex)
    minRadius: number;                       // Minimum circle radius (pixels)
    maxRadius: number;                       // Maximum circle radius (pixels)
    strokeColor: string;                     // Circle border color (#hex)
    strokeWidth: number;                     // Circle border width (pixels)
    layer1Opacity: number;                   // Primary layer opacity (0-1)
    layer2Opacity: number;                   // Secondary layer opacity (0-1)
    
    // Chart Configuration
    chartType: string;                       // "nested-circles" | "donut-chart"
    scalingMethod: string;                   // Fixed: "square-root"
    
    // Legend Configuration
    showLegend: boolean;                     // Display legend
    legendTitle: string;                     // Legend title text
    legendTitleColor: string;                // Title color (#hex)
    legendItemStrokeColor: string;           // Legend circle border color
    legendItemStrokeWidth: number;           // Legend circle border width
    leaderLineStrokeWidth: number;           // Leader line width
    leaderLineColor: string;                 // Leader line color
    labelTextColor: string;                  // Label text color
    
    // Advanced Settings
    roundOffLegendValues: boolean;           // Round legend numbers
    hideMinIfBelowThreshold: boolean;        // Hide small values
    minValueThreshold: number;               // Threshold for hiding
    minRadiusThreshold: number;              // Minimum radius threshold
    labelSpacing: number;                    // Label spacing (pixels)
    yPadding: number;                        // Vertical padding
    xPadding: number;                        // Horizontal padding
}
```

### `CircleLayerOptions` Interface

Configuration for the OpenLayers circle rendering layer:

```typescript
interface CircleLayerOptions extends LayerOptions {
    // Geographic Data
    longitudes: number[];                    // X coordinates
    latitudes: number[];                     // Y coordinates
    
    // Size Data
    combinedCircleSizeValues?: number[];     // All size values
    circle1SizeValues?: number[];            // Primary size values
    circle2SizeValues?: number[];            // Secondary size values
    
    // Scaling Parameters
    minCircleSizeValue?: number;             // Scaling minimum
    maxCircleSizeValue?: number;             // Scaling maximum
    circleScale?: number;                    // Scaling factor
    
    // Rendering Context
    circleOptions: CircleOptions;            // Circle configuration
    svg: any;                               // D3 SVG selection
    svgContainer: HTMLElement;               // SVG container element
    zIndex: number;                         // Layer z-index
    
    // Interactivity
    dataPoints?: Array<{                     // Data point objects
        longitude: number;
        latitude: number;
        tooltip: VisualTooltipDataItem[];
        selectionId: ISelectionId;
    }>;
    tooltipServiceWrapper: ITooltipServiceWrapper;
    selectionManager: powerbi.extensibility.ISelectionManager;
}
```

---

## Statistical Functions

### Percentile Calculation

```typescript
// 5th percentile calculation
const percentile5 = sortedValues[Math.floor(n * 0.05)];

// 95th percentile calculation  
const percentile95 = sortedValues[Math.floor(n * 0.95)];
```

### Outlier Detection

```typescript
// Gap ratio calculation
const percentileRange = percentile95 - percentile5;
const outlierGap = actualMax - percentile95;
const outlierGapRatio = percentileRange > 0 ? outlierGap / percentileRange : 0;

// Outlier threshold
const hasSignificantOutliers = outlierGapRatio > 0.2 && percentileRange > 0.001;
```

### Adaptive Scaling Logic

```typescript
if (outlierGapRatio > 0.2 && percentileRange > 0.001) {
    // Compress outlier range to 25% of robust range
    const robustRange = percentile95 - percentile5;
    const compressedOutlierRange = robustRange * 0.25;
    maxCircleSizeValue = percentile95 + compressedOutlierRange;
    
    console.log(`Adaptive scaling activated: Gap ratio=${outlierGapRatio.toFixed(2)}`);
} else {
    // Standard percentile scaling
    maxCircleSizeValue = percentile95;
}
```

---

## Rendering Pipeline

### Circle Rendering Process

1. **Data Preparation**
   ```typescript
   const validValues = combinedCircleSizeValues.filter(v => !isNaN(v) && isFinite(v));
   const sortedValues = [...validValues].sort((a, b) => a - b);
   ```

2. **Scaling Calculation**
   ```typescript
   const { minCircleSizeValue, maxCircleSizeValue, circleScale } = 
       this.calculateCircleScale(combinedCircleSizeValues, circleOptions);
   ```

3. **Radius Application**
   ```typescript
   const radius = this.applyScaling(value, minCircleSizeValue, maxCircleSizeValue, 
                                   circleScale, "square-root", circleOptions, validValues);
   ```

4. **SVG Rendering**
   ```typescript
   // D3.js circle creation with calculated radius
   const circle = group.append('circle')
       .attr('cx', x)
       .attr('cy', y)
       .attr('r', radius)
       .attr('fill', color)
       .attr('opacity', opacity);
   ```

### Legend Rendering Process

1. **Proportional Size Calculation**
   ```typescript
   const maxMapCircleRadius = this.applyScaling(mapScalingMaxValue, ...);
   const mediumLegendRadius = maxMapCircleRadius * 0.5;  // 50% diameter
   const smallLegendRadius = maxMapCircleRadius * 0.25;  // 25% diameter
   ```

2. **Value Mapping**
   ```typescript
   // Work backwards from radius to data value
   const mediumValue = ((mediumLegendRadius ** 2 - minRadiusSquared) / circleScale) + minCircleSizeValue;
   const closestMediumValue = this.findClosestValue(sortedValues, clampedMediumValue);
   ```

3. **Legend Creation**
   ```typescript
   this.legendService.createProportionalCircleLegend(labelValues, finalRadii, 
                                                     numberofCircleCategories, circleOptions);
   ```

---

## Performance Characteristics

### Computational Complexity

| Operation | Complexity | Notes |
|-----------|------------|-------|
| Data filtering | O(n) | Single pass through data |
| Sorting for percentiles | O(n log n) | Required for statistical analysis |
| Scaling calculation | O(1) | Constant time per value |
| Circle rendering | O(n) | Linear with number of data points |
| Legend generation | O(log n) | Binary search for closest values |

### Memory Usage

- **Data Storage**: ~24 bytes per data point (coordinates + value + metadata)
- **Scaling Cache**: ~8 bytes per unique value
- **Rendering Buffer**: Proportional to viewport size and circle count

### Optimization Recommendations

1. **Large Datasets (>5,000 points)**:
   - Consider data sampling or clustering
   - Implement viewport-based culling
   - Use requestAnimationFrame for smooth updates

2. **Frequent Updates**:
   - Cache scaling parameters when data range is stable
   - Debounce rapid configuration changes
   - Minimize DOM manipulation

3. **Memory Management**:
   - Clear SVG elements before re-rendering
   - Remove event listeners on layer destruction
   - Use object pooling for frequent allocations

---

## Testing Framework

### Unit Test Coverage

```typescript
describe('Circle Scaling', () => {
    test('calculateCircleScale handles empty data', () => {
        const result = calculateCircleScale([], defaultOptions);
        expect(result.minCircleSizeValue).toBe(0);
        expect(result.maxCircleSizeValue).toBe(0);
        expect(result.circleScale).toBe(1);
    });
    
    test('applyScaling produces correct radius', () => {
        const radius = applyScaling(50, 0, 100, 1, "square-root", options);
        expect(radius).toBeCloseTo(expectedRadius, 2);
    });
    
    test('outlier detection triggers adaptive scaling', () => {
        const data = [1, 2, 3, 4, 5, 100]; // 100 is outlier
        const result = calculateCircleScale(data, defaultOptions);
        expect(result.maxCircleSizeValue).toBeLessThan(100);
    });
});
```

### Integration Test Scenarios

1. **Data Validation**: Test with various data quality issues
2. **Outlier Handling**: Verify adaptive scaling with different outlier patterns
3. **Legend Accuracy**: Ensure legend circles match map circles exactly
4. **Performance**: Benchmark with datasets of various sizes
5. **Visual Regression**: Screenshot comparison for consistent rendering

---

## Error Codes and Messages

| Code | Message | Cause | Resolution |
|------|---------|-------|------------|
| `CIRCLES_001` | "Missing Longitude or Latitude roles" | Required coordinate fields not assigned | Assign Longitude and Latitude fields |
| `CIRCLES_002` | "Longitude and Latitude have different lengths" | Coordinate arrays size mismatch | Ensure coordinate data completeness |
| `CIRCLES_003` | "No valid size values found" | All size values are invalid | Check data types and null values |
| `CIRCLES_004` | "Scaling range too narrow" | Min/max values too close | Review data distribution |
| `CIRCLES_005` | "Adaptive scaling activated" | Outliers detected | Informational - system adapting |

---

*This API reference is automatically generated from the codebase and updated with each release.*
