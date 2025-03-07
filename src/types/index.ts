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
    timestamp: number;
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



export interface CircleLayerOptions extends LayerOptions {

    longitudes: number[];
    latitudes: number[];
    circleOptions: CircleOptions;
    combinedCircleSizeValues?: number[];
    circle1SizeValues?: number[];
    circle2SizeValues?: number[];
    minCircleSizeValue?: number;
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
    legendTitleColor: string;
    leaderLineColor: string;
    leaderLineStrokeWidth: number;
    labelTextColor: string;
}

// export interface CircleOptions {
//     layerControl: boolean;
//     color1: string;
//     color2: string;
//     minRadius: number;
//     maxRadius: number;
//     strokeColor: string;
//     strokeWidth: number;
//     layer1Opacity: number;
//     layer2Opacity: number;
//     showLegend: boolean;
//     legendTitle: string;
//     legendTitleColor: string;
//     leaderLineColor: string;
//     leaderLineStrokeWidth: number;
//     labelTextColor: string;
// }

// export interface CircleLayerOptions extends LayerOptions {

//     longitudes: number[];
//     latitudes: number[];
//     circleOptions: CircleOptions;
//     combinedCircleSizeValues?: number[];
//     circle1SizeValues?: number[];
//     circle2SizeValues?: number[];
//     minCircleSizeValue?: number;
//     circleScale?: number;
//     svg: any;
//     svgContainer: HTMLElement;
//     zIndex: number;
//     dataPoints?: Array<{
//         longitude: number;
//         latitude: number;
//         tooltip: VisualTooltipDataItem[];
//         selectionId: ISelectionId;
//     }>;
//     tooltipServiceWrapper: ITooltipServiceWrapper;
//     selectionManager: powerbi.extensibility.ISelectionManager;
// }

// export interface ChoroplethLayerOptions extends LayerOptions {
//     geojson: any;
//     strokeColor: string;
//     strokeWidth: number;
//     fillOpacity: number;
//     colorScale: (value: any) => string;
//     dataKey: string;
//     svg: any;
//     svgContainer: HTMLElement;
//     zIndex?: number;
//     categoryValues: string[];
//     measureValues: number[];
// }


export interface ChoroplethOptions {
    layerControl: boolean;

    locationPcodeNameId: string,
    topoJSON_geoJSON_FileUrl: string,

    classifyData: boolean;
    usePredefinedColorRamp: boolean;

    invertColorRamp: boolean;
    colorMode: string;
    colorRamp: string;
    midColor: string;
    classes: number;
    classificationMethod: string;
    minColor: string;
    maxColor: string;
    strokeColor: string;
    strokeWidth: number;
    layerOpacity: number;

    showLegend: boolean;
    legendLabelPosition: string;
    legendOrientation: string;
    legendTitle: string;
    legendTitleAlignment: string;
    legendTitleColor: string;
    legendLabelsColor: string;

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

    //currentZoom: number;
    //currentExtent: any;

    legendPosition: string;
    legendBorderWidth: number;
    legendBorderRadius: number;
    legendBorderColor: string;
    legendBackgroundColor: string;
    legendBackgroundOpacity: number;
    legendBottomMargin: number;

}