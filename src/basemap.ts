
"use strict";

import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import XYZ from "ol/source/XYZ";
import { WMTS } from "ol/tilegrid";
import TileGrid from "ol/tilegrid/TileGrid";
import VectorTile from "ol/layer/VectorTile";
import VectorTileSource from "ol/source/VectorTile";
import MVT from "ol/format/MVT";
import { createXYZ } from "ol/tilegrid";


export class Basemap {

    constructor() {
        //console.log('Basemap constructor');
    }

    getDefaultBasemap(): TileLayer {

        return new TileLayer({
            source: new OSM() // Default basemap source
        })
    }

    getBasemap(basemapOptions: any): TileLayer {

        switch (basemapOptions.selectedBasemap) {

            case "openstreetmap":

                return this.getDefaultBasemap();

            case "mapbox":

                return new TileLayer({
                    source: new XYZ({
                        url: "https://api.mapbox.com/styles/v1/ocha-rosea-1/cm2lidma900jq01r27rkxflo6/tiles/256/{z}/{x}/{y}@2x?access_token=pk.eyJ1Ijoib2NoYS1yb3NlYS0xIiwiYSI6ImNtMWhmYndqZDBnbmYyanM1dG41djh5eDkifQ.HT2WOi-53Jm88DA8rJySSA", // Replace with your Mapbox URL
                        attributions: '© <a href="https://www.mapbox.com/" target="_blank">Mapbox</a>',
                    })
                });

            case "esri":

                return new TileLayer({
                    source: new XYZ({
                        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", // Esri World Imagery URL
                        attributions: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
                    })
                });

            default:
                return this.getDefaultBasemap(); // fallback to default basemap
        }

    }

    destroy() {
        //console.log('Basemap destroy');
    }

}