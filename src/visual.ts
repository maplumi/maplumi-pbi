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
import { constants } from "./constants";

import { createTooltipServiceWrapper, TooltipEventArgs, ITooltipServiceWrapper, TooltipEnabledDataPoint } from "powerbi-visuals-utils-tooltiputils";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;

import IVisualHost = powerbi.extensibility.visual.IVisualHost;

import PrimitiveValue = powerbi.PrimitiveValue;
import VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;

import { HumanitarianMapVisualFormattingSettingsModel } from "./settings";

import { Basemap } from "./basemap";

import "ol/ol.css";
import Map from "ol/Map";
import View from "ol/View";

import { fromLonLat } from "ol/proj";

import GeoJSON from "ol/format/GeoJSON";
import TopoJSON from "ol/format/TopoJSON"

import TileLayer from "ol/layer/Tile";

import { easeOut } from "ol/easing";

import { defaults as defaultControls } from "ol/control";

import { MapboxVectorLayer } from "ol-mapbox-style";

import * as chroma from "chroma-js"; // Import chroma module
import * as ss from "simple-statistics";

import { BasemapOptions, ChoroplethLayerOptions, ChoroplethOptions, CircleLayerOptions, CircleOptions } from "./types";
import { ColorRampGenerator } from "./colors";

import { CircleLayer } from "./circleLayer";
import { SvgLayer } from "./svgLayer";

import * as d3 from "d3";

import * as util from "./utils"
import { Legend } from "./legend";


interface TooltipDataItem {
    displayName: string;
    value: string;
    data: { displayName: string; value: any }[];
    // ... other properties you might need (header, color, etc.)
}

export class OpenMapVisual implements IVisual {

    private host: IVisualHost;
    private formattingSettingsService: FormattingSettingsService;
    private visualFormattingSettingsModel: HumanitarianMapVisualFormattingSettingsModel;

    private tooltipServiceWrapper: ITooltipServiceWrapper;
    private tooltipService: powerbi.extensibility.ITooltipService;

    private container: HTMLElement;   
    private loader: HTMLElement;
    private svgContainer: HTMLElement;

    private svgOverlay: SVGSVGElement;
    private svg: d3.Selection<SVGElement, unknown, HTMLElement, any>;   

    private map: Map;
    private legend: Legend;

    private basemap: Basemap;
    private basemapLayer: TileLayer;
    private mapboxVectorLayer: MapboxVectorLayer;

    private circleLayer: CircleLayer;
    private choroplethLayer: SvgLayer;

    private colorRampGenerator: ColorRampGenerator;
    private isDataLoading: boolean = false;

    private choroplethLegend: HTMLElement;
    private circleLegend: HTMLElement;

    private fitMapOptions: any;

    private memoryCache: Record<string, { data: any; timestamp: number }>;

    constructor(options: VisualConstructorOptions) {

        this.host = options.host;

        this.memoryCache = {};

        this.formattingSettingsService = new FormattingSettingsService();
        this.visualFormattingSettingsModel = new HumanitarianMapVisualFormattingSettingsModel();

        this.tooltipServiceWrapper = createTooltipServiceWrapper(this.host.tooltipService);;

        this.basemap = new Basemap();
        this.basemapLayer = this.basemap.getDefaultBasemap();

        this.container = options.element;
        this.container.style.width = "100%";
        this.container.style.height = "100%";
        

        // create loader/spinner element
        this.loader = document.createElement('div');
        this.loader.id = 'loader';
        this.loader.classList.add('loader');
        this.loader.style.border = '8px solid #f3f3f3';
        this.loader.style.borderRadius = '50%';
        this.loader.style.borderTop = '8px solid #3498db';
        this.loader.style.width = '40px';
        this.loader.style.height = '40px';
        this.loader.style.animation = 'spin 2s linear infinite';
        this.loader.style.position = 'absolute';
        this.loader.style.top = '50%';
        this.loader.style.left = '50%';
        this.loader.style.transform = 'translate(-50%, -50%)';
        this.loader.style.zIndex = '10000';
        this.loader.style.display = 'none'; // Initially hidden

        this.container.appendChild(this.loader);

        // Ensure the choropleth legend container is also appended to the same parent
        const choroplethLegendContainer = document.createElement("div");
        choroplethLegendContainer.setAttribute("id", "legend");
        choroplethLegendContainer.style.position = "absolute";
        choroplethLegendContainer.style.zIndex = "1000";
        choroplethLegendContainer.style.top = "10px";
        choroplethLegendContainer.style.right = "10px";
        choroplethLegendContainer.style.backgroundColor = "rgba(255, 255, 255, 0.5)";
        choroplethLegendContainer.style.display = "none"; // Hidden by default

        const legendTitle = document.createElement("h4");
        legendTitle.textContent = "Legend";
        choroplethLegendContainer.appendChild(legendTitle);

        choroplethLegendContainer.style.pointerEvents = 'none';
        this.container.appendChild(choroplethLegendContainer);

        // Ensure the circle legend container is also appended to the same parent
        const circleLegendContainer = document.createElement("div");
        circleLegendContainer.setAttribute("id", "legend2");
        circleLegendContainer.style.position = "absolute";
        circleLegendContainer.style.zIndex = "1000";
        circleLegendContainer.style.bottom = "40px";
        circleLegendContainer.style.left = "10px";
        circleLegendContainer.style.backgroundColor = "rgba(255, 255, 255, 0.5)";
        circleLegendContainer.style.borderRadius = "4px";
        circleLegendContainer.style.display = "none"; // Hidden by default

        const circleLegendTitle = document.createElement("h4");
        circleLegendTitle.textContent = "Legend";
        circleLegendContainer.appendChild(circleLegendTitle);

        choroplethLegendContainer.style.pointerEvents = 'none';

        this.container.appendChild(circleLegendContainer);

        // Initialize the map
        this.map = new Map({
            target: this.container,
            layers: [this.basemapLayer],
            view: new View({
                projection: "EPSG:3857",
                center: fromLonLat([0, 0]), // Center the map at the origin
                zoom: 2,
                extent: [-20037508.34, -20037508.34, 20037508.34, 20037508.34], // world bounds
                constrainOnlyCenter: false, // Prevents panning out for both center and edges
                //constrainResolution: true, // Optional: Ensures zoom levels align with tile resolutions

            }),
            controls: defaultControls({
                attribution: true, // Ensure attribution control is enabled
                attributionOptions: {
                    collapsible: false, // Keep the attribution always visible
                },
            }),
        });

        // Get legend containers by Id
        this.choroplethLegend = document.getElementById("legend");
        this.circleLegend = document.getElementById("legend2");

        this.legend = new Legend();

        // Fit map options
        this.fitMapOptions = {
            padding: [50, 50, 50, 50],
            duration: 1000,
            easing: easeOut,
        };

        // circle svg overlay
        this.svgOverlay = this.container.querySelector('svg');
        if (!this.svgOverlay) {
            this.svgOverlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            this.svgOverlay.id = 'svgOverlay'
            this.svgOverlay.style.position = 'absolute';
            this.svgOverlay.style.top = '0';
            this.svgOverlay.style.left = '0';
            this.svgOverlay.style.width = '100%';
            this.svgOverlay.style.height = '100%';
            this.svgOverlay.style.pointerEvents = 'none'; // Let the map handle pointer events by default
        }

        this.svgContainer = document.createElement('div');

        this.container.appendChild(this.svgContainer);

        this.svg = d3.select(this.svgOverlay);

        console.log("Visual initialized.");
    }

    update(options: VisualUpdateOptions) {

        console.log("Update invoked.");

        this.svg.selectAll('*').remove();

        this.svgOverlay.style.display = 'none';

        // Retrieve the model and settings
        this.visualFormattingSettingsModel = this.getFormattingSettings(options);
        const basemapOptions = this.getBasemapOptions();
        const circleOptions = this.getCircleOptions();
        const choroplethOptions = this.getChoroplethOptions();

        this.colorRampGenerator = new ColorRampGenerator(choroplethOptions.colorRamp);

        const dataView = options.dataViews[0];

        // Check data validity
        if (!dataView || !dataView.categorical) {
            console.log("No categorical data found.");

            this.svg.selectAll('*').remove();

            return;
        }

        this.updateBasemap(basemapOptions);

        if (circleOptions.layerControl) {
            this.renderCircleLayer(dataView.categorical, circleOptions);
        }

        if (choroplethOptions.layerControl) {
            this.renderChoroplethLayer(dataView.categorical, choroplethOptions);
        }

        // Force the map to update its size, for example when the visual window is resized
        //this.map.updateSize();

    }

    private updateBasemap(basemapOptions: BasemapOptions): void {

        // Dictionary to store default attributions
        const attributions: Record<string, string> = {
            mapbox: "© Mapbox © OpenStreetMap",
            openstreetmap: "© OpenStreetMap",
        };

        // Retrieve the appropriate attribution
        const defaultAttribution = attributions[basemapOptions.selectedBasemap] || "";
        let attribution = defaultAttribution;

        // Add custom attribution if provided
        if (basemapOptions.customMapAttribution) {
            attribution = `${basemapOptions.customMapAttribution} ${defaultAttribution}`;
        }

        // Determine the layer based on the selected basemap
        let newLayer: any = null;
        if (basemapOptions.selectedBasemap === "mapbox") {
            this.mapboxVectorLayer = this.basemap.getMapboxBasemap(basemapOptions);
            newLayer = this.mapboxVectorLayer;
        } else if (basemapOptions.selectedBasemap === "openstreetmap") {
            this.basemapLayer = this.basemap.getBasemap(basemapOptions);
            newLayer = this.basemapLayer;
        } else if (basemapOptions.selectedBasemap === "none") {
            // remove basemap
        }

        // Update the layer and attribution if a valid layer was found
        if (newLayer) {
            newLayer.getSource()?.setAttributions(attribution);
            this.map.getLayers().setAt(0, newLayer);
        }
    }

    private renderCircleLayer(
        categorical: any,
        circleOptions: CircleOptions
    ) {

        this.circleLegend.style.display = "none";

        let longitudes: number[] | undefined;
        let latitudes: number[] | undefined;
        let circleSizeValues: number[] | undefined;
        let minCircleSizeValue: number | undefined;
        let maxCircleSizeValue: number | undefined;
        let circleScale: number | undefined;

        if (circleOptions.layerControl) {

            this.svg.select('#circles-group').remove();
            this.svgOverlay.style.display = 'block';

            console.log('Rendering circles...')

            const lonCategory = categorical?.categories?.find((c) => c.source?.roles && c.source.roles["Longitude"]);
            const latCategory = categorical?.categories?.find((c) => c.source?.roles && c.source.roles["Latitude"]);

            if (lonCategory && latCategory) {

                // Extract tooltips
                const tooltips = this.extractTooltips(categorical);

                longitudes = lonCategory.values as number[];
                latitudes = latCategory.values as number[];

                if (longitudes.length !== latitudes.length) {

                    console.warn("Longitude and Latitude have different lengths.");

                } else {

                    // Handle Circle Size Measure or default size
                    const CircleSizeMeasure = categorical?.values?.find((c) => c.source?.roles && c.source.roles["Size"]);

                    circleSizeValues = CircleSizeMeasure.values as number[];
                    minCircleSizeValue = Math.min(...circleSizeValues);
                    maxCircleSizeValue = Math.max(...circleSizeValues);
                    circleScale = (circleOptions.maxRadius - circleOptions.minRadius) / (maxCircleSizeValue - minCircleSizeValue);

                    const circleLayerOptions: CircleLayerOptions = {
                        // Required properties for the CircleLayer
                        longitudes: longitudes,
                        latitudes: latitudes,

                        // Circle customization options
                        circleOptions: circleOptions,

                        // Optional properties for proportional circles
                        circleSizeValues: circleSizeValues,
                        minCircleSizeValue: minCircleSizeValue,
                        circleScale: circleScale,
                        svg: this.svg,
                        svgContainer:  this.svgContainer,
                        zIndex: 5

                        // OpenLayers-specific options
                        // opacity: 1,                                // Layer opacity
                        // visible: true,                             // Visibility of the layer

                    };

                    this.circleLayer = new CircleLayer(circleLayerOptions);

                    this.map.addLayer(this.circleLayer);

                    this.addCircleLayerEvents(this.map, this.circleLayer);

                    // Calculate extent of features
                    const extent = this.circleLayer.getFeaturesExtent();

                    this.map.getView().fit(extent, this.fitMapOptions);


                    // Render legend if proportional circles are used
                    if (circleOptions.showLegend && circleSizeValues && circleSizeValues.length > 0) {

                        let radii: number[] | undefined;

                        longitudes.forEach((i) => {

                            // Calculate radius: proportional if circleSizeValues are provided, otherwise default to minRadius
                            const radius = circleSizeValues && minCircleSizeValue !== undefined && circleScale !== undefined
                                ? circleOptions.minRadius + (circleSizeValues[i] - minCircleSizeValue) * circleScale
                                : circleOptions.minRadius;

                            radii.push(radius);

                        });

                        this.legend.createProportionalCircleLegend(
                            this.circleLegend,
                            circleSizeValues,
                            radii,
                            circleOptions.legendTitle,
                            circleOptions
                        );
                    }

                }
            } else {
                console.warn("Both Longitude and Latitude roles must be assigned.");
                this.svg.select('#circles-group').remove();
            }
        } else {
            // we are not rendering circles
            this.svg.select('#circles-group').remove();
        }
    }

    private renderChoroplethLayer(
        categorical: any,
        choroplethOptions: ChoroplethOptions
    ) {
        // Ensure legends are hidden when updating
        this.choroplethLegend.style.display = "none";

       this.svg.select('polygons').remove();


        console.log('Rendering choropleth...');

        // Validate input data
        if (!categorical.values || categorical.values.length === 0) {
            console.warn("Measures not found.");
            //this.svg.selectAll('g').remove(); // set group selection
            return;
        }

        const AdminPCodeNameIDCategory = categorical.categories.find(
            (c) => c.source?.roles && c.source.roles["AdminPCodeNameID"]
        );

        if (!AdminPCodeNameIDCategory) {
            console.warn("Admin PCode/Name/ID not found.");
            //this.svg.selectAll('g').remove(); // set group selection
            return;
        }

        const colorMeasure = categorical.values.find(
            (c) => c.source?.roles && c.source.roles["Color"]
        );

        if (!colorMeasure) {
            console.warn("Color Measure not found.");
            //this.svg.selectAll('g').remove(); // set group selection
            return;
        }

        const serviceUrl: string = choroplethOptions.topoJSON_geoJSON_FileUrl;
        const cacheKey = `${choroplethOptions.locationPcodeNameId}`;
        const CACHE_EXPIRY_MS = 3600000; // 1 hour

        try {

            // util.fetchAndCacheJsonBoundaryData(

            //     serviceUrl,
            //     this.memoryCache,
            //     cacheKey,
            //     CACHE_EXPIRY_MS

            // ).then(data => {

            //     this.renderChoropleth(data, AdminPCodeNameIDCategory, colorMeasure, choroplethOptions, this.map);
            // });

            // util.fetchJsonBoundaryData(serviceUrl).then(data => {

            //     this.renderChoropleth(data, AdminPCodeNameIDCategory, colorMeasure, choroplethOptions, this.map);

            // });

            d3.json(serviceUrl).then(data=>{

                console.log('geojson',data);

                this.renderChoropleth(data, AdminPCodeNameIDCategory, colorMeasure, choroplethOptions);

            })

        } catch (error) {
            console.error("Error fetching GeoJSON data:", error);
        }


    }

    private renderChoropleth(geodata: any, category: any, measure: any, options: ChoroplethOptions) {

        // Get PCodes (this is the category/feature identifier)
        const pCodes = category.values as string[];
        if (!pCodes || pCodes.length === 0) {
            console.warn("No PCodes found. Exiting...");
            return;
        }

        // Filter valid PCodes
        const validPCodes = pCodes.filter((pcode) => pcode);
        if (validPCodes.length === 0) {
            console.warn("No valid PCodes found. Exiting...");
            return;
        }

        const colorValues: number[] = measure.values;
        const classBreaks = this.getClassBreaks(colorValues, options);
        const colorScale = this.getColorScale(classBreaks, options);
        const pcodeKey = options.locationPcodeNameId;

        // let features: any;

        // // Parse GeoJSON or TopoJSON
        // if (util.isValidGeoJson(geodata)) {
        //     const format = new GeoJSON();
        //     features = format.readFeatures(geodata, {
        //         dataProjection: "EPSG:4326",
        //         //featureProjection: "EPSG:3857",
        //     });
        // } else if (util.isValidTopoJson(geodata)) {
        //     const format = new TopoJSON();
        //     features = format.readFeatures(geodata, {
        //         dataProjection: "EPSG:4326",
        //         //featureProjection: "EPSG:3857",
        //     });
        // } else {
        //     console.error("Input data is neither GeoJSON nor TopoJSON.");
        //     return;
        // }

        //console.log('Features:', features);

        // Filter features based on PCodes
        // const filteredFeatures = geodata.features.filter((feature: any) => {
        //     const featurePCode = feature.get(pcodeKey);
        //     return validPCodes.includes(featurePCode);
        // });


        // // Prepare GeoJSON FeatureCollection for rendering
        // const geojson = {
        //     type: "FeatureCollection",
        //     features: filteredFeatures.map((feature: any) => {
        //         const geometry = feature.getGeometry(); // Access geometry using getGeometry()
        //         return {
        //             type: "Feature",
        //             geometry: {
        //                 type: geometry.getType(), // Get geometry type (e.g., 'Polygon')
        //                 coordinates: geometry.getCoordinates()
        //             },
        //             properties: {
        //                 pCode: feature.get(pcodeKey), // Access property using feature.get()
        //             },
        //         };
        //     }),
        // };


        // // Attach colors to features based on measure values
        // geojson.features.forEach((feature: any) => {
        //     const pCode = feature.properties.pCode;
        //     const value = colorValues[validPCodes.indexOf(pCode)];
        //     feature.properties.color = this.getColorForValue(value, classBreaks, colorScale);
        // });


        // Create and add the svgLayer for rendering choropleth
        this.choroplethLayer = new SvgLayer({
            map: this.map,
            d3Svg: this.svg,
            loader: this.loader,
            geojsonData: geodata, // Pass geojson with color data
            colorScale: colorScale, // Pass the color scale for choropleth
            dataKey: pcodeKey, // The key for accessing data values in geojson
            zIndex: 5,
        });



        this.choroplethLayer.render();

        const extent = this.choroplethLayer.getFeaturesExtent();

        this.map.getView().fit(extent, this.fitMapOptions);

        this.addChoroplethLayerEvents(this.map, this.choroplethLayer);


        // Update the legend
        if (options.showLegend) {
            this.legend.createChoroplethLegend(
                this.container,
                colorValues,
                classBreaks,
                colorScale,
                options,
                "top"
            );
        } else {
            const legend = document.getElementById("legend");
            if (legend) {
                legend.style.display = "none"; // Hide the legend
            }
        }



    }



    private addChoroplethLayerEvents(map: Map, svgLayer: SvgLayer) {

        const svg = svgLayer.getSvg();

        // Handle single click on map
        map.on('singleclick', (event) => {
            const [mouseX, mouseY] = event.pixel; // Mouse position in pixels

            // Handle choropleth click event
            svg.selectAll('path').each(function () {
                const path = d3.select(this);
                const bounds = path.node().getBoundingClientRect();
                const pathX = bounds.left;
                const pathY = bounds.top;
                const pathWidth = bounds.width;
                const pathHeight = bounds.height;

                // Check if the mouse click is within the bounds of the path
                if (
                    mouseX >= pathX && mouseX <= pathX + pathWidth &&
                    mouseY >= pathY && mouseY <= pathY + pathHeight
                ) {
                    // Choropleth feature clicked! Perform your action here
                    const feature = path.datum() as GeoJSON.Feature<GeoJSON.GeometryObject, { [key: string]: any }>;
                    //const dataKey = (svgLayer.options as ChoroplethLayerOptions).dataKey;
                    //const value = feature.properties[dataKey];

                    //console.log(`Clicked choropleth: Value = ${value}`);

                    // Change the fill color for clicked choropleth feature
                    path.attr('fill', 'blue');
                }
            });

        });

        // Handle pointer movement over the map
        map.on('pointermove', (event) => {
            const [mouseX, mouseY] = event.pixel; // Mouse position in pixels

            // Handle pointer movement over choropleth features
            svg.selectAll('path').each(function () {
                const path = d3.select(this);
                const bounds = path.node().getBoundingClientRect();
                const pathX = bounds.left;
                const pathY = bounds.top;
                const pathWidth = bounds.width;
                const pathHeight = bounds.height;

                if (
                    mouseX >= pathX && mouseX <= pathX + pathWidth &&
                    mouseY >= pathY && mouseY <= pathY + pathHeight
                ) {
                    // Mouse is over the choropleth feature
                    path.attr('fill', 'red');
                } else {
                    // Mouse is outside the choropleth feature
                    const feature = path.datum() as GeoJSON.Feature<GeoJSON.GeometryObject, { [key: string]: any }>;
                    //const colorScale = (canvasLayer.options as ChoroplethLayerOptions).colorScale;
                    //const dataKey = (canvasLayer.options as ChoroplethLayerOptions).dataKey;
                    //const color = colorScale(feature.properties[dataKey]);
                    //path.attr('fill', color); // Revert to original color
                }
            });

        });
    }

    private addCircleLayerEvents(map: Map, canvasLayer: CircleLayer) {

        const svg = canvasLayer.getSvg();

        // Helper function to check if a point is inside a circle
        const isPointInCircle = (mouseX: number, mouseY: number, circleX: number, circleY: number, radius: number) => {
            const dx = mouseX - circleX;
            const dy = mouseY - circleY;
            return dx * dx + dy * dy <= radius * radius;
        };

        // Handle single click on map
        map.on('singleclick', (event) => {
            const [mouseX, mouseY] = event.pixel; // Mouse position in pixels

            // Handle circle click event
            svg.selectAll('circle').each(function () {
                const circle = d3.select(this);
                const circleX = parseFloat(circle.attr('cx'));
                const circleY = parseFloat(circle.attr('cy'));
                const radius = parseFloat(circle.attr('r'));

                if (isPointInCircle(mouseX, mouseY, circleX, circleY, radius)) {
                    // Circle clicked! Perform your action here
                    const id = circle.attr('data-id');
                    const sizeValue = circle.attr('data-size-value');
                    const index = circle.attr('data-index');

                    console.log(`Clicked circle: ID = ${id}, SizeValue = ${sizeValue}, Index = ${index}`);

                    // Change the circle's fill color on click
                    circle.attr('fill', 'blue');
                }
            });

        });

        // Handle pointer movement over the map
        map.on('pointermove', (event) => {
            const [mouseX, mouseY] = event.pixel; // Mouse position in pixels

            // Handle pointer movement over circles
            svg.selectAll('circle').each(function () {
                const circle = d3.select(this);
                const circleX = parseFloat(circle.attr('cx'));
                const circleY = parseFloat(circle.attr('cy'));
                const radius = parseFloat(circle.attr('r'));

                if (isPointInCircle(mouseX, mouseY, circleX, circleY, radius)) {
                    // Mouse is over the circle
                    circle.attr('fill', 'red');
                } else {
                    // Mouse is outside the circle

                    const circleColor = (canvasLayer.options as CircleLayerOptions).circleOptions?.color || 'defaultColor';
                    circle.attr('fill', circleColor);
                }
            });

        });
    }


    // Helper to get color for a value based on class breaks
    private getColorForValue(value: number, classBreaks: number[], colorScale: string[]): string {
        if (value < classBreaks[0]) {
            return colorScale[0];
        } else if (value > classBreaks[classBreaks.length - 1]) {
            return colorScale[colorScale.length - 1];
        } else {
            for (let i = 0; i < classBreaks.length - 1; i++) {
                if (value >= classBreaks[i] && value <= classBreaks[i + 1]) {
                    return colorScale[i];
                }
            }
        }
        return "#009edb"; // Default color
    }


    /**
     * Extract and validate PCodes.
     */
    private getValidPCodes(pCodes: string[]): string[] {
        return pCodes.filter((pcode) => {
            if (!pcode) {
                console.warn(`Skipping invalid PCode: ${pcode}`);
                return false;
            }
            return true;
        });
    }

    /**
     * Parse GeoJSON or TopoJSON boundary data.
     */
    private parseBoundaryData(
        data: any,
        validPCodes: string[],
        pcodeKey: string
    ): any[] | null {
        let format;
        let features;

        if (util.isValidGeoJson(data)) {
            format = new GeoJSON();
        } else if (util.isValidTopoJson(data)) {
            format = new TopoJSON();
        } else {
            console.error("Input data is neither GeoJSON nor TopoJSON.");
            return null;
        }

        features = format.readFeatures(data, {
            dataProjection: "EPSG:4326",
            featureProjection: "EPSG:3857",
        });

        // Filter features by valid PCodes
        return features.filter((feature: any) =>
            validPCodes.includes(feature.get(pcodeKey))
        );
    }

    /**
     * Get color based on class breaks.
     */
    private getColorFromClassBreaks(
        value: number,
        classBreaks: number[],
        colorScale: string[]
    ): string {
        if (value < classBreaks[0]) return colorScale[0];
        if (value > classBreaks[classBreaks.length - 1]) return colorScale[colorScale.length - 1];

        for (let i = 0; i < classBreaks.length - 1; i++) {
            if (value >= classBreaks[i] && value <= classBreaks[i + 1]) {
                return colorScale[i];
            }
        }

        return "#009edb"; // Default color
    }

    private getClassBreaks(
        colorValues: number[],
        choroplethOptions: ChoroplethOptions
    ): number[] {
        const numValues = new Set(colorValues).size; // Get the number of unique values

        if (choroplethOptions.classifyData) {
            // Adjust the number of classes if it exceeds the number of unique values
            const adjustedClasses = Math.min(choroplethOptions.classes, numValues);

            if (numValues <= 2) {
                // Handle cases with less than or equal to two unique values
                return Array.from(new Set(colorValues)).sort((a, b) => a - b);
            } else {
                // More than two unique values: Use the existing classification methods
                if (choroplethOptions.classificationMethod === "j") {
                    return ss.jenks(colorValues, adjustedClasses); // Use adjustedClasses
                }
                if (choroplethOptions.classificationMethod === "k") {
                    const clusters = ss.ckmeans(colorValues, adjustedClasses);

                    // Extract the maximum value from each cluster
                    const maxValues = clusters.map((cluster) => Math.max(...cluster));

                    // Sort the maximum values in ascending order
                    maxValues.sort((a, b) => a - b);

                    // Construct the class breaks array
                    const classBreaks = [Math.min(...colorValues), ...maxValues];

                    return classBreaks;
                } else {
                    return chroma.limits(
                        colorValues,
                        choroplethOptions.classificationMethod as "q" | "e" | "l",
                        adjustedClasses
                    ); // Use adjustedClasses
                }
            }
        } else {
            return Array.from(new Set(colorValues)).sort((a, b) => a - b);
        }
    }

    private getColorScale(
        classBreaks: any[],
        choroplethOptions: ChoroplethOptions
    ): any {
        if (choroplethOptions.usePredefinedColorRamp) {
            if (choroplethOptions.invertColorRamp) {
                this.colorRampGenerator.invertRamp();
            } else {
                this.colorRampGenerator = new ColorRampGenerator(
                    choroplethOptions.colorRamp
                );
            }

            return this.colorRampGenerator.generateColorRamp(
                classBreaks,
                choroplethOptions.classes
            );
        } else {
            return chroma
                .scale([
                    choroplethOptions.minColor,
                    choroplethOptions.midColor,
                    choroplethOptions.maxColor,
                ])
                .mode("lab")
                .domain(classBreaks)
                .colors(choroplethOptions.classes);
        }
    }

    private getFormattingSettings(options: VisualUpdateOptions) {
        return this.formattingSettingsService.populateFormattingSettingsModel(
            HumanitarianMapVisualFormattingSettingsModel,
            options.dataViews[0]
        );
    }

    private getBasemapOptions(): BasemapOptions {
        const basemapSettings = this.visualFormattingSettingsModel.BasemapVisualCardSettings;
        return {
            selectedBasemap: basemapSettings.basemapSelectSettingsGroup.selectedBasemap.value.value.toString(),
            customMapAttribution: basemapSettings.basemapSelectSettingsGroup.customMapAttribution.value.toString(),
            mapboxCustomStyleUrl: basemapSettings.mapBoxSettingsGroup.mapboxCustomStyleUrl.value.toString(),
            mapboxStye: basemapSettings.mapBoxSettingsGroup.mapboxStyle.value.value.toString(),
            mapboxAccessToken: basemapSettings.mapBoxSettingsGroup.mapboxAccessToken.value.toString(),
            mapboxBaseUrl: basemapSettings.mapBoxSettingsGroup.mapboxBaseUrl.value.toString(),
            declutterLabels: basemapSettings.mapBoxSettingsGroup.declutterLabels.value,
        };
    }

    private getCircleOptions(): CircleOptions {
        const circleSettings =
            this.visualFormattingSettingsModel.ProportionalCirclesVisualCardSettings;
        return {
            layerControl: circleSettings.topLevelSlice.value,
            color: circleSettings.proportionalCirclesColor.value.value,
            minRadius: circleSettings.proportionalCirclesMinimumRadius.value,
            maxRadius: circleSettings.proportionalCirclesMaximumRadius.value,
            strokeColor: circleSettings.proportionalCirclesStrokeColor.value.value,
            strokeWidth: circleSettings.proportionalCirclesStrokeWidth.value,
            layerOpacity: circleSettings.proportionalCirclesLayerOpacity.value / 100,
            showLegend: circleSettings.showLegend.value,
            legendTitle: circleSettings.legendTitle.value,
            legendTitleColor: circleSettings.legendTitleColor.value.value,
            legendItemsColor: circleSettings.legendItemsColor.value.value,
            legendBackgroundColor: circleSettings.legendBackgroundColor.value.value,
            legendBackgroundOpacity: circleSettings.legendBackgroundOpacity.value,
            legendBottomMargin: circleSettings.legendBottomMargin.value,
        };
    }

    private getChoroplethOptions(): ChoroplethOptions {
        const choroplethSettings = this.visualFormattingSettingsModel.ChoroplethVisualCardSettings;
        const choroplethDisplaySettings = choroplethSettings.choroplethDisplaySettingsGroup;
        const choroplethLocationSettings = choroplethSettings.choroplethLocationBoundarySettingsGroup;
        const choroplethClassificationSettings = choroplethSettings.choroplethClassificationSettingsGroup;
        const choroplethLegendSettings = choroplethSettings.choroplethLegendSettingsGroup;

        return {
            layerControl: choroplethSettings.topLevelSlice.value,

            locationPcodeNameId: choroplethLocationSettings.locationPcodeNameId.value.toString(),
            topoJSON_geoJSON_FileUrl: choroplethLocationSettings.topoJSON_geoJSON_FileUrl.value,

            classifyData: choroplethClassificationSettings.classifyData.value,
            usePredefinedColorRamp: choroplethDisplaySettings.usePredefinedColorRamp.value,
            invertColorRamp: choroplethDisplaySettings.invertColorRamp.value,
            colorRamp: choroplethDisplaySettings.colorRamp.value.value.toString(),
            midColor: choroplethDisplaySettings.midColor.value.value,
            classes: choroplethClassificationSettings.numClasses.value,
            classificationMethod: choroplethClassificationSettings.classificationMethod.value.value.toString(),
            minColor: choroplethDisplaySettings.minColor.value.value,
            maxColor: choroplethDisplaySettings.maxColor.value.value,
            strokeColor: choroplethDisplaySettings.strokeColor.value.value,
            strokeWidth: choroplethDisplaySettings.strokeWidth.value,
            layerOpacity: choroplethDisplaySettings.layerOpacity.value / 100,
            showLegend: choroplethLegendSettings.showLegend.value,
            legendTitle: choroplethLegendSettings.legendTitle.value,
            legendTitleColor: choroplethLegendSettings.legendTitleColor.value.value,
            legendLabelsColor: choroplethLegendSettings.legendLabelsColor.value.value,
            legendBackgroundColor: choroplethLegendSettings.legendBackgroundColor.value.value,
            legendBackgroundOpacity: choroplethLegendSettings.legendBackgroundOpacity.value,
        };
    }

    private extractTooltips(categorical: any) {

        if (categorical.values && categorical.values.length > 0) {
            const tooltipMeasure = categorical?.values?.find(
                (c) => c.source?.roles && c.source.roles["Tooltips"]
            );
            if (tooltipMeasure) {
                //console.log("Tooltips Found:", tooltipMeasure.values);
                return tooltipMeasure.values;
            } else {
                //console.log("Tooltips not found.");
            }
        } else {
            //console.log("No values found.");
        }
        return undefined;
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(
            this.visualFormattingSettingsModel
        );
    }

    public destroy(): void {

        this.map.setTarget(null);
        this.svg.selectAll('*').remove();

    }

}



