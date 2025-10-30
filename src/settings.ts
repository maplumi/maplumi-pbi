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
import { GeoBoundariesCatalogService } from "./services/GeoBoundariesCatalogService";
import * as requestHelpers from "./utils/requestHelpers";
import * as topojsonClient from "topojson-client";
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

    // Country/Region Selection for GeoBoundaries - from VisualConfig static list (alphabetical)
    geoBoundariesCountry: DropDown = new DropDown({
        name: "geoBoundariesCountry",
        displayName: "Country/Region",
        value: {
            value: "ALL",
            displayName: "All Countries"
        },
        // Use the static canonical list from VisualConfig; catalog will refresh dynamically in the background
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

    // GeoBoundaries Source Tag selection (dataset tag like v2025-11)
    geoBoundariesSourceTag: DropDown = new DropDown({
        name: "geoBoundariesSourceTag",
        displayName: "Source Tag",
        value: {
            value: "v2025-11",
            displayName: "v2025-11"
        },
        items: [
            { value: "v2025-11", displayName: "v2025-11" },
            { value: "v2025-10", displayName: "v2025-10" },
            { value: "v2025-09", displayName: "v2025-09" }
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

    // Track whether the user has manually selected a boundary ID so we don't overwrite it
    private boundaryIdUserSelected: boolean = false;
    private lastBoundaryIdValue: string | null = null;

    // Combined Boundary ID Field - dropdown for GeoBoundaries, text input for custom
    boundaryIdField: DropDown = new DropDown({
        name: "boundaryIdField",
        displayName: "Boundary ID Field",
        // Use a static known list for now (no conditional display). This prevents the
        // list from disappearing when users select an item.
        value: {
            value: "shapeName",
            displayName: "shapeName"
        },
        // Cast to any to satisfy the formatting API typings for dynamic items
        items: [
            { value: "shapeName", displayName: "shapeName" },
            { value: "shapeID", displayName: "shapeID" },
            { value: "shapeGroup", displayName: "shapeGroup" },
            { value: "hdx_pcode", displayName: "hdx_pcode" },
            { value: "hdx_name", displayName: "hdx_name" }
        ] as any
    });

    // Text input for custom boundary ID field (only shown for custom sources)
    customBoundaryIdField: formattingSettings.TextInput = new TextInput({
        name: "customBoundaryIdField",
    displayName: "Boundary ID Field (custom)",
        value: "",
        placeholder: "Enter field name"
    });

    topoJSON_geoJSON_FileUrl: formattingSettings.TextInput = new TextInput({
        name: "topoJSON_geoJSON_FileUrl",
        displayName: "TopoJSON/GeoJSON Url",
        value: "", // Default url
        placeholder: "" // Placeholder text
    });

    // Optional: specify which object in a TopoJSON file to use when multiple exist
    topojsonObjectName: formattingSettings.TextInput = new TextInput({
        name: "topojsonObjectName",
        displayName: "TopoJSON Object Name (optional)",
        value: "",
        placeholder: "e.g. ADM1, polygons, boundaries",
        description: "If your TopoJSON has multiple objects, specify the object name to use. Leave blank to auto-detect the polygon layer."
    });

    name: string = "choroplethLocationBoundarySettingsGroup";
    displayName: string = "Boundary";
    collapsible: boolean = false;
    slices: formattingSettings.Slice[] = [
        this.boundaryDataSource,
        this.geoBoundariesCountry,
        this.geoBoundariesSourceTag,
        this.geoBoundariesReleaseType,
        this.geoBoundariesAdminLevel,
        this.topoJSON_geoJSON_FileUrl,
        this.topojsonObjectName,
        this.boundaryIdField,
        this.customBoundaryIdField
    ];

    public applyConditionalDisplayRules(): void {

    const selectedSource = this.boundaryDataSource.value?.value;

        // Detect if the user has changed the boundaryIdField value since last run and mark it
        try {
            const currentBoundary = String(this.boundaryIdField.value?.value || '');
            if (currentBoundary && currentBoundary !== this.lastBoundaryIdValue) {
                this.boundaryIdUserSelected = true;
                this.lastBoundaryIdValue = currentBoundary;
            } else if (!currentBoundary) {
                this.boundaryIdUserSelected = false;
                this.lastBoundaryIdValue = null;
            }
        } catch (e) {
            // ignore
        }

        // Show/hide geoBoundaries-specific fields
        const isGeoBoundaries = selectedSource === "geoboundaries";
        this.geoBoundariesCountry.visible = isGeoBoundaries;
        // Update country items from catalog (sync, backed by last fetch with fallback)
        if (isGeoBoundaries) {
            const newCountryItems = GeoBoundariesCatalogService.getCountryItemsSync();
            this.geoBoundariesCountry.items = newCountryItems;
            // Ensure current value exists; otherwise, pick "All Countries" if present, else first item
            const countryValues = newCountryItems.map(i => i.value);
            if (!countryValues.includes(String(this.geoBoundariesCountry.value?.value))) {
                const all = newCountryItems.find(i => i.value === "ALL");
                this.geoBoundariesCountry.value = all ?? { ...newCountryItems[0] };
            }
            // Populate catalog-derived fields for the currently-selected country (non-blocking)
            void this.populateReleaseAndAdminFromCatalog(String(this.geoBoundariesCountry.value?.value));
            // Also explicitly attempt to populate boundary ID fields from the current selection
            // This will hit the manifest/catalog to resolve a sample TopoJSON and extract property names
            try {
                const release = String(this.geoBoundariesReleaseType.value?.value || 'gbOpen');
                const iso3 = String(this.geoBoundariesCountry.value?.value || '');
                const admin = String(this.geoBoundariesAdminLevel.value?.value || 'ADM0');
                const tag = String(this.geoBoundariesSourceTag.value?.value || 'v2025-11');
                // Fire and forget; UI will update when items are available
                void this.populateBoundaryIdFieldsFromData(release, iso3, admin, tag);
            } catch (e) {
                // ignore
            }
            // Populate available tags and set default to latest (non-blocking)
            void (async () => {
                try {
                    const tags = await GeoBoundariesCatalogService.getTags();
                    if (!tags || !tags.length) return;
                    // Only allow supported tags (limit to known three)
                    const allowed = ['v2025-11', 'v2025-10', 'v2025-09'];
                    const filtered = tags.filter(t => allowed.includes(String(t)));
                    if (!filtered.length) return;
                    // Build items sorted with latest first
                    const items = Array.from(new Set(filtered)).sort().reverse().map(t => ({ value: t, displayName: t }));
                    this.geoBoundariesSourceTag.items = items;
                    // Default to the first (latest)
                    const cur = String(this.geoBoundariesSourceTag.value?.value);
                    if (!items.some(i => String(i.value) === cur)) {
                        this.geoBoundariesSourceTag.value = { ...items[0] };
                    }
                } catch (e) {
                    // ignore
                }
            })();
        }
        this.geoBoundariesAdminLevel.visible = isGeoBoundaries;

        // Handle "All Countries" special case
        const selectedIso3 = this.geoBoundariesCountry.value?.value?.toString();
        const isAllCountries = isGeoBoundaries && selectedIso3 === "ALL";
        
    // Hide Release Type and Admin Level when "All Countries" is selected
    this.geoBoundariesReleaseType.visible = isGeoBoundaries && !isAllCountries;
    this.geoBoundariesAdminLevel.visible = isGeoBoundaries && !isAllCountries;

    // Update admin level items based on selected country using catalog
    if (isGeoBoundaries && !isAllCountries) {
            const newLevelItems = GeoBoundariesCatalogService.getAdminLevelItemsSync(selectedIso3);
            this.geoBoundariesAdminLevel.items = newLevelItems;
            const levelValues = newLevelItems.map(i => i.value);
            if (!levelValues.includes(String(this.geoBoundariesAdminLevel.value?.value))) {
                this.geoBoundariesAdminLevel.value = { ...newLevelItems[0] };
            }
            // Update catalog-derived fields when admin levels are shown
            void this.populateReleaseAndAdminFromCatalog(String(selectedIso3));
        }

    // Do NOT seed boundaryIdField from static constants; it must only reflect loaded dataset properties.
    // populateBoundaryIdFieldsFromData will set items when an example TopoJSON/GeoJSON is loaded.

        // Handle visibility based on data source
        const isCustomSource = selectedSource === "custom";

        // Show/hide fields based on data source: make explicit checks so only one Boundary ID control is visible
    this.topoJSON_geoJSON_FileUrl.visible = isCustomSource;
    this.topojsonObjectName.visible = isCustomSource;

        // Enforce exclusive visibility: dropdown for GeoBoundaries, text input for Custom
        const showGeoDropdown = selectedSource === "geoboundaries";
        const showCustomInput = selectedSource === "custom";
        this.boundaryIdField.visible = showGeoDropdown;
        this.customBoundaryIdField.visible = showCustomInput;

        // Rebuild the slices array explicitly so the formatting pane only contains the controls
        // relevant to the selected source. This avoids host render-order edge cases where
        // a control may appear transiently despite its .visible flag.
        const baseSlices: formattingSettings.Slice[] = [
            this.boundaryDataSource,
            this.geoBoundariesCountry,
            this.geoBoundariesSourceTag,
            this.geoBoundariesReleaseType,
            this.geoBoundariesAdminLevel,
            this.topoJSON_geoJSON_FileUrl,
            this.topojsonObjectName
        ];

        const newSlices: formattingSettings.Slice[] = [];
        // Always include the data source selector first
        newSlices.push(this.boundaryDataSource);

        if (isGeoBoundaries) {
            newSlices.push(this.geoBoundariesCountry);
            newSlices.push(this.geoBoundariesSourceTag);
            if (this.geoBoundariesReleaseType.visible) newSlices.push(this.geoBoundariesReleaseType);
            if (this.geoBoundariesAdminLevel.visible) newSlices.push(this.geoBoundariesAdminLevel);
            // boundaryIdField only for geoboundaries
            if (showGeoDropdown) newSlices.push(this.boundaryIdField);
        }

        if (isCustomSource) {
            newSlices.push(this.topoJSON_geoJSON_FileUrl);
            newSlices.push(this.topojsonObjectName);
            newSlices.push(this.customBoundaryIdField);
        }

        // Replace the group's slices in-place
    try { this.slices = newSlices; } catch (e) { }


        // Clear any stale custom value when switching back to GeoBoundaries
        if (!isCustomSource) {
            this.customBoundaryIdField.value = "";
        }
    }

    // Populate release types and admin levels from the manifest for the selected country (non-blocking)
    private async populateReleaseAndAdminFromCatalog(selectedIso3?: string) {
        if (!selectedIso3 || selectedIso3 === 'ALL') return;
        try {
            // Before fetching catalog, attempt to set the manifest base based on selected tag
            const tag = String(this.geoBoundariesSourceTag.value?.value || 'v2025-11');
            // Update VisualConfig manifest URL dynamically when tag is selected
            // Note: VisualConfig is a const; we will compute manifest access using the tag where needed in services.
            const catalog: any = await GeoBoundariesCatalogService.getCatalog(tag);
            if (!catalog) return;

            // Extract entries array robustly
            const entries = (catalog as any).entries || (catalog as any).index || (catalog as any).files || (catalog as any).data || [];
            const countryEntries = entries.filter((e: any) => (e.iso3 || '').toUpperCase() === String(selectedIso3).toUpperCase());
            if (!countryEntries || countryEntries.length === 0) {
                // No manifest entries for this country: leave defaults
                return;
            }

            const releases = Array.from(new Set(countryEntries.map((e: any) => (e.release || '').toLowerCase()))).filter(Boolean);
            const levelsRaw = Array.from(new Set(countryEntries.map((e: any) => (e.level || '').toString()))).filter(Boolean);

            // Map manifest release keys to UI-friendly items
            const releaseItems = releases.map((r: string) => {
                switch (r.toLowerCase()) {
                    case 'gbopen': return { value: 'gbOpen', displayName: 'gbOpen (CC-BY 4.0)' };
                    case 'gbhumanitarian': return { value: 'gbHumanitarian', displayName: 'gbHumanitarian (UN OCHA)' };
                    case 'gbauthoritative': return { value: 'gbAuthoritative', displayName: 'gbAuthoritative (UN SALB)' };
                    default: return { value: r, displayName: r };
                }
            });

            // Map manifest levels like 'admin1' to 'ADM1'
            const levelItems = levelsRaw.map((lvl: string) => {
                const m = lvl.toLowerCase().replace(/^admin/, '');
                const upper = `ADM${m.toUpperCase()}`;
                const label = (() => {
                    switch (upper) {
                        case 'ADM0': return 'ADM0 (Country Borders)';
                        case 'ADM1': return 'ADM1 (States/Provinces)';
                        case 'ADM2': return 'ADM2 (Counties/Districts)';
                        case 'ADM3': return 'ADM3 (Municipalities)';
                        default: return upper;
                    }
                })();
                return { value: upper, displayName: label };
            });

            if (releaseItems.length > 0) {
                this.geoBoundariesReleaseType.items = releaseItems;
                // reset value if current not present
                const cur = String(this.geoBoundariesReleaseType.value?.value);
                if (!releaseItems.some((it: any) => String(it.value) === cur)) this.geoBoundariesReleaseType.value = { ...releaseItems[0] };
            }

            if (levelItems.length > 0) {
                this.geoBoundariesAdminLevel.items = levelItems;
                const curL = String(this.geoBoundariesAdminLevel.value?.value);
                if (!levelItems.some((it: any) => String(it.value) === curL)) this.geoBoundariesAdminLevel.value = { ...levelItems[0] };
            }

            // Also attempt to populate available boundary ID fields by fetching one sample file (non-blocking)
            void this.populateBoundaryIdFieldsFromData(String(this.geoBoundariesReleaseType.value?.value), String(selectedIso3), String(this.geoBoundariesAdminLevel.value?.value), tag);

        } catch (e) {
            // ignore errors silently in the formatting pane
        }
    }

    // Fetch a boundary dataset (manifest-resolved) and extract property names to populate boundaryIdField
    private async populateBoundaryIdFieldsFromData(release?: string, iso3?: string, adminLevel?: string, tag?: string) {
        if (!release || !iso3 || !adminLevel) return;
        try {
            // Resolve a data URL from the manifest (sync first, then async)
            let url = GeoBoundariesCatalogService.resolveTopoJsonUrlSync(release, iso3, adminLevel);
            if (!url) url = await GeoBoundariesCatalogService.resolveTopoJsonUrl(release, iso3, adminLevel, tag) as any;
            if (!url) return;

            // Use requestHelpers for timeout
            const resp = await requestHelpers.fetchWithTimeout(url, VisualConfig.NETWORK.FETCH_TIMEOUT_MS);
            if (!resp.ok) return;
            const json = await resp.json();

            let features: any[] = [];
            if (json && json.type === 'Topology' && json.objects) {
                const objectNames = Object.keys(json.objects);
                const first = objectNames.length > 0 ? objectNames[0] : null;
                if (first) {
                    const fc: any = topojsonClient.feature(json as any, json.objects[first]);
                    features = fc?.features || [];
                }
            } else if (json && json.type === 'FeatureCollection' && Array.isArray(json.features)) {
                features = json.features;
            }

            if (!features.length) return;

            const propKeys = Object.keys(features[0].properties || {});
            if (!propKeys.length) return;

            // Use a static ordered list of expected GeoBoundaries properties (maximum set).
            // Exclude shapeISO and shapeType from the selectable list as requested.
            // HDX fields are only shown for gbHumanitarian release type.
            const releaseNorm = String(release || '').toLowerCase();
            const includeHdx = releaseNorm === 'gbhumanitarian';

            const staticOrdered: string[] = [
                'shapeName',
                // 'shapeISO' intentionally excluded
                'shapeID',
                'shapeGroup'
            ];

            // Conditionally include HDX fields only for humanitarian release
            if (includeHdx) {
                staticOrdered.push('hdx_pcode');               
                staticOrdered.push('hdx_name');
            }

            const items: any[] = [];
            // Add static ordered items first (display names are friendly)
            for (const k of staticOrdered) {
                items.push({ value: k, displayName: `${k}` });
            }

            // Append any other keys from the dataset that are not in the static list,
            // but always exclude 'shapeISO' and 'shapeType'.
            for (const k of propKeys) {
                if (k === 'shapeISO' || k === 'shapeType') continue;
                if (!items.some(i => i.value === k)) items.push({ value: k, displayName: k });
            }

            if (items.length > 0) {
                const nextItems = items.map(item => ({ value: item.value, displayName: item.displayName ?? item.value }));
                const currentValue = String(this.boundaryIdField.value?.value ?? "");
                const hasCurrent = currentValue.length > 0 && nextItems.some(it => String(it.value) === currentValue);
                const userSelected = this.boundaryIdUserSelected && hasCurrent;

                this.boundaryIdField.items = nextItems as any;

                let selection: { value: string; displayName: string } | null;
                if (userSelected) {
                    selection = nextItems.find(it => String(it.value) === currentValue) || null;
                } else if (hasCurrent) {
                    selection = nextItems.find(it => String(it.value) === currentValue) || null;
                } else {
                    selection = nextItems[0] || null;
                    this.boundaryIdUserSelected = false;
                }

                if (selection) {
                    this.boundaryIdField.value = { ...selection };
                    this.lastBoundaryIdValue = String(selection.value);
                }
            }

        } catch (e) {
        }
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
    renderEngine: DropDown = new DropDown({
        name: "renderEngine",
        displayName: "Render Engine",
        value: { value: 'svg', displayName: 'SVG' },
        items: [
            { value: 'svg', displayName: 'SVG' },
            { value: 'canvas', displayName: 'Canvas' },
            { value: 'webgl', displayName: 'WebGL (preview)' }
        ]
    });

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
    slices: formattingSettings.Slice[] = [this.renderEngine, this.lockMapExtent, this.showZoomControl, this.lockedMapExtent, this.lockedMapZoom];

    public applyConditionalDisplayRules(): void {

        this.lockedMapExtent.visible = false; // Always hidden
        this.lockedMapZoom.visible = false; // Always hidden

        if (this.lockMapExtent.value) {
            this.showZoomControl.visible = false;
            this.showZoomControl.value = false;
        } else {
            this.showZoomControl.visible = true;
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