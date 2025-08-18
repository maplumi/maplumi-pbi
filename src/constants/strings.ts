"use strict";

export const VisualObjectNames = {
    ProportionalCircles: "proportionalCirclesVisualCardSettings",
    Choropleth: "choroplethVisualCardSettings",
    MapControls: "mapControlsVisualCardSettings",
} as const;

export const VisualObjectProps = {
    ShowLayerControl: "showLayerControl",
    LockedMapExtent: "lockedMapExtent",
    LockedMapZoom: "lockedMapZoom",
} as const;

export const DomIds = {
    LegendContainer: "legendContainer",
    SvgOverlay: "svgOverlay",
    CirclesGroup1: "circles-group-1",
    CirclesGroup2: "circles-group-2",
    ChoroplethGroup: "choropleth-group",
} as const;

export const LegendPositions = {
    TopRight: "top-right",
    TopLeft: "top-left",
    BottomRight: "bottom-right",
    BottomLeft: "bottom-left",
    TopCenter: "top-center",
    BottomCenter: "bottom-center",
} as const;

export const ClassificationMethods = {
    Unique: "u",
    Quantile: "q",
    EqualInterval: "e",
    Logarithmic: "l",
    KMeans: "k",
    Jenks: "j",
} as const;

export const LegendOrientations = {
    Horizontal: "horizontal",
    Vertical: "vertical",
} as const;

export const LegendLabelPositions = {
    Top: "top",
    Center: "center",
    Bottom: "bottom",
    Left: "left",
    Right: "right",
} as const;

export const BasemapNames = {
    OpenStreetMap: "openstreetmap",
    Mapbox: "mapbox",
    MapTiler: "maptiler",
    None: "none",
} as const;

export const TitleAlignments = {
    Left: "left",
    Center: "center",
    Right: "right",
} as const;
