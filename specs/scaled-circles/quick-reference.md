# Quick Reference Guide - Scaled Circles

## At a Glance

**What it does**: Creates proportional circles on a map where circle size represents data magnitude with intelligent outlier handling.

**Best for**: Showing geographic distribution of quantitative data (population, sales, incidents, etc.)

**Key Features**:
- ✅ Automatic outlier detection and handling
- ✅ Proportional legend with exact size relationships
- ✅ Nested circles for dual data dimensions
- ✅ Square-root scaling for optimal visual perception

---

## Quick Setup

### Required Fields
1. **Longitude** - Geographic X coordinate (decimal degrees)
2. **Latitude** - Geographic Y coordinate (decimal degrees)
3. **Size** - Numeric value for circle scaling

### Optional Fields
- **Size (Secondary)** - For nested/dual circles
- **Tooltips** - Additional fields for hover information

---

## Understanding Circle Sizes

### How Scaling Works
- Circle **areas** (not diameters) scale with your data
- Uses **square-root scaling** for best visual perception
- **5th-95th percentile** range used for robust scaling
- **Outliers** automatically compressed but remain visible

### Visual Hierarchy
- **Largest circles** = 95th percentile of your data (or compressed maximum)
- **Medium circles** = Values producing circles with 50% diameter of largest
- **Smallest circles** = Values producing circles with 25% diameter of largest

---

## Legend Interpretation

The legend shows three circles with exact proportional relationships:

```
⚫ Large   = 100% diameter (represents scaling maximum)
⚪ Medium  = 50% diameter  (proportional mid-value)
⚬ Small   = 25% diameter  (proportional low-value)
```

**Labels show actual data values** that produce these circle sizes.

---

## Configuration Quick Tips

### Circle Appearance
| Setting | Recommendation | Why |
|---------|---------------|-----|
| Min Radius | 3-5 pixels | Ensures smallest circles are visible |
| Max Radius | 20-30 pixels | Prevents circles from dominating map |
| Opacity | 60-80% | Allows overlapping circles to be seen |
| Stroke Width | 1-2 pixels | Provides definition without clutter |

### Color Selection
- **Single Circles**: Use high contrast with map background
- **Nested Circles**: Ensure inner/outer colors are distinguishable
- **Accessibility**: Don't rely solely on color for information

### Legend Positioning
- **Bottom-left**: Default, good for most maps
- **Top-right**: Better when data is concentrated in lower-left
- **Avoid center**: Don't obscure your data

---

## Common Scenarios

### Scenario 1: Population by City
- **Data**: City populations
- **Expected**: Few large cities, many small towns
- **Behavior**: Adaptive scaling handles mega-cities as outliers
- **Result**: Small towns remain visible, large cities are proportionally larger

### Scenario 2: Sales by Store
- **Data**: Store revenue figures  
- **Expected**: Relatively even distribution
- **Behavior**: Standard percentile scaling
- **Result**: Clear visual hierarchy across all stores

### Scenario 3: Incident Counts
- **Data**: Number of incidents per location
- **Expected**: Most locations have few incidents, rare locations have many
- **Behavior**: Outlier compression for high-incident locations
- **Result**: Normal locations show fine detail, outliers remain visible

---

## Troubleshooting

### "Circles are too small/large"
- **Adjust**: Min/Max radius settings
- **Check**: Data range - very wide ranges may need data transformation

### "Can't see overlapping circles"
- **Adjust**: Layer opacity settings
- **Consider**: Using nested circles instead of overlapping

### "Legend doesn't match map"
- **Cause**: This shouldn't happen with current implementation
- **Action**: Report as bug - legend should exactly match map scaling

### "All circles look the same size"
- **Cause**: Data has very narrow range
- **Solution**: Check data distribution, consider different visualization

### "One huge circle dominates everything"
- **Expected**: System should handle this automatically
- **Check**: Ensure outlier value is actually in your data
- **Look for**: Console message about adaptive scaling activation

---

## Data Preparation Best Practices

### ✅ Do This
- Clean null/undefined values before import
- Use decimal degrees for coordinates (not DMS)
- Include meaningful tooltip fields
- Consider log transformation for very wide ranges
- Test with representative data sample

### ❌ Avoid This
- Don't use categorical data for circle sizes
- Don't mix different units in size field
- Don't use zero or negative values for sizes
- Don't include extreme outliers without review
- Don't exceed 10,000 data points for best performance

---

## Advanced Features

### Nested Circles
- **Purpose**: Show two related dimensions
- **Example**: Population (outer) and GDP (inner) for cities
- **Configuration**: Assign both "Size" and "Size (Secondary)" fields

### Donut Charts
- **Purpose**: Show part-to-whole relationships
- **Example**: Total budget (size) and spent portion (angle)
- **Configuration**: Set chart type to "donut-chart"

### Adaptive Scaling
- **Automatic**: No configuration needed
- **Triggers**: When outliers exceed 20% of data range
- **Effect**: Outliers compressed but remain proportionally larger
- **Indicator**: Console message when activated

---

## Performance Guidelines

| Data Points | Performance | Recommendations |
|-------------|-------------|-----------------|
| < 1,000 | Excellent | No special considerations |
| 1,000 - 5,000 | Good | Standard configuration works well |
| 5,000 - 10,000 | Fair | Consider reducing circle complexity |
| > 10,000 | Poor | Use data aggregation or clustering |

---

## Keyboard Shortcuts

| Action | Shortcut | Effect |
|--------|----------|--------|
| Pan map | Arrow keys | Move map view |
| Zoom in | + or = | Increase zoom level |
| Zoom out | - | Decrease zoom level |
| Reset view | Home | Fit to data extent |
| Select circle | Click | Highlight and show tooltip |

---

## Export and Sharing

### Screenshot Tips
- Hide legend temporarily if it obscures data
- Ensure all important circles are in viewport
- Use high contrast colors for print compatibility

### Data Export
- Circle sizes are calculated values, not in raw data
- Export includes original data values
- Legend values represent actual data points

---

## Version Notes

**Current Version**: 2.2
- ✨ Adaptive outlier handling
- ✨ Proportional legend sizing
- ✨ Enhanced visual hierarchy
- 🐛 Fixed legend-map size synchronization

**Upcoming Features**:
- Multi-level clustering for dense datasets
- Animation support for data transitions
- Custom scaling function options

---

*Need help? Check the full specification document or contact support.*
