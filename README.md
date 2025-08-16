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

## Data roles
Assign in the Visualizations pane. Only fill what you need for the layers you enable.
- Boundary ID: join to GeoJSON/TopoJSON property for choropleth (max 1)
- Latitude / Longitude: numeric coordinates for circles (max 1 each)
- Size: measure(s) for circle size (max 2)
- Color: measure for choropleth classification (max 1)
- Tooltips: extra measures to show on hover

Notes
- If only choropleth is enabled, Latitude/Longitude/Size aren’t required. If only circles are enabled, Boundary ID isn’t required.

## Quick start
1) Add the visual to your report (import the .pbiviz or use Developer Mode).
2) Assign Boundary ID or Latitude/Longitude and your measures.
3) In Format, toggle layers on/off and choose basemap and color ramp.

## Install
- From release: download a .pbiviz from GitHub Releases and import into Power BI Desktop (Insert → More visuals → Import a visual from a file).
- From source:
	- Clone and install: `npm install`
	- Package: `npm run build` (generates dist/*.pbiviz)
	- Dev server: `npm start` and connect via Power BI Developer Mode

## Documentation & support
- Specs and guides: `spec/` (start with [spec/main.md](spec/main.md))
- Issues: https://github.com/maplumi/maplumi-pbi/issues
- Discussions: https://github.com/maplumi/maplumi-pbi/discussions

## License
MIT. See [LICENSE](LICENSE).