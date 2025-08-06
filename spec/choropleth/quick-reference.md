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

1. **Select Data Source**: Format Pane → Choropleth → Boundary → Boundary Source: `GeoBoundaries` or `Custom`

**For GeoBoundaries:**
2. **Choose Country**: Select from 91+ available countries or "All Countries"
3. **Set Admin Level**: Choose ADM0-ADM3 administrative level
4. **Select Release Type**: gbOpen, gbHumanitarian, or gbAuthoritative
5. **Pick Field Mapping**: Choose shapeISO, shapeName, shapeID, or shapeGroup

**For Custom Sources:**
2. **Enter URL**: Provide TopoJSON/GeoJSON URL
3. **Set Field Name**: Specify the boundary ID field in your data

### 3. Essential Settings

```
Choropleth Settings:
├── Boundary
│   ├── Boundary Source: GeoBoundaries/Custom
│   ├── Country/Region: Kenya (or All Countries)
│   ├── Release Type: gbOpen
│   ├── Administrative Level: ADM1
│   └── Boundary ID Field: shapeISO
├── Classification
│   ├── Method: Natural Breaks
│   └── Classes: 5
└── Display
    ├── Color Ramp: Blues
    └── Layer Opacity: 70%
```

---

## Data Preparation

### Location Codes Format

Ensure your location codes match the boundary data format:

| Data Source | Field Options | Example Codes | Description |
|-------------|---------------|---------------|-------------|
| **GeoBoundaries** | shapeISO | `KE-01`, `US-CA`, `NG-LA` | ISO codes with country prefix |
| | shapeName | `Nairobi`, `California`, `Lagos` | Human-readable names |
| | shapeID | `123456`, `789012` | Unique identifiers |
| | shapeGroup | `KEN`, `USA`, `NGA` | Parent country codes |
| **Custom** | (user-defined) | `AF001`, `custom_001` | Based on your data |

### GeoBoundaries Coverage

#### Administrative Levels by Country
- **ADM0**: All 91+ countries (country boundaries)
- **ADM1**: States/provinces/regions for most countries
- **ADM2**: Counties/districts for major countries
- **ADM3**: Municipalities for select countries

#### Release Types
- **gbOpen**: CC-BY 4.0 license, fastest updates, general use
- **gbHumanitarian**: UN OCHA licensed, optimized for humanitarian use
- **gbAuthoritative**: UN SALB licensed, official government boundaries

#### Special Features
- **"All Countries"**: Pre-aggregated world dataset (ADM0 only)
- **Automatic field detection**: Consistent field structure across all data
- **Built-in validation**: Prevents invalid country/admin level combinations

### Sample Data Structure

**For GeoBoundaries (Kenya ADM1 with shapeISO):**
```
Location    | Choropleth Value | Tooltip Info
------------|------------------|-------------
KE-01       | 150             | Baringo County
KE-02       | 89              | Bomet County  
KE-03       | 234             | Bungoma County
```

**For Custom Data:**
```
Location    | Choropleth Value | Tooltip Info
------------|------------------|-------------
AF001       | 150             | Kabul Province
AF002       | 89              | Kandahar Province
AF003       | 234             | Herat Province
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

**For GeoBoundaries:**
- ✅ Ensure country and admin level combination is valid
- ✅ Verify location codes match selected field mapping (shapeISO, shapeName, etc.)
- ✅ Check if "All Countries" is selected (only ADM0 supported)
- ✅ Try different release type (gbOpen has best coverage)

**For Custom Data:**
- ✅ Verify URL is accessible and returns valid GeoJSON/TopoJSON
- ✅ Check custom boundary ID field matches your data
- ✅ Ensure feature properties contain the specified field

### 2. Location Code Mismatches

**Problem**: Data not linking to boundary areas

**GeoBoundaries Solutions:**
- ✅ Switch between field mappings (shapeISO ↔ shapeName ↔ shapeID)
- ✅ Preview GeoBoundaries data to understand field values
- ✅ Use GeoBoundaries field reference for your country/admin level

**Custom Data Solutions:**
- ✅ Inspect your boundary data properties
- ✅ Ensure field name matches exactly (case-sensitive)
- ✅ Verify location codes don't have extra formatting

### 3. GeoBoundaries API Issues

**Problem**: "Failed to fetch" or connection errors

**Solutions:**
- ✅ Check internet connection
- ✅ Try different release type if current one fails
- ✅ Verify country code is supported (91+ countries available)
- ✅ Use "All Countries" for global datasets

### 4. Wrong Geographic Level

**Problem**: Areas too large/small or unexpected boundaries

**Solutions:**
- ✅ Change administrative level (ADM0 → ADM1 → ADM2 → ADM3)
- ✅ Verify location codes match selected admin level
- ✅ For "All Countries", only ADM0 is available

### 5. Colors Not Applied

**Problem**: Areas showing as grey or single color

**Solutions:**
- ✅ Verify Choropleth Value field contains numeric data
- ✅ Check classification method and number of classes
- ✅ Ensure color ramp has sufficient colors
- ✅ Review custom color ramp format (hex codes)

### 6. Performance Issues

**Problem**: Slow rendering or browser freezing

**Solutions:**
- ✅ Use higher admin level (ADM0 instead of ADM3) for better performance
- ✅ Try "All Countries" for global visualizations (optimized dataset)
- ✅ Prefer TopoJSON over GeoJSON for custom sources
- ✅ Clear browser cache

### 7. Selection Not Working

**Problem**: Clicking areas doesn't select/filter

**Solutions:**
- ✅ Ensure Location field has data category role
- ✅ Check for duplicate location codes
- ✅ Verify data relationships in Power BI model
- ✅ Test with simple dataset first

---

## Best Practices

### GeoBoundaries Usage

1. **Data Source Selection**
   - Use GeoBoundaries for standard administrative boundaries
   - Choose gbOpen for general use (best coverage and performance)
   - Select gbHumanitarian for humanitarian/emergency contexts
   - Use gbAuthoritative for official government reporting

2. **Field Mapping Strategy**
   - **shapeISO**: Best for structured administrative codes (KE-01, US-CA)
   - **shapeName**: Ideal for human-readable names (Nairobi, California)
   - **shapeID**: Use for unique identifiers when ISO codes unavailable
   - **shapeGroup**: Good for country-level grouping and validation

3. **Administrative Level Guidelines**
   - **ADM0**: Country-level analysis, global comparisons
   - **ADM1**: State/province analysis, regional studies
   - **ADM2**: County/district analysis, local administration
   - **ADM3**: Municipal analysis, detailed local studies

4. **Special Considerations**
   - Use "All Countries" for global datasets (ADM0 only, optimized)
   - Test field mappings with small datasets first
   - Validate country/admin level combinations before deployment

### Data Quality

1. **Clean Location Codes**
   - Remove leading/trailing spaces
   - Use consistent format (uppercase/lowercase)
   - Match GeoBoundaries field format exactly

2. **Handle Missing Values**
   - Use transparent fill for missing data
   - Consider showing in legend as "No data"
   - Validate against GeoBoundaries coverage

3. **Optimize Value Ranges**
   - Remove extreme outliers when appropriate
   - Use log scales for highly skewed data
   - Consider data transformation for better visualization

### Classification Strategy

1. **Method Selection**
   - Natural Breaks for general-purpose mapping
   - Equal Interval for comparison across time/regions
   - Quantile for skewed distributions
   - Unique Values for categorical data

2. **Class Configuration**
   - Use 3-7 classes for optimal readability
   - Ensure classes have meaningful interpretation
   - Consider color accessibility (colorblind-friendly)

3. **Legend Best Practices**
   - Show meaningful value ranges
   - Include units in legend title
   - Position legend to avoid data overlap

### Performance

1. **Data Volume**
   - Use appropriate admin level for map scale
   - "All Countries" is optimized for global views
   - ADM0-ADM1 for continental/regional views
   - ADM2-ADM3 for national/local views

2. **Network Optimization**
   - GeoBoundaries API is optimized and cached
   - Custom URLs should be reliable and fast
   - Consider TopoJSON for smaller file sizes

3. **Caching**
   - Boundary data is automatically cached
   - Clear cache if switching data sources frequently
   - Monitor network requests in browser dev tools
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
- [ ] Boundary source selected (GeoBoundaries vs Custom)
- [ ] For GeoBoundaries: Country, admin level, release type configured
- [ ] For Custom: URL accessible and field name specified
- [ ] Field mapping matches your data format

### Data Validation  
- [ ] Location codes format matches boundary data
- [ ] Choropleth values are numeric
- [ ] No duplicate location codes
- [ ] Data relationships properly configured in Power BI

### GeoBoundaries Specific
- [ ] Country and admin level combination supported
- [ ] Release type available for selected country
- [ ] Field mapping (shapeISO/shapeName/shapeID) matches data
- [ ] "All Countries" restricted to ADM0 level only

### Visual Configuration
- [ ] Classification method appropriate for data distribution
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
