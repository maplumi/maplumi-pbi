# Choropleth Quick Reference

## Overview

Quick reference guide for Power BI developers using the choropleth (area-based mapping) features of the Maplumi visual. This guide provides essential information for setting up, configuring, and troubleshooting choropleth visualizations.

## Quick Setup

### 1. Required Data Fields

| Field | Role | Type | Required | Description |
|-------|------|------|----------|-------------|
| **Location** | Location | Text | ✅ | Administrative codes (P-codes, ISO codes) |
| **Choropleth Value** | ChoroplethValue | Number | ✅ | Numeric values for area coloring |
| **Tooltips** | Tooltips | Any | ❌ | Additional fields for hover information |

### 2. Basic Configuration

1. **Enable Choropleth**: Format Pane → Choropleth → Location & Boundary → Layer Control: `On`
2. **Set API Endpoint**: Enter boundary data API URL
3. **Choose Admin Level**: Select geographic level (country, region, district)
4. **Configure P-code Column**: Set column name containing location codes

### 3. Essential Settings

```
Choropleth Settings:
├── Location & Boundary
│   ├── Layer Control: On
│   ├── API Endpoint: https://api.example.com/boundaries
│   ├── Location Level: admin1
│   └── P-code Column: ADM1_PCODE
├── Classification
│   ├── Method: Natural Breaks
│   └── Classes: 5
└── Display
    ├── Color Ramp: Blues
    └── Fill Opacity: 70%
```

---

## Data Preparation

### Location Codes Format

Ensure your location codes match the boundary data format:

| Admin Level | Example Code | Description |
|-------------|--------------|-------------|
| Country | `AFG`, `USA` | ISO 3-letter codes |
| Admin 1 | `AF001`, `US.NY` | Region/state codes |
| Admin 2 | `AF001001` | District/county codes |
| Admin 3 | `AF001001001` | Sub-district codes |

### Sample Data Structure

```
Location    | Choropleth Value | Tooltip Info
------------|-----------------|-------------
AF001       | 150            | Kabul Province
AF002       | 89             | Kandahar Province
AF003       | 234            | Herat Province
```

---

## Configuration Options

### Classification Methods

| Method | Best For | Description |
|--------|----------|-------------|
| **Equal Interval** | Comparing across maps | Fixed value ranges |
| **Quantile** | Skewed data | Equal data point distribution |
| **Natural Breaks** | General use | Optimized class boundaries |
| **Unique Values** | Categories | Distinct value mapping |

### Color Schemes

#### Sequential (Single Hue)
- **Blues**: Light to dark blue progression
- **Reds**: Light to dark red progression  
- **Greens**: Light to dark green progression
- **Purples**: Light to dark purple progression

#### Diverging (Two Hues)
- **RdBu**: Red to blue (via white)
- **RdYlBu**: Red to yellow to blue
- **Spectral**: Rainbow spectrum

#### Custom Colors
Enter comma-separated hex values: `#fee5d9,#fcae91,#fb6a4a,#cb181d`

---

## Common Issues & Solutions

### 1. Map Areas Not Showing

**Problem**: Choropleth layer enabled but no colored areas visible

**Solutions:**
- ✅ Check API endpoint is accessible
- ✅ Verify location codes match boundary data
- ✅ Ensure P-code column name is correct
- ✅ Check data values are not all null/zero

### 2. Wrong Geographic Level

**Problem**: Areas too large/small or unexpected boundaries

**Solutions:**
- ✅ Change Location Level (country → admin1 → admin2 → admin3)
- ✅ Verify location codes match selected admin level
- ✅ Check API endpoint supports requested level

### 3. Colors Not Applied

**Problem**: Areas showing as grey or single color

**Solutions:**
- ✅ Verify Choropleth Value field contains numeric data
- ✅ Check classification method and number of classes
- ✅ Ensure color ramp has sufficient colors
- ✅ Review custom color ramp format (hex codes)

### 4. Performance Issues

**Problem**: Slow rendering or browser freezing

**Solutions:**
- ✅ Reduce number of geographic features
- ✅ Use higher admin level (less detail)
- ✅ Check network connection for API calls
- ✅ Clear browser cache

### 5. Selection Not Working

**Problem**: Clicking areas doesn't select/filter

**Solutions:**
- ✅ Ensure Location field has data category role
- ✅ Check for duplicate location codes
- ✅ Verify data relationships in Power BI model
- ✅ Test with simple dataset first

---

## Best Practices

### Data Quality

1. **Clean Location Codes**
   - Remove leading/trailing spaces
   - Use consistent format (uppercase/lowercase)
   - Validate against boundary data

2. **Handle Missing Values**
   - Use transparent fill for missing data
   - Consider showing in legend as "No data"

3. **Optimize Value Ranges**
   - Remove extreme outliers if needed
   - Consider log transformation for wide ranges

### Visual Design

1. **Color Selection**
   - Use sequential schemes for continuous data
   - Use diverging schemes for positive/negative values
   - Ensure sufficient contrast for accessibility

2. **Classification Strategy**
   - Natural Breaks for general-purpose mapping
   - Equal Interval for comparison across time/regions
   - Quantile for skewed distributions

3. **Legend Configuration**
   - Show meaningful value ranges
   - Include units in legend title
   - Position legend to avoid data overlap

### Performance

1. **Data Volume**
   - Limit to <1000 geographic features
   - Use appropriate admin level for zoom
   - Cache boundary data when possible

2. **Network Optimization**
   - Use reliable boundary data APIs
   - Implement fallback endpoints
   - Monitor API response times

---

## Troubleshooting Checklist

### Initial Setup
- [ ] Choropleth layer enabled in format pane
- [ ] API endpoint URL accessible
- [ ] Location Level matches data codes
- [ ] P-code Column name correct

### Data Validation
- [ ] Location codes format consistent
- [ ] Choropleth values are numeric
- [ ] No duplicate location codes
- [ ] Data relationships properly configured

### Visual Configuration
- [ ] Classification method appropriate for data
- [ ] Number of classes suitable (3-7 recommended)
- [ ] Color scheme provides good contrast
- [ ] Fill opacity allows underlying features to show

### Performance Check
- [ ] API response time acceptable (<5 seconds)
- [ ] Geographic detail appropriate for zoom level
- [ ] Browser performance acceptable
- [ ] Memory usage within limits

---

## Quick Tips

### 🎯 **Getting Started**
1. Start with country-level data for testing
2. Use Natural Breaks classification initially
3. Begin with 5 classes for most datasets
4. Test with small dataset first

### ⚡ **Performance**
1. Use CDN-hosted boundary APIs when possible
2. Enable browser caching for repeated use
3. Consider simplifying complex geometries
4. Monitor network requests in browser dev tools

### 🎨 **Design**
1. Match color scheme to data meaning (red=bad, green=good)
2. Use ColorBrewer schemes for accessibility
3. Test colors with colorblind simulation tools
4. Keep legend positioning consistent

### 🔧 **Troubleshooting**
1. Check browser console for error messages
2. Verify API responses in Network tab
3. Test with minimal dataset first
4. Compare location codes with boundary data

---

## Sample Configurations

### Population Density Map
```
Classification: Natural Breaks (5 classes)
Color Scheme: Blues
Admin Level: admin1
P-code Format: ISO_A3_ADMIN1
```

### Economic Indicators
```
Classification: Quantile (7 classes)
Color Scheme: RdYlGn
Admin Level: admin2
P-code Format: ADM2_PCODE
```

### Categories/Regions
```
Classification: Unique Values
Color Scheme: Set1
Admin Level: admin1
P-code Format: REGION_CODE
```

---

## API Endpoints

### Common Boundary Data Sources

| Provider | Base URL | Admin Levels | Format |
|----------|----------|--------------|--------|
| HDX | `https://data.humdata.org/api/boundaries` | 0-3 | GeoJSON |
| Natural Earth | `https://cdn.naturalearthdata.com` | 0-1 | GeoJSON |
| Custom | `https://your-api.com/boundaries` | Variable | GeoJSON |

### URL Structure
```
{base_url}/{admin_level}
https://api.example.com/boundaries/admin1
```

---

## Data Format Examples

### Power BI Data
```
Location  | Value | Tooltip
----------|-------|--------
AFG       | 38.9  | Afghanistan: 38.9M
USA       | 331.4 | United States: 331.4M
CHN       | 1439.3| China: 1,439.3M
```

### Boundary Data Response
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "ISO_A3": "AFG",
        "NAME": "Afghanistan"
      },
      "geometry": { "type": "Polygon", "coordinates": [...] }
    }
  ]
}
```

---

*For detailed technical information, see the [Choropleth Specification](choropleth-specification.md) and [API Reference](api-reference.md).*
