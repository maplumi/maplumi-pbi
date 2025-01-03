
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
    legendTitle: string
}

export interface ChoroplethOptions {
    layerControl: boolean; 
    countryISO3Code: string; 
    adminLevel: string; 
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
}

export interface HeatmapOptions {
    layerControl: boolean; 
    radius: number; 
    blur: number; 
    maxZoom: number; 
    layerOpacity: number; 
    showLegend: boolean; 
}