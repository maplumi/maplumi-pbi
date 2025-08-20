# Choropleth — Quick Reference (Concise)

Short guide to get choropleth maps running fast. See the full spec for details: ./choropleth-specification.md

## What you bind

```mermaid
flowchart LR
  A["AdminPCodeNameID (Location)"] --> B[Choropleth Layer]
  C["Choropleth Value (Number)"] --> B
   B --> D[Areas render]
  D --> E["Legend (if enabled)"]
```

Required
- Location: AdminPCodeNameID (text). This is any unique ID used to join your Power BI data to the boundary properties (e.g., ISO codes, ADM*_PCODE, shapeID). The same column must exist in both datasets.
- Value: Choropleth Value (number)
- Optional: Tooltips

## Configure in 4 steps
1) Boundary Source: GeoBoundaries or Custom
2) If GeoBoundaries: Country → Admin level → Release type → Field mapping
    If Custom: URL → Boundary ID field name
3) Classification: Method + classes, then pick a color ramp (or custom CSV hex)
4) Rendering engine: SVG, Canvas, or WebGL (preview). In WebGL mode, choropleth renders via Canvas while circles use WebGL when available.
5) Performance: set “Simplification Strength” (0–100) for coarser/finer shapes

Minimal settings
```
Boundary: GeoBoundaries, Country: KEN, Level: ADM1, Field: shapeISO
Classification: Natural Breaks, Classes: 5
Display: Color Ramp: Blues, Opacity: 70%
```

---

## Boundary sources at a glance

```mermaid
flowchart TB
   start((Start)) --> src{Boundary Source}
   src -->|GeoBoundaries| gb[Pick Country → ADM level → Release]
   gb --> field[Choose field: shapeISO/name/id/group]
   src -->|Custom| url[Enter GeoJSON/TopoJSON URL]
   url --> bfield[Set boundary ID field]
   field --> done((Done))
   bfield --> done
```

Notes
- HTTPS only for custom URLs; redirect-style URLs are blocked.
- Only validated, non-empty P-codes filter features.
- Large boundary files get a 25s timeout window.

---

## Classify & color (essentials)

- Methods: Equal Interval, Quantile, Natural Breaks, Unique Values
- Classes: 3–7 recommended
- Colors: Built-in ramps or Custom CSV hex (#fee5d9,#fcae91,...)

---

## Quick fixes
- No areas? Check country/admin level and field mapping; for Custom, verify URL and boundary field.
- URL blocked? Remove redirect parameters and ensure it’s a direct HTTPS link.
- No colors? Ensure numeric choropleth value, method/classes OK, and color ramp valid.
- Selection issues? Avoid duplicate location codes; verify model relationships.
- View not fitting? Ensure "Lock map extent" is off; zoom-to-layer works for all engines.

---

## Best practices (short)

1) GeoBoundaries: prefer gbOpen; ADM0–ADM1 for broader views; ADM2–ADM3 for local detail.
2) Mapping field: shapeISO for codes, shapeName for labels, shapeID if needed.
3) Classes: keep 3–7; ensure readable contrast and legend title units.
4) Performance: TopoJSON over GeoJSON; use higher "Simplification Strength" when zoomed out.

```mermaid
flowchart LR
  Z[Zoom level] -->|coarse| T[High LOD simplify]
  Z -->|fine| U[Low LOD simplify]
  S["Simplification Strength (0–100)"] -->|higher| T
  S -->|lower| U
```

---

## Setup checklist

 - [ ] Source picked (GB vs Custom)
 - [ ] Country/Admin/Release set OR URL/Field set
 - [ ] Mapping field matches your codes
 - [ ] Value is numeric; classes 3–7; ramp ok

## Need more?
See the full choropleth spec for deep dives and API details → ./choropleth-specification.md

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

## Joining data

- The Location field (AdminPCodeNameID) is any unique join key present in BOTH your Power BI data and the boundary feature properties (e.g., ISO codes, ADM*_PCODE, shapeID).
- In the Format pane, set the boundary field to the matching property:
  - GeoBoundaries: shapeISO, shapeName, shapeID, or shapeGroup
  - Custom: enter your property name (e.g., ADM1_PCODE)

Minimal example

Power BI data (Location → Value)
```
Location   | Value
-----------|------
KE-01      | 12.3
KE-02      | 9.5
```

Boundary feature properties (GeoJSON)
```json
{
  "type": "Feature",
  "properties": {
    "shapeISO": "KE-01",
    "shapeName": "Baringo"
  },
  "geometry": { "type": "Polygon", "coordinates": [] }
}
```

Settings mapping
- Boundary field: shapeISO
- Location column: AdminPCodeNameID (values like KE-01)
- Result: features with matching codes render and receive the numeric Value

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
