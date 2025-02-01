/*
 *  Power BI Visualizations
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved.
 *  MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the ""Software""), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *
 *  The above copyright notice and this permission notice shall be included in
 *  all copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */

"use strict";

import powerbiVisualsApi from "powerbi-visuals-api";
import { formatting } from "powerbi-visuals-utils-formattingutils";
import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";
import { dataViewObjectsParser } from "powerbi-visuals-utils-dataviewutils";

import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsSlice = formattingSettings.Slice;
import FormattingSettingsModel = formattingSettings.Model;
import TextInput = formattingSettings.TextInput;
import DropDown = formattingSettings.ItemDropdown;
import DataViewObjectsParser = dataViewObjectsParser.DataViewObjectsParser;
import { TextArea } from "powerbi-visuals-utils-formattingmodel/lib/FormattingSettingsComponents";

/**
 * OpenLayers Visual Formatting Cards
 */

class basemapSelectSettingsGroup extends formattingSettings.SimpleCard {

    selectedBasemap: DropDown = new DropDown({
        name: "selectedBasemap",
        displayName: "Select Basemap",
        value: {
            value: "openstreetmap",  // The actual value
            displayName: "OpenStreetMap" // The display name
        },
        items: [
            { value: "openstreetmap", displayName: "OpenStreetMap" },
            { value: "mapbox", displayName: "Mapbox" },
            { value: "none", displayName: "No Basemap" }
        ]
    });

    customMapAttribution: formattingSettings.TextInput = new TextInput({
        name: "customMapAttribution",
        displayName: "Custom Map Attribution",
        value: "",
        placeholder: "Enter Custom Map Attribution" // Placeholder text
    });

    name: string = "basemapSelectSettingsGroup";
    //displayName: string = "Select Basemap";
    collapsible: boolean = false;
    slices: formattingSettings.Slice[] = [this.selectedBasemap, this.customMapAttribution];

    

}

class mapBoxSettingsGroup extends formattingSettings.SimpleCard {

    mapboxAccessToken: formattingSettings.TextInput = new TextInput({
        name: "mapboxAccessToken",
        displayName: "Access Token",
        value: "",
        placeholder: "Enter Access Token" // Placeholder text
    });
    
    mapboxBaseUrl: formattingSettings.TextInput = new TextInput({
        name: "mapboxBaseUrl",
        displayName: "Mapbox Base URL",
        value: "https://api.mapbox.com",
        placeholder: "https://api.mapbox.com" // Placeholder text
    });

    mapboxStyle: DropDown = new DropDown({

        name: "mapboxStyle",
        displayName: "Select Map Style",
        value: {
            value: "mapbox://styles/mapbox/light-v10?optimize=true",  // The actual value
            displayName: "Light" 
        },
        items: [
            { value: "mapbox://styles/mapbox/light-v10?optimize=true", displayName: "Light" },
            { value: "mapbox://styles/mapbox/dark-v10?optimize=true", displayName: "Dark" },
            { value: "mapbox://styles/mapbox/streets-v11?optimize=true", displayName: "Streets" },
            { value: "custom", displayName: "Custom" }
        ]

    });

    mapboxCustomStyleUrl: formattingSettings.TextInput = new TextInput({
        name: "mapboxCustomStyleUrl",
        displayName: "Custom Style Url",
        value: "",
        placeholder: "mapbox://styles/..." // Placeholder text
    });

    declutterLabels: formattingSettings.ToggleSwitch = new formattingSettings.ToggleSwitch({
        name: "declutterLabels",
        displayName: "Declutter Labels",
        value: true
    });

    name: string = "mapBoxSettingsGroup";
    displayName: string = "Mapbox Settings";
    collapsible: boolean = false;
    slices: formattingSettings.Slice[] = [this.mapboxAccessToken, this.mapboxStyle, this.mapboxCustomStyleUrl, this.mapboxBaseUrl, this.declutterLabels];

}

class basemapVisualCardSettings extends formattingSettings.CompositeCard {

    public basemapSelectSettingsGroup: basemapSelectSettingsGroup = new basemapSelectSettingsGroup();
    public mapBoxSettingsGroup: mapBoxSettingsGroup = new mapBoxSettingsGroup();

    name: string = "basemapVisualCardSettings";
    displayName: string = "Basemap";
    groups: formattingSettings.Group[] = [this.basemapSelectSettingsGroup, this.mapBoxSettingsGroup ];

}

class proportionalCirclesVisualCardSettings extends FormattingSettingsCard {

    showLayerControl: formattingSettings.ToggleSwitch = new formattingSettings.ToggleSwitch({
        name: "showLayerControl",
        value: true
    });

    // Proportional circle styling options
    proportionalCirclesColor: formattingSettings.ColorPicker = new formattingSettings.ColorPicker({
        name: "proportionalCirclesColor",
        displayName: "Color",
        value: { value: "#f58220" } // Default color
    });

    proportionalCirclesMinimumRadius: formattingSettings.NumUpDown = new formattingSettings.Slider({
        name: "proportionalCirclesMinimumRadius",
        displayName: "Mininum Radius",
        value: 3,//default value
        options: // optional input value validator  
        {
            maxValue: {
                type: powerbi.visuals.ValidatorType.Max,
                value: 50
            },
            minValue: {
                type: powerbi.visuals.ValidatorType.Min,
                value: 0
            }
        }
    });

    proportionalCirclesMaximumRadius: formattingSettings.NumUpDown = new formattingSettings.Slider({
        name: "proportionalCirclesMaximumRadius",
        displayName: "Maximum Radius",
        value: 30,//default value
        options: // optional input value validator  
        {
            maxValue: {
                type: powerbi.visuals.ValidatorType.Max,
                value: 50
            },
            minValue: {
                type: powerbi.visuals.ValidatorType.Min,
                value: 0
            }
        }
    });

    proportionalCirclesStrokeColor: formattingSettings.ColorPicker = new formattingSettings.ColorPicker({
        name: "proportionalCirclesStrokeColor",
        displayName: "Stroke Color",
        value: { value: "#ffffff" } // Default color
    });

    proportionalCirclesStrokeWidth: formattingSettings.NumUpDown = new formattingSettings.NumUpDown({
        name: "proportionalCirclesStrokeWidth",
        displayName: "Stroke Width",
        value: 1, // Default size
    });

    proportionalCirclesLayerOpacity: formattingSettings.NumUpDown = new formattingSettings.Slider({
        name: "proportionalCirclesLayerOpacity",
        displayName: "Layer Opacity",
        value: 100,//default value
        options: // optional input value validator  
        {
            maxValue: {
                type: powerbi.visuals.ValidatorType.Max,
                value: 100
            },
            minValue: {
                type: powerbi.visuals.ValidatorType.Min,
                value: 0
            }
        }
    });

    showLegend: formattingSettings.ToggleSwitch = new formattingSettings.ToggleSwitch({
        name: "showLegend",
        displayName: "Show Legend",
        value: false
    });

    legendTitle: formattingSettings.TextInput = new formattingSettings.TextInput({
        name: "legendTitle",
        displayName:"Legend Title",
        value:"Legend",
        placeholder:""
    });

    legendBackgroundOpacity: formattingSettings.NumUpDown = new formattingSettings.Slider({
        name: "legendBackgroundOpacity",
        displayName: "Background Opacity",
        value: 90,//default value
        options: // optional input value validator  
        {
            maxValue: {
                type: powerbi.visuals.ValidatorType.Max,
                value: 100
            },
            minValue: {
                type: powerbi.visuals.ValidatorType.Min,
                value: 0
            }
        }
    });

    legendBackgroundColor: formattingSettings.ColorPicker = new formattingSettings.ColorPicker({
        name: "legendBackgroundColor",
        displayName: "Background Color",
        value: { value: "#ffffff" } // Default color
    });

    legendTitleColor: formattingSettings.ColorPicker = new formattingSettings.ColorPicker({
        name: "legendTitleColor",
        displayName: "Legend Title Color",
        value: { value: "#000000" } // Default color
    });

    legendItemsColor: formattingSettings.ColorPicker = new formattingSettings.ColorPicker({
        name: "legendItemsColor",
        displayName: "Legend Items Color",
        value: { value: "#000000" } // Default color
    });

    legendBottomMargin: formattingSettings.NumUpDown = new formattingSettings.NumUpDown({
        name: "legendBottomMargin",
        displayName: "Bottom Margin",
        value: 40, // Default size
        options: // optional input value validator  
        {
            maxValue: {
                type: powerbi.visuals.ValidatorType.Max,
                value: 80
            },
            minValue: {
                type: powerbi.visuals.ValidatorType.Min,
                value: 10
            }
        }
    });

    topLevelSlice: formattingSettings.ToggleSwitch = this.showLayerControl;
    name: string = "proportionalCirclesVisualCardSettings";
    displayName: string = "Circles";
    slices: Array<formattingSettings.Slice> = [
        this.proportionalCirclesColor,
        this.proportionalCirclesMinimumRadius,
        this.proportionalCirclesMaximumRadius,
        this.proportionalCirclesStrokeColor,
        this.proportionalCirclesStrokeWidth,
        this.proportionalCirclesLayerOpacity,
        this.showLegend,
        this.legendTitle,
        this.legendTitleColor,
        this.legendItemsColor,
        this.legendBackgroundColor,
        this.legendBackgroundOpacity,
        this.legendBottomMargin
    ];

}

class choroplethLocationBoundarySettingsGroup extends formattingSettings.SimpleCard {

    topoJSON_geoJSON_FileUrl: formattingSettings.TextInput = new TextInput({
        name: "topoJSON_geoJSON_FileUrl",
        displayName: "TopoJSON/GeoJSON Url",
        value: "", // Default country
        placeholder: "" // Placeholder text
    });

    locationPcodeNameId: formattingSettings.TextInput = new TextInput({
        name: "locationPcodeNameId",
        displayName: "PCode/Name/Id Field Name",
        value: "", 
        placeholder: "Field Name"
    });    

    name: string = "choroplethLocationBoundarySettingsGroup";
    displayName: string = "Location Boundary";
    collapsible: boolean = false;
    slices: formattingSettings.Slice[] = [this.topoJSON_geoJSON_FileUrl, this.locationPcodeNameId ];
}

class choroplethClassificationSettingsGroup extends formattingSettings.SimpleCard {

    classifyData: formattingSettings.ToggleSwitch = new formattingSettings.ToggleSwitch({
        name: "classifyData",
        displayName: "Classify Data",
        value: true
    });

    numClasses: formattingSettings.NumUpDown = new formattingSettings.NumUpDown({
        name: "numClasses",
        displayName: "Classes",
        value: 5, // Default number of classes
    });

    classificationMethod: DropDown = new DropDown({
        name: "classificationMethod",
        displayName: "Classification Method",
        value: {
            value: "q",  //default value
            displayName: "Quantile" 
        },
        items: [
            { value: "q", displayName: "Quantile" },
            { value: "e", displayName: "Equal Interval" },
            { value: "l", displayName: "Logarithmic" },
            { value: "k", displayName: "K-means" },
            { value: "j", displayName: "Jenks Natural Breaks" },
        ]
    });

    
    name: string = "choroplethClassificationSettingsGroup";
    displayName: string = "Classification";
    slices: formattingSettings.Slice[] = [
        this.classifyData,
        this.classificationMethod, 
        this.numClasses
    ];
}

class choroplethDisplaySettingsGroup extends formattingSettings.SimpleCard {

    usePredefinedColorRamp: formattingSettings.ToggleSwitch = new formattingSettings.ToggleSwitch({
        name: "usePredefinedColorRamp",
        displayName: "Predefined Ramp",
        value: false
    });

    colorRamp: DropDown = new DropDown({
        name: "colorRamp",
        displayName: "Predefined Color Ramp",
        value: {
            value: "blue",  //default value
            displayName: "Blue" 
        },
        items: [
            { value: "blue", displayName: "Blue" },
            { value: "red", displayName: "Red" },
            { value: "green", displayName: "Green" },
            { value: "orange", displayName: "Orange" },
            { value: "purple", displayName: "Purple" },
            { value: "yellow", displayName: "Yellow" },
            { value: "slateGrey", displayName: "Slate Grey" },
            { value: "neutralGrey", displayName: "Neutral Grey" },
            { value: "azurecascade", displayName: "Azure Cascade" },
            { value: "sdgred", displayName: "SDG Red" },
            { value: "sdgyellow", displayName: "SDG Yellow" },
            { value: "sdgorange", displayName: "SDG Orange" },
            { value: "sdggreen", displayName: "SDG Green" },
            { value: "sdgdarkgreen", displayName: "SDG Dark Green" },
            { value: "sdgnavyblue", displayName: "SDG Navy Blue" },
            { value: "ipc", displayName: "IPC" }
        ]
    });

    invertColorRamp: formattingSettings.ToggleSwitch = new formattingSettings.ToggleSwitch({
        name: "invertColorRamp",
        displayName: "Invert Color Ramp",
        value: false
    });

    minColor: formattingSettings.ColorPicker = new formattingSettings.ColorPicker({
        name: "minColor",
        displayName: "Minimum Color",
        value: { value: "#e1eef9" } // Default color
    });

    midColor: formattingSettings.ColorPicker = new formattingSettings.ColorPicker({
        name: "midColor",
        displayName: "Mid Color",
        value: { value: "#009edb" } // Default color
    });

    maxColor: formattingSettings.ColorPicker = new formattingSettings.ColorPicker({
        name: "maxColor",
        displayName: "Maximum Color",
        value: { value: "#002e6e" } // Default color
    });

    strokeColor: formattingSettings.ColorPicker = new formattingSettings.ColorPicker({
        name: "strokeColor",
        displayName: "Stroke Color",
        value: { value: "#ffffff" } // Default color
    });

    strokeWidth: formattingSettings.NumUpDown = new formattingSettings.NumUpDown({
        name: "strokeWidth",
        displayName: "Stroke Width",
        value: 1, // Default size
    });

    layerOpacity: formattingSettings.NumUpDown = new formattingSettings.Slider({
        name: "layerOpacity",
        displayName: "Layer Opacity",
        value: 100,//default value
        options: // optional input value validator  
        {
            maxValue: {
                type: powerbi.visuals.ValidatorType.Max,
                value: 100
            },
            minValue: {
                type: powerbi.visuals.ValidatorType.Min,
                value: 0
            }
        }
    });

    name: string = "choroplethDisplaySettingsGroup";
    displayName: string = "Display";
    slices: formattingSettings.Slice[] = [        
        this.usePredefinedColorRamp,        
        this.colorRamp, 
        this.invertColorRamp,    
        this.minColor,
        this.midColor,
        this.maxColor,
        this.strokeColor,
        this.strokeWidth,
        this.layerOpacity
    ];
}

class choroplethLegendSettingsGroup extends formattingSettings.SimpleCard {

    showLegend: formattingSettings.ToggleSwitch = new formattingSettings.ToggleSwitch({
        name: "showLegend",
        displayName: "Show Legend",
        value: false
    });   
    
    legendTitle: formattingSettings.TextInput = new TextInput({
        name: "legendTitle",
        displayName: "Legend Title",
        value: "Legend", // Default country
        placeholder: "" // Placeholder text
    });

    legendTitleColor: formattingSettings.ColorPicker = new formattingSettings.ColorPicker({
        name: "legendTitleColor",
        displayName: "Legend Title Color",
        value: { value: "#000000" } // Default color
    });

    legendLabelsColor: formattingSettings.ColorPicker = new formattingSettings.ColorPicker({
        name: "legendLabelsColor",
        displayName: "Legend Labels Color",
        value: { value: "#000000" } // Default color
    });

    legendBackgroundOpacity: formattingSettings.NumUpDown = new formattingSettings.Slider({
        name: "legendBackgroundOpacity",
        displayName: "Background Opacity",
        value: 90,//default value
        options: // optional input value validator  
        {
            maxValue: {
                type: powerbi.visuals.ValidatorType.Max,
                value: 100
            },
            minValue: {
                type: powerbi.visuals.ValidatorType.Min,
                value: 0
            }
        }
    });

    legendBackgroundColor: formattingSettings.ColorPicker = new formattingSettings.ColorPicker({
        name: "legendBackgroundColor",
        displayName: "Background Color",
        value: { value: "#ffffff" } // Default color
    });

    
    name: string = "choroplethLegendSettingsGroup";
    displayName: string = "Legend";
    slices: formattingSettings.Slice[] = [
        this.showLegend ,
        this.legendTitle,
        this.legendTitleColor,
        this.legendLabelsColor,
        this.legendBackgroundColor,
        this.legendBackgroundOpacity       
    ];
}


class choroplethVisualCardSettings extends formattingSettings.CompositeCard {

    showLayerControl: formattingSettings.ToggleSwitch = new formattingSettings.ToggleSwitch({
        name: "showLayerControl",
        value: false
    });
    
    public choroplethLocationBoundarySettingsGroup: choroplethLocationBoundarySettingsGroup = new choroplethLocationBoundarySettingsGroup();
    public choroplethClassificationSettingsGroup: choroplethClassificationSettingsGroup = new choroplethClassificationSettingsGroup();
    public choroplethDisplaySettingsGroup: choroplethDisplaySettingsGroup = new choroplethDisplaySettingsGroup();
    public choroplethLegendSettingsGroup: choroplethLegendSettingsGroup = new choroplethLegendSettingsGroup();

    topLevelSlice: formattingSettings.ToggleSwitch = this.showLayerControl;
    name: string = "choroplethVisualCardSettings";
    displayName: string = "Choropleth";
    groups: formattingSettings.Group[] = [this.choroplethLocationBoundarySettingsGroup,this.choroplethClassificationSettingsGroup,
         this.choroplethDisplaySettingsGroup, this.choroplethLegendSettingsGroup];
   
}


class mapToolsVisualCardSettings extends formattingSettings.SimpleCard {

    lockMapExtent: formattingSettings.ToggleSwitch = new formattingSettings.ToggleSwitch({
        name: "lockMapExtent",
        displayName: "Lock Map Extent",
        value: false
    });

    showZoomControl: formattingSettings.ToggleSwitch = new formattingSettings.ToggleSwitch({
        name: "showZoomControl",
        displayName: "Show Zoom Control",
        value: false
    });
    

   
    name: string = "mapToolsVisualCardSettings";
    displayName: string = "Map Tools";
    slices: formattingSettings.Slice[] = [this.lockMapExtent, this.showZoomControl];
   
}

/**
* visual settings model class
*
*/
export class HumanitarianMapVisualFormattingSettingsModel extends FormattingSettingsModel {

    // Create formatting settings model formatting cards
    BasemapVisualCardSettings = new basemapVisualCardSettings();
    ProportionalCirclesVisualCardSettings = new proportionalCirclesVisualCardSettings();
    ChoroplethVisualCardSettings = new choroplethVisualCardSettings();
    MapToolsVisualCardSettings = new mapToolsVisualCardSettings();

    cards = [this.BasemapVisualCardSettings, this.ProportionalCirclesVisualCardSettings, this.ChoroplethVisualCardSettings, this.MapToolsVisualCardSettings];

}








