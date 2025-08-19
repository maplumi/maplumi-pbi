import { LegendOrientations, LegendLabelPositions, ClassificationMethods } from "../constants/strings";

export type LegendOrientation = typeof LegendOrientations[keyof typeof LegendOrientations];
export type LegendLabelPosition = typeof LegendLabelPositions[keyof typeof LegendLabelPositions];
export type ClassificationMethod = typeof ClassificationMethods[keyof typeof ClassificationMethods];
import { FeatureCollection } from "geojson";
import * as d3 from "d3";
import { Collection } from "ol";
import { Control } from "ol/control";
import View from "ol/View";
import { ITooltipServiceWrapper } from "powerbi-visuals-utils-tooltiputils";
import ISelectionManager = powerbi.extensibility.ISelectionManager;

import { Options as OlLayerOptions } from 'ol/layer/Base.js';
import { Feature } from 'ol';
import VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;
import ISelectionId = powerbi.visuals.ISelectionId;

export interface MapState {
    basemapType: string;
    attribution: string;
    mapboxStyle: string;
    maptilerStyle: string;
    view: View | null;
    extent: number[] | null;
    zoom: number | null;
    interactions: Collection<Control>;
}

export interface CacheEntry<T> {
    data: T;
    timestamp: number; // time stored
    expiresAt: number; // absolute expiry time in ms epoch
}

export interface MapData {
    geojson: FeatureCollection;
    properties: MapProperties;
}

export interface MapProperties {
    id: string;
    name: string;
    value: number;
    [key: string]: any;
}


export interface LayerOptions extends OlLayerOptions {
    svg: d3.Selection<SVGElement, unknown, HTMLElement, any>;
    svgContainer: HTMLElement;
    zIndex: number;
    // tooltipServiceWrapper: ITooltipServiceWrapper;
    // selectionManager: ISelectionManager;
}

export interface CircleData {
    longitudes: number[] | undefined;
    latitudes: number[] | undefined;
    circleSizeValuesObjects: any[];
}

export interface ChoroplethData {
    AdminPCodeNameIDCategory: any;
    colorMeasure: any;
    pCodes: string[] | undefined;
}

export interface ChoroplethDataSet {
    colorValues: number[];
    classBreaks: any;
    colorScale: any;
    pcodeKey: string;   
    dataPoints: any[];
}

export interface CircleLayerOptions extends LayerOptions {

    longitudes: number[];
    latitudes: number[];
    circleOptions: CircleOptions;
    combinedCircleSizeValues?: number[];
    circle1SizeValues?: number[];
    circle2SizeValues?: number[];
    minCircleSizeValue?: number;
    maxCircleSizeValue?: number;
    circleScale?: number;
    svg: any;
    svgContainer: HTMLElement;
    zIndex: number;
    dataPoints?: Array<{
        longitude: number;
        latitude: number;
        tooltip: VisualTooltipDataItem[];
        selectionId: ISelectionId;
    }>;
    tooltipServiceWrapper: ITooltipServiceWrapper;
    selectionManager: powerbi.extensibility.ISelectionManager;
}

export interface ChoroplethLayerOptions extends LayerOptions {
    geojson: any;
    strokeColor: string;
    strokeWidth: number;
    fillOpacity: number;
    colorScale: (value: any) => string;
    dataKey: string;
    svg: any;
    svgContainer: HTMLElement;
    zIndex: number;
    categoryValues: string[];
    measureValues: number[];
    selectionManager: ISelectionManager;
    tooltipServiceWrapper: ITooltipServiceWrapper;
    simplificationStrength?: number;
    greyOutUnmatchedBoundaries?: boolean;
    greyOutUnmatchedBoundariesColor?: string;
    greyOutUnmatchedBoundariesOpacity?: number; // 0..1
    dataPoints?: Array<{
        pcode: string;
        value: number;
        tooltip: VisualTooltipDataItem[];
        selectionId: ISelectionId;
    }>;
}

export interface EventData {
    type: string;
    payload: any;
}

export interface EventCallback {
    (data: EventData): void;
}





export interface GeoJSONFeature {
    type: string;
    geometry: {
        type: string;
        coordinates: any[];
    };
    properties: {
        [key: string]: any;
        selectionId?: ISelectionId; //powerbi.visuals.ISelectionId; // Optional field for selection ID
        tooltip?: VisualTooltipDataItem[]; // Optional field for tooltips
    };
}

export interface GeoJSON {
    type: string;
    features: GeoJSONFeature[];
}

export interface BasemapOptions {
    selectedBasemap: string;
    customMapAttribution: string;

    mapboxCustomStyleUrl: string;
    mapboxStyle: string;
    mapboxAccessToken: string;

    declutterLabels: boolean;

    maptilerStyle: string;
    maptilerApiKey: string;

}

export interface CircleOptions {
    layerControl: boolean;
    color1: string;
    color2: string;
    minRadius: number;
    maxRadius: number;
    strokeColor: string;
    strokeWidth: number;
    layer1Opacity: number;
    layer2Opacity: number;
    showLegend: boolean;
    legendTitle: string;
    //legendTitleFontSize: string;
    //legendTitleFontWeight: string;
    legendTitleColor: string;
    legendItemStrokeColor: string;
    legendItemStrokeWidth: number;
    leaderLineColor: string;
    leaderLineStrokeWidth: number;
    labelTextColor: string;
    //labelTextFontSize: string;
    roundOffLegendValues: boolean;
    hideMinIfBelowThreshold: boolean;
    minValueThreshold: number;
    minRadiusThreshold: number;
    yPadding: number;
    xPadding: number;
    labelSpacing: number;
    chartType: string; // "nested-circle" | "donut-chart" | "pie-chart"
    scalingMethod: string; // Fixed to 'square-root' for optimal area-based scaling
}

export interface ChoroplethOptions {
    layerControl: boolean;

    // Boundary data source options
    boundaryDataSource: string;
    // Supported values include: "geoboundaries", "maplumi", "opendatasoft", "custom"
    
    // GeoBoundaries-specific options
    geoBoundariesReleaseType: string;
    geoBoundariesCountry: string;
    geoBoundariesAdminLevel: string;
    sourceFieldID: string;

    locationPcodeNameId: string,
    topoJSON_geoJSON_FileUrl: string,
    topojsonObjectName?: string,
    worldAtlasScale?: string,

    //usePredefinedColorRamp: boolean;

    invertColorRamp: boolean;
    colorMode: string;
    colorRamp: string;
    customColorRamp: string;

    classes: number;
    classificationMethod: ClassificationMethod;

    strokeColor: string;
    strokeWidth: number;
    layerOpacity: number;
    simplificationStrength?: number;
    greyOutUnmatchedBoundaries?: boolean;
    greyOutUnmatchedBoundariesColor?: string;
    greyOutUnmatchedBoundariesOpacity?: number; // 0..1

    showLegend: boolean;
    legendLabelPosition: LegendLabelPosition;
    legendOrientation: LegendOrientation;
    legendTitle: string;
    legendTitleAlignment: string;
    legendTitleColor: string;
    legendLabelsColor: string;
    legendItemMargin: number;
    //legendLabelsFontSize: string;

}




export interface HeatmapOptions {
    layerControl: boolean;
    radius: number;
    blur: number;
    maxZoom: number;
    layerOpacity: number;
    showLegend: boolean;
}

export interface MapToolsOptions {
    lockMapExtent: boolean;
    showZoomControl: boolean;
    renderEngine?: 'svg' | 'canvas';

    lockedMapExtent: string; // Stores the locked map extent as a comma-separated string: "minX,minY,maxX,maxY"
    lockedMapZoom?: number; // Stores the locked map zoom level

    legendPosition: string;
    legendBorderWidth: number;
    legendBorderRadius: number;
    legendBorderColor: string;
    legendBackgroundColor: string;
    legendBackgroundOpacity: number;
    legendBottomMargin: number;
    legendTopMargin: number;
    legendLeftMargin: number;
    legendRightMargin: number;

}