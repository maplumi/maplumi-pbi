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
import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import { formatting } from "powerbi-visuals-utils-formattingutils";

import { dataViewObjectsParser } from "powerbi-visuals-utils-dataviewutils";


import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsSlice = formattingSettings.Slice;
import FormattingSettingsModel = formattingSettings.Model;
import TextInput = formattingSettings.TextInput;
import DropDown = formattingSettings.ItemDropdown;
import DataViewObjectsParser = dataViewObjectsParser.DataViewObjectsParser;

/**
 * OpenLayers Visual Formatting Cards
 */
class basemapVisualCardSettings extends FormattingSettingsCard {

    selectedBasemap: DropDown = new DropDown({
        name: "selectedBasemap",
        displayName: "Basemap",
        value: { 
            value: "openstreetmap",  // The actual value
            displayName: "OpenStreetMap" // The display name
        }, 
        items: [
            { value: "openstreetmap", displayName: "OpenStreetMap" },
            { value: "mapbox", displayName: "Mapbox" },
            { value: "esri", displayName: "Esri World Imagery" }
        ]
    });    

    name: string = "basemapVisualCardSettings";
    displayName: string = "Basemap";
    slices: Array<formattingSettings.Slice> = [
        this.selectedBasemap       
    ];

}

class markerVisualCardSettings extends FormattingSettingsCard {

    // Marker styling options
    markerColor: formattingSettings.ColorPicker = new formattingSettings.ColorPicker({
        name: "markerColor",
        displayName: "Marker Color",
        value: { value: "#009edb" } // Default color
    });

    markerSize: formattingSettings.NumUpDown = new formattingSettings.NumUpDown({
        name: "markerSize",
        displayName: "Marker Size",
        value: 6, // Default size
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
    
    markerLayerOpacity: formattingSettings.NumUpDown = new formattingSettings.Slider({
        name: "markerLayerOpacity",
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

    name: string = "markerVisualCardSettings";
    displayName: string = "Marker";
    slices: Array<formattingSettings.Slice> = [
        this.markerColor,
        this.markerSize,
        this.strokeColor,
        this.strokeWidth,
        this.markerLayerOpacity
    ];

}

class choroplethVisualCardSettings extends FormattingSettingsCard  {

    selectedISO3Code: formattingSettings.TextInput = new TextInput({
        name: "selectedISO3Code",
        displayName: "Country iSO3 Code",
        value: "", // Default country
        placeholder: "Enter ISO3 code" // Placeholder text
    });

    selectedAdminLevel: DropDown = new DropDown({
        name: "selectedAdminLevel",
        displayName: "Admin Level",
        //placeholder: "Select Admin Level",
        value: {
            value: "",  // The actual value
            displayName: "" // The display name
        },
        items: [
            { value: "1", displayName: "ADM1" },
            { value: "2", displayName: "ADM2" },
            { value: "3", displayName: "ADM3" }

        ]
    });

    color: formattingSettings.ColorPicker = new formattingSettings.ColorPicker({
        name: "color",
        displayName: "Color",
        value: { value: "#009edb" } // Default color
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

    name: string = "choroplethVisualCardSettings";
    displayName: string = "Choropleth";
    slices: Array<formattingSettings.Slice> = [
        this.selectedISO3Code,
        this.selectedAdminLevel,
        this.color,
        this.strokeColor,
        this.strokeWidth,
        this.layerOpacity
    ];
}

/**
* visual settings model class
*
*/
export class OpenLayersVisualFormattingSettingsModel extends FormattingSettingsModel {
    
    // Create formatting settings model formatting cards
    BasemapVisualCardSettings = new basemapVisualCardSettings();
    MarkerVisualCardSettings = new markerVisualCardSettings();
    ChoroplethVisualCardSettings = new choroplethVisualCardSettings();

    cards = [this.BasemapVisualCardSettings,this.MarkerVisualCardSettings, this.ChoroplethVisualCardSettings];
}








