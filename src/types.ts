
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