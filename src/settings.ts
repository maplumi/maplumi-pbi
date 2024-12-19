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
import powerbiVisualsApi from "powerbi-visuals-api";

import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsSlice = formattingSettings.Slice;
import FormattingSettingsModel = formattingSettings.Model;
import TextInput = formattingSettings.TextInput;
import DataViewObjectsParser = dataViewObjectsParser.DataViewObjectsParser;

/**
 * Data Point Formatting Card
 */
class OpenLayersVisualCardSettings extends FormattingSettingsCard {
    defaultColor = new formattingSettings.ColorPicker({
        name: "defaultColor",
        displayName: "Default color",
        value: { value: "" }
    });

    showAllDataPoints = new formattingSettings.ToggleSwitch({
        name: "showAllDataPoints",
        displayName: "Show all",
        value: true
    });

    fill = new formattingSettings.ColorPicker({
        name: "fill",
        displayName: "Fill",
        value: { value: "" }
    });

    fillRule = new formattingSettings.ColorPicker({
        name: "fillRule",
        displayName: "Color saturation",
        value: { value: "" }
    });

    fontSize = new formattingSettings.NumUpDown({
        name: "fontSize",
        displayName: "Text Size",
        value: 12
    });

    // Updated to include the placeholder
    basemapUrl = new TextInput({
        name: "basemapUrl",
        displayName: "Custom Basemap URL",
        value: "https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png",  // Default to an empty string or a placeholder URL
        placeholder: "Enter a custom basemap URL here"  // Add the placeholder property
    });

    name: string = "openLayersVisualCardSettings";
    displayName: string = "OpenLayers Visual Settings";
    slices: Array<FormattingSettingsSlice> = [this.defaultColor, this.showAllDataPoints, this.fill, this.fillRule, this.fontSize, this.basemapUrl];
}

/**
* visual settings model class
*
*/
export class OpenLayersVisualFormattingSettingsModel extends FormattingSettingsModel {
    // Create formatting settings model formatting cards
    dataPointCard = new OpenLayersVisualCardSettings();

    cards = [this.dataPointCard];
}


export class MapboxSettings extends DataViewObjectsParser {
    //public static roleMap: RoleMap;
    public api: APISettings = new APISettings();
    
    //public cluster: ClusterSettings = new ClusterSettings();
    public heatmap: HeatmapSettings = new HeatmapSettings();
    //public circle: CircleSettings = new CircleSettings();
    //public choropleth: ChoroplethSettings = new ChoroplethSettings();

    public static enumerateObjectInstances(
        dataViewObjectParser: DataViewObjectsParser,
        options: powerbiVisualsApi.EnumerateVisualObjectInstancesOptions): powerbiVisualsApi.VisualObjectInstanceEnumeration {

        let settings: MapboxSettings = <MapboxSettings>dataViewObjectParser;
        let instanceEnumeration = DataViewObjectsParser.enumerateObjectInstances(dataViewObjectParser, options);

        switch (options.objectName) {
            case 'api':
            case 'circle':
            case 'choropleth':
            case 'legends': {
                return settings[options.objectName].enumerateObjectInstances(instanceEnumeration);
            }
            default: {
                return instanceEnumeration;
            }
        }
    }
}

export class APISettings {
    public accessToken: string = "";
    public style: string = "mapbox:\/\/styles\/mapbox\/light-v10?optimize=true";
    public styleUrl: string = "";
    public zoom: number = 0;
    public startLong: number = 0;
    public startLat: number = 0;
    public showLayerControl: boolean = false;
    public autozoom: boolean = true;
    public mapboxControls: boolean = true;
    public lasso: boolean = true;
    public polygon: boolean = true;
    public apiUrl: string = "https://api.mapbox.com"
    public labelPosition: string = "above";

    public enumerateObjectInstances(objectEnumeration) {
        let instances = objectEnumeration.instances;
        let properties = instances[0].properties;

        if (!properties.mapboxControls) {
            delete properties.lasso
            delete properties.polygon
        }
        // Hide / show custom map style URL control
        if (properties.style != 'custom') {
            properties.styleUrl = "";
            delete properties.styleUrl
        } else if (!properties.styleUrl) {
            properties.styleUrl = "";
        }
        // If autozoom is enabled, there is no point in initial zoom and position
        if (properties.autozoom) {
            delete properties.zoom
            delete properties.startLong
            delete properties.startLat
        }

        return { instances }
    }
}


export class HeatmapSettings {
    public show: boolean = false;
    public radius: number = 5;
    public intensity: number = 0.5;
    public opacity: number = 100;
    public minColor: string = "#0571b0";
    public midColor: string = "#f7f7f7";
    public maxColor: string = "#ca0020";
    public minZoom: number = 0;
    public maxZoom: number = 22;
}




