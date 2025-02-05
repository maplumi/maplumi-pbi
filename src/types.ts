import { Options as LayerOptions } from 'ol/layer/Base.js';
import { Feature } from 'ol';
import { ITooltipServiceWrapper } from 'powerbi-visuals-utils-tooltiputils';
import VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;
import ISelectionId = powerbi.visuals.ISelectionId;

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
    mapboxBaseUrl: string;
    declutterLabels: boolean;
}

export interface CircleOptions {
    layerControl: boolean; 
    color: string; 
    minRadius: number; 
    maxRadius: number; 
    strokeColor: string; 
    strokeWidth: number; 
    layerOpacity: number; 
    showLegend: boolean; 
    legendTitle: string;
    legendTitleColor: string;
    legendItemsColor:string;
    legendBackgroundOpacity:number;
    legendBackgroundColor: string;
    legendBottomMargin: number;
}

export interface CircleLayerOptions  extends LayerOptions{
    
    longitudes: number[];
    latitudes: number[];
    circleOptions: CircleOptions;
    circleSizeValues?: number[];
    minCircleSizeValue?: number;
    circleScale?: number;
    svg: any;
    svgContainer: HTMLElement;
    zIndex: number;
    dataPoints?: Array<{ // Add this
        longitude: number;
        latitude: number;
        tooltip: VisualTooltipDataItem[];
        selectionId: ISelectionId;//powerbi.visuals.ISelectionId;
    }>;
    tooltipServiceWrapper: ITooltipServiceWrapper; // Use wrapper instead of raw service
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
    zIndex?: number;
    categoryValues: string[];
    measureValues: number[];
  }
  

export interface ChoroplethOptions {
    layerControl: boolean; 
   
    locationPcodeNameId: string,    
    topoJSON_geoJSON_FileUrl: string,

    classifyData: boolean;
    usePredefinedColorRamp: boolean;
    invertColorRamp: boolean;
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
    legendTitle: string;
    legendTitleColor: string;
    legendLabelsColor: string;
    legendBackgroundOpacity:number;
    legendBackgroundColor: string
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
}