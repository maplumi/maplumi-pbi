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

import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";
import { dataViewObjectsParser } from "powerbi-visuals-utils-dataviewutils";
import { VisualConfig } from "./config/VisualConfig";
import { ClassificationMethods, LegendOrientations, LegendLabelPositions, LegendPositions, BasemapNames, TitleAlignments } from "./constants/strings";

import FormattingSettingsModel = formattingSettings.Model;
import TextInput = formattingSettings.TextInput;
import DropDown = formattingSettings.ItemDropdown;

class basemapSelectSettingsGroup extends formattingSettings.SimpleCard {

    selectedBasemap: DropDown = new DropDown({
        name: "selectedBasemap",
        displayName: "Select Basemap",
        value: {
            value: BasemapNames.OpenStreetMap,  // The actual value
            displayName: "OpenStreetMap" // The display name
        },
        items: [
            { value: BasemapNames.OpenStreetMap, displayName: "OpenStreetMap" },
            { value: BasemapNames.Mapbox, displayName: "Mapbox" },
            { value: BasemapNames.MapTiler, displayName: "MapTiler" },
            { value: BasemapNames.None, displayName: "No Basemap" }
        ]
    });

    customMapAttribution: formattingSettings.TextInput = new TextInput({
        name: "customMapAttribution",
        displayName: "Extra Attribution",
        value: "",
        placeholder: "Enter Custom Attribution" // Placeholder text
    });

    name: string = "basemapSelectSettingsGroup";
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
    collapsible: boolean = true;
    slices: formattingSettings.Slice[] = [this.mapboxAccessToken, this.mapboxStyle, this.mapboxCustomStyleUrl, this.declutterLabels];

}

class maptilerSettingsGroup extends formattingSettings.SimpleCard {

    maptilerApiKey: formattingSettings.TextInput = new TextInput({
        name: "maptilerApiKey",
        displayName: "API Key",
        value: "",
        placeholder: "Enter API Key" // Placeholder text
    });

    maptilerStyle: DropDown = new DropDown({

        name: "maptilerStyle",
        displayName: "Select Map Style",
        value: {
            value: "dataviz",
            displayName: "Dataviz"
        },
        items: [
            { value: "aquarelle", displayName: "Aquarelle" },
            { value: "backdrop", displayName: "Backdrop" },
            { value: "basic", displayName: "Basic" },
            { value: "bright", displayName: "Bright" },
            { value: "dataviz", displayName: "Dataviz" },
            { value: "landscape", displayName: "Landscape" },
            { value: "ocean", displayName: "Ocean" },
            { value: "openstreetmap", displayName: "OpenStreetMap" },
            { value: "outdoor", displayName: "Outdoor" },
            { value: "satellite", displayName: "Satellite" },
            { value: "streets", displayName: "Streets" },
            { value: "toner", displayName: "Toner" },
            { value: "topo", displayName: "Topo" },
            { value: "winter", displayName: "Winter" }
        ]

    });


    name: string = "maptilerSettingsGroup";
    displayName: string = "Maptiler Settings";
    collapsible: boolean = true;
    slices: formattingSettings.Slice[] = [this.maptilerApiKey, this.maptilerStyle];

}

class basemapVisualCardSettings extends formattingSettings.CompositeCard {

    public basemapSelectSettingsGroup: basemapSelectSettingsGroup = new basemapSelectSettingsGroup();
    public mapBoxSettingsGroup: mapBoxSettingsGroup = new mapBoxSettingsGroup();
    public maptilerSettingsGroup: maptilerSettingsGroup = new maptilerSettingsGroup();

    name: string = "basemapVisualCardSettings";
    displayName: string = "Basemap";
    groups: formattingSettings.Group[] = [this.basemapSelectSettingsGroup, this.mapBoxSettingsGroup, this.maptilerSettingsGroup];

    public applyConditionalDisplayRules(): void {

        const selectedBasemap = this.basemapSelectSettingsGroup.selectedBasemap.value?.value;

        // Show Mapbox settings only if Mapbox is selected
    const isMapbox = selectedBasemap === BasemapNames.Mapbox;
        this.mapBoxSettingsGroup.visible = isMapbox;

        // Show MapTiler settings only if MapTiler is selected
    const isMaptiler = selectedBasemap === BasemapNames.MapTiler;
        this.maptilerSettingsGroup.visible = isMaptiler;

        // Show/hide custom attribution field (you can decide its logic)
        //this.basemapSelectSettingsGroup.customMapAttribution.visible = selectedBasemap !== "none";
    }


}

class proportionalCirclesDisplaySettingsGroup extends formattingSettings.SimpleCard {

    // Proportional circle styling options
    chartType: DropDown = new DropDown({
        name: "chartType",
        displayName: "Chart Type",
        value: {
            value: "nested-circle",  //default value
            displayName: "Nested Circle"
        },
        items: [
            { value: "nested-circle", displayName: "Nested Circle" },
            { value: "donut-chart", displayName: "Donut Chart" },
            { value: "pie-chart", displayName: "Pie Chart" }
        ]
    });
    proportionalCircles1Color: formattingSettings.ColorPicker = new formattingSettings.ColorPicker({
        name: "proportionalCircles1Color",
        displayName: "Circels 1 Color",
        value: { value: "#f58220" } // Default color
    });
    proportionalCircles2Color: formattingSettings.ColorPicker = new formattingSettings.ColorPicker({
        name: "proportionalCircles2Color",
        displayName: "Circles 2 Color",
        value: { value: "#ffc800" } // Default color
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

    proportionalCircles1LayerOpacity: formattingSettings.NumUpDown = new formattingSettings.Slider({
        name: "proportionalCircles1LayerOpacity",
        displayName: "Circles 1 Opacity",
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

    proportionalCircles2LayerOpacity: formattingSettings.NumUpDown = new formattingSettings.Slider({
        name: "proportionalCircles2LayerOpacity",
        displayName: "Circles 2 Opacity",
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

    name: string = "proportalCirclesDisplaySettingsGroup";
    displayName: string = "Display";
    collapsible: boolean = false;
    slices: formattingSettings.Slice[] = [
        this.chartType,
        this.proportionalCircles1Color,
        this.proportionalCircles2Color,
        this.proportionalCirclesMinimumRadius,
        this.proportionalCirclesMaximumRadius,
        this.proportionalCirclesStrokeColor,
        this.proportionalCirclesStrokeWidth,
        this.proportionalCircles1LayerOpacity,
        this.proportionalCircles2LayerOpacity
        
    ];

}

class proportionalCirclesLegendSettingsGroup extends formattingSettings.SimpleCard {

    showLegend: formattingSettings.ToggleSwitch = new formattingSettings.ToggleSwitch({
        name: "showLegend",
        displayName: "Show Legend",
        value: false
    });

    legendTitle: formattingSettings.TextInput = new formattingSettings.TextInput({
        name: "legendTitle",
        displayName: "Legend Title",
        value: "Legend",
        placeholder: ""
    });

    legendTitleColor: formattingSettings.ColorPicker = new formattingSettings.ColorPicker({
        name: "legendTitleColor",
        displayName: "Legend Title Color",
        value: { value: "#000000" } // Default color
    });

    legendItemStrokeColor: formattingSettings.ColorPicker = new formattingSettings.ColorPicker({
        name: "legendItemStrokeColor",
        displayName: "Legend Item Stroke Color",
        value: { value: "#ffffff" } // Default color    
        // This will be used for the stroke around legend items
    });

    legendItemStrokeWidth: formattingSettings.NumUpDown = new formattingSettings.NumUpDown({
        name: "legendItemStrokeWidth",
        displayName: "Legend Item Stroke Width",
        value: 1, // Default size
        options:
        {
            maxValue: {
                type: powerbi.visuals.ValidatorType.Max,
                value: 5
            },
            minValue: {
                type: powerbi.visuals.ValidatorType.Min,
                value: 0
            }
        }
    });

    leaderLineColor: formattingSettings.ColorPicker = new formattingSettings.ColorPicker({
        name: "leaderLineColor",
        displayName: "Leader Line Color",
        value: { value: "#000000" } // Default color
    });

    leaderLineStrokeWidth: formattingSettings.NumUpDown = new formattingSettings.NumUpDown({
        name: "leaderLineStrokeWidth",
        displayName: "Stroke Width",
        value: 1, // Default size
    });

    labelTextColor: formattingSettings.ColorPicker = new formattingSettings.ColorPicker({
        name: "labelTextColor",
        displayName: "Label Text Color",
        value: { value: "#000000" } // Default color
    });

    labelSpacing: formattingSettings.NumUpDown = new formattingSettings.NumUpDown({
        name: "labelSpacing",
        displayName: "Label Spacing",
        value: 15,
        options:
        {
            maxValue: {
                type: powerbi.visuals.ValidatorType.Max,
                value: 20
            },
            minValue: {
                type: powerbi.visuals.ValidatorType.Min,
                value: 5
            }
        }
    });

    roundOffLegendValues: formattingSettings.ToggleSwitch = new formattingSettings.ToggleSwitch({
        name: "roundOffLegendValues",
        displayName: "Round Legend Values",
        value: false
    });

    hideMinIfBelowThreshold: formattingSettings.ToggleSwitch = new formattingSettings.ToggleSwitch({
        name: "hideMinIfBelowThreshold",
        displayName: "Hide Min Circle",
        value: false
    });

    minValueThreshold: formattingSettings.NumUpDown = new formattingSettings.NumUpDown({
        name: "minValueThreshold",
        displayName: "Min Value Threshold",
        value: 10,
    });

    minRadiusThreshold: formattingSettings.NumUpDown = new formattingSettings.NumUpDown({
        name: "minRadiusThreshold",
        displayName: "Min Radius Threshold",
        value: 5,
        options:
        {
            maxValue: {
                type: powerbi.visuals.ValidatorType.Max,
                value: 5
            },
            minValue: {
                type: powerbi.visuals.ValidatorType.Min,
                value: 0
            }
        }
    });

    xPadding: formattingSettings.NumUpDown = new formattingSettings.NumUpDown({
        name: "xPadding",
        displayName: "X Padding",
        value: 15,
        options:
        {
            maxValue: {
                type: powerbi.visuals.ValidatorType.Max,
                value: 30
            },
            minValue: {
                type: powerbi.visuals.ValidatorType.Min,
                value: 0
            }
        }
    });

    yPadding: formattingSettings.NumUpDown = new formattingSettings.NumUpDown({
        name: "yPadding",
        displayName: "Y Padding",
        value: 5,
        options:
        {
            maxValue: {
                type: powerbi.visuals.ValidatorType.Max,
                value: 15
            },
            minValue: {
                type: powerbi.visuals.ValidatorType.Min,
                value: 0
            }
        }
    });

    name: string = "proportalCirclesLegendSettingsGroup";
    displayName: string = "Legend";
    collapsible: boolean = false;
    slices: formattingSettings.Slice[] = [
        this.showLegend,
        this.legendTitle,
        this.legendTitleColor,
        this.legendItemStrokeColor,
        this.legendItemStrokeWidth,
        this.leaderLineColor,
        this.labelTextColor,
        this.roundOffLegendValues,
        this.hideMinIfBelowThreshold,
        this.minValueThreshold,
        this.minRadiusThreshold,
        this.xPadding,
        this.yPadding
    ];

}

class proportionalCirclesVisualCardSettings extends formattingSettings.CompositeCard {

    showLayerControl: formattingSettings.ToggleSwitch = new formattingSettings.ToggleSwitch({
        name: "showLayerControl",
        value: true
    });

    public proportalCirclesDisplaySettingsGroup = new proportionalCirclesDisplaySettingsGroup();
    public proportionalCircleLegendSettingsGroup = new proportionalCirclesLegendSettingsGroup();

    topLevelSlice: formattingSettings.ToggleSwitch = this.showLayerControl;
    name: string = "proportionalCirclesVisualCardSettings";
    displayName: string = "Scaled Circles";
    groups: formattingSettings.Group[] = [this.proportalCirclesDisplaySettingsGroup, this.proportionalCircleLegendSettingsGroup];

}

class choroplethLocationBoundarySettingsGroup extends formattingSettings.SimpleCard {

    boundaryDataSource: DropDown = new DropDown({
        name: "boundaryDataSource",
        displayName: "Boundary Source",
        value: {
            value: "geoboundaries",  //default value
            displayName: "GeoBoundaries"
        },
        items: [
            { value: "geoboundaries", displayName: "GeoBoundaries" },
            { value: "custom", displayName: "Custom" }
        ]
    });

    // Country/Region Selection for GeoBoundaries
    geoBoundariesCountry: DropDown = new DropDown({
        name: "geoBoundariesCountry",
        displayName: "Country/Region",
        value: {
            value: "KEN",
            displayName: "Kenya"
        },
        items: VisualConfig.GEOBOUNDARIES.COUNTRIES
    });

    // GeoBoundaries Release Type Selection (comes after country selection)
    geoBoundariesReleaseType: DropDown = new DropDown({
        name: "geoBoundariesReleaseType",
        displayName: "Release Type",
        value: {
            value: "gbOpen",
            displayName: "gbOpen (CC-BY 4.0)"
        },
        items: [
            { value: "gbOpen", displayName: "gbOpen (CC-BY 4.0)" },
            { value: "gbHumanitarian", displayName: "gbHumanitarian (UN OCHA)" },
            { value: "gbAuthoritative", displayName: "gbAuthoritative (UN SALB)" }
        ]
    });

    // Administrative Level Selection for GeoBoundaries
    geoBoundariesAdminLevel: DropDown = new DropDown({
        name: "geoBoundariesAdminLevel",
        displayName: "Administrative Level",
        value: {
            value: "ADM0",
            displayName: "ADM0 (Country Borders)"
        },
        items: [
            { value: "ADM0", displayName: "ADM0 (Country Borders)" },
            { value: "ADM1", displayName: "ADM1 (States/Provinces)" },
            { value: "ADM2", displayName: "ADM2 (Counties/Districts)" },
            { value: "ADM3", displayName: "ADM3 (Municipalities)" }           
        ]
    });

    // Store all possible field options for each data source
    private sourceFieldOptions = VisualConfig.GEOBOUNDARIES.SOURCE_FIELD_OPTIONS;

    // Combined Boundary ID Field - dropdown for GeoBoundaries, text input for custom
    boundaryIdField: DropDown = new DropDown({
        name: "boundaryIdField",
        displayName: "Boundary ID Field",
        value: {
            value: "shapeISO",  // Default to first GeoBoundaries option
            displayName: "shapeISO (ISO Code)"
        },
        items: [
            { value: "shapeISO", displayName: "shapeISO (ISO Code)" },
            { value: "shapeName", displayName: "shapeName (Name)" },
            { value: "shapeID", displayName: "shapeID (Unique ID)" },
            { value: "shapeGroup", displayName: "shapeGroup (Country)" }
        ]
    });

    // Text input for custom boundary ID field (only shown for custom sources)
    customBoundaryIdField: formattingSettings.TextInput = new TextInput({
        name: "customBoundaryIdField",
        displayName: "Boundary ID Field",
        value: "",
        placeholder: "Enter field name"
    });

    topoJSON_geoJSON_FileUrl: formattingSettings.TextInput = new TextInput({
        name: "topoJSON_geoJSON_FileUrl",
        displayName: "TopoJSON/GeoJSON Url",
        value: "", // Default url
        placeholder: "" // Placeholder text
    });

    name: string = "choroplethLocationBoundarySettingsGroup";
    displayName: string = "Boundary";
    collapsible: boolean = false;
    slices: formattingSettings.Slice[] = [
        this.boundaryDataSource,
        this.geoBoundariesCountry,
        this.geoBoundariesReleaseType,
        this.geoBoundariesAdminLevel,
        this.topoJSON_geoJSON_FileUrl, 
        this.boundaryIdField,
        this.customBoundaryIdField
    ];

    public applyConditionalDisplayRules(): void {

        const selectedSource = this.boundaryDataSource.value?.value;

        // Show/hide geoBoundaries-specific fields
        const isGeoBoundaries = selectedSource === "geoboundaries";
        this.geoBoundariesCountry.visible = isGeoBoundaries;
        this.geoBoundariesAdminLevel.visible = isGeoBoundaries;

        // Handle "All Countries" special case
        const isAllCountries = isGeoBoundaries && this.geoBoundariesCountry.value?.value === "ALL";
        
        // Hide Release Type when "All Countries" is selected (since custom URL doesn't use release type)
        this.geoBoundariesReleaseType.visible = isGeoBoundaries && !isAllCountries;

        if (isAllCountries) {
            // Restrict admin level options to ADM0 only when "All Countries" is selected
            this.geoBoundariesAdminLevel.items = [
                { value: "ADM0", displayName: "ADM0 (Country Borders)" }
            ];
            // Force ADM0 selection if not already selected
            if (this.geoBoundariesAdminLevel.value?.value !== "ADM0") {
                this.geoBoundariesAdminLevel.value = { value: "ADM0", displayName: "ADM0 (Country Borders)" };
            }
        } else if (isGeoBoundaries) {
            // Restore full admin level options for specific countries
            this.geoBoundariesAdminLevel.items = [
                { value: "ADM0", displayName: "ADM0 (Country Borders)" },
                { value: "ADM1", displayName: "ADM1 (States/Provinces)" },
                { value: "ADM2", displayName: "ADM2 (Counties/Districts)" },
                { value: "ADM3", displayName: "ADM3 (Municipalities)" }
            ];
        }

        // Dynamically update boundaryIdField items based on selected boundaryDataSource
        if (selectedSource && this.sourceFieldOptions[selectedSource]) {
            this.boundaryIdField.items = this.sourceFieldOptions[selectedSource];

            // If current value is not in the new items, reset to first
            const validValues = this.sourceFieldOptions[selectedSource].map(opt => opt.value);
            if (!validValues.includes(String(this.boundaryIdField.value.value))) {
                this.boundaryIdField.value = { ...this.boundaryIdField.items[0] };
            }
        }

        // Handle visibility based on data source
        const isCustomSource = selectedSource === "custom";
        
        // Show/hide fields based on data source
        this.topoJSON_geoJSON_FileUrl.visible = isCustomSource;
        this.boundaryIdField.visible = isGeoBoundaries;           // Dropdown for GeoBoundaries
        this.customBoundaryIdField.visible = isCustomSource;      // Text input for custom sources
    }
}

class choroplethClassificationSettingsGroup extends formattingSettings.SimpleCard {


    numClasses: formattingSettings.NumUpDown = new formattingSettings.NumUpDown({
        name: "numClasses",
        displayName: "Classes",
        value: 5, // Default number of classes
        options:
        {
            maxValue: {
                type: powerbi.visuals.ValidatorType.Max,
                value: 7
            },
            minValue: {
                type: powerbi.visuals.ValidatorType.Min,
                value: 0
            }
        }
    });

    classificationMethod: DropDown = new DropDown({
        name: "classificationMethod",
        displayName: "Method",
        value: {
            value: ClassificationMethods.Quantile,  //default value
            displayName: "Quantile"
        },
        items: [
            { value: ClassificationMethods.Unique, displayName: "Categorical/Ordinal" },
            { value: ClassificationMethods.Quantile, displayName: "Quantile" },
            { value: ClassificationMethods.EqualInterval, displayName: "Equal Interval" },
            { value: ClassificationMethods.Logarithmic, displayName: "Logarithmic" },
            { value: ClassificationMethods.KMeans, displayName: "K-means" },
            { value: ClassificationMethods.Jenks, displayName: "Jenks Natural Breaks" }
        ]
    });


    name: string = "choroplethClassificationSettingsGroup";
    displayName: string = "Classification";
    slices: formattingSettings.Slice[] = [

        this.classificationMethod,
        this.numClasses
    ];
}

class choroplethDisplaySettingsGroup extends formattingSettings.SimpleCard {

    colorRamp: DropDown = new DropDown({
        name: "colorRamp",
        displayName: "Color Ramp",
        value: {
            value: "blue",  //default value
            displayName: "Blue"
        },
        items: [
            { value: "custom", displayName: "Custom" }, // Custom color ramp option
            { value: "blue", displayName: "Blue" },
            { value: "red", displayName: "Red" },
            { value: "green", displayName: "Green" },
            { value: "orange", displayName: "Orange" },
            { value: "purple", displayName: "Purple" },
            { value: "yellow", displayName: "Yellow" },
            { value: "slateGrey", displayName: "Slate Grey" },
            { value: "neutralGrey", displayName: "Neutral Grey" },
            { value: "azurecascade", displayName: "Azure Cascade" },
            { value: "ipc", displayName: "IPC" },
            { value: "sdgred", displayName: "SDG Red" },
            { value: "sdgyellow", displayName: "SDG Yellow" },
            { value: "sdgorange", displayName: "SDG Orange" },
            { value: "sdggreen", displayName: "SDG Green" },
            { value: "sdgdarkgreen", displayName: "SDG Dark Green" },
            { value: "sdgnavyblue", displayName: "SDG Navy Blue" }


        ]
    });

    customColorRamp: formattingSettings.TextInput = new TextInput({
        name: "customColorRamp",
        displayName: "Custom Color Ramp",
        value: " #e1eef9, #c7e1f5, #64beeb, #009edb", // Default value
        placeholder: " #e1eef9, #c7e1f5, #64beeb, #009edb"
    });

    invertColorRamp: formattingSettings.ToggleSwitch = new formattingSettings.ToggleSwitch({
        name: "invertColorRamp",
        displayName: "Invert Color Ramp",
        value: false
    });

    colorMode: DropDown = new DropDown({
        name: "colorMode",
        displayName: "Color Mode",
        value: {
            value: "lab",  //default value
            displayName: "Lab"
        },
        items: [
            { value: "lab", displayName: "LAB" },
            { value: "rgb", displayName: "RGB" },
            { value: "hsl", displayName: "HSL" },
            { value: "hsv", displayName: "HSV" },
            { value: "lch", displayName: "LCH" }

        ]
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
        options:
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

    simplificationStrength: formattingSettings.NumUpDown = new formattingSettings.Slider({
        name: "simplificationStrength",
        displayName: "Simplification Strength",
        value: 50,
        options:
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

        this.colorRamp,
        this.customColorRamp,
        this.invertColorRamp,
        this.colorMode,
        this.strokeColor,
        this.strokeWidth,
    this.layerOpacity,
    this.simplificationStrength
    ];

    public applyConditionalDisplayRules(): void {

        const isCustomRamp = this.colorRamp.value?.value === "custom";

        // Show custom ramp text input only if the choice of color ramp is 'custom'
        this.customColorRamp.visible = isCustomRamp;

    }


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

    legendTitleAlignment: DropDown = new DropDown({
        name: "legendTitleAlignment",
        displayName: "Legend Title Alignment",
        value: {
            value: TitleAlignments.Left,  //default value
            displayName: "Left"
        },
        items: [
            { value: TitleAlignments.Left, displayName: "Left" },
            { value: TitleAlignments.Center, displayName: "Center" },
            { value: TitleAlignments.Right, displayName: "Right" }
        ]
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

    legendLabelPosition: DropDown = new DropDown({
        name: "legendLabelPosition",
        displayName: "Legend Label Position",
        value: {
            value: LegendLabelPositions.Top,  //default value
            displayName: "Top"
        },
        items: [
            { value: LegendLabelPositions.Top, displayName: "Top" },
            { value: LegendLabelPositions.Center, displayName: "Center" },
            { value: LegendLabelPositions.Bottom, displayName: "Bottom" },
            { value: LegendLabelPositions.Right, displayName: "Right" },
            { value: LegendLabelPositions.Left, displayName: "Left" }
        ]
    });


    legendOrientation: DropDown = new DropDown({
        name: "legendOrientation",
        displayName: "Legend Orientation",
        value: {
            value: LegendOrientations.Horizontal,  //default value
            displayName: "Horizontal"
        },
        items: [
            { value: LegendOrientations.Horizontal, displayName: "Horizontal" },
            { value: LegendOrientations.Vertical, displayName: "Vertical" }
        ]
    });

    legendItemMargin: formattingSettings.NumUpDown = new formattingSettings.NumUpDown({
        name: "legendItemMargin",
        displayName: "Legdend Item Margin",
        value: 2.5, // Default size
        options:
        {
            maxValue: {
                type: powerbi.visuals.ValidatorType.Max,
                value: 5
            },
            minValue: {
                type: powerbi.visuals.ValidatorType.Min,
                value: 0
            }
        }
    });


    name: string = "choroplethLegendSettingsGroup";
    displayName: string = "Legend";
    slices: formattingSettings.Slice[] = [
        this.showLegend,
        this.legendTitle,
        this.legendTitleAlignment,
        this.legendOrientation,
        this.legendLabelPosition,
        this.legendTitleColor,
        this.legendLabelsColor,
        this.legendItemMargin
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
    groups: formattingSettings.Group[] = [this.choroplethLocationBoundarySettingsGroup, this.choroplethClassificationSettingsGroup,
    this.choroplethDisplaySettingsGroup, this.choroplethLegendSettingsGroup];
    //groups: formattingSettings.Group[] = [];


}

class mapToolsSettingsGroup extends formattingSettings.SimpleCard {

    lockMapExtent: formattingSettings.ToggleSwitch = new formattingSettings.ToggleSwitch({
        name: "lockMapExtent",
        displayName: "Lock Map Extent",
        value: false
    });

    showZoomControl: formattingSettings.ToggleSwitch = new formattingSettings.ToggleSwitch({
        name: "showZoomControl",
        displayName: "Show Zoom Control",
        value: true
    });

    // Stores the locked map extent as a comma-separated string: "minX,minY,maxX,maxY"
    lockedMapExtent: formattingSettings.TextInput = new formattingSettings.TextInput({
        name: "lockedMapExtent",
        displayName: "Locked Map Extent",
        value: "",
        placeholder: "minX,minY,maxX,maxY"
    });

    // Stores the locked map zoom level
    lockedMapZoom: formattingSettings.NumUpDown = new formattingSettings.NumUpDown({
        name: "lockedMapZoom",
        displayName: "Locked Map Zoom",
        value: null
    });

    name: string = "mapToolsSettingsGroup";
    displayName: string = "Map Tools";
    slices: formattingSettings.Slice[] = [this.lockMapExtent, this.showZoomControl, this.lockedMapExtent, this.lockedMapZoom];

    public applyConditionalDisplayRules(): void {

        this.lockedMapExtent.visible = false; // Always hidden
        this.lockedMapZoom.visible = false; // Always hidden

        if (this.lockMapExtent.value) {
            this.showZoomControl.value = false;
            this.showZoomControl.visible = false;
        }
    }

}

class legendContainerSettingsGroup extends formattingSettings.SimpleCard {

    legendPosition: DropDown = new DropDown({
        name: "legendPosition",
        displayName: "Position",
        value: {
            value: LegendPositions.TopRight,  //default value
            displayName: "Top Right"
        },
        items: [
            { value: LegendPositions.TopRight, displayName: "Top Right" },
            { value: LegendPositions.TopLeft, displayName: "Top Left" },
            { value: LegendPositions.TopCenter, displayName: "Top Center" },
            { value: LegendPositions.BottomRight, displayName: "Bottom Right" },
            { value: LegendPositions.BottomLeft, displayName: "Bottom Left" },
            { value: LegendPositions.BottomCenter, displayName: "Bottom Center" }

        ]
    });

    legendBorderWidth: formattingSettings.NumUpDown = new formattingSettings.NumUpDown({
        name: "legendBorderWidth",
        displayName: "Border Width",
        value: 1, // Default size
    });

    legendBorderRadius: formattingSettings.NumUpDown = new formattingSettings.Slider({
        name: "legendBorderRadius",
        displayName: "Rounded Corners",
        value: 5,//default value
        options: // optional input value validator  
        {
            maxValue: {
                type: powerbi.visuals.ValidatorType.Max,
                value: 30
            },
            minValue: {
                type: powerbi.visuals.ValidatorType.Min,
                value: 0
            }
        }
    });

    legendBorderColor: formattingSettings.ColorPicker = new formattingSettings.ColorPicker({
        name: "legendBorderColor",
        displayName: "Border Color",
        value: { value: "#ffffff" } // Default color
    });

    legendBackgroundColor: formattingSettings.ColorPicker = new formattingSettings.ColorPicker({
        name: "legendBackgroundColor",
        displayName: "Background Color",
        value: { value: "#ffffff" } // Default color
    });

    legendBackgroundOpacity: formattingSettings.NumUpDown = new formattingSettings.Slider({
        name: "legendBackgroundOpacity",
        displayName: "Background Opacity",
        value: 90,
        options:
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

    legendBottomMargin: formattingSettings.NumUpDown = new formattingSettings.NumUpDown({
        name: "legendBottomMargin",
        displayName: "Bottom Margin",
        value: 25,
        options:
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

    legendTopMargin: formattingSettings.NumUpDown = new formattingSettings.NumUpDown({
        name: "legendTopMargin",
        displayName: "Top Margin",
        value: 0,
        options:
        {
            maxValue: {
                type: powerbi.visuals.ValidatorType.Max,
                value: 80
            },
            minValue: {
                type: powerbi.visuals.ValidatorType.Min,
                value: 0
            }
        }
    });

    legendLeftMargin: formattingSettings.NumUpDown = new formattingSettings.NumUpDown({
        name: "legendLeftMargin",
        displayName: "Left Margin",
        value: 25,
        options:
        {
            maxValue: {
                type: powerbi.visuals.ValidatorType.Max,
                value: 80
            },
            minValue: {
                type: powerbi.visuals.ValidatorType.Min,
                value: 0
            }
        }
    });

    legendRightMargin: formattingSettings.NumUpDown = new formattingSettings.NumUpDown({
        name: "legendRightMargin",
        displayName: "Right Margin",
        value: 0,
        options:
        {
            maxValue: {
                type: powerbi.visuals.ValidatorType.Max,
                value: 80
            },
            minValue: {
                type: powerbi.visuals.ValidatorType.Min,
                value: 0
            }
        }
    });


    name: string = "legendContainerSettingsGroup";
    displayName: string = "Legend Container";
    slices: formattingSettings.Slice[] = [
        this.legendPosition,
        this.legendBorderWidth,
        this.legendBorderRadius,
        this.legendBorderColor,
        this.legendBackgroundColor,
        this.legendBackgroundOpacity,
        this.legendTopMargin,
        this.legendBottomMargin,
        this.legendLeftMargin,
        this.legendRightMargin
    ];

    public applyConditionalDisplayRules(): void {

        if (this.legendPosition.value?.value === "top-center") {
            this.legendLeftMargin.visible = false;
            this.legendRightMargin.visible = false;
            this.legendBottomMargin.visible = false;
        }

        if (this.legendPosition.value?.value === "top-right") {

            this.legendLeftMargin.visible = false;
            this.legendBottomMargin.visible = false;
        }

        if (this.legendPosition.value?.value === "top-left") {

            this.legendRightMargin.visible = false;
            this.legendBottomMargin.visible = false;
        }

        if (this.legendPosition.value?.value === "bottom-center") {
            this.legendLeftMargin.visible = false;
            this.legendRightMargin.visible = false;
            this.legendTopMargin.visible = false;
        }

        if (this.legendPosition.value?.value === "bottom-left") {
            this.legendLeftMargin.value = 0;
            this.legendRightMargin.visible = false;
            this.legendTopMargin.visible = false;
        }

        if (this.legendPosition.value?.value === "bottom-right") {

            this.legendLeftMargin.visible = false;
            this.legendTopMargin.visible = false;
        }

    }

}

class mapControlsVisualCardSettings extends formattingSettings.CompositeCard {

    public mapToolsSettingsGroup: mapToolsSettingsGroup = new mapToolsSettingsGroup();
    public legendContainerSettingsGroup: legendContainerSettingsGroup = new legendContainerSettingsGroup();


    name: string = "mapControlsVisualCardSettings";
    displayName: string = "Controls";
    groups: formattingSettings.Group[] = [this.mapToolsSettingsGroup, this.legendContainerSettingsGroup];

}

/**
* visual settings model class
*
*/
export class MaplumiVisualFormattingSettingsModel extends FormattingSettingsModel {

    // Create formatting settings model formatting cards
    BasemapVisualCardSettings = new basemapVisualCardSettings();
    ProportionalCirclesVisualCardSettings = new proportionalCirclesVisualCardSettings();
    ChoroplethVisualCardSettings = new choroplethVisualCardSettings();
    mapControlsVisualCardSettings = new mapControlsVisualCardSettings();

    cards = [this.mapControlsVisualCardSettings, this.BasemapVisualCardSettings, this.ProportionalCirclesVisualCardSettings, this.ChoroplethVisualCardSettings];

}