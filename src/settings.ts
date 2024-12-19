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
 * OpenLayers Visual Formatting Card
 */
class OpenLayersVisualCardSettings extends FormattingSettingsCard {

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

    name: string = "openLayersVisualCardSettings";
    displayName: string = "OpenLayers";
    slices: Array<formattingSettings.Slice> = [
        this.selectedBasemap,
        this.markerColor,
        this.markerSize,
        this.strokeColor,
        this.strokeWidth
    ];

}

/**
* visual settings model class
*
*/
export class OpenLayersVisualFormattingSettingsModel extends FormattingSettingsModel {
    
    // Create formatting settings model formatting cards
    OpenLayersVisualCard = new OpenLayersVisualCardSettings();

    cards = [this.OpenLayersVisualCard];
}








