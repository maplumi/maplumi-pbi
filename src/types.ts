import { Options as LayerOptions } from 'ol/layer/Base.js';
import { Feature } from 'ol';

export interface BasemapOptions {
    selectedBasemap: string;
    customMapAttribution: string;
    mapboxCustomStyleUrl: string;    
    mapboxStye: string;
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
    //loader: HTMLElement;
    zIndex: number;
  }

  export interface ChoroplethLayerOptions extends LayerOptions {
    geojson: any; // GeoJSON data for the choropleth
    colorScale: (value: any) => string; // Function to map a data value to a color
    dataKey: string; // Key in GeoJSON properties used for coloring
    svg: any; // D3 SVG element
    svgContainer: HTMLElement;
    //loader: HTMLElement;
    zIndex?: number;
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