/*
*  Power BI Visual CLI
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

import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import "./../style/visual.less";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;

import { OpenLayersVisualFormattingSettingsModel } from "./settings";

import "ol/ol.css";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { Feature } from "ol";
import Point from "ol/geom/Point";
import { fromLonLat } from "ol/proj";
import OSM from "ol/source/OSM";
import XYZ from "ol/source/XYZ";
import Style from "ol/style/Style";
import Circle from "ol/style/Circle";
import Fill from "ol/style/Fill";
import Stroke from "ol/style/Stroke";
import { WMTS } from "ol/tilegrid";
import TileGrid from "ol/tilegrid/TileGrid"; // Ensure tile grid is properly imported
import Overlay from "ol/Overlay"; // Import Overlay class


export class Visual implements IVisual {
    // declaring formatting settings service 
    private formattingSettingsService: FormattingSettingsService;

    private visualFormattingSettingsModel: OpenLayersVisualFormattingSettingsModel; // Define the settings model property

    private map: Map;
    private vectorSource: VectorSource;
    private container: HTMLElement;
    private defaultbasemap: TileLayer;

    private tooltip: Overlay;

    constructor(options: VisualConstructorOptions) {
        this.formattingSettingsService = new FormattingSettingsService();

        // Initialize the settings model
        this.visualFormattingSettingsModel = new OpenLayersVisualFormattingSettingsModel(); // Initialize settings model

        this.container = options.element;

        // Ensure the container has proper dimensions
        this.container.style.width = "100%";
        this.container.style.height = "100%";

        // Get the custom basemap URL from the settings
        const settings = this.visualFormattingSettingsModel.dataPointCard;
        const basemapUrl = settings.basemapUrl.value || "https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png";  // Default to OSM if no URL provided

        /*  this.defaultbasemap = new TileLayer({
             source: new XYZ({
                 url: "https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=YOUR_ACCESS_TOKEN",
                 attributions: '© <a href="https://www.mapbox.com/">Mapbox</a>',
             }),
         }); */

        // Inside your constructor
        const basemapUrl2 = "https://api.mapbox.com/styles/v1/ocha-rosea-1/cm2lidma900jq01r27rkxflo6/wmts?access_token=pk.eyJ1Ijoib2NoYS1yb3NlYS0xIiwiYSI6ImNtMWhmYndqZDBnbmYyanM1dG41djh5eDkifQ.HT2WOi-53Jm88DA8rJySSA";

        // Initialize the vector source and layer
        this.vectorSource = new VectorSource();
        const vectorLayer = new VectorLayer({
            source: this.vectorSource,

            style: new Style({
                image: new Circle({
                    radius: 5,  // Set the size of the circle
                    fill: new Fill({
                        color: 'red',  // Set the color of the circle
                    }),
                    stroke: new Stroke({
                        color: 'black',
                        width: 1,
                    }),
                }),
            })

        });

        // Initialize the map
        this.map = new Map({
            target: this.container,
            layers: [
                new TileLayer({
                    source: new OSM({
                        url: basemapUrl,
                    }),
                }),
                vectorLayer, // Add the vector layer
            ],
            view: new View({
                center: fromLonLat([37.9062, -0.0236]), // Default to Kenya
                zoom: 6,
            }),
        });

        // Add the tooltip overlay
        this.tooltip = new Overlay({
            element: document.createElement('div'), // Create a div for the tooltip
            positioning: 'bottom-center',
            offset: [0, -10], // Adjust offset as needed
            stopEvent: false // Important: allow map interactions
        });
        this.map.addOverlay(this.tooltip);
    
        this.map.on('pointermove', (evt) => {
            const pixel = evt.pixel;
            const hit = this.map.forEachFeatureAtPixel(pixel, (feature) => {
                return feature;
            });
    
            if (hit) {
                const tooltipData = hit.get('tooltip');
                if (tooltipData) {
                    this.tooltip.getElement().textContent = tooltipData; // Set the tooltip content
                    this.tooltip.setPosition(evt.coordinate); // Position the tooltip
                    this.tooltip.getElement().style.display = 'block';
                } else {
                    this.tooltip.getElement().style.display = 'none';
                }
            } else {
                this.tooltip.getElement().style.display = 'none';
            }
        });

    }

    public update(options: VisualUpdateOptions) {
        const dataView = options.dataViews[0];
        console.log("Full DataView:", JSON.stringify(dataView, null, 2));

        if (!dataView || !dataView.categorical) {
            console.log("No categorical data found.");
            this.clearMap(); // Clear the map
            return;
        }

        const categorical = dataView.categorical;
        let longitudes: number[] | undefined;
        let latitudes: number[] | undefined;
        let tooltips: any[] | undefined; // Store tooltip values

        // Find Longitude and Latitude (both in categories)
        if (categorical.categories && categorical.categories.length === 2) { // Check if both categories are present
            const lonCategory = categorical.categories.find(c => c.source.roles && c.source.roles['Longitude']);
            const latCategory = categorical.categories.find(c => c.source.roles && c.source.roles['Latitude']);

            if (lonCategory && latCategory) {
                longitudes = lonCategory.values as number[];
                latitudes = latCategory.values as number[];
                console.log("Longitudes Found:", longitudes);
                console.log("Latitudes Found:", latitudes);

                if (longitudes.length !== latitudes.length) {
                    console.warn("Longitude and Latitude have different lengths.");
                    this.clearMap();
                    return;
                }
            } else {
                console.warn("Both Longitude and Latitude roles must be assigned.");
                this.clearMap();
                return;
            }
        } else {
            console.warn("Both Longitude and Latitude roles must be assigned.");
            this.clearMap();
            return;
        }

        // Find Tooltips (in values)
        if (categorical.values && categorical.values.length > 0) {
            tooltips = categorical.values[0].values;
            console.log("Tooltips Found:", tooltips);
        }

        this.vectorSource.clear(); // Clear existing features

        if (longitudes && latitudes) { // Check if longitudes and latitudes are defined
            for (let i = 0; i < longitudes.length; i++) {
                const lon = longitudes[i];
                const lat = latitudes[i];

                if (isNaN(lon) || isNaN(lat)) {
                    console.warn(`Skipping invalid point: lon = ${lon}, lat = ${lat}`);
                    continue;
                }

                const point = new Feature({
                    geometry: new Point(fromLonLat([lon, lat])),
                    tooltip: tooltips ? tooltips[i] : undefined // Add tooltip data to the feature
                });

                point.setStyle(new Style({
                    image: new Circle({
                        radius: 6,
                        fill: new Fill({ color: '#009edb' }),
                        stroke: new Stroke({ color: 'white', width: 1 }),
                    }),
                }));

                this.vectorSource.addFeature(point);
            }
        }

        this.fitMapToFeatures(); // Call the fit function

        this.map.updateSize();
    }

    private clearMap() {
        this.vectorSource.clear();
        this.map.updateSize();
    }

    private fitMapToFeatures() {
        if (this.vectorSource.getFeatures().length > 0) {
            this.map.getView().fit(this.vectorSource.getExtent(), { padding: [50, 50, 50, 50], duration: 1000 });
        } else {
            console.warn("No features to fit the view to.");
        }
    }


    public getFormattingModel(): powerbi.visuals.FormattingModel {
        // Building data card, We are going to add two formatting groups "Font Control Group" and "Data Design Group"
        let dataCard: powerbi.visuals.FormattingCard = {
            description: "Data Card Description",
            displayName: "Data Card",
            uid: "dataCard_uid",
            groups: []
        }

        // Building formatting group "Font Control Group"
        // Notice that "descriptor" objectName and propertyName should match capabilities object and property names
        let group1_dataFont: powerbi.visuals.FormattingGroup = {
            displayName: "Font Control Group",
            uid: "dataCard_fontControl_group_uid",
            slices: [
                {
                    uid: "dataCard_fontControl_displayUnits_uid",
                    displayName: "display units",
                    control: {
                        type: powerbi.visuals.FormattingComponent.Dropdown,
                        properties: {
                            descriptor: {
                                objectName: "dataCard",
                                propertyName: "displayUnitsProperty"
                            },
                            value: 0
                        }
                    }
                },
                // FontControl slice is composite slice, It means it contain multiple properties inside it
                {
                    uid: "data_font_control_slice_uid",
                    displayName: "Font",
                    control: {
                        type: powerbi.visuals.FormattingComponent.FontControl,
                        properties: {
                            fontFamily: {
                                descriptor: {
                                    objectName: "dataCard",
                                    propertyName: "fontFamily"
                                },
                                value: "wf_standard-font, helvetica, arial, sans-serif"
                            },
                            fontSize: {
                                descriptor: {
                                    objectName: "dataCard",
                                    propertyName: "fontSize"
                                },
                                value: 16
                            },
                            bold: {
                                descriptor: {
                                    objectName: "dataCard",
                                    propertyName: "fontBold"
                                },
                                value: false
                            },
                            italic: {
                                descriptor: {
                                    objectName: "dataCard",
                                    propertyName: "fontItalic"
                                },
                                value: false
                            },
                            underline: {
                                descriptor: {
                                    objectName: "dataCard",
                                    propertyName: "fontUnderline"
                                },
                                value: false
                            }
                        }
                    }
                }
            ],
        };
        // Building formatting group "Font Control Group"
        // Notice that "descriptor" objectName and propertyName should match capabilities object and property names
        let group2_dataDesign: powerbi.visuals.FormattingGroup = {
            displayName: "Data Design Group",
            uid: "dataCard_dataDesign_group_uid",
            slices: [
                // Adding ColorPicker simple slice for font color
                {
                    displayName: "Font Color",
                    uid: "dataCard_dataDesign_fontColor_slice",
                    control: {
                        type: powerbi.visuals.FormattingComponent.ColorPicker,
                        properties: {
                            descriptor:
                            {
                                objectName: "dataCard",
                                propertyName: "fontColor"
                            },
                            value: { value: "#01B8AA" }
                        }
                    }
                },
                // Adding AlignmentGroup simple slice for line alignment
                {
                    displayName: "Line Alignment",
                    uid: "dataCard_dataDesign_lineAlignment_slice",
                    control: {
                        type: powerbi.visuals.FormattingComponent.AlignmentGroup,
                        properties: {
                            descriptor:
                            {
                                objectName: "dataCard",
                                propertyName: "lineAlignment"
                            },
                            mode: powerbi.visuals.AlignmentGroupMode.Horizonal,
                            value: "right"
                        }
                    }
                },
            ]
        };

        // Add formatting groups to data card
        dataCard.groups.push(group1_dataFont);
        dataCard.groups.push(group2_dataDesign);

        // Build and return formatting model with data card
        const formattingModel: powerbi.visuals.FormattingModel = { cards: [dataCard] };
        return formattingModel;
    }

    public destroy(): void {
        this.map.setTarget(null);
    }
}
