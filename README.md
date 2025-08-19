# Maplumi Power BI Visual <img src="assets/icon.png" alt="Maplumi Visual Icon" width="64" height="64" align="right">

[![Build and Release](https://github.com/maplumi/maplumi-pbi/actions/workflows/build.yml/badge.svg?branch=main)](https://github.com/maplumi/maplumi-pbi/actions/workflows/build.yml) [![Coverage](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/ayiemba/2e6451b2d946f0f58920cc89b1b5ef8b/raw/coverage.json)](https://gist.github.com/ayiemba/2e6451b2d946f0f58920cc89b1b5ef8b)

<!-- Dynamic coverage badge uses shields endpoint with a Gist JSON:
https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/ayiemba/2e6451b2d946f0f58920cc89b1b5ef8b/raw/coverage.json
Configured via workflow .github/workflows/coverage-badge.yml and repo secrets COVERAGE_GIST_ID + COVERAGE_GIST_TOKEN. -->

Maplumi adds two map layers to Power BI: choropleth regions and scaled circles. Use either or both, with smart legends, tooltips, and base maps.

## Features
- Choropleth (color by numeric measure)
- Scaled circles (size by one or two measures)
- Works together or separately
- Mapbox, MapTiler, or OpenStreetMap basemaps
- Legends, tooltips, cross-filtering
- Auto-fit to data (optional)
 - Topology-preserving simplification with a user "Simplification Strength" control
 - Canvas rendering engine option for faster drawing with crisp output
 - Zoom-to-layer works for both SVG and Canvas engines

## Data roles
Assign in the Visualizations pane. Only fill what you need for the layers you enable.
- Boundary ID: join to GeoJSON/TopoJSON property for choropleth (max 1)
- Latitude / Longitude: numeric coordinates for circles (max 1 each)
- Size: measure(s) for circle size (max 2)
- Color: measure for choropleth classification (max 1)
- Tooltips: extra measures to show on hover

Notes
- Data reduction: up to ~30,000 category rows are sampled (subject to Power BI limits and environment).
- If only choropleth is enabled, Latitude/Longitude/Size are not required. If only circles are enabled, Boundary ID isn’t required.

### Custom TopoJSON with multiple objects

If your TopoJSON file contains multiple named objects (e.g., `ADM1`, `polygons`, `lines`), you can direct the visual to use a specific object:

- Format pane → Choropleth → Boundary → TopoJSON Object Name (optional)
- Enter the exact object name from your TopoJSON `objects` dictionary.
- Leave blank to auto-detect; the visual prefers polygonal objects when choosing automatically.

Tip: Many publishers name polygon layers like `ADM0`, `ADM1`, `boundaries`, or `polygons`.
- If only choropleth is enabled, Latitude/Longitude/Size aren’t required. If only circles are enabled, Boundary ID isn’t required.

## Quick start
1) Add the visual to your report (import the .pbiviz or use Developer Mode).
2) Assign Boundary ID or Latitude/Longitude and your measures.
3) In Format, toggle layers on/off and choose basemap and color ramp.
4) Optional: switch Rendering Engine (SVG or Canvas). Canvas boosts performance and respects tooltips/selections via invisible hit overlays.

## Install
- From release: download a .pbiviz from GitHub Releases and import into Power BI Desktop (Insert → More visuals → Import a visual from a file).
- From source:
	- Clone and install: `npm install`
	- Package: `npm run build` (generates dist/*.pbiviz)
	- Dev server: `npm start` and connect via Power BI Developer Mode

### Testing
- Run the full Jest suite: `npm test`
- Canvas tests run under jsdom with a mocked 2D context; no native canvas dependency required.
- GeoBoundaries “All Countries” uses a static ADM0 dataset and returns stub metadata in tests (no network call).

## Documentation & support
- Specs and guides: `spec/` (start with [spec/main.md](spec/main.md))
- Issues: https://github.com/maplumi/maplumi-pbi/issues

## License
MIT. See [LICENSE](LICENSE).
